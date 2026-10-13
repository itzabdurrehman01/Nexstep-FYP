import React, { useCallback, useMemo, useRef } from 'react';
import { ClerkProvider } from '@clerk/react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext.jsx';
import { CLERK_ENABLED, CLERK_PUBLISHABLE_KEY } from '../context/AuthContext.jsx';

/** Clerk component styling that matches the NexStep light / dark theme. */
function useClerkAppearance(isDark) {
  return useMemo(() => ({
    variables: {
      colorPrimary: isDark ? '#3fab84' : '#0f7a58',
      colorPrimaryForeground: '#ffffff',
      colorBackground: isDark ? '#14171c' : '#ffffff',
      colorForeground: isDark ? '#e8eaee' : '#161a21',
      colorMutedForeground: isDark ? '#8a929e' : '#6a7381',
      colorMuted: isDark ? '#1b1f26' : '#f1f3f6',
      colorInput: isDark ? '#111419' : '#ffffff',
      colorInputForeground: isDark ? '#e8eaee' : '#161a21',
      colorBorder: isDark ? '#343a45' : '#cdd2da',
      colorNeutral: isDark ? '#e8eaee' : '#161a21',
      colorDanger: isDark ? '#f07a70' : '#c0362c',
      colorModalBackdrop: 'rgba(13, 15, 19, 0.5)',
      fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
      fontFamilyButtons: "'Inter', ui-sans-serif, system-ui, sans-serif",
      borderRadius: '8px',
      fontSize: '14px',
    },
    elements: {
      // Verification-code boxes: quick, light transitions so typing feels instant.
      otpCodeFieldInput: {
        transition: 'border-color 80ms ease-out, box-shadow 80ms ease-out',
        fontWeight: 600,
        fontSize: '18px',
      },
    },
  }), [isDark]);
}

/**
 * Wraps the app in ClerkProvider (when a publishable key is configured).
 * Must render inside the router so Clerk redirects use React Router.
 */
export function ClerkSetup({ children }) {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const appearance = useClerkAppearance(isDark);

  // Stable callbacks: ClerkProvider re-applies its options whenever these
  // props change identity, which would re-render the whole app in a loop.
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const toPath = useCallback((to) => {
    try {
      const url = new URL(to, window.location.origin);
      if (url.origin !== window.location.origin) { window.location.assign(to); return null; }
      return url.hash.startsWith('#/') ? url.hash.slice(1) : `${url.pathname}${url.search}`;
    } catch { return to; }
  }, []);
  const routerPush = useCallback((to) => { const p = toPath(to); if (p) navigateRef.current(p); }, [toPath]);
  const routerReplace = useCallback((to) => { const p = toPath(to); if (p) navigateRef.current(p, { replace: true }); }, [toPath]);

  if (!CLERK_ENABLED) return children;

  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      telemetry={false}
      appearance={appearance}
      afterSignOutUrl="/"
      signInUrl="/auth"
      signUpUrl="/register"
      routerPush={routerPush}
      routerReplace={routerReplace}
    >
      {children}
    </ClerkProvider>
  );
}

export default ClerkSetup;
