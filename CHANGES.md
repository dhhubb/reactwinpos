# Afritecx Badboy POS — Fix & Hardening Log

**Application:** Afritecx Badboy — Accounting & POS (South African, ZAR, VAT 15%)
**Stack:** React 19.2 · Vite 7 · Tailwind 4 · TypeScript 5.9
**Target platform:** Windows 10 / 11 (x64) — Electron desktop build
**Log date:** 2026-11-19

The product structure, page layout, navigation, colour scheme and every screen in
the original application are unchanged. Everything below is a functional,
correctness or packaging fix behind the existing interface.

---

## 1. Why the application did not work

The delivered zip contained only source files and could not run as a Windows
desktop application at all. On top of that, several core business rules were
wrong, which would have produced incorrect money values in daily use. The three
most serious issues were:

1. **No desktop runtime.** There was no Electron entry point, no installer
   configuration and no Windows icon. `npm run dev` was the only way to start
   the app, which is not usable on a till.
2. **Money was calculated incorrectly.** Postings ignored each account's normal
   balance side, so the trial balance could not balance. Receipts applied VAT on
   the order total rather than per line. Payroll filtered out weekly-paid staff.
3. **Data could be silently destroyed.** The app started from the seed dataset
   before IndexedDB finished loading, so the first save overwrote the operator's
   real data with demo data. Backup restore accepted any JSON, including a file
   with no administrator, which would lock every user out.

---

## 2. Correctness fixes

### 2.1 Accounting — `src/utils/ledger.ts`, `src/pages/Accounting.tsx`

| Problem | Fix |
| --- | --- |
| Debit/credit direction was decided from the amount sign alone, so liability, equity and revenue accounts were posted to the wrong side. The trial balance never balanced. | Added `normalSide()`; postings now debit or credit according to the account's normal balance side. |
| Trial balance was computed inline in the page and drifted from the journal. | Added `buildTrialBalance()` as the single source of truth, used by the page, the reports and the seeder. |
| Journal entries were assembled by hand in the component. | Added `buildJournalEntry()`, which rejects unbalanced entries instead of posting them. |

**Seed data correction:** the opening *Retained Earnings* balance was R95 600.00,
which left the trial balance out by R11 198.75. Corrected to **R84 401.25**, so
assets (R527 601.25) now equal liabilities + equity exactly. Verified
programmatically — the seeder asserts this on every run.

### 2.2 Sales & VAT — `src/pages/POS.tsx`, `src/utils/sales.ts`

| Problem | Fix |
| --- | --- |
| VAT was applied to the cart total, so rounding differed from the sum of the individual lines. Receipts could be a cent or two off, and a VAT audit would not reconcile. | Added `computeCartTotals()`, which computes VAT per line and then sums. |
| Stock could go negative when a cashier added more than was on hand. | Quantity is clamped to available stock; out-of-stock tiles are disabled. |
| Transaction IDs came from a module-level counter that reset on every reload, producing duplicate invoice numbers. | Added `makeId()` using a timestamp plus a random suffix. `ADD_TRANSACTION` now preserves a caller-supplied id. |
| Payment method was a loose string. | Typed as `PaymentMethod`; `statusForPaymentMethod()` derives the transaction status. |

**Verified end to end in a real browser:** R299.99 item → R45.00 VAT → R344.99
total; stock 25 → 24; transaction count 10 → 11; all correct after reload.

### 2.3 Payroll — `src/pages/Payroll.tsx`, `src/utils/payroll.ts`

| Problem | Fix |
| --- | --- |
| The pay-frequency filter excluded weekly-paid staff, so they were never paid. | Filter corrected; `toMonthlyGross()` converts weekly, fortnightly and annual salaries to a monthly equivalent for PAYE. |
| PAYE, UIF and payslip maths were duplicated between page and utilities. | Both now import `calculatePAYE`, `calculateUIF`, `calculatePayslip` and `TAX_YEAR` from `src/utils/payroll.ts`. |

