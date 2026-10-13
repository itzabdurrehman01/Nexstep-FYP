/**
 * backend/db/correct_provenance_statuses.ts
 *
 * Migration & Rule Enforcement Script:
 * Demotes records without verified official URLs (official_url IS NULL or '')
 * from 'VERIFIED' to 'PENDING_REVIEW' or 'UNVERIFIED'.
 * Inserts audit records into `source_change_events`.
 */
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  host:     process.env.PG_HOST     || '127.0.0.1',
  port:     Number(process.env.PG_PORT || 5432),
  user:     process.env.PG_USER     || 'postgres',
  password: process.env.PG_PASSWORD || 'password',
  database: process.env.PG_DATABASE || 'nexstep_db',
});

async function correctProvenanceStatuses() {
  console.log('\n==================================================');
  console.log('⚖️ Correcting Provenance Statuses (Honest Verification)');
  console.log('==================================================\n');

  const tables = ['universities', 'courses', 'jobs', 'scholarships', 'careers'];
  let totalDemoted = 0;

  for (const table of tables) {
    const unverifiedRes = await pool.query(
      `SELECT id, verification_status, official_url FROM ${table} WHERE official_url IS NULL OR official_url = '' OR official_url NOT LIKE 'http%'`
    );

    for (const record of unverifiedRes.rows) {
      if (record.verification_status === 'VERIFIED') {
        const newStatus = 'PENDING_REVIEW';
        await pool.query(
          `UPDATE ${table} SET verification_status = $1, freshness_status = 'AGING' WHERE id = $2`,
          [newStatus, record.id]
        );

        await pool.query(
          `INSERT INTO source_change_events (source_slug, entity_type, entity_id, field_name, old_value, new_value)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            'system-provenance-correction',
            table,
            String(record.id),
            'verification_status',
            String(record.verification_status),
            'PENDING_REVIEW'
          ]
        );

        totalDemoted++;
      }
    }

    const countsRes = await pool.query(
      `SELECT verification_status, COUNT(*)::int AS count FROM ${table} GROUP BY verification_status`
    );
    console.log(`▶ Table [${table.toUpperCase()}]:`);
    for (const row of countsRes.rows) {
      console.log(`   - Status ${row.verification_status}: ${row.count} records`);
    }
  }

  console.log(`\n✓ Total records demoted from VERIFIED to PENDING_REVIEW: ${totalDemoted}`);
  await pool.end();
}

correctProvenanceStatuses().catch((err) => {
  console.error('Error correcting provenance statuses:', err);
  process.exit(1);
});
