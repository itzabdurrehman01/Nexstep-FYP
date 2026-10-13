/**
 * backend/db/migrate_versioned_snapshots.ts
 *
 * Versioned Snapshot & Observation Database Schema Migration.
 * Creates immutable raw_snapshots, parsed_records, job_demand_observations,
 * and admission_merit_observations tables with standard provenance fields.
 */
import { pool } from '../src/routes/db.js';

export async function migrateVersionedSnapshots() {
  console.log('⚡ Running Versioned Snapshot Schema Migration...');

  await pool.query(`
    -- 1. raw_snapshots: Immutable fetched raw payloads with SHA-256 checksums
    CREATE TABLE IF NOT EXISTS raw_snapshots (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source_id VARCHAR(100) NOT NULL,
      source_url TEXT NOT NULL,
      publisher VARCHAR(255) NOT NULL,
      payload_checksum VARCHAR(64) UNIQUE NOT NULL,
      raw_payload TEXT NOT NULL,
      data_year VARCHAR(20) NOT NULL,
      data_origin VARCHAR(20) NOT NULL DEFAULT 'OFFICIAL',
      retrieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_raw_snapshots_checksum ON raw_snapshots(payload_checksum);
    CREATE INDEX IF NOT EXISTS idx_raw_snapshots_source ON raw_snapshots(source_id);

    -- 2. parsed_records: Structured extractions foreign-keyed to raw_snapshots
    CREATE TABLE IF NOT EXISTS parsed_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      raw_snapshot_id UUID REFERENCES raw_snapshots(id) ON DELETE CASCADE,
      record_type VARCHAR(100) NOT NULL,
      extraction_payload JSONB NOT NULL,
      verification_status VARCHAR(50) NOT NULL DEFAULT 'PENDING_REVIEW',
      freshness_status VARCHAR(50) NOT NULL DEFAULT 'FRESH',
      data_origin VARCHAR(20) NOT NULL DEFAULT 'OFFICIAL',
      retrieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_parsed_records_snapshot ON parsed_records(raw_snapshot_id);
    CREATE INDEX IF NOT EXISTS idx_parsed_records_status ON parsed_records(verification_status);

    -- 3. job_demand_observations: Time-series observations per ISCO-08 occupation group & province
    CREATE TABLE IF NOT EXISTS job_demand_observations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      occupation_code VARCHAR(20) NOT NULL, -- e.g. ISCO-21 for Science & Engineering, ISCO-25 for ICT
      occupation_title VARCHAR(255) NOT NULL,
      province VARCHAR(100) NOT NULL, -- Punjab, Sindh, KPK, Balochistan, Federal
      period VARCHAR(20) NOT NULL, -- e.g. 2018-19, 2019-20, 2020-21, 2021-22, 2022-23, 2023-24
      indicator_type VARCHAR(100) NOT NULL, -- EMPLOYED_COUNT, AVERAGE_MONTHLY_WAGE_PKR, VACANCY_COUNT
      indicator_value NUMERIC(12, 2) NOT NULL,
      source_id VARCHAR(100) NOT NULL,
      source_url TEXT NOT NULL,
      publisher VARCHAR(255) NOT NULL,
      verification_status VARCHAR(50) NOT NULL DEFAULT 'PENDING_REVIEW',
      freshness_status VARCHAR(50) NOT NULL DEFAULT 'FRESH',
      data_origin VARCHAR(20) NOT NULL DEFAULT 'OFFICIAL',
      retrieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_job_obs_occupation ON job_demand_observations(occupation_code, province);
    CREATE INDEX IF NOT EXISTS idx_job_obs_period ON job_demand_observations(period);

    -- 4. admission_merit_observations: Cycle-by-cycle closing merit, seats, and applicants
    CREATE TABLE IF NOT EXISTS admission_merit_observations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      university_name VARCHAR(255) NOT NULL,
      program_name VARCHAR(255) NOT NULL,
      admission_cycle VARCHAR(20) NOT NULL, -- e.g. 2024-Fall, 2025-Fall
      closing_merit NUMERIC(5, 2) NOT NULL, -- Closing aggregate percentage
      seats INTEGER,
      applicants INTEGER,
      entry_test_weightage NUMERIC(5, 2),
      source_id VARCHAR(100) NOT NULL,
      source_url TEXT NOT NULL,
      publisher VARCHAR(255) NOT NULL,
      verification_status VARCHAR(50) NOT NULL DEFAULT 'PENDING_REVIEW',
      freshness_status VARCHAR(50) NOT NULL DEFAULT 'FRESH',
      data_origin VARCHAR(20) NOT NULL DEFAULT 'OFFICIAL',
      retrieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_merit_obs_uni ON admission_merit_observations(university_name, program_name);
    CREATE INDEX IF NOT EXISTS idx_merit_obs_cycle ON admission_merit_observations(admission_cycle);
  `);

  console.log('✓ Versioned Snapshot & Observation Schema Migration Complete!');
}

if (process.argv[1]?.includes('migrate_versioned_snapshots')) {
  migrateVersionedSnapshots().then(() => process.exit(0)).catch(console.error);
}