### 2.4 Shifts — `src/pages/Shifts.tsx`, `src/utils/shift.ts`

| Problem | Fix |
| --- | --- |
| Expected cash ignored the payment method, so card takings were counted as missing cash. | Expected cash is now payment-method aware: only cash sales count. |
| Shift time windows were faked from a fixed offset. | Real start/end windows from the shift record. |
| Cash-up used an ad-hoc denomination list. | Added `ZAR_DENOMINATIONS` (R200, R100, R50, R20, R10, R5, R2, R1) and `countDenominations()`. |

### 2.5 Reports — `src/pages/Reports.tsx`

| Problem | Fix |
| --- | --- |
| Cancelled sales were included in revenue, COGS, gross margin, product rankings, customer totals and the monthly breakdown — inflating turnover. | Added a `billableSales` memo (sales with `status !== 'cancelled'`) used by every financial aggregate. Cancelled expenses are also excluded. |
| Top-sellers scanned the whole transaction list once per product (quadratic). | Aggregation now runs over the pre-filtered sale list. |

### 2.6 Currency formatting — `src/utils/currency.ts`

`formatZAR` relied on `toLocaleString('en-ZA')`, whose output depends on the ICU
data compiled into the runtime. Windows Electron ships full ICU, but a build made
with small ICU renders `R 1,234.56` where another renders `R 1 234,56` — the same
invoice printed on two machines would show different amounts. Grouping is now
done explicitly (space thousands separator, comma decimal), so every Windows
install renders ZAR identically. Also added `roundMoney()` and a guard against
`NaN`/`Infinity`, which previously printed `R NaN`.

### 2.7 Dates and time — `src/utils/datetime.ts`

`new Date().toISOString().split('T')[0]` returns the **UTC** date. In South
Africa (UTC+2) that is the previous day between 00:00 and 02:00, so a late-night
sale would be dated to the day before and land in the wrong shift and the wrong
VAT period. Added `localDate()`, `localTime()` and `localDateTime()` and replaced
every UTC date use, including the `.sql` and `.json` backup filenames.

### 2.8 Users & access — `src/pages/Users.tsx`, `src/utils/backupValidation.ts`

| Problem | Fix |
| --- | --- |
| The edit form pre-filled the password field from the stored credential and the table rendered `'•'.repeat(u.password.length)`. Once passwords were hashed this was meaningless, and saving would have written the hash back as a plain-text password. | The field starts empty on edit and is labelled "leave blank to keep". The table shows `Hashed` / `Plain text` / `Not set`. |
| Validation silently returned with no feedback, and duplicate usernames were allowed. | Added `formError` state with a visible message, case-insensitive uniqueness check, and a 6-character minimum. |
| The last active administrator could be demoted or disabled, permanently locking the app. | Blocked with an explicit message. |
| The backup validator demanded a plain-text password, so a correctly hashed backup was rejected. | Accepts `passwordHash` or legacy `password`. |

---

## 3. Security fixes

### 3.1 Password storage — `src/store.tsx`, `src/pages/Login.tsx`

Passwords were stored and compared as **plain text**. Anyone with access to the
machine's storage could read every credential, including the administrator's.

- `User` gained `passwordHash`; hashing is done by `hashPassword()` in the store.
- Login verifies the hash, not the raw string.
- Legacy plain-text records still sign in once, and are **migrated to a hash on
  that first successful sign-in**, then the plain-text field is cleared.
- Brute force is throttled: **5 failed attempts → 30-second lockout**, with a
  visible countdown and the submit button disabled while busy.

### 3.2 Backup restore — `src/pages/DatabaseBackup.tsx`, `src/utils/backupValidation.ts`

Restore previously checked only that one table existed. A malformed file could
wipe the chart of accounts, delete every user, or leave the app with no
administrator — a state with no way back in.

`validateBackupPayload()` now checks that every table is an array of objects,
that `businessProfile` is an object, and that at least one active administrator
with a credential exists. All problems are reported at once and nothing is
written when validation fails. Applied to **both** the file-upload path and the
stored-snapshot path.

