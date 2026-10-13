/**
 * alerts.routes.ts — personal calendar alerts ("live alerts").
 *
 * Users create the alerts they need (type, title, date/time, how early to be
 * reminded, repeat). The browser polls /api/alerts/due once a minute; due
 * alerts are returned once, stored as notifications, and repeating alerts move
 * to their next date.
 *
 *   GET    /api/alerts            list my alerts
 *   POST   /api/alerts            { type, title, note?, alertAt, remindBeforeMinutes?, repeat? }
 *   PUT    /api/alerts/:id        same fields (+ status 'active' | 'done')
 *   DELETE /api/alerts/:id
 *   POST   /api/alerts/due        returns alerts that are due now and marks them delivered
 */
import { Router, Request, Response, NextFunction } from 'express';
import { pool, query, queryOne } from './db.js';
import { requireAuth } from './auth.middleware.js';
import { notifyUser } from '../services/notify.service.js';

export const ALERT_TYPES = ['exam', 'deadline', 'admission', 'scholarship', 'session', 'study', 'custom'] as const;
const REPEATS = ['none', 'daily', 'weekly', 'monthly'] as const;
const REMIND_OPTIONS = [0, 15, 30, 60, 180, 1440, 2880, 10080];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ALERTS = 200;

let ready: Promise<void> | null = null;
export function ensureAlertsSchema(): Promise<void> {
  if (!ready) {
    ready = pool.query(`
      CREATE TABLE IF NOT EXISTS user_alerts (
        id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type                   VARCHAR(20)  NOT NULL,
        title                  VARCHAR(200) NOT NULL,
        note                   TEXT,
        alert_at               TIMESTAMPTZ  NOT NULL,
        remind_before_minutes  INTEGER      NOT NULL DEFAULT 0,
        repeat                 VARCHAR(10)  NOT NULL DEFAULT 'none',
        status                 VARCHAR(10)  NOT NULL DEFAULT 'active',
        last_fired_at          TIMESTAMPTZ,
        created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_user_alerts_due ON user_alerts(user_id, status, alert_at);
    `).then(() => undefined).catch((err) => { ready = null; throw err; });
  }
  return ready;
}

const toApi = (r: any) => ({
  id: r.id, type: r.type, title: r.title, note: r.note, alertAt: r.alert_at,
  remindBeforeMinutes: r.remind_before_minutes, repeat: r.repeat, status: r.status,
  lastFiredAt: r.last_fired_at, createdAt: r.created_at,
});

function validate(body: any, partialStatus = false) {
  const type = String(body?.type ?? '');
  if (!(ALERT_TYPES as readonly string[]).includes(type)) return { error: 'Choose an alert type.' };
  const title = String(body?.title ?? '').trim().slice(0, 200);
  if (title.length < 2) return { error: 'Give the alert a title.' };
  const when = new Date(String(body?.alertAt ?? ''));
  if (isNaN(when.getTime())) return { error: 'Choose a valid date and time.' };
  if (when.getTime() > Date.now() + 3 * 365 * 24 * 3600 * 1000) return { error: 'That date is too far in the future.' };
  const remind = Number(body?.remindBeforeMinutes ?? 0);
  if (!REMIND_OPTIONS.includes(remind)) return { error: 'Choose when to be reminded.' };
  const repeat = String(body?.repeat ?? 'none');
  if (!(REPEATS as readonly string[]).includes(repeat)) return { error: 'Choose how often it repeats.' };
  if (!partialStatus && repeat === 'none' && when.getTime() - remind * 60000 < Date.now() - 60000)
    return { error: 'That reminder time has already passed. Pick a later date or an earlier reminder.' };
  const status = partialStatus && ['active', 'done'].includes(body?.status) ? body.status : 'active';
  return { value: { type, title, note: String(body?.note ?? '').trim().slice(0, 1000) || null, when, remind, repeat, status } };
}

function nextOccurrence(at: Date, repeat: string): Date | null {
  const d = new Date(at);
  if (repeat === 'daily') d.setDate(d.getDate() + 1);
  else if (repeat === 'weekly') d.setDate(d.getDate() + 7);
  else if (repeat === 'monthly') d.setMonth(d.getMonth() + 1);
  else return null;
  return d;
}

export const alertsRouter = Router();
alertsRouter.use(requireAuth(), (_req: Request, res: Response, next: NextFunction) => {
  ensureAlertsSchema().then(() => next()).catch(() => res.status(503).json({ error: 'Database not ready.' }));
});

alertsRouter.get('/', async (req, res) => {
  const rows = await query<any>(`SELECT * FROM user_alerts WHERE user_id = $1 ORDER BY status = 'done', alert_at ASC LIMIT ${MAX_ALERTS}`, [req.user!.id]);
  res.json({ data: rows.map(toApi) });
});

