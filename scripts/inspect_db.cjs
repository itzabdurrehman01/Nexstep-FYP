const dotenv = require('dotenv');
const { Pool } = require('pg');
dotenv.config();

const pool = new Pool({
  host: process.env.PG_HOST || '127.0.0.1',
  port: Number(process.env.PG_PORT) || 5432,
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'password',
  database: process.env.PG_DATABASE || 'nexstep_db',
});

async function main() {
  const client = await pool.connect();
  try {
    const tablesRes = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
    );
    console.log(`Found ${tablesRes.rows.length} tables in PostgreSQL:`);
    for (const row of tablesRes.rows) {
      const t = row.table_name;
      try {
        const countRes = await client.query(`SELECT COUNT(*) FROM "${t}"`);
        console.log(`  - ${t}: ${countRes.rows[0].count} rows`);
      } catch (err) {
        console.log(`  - ${t}: error (${err.message})`);
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
