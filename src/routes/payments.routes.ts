/**
 * src/server/payments.routes.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Payment and subscription endpoints.
 *
 *   GET  /api/payments/plans             — list available plans (public)
 *   GET  /api/payments/subscription      — current user's active subscription
 *   POST /api/payments/initiate          — create a payment order
 *   POST /api/payments/verify            — verify payment after provider redirect
 *   POST /api/payments/webhook/jazzcash  — JazzCash IPN callback
 *   POST /api/payments/webhook/easypaisa — Easypaisa IPN callback
 *   GET  /api/payments/history           — user's payment history
 *   POST /api/payments/cancel            — cancel active subscription
 *
 * PAYMENT FLOW:
 *   1. User selects plan  →  POST /api/payments/initiate
 *      Backend creates a PENDING payment record + returns provider redirect URL.
 *   2. User completes payment on provider page.
 *   3. Provider calls webhook (IPN) or user returns via redirect.
 *   4. Backend verifies with provider API → updates payment + subscription.
 *   5. Frontend polls /api/payments/subscription or receives redirect.
 *
 * SECURITY:
 *   - Webhook signatures verified before processing (HMAC/hash).
 *   - Idempotency: payment_events table prevents duplicate processing.
 *   - Payment status set to COMPLETED only after server-side verification.
 *   - No secrets returned to frontend.
 *   - All parameterised queries — no SQL injection.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { pool, query, queryOne } from './db.js';
import { requireAuth } from './auth.middleware.js';
import { requireAdmin } from './adminPortal.routes.js';

const router = Router();

const PAYMENT_MODE = process.env.PAYMENTS_MODE || (process.env.NODE_ENV === 'production' ? 'disabled' : 'test');
const PUBLIC_APP_URL = process.env.PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:5173';

type PaymentProvider = 'JAZZCASH' | 'EASYPAISA' | 'CARD' | 'BANK_TRANSFER';

// ── Provider config (from env — never hardcoded) ──────────────────────────────
function getJazzCashConfig() {
  return {
    merchantId:  process.env.JAZZCASH_MERCHANT_ID  || '',
    password:    process.env.JAZZCASH_PASSWORD      || '',
    integrityKey: process.env.JAZZCASH_INTEGRITY_KEY || '',
    baseUrl:     process.env.JAZZCASH_BASE_URL      || 'https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/',
    returnUrl:   process.env.PAYMENT_RETURN_URL || PUBLIC_APP_URL,
  };
}

function getEasypaisaConfig() {
  return {
    storeId:    process.env.EASYPAISA_STORE_ID    || '',
    hashKey:    process.env.EASYPAISA_HASH_KEY    || '',
    accountNum: process.env.EASYPAISA_ACCOUNT_NUM || '',
    baseUrl:    process.env.EASYPAISA_BASE_URL    || 'https://easypaisa.com.pk/api',
    returnUrl:  process.env.PAYMENT_RETURN_URL || PUBLIC_APP_URL,
  };
}

function isProductionUrl(value: string) {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function providerReadiness(provider: PaymentProvider) {
  const isLive = PAYMENT_MODE === 'live';
  const publicUrlReady = !isLive || isProductionUrl(PUBLIC_APP_URL);

  if (provider === 'JAZZCASH') {
    const cfg = getJazzCashConfig();
    const configured = Boolean(cfg.merchantId && cfg.password && cfg.integrityKey);
    const usesLiveGateway = !isLive || /^https:\/\/payments\.jazzcash\.com\.pk\//.test(cfg.baseUrl);
    const liveReady = configured && publicUrlReady && usesLiveGateway;
    return {
      id: provider,
      enabled: isLive ? liveReady : true,
      mode: liveReady ? 'live' : 'sandbox',
      reason: isLive && !liveReady ? (!configured ? 'Merchant credentials are not configured.' : 'A live JazzCash gateway URL is required.') : null,
    };
  }

  if (provider === 'EASYPAISA') {
    const cfg = getEasypaisaConfig();
    const configured = Boolean(cfg.storeId && cfg.hashKey && cfg.accountNum);
    const liveReady = configured && publicUrlReady;
    return {
      id: provider,
      enabled: isLive ? liveReady : true,
      mode: liveReady ? 'live' : 'sandbox',
      reason: isLive && !liveReady ? 'Merchant credentials are not configured.' : null,
    };
  }

  if (provider === 'BANK_TRANSFER') {
    const configured = Boolean(process.env.BANK_ACCOUNT_NUMBER && process.env.BANK_ACCOUNT_TITLE && process.env.BANK_NAME);
    return {
      id: provider,
      enabled: true,
      mode: configured ? 'manual_review' : 'sandbox',
      reason: null,
    };
  }

  return {
    id: provider,
    enabled: true,
    mode: isLive ? 'live' : 'sandbox',
    reason: null,
  };
}

function requireReadyProvider(res: Response, provider: PaymentProvider) {
  const readiness = providerReadiness(provider);
  if (readiness.enabled) return true;
  res.status(503).json({
    error: `${provider} is unavailable.`,
    code: 'PAYMENT_PROVIDER_UNAVAILABLE',
    provider: readiness,
  });
  return false;
}

// ── Webhook signature helpers ─────────────────────────────────────────────────

/**
 * Verify JazzCash HMAC-SHA256 signature.
 * JazzCash signs: sorted key=value pairs joined by & with integrity key prepended.
 */
