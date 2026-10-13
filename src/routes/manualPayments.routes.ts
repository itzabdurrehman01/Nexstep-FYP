/**
 * manualPayments.routes.ts — payments that work without a merchant account.
 *
 * The student sends the plan price to the account the admin configured
 * (JazzCash, Easypaisa or bank), then submits the transaction ID (and an
 * optional receipt screenshot). An admin checks it in Admin → Payments and
 * approves (Premium switches on) or rejects it with a reason.
 *
 * Student (mounted at /api/payments, before the gateway router)
 *   GET  /me                        current plan + Free limits
 *   GET  /manual-methods            where to send money
 *   POST /manual                    { planSlug, method, transactionId, senderName, senderAccount, paidAt, note? }
 *   PUT  /manual/:id/receipt        raw image body (png / jpeg / webp, ≤ 3 MB)
 *   POST /manual/:id/withdraw       cancel a submission that is still waiting
 *
 * Admin (mounted on the protected /api/admin router)
 *   GET  /payments?status=          review queue / history
 *   GET  /payments/:id/receipt
 *   POST /payments/:id/approve
 *   POST /payments/:id/reject       { reason }
 *   GET  /payment-settings · PUT /payment-settings
 *   GET  /plans · PUT /plans/:id    { pricePkr, isActive, features }
 */
import express, { Router, Request, Response, NextFunction } from 'express';
import { pool, query, queryOne } from './db.js';
import { requireAuth } from './auth.middleware.js';
import { activateSubscription } from './payments.routes.js';
import { getUserPlan, FREE_LIMITS } from '../services/plan.service.js';
import { notifyUser } from '../services/notify.service.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const METHODS = ['JAZZCASH', 'EASYPAISA', 'BANK_TRANSFER'] as const;
type Method = typeof METHODS[number];
const METHOD_LABEL: Record<Method, string> = { JAZZCASH: 'JazzCash', EASYPAISA: 'Easypaisa', BANK_TRANSFER: 'Bank transfer' };
const RECEIPT_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

const PREMIUM_FEATURES = [
  'All Career AI matches (Free shows your top 3)',
  'Compare careers side by side',
  'Full Skill Gap learning plan for any career',
  'Unlimited mock interviews reviewed by your mentor (Free: 2 a month)',
];

let ready: Promise<void> | null = null;
export function ensureManualPaymentsSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await pool.query(`
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS manual_details JSONB;
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt        BYTEA;
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_mime   VARCHAR(40);
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS reviewed_by    VARCHAR(255);
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS reviewed_at    TIMESTAMPTZ;
        CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_manual_txn
          ON payments (provider, (UPPER(manual_details->>'transactionId')))
          WHERE manual_details IS NOT NULL AND status IN ('PENDING', 'PROCESSING', 'COMPLETED');
        CREATE TABLE IF NOT EXISTS payment_settings (
          id         INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
          data       JSONB NOT NULL DEFAULT '{}',
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS content_seeds (key VARCHAR(80) PRIMARY KEY, seeded_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
      `);
      // One-time tidy-up of the plan list so it matches what Premium really unlocks.
      const done = await queryOne<any>(`SELECT 1 FROM content_seeds WHERE key = 'plans_v2'`);
      if (!done) {
        await pool.query(`UPDATE plans SET features = $1, description = 'Everything you need to plan your path, at no cost.', updated_at = NOW() WHERE slug = 'free'`,
          [JSON.stringify(['Career AI — your top 3 matches', 'Skill Gap for your top matches', 'Interest quiz, universities & scholarships', 'Calendar alerts and mentor sessions', '2 mock interviews a month reviewed by your mentor'])]);
        await pool.query(`UPDATE plans SET name = 'Premium (monthly)', features = $1, description = 'Unlock every career match, full skill plans and unlimited mentor-reviewed interviews.', updated_at = NOW() WHERE slug = 'premium'`,
          [JSON.stringify(PREMIUM_FEATURES)]);
        await pool.query(`UPDATE plans SET is_active = FALSE, updated_at = NOW() WHERE slug = 'pro'`);
        await pool.query(
          `INSERT INTO plans (slug, name, description, price_pkr, billing_period, features, sort_order, is_active)
           VALUES ('premium-yearly', 'Premium (yearly)', 'Premium for 12 months at a lower price.', 9990, 'ANNUAL', $1, 3, TRUE)
           ON CONFLICT (slug) DO NOTHING`, [JSON.stringify(PREMIUM_FEATURES)]);
        await pool.query(`INSERT INTO content_seeds (key) VALUES ('plans_v2') ON CONFLICT DO NOTHING`);
      }
    })().catch((err) => { ready = null; throw err; });
  }
  return ready;
}

