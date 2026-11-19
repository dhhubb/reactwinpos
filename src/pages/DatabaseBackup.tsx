import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../store';
import {
  generateSQLDump,
  generateSQLSchema,
  executeSQLQuery,
  SQLDatabasePayload,
  SQLQueryResult,
} from '../utils/sqlDatabase';
import { validateBackupPayload, parseSnapshot } from '../utils/backupValidation';
import { localDate } from '../utils/datetime';

const SAMPLE_QUERIES = [
  { label: 'Show All Tables', sql: 'SHOW TABLES' },
  { label: 'Low Stock Items', sql: 'SELECT code, name, category, stock, price_zar FROM products WHERE stock < 25 ORDER BY stock ASC' },
  { label: 'High Value Sales', sql: 'SELECT id, date, customer_name, total_zar, status FROM transactions WHERE total_zar > 1000 ORDER BY total_zar DESC' },
  { label: 'Sales Aggregates (ZAR)', sql: 'SELECT COUNT(*), SUM(total_zar), AVG(total_zar) FROM transactions WHERE type = \'sale\'' },
  { label: 'Top Customer Balances', sql: 'SELECT code, name, email, balance_zar, credit_limit_zar FROM customers ORDER BY balance_zar DESC' },
  { label: 'Chart of Accounts', sql: 'SELECT code, name, type, balance_zar FROM accounts ORDER BY code ASC' },
  { label: 'Active Employees (Payroll)', sql: 'SELECT code, name, position, department, salary_zar FROM employees WHERE status = \'active\' ORDER BY salary_zar DESC' },
];