function verifyJazzCashSignature(payload: Record<string, string>, receivedHash: string): boolean {
  const cfg = getJazzCashConfig();
  if (!cfg.integrityKey) return false; // Config not set — reject
  const sorted = Object.keys(payload)
    .filter(k => k !== 'pp_SecureHash')
    .sort()
    .map(k => payload[k])
    .join('&');
  const toHash = `${cfg.integrityKey}&${sorted}`;
  const expected = crypto.createHmac('sha256', cfg.integrityKey).update(toHash).digest('hex').toUpperCase();
  const provided = String(receivedHash).toUpperCase();
  return provided.length === expected.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}

/**
 * Verify Easypaisa hash.
 * Easypaisa uses SHA-1 of specific fields joined with hash key.
 */
function verifyEasypaisaHash(payload: Record<string, string>, receivedHash: string): boolean {
  const cfg = getEasypaisaConfig();
  if (!cfg.hashKey) return false;
  const toHash = `${payload.amount}${payload.orderRefNum}${payload.paymentMode}${payload.status}${payload.storeId}${cfg.hashKey}`;
  const expected = crypto.createHash('sha1').update(toHash).digest('hex');
  const provided = String(receivedHash);
  return provided.length === expected.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}

// ── Helper: activate subscription after confirmed payment ─────────────────────
export async function activateSubscription(
  userId: string,
  planId: string,
  paymentId: string,
  provider: string,
  providerTxnId: string
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Length of the plan; time left on a current paid plan is carried over (renewal).
    const planRow = await client.query(`SELECT billing_period, price_pkr FROM plans WHERE id = $1`, [planId]);
    const period = planRow.rows[0]?.billing_period;
    const days = period === 'ANNUAL' ? 365 : period === 'QUARTERLY' ? 90 : period === 'LIFETIME' ? 36500 : 30;
    const current = await client.query(
      `SELECT s.expires_at FROM subscriptions s JOIN plans p ON p.id = s.plan_id
        WHERE s.user_id = $1 AND s.status = 'ACTIVE' AND p.price_pkr > 0 AND s.expires_at > NOW()
        ORDER BY s.expires_at DESC LIMIT 1`, [userId]);
    const startFrom = current.rows[0]?.expires_at ? new Date(current.rows[0].expires_at).getTime() : Date.now();

    // Expire any existing active subscription
    await client.query(
      `UPDATE subscriptions SET status = 'EXPIRED', updated_at = NOW()
       WHERE user_id = $1 AND status = 'ACTIVE'`,
      [userId]
    );

    const expiresAt = new Date(startFrom + days * 24 * 60 * 60 * 1000);
    const subResult = await client.query(
      `INSERT INTO subscriptions
         (user_id, plan_id, status, provider, provider_sub_id, started_at, expires_at)
       VALUES ($1, $2, 'ACTIVE', $3, $4, NOW(), $5)
       RETURNING id`,
      [userId, planId, provider, providerTxnId, expiresAt]
    );

    // Mark payment as completed and link subscription
    await client.query(
      `UPDATE payments SET
         status = 'COMPLETED',
         provider_txn_id = $1,
         subscription_id = $2,
         completed_at = NOW(),
         updated_at = NOW()
       WHERE id = $3`,
      [providerTxnId, subResult.rows[0].id, paymentId]
    );

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// ── GET /api/payments/plans — public ─────────────────────────────────────────
router.get('/plans', async (_req: Request, res: Response) => {
  try {
    const plans = await query(
      `SELECT id, slug, name, description, price_pkr, billing_period, features, sort_order
       FROM plans WHERE is_active = TRUE ORDER BY sort_order ASC`
    );
    res.json({ data: plans });
  } catch (err: any) {
    res.status(500).json({ error: 'Could not load plans.' });
  }
});

router.get('/providers', (_req: Request, res: Response) => {
  const providers: PaymentProvider[] = ['EASYPAISA', 'JAZZCASH', 'CARD', 'BANK_TRANSFER'];
  res.json({
    paymentsMode: PAYMENT_MODE,
    data: providers.map(providerReadiness),
  });
});

// ── GET /api/payments/subscription — authenticated ────────────────────────────
router.get('/subscription', requireAuth(), async (req: Request, res: Response) => {
  try {
    const sub = await queryOne<any>(
      `SELECT s.id, s.status, s.started_at, s.expires_at, s.auto_renew,
              p.slug AS plan_slug, p.name AS plan_name, p.price_pkr, p.features
       FROM subscriptions s
       JOIN plans p ON p.id = s.plan_id
       WHERE s.user_id = $1 AND s.status = 'ACTIVE'
       ORDER BY s.created_at DESC LIMIT 1`,
      [req.user!.id]
    );
    res.json({ data: sub ?? null });
  } catch (err: any) {
    res.status(500).json({ error: 'Could not load subscription.' });
  }
});

// ── GET /api/payments/history — authenticated ─────────────────────────────────
router.get('/history', requireAuth(), async (req: Request, res: Response) => {
  try {
    const payments = await query<any>(
      `SELECT pay.id, pay.amount_pkr, pay.currency, pay.status, pay.provider,
              pay.provider_txn_id, pay.initiated_at, pay.completed_at, pay.failure_reason,
              pay.manual_details, p.name AS plan_name
       FROM payments pay
       JOIN plans p ON p.id = pay.plan_id
       WHERE pay.user_id = $1
       ORDER BY pay.created_at DESC LIMIT 50`,
      [req.user!.id]
    );
    res.json({ data: payments });
  } catch (err: any) {
    res.status(500).json({ error: 'Could not load payment history.' });
  }
});

// ── POST /api/payments/initiate — authenticated ───────────────────────────────
// Creates a PENDING payment record and returns provider redirect data.
// IMPORTANT: Payment is NOT confirmed here. Confirmation happens via webhook.
router.post('/initiate', requireAuth(), async (req: Request, res: Response) => {
  try {
    const { planSlug, provider } = req.body;

    if (!planSlug || !provider) {
      return res.status(400).json({ error: 'planSlug and provider are required.' });
    }

    const validProviders = ['JAZZCASH', 'EASYPAISA', 'CARD', 'BANK_TRANSFER'];
    if (!validProviders.includes(provider)) {
      return res.status(400).json({ error: `Invalid provider. Must be one of: ${validProviders.join(', ')}` });
    }

    const plan = await queryOne<any>(
      `SELECT id, slug, name, price_pkr FROM plans WHERE slug = $1 AND is_active = TRUE`,
      [planSlug]
    );
    if (!plan) return res.status(404).json({ error: 'Plan not found.' });

    // Free plan — activate immediately, no payment needed
    if (plan.price_pkr === 0) {
      const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(`UPDATE subscriptions SET status = 'EXPIRED', updated_at = NOW() WHERE user_id = $1 AND status = 'ACTIVE'`, [req.user!.id]);
        await client.query(
          `INSERT INTO subscriptions (user_id, plan_id, status, started_at, expires_at)
           VALUES ($1, $2, 'ACTIVE', NOW(), $3)`,
          [req.user!.id, plan.id, expiresAt]
        );
        await client.query('COMMIT');
      } catch (e) { await client.query('ROLLBACK'); throw e; }
      return res.json({ status: 'activated', message: 'Free plan activated.', plan: plan.name });
    }

    if (!requireReadyProvider(res, provider as PaymentProvider)) return;

    // Create PENDING payment record
    const orderRef = `CC-${Date.now()}-${req.user!.id.slice(0, 8)}`;
    const paymentResult = await query<any>(
      `INSERT INTO payments (user_id, plan_id, amount_pkr, provider, provider_order_id, status)
       VALUES ($1, $2, $3, $4, $5, 'PENDING')
       RETURNING id`,
      [req.user!.id, plan.id, plan.price_pkr, provider, orderRef]
    );
    const paymentId = paymentResult[0].id;

    // Build provider-specific redirect data
    let providerData: Record<string, any> = {};

    if (provider === 'JAZZCASH') {
      const cfg = getJazzCashConfig();
      const dateTime = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
      const expiryDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);

      const fields: Record<string, string> = {
        pp_Version:       '1.1',
        pp_TxnType:       'MWALLET',
        pp_Language:      'EN',
        pp_MerchantID:    cfg.merchantId,
        pp_Password:      cfg.password,
        pp_TxnRefNo:      orderRef,
        pp_Amount:        String(plan.price_pkr * 100), // paisas
        pp_TxnCurrency:   'PKR',
        pp_TxnDateTime:   dateTime,
        pp_BillReference: `PLAN-${plan.slug}`,
        pp_Description:   `NexStep ${plan.name} subscription`,
        pp_TxnExpiryDateTime: expiryDate,
        pp_ReturnURL:     cfg.returnUrl,
        pp_SecureHash:    '',
      };

      if (cfg.integrityKey) {
        const sorted = Object.keys(fields)
          .filter(k => k !== 'pp_SecureHash')
          .sort()
          .map(k => fields[k])
          .join('&');
        fields.pp_SecureHash = crypto.createHmac('sha256', cfg.integrityKey)
          .update(`${cfg.integrityKey}&${sorted}`).digest('hex').toUpperCase();
      }

      const isLive = PAYMENT_MODE === 'live' && Boolean(cfg.merchantId);
      providerData = {
        method:      isLive ? 'POST' : 'SANDBOX',
        actionUrl:   isLive ? cfg.baseUrl : null,
        fields:      isLive ? fields : undefined,
        paymentId,
        isSandbox:   !isLive,
        provider:    'JAZZCASH',
        note:        isLive ? 'Redirecting to JazzCash...' : 'JazzCash Sandbox active. Test payment can be verified instantly.',
      };
    } else if (provider === 'EASYPAISA') {
      const cfg = getEasypaisaConfig();
      const isLive = PAYMENT_MODE === 'live' && Boolean(cfg.storeId && cfg.hashKey);
      providerData = {
        method:    isLive ? 'POST' : 'SANDBOX',
        actionUrl: isLive ? cfg.baseUrl : null,
        fields: isLive ? {
          storeId:     cfg.storeId,
          amount:      String(plan.price_pkr),
          postBackURL: cfg.returnUrl,
          orderRefNum: orderRef,
          mobileNum:   '',
          emailAddr:   req.user!.email ?? '',
          merchantPaymentMethod: 'PayFast',
          language:    'EN',
        } : undefined,
        paymentId,
        isSandbox: !isLive,
        provider:  'EASYPAISA',
        note:      isLive ? 'Redirecting to Easypaisa...' : 'Easypaisa Sandbox active. Test payment can be verified instantly.',
      };
    } else if (provider === 'BANK_TRANSFER') {
      // Manual bank transfer or sandbox instant approval
      providerData = {
        method:       'MANUAL',
        paymentId,
        isSandbox:    PAYMENT_MODE !== 'live',
        provider:     'BANK_TRANSFER',
        instructions: {
          bankName:      process.env.BANK_NAME || 'Meezan Bank Limited',
          accountTitle:  process.env.BANK_ACCOUNT_TITLE || 'NexStep Career Counseling Ltd',
          accountNumber: process.env.BANK_ACCOUNT_NUMBER || '0101-0203040506',
          amount:        plan.price_pkr,
          reference:     orderRef,
          note:          'Send payment receipt or screenshot to support@nexstep.edu.pk with your reference number, or click Instant Sandbox Verify.',
        },
      };
    } else {
      // CARD
      providerData = {
        method:    'SANDBOX',
        paymentId,
        isSandbox: true,
        provider:  'CARD',
        note:      'Card Sandbox Mode active. Test payment can be verified instantly with test card details.',
      };
    }

    res.json({
      paymentId,
      orderRef,
      plan:    plan.name,
      amount:  plan.price_pkr,
      status:  'pending',
      provider: providerData,
    });
  } catch (err: any) {
    console.error('Payment initiation error:', err);
    res.status(500).json({ error: 'Could not initiate payment. Please try again.' });
  }
});

