/**
 * notify.service.ts — one place to tell a user about something.
 *
 *   notifyUser(userId, { type, title, body, link })
 *     1. stores a row in `notifications` (bell + inbox + live toasts), always;
 *     2. sends an email too when the user kept "Email notifications" on in
 *        Settings → Preferences and SMTP is configured on the server;
 *     3. for kind 'mentor' messages, respects the "Mentor messages / New student
 *        requests" preference for the email (the in-app row is still stored).
 */
import { query, queryOne } from '../routes/db.js';
import { sendNotificationEmail } from '../routes/email.service.js';

export type NotifyKind = 'general' | 'mentor' | 'payment' | 'alert';

export interface NotifyInput {
  type: string;          // notifications.type, e.g. MENTORSHIP, PAYMENT, ALERT
  title: string;
  body: string;
  link?: string | null;  // app path, e.g. '/mentorship'
  kind?: NotifyKind;
}

export const emailDeliveryReady = () => Boolean(process.env.SMTP_HOST);

let warned = false;

export async function notifyUser(userId: string, n: NotifyInput): Promise<void> {
  const title = String(n.title || '').slice(0, 255);
  const body = String(n.body || '').slice(0, 1000);
  await query(
    `INSERT INTO notifications (user_id, type, title, body, link) VALUES ($1, $2, $3, $4, $5)`,
    [userId, n.type, title, body, n.link ?? null],
  ).catch((err) => console.warn('[notify] insert failed:', err?.message));

  if (!emailDeliveryReady()) {
    if (!warned) { warned = true; console.log('[notify] SMTP_HOST not set — notification emails are skipped.'); }
    return;
  }
  try {
    const u = await queryOne<any>(
      `SELECT u.email, u.first_name, COALESCE(p.preferences, '{}'::jsonb) AS prefs
         FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.id = $1 AND u.is_active = TRUE`, [userId]);
    if (!u?.email) return;
    const prefs = u.prefs || {};
    if (prefs.emailNotif === false) return;
    if (n.kind === 'mentor' && prefs.mentorRequests === false) return;
    if (n.kind === 'alert' && prefs.alertEmails === false) return;
    await sendNotificationEmail(u.email, u.first_name || '', title, body, n.link || '/');
  } catch (err: any) {
    console.warn('[notify] email failed:', err?.message);
  }
}
