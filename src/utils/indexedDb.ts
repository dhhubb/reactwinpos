import { LOCAL_STORE_CONFIG, LocalStoreConfig } from '../config/database';

/**
 * IndexedDB persistence for the desktop build.
 *
 * Why this exists: the original app stored everything in `localStorage`, which is
 * capped at ~5 MB, is synchronous (blocking the UI thread on every keystroke save)
 * and is shared with any other page on the same origin. On Windows the app runs from
 * an Electron `app://` origin, so a real IndexedDB keeps each install's data isolated.
 *
 * The state document is stored as a single record, matching the reducer's shape, and
 * `localStorage` remains as a fallback so nothing is lost if IndexedDB is blocked.
 */

export interface StateRecord<T = unknown> {
  key: 'state';
  version: number;
  updatedAt: string;
  data: T;
}

export interface AuditRecord {
  id: string;
  at: string;
  action: string;
  detail?: string;
}

const STATE_KEY = 'state' as const;

function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== 'undefined' && indexedDB !== null;
}

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDatabase(config: LocalStoreConfig = LOCAL_STORE_CONFIG): Promise<IDBDatabase> {
  if (!isIndexedDbAvailable()) {
    return Promise.reject(new Error('IndexedDB is not available in this environment.'));
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(config.databaseName, config.version);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(config.stateStore)) {
        db.createObjectStore(config.stateStore, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(config.auditStore)) {
        const audit = db.createObjectStore(config.auditStore, { keyPath: 'id' });
        audit.createIndex('at', 'at', { unique: false });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      // Another window/tab upgraded the schema: close so it can retry cleanly.
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB.'));
    request.onblocked = () => reject(new Error('IndexedDB upgrade blocked by another open window.'));
  });

  return dbPromise;
}

function runTransaction<T>(
  db: IDBDatabase,
  store: string,
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const request = work(tx.objectStore(store));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted.'));
  });
}

export async function loadState<T>(config: LocalStoreConfig = LOCAL_STORE_CONFIG): Promise<T | null> {
  if (!isIndexedDbAvailable()) return null;
  try {
    const db = await openDatabase(config);
    const record = await runTransaction<StateRecord<T> | undefined>(
      db,
      config.stateStore,
      'readonly',
      store => store.get(STATE_KEY) as IDBRequest<StateRecord<T> | undefined>
    );
    return record?.data ?? null;
  } catch {
    return null;
  }
}

export async function saveState<T>(data: T, config: LocalStoreConfig = LOCAL_STORE_CONFIG): Promise<boolean> {
  if (!isIndexedDbAvailable()) return false;
  try {
    const db = await openDatabase(config);
    const record: StateRecord<T> = {
      key: STATE_KEY,
      version: config.version,
      updatedAt: new Date().toISOString(),
      data,
    };
    await runTransaction(db, config.stateStore, 'readwrite', store => store.put(record));
    return true;
  } catch {
    return false;
  }
}

export async function appendAudit(action: string, detail?: string, config: LocalStoreConfig = LOCAL_STORE_CONFIG): Promise<void> {
  if (!isIndexedDbAvailable()) return;
  try {
    const db = await openDatabase(config);
    const record: AuditRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      at: new Date().toISOString(),
      action,
      detail,
    };
    await runTransaction(db, config.auditStore, 'readwrite', store => store.add(record));
  } catch {
    // Auditing is best-effort; never block a sale on it.
  }
}

export async function readAudit(limit = 100, config: LocalStoreConfig = LOCAL_STORE_CONFIG): Promise<AuditRecord[]> {
  if (!isIndexedDbAvailable()) return [];
  try {
    const db = await openDatabase(config);
    const rows = await runTransaction<AuditRecord[]>(db, config.auditStore, 'readonly', store => store.getAll() as IDBRequest<AuditRecord[]>);
    return rows.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
  } catch {
    return [];
  }
}

export async function clearState(config: LocalStoreConfig = LOCAL_STORE_CONFIG): Promise<void> {
  if (!isIndexedDbAvailable()) return;
  try {
    const db = await openDatabase(config);
    await runTransaction(db, config.stateStore, 'readwrite', store => store.delete(STATE_KEY));
  } catch {
    // ignore
  }
}

export function readLegacyLocalStorage<T>(config: LocalStoreConfig = LOCAL_STORE_CONFIG): T | null {
  try {
    const raw = localStorage.getItem(config.localStorageKey);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeLegacyLocalStorage<T>(data: T, config: LocalStoreConfig = LOCAL_STORE_CONFIG): void {
  try {
    localStorage.setItem(config.localStorageKey, JSON.stringify(data));
  } catch {
    // Quota or privacy mode: IndexedDB is the primary store, so this is non-fatal.
  }
}

/** Test/utility helper: wipes the IndexedDB database entirely. */
export async function deleteDatabase(config: LocalStoreConfig = LOCAL_STORE_CONFIG): Promise<void> {
  if (!isIndexedDbAvailable()) return;
  dbPromise = null;
  await new Promise<void>(resolve => {
    const request = indexedDB.deleteDatabase(config.databaseName);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}
