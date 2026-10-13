/**
 * adminPortal.routes.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Separate admin accounts for the admin portal (/#/admin).
 *
 * Admins do NOT use Clerk. They have their own email + password stored in
 * `admin_accounts` (bcrypt hashed) and a short-lived session in an httpOnly,
 * SameSite=strict cookie. Students and mentors (Clerk users) can never reach
 * these endpoints.
 *
 *   GET    /api/admin-auth/status            → { setupRequired }
 *   POST   /api/admin-auth/setup             → create the FIRST admin (only when none exist)
 *   POST   /api/admin-auth/login             → sign in
 *   POST   /api/admin-auth/logout            → sign out
 *   GET    /api/admin-auth/me                → current admin
 *   POST   /api/admin-auth/change-password   → change own password
 *
 *   (mounted under /api/admin, protected by requireAdmin)
 *   GET    /admins                            → list admins
 *   POST   /admins                            → add another admin
 *   PATCH  /admins/:id                        → enable / disable
 *   POST   /admins/:id/reset-password         → set a new password for another admin
 *   DELETE /admins/:id                        → remove (never yourself or the last active admin)
 *   GET    /roles                             → mentors + pending role invites
 *   POST   /roles                             → { email, role: MENTOR|STUDENT } by email
 *   DELETE /roles/invites/:email              → cancel a pending invite
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { pool, query, queryOne } from './db.js';
import { invalidateUserCache, syncRoleToClerk } from './auth.middleware.js';

export const ADMIN_COOKIE = 'ns_admin_session';
const SESSION_HOURS = 8;
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;
const PORTAL_ROLES = ['STUDENT', 'MENTOR'] as const;
// Used to keep login timing similar whether or not the email exists.
const DUMMY_HASH = bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), 12);
type PortalRole = typeof PORTAL_ROLES[number];

export interface AdminPrincipal { id: string; email: string; name: string; }

declare global {
  namespace Express {
    interface Request { admin?: AdminPrincipal; }
  }
}

// ── Schema ───────────────────────────────────────────────────────────────────
let schemaReady: Promise<void> | null = null;
export function ensureAdminSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS admin_accounts (
          id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email          VARCHAR(255) NOT NULL,
          name           VARCHAR(120) NOT NULL,
          password_hash  TEXT         NOT NULL,
          is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
          token_version  INT          NOT NULL DEFAULT 0,
          failed_logins  INT          NOT NULL DEFAULT 0,
          locked_until   TIMESTAMPTZ,
          last_login_at  TIMESTAMPTZ,
          created_by     UUID REFERENCES admin_accounts(id) ON DELETE SET NULL,
          created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
          updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        );
        CREATE UNIQUE INDEX IF NOT EXISTS admin_accounts_email_key ON admin_accounts (LOWER(email));
        CREATE TABLE IF NOT EXISTS admin_settings (
          key   VARCHAR(64) PRIMARY KEY,
          value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS role_invites (
          email       VARCHAR(255) PRIMARY KEY,
          role        VARCHAR(20)  NOT NULL CHECK (role IN ('STUDENT','MENTOR')),
          invited_by  UUID REFERENCES admin_accounts(id) ON DELETE SET NULL,
          created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        );
      `);
      // Admins and recruiters now live outside Clerk / were removed: any Clerk
      // user still holding those roles goes back to STUDENT.
      await pool.query(`UPDATE users SET role = 'STUDENT', updated_at = NOW() WHERE role IN ('ADMIN','RECRUITER')`).catch(() => {});
    })().catch((err) => { schemaReady = null; throw err; });
  }
  return schemaReady;
}

let cachedSecret: string | null = null;
async function sessionSecret(): Promise<string> {
  if (process.env.ADMIN_JWT_SECRET && process.env.ADMIN_JWT_SECRET.length >= 32) return process.env.ADMIN_JWT_SECRET;
  if (cachedSecret) return cachedSecret;
  await ensureAdminSchema();
  const generated = crypto.randomBytes(48).toString('hex');
  await query(`INSERT INTO admin_settings (key, value) VALUES ('session_secret', $1) ON CONFLICT (key) DO NOTHING`, [generated]);
  const row = await queryOne<any>(`SELECT value FROM admin_settings WHERE key = 'session_secret'`);
  cachedSecret = row.value as string;
  return cachedSecret;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const normEmail = (v: unknown) => String(v ?? '').trim().toLowerCase();
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 255;
function passwordProblem(pw: unknown): string | null {
  const p = String(pw ?? '');
  if (p.length < 10) return 'Password must be at least 10 characters.';
  if (p.length > 128) return 'Password is too long.';
  if (!/[A-Za-z]/.test(p) || !/[0-9]/.test(p)) return 'Password must contain letters and numbers.';
  return null;
}
const publicAdmin = (r: any) => ({
  id: r.id, email: r.email, name: r.name, isActive: r.is_active,
  lastLoginAt: r.last_login_at, createdAt: r.created_at, createdBy: r.created_by_name ?? null,
});

async function issueSession(res: Response, row: any) {
  const token = jwt.sign({ sub: row.id, ver: row.token_version, typ: 'admin' }, await sessionSecret(), { expiresIn: `${SESSION_HOURS}h` });
  res.cookie(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/api',
    maxAge: SESSION_HOURS * 3600 * 1000,
  });
}
const clearSession = (res: Response) => res.clearCookie(ADMIN_COOKIE, { path: '/api', sameSite: 'strict', httpOnly: true, secure: process.env.NODE_ENV === 'production' });

// Mutating admin requests must carry this header (blocks cross-site form posts on top of SameSite).
function requireAdminHeader(req: Request, res: Response, next: NextFunction) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  if (req.get('x-nexstep-admin') !== '1') return res.status(403).json({ error: 'Missing admin request header.' });
  next();
}

/** Protects every admin API: a valid admin session cookie is required. */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    await ensureAdminSchema();
    const token = req.cookies?.[ADMIN_COOKIE];
    if (!token) return res.status(401).json({ error: 'Admin sign-in required.', code: 'ADMIN_UNAUTHENTICATED' });
    const payload = jwt.verify(token, await sessionSecret()) as any;
    if (payload?.typ !== 'admin') throw new Error('bad token');
    const row = await queryOne<any>(`SELECT id, email, name, is_active, token_version FROM admin_accounts WHERE id = $1`, [payload.sub]);
    if (!row || !row.is_active || row.token_version !== payload.ver) {
      clearSession(res);
      return res.status(401).json({ error: 'Admin session expired.', code: 'ADMIN_UNAUTHENTICATED' });
    }
    req.admin = { id: row.id, email: row.email, name: row.name };
    return requireAdminHeader(req, res, next);
  } catch {
    clearSession(res);
    return res.status(401).json({ error: 'Admin session expired.', code: 'ADMIN_UNAUTHENTICATED' });
  }
}