// ── POST /api/payments/verify-sandbox — authenticated ───────────────────────────
// Allows completing test payments in development/sandbox mode to test pro features.
router.post('/verify-sandbox', requireAuth(), async (req: Request, res: Response) => {
  try {
    const { paymentId, testMobile, testAccount } = req.body;
    if (!paymentId) {
      return res.status(400).json({ error: 'paymentId is required.' });
    }

    const payment = await queryOne<any>(
      `SELECT pay.id, pay.user_id, pay.plan_id, pay.amount_pkr, pay.status, pay.provider, pay.provider_order_id
       FROM payments pay WHERE pay.id = $1`,
      [paymentId]
    );
    if (!payment) return res.status(404).json({ error: 'Payment record not found.' });
    if (payment.user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden.' });
    }
    if (payment.status === 'COMPLETED') {
      return res.json({ status: 'already_completed', message: 'Payment already verified.' });
    }

    // Test payments would hand out Premium for free, so they need an explicit opt-in.
    if (process.env.ENABLE_SANDBOX_PAYMENTS !== 'true') {
      return res.status(403).json({ error: 'Test payments are turned off. Pay with JazzCash, Easypaisa or bank transfer and submit the transaction ID.' });
    }

    const readiness = providerReadiness(payment.provider);
    if (PAYMENT_MODE === 'live' && readiness.mode === 'live') {
      return res.status(400).json({ error: 'Sandbox verification is not permitted for live merchant mode.' });
    }

    const fakeTxnId = `SANDBOX-${payment.provider}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    await activateSubscription(payment.user_id, payment.plan_id, payment.id, payment.provider, fakeTxnId);

    const plan = await queryOne<any>("SELECT name, slug FROM plans WHERE id = $1", [payment.plan_id]);
    res.json({
      status: 'success',
      message: `${plan?.name ?? 'Premium'} plan activated successfully (Sandbox).`,
      planSlug: plan?.slug ?? 'pro',
    });
  } catch (err: any) {
    console.error('Sandbox payment verification error:', err);
    res.status(500).json({ error: 'Sandbox verification failed. Please try again.' });
  }
});

// ── POST /api/payments/verify — called after provider redirect ─────────────────
// Validates the provider response and marks payment + subscription active.
// NEVER trust frontend-only success claims.
router.post('/verify', requireAuth(), async (req: Request, res: Response) => {
  try {
    const { paymentId, provider, providerTxnId, providerPayload } = req.body;

    if (!paymentId || !provider) {
      return res.status(400).json({ error: 'paymentId and provider are required.' });
    }

    const payment = await queryOne<any>(
      `SELECT pay.id, pay.user_id, pay.plan_id, pay.amount_pkr, pay.status, pay.provider, pay.provider_order_id
       FROM payments pay WHERE pay.id = $1`,
      [paymentId]
    );
    if (!payment) return res.status(404).json({ error: 'Payment record not found.' });

    // Ownership check — user can only verify their own payment
    if (payment.user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden.' });
    }

    if (payment.provider !== provider) {
      return res.status(400).json({ error: 'Payment provider does not match the original order.' });
    }

    if (payment.status === 'COMPLETED') {
      return res.json({ status: 'already_completed', message: 'Payment already verified.' });
    }

    // Verify provider signature / status
    let verified = false;
    let txnId    = providerTxnId ?? payment.provider_order_id;

    if (provider === 'JAZZCASH' && providerPayload) {
      if (!requireReadyProvider(res, 'JAZZCASH')) return;
      const responseCode = providerPayload.pp_ResponseCode ?? providerPayload.responseCode;
      const secureHash   = providerPayload.pp_SecureHash   ?? '';
      const validSig     = verifyJazzCashSignature(providerPayload, secureHash);
      verified = validSig && responseCode === '000';
      txnId    = providerPayload.pp_TxnRefNo ?? txnId;
    } else if (provider === 'EASYPAISA' && providerPayload) {
      if (!requireReadyProvider(res, 'EASYPAISA')) return;
      const status   = providerPayload.status  ?? '';
      const hash     = providerPayload.paymentHash ?? '';
      const validSig = verifyEasypaisaHash(providerPayload, hash);
      verified = validSig && status === 'PAID';
      txnId    = providerPayload.transactionId ?? txnId;
    } else if (provider === 'BANK_TRANSFER') {
      // Bank transfer requires admin manual approval — mark as PROCESSING
      await query(
        "UPDATE payments SET status = 'PROCESSING', updated_at = NOW() WHERE id = $1",
        [paymentId]
      );
      return res.json({ status: 'processing', message: 'Bank transfer received. Admin will verify within 24 hours.' });
    }

    if (!verified) {
      await query("UPDATE payments SET status = 'FAILED', failure_reason = 'Provider verification failed', updated_at = NOW() WHERE id = $1", [paymentId]);
      return res.status(400).json({ status: 'failed', message: 'Payment verification failed. Please try again or contact support.' });
    }

    // Activate subscription
    await activateSubscription(payment.user_id, payment.plan_id, paymentId, provider, txnId);

    const plan = await queryOne<any>("SELECT name FROM plans WHERE id = $1", [payment.plan_id]);
    res.json({ status: 'success', message: `${plan?.name ?? 'Premium'} plan activated successfully.` });
  } catch (err: any) {
    console.error('Payment verify error:', err);
    res.status(500).json({ error: 'Payment verification failed. Please contact support.' });
  }
});

// ── POST /api/payments/:paymentId/approve-bank-transfer — admin only ──────────
// A bank transfer is activated only after an administrator verifies the payment.
router.post('/:paymentId/approve-bank-transfer', requireAdmin, async (req: Request, res: Response) => {
  try {
    const payment = await queryOne<any>(
      `SELECT id, user_id, plan_id, status, provider, provider_order_id
       FROM payments WHERE id = $1`,
      [req.params.paymentId]
    );
    if (!payment) return res.status(404).json({ error: 'Payment record not found.' });
    if (payment.provider !== 'BANK_TRANSFER') return res.status(400).json({ error: 'Only bank transfers can be approved here.' });
    if (payment.status === 'COMPLETED') return res.json({ status: 'already_completed', message: 'Payment already approved.' });
    if (!['PENDING', 'PROCESSING'].includes(payment.status)) {
      return res.status(400).json({ error: `Cannot approve a ${payment.status.toLowerCase()} payment.` });
    }

    await activateSubscription(
      payment.user_id,
      payment.plan_id,
      payment.id,
      'BANK_TRANSFER',
      payment.provider_order_id
    );
    res.json({ status: 'success', message: 'Bank transfer approved and subscription activated.' });
  } catch (err: any) {
    console.error('Bank transfer approval error:', err.message);
    res.status(500).json({ error: 'Could not approve bank transfer.' });
  }
});

// ── POST /api/payments/webhook/jazzcash — IPN callback (no auth) ──────────────
// JazzCash calls this URL directly. Must verify signature and be idempotent.
router.post('/webhook/jazzcash', async (req: Request, res: Response) => {
  const payload: Record<string, string> = req.body;
  const eventId     = payload.pp_TxnRefNo ?? `jc-${Date.now()}`;
  const receivedHash = payload.pp_SecureHash ?? '';

  try {
    if (!providerReadiness('JAZZCASH').enabled) {
      return res.status(503).send('JazzCash is unavailable');
    }
    // 1. Idempotency check
    const existing = await queryOne(
      "SELECT id FROM payment_events WHERE provider = 'JAZZCASH' AND provider_event_id = $1",
      [eventId]
    );
    if (existing) {
      return res.status(200).send('OK'); // Already processed
    }

    // 2. Record event (before processing — prevents race conditions)
    const eventResult = await query<any>(
      "INSERT INTO payment_events (provider, provider_event_id, event_type, raw_payload) VALUES ('JAZZCASH', $1, $2, $3) RETURNING id",
      [eventId, payload.pp_ResponseCode === '000' ? 'payment.completed' : 'payment.failed', JSON.stringify(payload)]
    );
    const eventDbId = eventResult[0].id;

    // 3. Verify signature
    const sigValid = verifyJazzCashSignature(payload, receivedHash);
    if (!sigValid) {
      await query("UPDATE payment_events SET error = 'Invalid signature', processed = TRUE, processed_at = NOW() WHERE id = $1", [eventDbId]);
      return res.status(400).send('Invalid signature');
    }

    // 4. Find payment record
    const orderRef = payload.pp_TxnRefNo;
    const payment  = await queryOne<any>(
      "SELECT id, user_id, plan_id, status FROM payments WHERE provider_order_id = $1",
      [orderRef]
    );

    if (!payment || payment.status === 'COMPLETED') {
      await query("UPDATE payment_events SET processed = TRUE, processed_at = NOW(), payment_id = $2 WHERE id = $1", [eventDbId, payment?.id ?? null]);
      return res.status(200).send('OK');
    }

    // 5. Activate or fail
    if (payload.pp_ResponseCode === '000') {
      await activateSubscription(payment.user_id, payment.plan_id, payment.id, 'JAZZCASH', orderRef);
    } else {
      await query("UPDATE payments SET status = 'FAILED', failure_reason = $1, updated_at = NOW() WHERE id = $2",
        [`JazzCash response code: ${payload.pp_ResponseCode}`, payment.id]);
    }

    await query("UPDATE payment_events SET processed = TRUE, processed_at = NOW(), payment_id = $2 WHERE id = $1", [eventDbId, payment.id]);
    res.status(200).send('OK');
  } catch (err: any) {
    console.error('JazzCash webhook error:', err.message);
    res.status(500).send('Internal error');
  }
});

// ── POST /api/payments/webhook/easypaisa — IPN callback (no auth) ─────────────
router.post('/webhook/easypaisa', async (req: Request, res: Response) => {
  const payload: Record<string, string> = req.body;
  const eventId = payload.orderRefNum ?? payload.transactionId ?? `ep-${Date.now()}`;

  try {
    if (!providerReadiness('EASYPAISA').enabled) {
      return res.status(503).json({ error: 'Easypaisa is unavailable' });
    }
    const existing = await queryOne(
      "SELECT id FROM payment_events WHERE provider = 'EASYPAISA' AND provider_event_id = $1",
      [eventId]
    );
    if (existing) return res.status(200).json({ status: 'already_processed' });

    const eventResult = await query<any>(
      "INSERT INTO payment_events (provider, provider_event_id, event_type, raw_payload) VALUES ('EASYPAISA', $1, $2, $3) RETURNING id",
      [eventId, payload.status === 'PAID' ? 'payment.completed' : 'payment.failed', JSON.stringify(payload)]
    );
    const eventDbId = eventResult[0].id;

    const hashValid = verifyEasypaisaHash(payload, payload.paymentHash ?? '');
    if (!hashValid) {
      await query("UPDATE payment_events SET error = 'Invalid hash', processed = TRUE, processed_at = NOW() WHERE id = $1", [eventDbId]);
      return res.status(400).json({ status: 'invalid_hash' });
    }

    const payment = await queryOne<any>(
      "SELECT id, user_id, plan_id, status FROM payments WHERE provider_order_id = $1",
      [payload.orderRefNum]
    );

    if (!payment || payment.status === 'COMPLETED') {
      await query("UPDATE payment_events SET processed = TRUE, processed_at = NOW() WHERE id = $1", [eventDbId]);
      return res.status(200).json({ status: 'ok' });
    }

    if (payload.status === 'PAID') {
      await activateSubscription(payment.user_id, payment.plan_id, payment.id, 'EASYPAISA', payload.transactionId ?? eventId);
    } else {
      await query("UPDATE payments SET status = 'FAILED', failure_reason = $1, updated_at = NOW() WHERE id = $2",
        [`Easypaisa status: ${payload.status}`, payment.id]);
    }

    await query("UPDATE payment_events SET processed = TRUE, processed_at = NOW(), payment_id = $2 WHERE id = $1", [eventDbId, payment.id]);
    res.status(200).json({ status: 'ok' });
  } catch (err: any) {
    console.error('Easypaisa webhook error:', err.message);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ── POST /api/payments/cancel — authenticated ─────────────────────────────────
router.post('/cancel', requireAuth(), async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    const sub = await queryOne<any>(
      "SELECT id FROM subscriptions WHERE user_id = $1 AND status = 'ACTIVE'",
      [req.user!.id]
    );
    if (!sub) return res.status(404).json({ error: 'No active subscription found.' });

    await query(
      "UPDATE subscriptions SET cancelled_at = NOW(), cancel_reason = $1, auto_renew = FALSE, updated_at = NOW() WHERE id = $2",
      [reason ?? 'User requested cancellation', sub.id]
    );
    res.json({ message: 'Subscription cancelled. You will retain access until the current period ends.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Could not cancel subscription.' });
  }
});

export { router as paymentsRouter };
