/**
 * src/context/AuthContext.jsx — authentication via Clerk
 * ─────────────────────────────────────────────────────────────────────────────
 * Clerk handles sign-up / sign-in / passwords / social logins. This provider
 * bridges Clerk to the rest of the app and keeps the same API the app used
 * before, so components don't need to know about Clerk:
 *
 *   user          — local account from /api/auth/me, merged with the identity from the
 *                   signed-in Clerk session (Google name, photo and email): { id, email,
 *                   firstName, lastName, name, imageUrl, avatarUrl, role, ... } | null
 *   identity      — the Clerk identity alone (available as soon as Clerk signs in)
 *   authStatus    — 'loading' | 'authenticated' | 'unauthenticated'
 *   authError     — message when Clerk is signed in but the API rejected the session
 *   clerkEnabled  — false when VITE_CLERK_PUBLISHABLE_KEY is not configured
 *   logout()      — Clerk sign-out
 *   refreshUser() — re-fetch /api/auth/me
 *   apiFetch()    — fetch wrapper (the Clerk token is added automatically)
 *   openSignIn() / openSignUp() / openUserProfile()
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth as useClerkAuth, useClerk, useUser as useClerkUser } from '@clerk/react';
import { installApiAuth, setApiTokenGetter } from '../auth/apiAuth.js';
import { getRoleHomePath, getUserRole } from '../auth/accountRole.js';

export { getRoleHomePath, getUserRole };

export const AuthContext = createContext(null);

export const CLERK_PUBLISHABLE_KEY = (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '').trim();
export const CLERK_ENABLED = /^pk_(test|live)_/.test(CLERK_PUBLISHABLE_KEY);

const apiFetch = (url, opts = {}) => fetch(url, { ...opts, credentials: 'include' });
const noop = () => {};

/** Used when Clerk keys are not configured yet: everyone is signed out. */
function NoClerkAuthProvider({ children }) {
  const value = {
    user: null,
    identity: null,
    authStatus: 'unauthenticated',
    authError: null,
    clerkEnabled: false,
    clerkSignedIn: false,
    login: noop,
    logout: async () => {},
    refreshUser: async () => {},
    apiFetch,
    openSignIn: noop,
    openSignUp: noop,
    openUserProfile: noop,
    setProfileImage: async () => { throw new Error('Sign-in is not configured.'); },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function ClerkAuthProvider({ children }) {
  const { isLoaded, isSignedIn, userId, getToken } = useClerkAuth();
  const clerk = useClerk();
  const { user: clerkUser } = useClerkUser();
  const [me, setUser] = useState(null);
  const [authStatus, setAuthStatus] = useState('loading');
  const [authError, setAuthError] = useState(null);
  const meRef = useRef(me);
  meRef.current = me;
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  // Every /api request carries the current Clerk session token.
  useEffect(() => {
    installApiAuth();
    setApiTokenGetter((opts) => getTokenRef.current(opts));
  }, []);

  const loadMe = useCallback(async () => {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (!res.ok) {
      let body = {};
      try { body = await res.json(); } catch { /* ignore */ }
      const error = new Error(body.error || `Server returned ${res.status}`);
      error.status = res.status;
      throw error;
    }
    return res.json();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setUser(null);
      setAuthError(null);
      setAuthStatus('unauthenticated');
      return;
    }
    let cancelled = false;
    if (!meRef.current) setAuthStatus('loading');
    loadMe()
      .then((next) => {
        if (cancelled) return;
        setUser(next);
        setAuthError(null);
        setAuthStatus('authenticated');
      })
      .catch((err) => {
        if (cancelled) return;
        setUser(null);
        setAuthError(
          err.status === 401
            ? 'You are signed in, but the server could not verify your session. Check CLERK_SECRET_KEY and CLERK_PUBLISHABLE_KEY in backend/.env.'
            : err.status === 403
              ? 'This account has been deactivated. Please contact support.'
              : 'Could not reach the NexStep server. Please try again.'
        );
        setAuthStatus('unauthenticated');
      });
    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn, userId, loadMe]);

  const refreshUser = useCallback(async () => {
    try { setUser(await loadMe()); } catch { /* keep current state */ }
  }, [loadMe]);

  useEffect(() => {
    if (!isSignedIn) return undefined;
    let last = 0;
    const refreshOnReturn = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - last < 60_000) return;
      last = Date.now();
      refreshUser();
    };
    window.addEventListener('focus', refreshOnReturn);
    document.addEventListener('visibilitychange', refreshOnReturn);
    return () => {
      window.removeEventListener('focus', refreshOnReturn);
      document.removeEventListener('visibilitychange', refreshOnReturn);
    };
  }, [isSignedIn, refreshUser]);

  const logout = useCallback(async () => {
    try { await clerk.signOut(); } catch { /* ignore */ }
    setUser(null);
    setAuthStatus('unauthenticated');
  }, [clerk]);

  // Identity from the verified Clerk session — for Google sign-ins this is the
  // Google account's name, photo and email, so they show up straight away.
  const identity = useMemo(() => {
    if (!clerkUser) return null;
    const email = clerkUser.primaryEmailAddress?.emailAddress || clerkUser.emailAddresses?.[0]?.emailAddress || '';
    const firstName = clerkUser.firstName || '';
    const lastName = clerkUser.lastName || '';
    return {
      firstName, lastName, email,
      name: clerkUser.fullName || `${firstName} ${lastName}`.trim() || email.split('@')[0] || '',
      // Own photo first; otherwise the picture of a linked Google (or other social) account.
      // Clerk only copies the Google photo when the account is created with Google, so an
      // account made with an email code and linked to Google later has no profile photo.
      imageUrl: clerkUser.hasImage
        ? clerkUser.imageUrl
        : (clerkUser.externalAccounts || []).find((a) => a.imageUrl && a.verification?.status === 'verified')?.imageUrl || null,
      provider: clerkUser.externalAccounts?.[0]?.provider || null,
    };
  }, [clerkUser]);

  const user = useMemo(() => {
    if (!me) return null;
    const firstName = me.firstName || identity?.firstName || '';
    const lastName = me.lastName || identity?.lastName || '';
    const photo = identity?.imageUrl || me.avatarUrl || null;
    return {
      ...me,
      firstName, lastName,
      name: `${firstName} ${lastName}`.trim() || identity?.name || me.email?.split('@')[0] || '',
      email: me.email || identity?.email || '',
      imageUrl: photo,
      avatarUrl: photo,
    };
  }, [me, identity]);

  const value = {
    user,
    identity,
    authStatus,
    authError,
    clerkEnabled: true,
    clerkSignedIn: Boolean(isLoaded && isSignedIn),
    login: noop, // kept for older components; Clerk drives the session now
    logout,
    refreshUser,
    apiFetch,
    // Google / social logins open in a popup: a full-page OAuth redirect would
    // come back to a "#/sso-callback" URL that clashes with our hash router.
    openSignIn: (opts) => clerk.openSignIn({ oauthFlow: 'popup', ...opts }),
    openSignUp: (opts) => clerk.openSignUp({ oauthFlow: 'popup', ...opts }),
    openUserProfile: (opts) => clerk.openUserProfile(opts),
    // Profile photos are stored by Clerk; null removes the photo.
    setProfileImage: async (file) => {
      if (!clerk.user) throw new Error('Not signed in.');
      await clerk.user.setProfileImage({ file });
      await clerk.user.reload?.();
      await refreshUser?.();
      return clerk.user.imageUrl;
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }) {
  return CLERK_ENABLED
    ? <ClerkAuthProvider>{children}</ClerkAuthProvider>
    : <NoClerkAuthProvider>{children}</NoClerkAuthProvider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function useIsAdmin()     { return getUserRole(useAuth().user) === 'ADMIN'; }
export function useIsMentor()    { return getUserRole(useAuth().user) === 'MENTOR'; }
export function useIsRecruiter() { return getUserRole(useAuth().user) === 'RECRUITER'; }
export function useIsStudent()   { const { user } = useAuth(); return getUserRole(user) === 'STUDENT' || !user; }