// ── Auth router (/api/admin-auth) ────────────────────────────────────────────
export const adminAuthRouter = Router();
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many attempts. Try again in 15 minutes.' } });

adminAuthRouter.use(async (_req, res, next) => {
  try { await ensureAdminSchema(); next(); }
  catch { res.status(503).json({ error: 'Database not ready.' }); }
});

adminAuthRouter.get('/status', async (_req, res) => {
  const row = await queryOne<any>(`SELECT COUNT(*)::int AS n FROM admin_accounts`);
  res.json({ setupRequired: (row?.n ?? 0) === 0 });
});

adminAuthRouter.post('/setup', loginLimiter, requireAdminHeader, async (req, res) => {
  const setupToken = process.env.ADMIN_SETUP_TOKEN;
  if (setupToken && req.body?.setupToken !== setupToken) return res.status(403).json({ error: 'Invalid setup code.' });
  const email = normEmail(req.body?.email);
  const name = String(req.body?.name ?? '').trim().slice(0, 120);
  if (!name) return res.status(400).json({ error: 'Name is required.' });
  if (!isEmail(email)) return res.status(400).json({ error: 'Enter a valid email.' });
  const problem = passwordProblem(req.body?.password);
  if (problem) return res.status(400).json({ error: problem });

  const hash = await bcrypt.hash(String(req.body.password), 12);
  // Atomic: only inserts when the table is still empty.
  const row = await queryOne<any>(
    `INSERT INTO admin_accounts (email, name, password_hash)
     SELECT $1, $2, $3 WHERE NOT EXISTS (SELECT 1 FROM admin_accounts)
     RETURNING id, email, name, is_active, token_version, last_login_at, created_at`,
    [email, name, hash]
  );
  if (!row) return res.status(409).json({ error: 'An admin account already exists. Please sign in.' });
  await issueSession(res, row);
  res.status(201).json({ admin: publicAdmin(row) });
});

