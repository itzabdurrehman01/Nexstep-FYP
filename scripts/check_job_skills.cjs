const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST || '127.0.0.1',
  port: parseInt(process.env.PG_PORT || '5432', 10),
  database: process.env.PG_DATABASE || 'nexstep_db',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'postgres',
});

async function checkJobSkills() {
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT title, company, location, required_skills, salary_min, salary_max FROM jobs WHERE required_skills != '[]'::jsonb LIMIT 2");
    console.log('Sample jobs with skills:', JSON.stringify(res.rows, null, 2));
  } finally {
    client.release();
    await pool.end();
  }
}

checkJobSkills();
