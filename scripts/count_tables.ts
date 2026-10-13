import { pool } from '../src/routes/db.js';
const { rows } = await pool.query(`SELECT relname AS t, n_live_tup::int AS n FROM pg_stat_user_tables ORDER BY relname`);
for (const r of rows) {
  const c = await pool.query(`SELECT COUNT(*)::int AS n FROM "${r.t}"`);
  console.log(`${r.t.padEnd(32)} ${c.rows[0].n}`);
}
await pool.end();
