import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTrialBalance, buildJournalEntry, applyJournalToAccounts, isEntryBalanced, normalSide } from '../utils/ledger.ts';
import { initialAccounts } from '../data/seed.ts';
import type { Account } from '../types.ts';

const acct = (over: Partial<Account>): Account => ({
  id: 'a', code: '1000', name: 'Account', type: 'asset', balance: 0, ...over,
});

test('normal side follows the account type', () => {
  assert.equal(normalSide('asset'), 'debit');
  assert.equal(normalSide('expense'), 'debit');
  assert.equal(normalSide('liability'), 'credit');
  assert.equal(normalSide('equity'), 'credit');
  assert.equal(normalSide('revenue'), 'credit');
});

test('the shipped seed data produces a balanced trial balance', () => {
  const tb = buildTrialBalance(initialAccounts);
  assert.equal(tb.balanced, true, `difference ${tb.difference}`);
  assert.equal(tb.totalDebits, tb.totalCredits);
});

test('a negative asset balance lands on the credit side instead of vanishing', () => {
  const tb = buildTrialBalance([
    acct({ id: 'bank', code: '1000', type: 'asset', balance: -500 }),
    acct({ id: 'expense', code: '5000', type: 'expense', balance: 500 }),
  ]);
  assert.equal(tb.rows[0].credit, 500);
  assert.equal(tb.rows[0].debit, 0);
  assert.equal(tb.rows[1].debit, 500);
  assert.equal(tb.balanced, true);
});

test('journal entries reject same-account and non-positive postings', () => {
  const accounts = [acct({ id: 'a1' }), acct({ id: 'a2', code: '2000', type: 'liability' })];
  const base = { id: 'j', date: '2025-01-01', reference: '', description: 'Test' };

  assert.equal(buildJournalEntry({ ...base, debitAccountId: 'a1', creditAccountId: 'a1', amount: 10 }, accounts).ok, false);
  assert.equal(buildJournalEntry({ ...base, debitAccountId: 'a1', creditAccountId: 'a2', amount: 0 }, accounts).ok, false);
  assert.equal(buildJournalEntry({ ...base, debitAccountId: 'missing', creditAccountId: 'a2', amount: 10 }, accounts).ok, false);
  assert.equal(buildJournalEntry({ ...base, description: '   ', debitAccountId: 'a1', creditAccountId: 'a2', amount: 10 }, accounts).ok, false);
  assert.equal(buildJournalEntry({ ...base, debitAccountId: 'a1', creditAccountId: 'a2', amount: 10 }, accounts).ok, true);
});

test('posting an entry moves both account balances and stays balanced', () => {
  const accounts = [
    acct({ id: 'cash', type: 'asset', balance: 1000 }),
    acct({ id: 'rev', type: 'revenue', balance: 1000 }),
  ];
  assert.equal(buildTrialBalance(accounts).balanced, true, 'fixture must start balanced');

  const result = buildJournalEntry(
    { id: 'j1', date: '2025-01-01', reference: 'JE-1', description: 'Sale', debitAccountId: 'cash', creditAccountId: 'rev', amount: 250 },
    accounts
  );
  assert.ok(result.entry);
  assert.equal(isEntryBalanced(result.entry!), true);

  const posted = applyJournalToAccounts(accounts, result.entry!);
  // Debit raises the asset, credit raises the credit-normal revenue account.
  assert.equal(posted[0].balance, 1250);
  assert.equal(posted[1].balance, 1250);
  assert.equal(buildTrialBalance(posted).balanced, true);
});
