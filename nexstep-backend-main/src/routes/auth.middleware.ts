/**
 * src/routes/auth.middleware.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Authentication & authorization backed by Clerk.
 *
 *  clerkMiddleware() (mounted once in server.ts) verifies the Clerk session
 *  token from the `Authorization: Bearer <token>` header or the `__session`
 *  cookie. The helpers below then map the Clerk user to a row in our own
 *  `users` table (created on first sign-in) so every existing route keeps
 *  working with `req.user.id` as a local UUID.
 *
 *  requireAuth()        — 401 unless signed in; attaches req.user
 *  requireRole(...r)    — 403 unless req.user.role is one of r
 *  requirePlan(plan)    — 403 unless the user's subscription meets the tier
 *  optionalAuth()       — attaches req.user when signed in, never rejects
 *
 *  Roles: STUDENT (default) | MENTOR | RECRUITER | ADMIN.
 *  The role is read from the Clerk user's publicMetadata.role when present
 *  (set by an admin in the Clerk dashboard or via the admin panel); otherwise
 *  the role stored in our database is used. Users can never set it themselves.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { Request, Response, NextFunction } from 'express';
import { getAuth, clerkClient } from '@clerk/express';
import { query, queryOne } from './db.js';

export type UserRole = 'STUDENT' | 'ADMIN' | 'MENTOR' | 'RECRUITER';

export interface AuthUser {
  id:          string;   // local users.id (UUID)
  clerkUserId: string;
  email:       string;
  firstName:   string;
  lastName:    string;
  role:        UserRole;
  isVerified:  boolean;
  avatarUrl?:  string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// Clerk (portal) users can only be students or mentors. Admins use the separate
// admin portal (adminPortal.routes.ts) and the recruiter role was removed.
const VALID_ROLES: UserRole[] = ['STUDENT', 'MENTOR'];
const CACHE_TTL_MS = 5 * 60_000;
const userCache = new Map<string, { user: AuthUser; expires: number }>();

export function invalidateUserCache(clerkUserId?: string) {
  if (clerkUserId) userCache.delete(clerkUserId);
  else userCache.clear();
}

function normaliseRole(value: unknown): UserRole | null {
  const role = String(value ?? '').trim().toUpperCase();
  return (VALID_ROLES as string[]).includes(role) ? (role as UserRole) : null;
}

function toAuthUser(row: any): AuthUser {
  return {
    id:          row.id,
    clerkUserId: row.clerk_user_id,
    email:       row.email,
    firstName:   row.first_name,
    lastName:    row.last_name,
    role:        row.role,
    isVerified:  row.is_verified,
    avatarUrl:   row.avatar_url ?? null,
  };
}

function cacheUser(clerkUserId: string, row: any): AuthUser {
  const user = toAuthUser(row);
  userCache.set(clerkUserId, { user, expires: Date.now() + CACHE_TTL_MS });
  return user;
}

/**
 * Find (or create on first sign-in) the local user for a Clerk user id.
 * Returning users are resolved from Postgres only — Clerk's getUser API is
 * reserved for the first visit so login is not blocked on a remote round-trip.
 */
