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

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running OTP and Social Auth migrations...');
    await client.query('BEGIN');

    // 1. Add social auth columns to users table
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'LOCAL';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_id VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_phone_verified BOOLEAN DEFAULT FALSE;
    `);

    // 2. Create user_otps table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_otps (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        otp_code VARCHAR(10) NOT NULL,
        purpose VARCHAR(50) NOT NULL DEFAULT 'REGISTER',
        attempts INT NOT NULL DEFAULT 0,
        is_verified BOOLEAN NOT NULL DEFAULT FALSE,
        verification_token VARCHAR(255),
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_user_otps_email_purpose ON user_otps(email, purpose);
      CREATE INDEX IF NOT EXISTS idx_user_otps_token ON user_otps(verification_token);
    `);

    await client.query('COMMIT');
    console.log('✅ OTP and Social Auth migration completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
