const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST || '127.0.0.1',
  port: parseInt(process.env.PG_PORT || '5432', 10),
  database: process.env.PG_DATABASE || 'nexstep_db',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'postgres',
});

async function checkJobStats() {
  const client = await pool.connect();
  try {
    const withSalary = await client.query('SELECT COUNT(*) FROM jobs WHERE salary_min IS NOT NULL OR salary_max IS NOT NULL');
    const withSkills = await client.query("SELECT COUNT(*) FROM jobs WHERE required_skills != '[]'::jsonb AND required_skills IS NOT NULL");
    console.log(`Jobs with salary: ${withSalary.rows[0].count}`);
    console.log(`Jobs with required_skills: ${withSkills.rows[0].count}`);

    // If needed, check some sample fields
    const fields = await client.query('SELECT field, COUNT(*) FROM jobs GROUP BY field ORDER BY count DESC LIMIT 10');
    console.log('Top fields:', fields.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

checkJobStats();
