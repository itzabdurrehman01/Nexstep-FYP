/**
 * src/routes/auth.routes.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Sign-up, sign-in, passwords, email verification, OTP and social logins are
 * handled entirely by Clerk on the frontend. This router only exposes what the
 * app needs on top of that:
 *
 *   POST   /api/auth/check-gmail — Gmail format + registered check before OTP
 *   POST   /api/auth/register    — create a Clerk user (15+ character Clerk password)
 *   GET    /api/auth/me       — the signed-in user's local account + profile
 *   POST   /api/auth/logout   — no-op kept for older clients (Clerk signs out)
 *   DELETE /api/auth/account  — delete own account (local data + Clerk user)
 *
 * The previous JWT / OTP / Google implementation is archived in
 * ruff-data/legacy-auth/backend/auth.routes.ts.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { Router, Request, Response } from 'express';
import { clerkClient } from '@clerk/express';
import { query, queryOne } from './db.js';
import { requireAuth, invalidateUserCache } from './auth.middleware.js';
import { loadProfilePayload } from './user.routes.js';

const router = Router();

type GmailParse = { email: string } | { error: string; code: string };

function parseGmail(raw: unknown): GmailParse {
  const email = String(raw ?? '').trim().toLowerCase();
  if (!email) return { error: 'Enter your Gmail address.', code: 'GMAIL_REQUIRED' };
  if (!/^[a-z0-9](?:[a-z0-9.]*[a-z0-9])?@(?:gmail|googlemail)\.com$/.test(email)) {
    return { error: 'Only a real Gmail address is allowed (example@gmail.com). Fake or other emails are not accepted.', code: 'GMAIL_INVALID' };
  }
  const local = email.split('@')[0];
  if (local.length < 6 || local.length > 30 || email.includes('..')) {
    return { error: 'This Gmail does not exist.', code: 'GMAIL_NOT_FOUND' };
  }
  return { email };
}

function passwordProblem(raw: unknown): string | null {
  const value = String(raw ?? '');
  if (value.length < 15) return 'Password must be 15 characters or more.';
  return null;
}

async function gmailIsRegistered(email: string): Promise<boolean> {
  try {
    const list: any = await clerkClient.users.getUserList({ emailAddress: [email], limit: 1 });
    const rows = Array.isArray(list?.data) ? list.data : Array.isArray(list) ? list : [];
    if (rows.length > 0) return true;
  } catch {
    // If Clerk is unreachable, fall through to the local check.
  }
  const local = await queryOne<{ id: string }>(
    'SELECT id FROM users WHERE LOWER(email) = $1 AND clerk_user_id IS NOT NULL LIMIT 1',
    [email],
  );
  return Boolean(local);
}

router.post('/check-gmail', async (req: Request, res: Response) => {
  const parsed = parseGmail(req.body?.email);
  if ('error' in parsed) return res.status(400).json({ error: parsed.error, code: parsed.code });

  const purpose = String(req.body?.purpose || 'signin').toLowerCase();
  const exists = await gmailIsRegistered(parsed.email);

  if (purpose === 'signup') {
    if (exists) {
      return res.status(409).json({
        error: 'This Gmail is already registered. Sign in, or use Forgot password if you cannot get in.',
        code: 'GMAIL_TAKEN',
      });
    }
    return res.json({ ok: true, email: parsed.email, next: 'otp' });
  }

  if (!exists) {
    return res.status(404).json({ error: 'This Gmail does not exist.', code: 'GMAIL_NOT_FOUND' });
  }
  return res.json({ ok: true, email: parsed.email, next: purpose === 'forgot' ? 'otp' : 'password' });
});

router.post('/register', async (req: Request, res: Response) => {
  const parsed = parseGmail(req.body?.email);
  if ('error' in parsed) return res.status(400).json({ error: parsed.error, code: parsed.code });
  const problem = passwordProblem(req.body?.password);
  if (problem) return res.status(400).json({ error: problem, code: 'PASSWORD_INVALID' });
  if (await gmailIsRegistered(parsed.email)) {
    return res.status(409).json({
      error: 'This Gmail is already registered. Sign in, or use Forgot password if you cannot get in.',
      code: 'GMAIL_TAKEN',
    });
  }
  try {
    await clerkClient.users.createUser({
      emailAddress: [parsed.email],
      password: String(req.body.password),
      firstName: String(req.body?.firstName || '').trim() || undefined,
      lastName: String(req.body?.lastName || '').trim() || undefined,
    });
    return res.status(201).json({ ok: true, email: parsed.email });
  } catch (err: any) {
    const message = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || err?.message || 'Could not create the account.';
    const status = /already|taken|exists|identif/i.test(String(message)) ? 409 : 400;
    return res.status(status).json({ error: message, code: 'REGISTER_FAILED' });
  }
});

router.get('/me', requireAuth(), async (req: Request, res: Response) => {
  try {
    const u = req.user!;
    const fullProfile = await loadProfilePayload(u.id).catch(() => null);
    res.json({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      name: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
      role: u.role,
      isVerified: u.isVerified,
      avatarUrl: u.avatarUrl ?? null,
      fullProfile,
      profile: fullProfile ? {
        gradeLevel:      fullProfile.gradeLevel,
        city:            fullProfile.city,
        preferredStream: fullProfile.preferredStream,
        targetCareer:    fullProfile.targetCareer,
        skillCount:      Array.isArray(fullProfile.skills) ? fullProfile.skills.length : 0,
      } : null,
    });
  } catch {
    res.status(500).json({ error: 'Failed to retrieve user info.' });
  }
});

router.post('/logout', (_req: Request, res: Response) => {
  res.json({ message: 'Signed out.' });
});

router.delete('/account', requireAuth(), async (req: Request, res: Response) => {
  try {
    const { id, clerkUserId } = req.user!;
    // CASCADE in the schema removes profiles, skills, bookmarks, applications, etc.
    await query(`DELETE FROM users WHERE id = $1`, [id]);
    invalidateUserCache(clerkUserId);
    try {
      await clerkClient.users.deleteUser(clerkUserId);
    } catch (err: any) {
      console.error('[auth] Clerk user deletion failed:', err?.message);
    }
    res.json({ message: 'Account permanently deleted.' });
  } catch (err: any) {
    console.error('Account delete error:', err?.message);
    res.status(500).json({ error: 'Account deletion failed. Please try again.' });
  }
});

export { router as authRouter };
export default router;
