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
    const res = await client.query(
      "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position"
    );
    console.log('Columns in users table:');
    console.table(res.rows);

    const otpTable = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_name IN ('user_otps', 'otps', 'email_verify_tokens')"
    );
    console.log('Existing OTP-related tables:', otpTable.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