const schema = (_req: Request, res: Response, next: NextFunction) =>
  ensureManualPaymentsSchema().then(() => next()).catch((err) => { console.error('[payments] schema', err?.message); res.status(503).json({ error: 'Database not ready.' }); });

// ── Settings (receiving accounts) ────────────────────────────────────────────
interface AccountSetting { enabled: boolean; accountTitle: string; accountNumber: string; bankName?: string; iban?: string }
interface PaymentSettings { jazzcash: AccountSetting; easypaisa: AccountSetting; bank: AccountSetting; instructions: string }
const EMPTY_SETTINGS: PaymentSettings = {
  jazzcash: { enabled: false, accountTitle: '', accountNumber: '' },
  easypaisa: { enabled: false, accountTitle: '', accountNumber: '' },
  bank: { enabled: false, accountTitle: '', accountNumber: '', bankName: '', iban: '' },
  instructions: '',
};
const s = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);

async function loadSettings(): Promise<PaymentSettings> {
  const row = await queryOne<any>(`SELECT data FROM payment_settings WHERE id = 1`);
  const d = row?.data || {};
  return {
    jazzcash: { ...EMPTY_SETTINGS.jazzcash, ...(d.jazzcash || {}) },
    easypaisa: { ...EMPTY_SETTINGS.easypaisa, ...(d.easypaisa || {}) },
    bank: { ...EMPTY_SETTINGS.bank, ...(d.bank || {}) },
    instructions: d.instructions || '',
  };
}

function methodsFrom(st: PaymentSettings) {
  const out: any[] = [];
  if (st.jazzcash.enabled && st.jazzcash.accountNumber) out.push({ method: 'JAZZCASH', label: 'JazzCash', accountTitle: st.jazzcash.accountTitle, accountNumber: st.jazzcash.accountNumber });
  if (st.easypaisa.enabled && st.easypaisa.accountNumber) out.push({ method: 'EASYPAISA', label: 'Easypaisa', accountTitle: st.easypaisa.accountTitle, accountNumber: st.easypaisa.accountNumber });
  if (st.bank.enabled && (st.bank.accountNumber || st.bank.iban)) out.push({ method: 'BANK_TRANSFER', label: 'Bank transfer', accountTitle: st.bank.accountTitle, accountNumber: st.bank.accountNumber, bankName: st.bank.bankName, iban: st.bank.iban });
  return out;
}

// ── Student routes ───────────────────────────────────────────────────────────
export const manualPaymentsRouter = Router();
manualPaymentsRouter.use(['/me', '/manual-methods', '/manual'], requireAuth(), schema);

manualPaymentsRouter.get('/me', async (req, res) => {
  const plan = await getUserPlan(req.user!.id);
  const pending = await queryOne<any>(
    `SELECT pay.id, pay.amount_pkr, pay.provider, pay.initiated_at, pay.manual_details, p.name AS plan_name
       FROM payments pay JOIN plans p ON p.id = pay.plan_id
      WHERE pay.user_id = $1 AND pay.status = 'PROCESSING' ORDER BY pay.created_at DESC LIMIT 1`, [req.user!.id]);
  res.json({ data: { ...plan, limits: FREE_LIMITS, pending: pending || null } });
});

manualPaymentsRouter.get('/manual-methods', async (_req, res) => {
  const st = await loadSettings();
  res.json({ data: methodsFrom(st), instructions: st.instructions });
});

