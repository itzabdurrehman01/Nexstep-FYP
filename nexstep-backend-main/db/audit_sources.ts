import dotenv from 'dotenv';
dotenv.config();
import pg from 'pg';
const pool = new pg.Pool({ host: process.env.PG_HOST||'127.0.0.1', port: Number(process.env.PG_PORT||5432), user: process.env.PG_USER||'postgres', password: process.env.PG_PASSWORD||'password', database: process.env.PG_DATABASE||'nexstep_db' });
const {rows} = await pool.query('SELECT id, slug, name, publisher, source_type, is_official, base_url FROM data_sources ORDER BY created_at');
console.log(JSON.stringify(rows, null, 2));
await pool.end();
