/**
 * plan.service.ts — which plan a user is on (Free or Premium).
 * A user is Premium while they have an ACTIVE subscription to a paid plan
 * that has not expired. Expired subscriptions are closed here as well.
 */
import { query, queryOne } from '../routes/db.js';

export interface UserPlan {
  tier: 'free' | 'premium';
  planSlug: string;
  planName: string;
  expiresAt: string | null;
}

export const FREE_LIMITS = {
  careerMatches: 3,          // Career AI: matches shown
  skillPlanSkills: 3,        // Skill Gap: missing skills with a learning plan
  mockInterviewsPerMonth: 2, // Mock interviews sent to a mentor
};

export async function getUserPlan(userId: string): Promise<UserPlan> {
  await query(
    `UPDATE subscriptions SET status = 'EXPIRED', updated_at = NOW()
      WHERE user_id = $1 AND status = 'ACTIVE' AND expires_at IS NOT NULL AND expires_at < NOW()`, [userId],
  ).catch(() => {});
  const row = await queryOne<any>(
    `SELECT p.slug, p.name, p.price_pkr, s.expires_at
       FROM subscriptions s JOIN plans p ON p.id = s.plan_id
      WHERE s.user_id = $1 AND s.status = 'ACTIVE' AND (s.expires_at IS NULL OR s.expires_at > NOW())
      ORDER BY p.price_pkr DESC, s.created_at DESC LIMIT 1`, [userId],
  ).catch(() => null);
  if (row && Number(row.price_pkr) > 0) {
    return { tier: 'premium', planSlug: row.slug, planName: row.name, expiresAt: row.expires_at };
  }
  return { tier: 'free', planSlug: 'free', planName: 'Free', expiresAt: null };
}

export const isPremium = async (userId: string) => (await getUserPlan(userId)).tier === 'premium';
