/**
 * Attaches the Clerk session token to every request the app makes to its own
 * API (`/api/...`). Installed once by the auth provider, so existing
 * `fetch('/api/…')` calls across the app work without changes.
 *
 * POST/PUT/PATCH/DELETE always ask Clerk for a fresh JWT. Clerk cannot refresh
 * an expired session on a non-GET, which is what produced
 * `session-token-expired-refresh-non-eligible-non-get` on alert polls.
 */
let tokenGetter = null;
let installed = false;

export function setApiTokenGetter(getter) {
  tokenGetter = getter;
}

function isApiRequest(url) {
  try {
    const target = new URL(url, window.location.origin);
    const apiBase = import.meta.env.VITE_API_URL ? new URL(import.meta.env.VITE_API_URL, window.location.origin).origin : null;
    return target.pathname.startsWith('/api/') && (target.origin === window.location.origin || target.origin === apiBase);
  } catch {
    return false;
  }
}

function jwtMsLeft(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' ? payload.exp * 1000 - Date.now() : 0;
  } catch {
    return 0;
  }
}

async function readToken(skipCache) {
  if (!tokenGetter) return null;
  try {
    const token = await tokenGetter({ skipCache: Boolean(skipCache) });
    if (!token) return null;
    if (!skipCache && jwtMsLeft(token) < 12_000) {
      const fresh = await tokenGetter({ skipCache: true });
      return fresh || token;
    }
    return token;
  } catch {
    return null;
  }
}

export function installApiAuth() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input?.url;
    if (!tokenGetter || !url || !isApiRequest(url)) return nativeFetch(input, init);

    const method = String(init.method || (input instanceof Request ? input.method : 'GET') || 'GET').toUpperCase();
    const mutating = method !== 'GET' && method !== 'HEAD';
    const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
    const hadAuth = headers.has('Authorization');

    const applyToken = async (skipCache) => {
      if (hadAuth && !skipCache) return;
      const token = await readToken(skipCache || mutating);
      if (token) headers.set('Authorization', `Bearer ${token}`);
    };

    await applyToken(false);
    const res = await nativeFetch(input, { ...init, headers, credentials: init.credentials ?? 'include' });
    if (res.status !== 401 || hadAuth) return res;
    headers.delete('Authorization');
    await applyToken(true);
    if (!headers.has('Authorization')) return res;
    return nativeFetch(input, { ...init, headers, credentials: init.credentials ?? 'include' });
  };
}