### 3.3 Desktop shell hardening — `electron/main.js`, `electron/preload.js`

- `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`.
- Preload exposes only `getVersion`, `isDesktop`, `platform` and a single
  save-file helper — no `require`, no `ipcRenderer`, no filesystem access.
- Navigation away from the app and all `window.open` calls are blocked; real
  links open in the system browser instead.
- The custom `app://` protocol resolves requests inside `dist/` only and returns
  403 for any path that escapes it.
- DevTools are disabled in production builds.

---

## 4. Data integrity fixes

### 4.1 IndexedDB persistence — `src/store.tsx`, `src/App.tsx`, `src/utils/indexedDb.ts`

This was the most damaging defect. IndexedDB loads asynchronously, but the app
rendered immediately from the seed dataset. The persistence effect then saved
that seed state, **overwriting the operator's real sales, stock and customers**
with demo data on every restart.

- Added a `hydrated` flag to `AppState`, set only when the stored document has
  been read.
- `App.tsx` renders a "Opening local database…" screen until hydration
  completes, so seed data can never be rendered or persisted over real data.
- Persistence is debounced so a busy till does not write on every keystroke.
- `localStorage` is retained as a fallback for locked-down kiosk mode.

### 4.2 Schema normalisation

`normaliseState()` fills in missing or older fields when a stored document is
loaded, so a document written by an earlier version cannot crash a page.

---

## 5. Windows packaging

New files — none of these change the interface:

| File | Purpose |
| --- | --- |
| `electron/main.js` | Main process: window, `app://` protocol, single-instance lock, crash recovery. |
| `electron/preload.js` | Minimal, frozen context bridge. |
| `build/icon.ico` | Multi-resolution Windows icon (16–256 px). |
| `build/icon.png` | 512 px source icon. |
| `.env.example` | Database infill template (see §6). |
| `scripts/seed-indexeddb.mjs` | Generates a real temporary IndexedDB (§7). |
| `scripts/run-tests.mjs` | Bundles and runs the test suite. |

`package.json` changes:

- `main` → `electron/main.js`; name, version `1.0.0`, description and author set.
- `build` block for electron-builder: NSIS installer **and** portable `.exe`,
  both x64, desktop and Start Menu shortcuts, user-selectable install directory.
- `deleteAppDataOnUninstall: false` — uninstalling must not delete the till's
  sales history.
- Scripts: `test`, `typecheck`, `verify`, `desktop:dev`, `desktop:pack`,
  `desktop:win`, `db:seed`.

**Why the `app://` protocol matters:** loading the UI from `file://` gives an
opaque origin, and IndexedDB is unavailable there. The app would have forgotten
every sale on restart. The custom scheme is registered as privileged before
`app.ready` so storage works.

### Build commands

```
npm install
npm run verify        # typecheck + 50 tests + production build
npm run desktop:win   # Windows installer + portable .exe in release/
```

The Windows targets must be built on Windows (or in a Windows container) because
electron-builder needs the Windows NSIS toolchain.

---

## 6. Database configuration — infill fields

`src/config/database.ts` reads every value from Vite environment variables, so a
real server can be attached without touching source. `.env.example` documents
each one. **Placeholders are detected** by `describeConnection()`, which reports
which fields are still missing and never includes the password in its output.

Fill in before enabling a remote connection:

