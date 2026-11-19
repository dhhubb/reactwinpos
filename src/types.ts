export interface Product {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  taxRate: number;
  barcode?: string;
  image?: string;
}

export interface Shift {
  id: string;
  userId: string;
  userName: string;
  openedAt: string;
  closedAt?: string;
  openingCash: number;
  closingCash?: number;
  expectedCash?: number;
  countedCash?: number;
  difference?: number;
  status: 'open' | 'closed';
  notes?: string;
  transactionCount: number;
  totalSales: number;
}

export interface CashDenomination {
  denomination: number;
  count: number;
}

export interface Employee {
  id: string;
  code: string;
  name: string;
  position: string;
  department: string;
  salary: number;
  payFrequency: 'monthly' | 'weekly' | 'biweekly';
  bankAccount: string;
  taxNumber: string;
  status: 'active' | 'inactive';
  hireDate: string;
  email: string;
  phone: string;
}

export interface PayrollRun {
  id: string;
  period: string;
  runDate: string;
  entries: { employeeId: string; employeeName: string; gross: number; tax: number; net: number; status: 'paid' | 'pending' }[];
  totalGross: number;
  totalTax: number;
  totalNet: number;
  status: 'draft' | 'approved' | 'paid';
}

export type UserRole = 'admin' | 'manager' | 'cashier' | 'accountant';

export interface User {
  id: string;
  username: string;
  /**
   * Legacy plain-text password. Never populated for new records and cleared on
   * successful sign-in; retained only so pre-existing installs can migrate.
   */
  password: string;
  /** Salted, iterated SHA-256 digest (see `utils/password.ts`). */
  passwordHash?: string;
  fullName: string;
  email: string;
  role: UserRole;
  active: boolean;
  lastLogin?: string;
}

export type IndustryType =
  | 'retail'
  | 'restaurant'
  | 'hardware'
  | 'pharmacy'
  | 'salon'
  | 'automotive'
  | 'electronics'
  | 'general';

export interface BusinessProfile {
  companyName: string;
  tagline: string;
  industry: IndustryType;
  registrationNumber: string;
  vatNumber: string;
  defaultVatRate: number;
  currencyCode: string;
  currencySymbol: string;
  address: string;
  phone: string;
  email: string;
  receiptFooter: string;
  invoicePrefix: string;
  accentColor: 'emerald' | 'blue' | 'violet' | 'amber' | 'rose';
  terminology: {
    productSingular: string;
    productPlural: string;
    customerSingular: string;
    customerPlural: string;
    posTitle: string;
  };
}

export interface DatabaseSnapshot {
  id: string;
  name: string;
  createdAt: string;
  sizeBytes: number;
  recordCount: number;
  dataJson: string;
}

export type Page =
  | 'dashboard'
  | 'pos'
  | 'products'
  | 'customers'
  | 'invoices'
  | 'accounting'
  | 'reports'
  | 'shifts'
  | 'payroll'
  | 'users'
  | 'database'
  | 'settings';

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  creditLimit: number;
  balance: number;
}

export type PaymentMethod = 'cash' | 'card' | 'credit';

export interface Transaction {
  id: string;
  date: string;
  /** Local wall-clock time (HH:MM:SS). Required to attribute a sale to the right shift. */
  time?: string;
  type: 'sale' | 'payment' | 'refund' | 'expense';
  paymentMethod?: PaymentMethod;
  description: string;
  customerId?: string;
  customerName?: string;
  amount: number;
  tax: number;
  total: number;
  status: 'paid' | 'pending' | 'overdue' | 'cancelled';
  items?: { productId: string; productName: string; quantity: number; price: number }[];
}

export interface Account {
  id: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  balance: number;
}

export interface JournalEntry {
  id: string;
  date: string;
  description: string;
  reference: string;
  debits: { accountId: string; accountName: string; amount: number }[];
  credits: { accountId: string; accountName: string; amount: number }[];
}


