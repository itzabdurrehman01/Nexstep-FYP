const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST || '127.0.0.1',
  port: parseInt(process.env.PG_PORT || '5432', 10),
  database: process.env.PG_DATABASE || 'nexstep_db',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'postgres',
});

async function checkJobsCols() {
  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'jobs' ORDER BY ordinal_position`
    );
    console.log('Columns in jobs table:');
    res.rows.forEach(r => console.log(`- ${r.column_name} (${r.data_type})`));
  } finally {
    client.release();
    await pool.end();
  }
}

checkJobsCols();
