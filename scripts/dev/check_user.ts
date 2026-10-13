import { queryOne, query } from '../../src/routes/db.js';
import bcrypt from 'bcryptjs';

async function check() {
  const users = await query('SELECT id, email, first_name, last_name, role, password_hash, auth_provider FROM users');
  console.log('Total users:', users.length);
  for (const u of users) {
    const isStudent123 = u.password_hash ? await bcrypt.compare('Student@123', u.password_hash) : false;
    const isPassword123 = u.password_hash ? await bcrypt.compare('Password123', u.password_hash) : false;
    const isAdmin1 = u.password_hash ? await bcrypt.compare('Admin@nexstep1', u.password_hash) : false;
    console.log(`- ${u.email} (${u.role}): Student@123=${isStudent123}, Password123=${isPassword123}, Admin@nexstep1=${isAdmin1}`);
  }
  process.exit(0);
}

check().catch(console.error);
