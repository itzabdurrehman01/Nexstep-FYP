/**
 * src/server/db.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Singleton PostgreSQL connection pool.
 * Import this anywhere in the backend to get a shared pool instance.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL?.trim();
const useSsl = process.env.PG_SSL === 'true'
  || (process.env.NODE_ENV === 'production' && process.env.PG_SSL !== 'false');

const poolOptions = {
  max: 25, // max pool connections
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 20000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  ...(connectionString
    ? {
        connectionString,
        ssl: useSsl ? { rejectUnauthorized: false } : false,
      }
    : {
        host: process.env.PG_HOST || '127.0.0.1',
        port: Number(process.env.PG_PORT || 5432),
        user: process.env.PG_USER || 'postgres',
        password: process.env.PG_PASSWORD || 'password',
        database: process.env.PG_DATABASE || 'nexstep_db',
      }),
};

export const pool = new Pool(poolOptions);

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err.message);
});

/** Convenience wrapper: run a parameterised query and return rows. */
export async function query<T = any>(
  sql: string,
  params?: any[]
): Promise<T[]> {
  const { rows } = await pool.query(sql, params);
  return rows as T[];
}

/** Run a query and return the first row or null. */
export async function queryOne<T = any>(
  sql: string,
  params?: any[]
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}
