import test from 'node:test';
import assert from 'node:assert/strict';
import { sha256, hashPassword, verifyPassword, createSalt, HASH_PREFIX } from '../utils/password.ts';

test('sha256 matches known vectors', () => {
  assert.equal(sha256(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  assert.equal(sha256('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('hashes are salted and iterated', () => {
  const a = hashPassword('secret', 'salt-a');
  const b = hashPassword('secret', 'salt-b');
  assert.notEqual(a, b, 'different salts must produce different digests');
  assert.ok(a.startsWith(`${HASH_PREFIX}$`));
  assert.equal(a.split('$').length, 4);
});

test('verification accepts the right password and rejects the wrong one', () => {
  const stored = hashPassword('admin123');
  assert.deepEqual(verifyPassword('admin123', { passwordHash: stored }), { ok: true, needsRehash: false });
  assert.deepEqual(verifyPassword('Admin123', { passwordHash: stored }), { ok: false, needsRehash: false });
  assert.deepEqual(verifyPassword('', { passwordHash: stored }), { ok: false, needsRehash: false });
});

test('legacy plain-text records still verify and are flagged for rehash', () => {
  assert.deepEqual(verifyPassword('admin123', { password: 'admin123' }), { ok: true, needsRehash: true });
  assert.deepEqual(verifyPassword('wrong', { password: 'admin123' }), { ok: false, needsRehash: true });
});

test('a record with no credential at all cannot be signed into', () => {
  assert.deepEqual(verifyPassword('anything', {}), { ok: false, needsRehash: false });
  assert.deepEqual(verifyPassword('', { password: '' }), { ok: false, needsRehash: false });
});

test('salt is unique per call', () => {
  const salts = new Set(Array.from({ length: 50 }, () => createSalt()));
  assert.equal(salts.size, 50);
});