manualPaymentsRouter.post('/manual', async (req, res) => {
  const b = req.body ?? {};
  const method = String(b.method || '') as Method;
  if (!METHODS.includes(method)) return res.status(400).json({ error: 'Choose how you paid.' });
  const st = await loadSettings();
  if (!methodsFrom(st).some((m) => m.method === method)) return res.status(400).json({ error: `${METHOD_LABEL[method]} is not available right now.` });
  const plan = await queryOne<any>(`SELECT id, name, price_pkr FROM plans WHERE slug = $1 AND is_active = TRUE`, [String(b.planSlug || '')]);
  if (!plan || Number(plan.price_pkr) <= 0) return res.status(400).json({ error: 'Choose a paid plan.' });

  const txn = s(b.transactionId, 40).toUpperCase();
  if (!/^[A-Z0-9-]{6,40}$/.test(txn)) return res.status(400).json({ error: 'Enter the transaction ID exactly as shown on your receipt (letters and numbers, at least 6).' });
  const senderName = s(b.senderName, 120);
  if (senderName.length < 3) return res.status(400).json({ error: 'Enter the name of the account you paid from.' });
  const senderAccount = s(b.senderAccount, 40);
  if (method !== 'BANK_TRANSFER' && !/^03\d{2}-?\d{7}$/.test(senderAccount)) return res.status(400).json({ error: 'Enter the mobile number you paid from, e.g. 0300 1234567.' });
  if (method === 'BANK_TRANSFER' && senderAccount.length < 4) return res.status(400).json({ error: 'Enter the last digits of the account you paid from.' });
  const paidAt = new Date(String(b.paidAt || ''));
  if (isNaN(paidAt.getTime()) || paidAt.getTime() > Date.now() + 5 * 60000 || paidAt.getTime() < Date.now() - 14 * 24 * 3600 * 1000)
    return res.status(400).json({ error: 'Enter when you paid (within the last 14 days).' });

  const waiting = await queryOne<any>(`SELECT 1 FROM payments WHERE user_id = $1 AND status = 'PROCESSING'`, [req.user!.id]);
  if (waiting) return res.status(409).json({ error: 'You already have a payment waiting for approval.' });

  try {
    const orderRef = `NX-${Date.now()}-${req.user!.id.slice(0, 6)}`;
    const row = await queryOne<any>(
      `INSERT INTO payments (user_id, plan_id, amount_pkr, provider, provider_order_id, status, manual_details)
       VALUES ($1, $2, $3, $4, $5, 'PROCESSING', $6) RETURNING id`,
      [req.user!.id, plan.id, plan.price_pkr, method, orderRef,
        JSON.stringify({ transactionId: txn, senderName, senderAccount, paidAt: paidAt.toISOString(), note: s(b.note, 500) })]);
    res.status(201).json({ data: { id: row.id, orderRef } });
  } catch (err: any) {
    if (err?.code === '23505') return res.status(409).json({ error: 'This transaction ID has already been submitted.' });
    console.error('[payments] manual submit', err?.message);
    res.status(500).json({ error: 'Could not submit your payment. Please try again.' });
  }
});

manualPaymentsRouter.put('/manual/:id/receipt',
  express.raw({ type: (r) => RECEIPT_TYPES.includes(String(r.headers['content-type'] || '').split(';')[0].trim()), limit: 3 * 1024 * 1024 }),
  async (req, res) => {
    if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Payment not found.' });
    const mime = String(req.headers['content-type'] || '').split(';')[0].trim();
    const body = req.body as Buffer;
    if (!RECEIPT_TYPES.includes(mime) || !Buffer.isBuffer(body) || body.length < 100) return res.status(400).json({ error: 'Upload a PNG, JPG or WEBP screenshot (max 3 MB).' });
    const row = await queryOne<any>(`UPDATE payments SET receipt = $3, receipt_mime = $4, updated_at = NOW()
      WHERE id = $1 AND user_id = $2 AND status = 'PROCESSING' RETURNING id`, [req.params.id, req.user!.id, body, mime]);
    if (!row) return res.status(404).json({ error: 'Payment not found.' });
    res.json({ success: true });
  });

manualPaymentsRouter.post('/manual/:id/withdraw', async (req, res) => {
  if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Payment not found.' });
  const row = await queryOne<any>(`UPDATE payments SET status = 'CANCELLED', failure_reason = 'Withdrawn by student', updated_at = NOW()
    WHERE id = $1 AND user_id = $2 AND status = 'PROCESSING' RETURNING id`, [req.params.id, req.user!.id]);
  if (!row) return res.status(404).json({ error: 'Payment not found.' });
  res.json({ success: true });
});

