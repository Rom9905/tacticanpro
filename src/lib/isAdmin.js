// Single source of truth for "is this account an admin" on the client.
// Mirrors the database's public.is_admin(): the super-admin email always
// counts (so the account can bootstrap itself) plus anyone with role 'admin'.
// Client-side checks only drive what the UI offers — every rule that matters
// is also enforced in the database.
export const ADMIN_EMAIL = 'romfranko99@gmail.com';

export function isAdminUser(user) {
  if (!user) return false;
  return user.email === ADMIN_EMAIL || user.role === 'admin';
}
