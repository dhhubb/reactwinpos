import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBackupPayload, parseSnapshot } from '../utils/backupValidation.ts';
import { SEED_USERS } from '../data/seed.ts';

const admin = SEED_USERS.filter(u => u.role === 'admin');

test('a valid backup payload passes', () => {
  const result = validateBackupPayload({ products: [], customers: [], users: admin });
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test('non-object payloads are rejected', () => {
  for (const bad of [null, undefined, 'x', 42, []]) {
    assert.equal(validateBackupPayload(bad).ok, false);
  }
});

test('a payload with no recognised tables is rejected', () => {
  const result = validateBackupPayload({ foo: 'bar' });
  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /recognised tables/i);
});

test('a table of the wrong type is rejected and reported', () => {
  const result = validateBackupPayload({ products: 'nope', users: admin });
  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /"products" must be an array/);
});

test('a backup with no active admin is rejected (would lock every user out)', () => {
  const result = validateBackupPayload({
    products: [],
    users: [{ id: 'u1', username: 'clerk', role: 'cashier', active: true, password: 'x' }],
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /administrator/i);
});

test('a disabled admin alone is not enough to restore', () => {
  const result = validateBackupPayload({
    users: [{ id: 'u1', username: 'admin', role: 'admin', active: false, password: 'x' }],
  });
  assert.equal(result.ok, false);
});

test('valid tables are kept even when another table is malformed', () => {
  const result = validateBackupPayload({ products: [{ id: 'p1' }], customers: 'bad', users: admin });
  assert.deepEqual(result.payload.products, [{ id: 'p1' }]);
  assert.equal(result.payload.customers, undefined);
});

test('parseSnapshot reports invalid JSON instead of throwing', () => {
  const snapshot = { id: 's', name: 's', createdAt: '', sizeBytes: 0, recordCount: 0, dataJson: '{not json' };
  const result = parseSnapshot(snapshot);
  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /not valid JSON/i);
});

test('a snapshot with malformed JSON is rejected, not thrown', () => {
  const result = parseSnapshot({
    id: 's1', name: 'broken', createdAt: '', sizeBytes: 0, recordCount: 0,
    dataJson: '{not json',
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /not valid JSON/i);
});

test('a snapshot holding a valid payload is parsed through', () => {
  const result = parseSnapshot({
    id: 's2', name: 'good', createdAt: '', sizeBytes: 0, recordCount: 0,
    dataJson: JSON.stringify({ products: [], users: admin }),
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.payload.products, []);
});

test('a restore that would leave no active administrator is rejected', () => {
  const disabledAdmin = admin.map(u => ({ ...u, active: false }));
  const result = validateBackupPayload({ products: [], users: disabledAdmin });
  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /administrator/i);
});

test('an administrator with only a password hash is accepted', () => {
  const hashed = admin.map(({ password: _drop, ...rest }) => rest);
  assert.ok(hashed.every(u => u.passwordHash), 'fixture must be hash-only');
  const result = validateBackupPayload({ products: [], users: hashed });
  assert.equal(result.ok, true);
});

test('non-array tables and non-object rows are both rejected', () => {
  assert.match(
    validateBackupPayload({ products: 'nope', users: admin }).errors.join(' '),
    /"products" must be an array/i
  );
  assert.match(
    validateBackupPayload({ products: [1, 2], users: admin }).errors.join(' '),
    /not objects/i
  );
});

test('every problem is reported at once', () => {
  const result = validateBackupPayload({ products: 'bad', customers: 42, users: [] });
  assert.equal(result.ok, false);
  assert.ok(result.errors.length >= 3, `expected 3+ errors, got ${result.errors.length}`);
});
