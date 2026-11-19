import {
  Product,
  Customer,
  Transaction,
  Account,
  JournalEntry,
  Shift,
  Employee,
  PayrollRun,
  User,
  BusinessProfile,
} from '../types';

export interface SQLDatabasePayload {
  version: string;
  exportedAt: string;
  engine: string;
  currency: string;
  businessProfile: BusinessProfile;
  products: Product[];
  customers: Customer[];
  transactions: Transaction[];
  accounts: Account[];
  journalEntries: JournalEntry[];
  shifts: Shift[];
  employees: Employee[];
  payrollRuns: PayrollRun[];
  users: User[];
}

export interface SQLQueryResult {
  columns: string[];
  rows: Record<string, any>[];
  rowCount: number;
  executionTimeMs: number;
  error?: string;
  message?: string;
}

const esc = (val: any): string => {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  return `'${String(val).replace(/'/g, "''")}'`;
};

export function generateSQLSchema(): string {
  return `-- ============================================================
-- AFRITECX BADBOY ACCOUNTING & POS - SQL DATABASE SCHEMA
-- Engine: PostgreSQL / SQLite Compatible (Next.js App Router)
-- Currency: South African Rand (ZAR / R)
-- ============================================================

CREATE TABLE IF NOT EXISTS business_profile (
  id VARCHAR(32) PRIMARY KEY DEFAULT 'default',
  company_name VARCHAR(255) NOT NULL,
  tagline VARCHAR(255),
  industry VARCHAR(64) NOT NULL,
  registration_number VARCHAR(64),
  vat_number VARCHAR(64),
  default_vat_rate DECIMAL(5,2) DEFAULT 15.00,
  currency_code VARCHAR(8) DEFAULT 'ZAR',
  currency_symbol VARCHAR(8) DEFAULT 'R',
  address TEXT,
  phone VARCHAR(64),
  email VARCHAR(255),
  receipt_footer TEXT,
  invoice_prefix VARCHAR(16) DEFAULT 'INV-'
);

CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(32) PRIMARY KEY,
  code VARCHAR(64) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(128),
  price_zar DECIMAL(12,2) NOT NULL,
  cost_zar DECIMAL(12,2) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 15.00,
  barcode VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(32) PRIMARY KEY,
  code VARCHAR(64) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(64),
  address TEXT,
  credit_limit_zar DECIMAL(12,2) DEFAULT 0.00,
  balance_zar DECIMAL(12,2) DEFAULT 0.00
);

CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(32) PRIMARY KEY,
  date DATE NOT NULL,
  type VARCHAR(32) NOT NULL,
  description TEXT NOT NULL,
  customer_id VARCHAR(32) REFERENCES customers(id),
  customer_name VARCHAR(255),
  amount_zar DECIMAL(12,2) NOT NULL,
  tax_zar DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_zar DECIMAL(12,2) NOT NULL,
  status VARCHAR(32) NOT NULL,
  items_json TEXT
);

CREATE TABLE IF NOT EXISTS accounts (
  id VARCHAR(32) PRIMARY KEY,
  code VARCHAR(32) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(32) NOT NULL,
  balance_zar DECIMAL(14,2) NOT NULL DEFAULT 0.00
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id VARCHAR(32) PRIMARY KEY,
  date DATE NOT NULL,
  reference VARCHAR(64) NOT NULL,
  description TEXT NOT NULL,
  debits_json TEXT NOT NULL,
  credits_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shifts (
  id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  opened_at TIMESTAMP NOT NULL,
  closed_at TIMESTAMP,
  opening_cash_zar DECIMAL(12,2) NOT NULL,
  closing_cash_zar DECIMAL(12,2),
  expected_cash_zar DECIMAL(12,2),
  counted_cash_zar DECIMAL(12,2),
  difference_zar DECIMAL(12,2),
  status VARCHAR(32) NOT NULL,
  transaction_count INT DEFAULT 0,
  total_sales_zar DECIMAL(12,2) DEFAULT 0.00,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS employees (
  id VARCHAR(32) PRIMARY KEY,
  code VARCHAR(64) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  position VARCHAR(128) NOT NULL,
  department VARCHAR(128) NOT NULL,
  salary_zar DECIMAL(12,2) NOT NULL,
  pay_frequency VARCHAR(32) NOT NULL,
  bank_account VARCHAR(64),
  tax_number VARCHAR(64),
  status VARCHAR(32) NOT NULL,
  hire_date DATE NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS payroll_runs (
  id VARCHAR(32) PRIMARY KEY,
  period VARCHAR(64) NOT NULL,
  run_date DATE NOT NULL,
  total_gross_zar DECIMAL(14,2) NOT NULL,
  total_tax_zar DECIMAL(14,2) NOT NULL,
  total_net_zar DECIMAL(14,2) NOT NULL,
  status VARCHAR(32) NOT NULL,
  entries_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(32) PRIMARY KEY,
  username VARCHAR(64) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  role VARCHAR(32) NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP
);`;
}

