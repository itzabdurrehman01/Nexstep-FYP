/** Clerk portal users are students or mentors. ADMIN is the separate admin portal only. */
export function getUserRole(user) {
  const rawRole = String(user?.role ?? user?.userRole ?? user?.accountType ?? 'STUDENT').trim().toUpperCase();
  if (rawRole === 'MENTOR') return 'MENTOR';
  if (rawRole === 'ADMIN') return 'ADMIN';
  return 'STUDENT';
}

/** Home page for each role after signing in. */
export function getRoleHomePath(user) {
  const role = getUserRole(user);
  if (role === 'MENTOR') return '/portal/mentor';
  if (role === 'ADMIN') return '/admin';
  return '/dashboard';
}
