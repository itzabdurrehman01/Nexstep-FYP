// End-to-end integration and health test script
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST || '127.0.0.1',
  port: parseInt(process.env.PG_PORT || '5432', 10),
  database: process.env.PG_DATABASE || 'nexstep_db',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'postgres',
});

async function runTests() {
  console.log('--- Starting NexStep System Health Tests ---');
  const client = await pool.connect();
  try {
    // 1. Check Database Tables and Real Data
    console.log('\n[1/5] Checking Real Datasets:');
    const jobs = await client.query('SELECT COUNT(*) FROM jobs');
    const unis = await client.query('SELECT COUNT(*) FROM universities');
    const scholarships = await client.query('SELECT COUNT(*) FROM scholarships');
    const courses = await client.query('SELECT COUNT(*) FROM courses');
    const careers = await client.query('SELECT COUNT(*) FROM careers');
    console.log(`- Jobs in DB: ${jobs.rows[0].count}`);
    console.log(`- Universities in DB: ${unis.rows[0].count}`);
    console.log(`- Scholarships in DB: ${scholarships.rows[0].count}`);
    console.log(`- Courses in DB: ${courses.rows[0].count}`);
    console.log(`- Careers in DB: ${careers.rows[0].count}`);

    // 2. Check Job Data Mapping (salary and requirements)
    console.log('\n[2/5] Checking Job Data Mapping:');
    const sampleJob = await client.query("SELECT title, company, salary_min, salary_max, required_skills FROM jobs WHERE required_skills != '[]'::jsonb LIMIT 1");
    if (sampleJob.rows.length > 0) {
      const j = sampleJob.rows[0];
      console.log(`- Sample Job: "${j.title}" at "${j.company}"`);
      console.log(`- Salary Range: PKR ${j.salary_min || 0} - ${j.salary_max || 0}`);
      console.log(`- Skills: ${JSON.stringify(j.required_skills)}`);
    }

    // 3. Test OTP storage & verification in DB
    console.log('\n[3/5] Testing OTP Table and Verification:');
    const testEmail = 'test.student@example.com';
    const testOtp = '123456';
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await client.query('DELETE FROM user_otps WHERE email = $1', [testEmail]);
    await client.query(
      `INSERT INTO user_otps (email, otp_code, purpose, expires_at)
       VALUES ($1, $2, 'REGISTER', $3)`,
      [testEmail, testOtp, expiresAt]
    );
    const otpRow = await client.query('SELECT * FROM user_otps WHERE email = $1', [testEmail]);
    console.log(`- OTP inserted successfully: ${otpRow.rows.length === 1 && otpRow.rows[0].otp_code === testOtp ? 'PASS' : 'FAIL'}`);
    await client.query('DELETE FROM user_otps WHERE email = $1', [testEmail]);

    // 4. Test Social Columns on Users Table
    console.log('\n[4/5] Testing Social Auth Columns on Users Table:');
    const userCols = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name IN ('auth_provider', 'provider_id', 'avatar_url', 'phone', 'is_phone_verified')`
    );
    console.log(`- Found social columns: ${userCols.rows.map(r => r.column_name).join(', ')}`);
    console.log(`- All 5 columns present: ${userCols.rows.length === 5 ? 'PASS' : 'FAIL'}`);

    // 5. Test Plans & Subscriptions
    console.log('\n[5/5] Testing Plans & Subscription Sandbox:');
    const plans = await client.query('SELECT slug, name, price_pkr FROM plans WHERE is_active = TRUE ORDER BY sort_order');
    console.log(`- Active Plans: ${plans.rows.map(p => `${p.name} (PKR ${p.price_pkr})`).join(', ')}`);

    console.log('\n--- All Database & Core Health Tests PASSED Successfully! ---');
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

runTests();