export function generateSQLDump(payload: SQLDatabasePayload): string {
  const lines: string[] = [
    generateSQLSchema(),
    '',
    `-- ============================================================`,
    `-- DATA DUMP EXPORTED AT: ${payload.exportedAt}`,
    `-- ============================================================`,
    'BEGIN TRANSACTION;',
    '',
  ];

  const bp = payload.businessProfile;
  lines.push(
    `DELETE FROM business_profile;`,
    `INSERT INTO business_profile (id, company_name, tagline, industry, registration_number, vat_number, default_vat_rate, currency_code, currency_symbol, address, phone, email, receipt_footer, invoice_prefix) VALUES ('default', ${esc(bp.companyName)}, ${esc(bp.tagline)}, ${esc(bp.industry)}, ${esc(bp.registrationNumber)}, ${esc(bp.vatNumber)}, ${esc(bp.defaultVatRate)}, ${esc(bp.currencyCode)}, ${esc(bp.currencySymbol)}, ${esc(bp.address)}, ${esc(bp.phone)}, ${esc(bp.email)}, ${esc(bp.receiptFooter)}, ${esc(bp.invoicePrefix)});`,
    ''
  );

  lines.push(`DELETE FROM products;`);
  payload.products.forEach(p => {
    lines.push(
      `INSERT INTO products (id, code, name, description, category, price_zar, cost_zar, stock, tax_rate, barcode) VALUES (${esc(p.id)}, ${esc(p.code)}, ${esc(p.name)}, ${esc(p.description)}, ${esc(p.category)}, ${esc(p.price)}, ${esc(p.cost)}, ${esc(p.stock)}, ${esc(p.taxRate)}, ${esc(p.barcode || '')});`
    );
  });
  lines.push('');

  lines.push(`DELETE FROM customers;`);
  payload.customers.forEach(c => {
    lines.push(
      `INSERT INTO customers (id, code, name, email, phone, address, credit_limit_zar, balance_zar) VALUES (${esc(c.id)}, ${esc(c.code)}, ${esc(c.name)}, ${esc(c.email)}, ${esc(c.phone)}, ${esc(c.address)}, ${esc(c.creditLimit)}, ${esc(c.balance)});`
    );
  });
  lines.push('');

  lines.push(`DELETE FROM transactions;`);
  payload.transactions.forEach(t => {
    lines.push(
      `INSERT INTO transactions (id, date, type, description, customer_id, customer_name, amount_zar, tax_zar, total_zar, status, items_json) VALUES (${esc(t.id)}, ${esc(t.date)}, ${esc(t.type)}, ${esc(t.description)}, ${esc(t.customerId || null)}, ${esc(t.customerName || null)}, ${esc(t.amount)}, ${esc(t.tax)}, ${esc(t.total)}, ${esc(t.status)}, ${esc(t.items || [])});`
    );
  });
  lines.push('');

  lines.push(`DELETE FROM accounts;`);
  payload.accounts.forEach(a => {
    lines.push(
      `INSERT INTO accounts (id, code, name, type, balance_zar) VALUES (${esc(a.id)}, ${esc(a.code)}, ${esc(a.name)}, ${esc(a.type)}, ${esc(a.balance)});`
    );
  });
  lines.push('');

  lines.push(`DELETE FROM journal_entries;`);
  payload.journalEntries.forEach(j => {
    lines.push(
      `INSERT INTO journal_entries (id, date, reference, description, debits_json, credits_json) VALUES (${esc(j.id)}, ${esc(j.date)}, ${esc(j.reference)}, ${esc(j.description)}, ${esc(j.debits)}, ${esc(j.credits)});`
    );
  });
  lines.push('');

  lines.push(`DELETE FROM shifts;`);
  payload.shifts.forEach(s => {
    lines.push(
      `INSERT INTO shifts (id, user_id, user_name, opened_at, closed_at, opening_cash_zar, closing_cash_zar, expected_cash_zar, counted_cash_zar, difference_zar, status, transaction_count, total_sales_zar, notes) VALUES (${esc(s.id)}, ${esc(s.userId)}, ${esc(s.userName)}, ${esc(s.openedAt)}, ${esc(s.closedAt || null)}, ${esc(s.openingCash)}, ${esc(s.closingCash ?? null)}, ${esc(s.expectedCash ?? null)}, ${esc(s.countedCash ?? null)}, ${esc(s.difference ?? null)}, ${esc(s.status)}, ${esc(s.transactionCount)}, ${esc(s.totalSales)}, ${esc(s.notes || null)});`
    );
  });
  lines.push('');

  lines.push(`DELETE FROM employees;`);
  payload.employees.forEach(e => {
    lines.push(
      `INSERT INTO employees (id, code, name, position, department, salary_zar, pay_frequency, bank_account, tax_number, status, hire_date, email, phone) VALUES (${esc(e.id)}, ${esc(e.code)}, ${esc(e.name)}, ${esc(e.position)}, ${esc(e.department)}, ${esc(e.salary)}, ${esc(e.payFrequency)}, ${esc(e.bankAccount)}, ${esc(e.taxNumber)}, ${esc(e.status)}, ${esc(e.hireDate)}, ${esc(e.email)}, ${esc(e.phone)});`
    );
  });
  lines.push('');

  lines.push(`DELETE FROM payroll_runs;`);
  payload.payrollRuns.forEach(pr => {
    lines.push(
      `INSERT INTO payroll_runs (id, period, run_date, total_gross_zar, total_tax_zar, total_net_zar, status, entries_json) VALUES (${esc(pr.id)}, ${esc(pr.period)}, ${esc(pr.runDate)}, ${esc(pr.totalGross)}, ${esc(pr.totalTax)}, ${esc(pr.totalNet)}, ${esc(pr.status)}, ${esc(pr.entries)});`
    );
  });
  lines.push('');

  lines.push(`DELETE FROM users;`);
  payload.users.forEach(u => {
    lines.push(
      `INSERT INTO users (id, username, password_hash, full_name, email, role, active, last_login) VALUES (${esc(u.id)}, ${esc(u.username)}, ${esc(u.password)}, ${esc(u.fullName)}, ${esc(u.email)}, ${esc(u.role)}, ${esc(u.active)}, ${esc(u.lastLogin || null)});`
    );
  });

  lines.push('', 'COMMIT;');
  return lines.join('\n');
}