alertsRouter.post('/', async (req, res) => {
  const v = validate(req.body);
  if ('error' in v) return res.status(400).json({ error: v.error });
  const count = await queryOne<any>(`SELECT COUNT(*)::int AS n FROM user_alerts WHERE user_id = $1 AND status = 'active'`, [req.user!.id]);
  if ((count?.n ?? 0) >= MAX_ALERTS) return res.status(429).json({ error: 'You have too many active alerts. Delete some first.' });
  const { type, title, note, when, remind, repeat } = v.value!;
  const row = await queryOne<any>(
    `INSERT INTO user_alerts (user_id, type, title, note, alert_at, remind_before_minutes, repeat)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [req.user!.id, type, title, note, when.toISOString(), remind, repeat]);
  res.status(201).json({ data: toApi(row) });
});

alertsRouter.put('/:id', async (req, res) => {
  if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Alert not found.' });
  const v = validate(req.body, true);
  if ('error' in v) return res.status(400).json({ error: v.error });
  const { type, title, note, when, remind, repeat, status } = v.value!;
  const row = await queryOne<any>(
    `UPDATE user_alerts SET type = $3, title = $4, note = $5, alert_at = $6, remind_before_minutes = $7, repeat = $8,
            status = $9, last_fired_at = CASE WHEN alert_at <> $6 THEN NULL ELSE last_fired_at END, updated_at = NOW()
      WHERE id = $1 AND user_id = $2 RETURNING *`,
    [req.params.id, req.user!.id, type, title, note, when.toISOString(), remind, repeat, status]);
  if (!row) return res.status(404).json({ error: 'Alert not found.' });
  res.json({ data: toApi(row) });
});

alertsRouter.delete('/:id', async (req, res) => {
  if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Alert not found.' });
  await query(`DELETE FROM user_alerts WHERE id = $1 AND user_id = $2`, [req.params.id, req.user!.id]);
  res.json({ success: true });
});

/**
 * Fires every alert whose reminder time has come: stores a notification (and
 * emails it when the user allows), then moves repeating alerts to their next
 * date. Runs for everyone once a minute and for the caller on /due.
 */
export async function processDueAlerts(userId?: string) {
  const params: any[] = [];
  let who = '';
  if (userId) { params.push(userId); who = `AND user_id = $1`; }
  const due = await query<any>(`
    SELECT * FROM user_alerts
     WHERE status = 'active' ${who}
       AND alert_at - make_interval(mins => remind_before_minutes) <= NOW()
       AND (last_fired_at IS NULL OR last_fired_at < alert_at - make_interval(mins => remind_before_minutes))
     ORDER BY alert_at LIMIT 200`, params);
  const out = [];
  for (const a of due) {
    // claim the alert first so two runs never fire it twice
    const next = nextOccurrence(new Date(a.alert_at), a.repeat);
    let claimed;
    if (next) {
      let n: Date = next;
      while (n.getTime() - a.remind_before_minutes * 60000 < Date.now()) n = nextOccurrence(n, a.repeat)!;
      claimed = await queryOne<any>(`UPDATE user_alerts SET last_fired_at = NOW(), alert_at = $3, updated_at = NOW()
        WHERE id = $1 AND alert_at = $2 AND status = 'active' RETURNING id`, [a.id, a.alert_at, n.toISOString()]);
    } else {
      claimed = await queryOne<any>(`UPDATE user_alerts SET last_fired_at = NOW(),
          status = CASE WHEN alert_at <= NOW() THEN 'done' ELSE status END, updated_at = NOW()
        WHERE id = $1 AND (last_fired_at IS NULL OR last_fired_at < alert_at - make_interval(mins => remind_before_minutes)) RETURNING id`, [a.id]);
    }
    if (!claimed) continue;
    await notifyUser(a.user_id, {
      type: 'ALERT', kind: 'alert', link: '/calendar-notif', title: a.title,
      body: a.note || `Reminder for ${new Date(a.alert_at).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Karachi' })}`,
    });
    out.push(toApi(a));
  }
  return out;
}

let timer: NodeJS.Timeout | null = null;
/** Background job: fire due alerts every minute even when the user is offline (emails). */
export function startAlertScheduler() {
  if (timer) return;
  timer = setInterval(() => {
    ensureAlertsSchema().then(() => processDueAlerts()).catch((err) => console.warn('[alerts] scheduler:', err?.message));
  }, 60 * 1000);
  timer.unref?.();
}

alertsRouter.post('/due', async (req, res) => {
  res.json({ data: await processDueAlerts(req.user!.id) });
});
