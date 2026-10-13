import { parseGmail } from '../auth/accountRules';
import { apiClient } from './client';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name?: string;
  role: string;
  isVerified: boolean;
  avatarUrl?: string | null;
}

export async function getMe(): Promise<User> {
  const { data } = await apiClient.get('/api/auth/me');
  return data;
}

export async function checkGmail(email: string, purpose: 'signin' | 'signup' | 'forgot') {
  const parsed = parseGmail(email);
  if (!parsed.ok) return parsed;
  try {
    const { data, status } = await apiClient.post('/api/auth/check-gmail', { email: parsed.email, purpose }, { validateStatus: () => true });
    if (status >= 400) {
      return { ok: false as const, error: data?.error || 'This Gmail does not exist.', code: data?.code };
    }
    return { ok: true as const, email: data?.email || parsed.email };
  } catch {
    if (purpose === 'signup') return { ok: true as const, email: parsed.email };
    return { ok: false as const, error: 'Could not verify this Gmail. Make sure the NexStep API is running.' };
  }
}

export async function registerAccount(payload: { email: string; password: string; firstName?: string; lastName?: string }) {
  try {
    const { data, status } = await apiClient.post('/api/auth/register', payload, { validateStatus: () => true });
    if (status >= 400) return { ok: false as const, error: data?.error || 'Could not create the account.' };
    return { ok: true as const, email: data?.email || payload.email };
  } catch {
    return { ok: false as const, error: 'Could not create the account. Make sure the NexStep API is running.' };
  }
}
