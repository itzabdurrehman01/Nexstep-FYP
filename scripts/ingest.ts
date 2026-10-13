/**
 * backend/scripts/ingest.ts
 *
 * Modular Ingestion Engine executing Source Connectors.
 *
 * CLI Usage:
 *   npm run data:ingest -- --all
 *   npm run data:ingest -- --source=jobs
 *   npm run data:ingest -- --source=universities
 *   npm run data:ingest -- --source=admissions
 *   npm run data:ingest -- --source=scholarships
 *   npm run data:ingest -- --source=courses
 *   npm run data:ingest -- --source=skills
 *   npm run data:ingest -- --source=careers
 *   npm run data:ingest -- --dry-run --all
 */
import dotenv from 'dotenv';
import pg from 'pg';

import { HecUniversitiesConnector } from '../src/connectors/hecUniversities.connector.js';
import { NationalJobsConnector } from '../src/connectors/nationalJobs.connector.js';
import { HecScholarshipsConnector } from '../src/connectors/hecScholarships.connector.js';
import { TevtaCoursesConnector } from '../src/connectors/tevtaCourses.connector.js';
import { SkillsLaborConnector } from '../src/connectors/skillsLabor.connector.js';
import { AdmissionsConnector } from '../src/connectors/admissions.connector.js';
import { SourceConnector } from '../src/connectors/connector.interface.js';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  host:     process.env.PG_HOST     || '127.0.0.1',
  port:     Number(process.env.PG_PORT || 5432),
  user:     process.env.PG_USER     || 'postgres',
  password: process.env.PG_PASSWORD || 'password',
  database: process.env.PG_DATABASE || 'nexstep_db',
});

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const runAll = args.includes('--all');
const requestedSource = (args.find((arg) => arg.startsWith('--source=')) || '').replace('--source=', '').toLowerCase();

const CONNECTORS: Record<string, SourceConnector> = {
  universities: new HecUniversitiesConnector(),
  jobs:         new NationalJobsConnector(),
  scholarships: new HecScholarshipsConnector(),
  courses:      new TevtaCoursesConnector(),
  skills:       new SkillsLaborConnector(),
  careers:      new SkillsLaborConnector(),
  admissions:   new AdmissionsConnector(),
};

async function runIngestionPipeline() {
  console.log(`\n==================================================`);
  console.log(`NexStep Authentic Data Ingestion Engine (${dryRun ? 'DRY-RUN' : 'LIVE'})`);
  console.log(`==================================================\n`);

  const keysToRun = runAll || !requestedSource
    ? Object.keys(CONNECTORS)
    : [requestedSource];

  let totalRead = 0;
  let totalInserted = 0;
  let totalRejected = 0;

  for (const key of keysToRun) {
    const connector = CONNECTORS[key];
    if (!connector) {
      console.warn(`[WARN] Unknown source key: ${key}`);
      continue;
    }

    console.log(`▶ Processing Connector: [${connector.metadata.name}] (${connector.metadata.slug})...`);

    // 1. Ensure Data Source entry in DB
    if (!dryRun) {
      await pool.query(
        `INSERT INTO data_sources
         (slug, name, publisher, source_type, is_official, base_url, official_url, license, description, refresh_frequency, verification_status, last_checked_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
         ON CONFLICT (slug) DO UPDATE SET
           name = EXCLUDED.name, publisher = EXCLUDED.publisher,
           official_url = EXCLUDED.official_url, last_checked_at = NOW()`,
        [
          connector.metadata.slug,
          connector.metadata.name,
          connector.metadata.publisher,
          connector.metadata.sourceType,
          connector.metadata.isOfficial,
          connector.metadata.baseUrl,
          connector.metadata.officialUrl,
          connector.metadata.license,
          connector.metadata.description,
          connector.metadata.refreshFrequency,
          'VERIFIED',
        ]
      ).catch(() => { /* table will be populated when migration runs */ });
    }

    // 2. Execute Connector Ingest
    const result = await connector.ingest({ dryRun, pool });
    totalRead += result.recordsRead;
    totalInserted += result.recordsInserted;
    totalRejected += result.recordsRejected;

    console.log(`  ✓ Records Read: ${result.recordsRead} | Inserted/Valid: ${result.recordsInserted} | Rejected: ${result.recordsRejected}`);
    if (result.errors.length) {
      console.warn(`  ⚠️ Warnings: ${result.errors.slice(0, 2).join('; ')}`);
    }

    // 3. Log Dataset Import
    if (!dryRun) {
      await pool.query(
        `INSERT INTO dataset_imports
         (source_id, status, dry_run, records_inserted, records_rejected, triggered_by, created_at)
         SELECT id, 'COMPLETED', $1, $2, $3, 'cli-connector', NOW()
         FROM data_sources WHERE slug = $4`,
        [dryRun, result.recordsInserted, result.recordsRejected, connector.metadata.slug]
      ).catch(() => {});
    }
  }

  console.log(`\n==================================================`);
  console.log(`Ingestion Complete! Total Read: ${totalRead} | Valid: ${totalInserted} | Rejected: ${totalRejected}`);
  console.log(`==================================================\n`);

  await pool.end();
}

runIngestionPipeline();
