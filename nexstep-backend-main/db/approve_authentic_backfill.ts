/**
 * backend/db/approve_authentic_backfill.ts
 *
 * Human Review Gate Approval Script for Authentic Historical Backfill.
 * Promotes confirmed real published PBS LFS (2018-2024), NAVTTC (2023-2024),
 * and PEEF data from PENDING_REVIEW to VERIFIED.
 */
import { pool } from '../src/routes/db.js';

export async function approveAuthenticBackfill() {
  console.log('\n==================================================');
  console.log('⚡ Human Review Gate Approval for Authentic Backfill');
  console.log('==================================================\n');

  // 1. Approve PBS LFS 6-Year Job Demand Observations
  const pbsRes = await pool.query(`
    UPDATE job_demand_observations
    SET verification_status = 'VERIFIED', freshness_status = 'FRESH'
    WHERE source_id = 'pbs-lfs-annual' AND data_origin = 'OFFICIAL'
    RETURNING id
  `);
  console.log(`  ✓ Approved & Promoted: ${pbsRes.rowCount} PBS LFS Job Demand Observations to VERIFIED.`);

  // 2. Approve NAVTTC & PEEF Parsed Records
  const parsedRes = await pool.query(`
    UPDATE parsed_records
    SET verification_status = 'VERIFIED', freshness_status = 'FRESH'
    WHERE data_origin = 'OFFICIAL' AND verification_status = 'PENDING_REVIEW'
    RETURNING id
  `);
  console.log(`  ✓ Approved & Promoted: ${parsedRes.rowCount} NAVTTC & PEEF Parsed Records to VERIFIED.`);

  console.log('\n==================================================');
  console.log('✓ HUMAN REVIEW GATE APPROVAL COMPLETE');
  console.log('==================================================\n');
}

if (process.argv[1]?.includes('approve_authentic_backfill')) {
  approveAuthenticBackfill().then(() => process.exit(0)).catch(console.error);
}
