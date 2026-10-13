/**
 * adminApi.js — fetch helper for the admin portal.
 * Admin sessions live in an httpOnly cookie set by /api/admin-auth; every
 * request sends it, plus the header the server requires on admin requests.
 */
export class AdminApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function adminFetch(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'x-nexstep-admin': '1' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    throw new AdminApiError(data?.error || `Request failed (${res.status})`, res.status, data?.code);
  }
  return data;
}

/** Same rules the server enforces, so the form can explain before submitting. */
export function passwordProblem(pw) {
  const p = String(pw || '');
  if (p.length < 10) return 'Use at least 10 characters.';
  if (!/[A-Za-z]/.test(p) || !/[0-9]/.test(p)) return 'Use both letters and numbers.';
  return null;
}

export const formatDate = (v) => (v ? new Date(v).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—');
export const formatDateTime = (v) => (v ? new Date(v).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Never');
