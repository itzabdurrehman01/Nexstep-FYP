/**
 * backend/scripts/test_verification_counter_guardrail.ts
 *
 * Test Suite for Verification Counter Guardrail.
 * Asserts that getVerifiedPeriodCounts excludes PENDING_REVIEW, UNVERIFIED,
 * REJECTED, and EXPIRED records from verifiedCount by construction.
 */
import { pool } from '../src/routes/db.js';
import { VerificationCounter } from '../src/services/verificationCounter.js';

async function testVerificationCounterGuardrail() {
  console.log('\n==================================================');
  console.log('⚡ Verification Counter Utility Guardrail Test Suite');
  console.log('==================================================\n');

  // Insert mock rows with different status values
  const testPeriod = `TP-${Date.now()}`;
  await pool.query(`
    INSERT INTO job_demand_observations
      (occupation_code, occupation_title, province, period, indicator_type, indicator_value, source_id, source_url, publisher, verification_status, data_origin)
    VALUES
      ('ISCO-99', 'Test Occupation', 'Punjab', $1, 'COUNT', 100, 'test-counter-source', 'https://test.com', 'Test Publisher', 'PENDING_REVIEW', 'OFFICIAL'),
      ('ISCO-99', 'Test Occupation', 'Punjab', $1, 'COUNT', 200, 'test-counter-source', 'https://test.com', 'Test Publisher', 'UNVERIFIED', 'OFFICIAL'),
      ('ISCO-99', 'Test Occupation', 'Punjab', $1, 'COUNT', 300, 'test-counter-source', 'https://test.com', 'Test Publisher', 'REJECTED', 'OFFICIAL'),
      ('ISCO-99', 'Test Occupation', 'Punjab', $1, 'COUNT', 400, 'test-counter-source', 'https://test.com', 'Test Publisher', 'EXPIRED', 'OFFICIAL')
  `, [testPeriod]);

  // Query counts using VerificationCounter utility
  const counts = await VerificationCounter.getVerifiedPeriodCounts({
    tableName: 'job_demand_observations',
    sourceId: 'test-counter-source',
  });

  console.log(`▶ Verification Counter Results for source 'test-counter-source':`);
  console.log(`  ✓ verifiedCount: ${counts.verifiedCount}`);
  console.log(`  ✓ pendingReviewCount: ${counts.pendingReviewCount}`);
  console.log(`  ✓ unverifiedCount: ${counts.unverifiedCount}`);
  console.log(`  ✓ rejectedCount: ${counts.rejectedCount}`);

  // Assert verifiedCount strictly equals 0
  if (counts.verifiedCount !== 0) {
    throw new Error(`Guardrail FAILED: verifiedCount was ${counts.verifiedCount}, expected 0! Unverified/Pending rows leaked into verified count!`);
  }

  if (counts.pendingReviewCount !== 1) {
    throw new Error(`Guardrail FAILED: pendingReviewCount was ${counts.pendingReviewCount}, expected 1!`);
  }

  // Cleanup test rows
  await pool.query(`DELETE FROM job_demand_observations WHERE source_id = 'test-counter-source'`);

  console.log('\n==================================================');
  console.log('🏆 VERIFICATION COUNTER GUARDRAIL: ALL TESTS PASSED ✓');
  console.log('==================================================\n');
}

testVerificationCounterGuardrail().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
