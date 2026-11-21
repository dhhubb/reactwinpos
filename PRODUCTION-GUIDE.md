# From VS Code to Production

A complete walkthrough for taking this project from a fresh clone to a signed,
installed application on a shop's Windows till. Written for someone who has not
built this project before.

Follow the sections in order. Each one ends with something you can check, so you
know it worked before moving on.

**Contents**

1. [Install the tools](#1-install-the-tools)
2. [Open the project in VS Code](#2-open-the-project-in-vs-code)
3. [First run](#3-first-run)
4. [Get productive in VS Code](#4-get-productive-in-vs-code)
5. [Make and test a change](#5-make-and-test-a-change)
6. [Configure the database (optional)](#6-configure-the-database-optional)
7. [Build for production](#7-build-for-production)
8. [Build the Windows installer](#8-build-the-windows-installer)
9. [Sign the installer](#9-sign-the-installer)
10. [Test before you ship](#10-test-before-you-ship)
11. [Deploy to the shop](#11-deploy-to-the-shop)
12. [Set up updates and backups](#12-set-up-updates-and-backups)
13. [Ship a new version](#13-ship-a-new-version)
14. [Troubleshooting](#14-troubleshooting)

---

## 1. Install the tools

You need three things. Install them in this order.

### Node.js 20 LTS or newer

Download from <https://nodejs.org>. Choose the **LTS** button, not "Current".

During setup, leave *"Add to PATH"* checked.

Check it worked — open a terminal (PowerShell on Windows) and run:

```bash
node -v
npm -v
```

You should see something like `v20.x.x` and `10.x.x`. If you see "command not
found", close and reopen the terminal, or reinstall with PATH enabled.

> **Why 20 or newer:** Vite 7 and Electron 33 require it. Node 18 will fail with
> confusing errors during `npm install`.

### Git

Download from <https://git-scm.com/downloads>. Accept the defaults.

```bash
git --version
```

### VS Code

Download from <https://code.visualstudio.com>.

Once installed, add these extensions (press `Ctrl+Shift+X`, search, click Install):

| Extension | What it does |
| --- | --- |
| **ESLint** | Flags mistakes as you type |
| **Tailwind CSS IntelliSense** | Autocompletes Tailwind classes |
| **Prettier** | Formats code on save |
| **GitLens** | Shows who changed each line |
| **Error Lens** | Puts error messages inline, next to the code |

---

## 2. Open the project in VS Code

Open a terminal and clone the repository:

```bash
cd C:\Users\YourName\Documents
git clone https://github.com/dhhubb/reactwinpos.git
cd reactwinpos
code .
```

`code .` opens the folder in VS Code. If it says "command not found", open
VS Code, press `Ctrl+Shift+P`, type *Shell Command: Install 'code' command in
PATH*, press Enter, then try again.

### What you are looking at

```
reactwinpos/
├── electron/          Desktop shell (main process + preload bridge)
│   ├── main.js        Creates the window, serves the app
│   └── preload.js     The only bridge between UI and OS
├── src/               The application
│   ├── pages/         One file per screen
│   ├── components/    Shared UI pieces
│   ├── utils/         Business logic (money, tax, payroll, dates)
│   ├── config/        Database and storage configuration
│   ├── __tests__/     Test suite
│   ├── store.tsx      Central state and persistence
│   └── App.tsx        Routes between screens
├── scripts/
│   ├── run-tests.mjs          Test runner
│   └── seed-indexeddb.mjs     Generates test data
├── build/             App icons
├── testdata/          Ready-made test dataset
├── .env.example       Database template
├── package.json       Dependencies and build config
└── vite.config.ts     Build settings
```

> **Important:** this project is a **single-page desktop app**, not a website.
> The UI is bundled into one `dist/index.html` file. There is no server, no
> `npm start` web host, and no URL to visit in production. It runs offline in an
> Electron window.

---

## 3. First run

Install dependencies. This downloads about 500 packages and takes one to three
minutes:

```bash
npm install
```

> **If it fails on Electron download:** corporate networks and antivirus often
> block it. Set a mirror and retry:
>
> ```bash
> set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
> npm install
> ```

Now start it:

```bash
npm run dev
```

Open <http://localhost:5173> in your browser. You should see the login screen.

Sign in with **`admin`** / **`admin123`**.

### Check that it worked

- The dashboard shows revenue cards and a recent-sales table
- Amounts read like `R 3 334,99` (space for thousands, comma for decimals)
- The sidebar lists 12 screens

Press `Ctrl+C` in the terminal to stop the dev server.

> **Data is per browser profile.** Sales you ring up in dev mode are stored in
> that browser's IndexedDB, not in a file you can inspect. Chrome DevTools →
> Application → IndexedDB → `afritecx_badboy_pos` shows the raw records.

---

## 4. Get productive in VS Code

### Run the desktop app while you work

`npm run dev` gives you a browser tab. To see the real desktop window:

```bash
npm run desktop:dev
```

This builds the bundle and opens it in an Electron window. Use this when testing
anything that depends on the desktop shell — file save dialogs, the app menu, or
window behaviour.

### Useful commands

| Command | When to use it |
| --- | --- |
| `npm run dev` | Everyday coding — fastest reload |
| `npm run typecheck` | After changing types, before committing |
| `npm test` | After changing business logic |
| `npm run verify` | Before every commit — runs all three checks |
| `npm run desktop:dev` | When testing desktop-specific behaviour |

### Debug the UI

With `npm run dev` running, press `F12` in the browser for DevTools.

- **Console** — JavaScript errors
- **Application → IndexedDB** — the actual stored data
- **Application → Clear storage** — reset to a clean state

### Debug the Electron shell

In `npm run desktop:dev`, DevTools opens automatically in development. The main
process log appears in the terminal.

### Recommended VS Code settings

Press `Ctrl+,`, search for *Format On Save*, and tick it. Then create a file
called `.vscode/settings.json` in the project root:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "files.eol": "\n",
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/release": true
  }
}
```

> **`files.eol: "\n"`** matters on Windows. Without it, saving a file can convert
> every line ending and produce a diff touching the whole file.

---

## 5. Make and test a change

Always work on a branch, never directly on `main`:

```bash
git checkout -b fix-something
```

### Where things live

| To change... | Edit |
| --- | --- |
| A screen's layout | `src/pages/<Screen>.tsx` |
| Money formatting | `src/utils/currency.ts` |
| VAT or cart maths | `src/utils/sales.ts` |
| Accounting postings | `src/utils/ledger.ts` |
| PAYE / UIF | `src/utils/payroll.ts` |
| Dates | `src/utils/datetime.ts` |
| Storage behaviour | `src/store.tsx`, `src/config/database.ts` |
| Desktop window | `electron/main.js` |

### The loop

1. Edit the file. The browser reloads automatically.
2. If you changed business logic, add or update a test in `src/__tests__/`.
3. Run the checks:

```bash
npm run verify
```

This runs three things in sequence. All three must pass:

| Step | What it catches |
| --- | --- |
| `typecheck` | Type errors |
| `test` | Wrong calculations (50 tests) |
| `build` | Anything that breaks packaging |

4. Commit and push:

```bash
git add -A
git commit -m "Fix shift cash-up rounding"
git push -u origin fix-something
```

5. Open a pull request on GitHub and merge it once the checks pass.

> **Never commit `.env`.** It holds database passwords. It is already in
> `.gitignore`; keep it that way.

---

## 6. Configure the database (optional)

**Skip this section if the shop runs offline.** The app is fully functional with
local IndexedDB and needs no configuration at all.

Configure a database only if several tills must share stock and sales, or if
head office needs to query the data directly.

### Steps

1. Copy the template:

```bash
copy .env.example .env
```

2. Open `.env` in VS Code and fill in the real values:

```ini
VITE_DB_ENGINE=postgres
VITE_DB_HOST=db.yourcompany.co.za
VITE_DB_PORT=5432
VITE_DB_NAME=afritecx_pos
VITE_DB_SCHEMA=public
VITE_DB_USER=pos_app
VITE_DB_PASSWORD=the-real-password
VITE_DB_SSL=true
VITE_DB_SSL_MODE=verify-full
VITE_DB_SSL_CA_PATH=C:\certs\ca.pem
```

3. Restart `npm run dev` — Vite only reads `.env` at startup.

### Field reference

| Variable | Default | Notes |
| --- | --- | --- |
| `VITE_DB_ENGINE` | `postgres` | `postgres`, `mysql`, `sqlite`, `mssql` |
| `VITE_DB_HOST` | `localhost` | Server hostname |
| `VITE_DB_PORT` | `5432` | 5432 Postgres · 3306 MySQL · 1433 SQL Server |
| `VITE_DB_NAME` | `afritecx_pos` | Database name |
| `VITE_DB_SCHEMA` | `public` | `dbo` for SQL Server |
| `VITE_DB_USER` | `CHANGE_ME` | **Must be changed** |
| `VITE_DB_PASSWORD` | `CHANGE_ME` | **Must be changed** |
| `VITE_DB_SSL` | `false` | `true` for any hosted provider |
| `VITE_DB_SSL_MODE` | `prefer` | `disable`, `prefer`, `require`, `verify-full` |
| `VITE_DB_SSL_CA_PATH` | *(empty)* | Required for `verify-full` |
| `VITE_DB_POOL_MIN` / `_MAX` | `2` / `10` | Connections kept open |
| `VITE_DB_CONNECT_TIMEOUT_MS` | `10000` | Give up after this |
| `VITE_IDB_NAME` | `afritecx_badboy_pos` | Local storage name |
| `VITE_IDB_VERSION` | `1` | Bump only with a migration |

### A security warning you must not skip

Vite **inlines every `VITE_` variable into the JavaScript bundle**. Anyone who
has the `.exe` can extract them.

That means:

- A database password in `.env` is **readable by anyone with the installer**
- Never use a database account with more rights than the app needs
- Never point a production build at a database over the open internet without
  TLS

For a multi-till shop, the safer pattern is a small API server that holds the
credentials, with the app talking to that instead. Treat the direct-database
setup as suitable for a trusted local network only.

> **`CHANGE_ME` is detected.** The app reports unfilled placeholders in the UI
> rather than failing silently, so you cannot ship a build with a placeholder
> password and not notice.

---

## 7. Build for production

```bash
npm run build
```

Output is `dist/index.html` — a single self-contained file of roughly 490 kB
holding all HTML, CSS and JavaScript.

### Check it worked

```bash
dir dist
```

You should see exactly one file, `index.html`, around 490 kB. If you see dozens
of files, `vite-plugin-singlefile` is not active — check `vite.config.ts`.

### Preview the production build

```bash
npm run preview
```

This serves `dist/` on <http://localhost:4173>. Test here, not in `npm run dev`,
because this is the code that ships.

> **Always run `npm run verify` before building.** `npm run build` will happily
> package broken code if the tests were never run.

---

## 8. Build the Windows installer

> **This must be done on Windows.** `electron-builder` needs the Windows NSIS
> toolchain. It cannot produce a Windows installer from macOS or Linux without
> Docker and extra setup.

### Build both targets

```bash
npm run desktop:win
```

This builds the bundle, then packages two artifacts. It takes 3–10 minutes the
first time because it downloads the Electron binaries.

Output lands in `release\`:

| File | What it is |
| --- | --- |
| `AfritecxBadboyPOS-Setup-1.0.0-x64.exe` | Installer — Start Menu and desktop shortcuts |
| `AfritecxBadboyPOS-Portable-1.0.0-x64.exe` | Single file, no install — runs from a USB stick |

### Verify the artifacts exist

```bash
dir release\*.exe
```

You should see **two** `.exe` files with different names.

> **This was a real bug, now fixed.** Both targets previously used the same
> filename, so the portable build silently overwrote the installer and you would
> ship only one of them without any error. If you ever see a single `.exe` here,
> the naming config has regressed.

### Installer behaviour

Configured in `package.json`:

- Lets the user choose the install folder
- Creates desktop and Start Menu shortcuts
- Installs per-user, so no admin rights needed
- **Does not delete data on uninstall** — a shop's sales history survives a
  reinstall

### If the build fails

| Error | Fix |
| --- | --- |
| `cannot execute 7za` | Antivirus blocking. Exclude `release\` and `%LOCALAPPDATA%\electron-builder` |
| `Cannot find module 'electron'` | Run `npm install` again |
| `ENOSPC` | Not enough disk. Needs ~2 GB free |
| Download timeout | Set `ELECTRON_MIRROR` (see §3) and retry |

---

## 9. Sign the installer

**Do not skip this for a real deployment.** An unsigned installer triggers
Windows SmartScreen: *"Windows protected your PC"*. Staff will click through the
warning, which trains them to ignore security prompts — exactly the habit you do
not want at a till.

### Get a certificate

You need a **code signing certificate**. Options:

- **OV certificate** (~R4 000/year) — SmartScreen reputation builds up over weeks
- **EV certificate** (~R9 000/year) — instant SmartScreen trust, hardware token required

Buy from Sectigo, DigiCert, or a South African reseller.

### Sign during the build

Set two environment variables before running the build:

```bash
set CSC_LINK=C:\certs\your-certificate.pfx
set CSC_KEY_PASSWORD=your-certificate-password
npm run desktop:win
```

`electron-builder` picks these up automatically and signs both artifacts.

### Verify the signature

```bash
signtool verify /pa /v release\AfritecxBadboyPOS-Setup-1.0.0-x64.exe
```

Look for `Successfully verified`.

> **Never commit the `.pfx` file or its password.** Keep the certificate outside
> the repository and back it up — losing it means buying a new one.

---

## 10. Test before you ship

Run this checklist on a **clean Windows machine**, not the one you built on. A
build machine has Node and caches that hide missing dependencies.

### The eight-point acceptance test

| # | Step | Expected |
| --- | --- | --- |
| 1 | Install, launch from Start Menu | Window opens, login screen appears |
| 2 | Sign in `admin` / `admin123` | Dashboard loads with data |
| 3 | Point of Sale → add an item → **Pay** | VAT is 15%, total is correct, receipt shows |
| 4 | Close the app completely, reopen | The sale is still there; stock still reduced |
| 5 | SQL DB & Backup → download `.json` | File saves to disk |
| 6 | Users & Access → change admin password → sign out → sign in | New password works |
| 7 | Restore the backup from step 5 | Accepted, data returns |
| 8 | Rename a text file to `.json` and restore it | **Rejected** with a readable error |

**Step 4 is the most important.** It proves IndexedDB persistence works on the
`app://` origin. If the sale vanishes, the protocol registration in
`electron/main.js` is broken and the app will lose data in production.

**Step 8** proves restore validation. A malformed restore that wipes the
administrator account would lock the shop out of its own system permanently.

### Load the test dataset

`testdata/afritecx_testdata_backup.json` contains a complete balanced dataset:
12 products, 6 customers, 10 transactions, 16 accounts, 4 users. Load it through
**SQL DB & Backup → restore** to demo the app with realistic data.

---

## 11. Deploy to the shop

### Single till

1. Copy `AfritecxBadboyPOS-Setup-1.0.0-x64.exe` to the till (USB or network share)
2. Run it, choose the install folder, finish
3. Launch from the desktop shortcut
4. Sign in and **change all four demo passwords immediately**

### Multiple tills

Each Windows user profile gets its own independent database. Two tills on the
same PC do **not** share data, and two separate PCs certainly do not.

If tills must share stock and sales, you need the database configuration from §6
— and read the security warning there first.

### Before handing over

- [ ] All four demo passwords changed (`admin`, `manager`, `cashier`, `accountant`)
- [ ] Business name, VAT number and address set in **Industry Customizer**
- [ ] Real product list loaded in **Products & Inventory**
- [ ] Receipt printer tested
- [ ] Cash-up denominations verified in **Shifts & Cash**
- [ ] First backup taken and stored off the machine
- [ ] Staff shown how to ring a sale and do a cash-up

### Where the data lives

```
%APPDATA%\Afritecx Badboy POS\
```

Back this folder up. Deleting it erases every sale.

**Confirm the exact folder before you script any backup.** The name comes from
`productName` in `package.json`. Paste this into PowerShell on the till after the
first launch:

```powershell
dir "$env:APPDATA" | Where-Object { $_.Name -like "*Afritecx*" }
```

Whatever it prints is the folder to back up. Use that literal name in your
`robocopy` arguments rather than trusting this document.

> **This was a real bug, now fixed.** `productName` originally existed only under
> `build`, not at the top level. Electron's `app.getName()` reads the top-level
> field, so it fell back to the package slug and the data landed in
> `%APPDATA%\afritecx-badboy-pos` instead. A backup script pointed at the wrong
> folder fails silently — it copies nothing and reports success. Both fields are
> now set. If you build from a branch older than this fix, expect the slug path.

> **Uninstalling does not delete this folder** — that is deliberate. It means a
> reinstall recovers the shop's history.

---

## 12. Set up updates and backups

### Backups — do this first

The app has no automatic cloud backup. Someone must click **SQL DB & Backup** and
download a file.

**Set a daily routine:**

1. At close, go to **SQL DB & Backup**
2. Download **both** the `.json` and the `.sql`
3. Copy to a USB drive or cloud folder
4. Keep at least 30 days

> **The `.json` is the one that restores into the app.** The `.sql` is for
> importing into a database server. Keep both, but know which is which.

### Automatic backups (optional)

Windows Task Scheduler can copy the data folder nightly:

1. Open Task Scheduler → **Create Basic Task**
2. Trigger: Daily, 22:00
3. Action: Start a program
4. Program: `robocopy`
5. Arguments:

```
"%APPDATA%\Afritecx Badboy POS" "D:\Backups\POS\%date:~-4%-%date:~3,2%-%date:~0,2%" /MIR
```

This mirrors the data folder to `D:\Backups\POS\<date>` every night. Test it by
running the task manually and checking the folder appears.

> **Mirroring is not archiving.** `/MIR` makes the destination match the source
> exactly, including deletions. Use dated folders, as above, so each night is a
> separate copy.

### Updates

There is no auto-updater. To ship a new version:

1. Bump `version` in `package.json`
2. Build and sign (§8, §9)
3. Send the new installer to the shop
4. They run it over the old install

**Data survives an upgrade** because it lives in `%APPDATA%`, not the install
folder. Still take a backup first.

---

## 13. Ship a new version

The full cycle, condensed:

```bash
# 1. Start from a clean, up-to-date main
git checkout main
git pull

# 2. Branch
git checkout -b release-1.1.0

# 3. Bump the version in package.json
#    "version": "1.0.0"  ->  "1.1.0"

# 4. Verify everything
npm run verify

# 5. Build and sign
set CSC_LINK=C:\certs\your-certificate.pfx
set CSC_KEY_PASSWORD=your-certificate-password
npm run desktop:win

# 6. Run the 8-point acceptance test (§10)

# 7. Commit and push
git add -A
git commit -m "Release 1.1.0"
git push -u origin release-1.1.0
```

Then open a pull request, merge it, and distribute the installer.

### Version numbering

Use semantic versioning — `MAJOR.MINOR.PATCH`:

| Change | Example | Bump |
| --- | --- | --- |
| Bug fix | Shift cash-up rounding | `1.0.0` → `1.0.1` |
| New feature, backward compatible | Add layaway | `1.0.0` → `1.1.0` |
| Breaking change or data migration | New schema | `1.0.0` → `2.0.0` |

> **If you change `VITE_IDB_VERSION`**, write a migration first. Bumping it
> without one makes the app fail to open existing data — on a live till, that
> looks like every sale has vanished.

---

## 14. Troubleshooting

### `npm install` fails

| Symptom | Cause | Fix |
| --- | --- | --- |
| Electron download timeout | Network blocking | `set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/` |
| `EACCES` / `EPERM` | Permissions | Run terminal as Administrator |
| `Unsupported engine` | Node too old | Install Node 20 LTS |
| Peer dependency errors | Stale cache | `npm cache clean --force` then `npm install` |

### The app opens but shows no data

Stale IndexedDB from an older build.

1. Press `F12` → Application → Clear storage → **Clear site data**
2. Reload

Or restore a backup through **SQL DB & Backup**.

### "IndexedDB is not available"

The app was opened from a `file://` path instead of the installed `.exe`.

A `file://` origin is opaque, so storage is blocked. Always launch via the
shortcut or the packaged executable — the `app://` protocol is what enables
storage. Opening `dist/index.html` by double-clicking will show this error.

### The sale vanishes after closing the app

This is the symptom of the persistence bug this project fixed. If it reappears:

1. Check `protocol.registerSchemesAsPrivileged` runs **before** `app.whenReady()`
2. Check the `hydrated` flag in `src/store.tsx` gates the first save
3. Run the acceptance test step 4

### Build succeeds but the installer is missing

Check `release\` for **two** `.exe` files with different names. If only one
appears, the artifact naming in `package.json` has regressed — see §8.

### SmartScreen blocks the installer

Expected for an unsigned build. Sign it (§9). For internal testing, click
*More info → Run anyway*.

### The window is blank in the packaged app

The bundle did not make it into the package. Check that `package.json` →
`build.files` includes `dist/**/*` and `electron/**/*`, then rebuild.

Open DevTools in the packaged app to see the real error: add
`--enable-logging` when launching, or temporarily set `isDev` to `true` in
`electron/main.js`.

### Tests fail after a change

Run them with more detail:

```bash
node scripts/run-tests.mjs
```

Each test names the file it covers. If you changed money, tax or payroll logic,
a failing test is usually correct and the code is wrong — verify the arithmetic
by hand before editing the test.

---

## Quick reference

```bash
# Setup
git clone https://github.com/dhhubb/reactwinpos.git
cd reactwinpos
npm install

# Develop
npm run dev            # browser at :5173
npm run desktop:dev    # Electron window

# Check
npm run typecheck      # types
npm test               # 50 tests
npm run verify         # all of the above + build

# Build
npm run build          # dist/index.html
npm run desktop:win    # release/*.exe  (Windows only)

# Test data
npm run db:seed        # generates .testdata/
```

**Demo logins** — change these before going live:

| User | Password | Role |
| --- | --- | --- |
| `admin` | `admin123` | Full access |
| `manager` | `manager123` | No user management |
| `accountant` | `account123` | Finance only |
| `cashier` | `cashier123` | POS only |

---

## Related documents

- [README.md](README.md) — what the app does
- [CHANGES.md](CHANGES.md) — every fix made and why
- [BUILD-WINDOWS.md](BUILD-WINDOWS.md) — packaging details and pre-ship checks
