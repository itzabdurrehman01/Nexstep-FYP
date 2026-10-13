import pg from 'pg'; import dotenv from 'dotenv'; dotenv.config();
const pool = new pg.Pool({ host:process.env.PG_HOST||'127.0.0.1', port:Number(process.env.PG_PORT||5432), user:process.env.PG_USER||'postgres', password:process.env.PG_PASSWORD||'password', database:process.env.PG_DATABASE||'nexstep_db' });
const {rows} = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='interview_sessions' ORDER BY ordinal_position");
console.log('interview_sessions columns:', rows.map((r:any) => r.column_name).join(', '));
await pool.end();
