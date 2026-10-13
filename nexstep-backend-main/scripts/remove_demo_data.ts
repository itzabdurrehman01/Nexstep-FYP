/**
 * Removes the seeded demo accounts (and everything tied to them through
 * ON DELETE CASCADE: profiles, skills, bookmarks, applications, roadmaps,
 * interviews, conversations, forum posts, notifications, sessions, ...).
 *
 *   npx tsx scripts/remove_demo_data.ts            # dry run — shows what would go
 *   npx tsx scripts/remove_demo_data.ts --confirm  # actually deletes
 *
 * Reference data (universities, scholarships, careers, courses, jobs, etc.)
 * is not touched.
 */
import dotenv from 'dotenv';
import { pool } from '../src/routes/db.js';
dotenv.config();

const DEMO_EMAILS = [
  'admin@nexstep.edu.pk',
  'demo@nexstep.edu.pk',
  'mentor@nexstep.edu.pk',
  'recruiter@nexstep.edu.pk',
];

async function main() {
  const confirm = process.argv.includes('--confirm');

  const { rows: users } = await pool.query(
    `SELECT id, email, role, clerk_user_id, created_at
       FROM users
      WHERE LOWER(email) = ANY($1::text[])
         OR EXISTS (SELECT 1 FROM unnest($1::text[]) e WHERE LOWER(users.email) LIKE e || '.legacy-%')
      ORDER BY email`,
    [DEMO_EMAILS]
  );

  if (!users.length) {
    console.log('No demo accounts found — nothing to remove.');
    return;
  }

  const ids = users.map((u) => u.id);
  console.log(`Demo accounts found: ${users.length}`);
  for (const u of users) console.log(`  - ${u.email} (${u.role})${u.clerk_user_id ? '  ⚠ linked to Clerk' : ''}`);

  // Count dependent rows in every table that references users(id)
  const { rows: refs } = await pool.query(`
    SELECT tc.table_name, kcu.column_name, rc.delete_rule
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
      JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name AND tc.table_schema = rc.constraint_schema
     WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'users' AND ccu.column_name = 'id'
       AND tc.table_schema = 'public'
     ORDER BY tc.table_name`);

  console.log('\nRelated rows:');
  for (const r of refs) {
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM "${r.table_name}" WHERE "${r.column_name}" = ANY($1::uuid[])`, [ids]);
    if (rows[0].n > 0) console.log(`  - ${r.table_name}.${r.column_name}: ${rows[0].n} (${r.delete_rule})`);
  }

  if (!confirm) {
    console.log('\nDry run only. Re-run with --confirm to delete.');
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Tables whose FK does not cascade: clear the reference first.
    for (const r of refs.filter((x) => x.delete_rule === 'NO ACTION' || x.delete_rule === 'RESTRICT')) {
      await client.query(`DELETE FROM "${r.table_name}" WHERE "${r.column_name}" = ANY($1::uuid[])`, [ids]);
    }
    const del = await client.query(`DELETE FROM users WHERE id = ANY($1::uuid[]) RETURNING email`, [ids]);
    await client.query('COMMIT');
    console.log(`\nDeleted ${del.rowCount} demo account(s) and their related rows.`);
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Deletion failed, nothing was changed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
  }
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => pool.end());
