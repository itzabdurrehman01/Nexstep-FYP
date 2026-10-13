/**
 * db/migrate_payments.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 6 — Payment & Subscription schema migration.
 *
 * Run after base migration:
 *   node node_modules/tsx/dist/cli.mjs db/migrate_payments.ts
 *
 * Tables created:
 *   plans               — subscription plan catalogue (Free / Premium / Pro)
 *   subscriptions       — one active subscription per user
 *   payments            — individual payment records
 *   payment_events      — immutable webhook/callback log (idempotency)
 *
 * SECURITY NOTES:
 *   - No payment credentials stored here.
 *   - Payment provider reference IDs stored but never secret keys.
 *   - Webhook idempotency enforced via UNIQUE on (provider, provider_event_id).
 *   - Payment status updated only after server-side provider verification.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const PAYMENT_SCHEMA_SQL = `

-- ── ENUM: payment_provider ────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE payment_provider AS ENUM ('JAZZCASH', 'EASYPAISA', 'CARD', 'BANK_TRANSFER', 'MANUAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── ENUM: payment_status ──────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── ENUM: subscription_status ─────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'PENDING', 'TRIAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── ENUM: billing_period ──────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE billing_period AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUAL', 'LIFETIME');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- PLANS  — the subscription plan catalogue
-- Managed by ADMIN; not editable by users.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plans (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            VARCHAR(50)    NOT NULL UNIQUE,   -- 'free' | 'premium' | 'pro'
  name            VARCHAR(100)   NOT NULL,
  description     TEXT,
  price_pkr       INTEGER        NOT NULL DEFAULT 0,  -- 0 for Free plan
  billing_period  billing_period NOT NULL DEFAULT 'MONTHLY',
  features        JSONB          NOT NULL DEFAULT '[]',  -- string[] list of feature labels
  is_active       BOOLEAN        NOT NULL DEFAULT TRUE,
  sort_order      INTEGER        NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_plans_slug    ON plans(slug);
CREATE INDEX IF NOT EXISTS idx_plans_active  ON plans(is_active);

-- Seed default plans (safe to re-run)
INSERT INTO plans (slug, name, description, price_pkr, billing_period, features, sort_order)
VALUES
  (
    'free', 'Free', 'Essential career guidance tools for every student.',
    0, 'MONTHLY',
    '["Career AI Recommendations","RIASEC Assessment","University Explorer","Scholarship Finder","Basic Career Roadmap","Community Access"]',
    1
  ),
  (
    'premium', 'Premium', 'Full AI-powered career platform for serious students.',
    999, 'MONTHLY',
    '["Everything in Free","Unlimited AI Chat Sessions","AI Mock Interview (Unlimited)","Skill Gap Analysis","Resume Builder & PDF Export","Job Portal with Apply","Mentor Matching","Priority Support"]',
    2
  ),
  (
    'pro', 'Pro', 'Complete career acceleration for university students and graduates.',
    1999, 'MONTHLY',
    '["Everything in Premium","Dedicated Career Coach Session","Resume Review by Expert","1-on-1 Mentor Video Call","Recruiter Portal Visibility","Career Analytics Dashboard","WhatsApp Support"]',
    3
  )
ON CONFLICT (slug) DO UPDATE SET
  price_pkr  = EXCLUDED.price_pkr,
  features   = EXCLUDED.features,
  updated_at = NOW();

-- ─────────────────────────────────────────────────────────────────────────────
-- SUBSCRIPTIONS  — one active subscription per user at any time
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                UUID                  PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID                  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id           UUID                  NOT NULL REFERENCES plans(id),
  status            subscription_status   NOT NULL DEFAULT 'PENDING',
  provider          payment_provider,
  provider_sub_id   VARCHAR(255),         -- provider-side subscription ID
  started_at        TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ,
  cancelled_at      TIMESTAMPTZ,
  cancel_reason     TEXT,
  auto_renew        BOOLEAN               NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ           NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user   ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expiry ON subscriptions(expires_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- PAYMENTS  — individual payment records
-- A subscription may have multiple payments (monthly renewals).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id                   UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id      UUID             REFERENCES subscriptions(id) ON DELETE SET NULL,
  plan_id              UUID             NOT NULL REFERENCES plans(id),
  amount_pkr           INTEGER          NOT NULL,            -- in PKR (whole rupees)
  currency             VARCHAR(10)      NOT NULL DEFAULT 'PKR',
  status               payment_status   NOT NULL DEFAULT 'PENDING',
  provider             payment_provider NOT NULL,
  provider_order_id    VARCHAR(255),    -- order/transaction ID from provider
  provider_txn_id      VARCHAR(255),    -- confirmed transaction ID after success
  provider_response    JSONB            DEFAULT '{}',        -- raw provider response (sanitised)
  failure_reason       TEXT,
  initiated_at         TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  completed_at         TIMESTAMPTZ,
  refunded_at          TIMESTAMPTZ,
  refund_reason        TEXT,
  created_at           TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_user        ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status      ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_sub         ON payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_txn ON payments(provider_txn_id) WHERE provider_txn_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- PAYMENT_EVENTS  — immutable webhook / callback event log
-- Ensures idempotency: each provider event processed exactly once.
-- NEVER delete rows from this table.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_events (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  provider          payment_provider NOT NULL,
  provider_event_id VARCHAR(255)  NOT NULL,   -- unique ID from provider webhook
  event_type        VARCHAR(100)  NOT NULL,   -- e.g. 'payment.completed'
  payment_id        UUID          REFERENCES payments(id) ON DELETE SET NULL,
  raw_payload       JSONB         NOT NULL DEFAULT '{}',
  processed         BOOLEAN       NOT NULL DEFAULT FALSE,
  processed_at      TIMESTAMPTZ,
  error             TEXT,
  received_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_event_id)         -- idempotency key
);
CREATE INDEX IF NOT EXISTS idx_payment_events_payment ON payment_events(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_proc    ON payment_events(processed, received_at);

-- ── updated_at triggers for payment tables ────────────────────────────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['plans', 'subscriptions', 'payments'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = 'set_updated_at_' || t
        AND tgrelid = t::regclass
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER set_updated_at_%I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
        t, t
      );
    END IF;
  END LOOP;
END $$;
`;

async function runPaymentMigration() {
  const pool = new Pool({
    host:     process.env.PG_HOST     || '127.0.0.1',
    port:     Number(process.env.PG_PORT || 5432),
    user:     process.env.PG_USER     || 'postgres',
    password: process.env.PG_PASSWORD || 'password',
    database: process.env.PG_DATABASE || 'nexstep_db',
  });

  try {
    await pool.query(PAYMENT_SCHEMA_SQL);
    console.log('✓ Payment schema migration applied (plans, subscriptions, payments, payment_events)');
    console.log('✓ Default plans seeded: Free (PKR 0), Premium (PKR 999/mo), Pro (PKR 1999/mo)');
  } catch (err) {
    console.error('Payment migration error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runPaymentMigration().then(() => {
  console.log('✓ Payment migration complete');
  process.exit(0);
});
