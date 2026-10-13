import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthenticateWithRedirectCallback, HandleSSOCallback } from '@clerk/react';
import { Loader2 } from 'lucide-react';
import { CLERK_ENABLED } from '../context/AuthContext.jsx';

/** Finishes a Clerk Google / Gmail SSO redirect, then sends the user on. */
export function SsoCallback() {
  const navigate = useNavigate();
  if (!CLERK_ENABLED) return null;
  return (
    <div className="min-h-[50vh] flex items-center justify-center" role="status">
      <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> Completing Gmail sign-in…
      </div>
      <HandleSSOCallback
        navigateToApp={() => navigate('/dashboard', { replace: true })}
        navigateToSignIn={() => navigate('/login', { replace: true })}
        navigateToSignUp={() => navigate('/register', { replace: true })}
      />
      <AuthenticateWithRedirectCallback
        signInForceRedirectUrl="/dashboard"
        signUpForceRedirectUrl="/dashboard"
        signInFallbackRedirectUrl="/dashboard"
        signUpFallbackRedirectUrl="/dashboard"
      />
    </div>
  );
}

export default SsoCallback;
