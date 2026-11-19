/**
 * Central database configuration.
 *
 * The desktop build persists data locally in IndexedDB (see `utils/indexedDb.ts`).
 * A server-side relational database can be attached later through the same payload
 * shape that the SQL dump/Next.js API route already use. Every value below is
 * overridable at build time through Vite env vars (`VITE_DB_*`), so the shipped
 * installer can point at a real server without touching source.
 *
 * Fill these in before enabling the remote connection; placeholders are detected by
 * `describeConnection()` so the UI can warn instead of failing silently.
 */

export type DatabaseEngine = 'postgres' | 'mysql' | 'sqlite' | 'mssql';

export interface RelationalConnectionConfig {
  engine: DatabaseEngine;
  host: string;
  port: number;
  database: string;
  schema: string;
  user: string;
  password: string;
  ssl: boolean;
  /** Maps to the driver's sslmode option. */
  sslMode: 'disable' | 'prefer' | 'require' | 'verify-full';
  poolMin: number;
  poolMax: number;
  connectionTimeoutMs: number;
  idleTimeoutMs: number;
  /** Path to the CA bundle when sslMode is `verify-full`. */
  sslCaPath: string;
}

export interface LocalStoreConfig {
  /** IndexedDB database name. */
  databaseName: string;
  version: number;
  /** Object store that holds the single serialised application state document. */
  stateStore: string;
  /** Object store for audit records written outside the state document. */
  auditStore: string;
  /** Fallback key used when IndexedDB is unavailable (e.g. locked-down kiosk mode). */
  localStorageKey: string;
}

const env = (key: string, fallback: string): string => {
  const value = (import.meta.env as Record<string, string | undefined>)[key];
  return value === undefined || value === '' ? fallback : value;
};

const envNumber = (key: string, fallback: number): number => {
  const parsed = Number(env(key, ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const envBool = (key: string, fallback: boolean): boolean => {
  const value = env(key, '').toLowerCase();
  if (value === '') return fallback;
  return value === 'true' || value === '1' || value === 'yes';
};

export const RELATIONAL_DB_CONFIG: RelationalConnectionConfig = {
  engine: env('VITE_DB_ENGINE', 'postgres') as DatabaseEngine,
  host: env('VITE_DB_HOST', 'localhost'),
  port: envNumber('VITE_DB_PORT', 5432),
  database: env('VITE_DB_NAME', 'afritecx_pos'),
  schema: env('VITE_DB_SCHEMA', 'public'),
  user: env('VITE_DB_USER', 'CHANGE_ME'),
  password: env('VITE_DB_PASSWORD', 'CHANGE_ME'),
  ssl: envBool('VITE_DB_SSL', false),
  sslMode: env('VITE_DB_SSL_MODE', 'prefer') as RelationalConnectionConfig['sslMode'],
  poolMin: envNumber('VITE_DB_POOL_MIN', 2),
  poolMax: envNumber('VITE_DB_POOL_MAX', 10),
  connectionTimeoutMs: envNumber('VITE_DB_CONNECT_TIMEOUT_MS', 10000),
  idleTimeoutMs: envNumber('VITE_DB_IDLE_TIMEOUT_MS', 30000),
  sslCaPath: env('VITE_DB_SSL_CA_PATH', ''),
};

export const LOCAL_STORE_CONFIG: LocalStoreConfig = {
  databaseName: env('VITE_IDB_NAME', 'afritecx_badboy_pos'),
  version: envNumber('VITE_IDB_VERSION', 1),
  stateStore: 'appState',
  auditStore: 'auditLog',
  localStorageKey: 'afritecx_badboy_sqldb_v1',
};

const PLACEHOLDER_VALUES = new Set(['', 'change_me', 'changeme', 'password', 'user', 'admin', 'localhost']);

/** True when a required connection field is still a placeholder. */
export function isPlaceholder(value: string): boolean {
  return PLACEHOLDER_VALUES.has(value.trim().toLowerCase());
}

export interface ConnectionReport {
  ready: boolean;
  missing: string[];
  /** Non-secret, human readable summary suitable for a settings screen or log file. */
  summary: string;
}

/**
 * Reports whether the relational connection has been filled in.
 * Never includes the password so it is safe to display and to log.
 */
export function describeConnection(config: RelationalConnectionConfig = RELATIONAL_DB_CONFIG): ConnectionReport {
  const missing: string[] = [];
  if (isPlaceholder(config.host)) missing.push('host');
  if (isPlaceholder(config.user)) missing.push('user');
  if (isPlaceholder(config.password)) missing.push('password');
  if (isPlaceholder(config.database)) missing.push('database');

  const target = `${config.engine}://${config.user}@${config.host}:${config.port}/${config.database}?sslmode=${config.sslMode}`;
  return {
    ready: missing.length === 0,
    missing,
    summary: missing.length === 0
      ? `Connected target: ${target}`
      : `Remote database not configured (missing: ${missing.join(', ')}). Local IndexedDB is in use.`,
  };
}

export const DB_SCHEMA_TABLES = [
  'business_profile',
  'products',
  'customers',
  'transactions',
  'accounts',
  'journal_entries',
  'shifts',
  'employees',
  'payroll_runs',
  'users',
] as const;
