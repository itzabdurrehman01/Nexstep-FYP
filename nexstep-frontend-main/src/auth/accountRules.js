export const PASSWORD_RULES = [
  { id: 'length', label: 'At least 15 characters', test: (value) => String(value || '').length >= 15 },
];

export function passwordProblem(password) {
  if (PASSWORD_RULES.every((rule) => rule.test(password))) return null;
  return 'Password must be 15 characters or more.';
}

export function identifierTaken(error) {
  const code = String(error?.errors?.[0]?.code || error?.code || '');
  const msg = String(error?.errors?.[0]?.longMessage || error?.errors?.[0]?.message || error?.message || '');
  return /identifier_exists|form_identifier_exists|already.?exist|already.?taken|already registered/i.test(`${code} ${msg}`);
}

export function parseGmail(raw) {
  const email = String(raw || '').trim().toLowerCase();
  if (!email) return { ok: false, error: 'Enter your Gmail address.' };
  if (!/^[a-z0-9](?:[a-z0-9.]*[a-z0-9])?@(?:gmail|googlemail)\.com$/.test(email)) {
    return { ok: false, error: 'Only a real Gmail address is allowed (example@gmail.com).' };
  }
  const local = email.split('@')[0];
  if (local.length < 6 || local.length > 30 || email.includes('..')) {
    return { ok: false, error: 'This Gmail does not exist.' };
  }
  return { ok: true, email };
}

export async function checkGmail(email, purpose) {
  const parsed = parseGmail(email);
  if (!parsed.ok) return parsed;
  try {
    const res = await fetch('/api/auth/check-gmail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: parsed.email, purpose }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error || 'This Gmail does not exist.', code: data.code };
    return { ok: true, email: data.email || parsed.email };
  } catch {
    if (purpose === 'signup') return { ok: true, email: parsed.email };
    return { ok: false, error: 'Could not verify this Gmail. Make sure the NexStep API is running.' };
  }
}

export async function registerAccount({ email, password, firstName, lastName }) {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password, firstName, lastName }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data.error || 'Could not create the account.' };
  return { ok: true, email: data.email || email };
}

export async function completePasswordSignUp(signUp, signIn, { email, password, firstName, lastName }) {
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

export function clerkAuthError(error, fallback = 'Something went wrong. Please try again.') {
  const code = String(error?.errors?.[0]?.code || error?.code || '');
  const msg = String(error?.errors?.[0]?.longMessage || error?.errors?.[0]?.message || error?.longMessage || error?.message || '');
  if (identifierTaken(error)) {
    return 'This Gmail is already registered. Sign in, or use Forgot password if you cannot get in.';
  }
  if (code.includes('identifier') && (code.includes('not_found') || code.includes('invalid'))) {
    return 'This Gmail does not exist.';
  }
  if (code.includes('form_password_pwned') || /data breach|pwned|compromised/i.test(msg)) {
    return 'This password appears in a data breach. Choose a different one.';
  }
  if (/form_password_length|15 characters/i.test(`${code} ${msg}`)) {
    return 'Password must be 15 characters or more.';
  }
  return error?.errors?.[0]?.longMessage || error?.errors?.[0]?.message || error?.longMessage || error?.message || fallback;
}
