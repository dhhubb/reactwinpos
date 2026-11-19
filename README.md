# Afritecx Badboy POS

A South African point-of-sale and accounting desktop application. React 19 +
Vite 7 + Tailwind 4, packaged for Windows with Electron. Prices in ZAR, VAT at
15%, PAYE and UIF per SARS tables.

## Quick start

```bash
npm install
npm run dev        # browser at http://localhost:5173
```

Sign in with any demo account shown on the login screen (`admin` / `admin123`).

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Production build into `dist/` |
| `npm test` | Test suite (50 tests) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run verify` | typecheck + tests + build |
| `npm run desktop:dev` | Build, then run in an Electron window |
| `npm run desktop:win` | Windows installer + portable `.exe` into `release/` |
| `npm run db:seed` | Generate a real IndexedDB test dataset into `.testdata/` |

## What this application does

- **Point of Sale** — barcode and tile entry, per-line VAT, cash/card/credit,
  stock guard, printable receipt.
- **Accounting** — double-entry journal, chart of accounts, trial balance that
  balances to the cent.
- **Invoicing, customers, products** — full CRUD with inventory levels.
- **Reports** — revenue, COGS, gross margin, product rankings, monthly
  breakdown, all excluding voided sales.
- **Shifts and cash-up** — ZAR denomination count, expected vs actual cash.
- **Payroll** — PAYE, UIF and payslips per SARS tables.
- **Backup and restore** — `.sql` and `.json` exports, validated restores.
- **Users and access** — four roles, hashed passwords, login throttling.

## Data storage

The app runs fully offline. All data lives in the browser's or Electron's
IndexedDB, scoped per OS user profile, and is persisted on every change.

An optional relational database can be attached by copying `.env.example` to
`.env` and filling in the `VITE_DB_*` fields. Unfilled placeholders are detected
and reported rather than failing silently. See `.env.example` for each field.

## Building for Windows

See [BUILD-WINDOWS.md](BUILD-WINDOWS.md). The Windows installer must be built on
Windows because electron-builder needs the NSIS toolchain.

## Test data

`testdata/afritecx_testdata_backup.json` is a generated dataset — 12 products,
6 customers, 10 transactions, 16 accounts, balanced trial balance, 4 users. Load
it through *SQL DB & Backup → restore*.

## Documentation

- [CHANGES.md](CHANGES.md) — what was fixed and why
- [BUILD-WINDOWS.md](BUILD-WINDOWS.md) — packaging, database setup, pre-ship checks

## Security notes

- Passwords are stored as salted SHA-256 hashes, never plain text.
- Login locks out for 30 seconds after 5 failed attempts.
- Restores are validated and refuse a file that would leave no active
  administrator.
- The Electron renderer runs with `contextIsolation`, `sandbox` and no Node
  integration.

The four demo accounts ship with publicly documented passwords. Change them
before going live — the Users screen shows which accounts still hold plain text
and migrates them on first sign-in.
