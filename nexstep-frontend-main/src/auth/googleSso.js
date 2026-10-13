/**
 * Starts Clerk Google / Gmail OAuth in a popup so HashRouter (#/sso-callback)
 * is not lost by a full-page redirect.
 */
export async function startGoogleGmailSso(signIn, signUp) {
  if (!signIn) throw new Error('Sign-in is not ready yet.');
  const popup = window.open('about:blank', 'nexstep-google', 'width=520,height=720,scrollbars=yes');
  if (!popup) throw new Error('Allow pop-ups in your browser to continue with Gmail.');

  const { error } = await signIn.sso({
    strategy: 'oauth_google',
    redirectUrl: '/dashboard',
    redirectCallbackUrl: '/sso-callback',
    popup,
    oidcPrompt: 'select_account',
  });
  if (error) throw error;

  if (signIn.status === 'complete') {
    const { error: finalizeError } = await signIn.finalize();
    if (finalizeError) throw finalizeError;
    return;
  }

  if (signUp && (signIn.status === 'needs_first_factor' || signUp.status === 'missing_requirements' || signUp.status === 'complete')) {
    if (signUp.status === 'complete') {
      const { error: finalizeError } = await signUp.finalize();
      if (finalizeError) throw finalizeError;
    }
  }
}
