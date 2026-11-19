import { UserRole, Page } from '../types';

// Define which pages each role can access
const rolePermissions: Record<UserRole, Page[]> = {
  admin: ['dashboard', 'pos', 'products', 'customers', 'invoices', 'accounting', 'reports', 'shifts', 'payroll', 'users', 'database', 'settings'],
  manager: ['dashboard', 'pos', 'products', 'customers', 'invoices', 'accounting', 'reports', 'shifts', 'payroll', 'database', 'settings'],
  cashier: ['dashboard', 'pos', 'products', 'customers', 'invoices', 'shifts'],
  accountant: ['dashboard', 'invoices', 'accounting', 'reports', 'payroll', 'database'],
};

export function canAccess(role: UserRole, page: Page): boolean {
  return rolePermissions[role].includes(page);
}

export function getAccessiblePages(role: UserRole): Page[] {
  return rolePermissions[role];
}

export const roleLabels: Record<UserRole, string> = {
  admin: 'Administrator',
  manager: 'Manager',
  cashier: 'Cashier',
  accountant: 'Accountant',
};

export const roleColors: Record<UserRole, string> = {
  admin: 'bg-purple-100 text-purple-700',
  manager: 'bg-blue-100 text-blue-700',
  cashier: 'bg-emerald-100 text-emerald-700',
  accountant: 'bg-amber-100 text-amber-700',
};
