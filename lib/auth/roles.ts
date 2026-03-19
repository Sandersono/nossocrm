export type UserRole = 'superadmin' | 'admin' | 'vendedor';

export function isSuperAdminRole(role: string | null | undefined): role is 'superadmin' {
  return role === 'superadmin';
}

export function isAdminRole(role: string | null | undefined): role is 'superadmin' | 'admin' {
  return role === 'admin' || role === 'superadmin';
}

export function getRoleLabel(role: string | null | undefined) {
  if (role === 'superadmin') return 'Superadmin';
  if (role === 'admin') return 'Admin';
  return 'Vendedor';
}
