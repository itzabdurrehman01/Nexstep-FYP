import assert from 'node:assert/strict';
import { getRoleHomePath, getUserRole } from './accountRole.js';

assert.equal(getUserRole({ role: 'MENTOR' }), 'MENTOR');
assert.equal(getUserRole({ role: 'ADMIN' }), 'ADMIN');
assert.equal(getUserRole({ role: 'STUDENT' }), 'STUDENT');
assert.equal(getUserRole({ role: 'recruiter' }), 'STUDENT');
assert.equal(getUserRole(null), 'STUDENT');
assert.equal(getRoleHomePath({ role: 'ADMIN' }), '/admin');
assert.equal(getRoleHomePath({ role: 'MENTOR' }), '/portal/mentor');
assert.equal(getRoleHomePath({ role: 'STUDENT' }), '/dashboard');
console.log('accountRole tests passed');
