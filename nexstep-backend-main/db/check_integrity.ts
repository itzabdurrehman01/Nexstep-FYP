/**
 * db/check_integrity.ts
 * Run: node node_modules/tsx/dist/cli.mjs db/check_integrity.ts
 */
import dotenv from 'dotenv';
dotenv.config();
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  host:     process.env.PG_HOST     || '127.0.0.1',
  port:     Number(process.env.PG_PORT || 5432),
  user:     process.env.PG_USER     || 'postgres',
  password: process.env.PG_PASSWORD || 'password',
  database: process.env.PG_DATABASE || 'nexstep_db',
});

const TABLES = [
  'users','profiles','user_skills','bookmarks','applications',
  'quiz_results','roadmaps','roadmap_milestones','roadmap_tasks',
  'interview_sessions','ai_conversations','ai_messages',
  'refresh_tokens','email_verify_tokens','password_reset_tokens',
  'mentor_sessions','recruiter_jobs','recruiter_applications','recruiter_interviews',
  'plans','subscriptions','payments','payment_events',
  'data_sources','dataset_versions','dataset_imports','jobs','scholarships','universities','courses','careers',
];

const FOREIGN_KEYS = `
  SELECT tc.table_name, kcu.column_name, ccu.table_name AS ref_table
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
  ORDER BY tc.table_name, kcu.column_name
`;

const INDEXES = `
  SELECT tablename, indexname FROM pg_indexes
  WHERE schemaname = 'public'
  ORDER BY tablename, indexname
`;

async function main() {
  console.log('\n══ NexStep DB Integrity Check ══\n');

  let allOk = true;

  // 1. Table existence + row counts
  console.log('── Tables ──────────────────────────');
  for (const t of TABLES) {
    try {
      const { rows } = await pool.query(`SELECT COUNT(*) AS n FROM "${t}"`);
      console.log(`  ✓  ${t.padEnd(30)} rows: ${rows[0].n}`);
    } catch (err: any) {
      console.log(`  ✗  ${t.padEnd(30)} MISSING: ${err.message}`);
      allOk = false;
    }
  }

  // 2. Foreign key count
  console.log('\n── Foreign Keys ─────────────────────');
  const { rows: fkRows } = await pool.query(FOREIGN_KEYS);
  console.log(`  ✓  ${fkRows.length} foreign key constraints defined`);

  // 3. Index count
  console.log('\n── Indexes ──────────────────────────');
  const { rows: idxRows } = await pool.query(INDEXES);
  const ourIdxs = idxRows.filter(r => r.indexname.startsWith('idx_'));
  console.log(`  ✓  ${ourIdxs.length} application indexes (idx_*) defined`);

  // 4. Plans seeded
  console.log('\n── Subscription Plans ───────────────');
  const { rows: plans } = await pool.query(`SELECT slug, name, price_pkr FROM plans ORDER BY sort_order`);
  for (const p of plans) {
    console.log(`  ✓  ${p.slug.padEnd(12)} "${p.name}" — PKR ${p.price_pkr}/mo`);
  }
  if (plans.length === 0) { console.log('  ✗  No plans found — run migrate_payments.ts'); allOk = false; }

  // 5. Updated_at triggers
  console.log('\n── Triggers ─────────────────────────');
  const { rows: triggers } = await pool.query(
    `SELECT tgname FROM pg_trigger WHERE tgname LIKE 'set_updated_at_%' ORDER BY tgname`
  );
  console.log(`  ✓  ${triggers.length} updated_at triggers: ${triggers.map(t => t.tgname).join(', ')}`);

  // 6. Connection pool health
  console.log('\n── Connection Pool ──────────────────');
  const { rows: ping } = await pool.query('SELECT NOW() AS ts, version() AS ver');
  console.log(`  ✓  Connected — server time: ${ping[0].ts}`);
  console.log(`  ✓  ${ping[0].ver.split(',')[0]}`);

  console.log('\n══════════════════════════════════════');
  if (allOk) {
    console.log('  RESULT: ALL CHECKS PASSED ✓');
  } else {
    console.log('  RESULT: SOME CHECKS FAILED ✗ — see above');
    process.exit(1);
  }
  console.log('══════════════════════════════════════\n');
}

main().finally(() => pool.end());
