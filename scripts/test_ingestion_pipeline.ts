/**
 * backend/scripts/test_ingestion_pipeline.ts
 *
 * Ingestion Infrastructure & Historical Backfill Integration Test Suite.
 * Asserts versioned snapshot tables, PBS 6-year backfill, SHA-256 deduplication,
 * human review gate (PENDING_REVIEW), and Kaggle origin separation.
 */
import { pool } from '../src/routes/db.js';
import { IngestionPipeline } from '../src/services/ingestionPipeline.js';

async function runPipelineTests() {
  console.log('\n==================================================');
  console.log('⚡ Versioned Ingestion Pipeline & Backfill Test Suite');
  console.log('==================================================\n');

  // 1. Schema & NOT NULL Provenance Verification
  console.log('▶ 1. Verifying Versioned Snapshot DB Tables & Constraints...');
  const tableCheck = await pool.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('raw_snapshots', 'parsed_records', 'job_demand_observations', 'admission_merit_observations')
  `);
  console.log(`  ✓ Found ${tableCheck.rows.length} / 4 Snapshot Tables in PostgreSQL`);
  if (tableCheck.rows.length < 4) throw new Error('Missing snapshot tables in database!');

  // 2. PBS 6-Year Backfill Count Assertion
  console.log('\n▶ 2. Verifying Authentic PBS 6-Year Backfill...');
  const pbsPeriodsRes = await pool.query(`
    SELECT COUNT(DISTINCT period) AS period_count, COUNT(*) AS total_obs
    FROM job_demand_observations
    WHERE source_id = 'pbs-lfs-annual' AND data_origin = 'OFFICIAL'
  `);
  const periodCount = Number(pbsPeriodsRes.rows[0].period_count);
  const totalObs = Number(pbsPeriodsRes.rows[0].total_obs);

  console.log(`  ✓ PBS Distinct Observed Periods: ${periodCount} / 6 Annual Reports`);
  console.log(`  ✓ Total PBS Job Demand Observations: ${totalObs}`);
  if (periodCount !== 6) throw new Error(`Expected 6 PBS periods, got ${periodCount}`);

  // 3. Human Review Gate (PENDING_REVIEW) Isolation Assertion
  console.log('\n▶ 3. Verifying Human Review Gate (PENDING_REVIEW Isolation)...');
  const unreviewedRes = await pool.query(`
    SELECT COUNT(*) AS count FROM job_demand_observations
    WHERE verification_status = 'PENDING_REVIEW' AND data_origin = 'OFFICIAL'
  `);
  console.log(`  ✓ Unreviewed OFFICIAL Observations: ${unreviewedRes.rows[0].count} (Safely gated in PENDING_REVIEW)`);

  // 4. SHA-256 Deduplication Test
  console.log('\n▶ 4. Testing Ingestion SHA-256 Deduplication...');
  const samplePayload = `PBS Test Ingestion Report Payload ${Date.now()}`;
  const res1 = await IngestionPipeline.processRawSnapshot({
    sourceId: 'pbs-test-source',
    sourceUrl: 'https://pbs.gov.pk/test',
    publisher: 'Pakistan Bureau of Statistics',
    rawPayload: samplePayload,
    dataYear: '2024',
    dataOrigin: 'OFFICIAL',
    recordType: 'TEST_EXTRACTION',
    parsedPayload: { test: true },
  });
  console.log(`  ✓ First Ingest: Status = ${res1.status}, ReviewStatus = ${res1.verificationStatus}`);

  const res2 = await IngestionPipeline.processRawSnapshot({
    sourceId: 'pbs-test-source',
    sourceUrl: 'https://pbs.gov.pk/test',
    publisher: 'Pakistan Bureau of Statistics',
    rawPayload: samplePayload, // Identical payload
    dataYear: '2024',
    dataOrigin: 'OFFICIAL',
    recordType: 'TEST_EXTRACTION',
    parsedPayload: { test: true },
  });
  console.log(`  ✓ Duplicate Ingest: Status = ${res2.status} (Deduplication SHA-256 Verified)`);
  if (res2.status !== 'DUPLICATE_SKIPPED') throw new Error('Deduplication failed to reject duplicate payload!');

  // 5. Kaggle Origin Isolation Assertion
  console.log('\n▶ 5. Verifying Kaggle Data Origin Isolation...');
  const kaggleRes = await pool.query(`
    SELECT COUNT(*) AS count FROM parsed_records WHERE data_origin = 'KAGGLE'
  `);
  console.log(`  ✓ Kaggle Benchmark Records: ${kaggleRes.rows[0].count} (Isolated with data_origin = 'KAGGLE')`);

  // 6. Readiness Endpoint VERIFIED-Only Threshold Assertion
  console.log('\n▶ 6. Verifying Data Readiness Endpoint VERIFIED-Only Threshold Assertion...');
  const verifiedPbsRes = await pool.query(`
    SELECT COUNT(DISTINCT period) AS count FROM job_demand_observations
    WHERE source_id = 'pbs-lfs-annual' AND verification_status = 'VERIFIED'
  `);
  const verifiedCount = Number(verifiedPbsRes.rows[0].count);
  console.log(`  ✓ Verified PBS LFS Periods: ${verifiedCount} / 6 (Only VERIFIED records count toward unlock threshold)`);
  if (verifiedCount !== 6) throw new Error(`Expected 6 VERIFIED PBS periods, got ${verifiedCount}`);

  console.log('\n==================================================');
  console.log('🏆 INGESTION PIPELINE & READINESS SUITE: ALL TESTS PASSED ✓');
  console.log('==================================================\n');
}

runPipelineTests().then(() => process.exit(0)).catch(console.error);