export async function resolveLocalUser(clerkUserId: string): Promise<AuthUser | null> {
  const cached = userCache.get(clerkUserId);
  if (cached && cached.expires > Date.now()) return cached.user;

  const existing = await queryOne<any>(
    `SELECT id, clerk_user_id, email, first_name, last_name, role, is_verified, is_active, avatar_url
     FROM users WHERE clerk_user_id = $1`,
    [clerkUserId]
  );
  if (existing) {
    if (existing.is_active === false) return null;
    query(
      `UPDATE users SET last_login = NOW()
        WHERE id = $1 AND (last_login IS NULL OR last_login < NOW() - INTERVAL '10 minutes')`,
      [existing.id]
    ).catch(() => {});
    return cacheUser(clerkUserId, existing);
  }

  const clerkUser = await clerkClient.users.getUser(clerkUserId);
  const primaryEmail = clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)
    ?? clerkUser.emailAddresses[0];
  const email = (primaryEmail?.emailAddress || `${clerkUserId}@users.clerk.local`).toLowerCase();
  const isVerified = primaryEmail?.verification?.status === 'verified';
  // Clerk returns a generated placeholder image when the user has no photo;
  // only a real photo (e.g. the Google account picture) is stored.
  // Accounts created with an email code and linked to Google later have no Clerk
  // photo, so fall back to the linked Google (or other social) account's picture.
  const socialPhoto = (clerkUser.externalAccounts || []).find((a: any) => a.imageUrl && a.verification?.status === 'verified')?.imageUrl || null;
  const photoUrl = clerkUser.hasImage ? clerkUser.imageUrl : socialPhoto;
  const metadataRole = normaliseRole((clerkUser.publicMetadata as any)?.role);
  const firstName = (clerkUser.firstName || email.split('@')[0] || 'Student').slice(0, 100);
  const lastName = (clerkUser.lastName ?? '').slice(0, 100);

  const invite = await queryOne<any>(`SELECT role FROM role_invites WHERE email = $1`, [email]).catch(() => null);
  const invitedRole = normaliseRole(invite?.role);

  // "Start fresh" policy: older password-based accounts are never linked.
  await query(
    `UPDATE users
        SET email = email || '.legacy-' || id::text, is_active = FALSE, updated_at = NOW()
      WHERE LOWER(email) = $1 AND clerk_user_id IS NULL`,
    [email]
  );
  const row = await queryOne<any>(
    `INSERT INTO users (email, password_hash, first_name, last_name, role, is_verified, auth_provider, clerk_user_id, avatar_url, last_login)
     VALUES ($1, '', $2, $3, $4, $5, 'CLERK', $6, $7, NOW())
     ON CONFLICT (clerk_user_id) DO UPDATE SET last_login = NOW()
     RETURNING id, clerk_user_id, email, first_name, last_name, role, is_verified, is_active, avatar_url`,
    [email, firstName, lastName, invitedRole ?? metadataRole ?? 'STUDENT', isVerified, clerkUserId, photoUrl]
  );
  if (!row || row.is_active === false) return null;
  await query(`INSERT INTO profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, [row.id]).catch(() => {});

  if (invitedRole) {
    await query(`DELETE FROM role_invites WHERE email = $1`, [email]).catch(() => {});
    if (metadataRole !== invitedRole) {
      await clerkClient.users.updateUserMetadata(clerkUserId, { publicMetadata: { role: invitedRole } }).catch(() => {});
    }
  }

  return cacheUser(clerkUserId, row);
}

function clerkUserIdFrom(req: Request): string | null {
  try {
    const auth = getAuth(req);
    return auth?.userId ?? null;
  } catch {
    return null; // clerkMiddleware not mounted or keys missing
  }
}

export function requireAuth() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const clerkUserId = clerkUserIdFrom(req);
    if (!clerkUserId) {
      if (process.env.NODE_ENV !== 'production' && (req.headers.authorization || req.cookies?.__session)) {
        let reason = '';
        try { const a: any = getAuth(req); reason = a?.reason || a?.debug?.()?.reason || ''; } catch { /* ignore */ }
        const path = req.originalUrl || req.url || '';
        const poll = /\/api\/(alerts\/due|notifications)(?:\?|$)/.test(path);
        if (!poll || !/session-token-expired/i.test(reason)) {
          console.warn(`[auth] 401 ${req.method} ${path} — a session token was sent but Clerk rejected it${reason ? ` (${reason})` : ''}. bearer=${Boolean(req.headers.authorization)} cookie=${Boolean(req.cookies?.__session)}`);
        }
      }
      return res.status(401).json({ error: 'Authentication required.', code: 'UNAUTHENTICATED' });
    }
    try {
      const user = await resolveLocalUser(clerkUserId);
      if (!user) {
        console.warn(`[auth] 403 — local account for Clerk user ${clerkUserId} is deactivated`);
        return res.status(403).json({ error: 'Account not found or deactivated.', code: 'ACCOUNT_INACTIVE' });
      }
      req.user = user;
      next();
    } catch (err: any) {
      console.error('[auth] Failed to resolve Clerk user:', err?.message);
      return res.status(503).json({ error: 'Unable to verify your account right now.', code: 'AUTH_UNAVAILABLE' });
    }
  };
}

export function optionalAuth() {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const clerkUserId = clerkUserIdFrom(req);
    if (clerkUserId) {
      try {
        const user = await resolveLocalUser(clerkUserId);
        if (user) req.user = user;
      } catch { /* treat as anonymous */ }
    }
    next();
  };
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.', code: 'UNAUTHENTICATED' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Access denied. Required role: ${roles.join(' or ')}.`, code: 'FORBIDDEN' });
    }
    next();
  };
}

const PLAN_RANK: Record<string, number> = { free: 0, premium: 1, pro: 2 };

/** Enforce premium features on the server. Must run after requireAuth(). */
export function requirePlan(minimumPlan: 'premium' | 'pro') {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.', code: 'UNAUTHENTICATED' });
    }
    if (req.user.role === 'ADMIN') return next();
    try {
      const subscription = await queryOne<{ plan_slug: string }>(
        `SELECT p.slug AS plan_slug
         FROM subscriptions s
         JOIN plans p ON p.id = s.plan_id
         WHERE s.user_id = $1
           AND s.status = 'ACTIVE'
           AND (s.expires_at IS NULL OR s.expires_at > NOW())
         ORDER BY s.started_at DESC
         LIMIT 1`,
        [req.user.id]
      );
      const activePlan = subscription?.plan_slug || 'free';
      if ((PLAN_RANK[activePlan] ?? 0) < PLAN_RANK[minimumPlan]) {
        return res.status(403).json({
          error: `${minimumPlan[0].toUpperCase()}${minimumPlan.slice(1)} plan required for this feature.`,
          code: 'PLAN_REQUIRED',
          requiredPlan: minimumPlan,
          activePlan,
        });
      }
      return next();
    } catch {
      return res.status(503).json({ error: 'Unable to verify subscription access.', code: 'SUBSCRIPTION_UNAVAILABLE' });
    }
  };
}

/** Push a role change to Clerk so publicMetadata stays the source of truth. */
export async function syncRoleToClerk(localUserId: string, role: UserRole) {
  const row = await queryOne<any>(`SELECT clerk_user_id FROM users WHERE id = $1`, [localUserId]);
  if (!row?.clerk_user_id) return;
  await clerkClient.users.updateUserMetadata(row.clerk_user_id, { publicMetadata: { role } });
  invalidateUserCache(row.clerk_user_id);
}