export function executeSQLQuery(sql: string, payload: SQLDatabasePayload): SQLQueryResult {
  const start = performance.now();
  const clean = sql.trim().replace(/;+$/, '').trim();

  const tablesMap: Record<string, Record<string, any>[]> = {
    products: payload.products.map(p => ({
      id: p.id,
      code: p.code,
      name: p.name,
      category: p.category,
      price_zar: p.price,
      cost_zar: p.cost,
      stock: p.stock,
      tax_rate: p.taxRate,
      barcode: p.barcode || '',
    })),
    customers: payload.customers.map(c => ({
      id: c.id,
      code: c.code,
      name: c.name,
      email: c.email,
      phone: c.phone,
      credit_limit_zar: c.creditLimit,
      balance_zar: c.balance,
    })),
    transactions: payload.transactions.map(t => ({
      id: t.id,
      date: t.date,
      type: t.type,
      description: t.description,
      customer_name: t.customerName || 'Walk-in',
      amount_zar: t.amount,
      tax_zar: t.tax,
      total_zar: t.total,
      status: t.status,
    })),
    accounts: payload.accounts.map(a => ({
      id: a.id,
      code: a.code,
      name: a.name,
      type: a.type,
      balance_zar: a.balance,
    })),
    journal_entries: payload.journalEntries.map(j => ({
      id: j.id,
      date: j.date,
      reference: j.reference,
      description: j.description,
      debits_count: j.debits.length,
      credits_count: j.credits.length,
    })),
    shifts: payload.shifts.map(s => ({
      id: s.id,
      user_name: s.userName,
      opened_at: s.openedAt,
      status: s.status,
      opening_cash_zar: s.openingCash,
      total_sales_zar: s.totalSales,
      difference_zar: s.difference ?? 0,
    })),
    employees: payload.employees.map(e => ({
      id: e.id,
      code: e.code,
      name: e.name,
      position: e.position,
      department: e.department,
      salary_zar: e.salary,
      pay_frequency: e.payFrequency,
      status: e.status,
    })),
    payroll_runs: payload.payrollRuns.map(pr => ({
      id: pr.id,
      period: pr.period,
      run_date: pr.runDate,
      total_gross_zar: pr.totalGross,
      total_tax_zar: pr.totalTax,
      total_net_zar: pr.totalNet,
      status: pr.status,
    })),
    users: payload.users.map(u => ({
      id: u.id,
      username: u.username,
      full_name: u.fullName,
      email: u.email,
      role: u.role,
      active: u.active,
    })),
    business_profile: [
      {
        company_name: payload.businessProfile.companyName,
        industry: payload.businessProfile.industry,
        vat_number: payload.businessProfile.vatNumber,
        currency_code: payload.businessProfile.currencyCode,
        default_vat_rate: payload.businessProfile.defaultVatRate,
      },
    ],
  };

  try {
    if (/^SHOW\s+TABLES$/i.test(clean)) {
      const rows = Object.keys(tablesMap).map(name => ({
        table_name: name,
        row_count: tablesMap[name].length,
        engine: 'Next.js SQL Relational Store',
      }));
      return {
        columns: ['table_name', 'row_count', 'engine'],
        rows,
        rowCount: rows.length,
        executionTimeMs: +(performance.now() - start).toFixed(2),
      };
    }

    const selectMatch = clean.match(
      /^SELECT\s+(.+?)\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+([a-zA-Z0-9_]+)(?:\s+(ASC|DESC))?)?(?:\s+LIMIT\s+(\d+))?$/i
    );

    if (!selectMatch) {
      return {
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: +(performance.now() - start).toFixed(2),
        error: `Unsupported SQL syntax. Try: SELECT * FROM products WHERE stock < 30 ORDER BY price_zar DESC LIMIT 10 or SHOW TABLES`,
      };
    }

    const [, selectColsRaw, tableNameRaw, whereRaw, orderColRaw, orderDirRaw, limitRaw] = selectMatch;
    const tableName = tableNameRaw.toLowerCase();
    const tableRows = tablesMap[tableName];

    if (!tableRows) {
      return {
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: +(performance.now() - start).toFixed(2),
        error: `Table '${tableName}' does not exist. Available tables: ${Object.keys(tablesMap).join(', ')}`,
      };
    }

    let filtered = [...tableRows];

    if (whereRaw) {
      const condMatch = whereRaw.trim().match(/^([a-zA-Z0-9_]+)\s*(=|!=|>|<|>=|<=|LIKE)\s*(.+)$/i);
      if (condMatch) {
        const [, col, op, valRaw] = condMatch;
        const cleanVal = valRaw.trim().replace(/^['"]|['"]$/g, '');
        filtered = filtered.filter(row => {
          const cell = row[col];
          const numVal = Number(cleanVal);
          const isNum = !isNaN(numVal) && typeof cell === 'number';
          switch (op.toUpperCase()) {
            case '=':
              return isNum ? cell === numVal : String(cell).toLowerCase() === cleanVal.toLowerCase();
            case '!=':
              return isNum ? cell !== numVal : String(cell).toLowerCase() !== cleanVal.toLowerCase();
            case '>':
              return Number(cell) > numVal;
            case '<':
              return Number(cell) < numVal;
            case '>=':
              return Number(cell) >= numVal;
            case '<=':
              return Number(cell) <= numVal;
            case 'LIKE': {
              const regex = new RegExp('^' + cleanVal.replace(/%/g, '.*') + '$', 'i');
              return regex.test(String(cell));
            }
            default:
              return true;
          }
        });
      }
    }

    if (orderColRaw) {
      const dir = (orderDirRaw || 'ASC').toUpperCase() === 'DESC' ? -1 : 1;
      filtered.sort((a, b) => {
        const va = a[orderColRaw];
        const vb = b[orderColRaw];
        if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
        return String(va ?? '').localeCompare(String(vb ?? '')) * dir;
      });
    }

    if (limitRaw) {
      filtered = filtered.slice(0, parseInt(limitRaw, 10));
    }

    // Check for aggregate functions like COUNT(*), SUM(col), AVG(col)
    if (/COUNT\(|SUM\(|AVG\(/i.test(selectColsRaw)) {
      const aggRow: Record<string, any> = {};
      const parts = selectColsRaw.split(',').map(s => s.trim());
      parts.forEach(part => {
        const m = part.match(/^(COUNT|SUM|AVG)\((.+?)\)$/i);
        if (m) {
          const fn = m[1].toUpperCase();
          const col = m[2].trim();
          const key = `${fn}(${col})`;
          if (fn === 'COUNT') {
            aggRow[key] = filtered.length;
          } else if (fn === 'SUM') {
            aggRow[key] = +filtered.reduce((s, r) => s + (Number(r[col]) || 0), 0).toFixed(2);
          } else if (fn === 'AVG') {
            aggRow[key] = filtered.length
              ? +(filtered.reduce((s, r) => s + (Number(r[col]) || 0), 0) / filtered.length).toFixed(2)
              : 0;
          }
        }
      });
      return {
        columns: Object.keys(aggRow),
        rows: [aggRow],
        rowCount: 1,
        executionTimeMs: +(performance.now() - start).toFixed(2),
      };
    }

    let columns: string[] = [];
    if (selectColsRaw.trim() === '*') {
      columns = filtered[0] ? Object.keys(filtered[0]) : tableRows[0] ? Object.keys(tableRows[0]) : [];
    } else {
      columns = selectColsRaw.split(',').map(c => c.trim());
      filtered = filtered.map(row => {
        const picked: Record<string, any> = {};
        columns.forEach(c => {
          picked[c] = row[c];
        });
        return picked;
      });
    }

    return {
      columns,
      rows: filtered,
      rowCount: filtered.length,
      executionTimeMs: +(performance.now() - start).toFixed(2),
    };
  } catch (err: any) {
    return {
      columns: [],
      rows: [],
      rowCount: 0,
      executionTimeMs: +(performance.now() - start).toFixed(2),
      error: err?.message || 'SQL execution error',
    };
  }
}
