import {
  Account,
  BusinessProfile,
  Customer,
  DatabaseSnapshot,
  Employee,
  JournalEntry,
  PayrollRun,
  Product,
  Shift,
  Transaction,
  User,
} from '../types';

/**
 * Shape of the JSON backup / snapshot payload the app can restore.
 *
 * Typed against the real record types (rather than `unknown`) so a validated
 * payload can be handed straight to `RESTORE_DATABASE` with no cast.
 */
export interface BackupPayload {
  businessProfile?: BusinessProfile;
  products?: Product[];
  customers?: Customer[];
  transactions?: Transaction[];
  accounts?: Account[];
  journalEntries?: JournalEntry[];
  shifts?: Shift[];
  employees?: Employee[];
  payrollRuns?: PayrollRun[];
  users?: User[];
}

const ARRAY_TABLES = [
  'products',
  'customers',
  'transactions',
  'accounts',
  'journalEntries',
  'shifts',
  'employees',
  'payrollRuns',
  'users',
] as const;

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  /** Only the keys that are present and structurally valid. */
  payload: BackupPayload;
}

/**
 * Validates an uploaded backup or a stored snapshot before it replaces live data.
 * The previous implementation only checked for the presence of one key, so a backup
 * with a malformed `users` array could wipe the login table and lock every user out.
 */
export function validateBackupPayload(input: unknown): ValidationResult {
  const errors: string[] = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, errors: ['Backup file must contain a JSON object.'], payload: {} };
  }
  const source = input as Record<string, unknown>;
  const payload: BackupPayload = {};

  const hasAnyTable = ARRAY_TABLES.some(key => Array.isArray(source[key])) || (source.businessProfile && typeof source.businessProfile === 'object');
  if (!hasAnyTable) {
    errors.push('Backup does not contain any recognised tables (products, customers, transactions, ...).');
  }

  for (const key of ARRAY_TABLES) {
    const value = source[key];
    if (value === undefined) continue;
    if (!Array.isArray(value)) {
      errors.push(`"${key}" must be an array.`);
      continue;
    }
    if (value.some(row => !row || typeof row !== 'object' || Array.isArray(row))) {
      errors.push(`"${key}" contains entries that are not objects.`);
      continue;
    }
    (payload as Record<string, unknown>)[key] = value;
  }

  if (source.businessProfile !== undefined) {
    if (source.businessProfile && typeof source.businessProfile === 'object' && !Array.isArray(source.businessProfile)) {
      payload.businessProfile = source.businessProfile as BusinessProfile;
    } else {
      errors.push('"businessProfile" must be an object.');
    }
  }

  // A restore that leaves the app without any active admin would make the UI unusable.
  const users = payload.users as { role?: string; active?: boolean; username?: string; password?: string; passwordHash?: string }[] | undefined;
  if (users) {
    const hasAdmin = users.some(u =>
      u?.role === 'admin' &&
      u?.active !== false &&
      !!u?.username &&
      (!!u?.passwordHash || !!u?.password)
    );
    if (!hasAdmin) errors.push('Backup has no active administrator account, so the app could not be signed into.');
  }

  return { ok: errors.length === 0, errors, payload };
}

export function parseSnapshot(snapshot: DatabaseSnapshot): ValidationResult {
  try {
    return validateBackupPayload(JSON.parse(snapshot.dataJson));
  } catch {
    return { ok: false, errors: ['Snapshot data is not valid JSON.'], payload: {} };
  }
}
