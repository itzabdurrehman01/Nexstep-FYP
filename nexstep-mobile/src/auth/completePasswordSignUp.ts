import { registerAccount } from '../api/auth';
import { clerkAuthError, identifierTaken } from './accountRules';

export async function completePasswordSignUp(
  signUp: any,
  signIn: any,
  { email, password, firstName, lastName }: { email: string; password: string; firstName: string; lastName: string },
): Promise<{ next: 'otp' | 'done' }> {
  const { error: createError } = await signUp.password({
    emailAddress: email,
    password,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
  });

  if (createError) {
    if (identifierTaken(createError)) {
      throw new Error('This Gmail is already registered. Sign in, or use Forgot password if you cannot get in.');
    }
    const created = await registerAccount({ email, password, firstName, lastName });
    if (!created.ok) throw new Error(created.error || clerkAuthError(createError));
    if (!signIn) throw createError;
    const { error: passwordError } = await signIn.password({ identifier: email, password });
    if (passwordError) throw passwordError;
    if (signIn.status === 'complete') {
      const { error: finalizeError } = await signIn.finalize();
      if (finalizeError) throw finalizeError;
      return { next: 'done' };
    }
    throw createError;
  }

  if (signUp.status === 'complete') {
    const { error: finalizeError } = await signUp.finalize();
    if (finalizeError) throw finalizeError;
    return { next: 'done' };
  }

  const needsEmail = signUp.unverifiedFields?.includes('email_address') || signUp.status === 'missing_requirements';
  if (needsEmail) {
    const { error: otpError } = await signUp.verifications.sendEmailCode();
    if (otpError) throw otpError;
    return { next: 'otp' };
  }

  throw new Error('Could not finish creating the account. Try Continue with Gmail, or check the form and try again.');
}