export default function DatabaseBackup() {
  const { state, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState<'backup' | 'sql' | 'nextjs'>('backup');
  const [snapshotName, setSnapshotName] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [sqlQuery, setSqlQuery] = useState(SAMPLE_QUERIES[1].sql);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dbPayload: SQLDatabasePayload = useMemo(
    () => ({
      version: '2.5.0-nextjs-sql',
      exportedAt: new Date().toISOString(),
      engine: 'PostgreSQL / SQLite Relational Engine',
      currency: 'ZAR',
      businessProfile: state.businessProfile,
      products: state.products,
      customers: state.customers,
      transactions: state.transactions,
      accounts: state.accounts,
      journalEntries: state.journalEntries,
      shifts: state.shifts,
      employees: state.employees,
      payrollRuns: state.payrollRuns,
      users: state.users,
    }),
    [
      state.businessProfile,
      state.products,
      state.customers,
      state.transactions,
      state.accounts,
      state.journalEntries,
      state.shifts,
      state.employees,
      state.payrollRuns,
      state.users,
    ]
  );

  const [queryResult, setQueryResult] = useState<SQLQueryResult>(() =>
    executeSQLQuery(SAMPLE_QUERIES[1].sql, dbPayload)
  );

  const totalRecords =
    state.products.length +
    state.customers.length +
    state.transactions.length +
    state.accounts.length +
    state.journalEntries.length +
    state.shifts.length +
    state.employees.length +
    state.payrollRuns.length +
    state.users.length;

  const dbSizeKB = useMemo(() => {
    const bytes = new Blob([JSON.stringify(dbPayload)]).size;
    return (bytes / 1024).toFixed(2);
  }, [dbPayload]);

  const notify = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleDownloadSQL = () => {
    const sqlDump = generateSQLDump(dbPayload);
    const blob = new Blob([sqlDump], { type: 'application/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `afritecx-badboy-backup-${localDate()}.sql`;
    a.click();
    URL.revokeObjectURL(url);
    notify('success', 'Full relational .SQL database dump downloaded successfully.');
  };

  const handleDownloadJSON = () => {
    const jsonStr = JSON.stringify(dbPayload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `afritecx-badboy-backup-${localDate()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify('success', 'Full .JSON database backup archive downloaded successfully.');
  };

  const handleCreateSnapshot = (e: React.FormEvent) => {
    e.preventDefault();
    const label = snapshotName.trim() || `Manual Backup (${new Date().toLocaleTimeString('en-ZA')})`;
    dispatch({ type: 'CREATE_SNAPSHOT', payload: { name: label } });
    setSnapshotName('');
    notify('success', `Snapshot "${label}" saved to local SQL storage.`);
  };

  const handleRestoreSnapshot = (dataJson: string, name: string) => {
    const result = parseSnapshot({ id: '', name, createdAt: '', sizeBytes: 0, recordCount: 0, dataJson });
    if (!result.ok) {
      // Report every problem instead of half-restoring a corrupt snapshot.
      notify('error', `Snapshot "${name}" could not be restored: ${result.errors.join(' ')}`);
      return;
    }
    dispatch({ type: 'RESTORE_DATABASE', payload: result.payload });
    notify('success', `Database restored from snapshot "${name}".`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const content = String(ev.target?.result || '');
      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        notify('error', 'Could not parse backup file. Please upload a valid Afritecx Badboy .json backup.');
        return;
      }
      // Validated before dispatch: an unchecked file could wipe the chart of
      // accounts, drop every user or leave the app with no administrator.
      const result = validateBackupPayload(parsed);
      if (!result.ok) {
        notify('error', `Backup rejected: ${result.errors.join(' ')}`);
        return;
      }
      dispatch({ type: 'RESTORE_DATABASE', payload: result.payload });
      notify('success', `Database successfully restored from "${file.name}".`);
    };
    reader.onerror = () => notify('error', 'Could not read the selected file.');
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleRunQuery = (customSql?: string) => {
    const q = customSql ?? sqlQuery;
    if (customSql) setSqlQuery(customSql);
    const res = executeSQLQuery(q, dbPayload);
    setQueryResult(res);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">SQL Database & Backup Studio</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">
              Next.js + SQL Active
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Relational SQL storage, automated local persistence, one-click `.sql` / `.json` backups, and live SQL query runner
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadSQL}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            Export .SQL Dump
          </button>
          <button
            onClick={handleDownloadJSON}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
            Export .JSON Backup
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
            Restore from File
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      {statusMessage && (
        <div
          className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="text-xs underline ml-4">
            Dismiss
          </button>
        </div>
      )}

      {/* Database KPI Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 uppercase font-medium">SQL Tables</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">10 Tables</p>
          <p className="text-xs text-emerald-600 mt-1">Normalized Relational Schema</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 uppercase font-medium">Total Records</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalRecords.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">Live rows across all tables</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 uppercase font-medium">Database Size</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{dbSizeKB} KB</p>
          <p className="text-xs text-slate-400 mt-1">Auto-persisted locally</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 uppercase font-medium">Saved Snapshots</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{state.snapshots.length}</p>
          <p className="text-xs text-slate-400 mt-1">Instant point-in-time recovery</p>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {([
          ['backup', 'Backup & Snapshots'],
          ['sql', 'Live SQL Query Console'],
          ['nextjs', 'Next.js + SQL Schema & API'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-4 py-2 rounded-md text-xs font-semibold transition-all ${
              activeTab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* TAB 1: BACKUP & SNAPSHOTS */}
      {activeTab === 'backup' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Snapshot + Table Status */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Create Point-in-Time Snapshot</h3>
              <form onSubmit={handleCreateSnapshot} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Snapshot Label</label>
                  <input
                    type="text"
                    value={snapshotName}
                    onChange={e => setSnapshotName(e.target.value)}
                    placeholder="e.g. Month-End Close March 2025"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Save Database Snapshot Now
                </button>
              </form>

              <div className="mt-5 pt-5 border-t border-slate-100">
                <h4 className="text-xs font-semibold uppercase text-slate-500 mb-2">Factory Reset</h4>
                <p className="text-xs text-slate-400 mb-3">
                  Reset all products, transactions, and accounts back to the default ZAR demonstration dataset.
                </p>
                <button
                  onClick={() => {
                    dispatch({ type: 'RESET_DATABASE' });
                    notify('success', 'Database reset to default ZAR seed data.');
                  }}
                  className="w-full py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold transition-colors"
                >
                  Reset to Default Seed Data
                </button>
              </div>
            </div>

            {/* Table Breakdown */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Live SQL Table Breakdown</h3>
              <div className="space-y-2 text-xs">
                {[
                  { name: 'products', rows: state.products.length },
                  { name: 'customers', rows: state.customers.length },
                  { name: 'transactions', rows: state.transactions.length },
                  { name: 'accounts', rows: state.accounts.length },
                  { name: 'journal_entries', rows: state.journalEntries.length },
                  { name: 'shifts', rows: state.shifts.length },
                  { name: 'employees', rows: state.employees.length },
                  { name: 'payroll_runs', rows: state.payrollRuns.length },
                  { name: 'users', rows: state.users.length },
                  { name: 'business_profile', rows: 1 },
                ].map(t => (
                  <div key={t.name} className="flex items-center justify-between py-1.5 border-b border-slate-50">
                    <span className="font-mono text-slate-700">{t.name}</span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full font-semibold">
                      {t.rows} rows
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Saved Snapshots List */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Saved Database Snapshots</h3>
              <span className="text-xs text-slate-400">Stored in persistent browser SQL cache</span>
            </div>
            <div className="divide-y divide-slate-100">
              {state.snapshots.map(snap => (
                <div key={snap.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">{snap.name}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                        {snap.recordCount} records
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Created: {new Date(snap.createdAt).toLocaleString('en-ZA')} · Size: {(snap.sizeBytes / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRestoreSnapshot(snap.dataJson, snap.name)}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold transition-colors"
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => {
                        const blob = new Blob([snap.dataJson], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${snap.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="px-3 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                    >
                      Download
                    </button>
                    {snap.id !== 'snap-initial' && (
                      <button
                        onClick={() => dispatch({ type: 'DELETE_SNAPSHOT', payload: snap.id })}
                        className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                        title="Delete snapshot"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE SQL CONSOLE */}
      {activeTab === 'sql' && (
        <div className="space-y-4">
          <div className="bg-slate-900 rounded-xl p-5 text-white shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-mono uppercase tracking-wider text-slate-300">
                  Interactive SQL Query Runner (ZAR Relational Store)
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_QUERIES.map(sq => (
                  <button
                    key={sq.label}
                    onClick={() => handleRunQuery(sq.sql)}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition-colors"
                  >
                    {sq.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <textarea
                value={sqlQuery}
                onChange={e => setSqlQuery(e.target.value)}
                rows={3}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-3 font-mono text-xs text-emerald-300 focus:outline-none focus:border-emerald-400"
                placeholder="SELECT * FROM products WHERE stock < 20 ORDER BY price_zar DESC"
              />
              <button
                onClick={() => handleRunQuery()}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg text-xs transition-colors shrink-0"
              >
                ▶ Execute SQL
              </button>
            </div>
          </div>

          {/* SQL Results Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">
                Query Output ({queryResult.rowCount} rows)
              </span>
              <span className="text-xs font-mono text-slate-400">
                Executed in {queryResult.executionTimeMs} ms
              </span>
            </div>

            {queryResult.error ? (
              <div className="p-6 text-sm text-red-600 font-mono bg-red-50/50">{queryResult.error}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {queryResult.columns.map(col => (
                        <th key={col} className="text-left px-4 py-2.5 text-xs font-mono font-semibold text-slate-600 uppercase">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {queryResult.rows.map((row, idx) => (
                      <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/60">
                        {queryResult.columns.map(col => (
                          <td key={col} className="px-4 py-2.5 text-xs font-mono text-slate-700">
                            {typeof row[col] === 'number' && col.endsWith('_zar')
                              ? `R ${row[col].toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`
                              : String(row[col] ?? '-')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: NEXT.JS + SQL SCHEMA */}
      {activeTab === 'nextjs' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">PostgreSQL / SQLite DDL Schema</h3>
              <button
                onClick={handleDownloadSQL}
                className="text-xs text-emerald-600 font-semibold hover:underline"
              >
                Download .sql
              </button>
            </div>
            <pre className="p-4 bg-slate-950 text-emerald-300 font-mono text-xs overflow-x-auto max-h-[460px]">
              {generateSQLSchema()}
            </pre>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Next.js App Router SQL API Route (`app/api/db/route.ts`)</h3>
              <span className="text-xs text-slate-400">Next.js 15 + SQL Ready</span>
            </div>
            <pre className="p-4 bg-slate-950 text-sky-300 font-mono text-xs overflow-x-auto max-h-[460px]">{`// app/api/db/route.ts - Next.js App Router SQL Endpoint
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const table = searchParams.get('table') || 'products';
  const allowed = [
    'products', 'customers', 'transactions', 'accounts',
    'journal_entries', 'shifts', 'employees', 'payroll_runs'
  ];
  if (!allowed.includes(table)) {
    return NextResponse.json({ error: 'Invalid table' }, { status: 400 });
  }
  const result = await pool.query(\`SELECT * FROM \${table} LIMIT 500\`);
  return NextResponse.json({
    currency: 'ZAR',
    rowCount: result.rowCount,
    rows: result.rows,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  // Automated transactional SQL backup & POS sync
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query(body.sql, body.params || []);
    await client.query('COMMIT');
    return NextResponse.json({ ok: true, rows: res.rows });
  } catch (err: any) {
    await client.query('ROLLBACK');
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    client.release();
  }
}`}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
