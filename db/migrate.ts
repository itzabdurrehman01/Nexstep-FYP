/**
 * db/migrate.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 3 — PostgreSQL schema migration runner.
 *
 * Run with: node node_modules/tsx/dist/cli.mjs db/migrate.ts
 *
 * Creates the nexstep_db database and all required tables in order.
 * Safe to re-run: uses CREATE TABLE IF NOT EXISTS and CREATE INDEX IF NOT EXISTS.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

// ── Step 1: Connect to the default 'postgres' DB to create nexstep_db ────────
async function ensureDatabase() {
  const adminPool = new Pool({
    host:     process.env.PG_HOST     || '127.0.0.1',
    port:     Number(process.env.PG_PORT || 5432),
    user:     process.env.PG_USER     || 'postgres',
    password: process.env.PG_PASSWORD || 'password',
    database: 'postgres',
  });

  try {
    const { rows } = await adminPool.query(
      `SELECT 1 FROM pg_database WHERE datname = 'nexstep_db'`
    );
    if (rows.length === 0) {
      await adminPool.query(`CREATE DATABASE nexstep_db`);
      console.log('✓ Created database: nexstep_db');
    } else {
      console.log('✓ Database nexstep_db already exists');
    }
  } finally {
    await adminPool.end();
  }
}

// ── Step 2: Connect to nexstep_db and run schema DDL ─────────────────────────
const SCHEMA_SQL = `

-- ── Extensions ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid()

-- ── ENUM types ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('STUDENT', 'ADMIN', 'MENTOR', 'RECRUITER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE app_status AS ENUM ('Submitted', 'Under Review', 'Shortlisted', 'Rejected', 'Accepted', 'Withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE milestone_status AS ENUM ('completed', 'current', 'upcoming');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── USERS ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255)  NOT NULL UNIQUE,
  password_hash   VARCHAR(255)  NOT NULL,
  first_name      VARCHAR(100)  NOT NULL,
  last_name       VARCHAR(100)  NOT NULL DEFAULT '',
  role            user_role     NOT NULL DEFAULT 'STUDENT',
  is_verified     BOOLEAN       NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
  last_login      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role);

-- ── PROFILES ──────────────────────────────────────────────────────────────────
-- One profile per user. Stores all demographic + academic information.
CREATE TABLE IF NOT EXISTS profiles (
  id                        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID          NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  grade_level               VARCHAR(100),
  city                      VARCHAR(100),
  province                  VARCHAR(100),
  family_monthly_income_pkr INTEGER,
  budget_annual_pkr         INTEGER,
  preferred_stream          VARCHAR(100),
  top_riasec_cluster        VARCHAR(200),
  matric_pct                NUMERIC(5,2),
  fsc_pct                   NUMERIC(5,2),
  entry_test_score          NUMERIC(5,2),
  target_career             VARCHAR(200),
  goals                     TEXT,
  certifications            JSONB         NOT NULL DEFAULT '[]',
  avatar_url                VARCHAR(500),
  bio                       TEXT,
  created_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- ── USER SKILLS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_skills (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(200)  NOT NULL,
  level       VARCHAR(50)   DEFAULT 'Beginner',   -- Beginner | Intermediate | Advanced
  category    VARCHAR(100)  DEFAULT 'Technical',   -- Technical | Academic | Soft Skill
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_skills_user_id ON user_skills(user_id);

-- ── BOOKMARKS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookmarks (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id      VARCHAR(100)  NOT NULL,   -- e.g. "uni-1", "sch-1"
  type         VARCHAR(50)   NOT NULL,   -- "university" | "scholarship" | "job" | "course"
  title        VARCHAR(500)  NOT NULL,
  metadata     JSONB         NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, item_id)
);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);

-- ── APPLICATIONS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS applications (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type           VARCHAR(50)   NOT NULL,   -- "University" | "Scholarship" | "Job" | "Internship"
  title          VARCHAR(500)  NOT NULL,
  target_name    VARCHAR(500),
  status         app_status    NOT NULL DEFAULT 'Submitted',
  applied_date   DATE          NOT NULL DEFAULT CURRENT_DATE,
  official_url   VARCHAR(1000),
  notes          TEXT,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);

-- ── QUIZ RESULTS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quiz_results (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code                    VARCHAR(10)   NOT NULL,
  top_trait               VARCHAR(100),
  stream_recommendation   TEXT,
  full_scores             JSONB         NOT NULL DEFAULT '{}',
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id ON quiz_results(user_id);

-- ── ROADMAPS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roadmaps (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID          NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  selected_career_id VARCHAR(20)  NOT NULL DEFAULT 'car-1',
  last_updated      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_roadmaps_user_id ON roadmaps(user_id);

-- ── ROADMAP MILESTONES ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roadmap_milestones (
  id          UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id  UUID              NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  position    INTEGER           NOT NULL,   -- sort order (1, 2, 3, 4)
  title       VARCHAR(500)      NOT NULL,
  period      VARCHAR(200),
  status      milestone_status  NOT NULL DEFAULT 'upcoming'
);
CREATE INDEX IF NOT EXISTS idx_roadmap_milestones_roadmap ON roadmap_milestones(roadmap_id);

-- ── ROADMAP TASKS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roadmap_tasks (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id  UUID          NOT NULL REFERENCES roadmap_milestones(id) ON DELETE CASCADE,
  task_key      VARCHAR(50)   NOT NULL,   -- e.g. "t2-1"
  text          TEXT          NOT NULL,
  done          BOOLEAN       NOT NULL DEFAULT FALSE,
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_roadmap_tasks_milestone ON roadmap_tasks(milestone_id);

-- ── INTERVIEW SESSIONS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS interview_sessions (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category         VARCHAR(200),
  difficulty       VARCHAR(50),
  overall_score    INTEGER,
  grade            VARCHAR(50),
  total_questions  INTEGER,
  top_strengths    JSONB         NOT NULL DEFAULT '[]',
  areas_to_improve JSONB         NOT NULL DEFAULT '[]',
  recommended_topics JSONB       NOT NULL DEFAULT '[]',
  per_question     JSONB         NOT NULL DEFAULT '[]',
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_id ON interview_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_created ON interview_sessions(user_id, created_at DESC);

-- ── AI CONVERSATIONS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_conversations (
  id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      VARCHAR(500)  DEFAULT 'New Conversation',
  created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);

-- ── AI MESSAGES ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_messages (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID          NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role            VARCHAR(20)   NOT NULL CHECK (role IN ('user', 'assistant')),
  content         TEXT          NOT NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON ai_messages(conversation_id, created_at ASC);

-- ── REFRESH TOKENS ────────────────────────────────────────────────────────────
-- Tracks issued refresh tokens for invalidation on logout.
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255)  NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ   NOT NULL,
  revoked     BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- ── MENTOR SESSIONS ──────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE session_status AS ENUM ('upcoming','completed','cancelled','no_show');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS mentor_sessions (
  id               UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id        UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id       UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic            VARCHAR(500),
  scheduled_at     TIMESTAMPTZ     NOT NULL,
  duration_minutes INTEGER         NOT NULL DEFAULT 60,
  status           session_status  NOT NULL DEFAULT 'upcoming',
  meeting_link     VARCHAR(1000),
  notes            TEXT,
  created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mentor_sessions_mentor  ON mentor_sessions(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_sessions_student ON mentor_sessions(student_id);

-- ── RECRUITER JOBS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recruiter_jobs (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id     UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title            VARCHAR(300)  NOT NULL,
  company          VARCHAR(300)  NOT NULL,
  location         VARCHAR(200),
  type             VARCHAR(50)   DEFAULT 'Full-time',
  description      TEXT,
  skills_required  JSONB         NOT NULL DEFAULT '[]',
  salary_pkr_min   INTEGER,
  salary_pkr_max   INTEGER,
  deadline         DATE,
  is_active        BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_recruiter_jobs_recruiter ON recruiter_jobs(recruiter_id);

-- ── RECRUITER APPLICATIONS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recruiter_applications (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      UUID          NOT NULL REFERENCES recruiter_jobs(id) ON DELETE CASCADE,
  student_id  UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      VARCHAR(100)  NOT NULL DEFAULT 'Applied',
  applied_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE(job_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_recruiter_apps_job     ON recruiter_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_recruiter_apps_student ON recruiter_applications(student_id);

-- ── RECRUITER INTERVIEWS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recruiter_interviews (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id  UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id    UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id        UUID          REFERENCES recruiter_jobs(id) ON DELETE SET NULL,
  scheduled_at  TIMESTAMPTZ   NOT NULL,
  mode          VARCHAR(50)   NOT NULL DEFAULT 'Video Call',
  notes         TEXT,
  status        VARCHAR(50)   NOT NULL DEFAULT 'Scheduled',
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_recruiter_interviews_rid ON recruiter_interviews(recruiter_id);

-- ── EMAIL VERIFICATION TOKENS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_verify_tokens (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID          NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255)  NOT NULL,
  expires_at  TIMESTAMPTZ   NOT NULL,
  used        BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_verify_user ON email_verify_tokens(user_id);

-- ── PASSWORD RESET TOKENS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID          NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255)  NOT NULL,
  expires_at  TIMESTAMPTZ   NOT NULL,
  used        BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pw_reset_user ON password_reset_tokens(user_id);

-- ── USERS SOCIAL + OTP COLUMNS (Phase 26 — must match scripts/migrate_otp_social.cjs)
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider    VARCHAR(50)   DEFAULT 'LOCAL';
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_id      VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url       TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone            VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_phone_verified BOOLEAN       DEFAULT FALSE;

-- ── USER OTPS (Phase 26 — OTP/social auth table)
CREATE TABLE IF NOT EXISTS user_otps (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email              VARCHAR(255) NOT NULL,
  phone              VARCHAR(50),
  otp_code           VARCHAR(10)  NOT NULL,
  purpose            VARCHAR(50)  NOT NULL DEFAULT 'REGISTER',
  attempts           INT          NOT NULL DEFAULT 0,
  is_verified        BOOLEAN      NOT NULL DEFAULT FALSE,
  verification_token VARCHAR(255),
  expires_at         TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_otps_email_purpose ON user_otps(email, purpose);
CREATE INDEX IF NOT EXISTS idx_user_otps_token         ON user_otps(verification_token);

-- ── PHASE 25: DATA SOURCES & PROVENANCE ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS data_sources (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            VARCHAR(100)  NOT NULL UNIQUE,
  name            VARCHAR(255)  NOT NULL,
  publisher       VARCHAR(255)  NOT NULL,
  source_type     VARCHAR(50)   NOT NULL DEFAULT 'OFFICIAL',
  is_official     BOOLEAN       NOT NULL DEFAULT FALSE,
  base_url        VARCHAR(500),
  license         VARCHAR(255),
  active          BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dataset_versions (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id       UUID          NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
  dataset_name    VARCHAR(255)  NOT NULL,
  version         VARCHAR(50)   NOT NULL DEFAULT '1.0',
  retrieved_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  published_at    TIMESTAMPTZ,
  checksum        VARCHAR(128),
  record_count    INTEGER       NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dataset_imports (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_version_id  UUID          REFERENCES dataset_versions(id) ON DELETE SET NULL,
  started_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ,
  status              VARCHAR(50)   NOT NULL DEFAULT 'RUNNING',
  records_read        INTEGER       NOT NULL DEFAULT 0,
  records_inserted    INTEGER       NOT NULL DEFAULT 0,
  records_updated     INTEGER       NOT NULL DEFAULT 0,
  records_rejected    INTEGER       NOT NULL DEFAULT 0,
  error_count         INTEGER       NOT NULL DEFAULT 0,
  log_summary         TEXT
);

-- ── PHASE 25: REAL DATA REFERENCE ENTITIES WITH PROVENANCE ─────────────────────
CREATE TABLE IF NOT EXISTS jobs (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id           UUID          REFERENCES data_sources(id) ON DELETE SET NULL,
  external_id         VARCHAR(255),
  title               VARCHAR(255)  NOT NULL,
  company             VARCHAR(255)  NOT NULL,
  company_website     VARCHAR(500),
  description         TEXT,
  location            VARCHAR(255),
  city                VARCHAR(100),
  province            VARCHAR(100),
  employment_type     VARCHAR(100)  DEFAULT 'Full-Time',
  experience_level    VARCHAR(100)  DEFAULT 'Entry Level',
  required_skills     JSONB         NOT NULL DEFAULT '[]',
  salary_min          INTEGER,
  salary_max          INTEGER,
  salary_currency     VARCHAR(10)   DEFAULT 'PKR',
  application_url     VARCHAR(500),
  posted_at           TIMESTAMPTZ   DEFAULT NOW(),
  expires_at          TIMESTAMPTZ,
  last_verified_at    TIMESTAMPTZ   DEFAULT NOW(),
  freshness_status    VARCHAR(50)   DEFAULT 'FRESH',
  verification_status VARCHAR(50)   DEFAULT 'VERIFIED',
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source_id);
CREATE INDEX IF NOT EXISTS idx_jobs_city ON jobs(city);

CREATE TABLE IF NOT EXISTS scholarships (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id           UUID          REFERENCES data_sources(id) ON DELETE SET NULL,
  external_id         VARCHAR(255),
  name                VARCHAR(255)  NOT NULL,
  provider            VARCHAR(255)  NOT NULL,
  description         TEXT,
  province            VARCHAR(100)  DEFAULT 'All Pakistan',
  category            VARCHAR(100)  DEFAULT 'Merit & Need Based',
  coverage            VARCHAR(255)  DEFAULT 'Full Tuition & Stipend',
  amount_pkr          INTEGER,
  max_family_income   INTEGER,
  deadline            TIMESTAMPTZ,
  application_url     VARCHAR(500),
  official_url        VARCHAR(500),
  last_verified_at    TIMESTAMPTZ   DEFAULT NOW(),
  freshness_status    VARCHAR(50)   DEFAULT 'FRESH',
  verification_status VARCHAR(50)   DEFAULT 'VERIFIED',
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_scholarships_source ON scholarships(source_id);

CREATE TABLE IF NOT EXISTS universities (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id           UUID          REFERENCES data_sources(id) ON DELETE SET NULL,
  external_id         VARCHAR(255),
  name                VARCHAR(255)  NOT NULL,
  short_name          VARCHAR(50),
  city                VARCHAR(100)  NOT NULL,
  province            VARCHAR(100)  NOT NULL,
  type                VARCHAR(50)   DEFAULT 'Public',
  hec_rank_tier       VARCHAR(50)   DEFAULT 'W-Category',
  is_hec_recognized   BOOLEAN       DEFAULT TRUE,
  annual_fee_pkr      INTEGER,
  official_website    VARCHAR(500),
  admissions_url      VARCHAR(500),
  programs            JSONB         NOT NULL DEFAULT '[]',
  last_verified_at    TIMESTAMPTZ   DEFAULT NOW(),
  verification_status VARCHAR(50)   DEFAULT 'VERIFIED',
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_universities_source ON universities(source_id);

CREATE TABLE IF NOT EXISTS courses (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id           UUID          REFERENCES data_sources(id) ON DELETE SET NULL,
  external_id         VARCHAR(255),
  title               VARCHAR(255)  NOT NULL,
  provider            VARCHAR(255)  NOT NULL,
  description         TEXT,
  skills_covered      JSONB         NOT NULL DEFAULT '[]',
  duration            VARCHAR(100)  DEFAULT '4 Weeks',
  format              VARCHAR(50)   DEFAULT 'Online',
  price_pkr           INTEGER       DEFAULT 0,
  enrollment_url      VARCHAR(500),
  last_verified_at    TIMESTAMPTZ   DEFAULT NOW(),
  verification_status VARCHAR(50)   DEFAULT 'VERIFIED',
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_courses_source ON courses(source_id);

CREATE TABLE IF NOT EXISTS careers (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id           UUID          REFERENCES data_sources(id) ON DELETE SET NULL,
  title               VARCHAR(255)  NOT NULL,
  riasec_code         VARCHAR(100)  NOT NULL,
  description         TEXT,
  starting_salary_pkr INTEGER,
  avg_salary_pkr      INTEGER,
  demand_level        VARCHAR(50)   DEFAULT 'High',
  required_skills     JSONB         NOT NULL DEFAULT '[]',
  preferred_stream    VARCHAR(100),
  last_verified_at    TIMESTAMPTZ   DEFAULT NOW(),
  verification_status VARCHAR(50)   DEFAULT 'VERIFIED',
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_careers_source ON careers(source_id);

-- ── UPDATED_AT triggers ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['users', 'profiles', 'applications', 'data_sources', 'jobs', 'scholarships', 'universities', 'courses', 'careers'] LOOP
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

-- ── TRANSLATION CACHE ─────────────────────────────────────────────────────────
-- Caches Google Cloud Translation results so each unique string is only
-- translated once. Populated automatically when /api/translate is called.
CREATE TABLE IF NOT EXISTS translation_cache (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  source_text     TEXT          NOT NULL,
  source_language VARCHAR(10)   NOT NULL DEFAULT 'en',
  target_language VARCHAR(10)   NOT NULL DEFAULT 'ur',
  translated_text TEXT          NOT NULL,
  char_count      INTEGER       NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (source_text, source_language, target_language)
);
CREATE INDEX IF NOT EXISTS idx_translation_cache_lookup
  ON translation_cache (source_language, target_language);
`;

async function runMigrations() {
  await ensureDatabase();

  const pool = new Pool({
    host:     process.env.PG_HOST     || '127.0.0.1',
    port:     Number(process.env.PG_PORT || 5432),
    user:     process.env.PG_USER     || 'postgres',
    password: process.env.PG_PASSWORD || 'password',
    database: process.env.PG_DATABASE || 'nexstep_db',
  });

  try {
    await pool.query(SCHEMA_SQL);
    console.log('✓ All schema migrations applied to nexstep_db');
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations().then(() => {
  console.log('✓ Migration complete');
  process.exit(0);
});
