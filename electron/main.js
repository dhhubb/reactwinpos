'use strict';

/**
 * Electron main process for the Afritecx Badboy desktop POS.
 *
 * Security posture:
 *  - `nodeIntegration` is off and `contextIsolation` is on, so renderer code cannot
 *    reach Node or the filesystem directly.
 *  - The UI is served from a custom `app://` scheme instead of `file://`. A file://
 *    origin is treated as opaque, which breaks IndexedDB persistence and would have
 *    made the app forget every sale on restart.
 *  - All navigation away from the bundled app and every `window.open` is blocked.
 */

const { app, BrowserWindow, Menu, shell, dialog, protocol, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const APP_SCHEME = 'app';
const APP_HOST = 'pos.local';
const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}`;
const isDev = !app.isPackaged;
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

/** Directory holding the built renderer (`dist/`). */
const rendererRoot = path.join(__dirname, '..', 'dist');

// The scheme must be declared privileged before `app.ready`, otherwise the origin is
// opaque and storage APIs (IndexedDB) are unavailable to the renderer.
protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
};

/**
 * Serves the built bundle. Requests resolve inside `dist/` only, so a crafted path
 * cannot escape the packaged application directory.
 */
function registerAppProtocol() {
  protocol.handle(APP_SCHEME, request => {
    const { pathname } = new URL(request.url);
    const relative = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
    const resolved = path.normalize(path.join(rendererRoot, relative));
    const withinRoot = resolved === rendererRoot || resolved.startsWith(rendererRoot + path.sep);

    if (!withinRoot) return new Response('Forbidden', { status: 403 });

    if (!fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) {
      // Single-page app: unknown paths fall back to the entry document.
      return new Response(fs.readFileSync(path.join(rendererRoot, 'index.html')), {
        headers: { 'content-type': MIME_TYPES['.html'] },
      });
    }

    const body = fs.readFileSync(resolved);
    return new Response(body, {
      headers: {
        'content-type': MIME_TYPES[path.extname(resolved).toLowerCase()] ?? 'application/octet-stream',
      },
    });
  });
}

/** Blocks navigation away from the app and opens real links in the system browser. */
function hardenWindow(win) {
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    const allowed = isDev ? url.startsWith(DEV_SERVER_URL) : url.startsWith(APP_ORIGIN);
    if (!allowed) {
      event.preventDefault();
      if (/^https?:/i.test(url)) shell.openExternal(url);
    }
  });

  win.webContents.on('will-attach-webview', event => event.preventDefault());
}

/**
 * Minimal IPC surface used by `preload.js`.
 * Both handlers validate their input; nothing here accepts a path from the renderer.
 */
function registerIpcHandlers() {
  ipcMain.handle('app:version', () => app.getVersion());

  ipcMain.handle('file:save-text', async (_event, payload) => {
    const { suggestedName, contents } = payload || {};
    if (typeof contents !== 'string') {
      return { ok: false, error: 'Nothing to save.' };
    }
    const safeName = String(suggestedName || 'report.txt').replace(/[^\w.\-]+/g, '_');
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Save file',
      defaultPath: safeName,
      filters: [
        { name: 'Text', extensions: ['txt'] },
        { name: 'CSV', extensions: ['csv'] },
        { name: 'All files', extensions: ['*'] },
      ],
    });
    if (canceled || !filePath) return { ok: false, canceled: true };
    await fs.promises.writeFile(filePath, contents, 'utf8');
    return { ok: true, filePath };
  });
}

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    backgroundColor: '#f8fafc',
    title: 'Afritecx Badboy — Accounting & POS',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
      devTools: isDev,
    },
  });

  hardenWindow(win);

  // A till should never sit on a blank window: only reveal once painted.
  win.once('ready-to-show', () => win.show());

  win.webContents.on('render-process-gone', (_event, details) => {
    dialog.showErrorBox(
      'Afritecx Badboy',
      `The display process stopped (${details.reason}). The application will now reload.\n\nYour data is stored locally and is not affected.`
    );
    win.reload();
  });

  if (isDev) {
    win.loadURL(DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadURL(`${APP_ORIGIN}/index.html`);
  }

  return win;
}

// A second instance would open a second IndexedDB handle on the same data.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    registerAppProtocol();
    registerIpcHandlers();
    Menu.setApplicationMenu(null);
    createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Never let a stray exception leave the till in a half-open state.
process.on('uncaughtException', error => {
  dialog.showErrorBox('Afritecx Badboy — unexpected error', String(error && error.stack ? error.stack : error));
});