adminAuthRouter.post('/login', loginLimiter, requireAdminHeader, async (req, res) => {
  const email = normEmail(req.body?.email);
  const password = String(req.body?.password ?? '');
  const fail = () => res.status(401).json({ error: 'Incorrect email or password.' });
  if (!isEmail(email) || !password) return fail();

  const row = await queryOne<any>(`SELECT * FROM admin_accounts WHERE LOWER(email) = $1`, [email]);
  if (!row) { await bcrypt.compare(password, DUMMY_HASH); return fail(); }
  if (!row.is_active) return res.status(403).json({ error: 'This admin account is disabled.' });
  if (row.locked_until && new Date(row.locked_until) > new Date())
    return res.status(423).json({ error: `Too many failed attempts. Try again after ${new Date(row.locked_until).toLocaleTimeString()}.` });

  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) {
    const failed = row.failed_logins + 1;
    await query(
      `UPDATE admin_accounts SET failed_logins = $2, locked_until = $3, updated_at = NOW() WHERE id = $1`,
      [row.id, failed >= MAX_FAILED ? 0 : failed, failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MINUTES * 60000) : null]
    );
    return fail();
  }
  const updated = await queryOne<any>(
    `UPDATE admin_accounts SET failed_logins = 0, locked_until = NULL, last_login_at = NOW(), updated_at = NOW()
     WHERE id = $1 RETURNING *`, [row.id]);
  await issueSession(res, updated);
  res.json({ admin: publicAdmin(updated) });
});

adminAuthRouter.post('/logout', (_req, res) => { clearSession(res); res.json({ success: true }); });

adminAuthRouter.get('/me', requireAdmin, async (req, res) => {
  const row = await queryOne<any>(`SELECT * FROM admin_accounts WHERE id = $1`, [req.admin!.id]);
  res.json({ admin: publicAdmin(row) });
});

adminAuthRouter.post('/change-password', requireAdmin, async (req, res) => {
  const row = await queryOne<any>(`SELECT * FROM admin_accounts WHERE id = $1`, [req.admin!.id]);
  if (!(await bcrypt.compare(String(req.body?.currentPassword ?? ''), row.password_hash)))
    return res.status(400).json({ error: 'Current password is incorrect.' });
  const problem = passwordProblem(req.body?.newPassword);
  if (problem) return res.status(400).json({ error: problem });
  const hash = await bcrypt.hash(String(req.body.newPassword), 12);
  const updated = await queryOne<any>(
    `UPDATE admin_accounts SET password_hash = $2, token_version = token_version + 1, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [row.id, hash]);
  await issueSession(res, updated); // keep this browser signed in, sign out every other session
  res.json({ success: true });
});

// ── Admin management + roles (mounted on the protected /api/admin router) ────
export const adminManagementRouter = Router();

adminManagementRouter.get('/admins', async (_req, res) => {
  const rows = await query<any>(`
    SELECT a.*, c.name AS created_by_name FROM admin_accounts a
    LEFT JOIN admin_accounts c ON c.id = a.created_by
    ORDER BY a.created_at ASC`);
  res.json({ data: rows.map(publicAdmin) });
});

adminManagementRouter.post('/admins', async (req, res) => {
  const email = normEmail(req.body?.email);
  const name = String(req.body?.name ?? '').trim().slice(0, 120);
  if (!name) return res.status(400).json({ error: 'Name is required.' });
  if (!isEmail(email)) return res.status(400).json({ error: 'Enter a valid email.' });
  const problem = passwordProblem(req.body?.password);
  if (problem) return res.status(400).json({ error: problem });
  const exists = await queryOne<any>(`SELECT 1 FROM admin_accounts WHERE LOWER(email) = $1`, [email]);
  if (exists) return res.status(409).json({ error: 'An admin with this email already exists.' });
  const hash = await bcrypt.hash(String(req.body.password), 12);
  const row = await queryOne<any>(
    `INSERT INTO admin_accounts (email, name, password_hash, created_by) VALUES ($1, $2, $3, $4) RETURNING *`,
    [email, name, hash, req.admin!.id]);
  res.status(201).json({ data: publicAdmin(row) });
});

async function activeAdminCount() {
  const r = await queryOne<any>(`SELECT COUNT(*)::int AS n FROM admin_accounts WHERE is_active`);
  return r?.n ?? 0;
}

adminManagementRouter.patch('/admins/:id', async (req, res) => {
  const { isActive } = req.body ?? {};
  if (typeof isActive !== 'boolean') return res.status(400).json({ error: 'isActive must be true or false.' });
  if (req.params.id === req.admin!.id && !isActive) return res.status(400).json({ error: 'You cannot disable your own account.' });
  if (!isActive && (await activeAdminCount()) <= 1) return res.status(400).json({ error: 'At least one active admin is required.' });
  const row = await queryOne<any>(
    `UPDATE admin_accounts SET is_active = $2, token_version = token_version + 1, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [req.params.id, isActive]);
  if (!row) return res.status(404).json({ error: 'Admin not found.' });
  res.json({ data: publicAdmin(row) });
});

