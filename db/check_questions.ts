import pg from 'pg'; import dotenv from 'dotenv'; dotenv.config();
const pool = new pg.Pool({ host:process.env.PG_HOST||'127.0.0.1', port:Number(process.env.PG_PORT||5432), user:process.env.PG_USER||'postgres', password:process.env.PG_PASSWORD||'password', database:process.env.PG_DATABASE||'nexstep_db' });
const {rows} = await pool.query(`SELECT test_type, COUNT(*) AS n FROM entry_test_questions GROUP BY test_type ORDER BY test_type`);
rows.forEach((r:any) => console.log(`  ${r.test_type}: ${r.n}`));
const total = await pool.query(`SELECT COUNT(*) AS n FROM entry_test_questions`);
console.log('Total questions:', total.rows[0].n);
await pool.end();