// ── Admin routes ─────────────────────────────────────────────────────────────
export const adminPaymentsRouter = Router();
adminPaymentsRouter.use(['/payments', '/payment-settings', '/plans'], schema);

adminPaymentsRouter.get('/payments', async (req, res) => {
  const status = String(req.query.status || 'PROCESSING').toUpperCase();
  const params: any[] = [];
  let where = '';
  if (status !== 'ALL') { params.push(status); where = `WHERE pay.status = $1`; }
  const rows = await query<any>(`
    SELECT pay.id, pay.amount_pkr, pay.status, pay.provider, pay.provider_order_id, pay.provider_txn_id, pay.manual_details,
           pay.failure_reason, pay.initiated_at, pay.completed_at, pay.reviewed_by, pay.reviewed_at,
           (pay.receipt IS NOT NULL) AS has_receipt, p.name AS plan_name,
           u.id AS user_id, u.first_name, u.last_name, u.email
      FROM payments pay JOIN plans p ON p.id = pay.plan_id JOIN users u ON u.id = pay.user_id
      ${where} ORDER BY pay.created_at DESC LIMIT 200`, params);
  const counts = await query<any>(`SELECT status, COUNT(*)::int AS n FROM payments GROUP BY status`);
  res.json({
    counts: Object.fromEntries(counts.map((c: any) => [c.status, c.n])),
    data: rows.map((r: any) => ({
      id: r.id, amountPkr: r.amount_pkr, status: r.status, method: r.provider, methodLabel: METHOD_LABEL[r.provider as Method] || r.provider,
      orderRef: r.provider_order_id, transactionId: r.manual_details?.transactionId || r.provider_txn_id, details: r.manual_details || null,
      failureReason: r.failure_reason, submittedAt: r.initiated_at, completedAt: r.completed_at, reviewedBy: r.reviewed_by, reviewedAt: r.reviewed_at,
      hasReceipt: r.has_receipt, planName: r.plan_name,
      student: { id: r.user_id, name: `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.email, email: r.email },
    })),
  });
});

adminPaymentsRouter.get('/payments/:id/receipt', async (req, res) => {
  if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Not found.' });
  const row = await queryOne<any>(`SELECT receipt, receipt_mime FROM payments WHERE id = $1`, [req.params.id]);
  if (!row?.receipt) return res.status(404).json({ error: 'No receipt uploaded.' });
  res.setHeader('Content-Type', row.receipt_mime || 'image/png');
  res.setHeader('Cache-Control', 'private, no-store');
  res.send(row.receipt);
});

adminPaymentsRouter.post('/payments/:id/approve', async (req, res) => {
  if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Payment not found.' });
  const pay = await queryOne<any>(`SELECT pay.*, p.name AS plan_name FROM payments pay JOIN plans p ON p.id = pay.plan_id WHERE pay.id = $1`, [req.params.id]);
  if (!pay) return res.status(404).json({ error: 'Payment not found.' });
  if (pay.status !== 'PROCESSING') return res.status(409).json({ error: `This payment is already ${String(pay.status).toLowerCase()}.` });
  const txn = pay.manual_details?.transactionId || pay.provider_order_id;
  await activateSubscription(pay.user_id, pay.plan_id, pay.id, pay.provider, txn);
  await query(`UPDATE payments SET reviewed_by = $2, reviewed_at = NOW() WHERE id = $1`, [pay.id, req.admin?.email || 'admin']);
  const plan = await getUserPlan(pay.user_id);
  await notifyUser(pay.user_id, {
    type: 'PAYMENT', kind: 'payment', link: '/pricing', title: 'Premium is active',
    body: `Your payment of Rs ${Number(pay.amount_pkr).toLocaleString('en-PK')} was approved. ${pay.plan_name} is active${plan.expiresAt ? ` until ${new Date(plan.expiresAt).toLocaleDateString('en-PK', { dateStyle: 'medium' })}` : ''}.`,
  });
  res.json({ success: true });
});

adminPaymentsRouter.post('/payments/:id/reject', async (req, res) => {
  if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Payment not found.' });
  const reason = s(req.body?.reason, 500);
  if (reason.length < 5) return res.status(400).json({ error: 'Tell the student why (at least 5 characters).' });
  const row = await queryOne<any>(`UPDATE payments SET status = 'FAILED', failure_reason = $2, reviewed_by = $3, reviewed_at = NOW(), updated_at = NOW()
    WHERE id = $1 AND status = 'PROCESSING' RETURNING user_id, amount_pkr`, [req.params.id, reason, req.admin?.email || 'admin']);
  if (!row) return res.status(409).json({ error: 'This payment is no longer waiting for review.' });
  await notifyUser(row.user_id, {
    type: 'PAYMENT', kind: 'payment', link: '/pricing', title: 'Payment not approved',
    body: `Your payment of Rs ${Number(row.amount_pkr).toLocaleString('en-PK')} could not be verified: ${reason}`,
  });
  res.json({ success: true });
});

adminPaymentsRouter.get('/payment-settings', async (_req, res) => {
  res.json({ data: await loadSettings() });
});

adminPaymentsRouter.put('/payment-settings', async (req, res) => {
  const b = req.body ?? {};
  const acc = (v: any, bank = false): AccountSetting => {
    const out: AccountSetting = { enabled: v?.enabled === true, accountTitle: s(v?.accountTitle, 120), accountNumber: s(v?.accountNumber, 40) };
    if (bank) { out.bankName = s(v?.bankName, 120); out.iban = s(v?.iban, 34).toUpperCase().replace(/\s+/g, ''); }
    return out;
  };
  const data: PaymentSettings = { jazzcash: acc(b.jazzcash), easypaisa: acc(b.easypaisa), bank: acc(b.bank, true), instructions: s(b.instructions, 1000) };
  for (const [key, a] of [['JazzCash', data.jazzcash], ['Easypaisa', data.easypaisa]] as const) {
    if (a.enabled && (!/^03\d{2}-?\d{7}$/.test(a.accountNumber) || a.accountTitle.length < 3))
      return res.status(400).json({ error: `${key}: enter the account title and a mobile account number like 0300 1234567.` });
  }
  if (data.bank.enabled && (data.bank.accountTitle.length < 3 || !data.bank.bankName || (!data.bank.accountNumber && !data.bank.iban)))
    return res.status(400).json({ error: 'Bank: enter the bank name, account title and account number or IBAN.' });
  if (data.bank.iban && !/^PK\d{2}[A-Z]{4}\d{16}$/.test(data.bank.iban)) return res.status(400).json({ error: 'Bank: the IBAN should look like PK36SCBL0000001123456702.' });
  await query(`INSERT INTO payment_settings (id, data, updated_at) VALUES (1, $1, NOW())
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`, [JSON.stringify(data)]);
  res.json({ data });
});

adminPaymentsRouter.get('/plans', async (_req, res) => {
  const rows = await query<any>(`SELECT id, slug, name, description, price_pkr, billing_period, features, is_active, sort_order FROM plans ORDER BY sort_order`);
  res.json({ data: rows.map((r: any) => ({ id: r.id, slug: r.slug, name: r.name, description: r.description, pricePkr: r.price_pkr, billingPeriod: r.billing_period, features: r.features || [], isActive: r.is_active })) });
});

adminPaymentsRouter.put('/plans/:id', async (req, res) => {
  if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Plan not found.' });
  const price = Number(req.body?.pricePkr);
  if (!Number.isInteger(price) || price < 0 || price > 1_000_000) return res.status(400).json({ error: 'Price must be a whole number of rupees.' });
  const features = Array.isArray(req.body?.features) ? req.body.features.map((f: any) => s(f, 120)).filter(Boolean).slice(0, 12) : null;
  const row = await queryOne<any>(`UPDATE plans SET price_pkr = CASE WHEN slug = 'free' THEN 0 ELSE $2 END, is_active = CASE WHEN slug = 'free' THEN TRUE ELSE $3 END,
      features = COALESCE($4, features), updated_at = NOW() WHERE id = $1 RETURNING id`,
    [req.params.id, price, req.body?.isActive !== false, features ? JSON.stringify(features) : null]);
  if (!row) return res.status(404).json({ error: 'Plan not found.' });
  res.json({ success: true });
});
