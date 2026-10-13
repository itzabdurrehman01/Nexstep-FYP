import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth as useClerkAuth, useClerk, useUser } from '@clerk/expo';
import { setApiTokenGetter } from '../api/client';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name?: string;
  role: string;
  isVerified: boolean;
  avatarUrl?: string | null;
  imageUrl?: string | null;
  profile?: Record<string, unknown> | null;
}

interface AuthContextValue {
  user: User | null;
  identity: Partial<User> | null;
  authStatus: 'loading' | 'authenticated' | 'unauthenticated' | 'error';
  authError: string | null;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, sessionId, getToken } = useClerkAuth();
  const { signOut } = useClerk();
  const { user: clerkUser } = useUser();
  const [localUser, setLocalUser] = useState<User | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthContextValue['authStatus']>('loading');
  const [authError, setAuthError] = useState<string | null>(null);
  const getTokenRef = useRef(getToken);
  const localUserRef = useRef(localUser);
  localUserRef.current = localUser;

  // Clerk may return a new getToken function reference after session updates. Keep
  // the latest function in a ref so that it cannot retrigger session restoration.
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  useEffect(() => {
    setApiTokenGetter((opts) => getTokenRef.current(opts));
    return () => setApiTokenGetter(null);
  }, []);

  const loadMe = useCallback(async () => {
    const token = await getTokenRef.current();
    const base = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3001';
    const response = await fetch(`${base}/api/auth/me`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!response.ok) throw new Error(`NexStep account request failed (${response.status})`);
    return response.json() as Promise<User>;
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLocalUser(null);
      setAuthError(null);
      setAuthStatus('unauthenticated');
      return;
    }
    let cancelled = false;
    if (!localUserRef.current) setAuthStatus('loading');
    loadMe().then((value) => {
      if (cancelled) return;
      setLocalUser(value);
      setAuthError(null);
      setAuthStatus('authenticated');
    }).catch((error) => {
      if (cancelled) return;
      setLocalUser(null);
      setAuthError(error instanceof Error ? error.message : 'Unable to verify your account.');
      // Clerk still has a valid session. Do not mount the login navigator again,
      // since doing so causes a login/reload loop when the API is unavailable.
      setAuthStatus('error');
    });
    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn, sessionId, loadMe]);

  const identity = useMemo(() => clerkUser ? {
    email: clerkUser.primaryEmailAddress?.emailAddress ?? '',
    firstName: clerkUser.firstName ?? '',
    lastName: clerkUser.lastName ?? '',
    name: clerkUser.fullName ?? undefined,
    imageUrl: clerkUser.imageUrl,
    avatarUrl: clerkUser.imageUrl,
  } : null, [clerkUser]);

  const user = useMemo(() => localUser ? {
    ...localUser,
    firstName: localUser.firstName || identity?.firstName || '',
    lastName: localUser.lastName || identity?.lastName || '',
    name: localUser.name || identity?.name,
    avatarUrl: identity?.avatarUrl || localUser.avatarUrl,
    imageUrl: identity?.imageUrl || localUser.avatarUrl,
  } : null, [localUser, identity]);

  const refreshUser = useCallback(async () => {
    if (!isSignedIn) return;
    setAuthError(null);
    try {
      setLocalUser(await loadMe());
      setAuthStatus('authenticated');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to verify your account.');
      if (!localUserRef.current) setAuthStatus('error');
    }
  }, [isSignedIn, loadMe]);

  const logout = useCallback(async () => {
    await signOut();
    setLocalUser(null);
    setAuthStatus('unauthenticated');
  }, [signOut]);

  return <AuthContext.Provider value={{ user, identity, authStatus, authError, logout, refreshUser }}>
    {children}
  </AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be inside AuthProvider');
  return value;
}
