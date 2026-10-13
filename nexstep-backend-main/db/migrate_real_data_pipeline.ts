/**
 * backend/db/migrate_real_data_pipeline.ts
 *
 * Migration script ensuring complete schema compliance for authentic Pakistani data pipeline:
 * 1. data_sources, dataset_versions, dataset_imports, rejected_records, source_change_events
 * 2. Add provenance & freshness columns across universities, scholarships, courses, jobs, careers, skills, admissions
 *
 * Run: npm --prefix backend run migrate:real-data
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
-- 1. Ensure Data Sources Table
CREATE TABLE IF NOT EXISTS data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  publisher VARCHAR(255) NOT NULL,
  source_type VARCHAR(50) NOT NULL,
  is_official BOOLEAN DEFAULT TRUE,
  base_url VARCHAR(500),
  official_url VARCHAR(500),
  license VARCHAR(255),
  description TEXT,
  refresh_frequency VARCHAR(50) DEFAULT 'MONTHLY',
  ingestion_method VARCHAR(50) DEFAULT 'CONNECTOR',
  verification_status VARCHAR(50) DEFAULT 'VERIFIED',
  last_checked_at TIMESTAMPTZ,
  last_successful_sync_at TIMESTAMPTZ,
  next_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Ensure Dataset Versions Table
CREATE TABLE IF NOT EXISTS dataset_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES data_sources(id) ON DELETE CASCADE,
  dataset_name VARCHAR(100) NOT NULL,
  version VARCHAR(50) NOT NULL,
  record_count INTEGER DEFAULT 0,
  checksum VARCHAR(255),
  status VARCHAR(50) DEFAULT 'ACTIVE',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Ensure Dataset Imports Log & Columns
CREATE TABLE IF NOT EXISTS dataset_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_version_id UUID REFERENCES dataset_versions(id) ON DELETE SET NULL,
  source_id UUID REFERENCES data_sources(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'COMPLETED',
  dry_run BOOLEAN DEFAULT FALSE,
  records_inserted INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_skipped INTEGER DEFAULT 0,
  records_rejected INTEGER DEFAULT 0,
  error_log TEXT,
  triggered_by VARCHAR(100) DEFAULT 'system',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE dataset_imports
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 4. Quarantined Rejected Records Table & Columns
CREATE TABLE IF NOT EXISTS rejected_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_slug VARCHAR(100),
  entity_type VARCHAR(100),
  raw_payload JSONB,
  validation_errors TEXT[],
  quarantine_reason TEXT,
  status VARCHAR(50) DEFAULT 'PENDING_REVIEW',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE rejected_records
  ADD COLUMN IF NOT EXISTS source_slug VARCHAR(100),
  ADD COLUMN IF NOT EXISTS entity_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS raw_payload JSONB,
  ADD COLUMN IF NOT EXISTS validation_errors TEXT[],
  ADD COLUMN IF NOT EXISTS quarantine_reason TEXT,
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'PENDING_REVIEW',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 5. Source Change Events
CREATE TABLE IF NOT EXISTS source_change_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_slug VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(255) NOT NULL,
  field_name VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  detected_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Jobs Table & Provenance Columns
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id VARCHAR(255) UNIQUE,
  title VARCHAR(255) NOT NULL,
  publisher VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  location VARCHAR(255),
  province VARCHAR(100),
  employment_type VARCHAR(50),
  field VARCHAR(100),
  experience_required VARCHAR(100),
  description TEXT,
  official_url VARCHAR(500),
  source_url VARCHAR(500),
  deadline DATE,
  data_year INTEGER DEFAULT 2026,
  verification_status VARCHAR(50) DEFAULT 'VERIFIED',
  freshness_status VARCHAR(50) DEFAULT 'FRESH',
  content_hash VARCHAR(255),
  retrieved_at TIMESTAMPTZ DEFAULT NOW(),
  last_verified_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS external_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS publisher VARCHAR(255),
  ADD COLUMN IF NOT EXISTS company VARCHAR(255),
  ADD COLUMN IF NOT EXISTS location VARCHAR(255),
  ADD COLUMN IF NOT EXISTS province VARCHAR(100),
  ADD COLUMN IF NOT EXISTS employment_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS field VARCHAR(100),
  ADD COLUMN IF NOT EXISTS experience_required VARCHAR(100),
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS official_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS source_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS deadline DATE,
  ADD COLUMN IF NOT EXISTS content_hash VARCHAR(255),
  ADD COLUMN IF NOT EXISTS data_year INTEGER DEFAULT 2026,
  ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'VERIFIED',
  ADD COLUMN IF NOT EXISTS freshness_status VARCHAR(50) DEFAULT 'FRESH',
  ADD COLUMN IF NOT EXISTS retrieved_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ DEFAULT NOW();

-- 7. Add Provenance Columns to Existing Entity Tables
ALTER TABLE universities
  ADD COLUMN IF NOT EXISTS sector VARCHAR(100),
  ADD COLUMN IF NOT EXISTS type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS content_hash VARCHAR(255),
  ADD COLUMN IF NOT EXISTS data_year INTEGER DEFAULT 2026,
  ADD COLUMN IF NOT EXISTS official_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'VERIFIED',
  ADD COLUMN IF NOT EXISTS freshness_status VARCHAR(50) DEFAULT 'FRESH',
  ADD COLUMN IF NOT EXISTS retrieved_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE scholarships
  ADD COLUMN IF NOT EXISTS level VARCHAR(100),
  ADD COLUMN IF NOT EXISTS degree_level VARCHAR(100),
  ADD COLUMN IF NOT EXISTS eligibility TEXT,
  ADD COLUMN IF NOT EXISTS coverage TEXT,
  ADD COLUMN IF NOT EXISTS content_hash VARCHAR(255),
  ADD COLUMN IF NOT EXISTS data_year INTEGER DEFAULT 2026,
  ADD COLUMN IF NOT EXISTS official_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'VERIFIED',
  ADD COLUMN IF NOT EXISTS freshness_status VARCHAR(50) DEFAULT 'FRESH',
  ADD COLUMN IF NOT EXISTS retrieved_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS level VARCHAR(100),
  ADD COLUMN IF NOT EXISTS fee VARCHAR(100),
  ADD COLUMN IF NOT EXISTS content_hash VARCHAR(255),
  ADD COLUMN IF NOT EXISTS data_year INTEGER DEFAULT 2026,
  ADD COLUMN IF NOT EXISTS official_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'VERIFIED',
  ADD COLUMN IF NOT EXISTS freshness_status VARCHAR(50) DEFAULT 'FRESH',
  ADD COLUMN IF NOT EXISTS retrieved_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE careers
  ADD COLUMN IF NOT EXISTS market_demand VARCHAR(50),
  ADD COLUMN IF NOT EXISTS growth_rate VARCHAR(50),
  ADD COLUMN IF NOT EXISTS starting_salary_pkr INTEGER,
  ADD COLUMN IF NOT EXISTS content_hash VARCHAR(255),
  ADD COLUMN IF NOT EXISTS data_year INTEGER DEFAULT 2026,
  ADD COLUMN IF NOT EXISTS official_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'VERIFIED',
  ADD COLUMN IF NOT EXISTS freshness_status VARCHAR(50) DEFAULT 'FRESH',
  ADD COLUMN IF NOT EXISTS retrieved_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ DEFAULT NOW();

-- Create Unique Indexes for ON CONFLICT Upserts
CREATE UNIQUE INDEX IF NOT EXISTS idx_universities_name_unique ON universities(name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_scholarships_name_unique ON scholarships(name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_courses_title_unique ON courses(title);
CREATE UNIQUE INDEX IF NOT EXISTS idx_careers_title_unique ON careers(title);
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_external_id_unique ON jobs(external_id);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_jobs_verification ON jobs(verification_status, freshness_status);
CREATE INDEX IF NOT EXISTS idx_jobs_field ON jobs(field);
CREATE INDEX IF NOT EXISTS idx_universities_verification ON universities(verification_status, freshness_status);
CREATE INDEX IF NOT EXISTS idx_scholarships_verification ON scholarships(verification_status, freshness_status);
`;

export async function runMigration() {
  console.log('Running real data pipeline schema migration...');
  try {
    await pool.query(MIGRATION_SQL);
    console.log('✓ Real data pipeline schema migration completed successfully!');
  } catch (err: any) {
    console.error('Migration error:', err.message);
  } finally {
    await pool.end();
  }
}

if (process.argv[1]?.endsWith('migrate_real_data_pipeline.ts')) {
  runMigration();
}