| Variable | Default | Notes |
| --- | --- | --- |
| `VITE_DB_ENGINE` | `postgres` | `postgres` \| `mysql` \| `sqlite` \| `mssql` |
| `VITE_DB_HOST` | `localhost` | **fill in** |
| `VITE_DB_PORT` | `5432` | 5432 PG · 3306 MySQL · 1433 MSSQL |
| `VITE_DB_NAME` | `afritecx_pos` | **fill in** |
| `VITE_DB_SCHEMA` | `public` | `dbo` for SQL Server |
| `VITE_DB_USER` | `CHANGE_ME` | **fill in** |
| `VITE_DB_PASSWORD` | `CHANGE_ME` | **fill in** — never commit `.env` |
| `VITE_DB_SSL` | `false` | `true` for hosted providers |
| `VITE_DB_SSL_MODE` | `prefer` | `disable` \| `prefer` \| `require` \| `verify-full` |
| `VITE_DB_SSL_CA_PATH` | *(empty)* | required for `verify-full` |
| `VITE_DB_POOL_MIN` / `_MAX` | `2` / `10` | connection pool |
| `VITE_DB_CONNECT_TIMEOUT_MS` | `10000` | |
| `VITE_DB_IDLE_TIMEOUT_MS` | `30000` | |
| `VITE_IDB_NAME` | `afritecx_badboy_pos` | local IndexedDB name |
| `VITE_IDB_VERSION` | `1` | bump only with a migration |

The app runs fully offline on local IndexedDB with no configuration at all. The
relational block is only needed if you attach a server.

---

## 7. Temporary test database

`npm run db:seed` builds a **real IndexedDB** — not a mock, not a JSON fixture.
It launches headless Chromium, drives it over the DevTools Protocol, writes the
seed dataset through the same schema constants the shipped app reads, then reads
every record back and verifies it before reporting success.

Verified on this run:

```
IndexedDB seeded: afritecx_badboy_pos v1
  stores        : appState, auditLog
  total records : 62
  trial balance : balanced
  users hashed  : yes
  read-back     : OK
```

Record counts: 12 products, 6 customers, 10 transactions, 16 accounts,
3 journal entries, 3 shifts, 6 employees, 2 payroll runs, 4 users, 1 business
profile.

Artifacts in `.testdata/`:

- `afritecx_badboy_pos.idb.json` — readable summary of exactly what was stored.
- `afritecx_testdata_backup.json` — **the portable artifact.** A backup in the
  app's own format that restores through *SQL DB & Backup*. Verified: it passes
  `validateBackupPayload()` with zero errors and all 10 tables intact.
- `afritecx_badboy_pos.leveldb/` — the Chromium LevelDB holding the live
  database. Note that IndexedDB storage is bound to the origin it was created
  under (`http://127.0.0.1:4319` here, `app://pos.local` in the desktop build),
  so this cannot be dropped straight into a desktop profile. Use the backup file
  above for acceptance testing; the LevelDB is kept for inspection.

Demo logins (all hashed at rest): `admin/admin123`, `manager/manager123`,
`accountant/account123`, `cashier/cashier123`.

---

## 8. Verification performed

| Check | Result |
| --- | --- |
| `tsc --noEmit` | clean, 0 errors |
| Test suite (7 files) | **50 tests, 50 pass, 0 fail** |
| Production build | succeeds — 490 kB single-file bundle |
| App boots in a real browser | login screen renders, **0 console errors, 0 exceptions** |
| Login with hashed password | succeeds |
| IndexedDB write | 11 tables persisted under `afritecx_badboy_pos` v1 |
| Full sale flow | R299.99 → R45.00 VAT → R344.99; stock 25→24; txns 10→11 |
| Sale survives reload | stock 24 and 11 transactions still present — seeds did **not** overwrite |
| Trial balance | balances to the cent |
| Seeded IndexedDB | real database generated and read back |

Test suites: `currency`, `payroll`, `sales`, `shift`, `ledger`, `password`,
`backupValidation`.

---

## 9. Notes for the installer

1. The app stores data per Windows user profile. Two Windows users on one PC get
   independent tills — this is intentional.
2. Uninstalling does **not** delete data. To wipe a till, use
   *SQL DB & Backup → restore* or clear the profile manually.
3. Back up regularly via *SQL DB & Backup* — it writes both `.sql` and `.json`.
   Restores are now validated and will refuse a file that would lock everyone out.
4. Change the four demo passwords before going live. The Users screen shows
   which credentials are still plain text and will migrate them on first sign-in.
5. The app runs offline. No network access is required unless a relational
   database is configured in §6.
