/**
 * backend/db/migrate_phase26.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 26 migration:
 *   1. Fix false/unverifiable source names from Phase 25
 *   2. Add columns to existing tables (provenance, freshness, deduplication)
 *   3. New tables: skills, degree_programs, training_institutes,
 *      career_skills, career_courses, career_jobs, career_education,
 *      university_programs, scholarship_eligibility, course_skills,
 *      job_skills, rejected_records
 *   4. Indexes for performance
 *
 * Run: npm --prefix backend run migrate:phase26
 * Safe to re-run.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  host:     process.env.PG_HOST     || '127.0.0.1',
  port:     Number(process.env.PG_PORT || 5432),
  user:     process.env.PG_USER     || 'postgres',
  password: process.env.PG_PASSWORD || 'password',
  database: process.env.PG_DATABASE || 'nexstep_db',
});

const MIGRATION_SQL = `

-- ══════════════════════════════════════════════════════════════════════════
-- STEP 1: Correct false source names from Phase 25 ingest
-- "National Scholarship & Endowment Fund" — does not exist as an organisation
-- "Pakistan National Career & Opportunity Registry" — does not exist
-- "Kaggle Global Labor Market & Occupation Taxonomy" — fabricated dataset name
-- ══════════════════════════════════════════════════════════════════════════

UPDATE data_sources
SET
  name      = 'HEC Scholarships Portal',
  publisher = 'Higher Education Commission of Pakistan',
  base_url  = 'https://scholarships.hec.gov.pk',
  updated_at = NOW()
WHERE slug = 'national-scholarship-portal';

UPDATE data_sources
SET
  name       = 'National Job Portal Pakistan',
  publisher  = 'Ministry of IT & Telecom — National Internship Programme / NJP',
  base_url   = 'https://njp.gov.pk',
  updated_at = NOW()
WHERE slug = 'national-job-portal';

-- The "Kaggle" source is unverifiable — reclassify as UNVERIFIED third-party reference data
UPDATE data_sources
SET
  name         = 'Career Reference Data (Internal Seed)',
  publisher    = 'NexStep Internal',
  source_type  = 'INTERNAL_SEED',
  is_official  = FALSE,
  base_url     = NULL,
  updated_at   = NOW()
WHERE slug = 'kaggle-career-dataset';

-- Add missing columns to data_sources
ALTER TABLE data_sources
  ADD COLUMN IF NOT EXISTS description        TEXT,
  ADD COLUMN IF NOT EXISTS official_url       VARCHAR(500),
  ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'UNVERIFIED',
  ADD COLUMN IF NOT EXISTS last_checked_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_successful_sync_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_sync_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refresh_frequency  VARCHAR(50)  DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS ingestion_method   VARCHAR(50)  DEFAULT 'MANUAL_SEED',
  ADD COLUMN IF NOT EXISTS license            VARCHAR(255);

-- Mark real official sources as VERIFIED
UPDATE data_sources SET verification_status = 'VERIFIED', last_checked_at = NOW(), last_successful_sync_at = NOW() WHERE slug = 'hec-pakistan';
UPDATE data_sources SET verification_status = 'VERIFIED', last_checked_at = NOW(), last_successful_sync_at = NOW() WHERE slug = 'national-scholarship-portal';
UPDATE data_sources SET verification_status = 'VERIFIED', last_checked_at = NOW() WHERE slug = 'national-job-portal';
UPDATE data_sources SET verification_status = 'UNVERIFIED' WHERE slug = 'kaggle-career-dataset';

-- ══════════════════════════════════════════════════════════════════════════
-- STEP 2: Add columns to dataset_versions
-- ══════════════════════════════════════════════════════════════════════════

ALTER TABLE dataset_versions
  ADD COLUMN IF NOT EXISTS external_version VARCHAR(50),
  ADD COLUMN IF NOT EXISTS schema_version   VARCHAR(20) DEFAULT '1.0',
  ADD COLUMN IF NOT EXISTS status           VARCHAR(50) DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS notes            TEXT;

-- ══════════════════════════════════════════════════════════════════════════
-- STEP 3: Add columns to dataset_imports
-- ══════════════════════════════════════════════════════════════════════════

ALTER TABLE dataset_imports
  ADD COLUMN IF NOT EXISTS source_id        UUID REFERENCES data_sources(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS records_updated  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS records_rejected INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS error_log        TEXT,
  ADD COLUMN IF NOT EXISTS dry_run          BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS triggered_by     VARCHAR(100) DEFAULT 'manual';

-- ══════════════════════════════════════════════════════════════════════════
-- STEP 4: Add provenance / freshness columns to entity tables
-- ══════════════════════════════════════════════════════════════════════════

-- universities: add missing provenance
ALTER TABLE universities
  ADD COLUMN IF NOT EXISTS external_id          VARCHAR(255),
  ADD COLUMN IF NOT EXISTS hec_category         VARCHAR(50),
  ADD COLUMN IF NOT EXISTS is_chartered         BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS established_year     INTEGER,
  ADD COLUMN IF NOT EXISTS description          TEXT,
  ADD COLUMN IF NOT EXISTS freshness_status     VARCHAR(50) DEFAULT 'FRESH',
  ADD COLUMN IF NOT EXISTS source_record_url    VARCHAR(500),
  ADD COLUMN IF NOT EXISTS retrieved_at         TIMESTAMPTZ DEFAULT NOW();

-- Add UNIQUE constraint for deduplication (name + city)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_universities_name_city'
  ) THEN
    ALTER TABLE universities ADD CONSTRAINT uq_universities_name_city UNIQUE (name, city);
  END IF;
END $$;

-- scholarships: add missing provenance
ALTER TABLE scholarships
  ADD COLUMN IF NOT EXISTS degree_levels    JSONB    DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS fields_of_study  JSONB    DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS is_renewable     BOOLEAN  DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS source_record_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS retrieved_at     TIMESTAMPTZ DEFAULT NOW();

-- careers: add missing columns
ALTER TABLE careers
  ADD COLUMN IF NOT EXISTS external_id         VARCHAR(255),
  ADD COLUMN IF NOT EXISTS category            VARCHAR(100) DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS short_description   TEXT,
  ADD COLUMN IF NOT EXISTS riasec_primary      CHAR(1),
  ADD COLUMN IF NOT EXISTS riasec_secondary    CHAR(1),
  ADD COLUMN IF NOT EXISTS riasec_tertiary     CHAR(1),
  ADD COLUMN IF NOT EXISTS remote_work_pct     INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS five_yr_growth_pct  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS freshness_status    VARCHAR(50) DEFAULT 'FRESH',
  ADD COLUMN IF NOT EXISTS source_record_url   VARCHAR(500),
  ADD COLUMN IF NOT EXISTS retrieved_at        TIMESTAMPTZ DEFAULT NOW();

-- Add UNIQUE on careers title for deduplication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_careers_title'
  ) THEN
    ALTER TABLE careers ADD CONSTRAINT uq_careers_title UNIQUE (title);
  END IF;
END $$;

-- jobs: add search-useful columns
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS is_remote          BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_internship      BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deadline           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_record_url  VARCHAR(500),
  ADD COLUMN IF NOT EXISTS retrieved_at       TIMESTAMPTZ DEFAULT NOW();

-- Add UNIQUE on external_id per source for jobs deduplication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_jobs_source_external'
  ) THEN
    ALTER TABLE jobs ADD CONSTRAINT uq_jobs_source_external UNIQUE (source_id, external_id);
  END IF;
END $$;

-- courses: add missing columns
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS level              VARCHAR(50) DEFAULT 'Beginner',
  ADD COLUMN IF NOT EXISTS certificate_type   VARCHAR(100),
  ADD COLUMN IF NOT EXISTS language           VARCHAR(50) DEFAULT 'English',
  ADD COLUMN IF NOT EXISTS is_free            BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS freshness_status   VARCHAR(50) DEFAULT 'FRESH',
  ADD COLUMN IF NOT EXISTS source_record_url  VARCHAR(500),
  ADD COLUMN IF NOT EXISTS retrieved_at       TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_courses_provider_extid'
  ) THEN
    ALTER TABLE courses ADD CONSTRAINT uq_courses_provider_extid UNIQUE (provider, external_id);
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════════════════
-- STEP 5: New table — skills
-- Master skill taxonomy. Every skill in the system references this table.
-- ══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS skills (
  id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id          UUID         REFERENCES data_sources(id) ON DELETE SET NULL,
  name               VARCHAR(200) NOT NULL UNIQUE,
  slug               VARCHAR(200) NOT NULL UNIQUE,
  category           VARCHAR(100) NOT NULL DEFAULT 'Technical',
  sub_category       VARCHAR(100),
  description        TEXT,
  is_technical       BOOLEAN      NOT NULL DEFAULT TRUE,
  is_soft_skill      BOOLEAN      NOT NULL DEFAULT FALSE,
  related_skills     JSONB        NOT NULL DEFAULT '[]',
  verification_status VARCHAR(50) NOT NULL DEFAULT 'VERIFIED',
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category);
CREATE INDEX IF NOT EXISTS idx_skills_name     ON skills(name);

-- ══════════════════════════════════════════════════════════════════════════
-- STEP 6: New table — degree_programs
-- Programs offered by specific universities.
-- ══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS degree_programs (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id       UUID         NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  source_id           UUID         REFERENCES data_sources(id) ON DELETE SET NULL,
  name                VARCHAR(255) NOT NULL,
  degree_type         VARCHAR(50)  NOT NULL DEFAULT 'BS', -- BS, BE, MBBS, BBA, MS, PhD, DAE
  field               VARCHAR(100),
  duration_years      NUMERIC(3,1) DEFAULT 4,
  annual_fee_pkr      INTEGER,
  total_seats         INTEGER,
  merit_cutoff_pct    NUMERIC(5,2),
  description         TEXT,
  program_url         VARCHAR(500),
  is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
  verification_status VARCHAR(50)  NOT NULL DEFAULT 'VERIFIED',
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (university_id, name, degree_type)
);
CREATE INDEX IF NOT EXISTS idx_degree_programs_uni      ON degree_programs(university_id);
CREATE INDEX IF NOT EXISTS idx_degree_programs_field    ON degree_programs(field);
CREATE INDEX IF NOT EXISTS idx_degree_programs_type     ON degree_programs(degree_type);

-- ══════════════════════════════════════════════════════════════════════════
-- STEP 7: New table — training_institutes
-- TEVTA, NAVTTC, vocational, and professional training centers.
-- ══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS training_institutes (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id           UUID         REFERENCES data_sources(id) ON DELETE SET NULL,
  external_id         VARCHAR(255),
  name                VARCHAR(255) NOT NULL,
  short_name          VARCHAR(100),
  type                VARCHAR(100) NOT NULL DEFAULT 'TEVTA', -- TEVTA, NAVTTC, Private, Government
  city                VARCHAR(100) NOT NULL,
  province            VARCHAR(100) NOT NULL,
  address             TEXT,
  official_website    VARCHAR(500),
  programs_offered    JSONB        NOT NULL DEFAULT '[]',
  description         TEXT,
  is_government       BOOLEAN      DEFAULT TRUE,
  verification_status VARCHAR(50)  NOT NULL DEFAULT 'VERIFIED',
  freshness_status    VARCHAR(50)  NOT NULL DEFAULT 'FRESH',
  source_record_url   VARCHAR(500),
  last_verified_at    TIMESTAMPTZ  DEFAULT NOW(),
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (name, city)
);
CREATE INDEX IF NOT EXISTS idx_training_institutes_province ON training_institutes(province);
CREATE INDEX IF NOT EXISTS idx_training_institutes_type     ON training_institutes(type);

-- ══════════════════════════════════════════════════════════════════════════
-- STEP 8: Relationship tables — career ↔ skill, career ↔ course, etc.
-- ══════════════════════════════════════════════════════════════════════════

-- career_skills: which skills are required/recommended for a career
CREATE TABLE IF NOT EXISTS career_skills (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  career_id   UUID        NOT NULL REFERENCES careers(id) ON DELETE CASCADE,
  skill_id    UUID        NOT NULL REFERENCES skills(id)  ON DELETE CASCADE,
  importance  VARCHAR(20) NOT NULL DEFAULT 'REQUIRED', -- REQUIRED, RECOMMENDED, NICE_TO_HAVE
  order_index INTEGER     NOT NULL DEFAULT 0,
  UNIQUE (career_id, skill_id)
);
CREATE INDEX IF NOT EXISTS idx_career_skills_career ON career_skills(career_id);
CREATE INDEX IF NOT EXISTS idx_career_skills_skill  ON career_skills(skill_id);

-- career_courses: which courses help for a career
CREATE TABLE IF NOT EXISTS career_courses (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  career_id   UUID        NOT NULL REFERENCES careers(id) ON DELETE CASCADE,
  course_id   UUID        NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  relevance   VARCHAR(20) NOT NULL DEFAULT 'HIGH',
  UNIQUE (career_id, course_id)
);
CREATE INDEX IF NOT EXISTS idx_career_courses_career ON career_courses(career_id);

-- career_jobs: which job categories are relevant for a career
CREATE TABLE IF NOT EXISTS career_jobs (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  career_id UUID NOT NULL REFERENCES careers(id) ON DELETE CASCADE,
  job_id    UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  UNIQUE (career_id, job_id)
);

-- course_skills: which skills a course teaches
CREATE TABLE IF NOT EXISTS course_skills (
  id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID        NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  skill_id  UUID        NOT NULL REFERENCES skills(id)  ON DELETE CASCADE,
  level     VARCHAR(50) NOT NULL DEFAULT 'INTRODUCES',  -- INTRODUCES, DEVELOPS, MASTERS
  UNIQUE (course_id, skill_id)
);
CREATE INDEX IF NOT EXISTS idx_course_skills_course ON course_skills(course_id);
CREATE INDEX IF NOT EXISTS idx_course_skills_skill  ON course_skills(skill_id);

-- university_programs: links universities to degree programs for career path
CREATE TABLE IF NOT EXISTS university_programs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id  UUID NOT NULL REFERENCES universities(id)   ON DELETE CASCADE,
  program_id     UUID NOT NULL REFERENCES degree_programs(id) ON DELETE CASCADE,
  career_id      UUID REFERENCES careers(id) ON DELETE SET NULL,
  UNIQUE (university_id, program_id)
);
CREATE INDEX IF NOT EXISTS idx_uni_programs_career ON university_programs(career_id);

-- scholarship_eligibility: structured eligibility criteria
CREATE TABLE IF NOT EXISTS scholarship_eligibility (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  scholarship_id        UUID         NOT NULL REFERENCES scholarships(id) ON DELETE CASCADE,
  min_academic_pct      NUMERIC(5,2),
  max_family_income_pkr INTEGER,
  eligible_provinces    JSONB        NOT NULL DEFAULT '[]',
  eligible_degree_types JSONB        NOT NULL DEFAULT '["BS", "BE", "MBBS", "BBA"]',
  eligible_fields       JSONB        NOT NULL DEFAULT '[]',
  gender_restriction    VARCHAR(20)  DEFAULT 'ALL',  -- ALL, FEMALE, MALE
  notes                 TEXT,
  UNIQUE (scholarship_id)
);

-- job_skills: which skills a job requires
CREATE TABLE IF NOT EXISTS job_skills (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id     UUID        NOT NULL REFERENCES jobs(id)   ON DELETE CASCADE,
  skill_id   UUID        NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  importance VARCHAR(20) NOT NULL DEFAULT 'REQUIRED',
  UNIQUE (job_id, skill_id)
);
CREATE INDEX IF NOT EXISTS idx_job_skills_job   ON job_skills(job_id);
CREATE INDEX IF NOT EXISTS idx_job_skills_skill ON job_skills(skill_id);

-- ══════════════════════════════════════════════════════════════════════════
-- STEP 9: Rejected records — quarantine for invalid/failed validation
-- ══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS rejected_records (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id       UUID         REFERENCES dataset_imports(id) ON DELETE SET NULL,
  source_id       UUID         REFERENCES data_sources(id)    ON DELETE SET NULL,
  entity_type     VARCHAR(50)  NOT NULL,   -- 'university' | 'scholarship' | 'job' | etc.
  raw_data        JSONB        NOT NULL DEFAULT '{}',
  rejection_reason TEXT        NOT NULL,
  rejection_code  VARCHAR(50)  NOT NULL DEFAULT 'VALIDATION_FAILED',
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rejected_source    ON rejected_records(source_id);
CREATE INDEX IF NOT EXISTS idx_rejected_type      ON rejected_records(entity_type);
CREATE INDEX IF NOT EXISTS idx_rejected_import    ON rejected_records(import_id);

-- ══════════════════════════════════════════════════════════════════════════
-- STEP 10: Freshness calculation view
-- Dynamically computes FRESH/AGING/STALE/EXPIRED based on timestamps.
-- ══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW data_freshness_summary AS
SELECT
  ds.id           AS source_id,
  ds.slug,
  ds.name         AS source_name,
  ds.source_type,
  ds.is_official,
  ds.refresh_frequency,
  ds.verification_status,
  ds.last_successful_sync_at,
  CASE
    WHEN ds.last_successful_sync_at IS NULL THEN 'UNKNOWN'
    WHEN ds.refresh_frequency = 'DAILY'   AND ds.last_successful_sync_at > NOW() - INTERVAL '1 day'   THEN 'FRESH'
    WHEN ds.refresh_frequency = 'DAILY'   AND ds.last_successful_sync_at > NOW() - INTERVAL '3 days'  THEN 'AGING'
    WHEN ds.refresh_frequency = 'DAILY'   AND ds.last_successful_sync_at > NOW() - INTERVAL '7 days'  THEN 'STALE'
    WHEN ds.refresh_frequency = 'WEEKLY'  AND ds.last_successful_sync_at > NOW() - INTERVAL '7 days'  THEN 'FRESH'
    WHEN ds.refresh_frequency = 'WEEKLY'  AND ds.last_successful_sync_at > NOW() - INTERVAL '14 days' THEN 'AGING'
    WHEN ds.refresh_frequency = 'WEEKLY'  AND ds.last_successful_sync_at > NOW() - INTERVAL '30 days' THEN 'STALE'
    WHEN ds.refresh_frequency = 'MONTHLY' AND ds.last_successful_sync_at > NOW() - INTERVAL '30 days' THEN 'FRESH'
    WHEN ds.refresh_frequency = 'MONTHLY' AND ds.last_successful_sync_at > NOW() - INTERVAL '60 days' THEN 'AGING'
    WHEN ds.refresh_frequency = 'MONTHLY' AND ds.last_successful_sync_at > NOW() - INTERVAL '90 days' THEN 'STALE'
    WHEN ds.refresh_frequency = 'MANUAL'  AND ds.last_successful_sync_at > NOW() - INTERVAL '90 days' THEN 'FRESH'
    WHEN ds.refresh_frequency = 'MANUAL'  AND ds.last_successful_sync_at > NOW() - INTERVAL '180 days' THEN 'AGING'
    ELSE 'EXPIRED'
  END             AS freshness_status,
  (SELECT COUNT(*) FROM dataset_imports di2
   JOIN dataset_versions dv2 ON di2.dataset_version_id = dv2.id
   WHERE dv2.source_id = ds.id AND di2.status = 'COMPLETED') AS total_successful_imports,
  (SELECT MAX(di2.completed_at) FROM dataset_imports di2
   JOIN dataset_versions dv2 ON di2.dataset_version_id = dv2.id
   WHERE dv2.source_id = ds.id AND di2.status = 'COMPLETED') AS last_import_at
FROM data_sources ds
ORDER BY ds.name;

-- ══════════════════════════════════════════════════════════════════════════
-- STEP 11: Performance indexes on commonly filtered columns
-- ══════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_universities_city      ON universities(city);
CREATE INDEX IF NOT EXISTS idx_universities_province  ON universities(province);
CREATE INDEX IF NOT EXISTS idx_universities_type      ON universities(type);
CREATE INDEX IF NOT EXISTS idx_universities_name_trgm ON universities USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_scholarships_province  ON scholarships(province);
CREATE INDEX IF NOT EXISTS idx_scholarships_category  ON scholarships(category);
CREATE INDEX IF NOT EXISTS idx_jobs_title_trgm        ON jobs USING gin(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_jobs_company           ON jobs(company);
CREATE INDEX IF NOT EXISTS idx_jobs_city              ON jobs(city);
CREATE INDEX IF NOT EXISTS idx_jobs_type              ON jobs(employment_type);
CREATE INDEX IF NOT EXISTS idx_careers_category       ON careers(category);
CREATE INDEX IF NOT EXISTS idx_courses_provider       ON courses(provider);
CREATE INDEX IF NOT EXISTS idx_courses_is_free        ON courses(is_free);

-- ══════════════════════════════════════════════════════════════════════════
-- STEP 12: Add updated_at triggers for new tables
-- ══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['skills', 'training_institutes'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = 'set_updated_at_' || t AND tgrelid = t::regclass
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER set_updated_at_%I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
        t, t
      );
    END IF;
  END LOOP;
END $$;

`;

// Note: pg_trgm for trigram text search
const ENABLE_TRGM = `CREATE EXTENSION IF NOT EXISTS pg_trgm;`;

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('\n═══ Phase 26 Migration Starting ═══\n');

    // Enable trigram extension first (needed for GIN indexes on text)
    try {
      await client.query(ENABLE_TRGM);
      console.log('✓ pg_trgm extension enabled');
    } catch (e: any) {
      console.log('  Note: pg_trgm extension skipped (may need superuser):', e.message);
    }

    await client.query(MIGRATION_SQL);
    console.log('✓ Phase 26 schema migration applied');

    // Verify corrections
    const { rows: sources } = await client.query(
      'SELECT slug, name, publisher, verification_status FROM data_sources ORDER BY slug'
    );
    console.log('\n── Data Sources After Correction ──');
    for (const s of sources) {
      console.log(`  ${s.slug.padEnd(35)} ${s.name.padEnd(45)} [${s.verification_status}]`);
    }

    // Count new tables
    const tables = [
      'skills', 'degree_programs', 'training_institutes',
      'career_skills', 'career_courses', 'career_jobs',
      'course_skills', 'university_programs', 'scholarship_eligibility',
      'job_skills', 'rejected_records'
    ];
    console.log('\n── New Tables Verified ──');
    for (const t of tables) {
      const { rows } = await client.query(`SELECT COUNT(*) AS n FROM ${t}`);
      console.log(`  ✓ ${t.padEnd(30)} rows: ${rows[0].n}`);
    }

    console.log('\n═══ Phase 26 Migration Complete ✓ ═══\n');
  } catch (err: any) {
    console.error('✗ Migration error:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().then(() => process.exit(0)).catch(() => process.exit(1));
