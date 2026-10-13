const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST || '127.0.0.1',
  port: parseInt(process.env.PG_PORT || '5432', 10),
  database: process.env.PG_DATABASE || 'nexstep_db',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'postgres',
});

async function checkSampleJob() {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT title, company, salary_min, salary_max, salary_currency, required_skills, field, location FROM jobs LIMIT 2');
    console.log('Sample jobs:', JSON.stringify(res.rows, null, 2));
  } finally {
    client.release();
    await pool.end();
  }
}

checkSampleJob();
