import { Account, JournalEntry } from '../types';
import { roundMoney } from './currency';

/** Normal balance side per account type. */
export function normalSide(type: Account['type']): 'debit' | 'credit' {
  return type === 'asset' || type === 'expense' ? 'debit' : 'credit';
}

export interface TrialBalanceRow {
  account: Account;
  debit: number;
  credit: number;
}

export interface TrialBalance {
  rows: TrialBalanceRow[];
  totalDebits: number;
  totalCredits: number;
  difference: number;
  balanced: boolean;
}

/**
 * Builds a trial balance where every account lands on its normal side only.
 * Previously the page filtered by type instead of by the account's own normal
 * side, so an over-drawn bank account or a debit-balance liability was silently
 * dropped from the totals and the statement could not be reconciled.
 */
export function buildTrialBalance(accounts: Account[]): TrialBalance {
  const rows: TrialBalanceRow[] = accounts.map(account => {
    const onDebitSide = normalSide(account.type) === 'debit';
    const amount = roundMoney(Math.abs(account.balance));
    const signedPositive = account.balance >= 0;
    const debit = onDebitSide === signedPositive ? amount : 0;
    const credit = onDebitSide === signedPositive ? 0 : amount;
    return { account, debit, credit };
  });

  const totalDebits = roundMoney(rows.reduce((s, r) => s + r.debit, 0));
  const totalCredits = roundMoney(rows.reduce((s, r) => s + r.credit, 0));
  const difference = roundMoney(totalDebits - totalCredits);

  return { rows, totalDebits, totalCredits, difference, balanced: Math.abs(difference) < 0.01 };
}

export interface PostingResult {
  ok: boolean;
  error?: string;
  entry?: JournalEntry;
}

export interface PostingInput {
  id: string;
  date: string;
  reference: string;
  description: string;
  debitAccountId: string;
  creditAccountId: string;
  amount: number;
}

/**
 * Validates and constructs a journal entry.
 * The original form allowed posting to the same account on both sides and to
 * non-existent accounts, producing entries that never balanced.
 */
export function buildJournalEntry(input: PostingInput, accounts: Account[]): PostingResult {
  const amount = roundMoney(input.amount);
  if (!input.description.trim()) return { ok: false, error: 'A description is required.' };
  if (!input.debitAccountId || !input.creditAccountId) return { ok: false, error: 'Select both a debit and a credit account.' };
  if (input.debitAccountId === input.creditAccountId) return { ok: false, error: 'Debit and credit accounts must differ.' };
  if (!(amount > 0)) return { ok: false, error: 'Amount must be greater than zero.' };

  const debitAccount = accounts.find(a => a.id === input.debitAccountId);
  const creditAccount = accounts.find(a => a.id === input.creditAccountId);
  if (!debitAccount || !creditAccount) return { ok: false, error: 'Selected account no longer exists.' };

  return {
    ok: true,
    entry: {
      id: input.id,
      date: input.date,
      reference: input.reference.trim() || input.id,
      description: input.description.trim(),
      debits: [{ accountId: debitAccount.id, accountName: debitAccount.name, amount }],
      credits: [{ accountId: creditAccount.id, accountName: creditAccount.name, amount }],
    },
  };
}

/**
 * Applies a posted entry to the chart of accounts.
 *
 * Account balances are stored as positive amounts on the account's normal side, so
 * a debit *raises* a debit-normal account (asset, expense) and *lowers* a credit-normal
 * one (liability, equity, revenue); a credit does the opposite.
 */
export function applyJournalToAccounts(accounts: Account[], entry: JournalEntry): Account[] {
  const deltas = new Map<string, number>();
  for (const d of entry.debits) deltas.set(d.accountId, (deltas.get(d.accountId) ?? 0) + d.amount);
  for (const c of entry.credits) deltas.set(c.accountId, (deltas.get(c.accountId) ?? 0) - c.amount);

  return accounts.map(account => {
    const debitMinusCredit = deltas.get(account.id);
    if (!debitMinusCredit) return account;
    const signed = normalSide(account.type) === 'debit' ? debitMinusCredit : -debitMinusCredit;
    return { ...account, balance: roundMoney(account.balance + signed) };
  });
}

export function isEntryBalanced(entry: JournalEntry): boolean {
  const debits = roundMoney(entry.debits.reduce((s, d) => s + d.amount, 0));
  const credits = roundMoney(entry.credits.reduce((s, c) => s + c.amount, 0));
  return Math.abs(debits - credits) < 0.01;
}
