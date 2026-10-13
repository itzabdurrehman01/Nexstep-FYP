/**
 * db/migrate_translations.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Adds the translation_cache table used by the dynamic translation service.
 *
 * Run once:
 *   npx tsx db/migrate_translations.ts
 *
 * Safe to re-run — uses CREATE TABLE IF NOT EXISTS.
 */
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  host:     process.env.PG_HOST     || '127.0.0.1',
  port:     Number(process.env.PG_PORT || 5432),
  user:     process.env.PG_USER     || 'postgres',
  password: process.env.PG_PASSWORD || 'password',
  database: process.env.PG_DATABASE || 'nexstep_db',
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS translation_cache (
        id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        source_text     TEXT          NOT NULL,
        source_language VARCHAR(10)   NOT NULL DEFAULT 'en',
        target_language VARCHAR(10)   NOT NULL DEFAULT 'ur',
        translated_text TEXT          NOT NULL,
        char_count      INTEGER       NOT NULL DEFAULT 0,
        created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        UNIQUE (source_text, source_language, target_language)
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_translation_cache_lookup
        ON translation_cache (source_language, target_language, source_text);
    `);
    console.log('✓ translation_cache table ready.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => { console.error(err); process.exit(1); });