adminManagementRouter.post('/admins/:id/reset-password', async (req, res) => {
  if (req.params.id === req.admin!.id) return res.status(400).json({ error: 'Use Account settings to change your own password.' });
  const problem = passwordProblem(req.body?.password);
  if (problem) return res.status(400).json({ error: problem });
  const hash = await bcrypt.hash(String(req.body.password), 12);
  const row = await queryOne<any>(
    `UPDATE admin_accounts SET password_hash = $2, token_version = token_version + 1, failed_logins = 0, locked_until = NULL, updated_at = NOW()
     WHERE id = $1 RETURNING *`, [req.params.id, hash]);
  if (!row) return res.status(404).json({ error: 'Admin not found.' });
  res.json({ success: true });
});

adminManagementRouter.delete('/admins/:id', async (req, res) => {
  if (req.params.id === req.admin!.id) return res.status(400).json({ error: 'You cannot remove your own account.' });
  const target = await queryOne<any>(`SELECT is_active FROM admin_accounts WHERE id = $1`, [req.params.id]);
  if (!target) return res.status(404).json({ error: 'Admin not found.' });
  if (target.is_active && (await activeAdminCount()) <= 1) return res.status(400).json({ error: 'At least one active admin is required.' });
  await query(`DELETE FROM admin_accounts WHERE id = $1`, [req.params.id]);
  res.json({ success: true });
});

adminManagementRouter.get('/roles', async (_req, res) => {
  const mentors = await query<any>(`
    SELECT id, email, first_name AS "firstName", last_name AS "lastName", is_active AS "isActive", created_at AS "joinedAt"
    FROM users WHERE role = 'MENTOR' ORDER BY LOWER(email)`);
  const invites = await query<any>(`
    SELECT r.email, r.role, r.created_at AS "createdAt", a.name AS "invitedBy"
    FROM role_invites r LEFT JOIN admin_accounts a ON a.id = r.invited_by ORDER BY r.created_at DESC`);
  res.json({ mentors, invites });
});

/** Set a portal user's role by email. Creates a pending invite if they have not signed up yet. */
export async function setPortalRoleByEmail(emailRaw: string, role: PortalRole, adminId: string | null) {
  const email = normEmail(emailRaw);
  const user = await queryOne<any>(`SELECT id, clerk_user_id, role FROM users WHERE LOWER(email) = $1 AND clerk_user_id IS NOT NULL`, [email]);
  if (!user) {
    if (role === 'STUDENT') {
      await query(`DELETE FROM role_invites WHERE email = $1`, [email]);
      return { status: 'cleared' as const };
    }
    await query(
      `INSERT INTO role_invites (email, role, invited_by) VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role, invited_by = EXCLUDED.invited_by, created_at = NOW()`,
      [email, role, adminId]);
    return { status: 'invited' as const };
  }
  await query(`UPDATE users SET role = $2, updated_at = NOW() WHERE id = $1`, [user.id, role]);
  await query(`DELETE FROM role_invites WHERE email = $1`, [email]);
  try { await syncRoleToClerk(user.id, role); } catch (err: any) { console.error('[admin] Clerk role sync failed:', err?.message); }
  if (user.clerk_user_id) invalidateUserCache(user.clerk_user_id);
  return { status: 'updated' as const, userId: user.id };
}

adminManagementRouter.post('/roles', async (req, res) => {
  const email = normEmail(req.body?.email);
  const role = String(req.body?.role ?? '').toUpperCase() as PortalRole;
  if (!isEmail(email)) return res.status(400).json({ error: 'Enter a valid email.' });
  if (!PORTAL_ROLES.includes(role)) return res.status(400).json({ error: 'Role must be MENTOR or STUDENT.' });
  const isAdminEmail = await queryOne<any>(`SELECT 1 FROM admin_accounts WHERE LOWER(email) = $1`, [email]);
  if (isAdminEmail && role === 'MENTOR') return res.status(400).json({ error: 'This email belongs to an admin account.' });
  const result = await setPortalRoleByEmail(email, role, req.admin!.id);
  const message = result.status === 'updated'
    ? `${email} is now a ${role === 'MENTOR' ? 'mentor' : 'student'}.`
    : result.status === 'invited'
      ? `${email} has not signed up yet. They will become a mentor the first time they sign in.`
      : `${email} will stay a student.`;
  res.json({ success: true, status: result.status, message });
});

adminManagementRouter.delete('/roles/invites/:email', async (req, res) => {
  await query(`DELETE FROM role_invites WHERE email = $1`, [normEmail(req.params.email)]);
  res.json({ success: true });
});
