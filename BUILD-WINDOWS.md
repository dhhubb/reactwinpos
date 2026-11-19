# Building the Windows Desktop Application

## Requirements

- **Windows 10 or 11, 64-bit** — the installer must be produced on Windows.
- **Node.js 20 LTS or newer** (`node -v` to check).
- ~2 GB free disk space (Electron toolchain).

## Build the installer

```cmd
npm install
npm run verify        :: typecheck + tests + production build
npm run desktop:win
```

Output lands in `release\`:

| File | Use |
| --- | --- |
| `AfritecxBadboyPOS-1.0.0-x64.exe` | NSIS installer — desktop + Start Menu shortcuts, user-selectable folder |
| `AfritecxBadboyPOS-1.0.0-portable.exe` | Portable single file — run from a USB stick, no install |

Both targets are x64. To build only one:

```cmd
npx electron-builder --win nsis        :: installer only
npx electron-builder --win portable    :: portable only
```

## Optional: attach a server database

Copy `.env.example` to `.env`, fill in the `VITE_DB_*` fields, then rebuild.
Placeholders (`CHANGE_ME`, `localhost`) are detected and reported in the UI
instead of failing silently. The app runs fully offline on local IndexedDB with
no `.env` at all.

Never commit `.env` — it holds the database password.

## Optional: generate a test database

```cmd
npm run db:seed
```

This launches headless Chromium, writes a real IndexedDB, reads every record back
and verifies it. Results are written to `.testdata\`.

To load the test data into an installed app, use
`testdata\afritecx_testdata_backup.json` — open *SQL DB & Backup* and
restore it. (The `.leveldb` folder next to it is bound to the seeding origin and
cannot be copied into a desktop profile.)

On Windows, set `CHROMIUM_PATH` to your Chromium or Edge binary first:

```cmd
set CHROMIUM_PATH=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe
npm run db:seed
```

## Verify a build before shipping

1. Install and launch the app.
2. Sign in with `admin` / `admin123`.
3. Ring up a sale: *Point of Sale* → pick an item → **Pay**.
   Check that VAT is 15% of the line and the total is correct.
4. Close the app completely and reopen it.
   The sale must still be there and stock must still be reduced.
5. *SQL DB & Backup* → download a `.json` backup.
6. *Users & Access* → change the `admin` password, sign out, sign back in with
   the new one.
7. Try restoring the backup you downloaded in step 5 — it must be accepted.
8. Try restoring a text file renamed to `.json` — it must be **rejected** with a
   readable error.

## Troubleshooting

**Build fails with "cannot execute 7za"** — antivirus is blocking the packaging
tool. Add an exclusion for `release` and `%LOCALAPPDATA%\electron-builder`.

**Installer is blocked by SmartScreen** — expected for a new unsigned publisher.
Code-sign with an EV certificate to remove the warning:

```cmd
set CSC_LINK=path\to\certificate.pfx
set CSC_KEY_PASSWORD=your-password
npm run desktop:win
```

**The app opens but shows no data** — a stale IndexedDB from an older build.
Open *SQL DB & Backup* and restore a backup, or delete the profile folder at
`%APPDATA%\Afritecx Badboy POS`.

**"IndexedDB is not available"** — the app was launched from a `file://` path
instead of the installed executable. Always launch via the shortcut or the
packaged `.exe`; the `app://` protocol is what enables storage.

## Development mode

```cmd
npm run dev            :: browser at http://localhost:5173
npm run desktop:dev    :: Electron window against the built bundle
```

`desktop:dev` uses the production bundle, so what you see matches the installer.
