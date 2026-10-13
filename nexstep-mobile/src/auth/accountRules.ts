export const PASSWORD_RULES = [
  { id: 'length', label: 'At least 15 characters', test: (value: string) => String(value || '').length >= 15 },
];

export function passwordProblem(password: string) {
  if (PASSWORD_RULES.every((rule) => rule.test(password))) return null;
  return 'Password must be 15 characters or more.';
}

export function identifierTaken(error: any) {
  const code = String(error?.errors?.[0]?.code || error?.code || '');
  const msg = String(error?.errors?.[0]?.longMessage || error?.errors?.[0]?.message || error?.message || '');
  return /identifier_exists|form_identifier_exists|already.?exist|already.?taken|already registered/i.test(`${code} ${msg}`);
}

export function parseGmail(raw: string) {
  const email = String(raw || '').trim().toLowerCase();
  if (!email) return { ok: false as const, error: 'Enter your Gmail address.' };
  if (!/^[a-z0-9](?:[a-z0-9.]*[a-z0-9])?@(?:gmail|googlemail)\.com$/.test(email)) {
    return { ok: false as const, error: 'Only a real Gmail address is allowed (example@gmail.com).' };
  }
  const local = email.split('@')[0];
  if (local.length < 6 || local.length > 30 || email.includes('..')) {
    return { ok: false as const, error: 'This Gmail does not exist.' };
  }
  return { ok: true as const, email };
}

export function clerkAuthError(error: any, fallback = 'Something went wrong. Please try again.') {
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
