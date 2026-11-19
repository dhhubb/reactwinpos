import test from 'node:test';
import assert from 'node:assert/strict';
import { isWithinShift, computeShiftTotals, countDenominations } from '../utils/shift.ts';
import type { CashDenomination, Transaction } from '../types.ts';

const tx = (over: Partial<Transaction>): Transaction => ({
  id: 't', date: '2025-03-20', time: '10:00:00', type: 'sale',
  description: '', amount: 100, tax: 15, total: 115, status: 'paid', ...over,
});

test('a sale only counts when it falls inside the shift window', () => {
  const shift = { openedAt: '2025-03-20T08:00:00', closedAt: '2025-03-20T16:00:00' };
  assert.equal(isWithinShift(tx({ time: '09:30:00' }), shift), true);
  // Before opening on the same day: previously counted because only the date was compared.
  assert.equal(isWithinShift(tx({ time: '07:00:00' }), shift), false);
  // After closing on the same day: previously counted too.
  assert.equal(isWithinShift(tx({ time: '18:00:00' }), shift), false);
  assert.equal(isWithinShift(tx({ date: '2025-03-21', time: '09:00:00' }), shift), false);
});

test('shift totals count only sales inside the window', () => {
  const shift = { openedAt: '2025-03-20T08:00:00', closedAt: '2025-03-20T16:00:00', openingCash: 500 };
  const transactions = [
    tx({ id: 'a', time: '09:00:00', total: 115 }),
    tx({ id: 'b', time: '15:00:00', total: 230 }),
    tx({ id: 'c', time: '17:00:00', total: 999 }),   // after close
    tx({ id: 'd', time: '09:00:00', type: 'expense', total: 50 }),
    tx({ id: 'e', time: '10:00:00', status: 'cancelled', total: 400 }),
  ];
  const totals = computeShiftTotals(transactions, shift);
  assert.equal(totals.transactionCount, 2);
  assert.equal(totals.totalSales, 345);
  assert.equal(totals.expectedCash, 845);
});

test('expected cash excludes card and credit sales when a method resolver is supplied', () => {
  const shift = { openedAt: '2025-03-20T08:00:00', closedAt: '2025-03-20T16:00:00', openingCash: 100 };
  const transactions = [
    tx({ id: 'a', total: 100, paymentMethod: 'cash' }),
    tx({ id: 'b', total: 200, paymentMethod: 'card' }),
    tx({ id: 'c', total: 300, paymentMethod: 'credit', status: 'pending' }),
  ];
  const totals = computeShiftTotals(transactions, shift, t => t.paymentMethod ?? 'cash');
  assert.equal(totals.totalSales, 600);
  assert.equal(totals.expectedCash, 200);
});

test('denomination counting sums notes and coins', () => {
  const denominations: CashDenomination[] = [
    { denomination: 200, count: 2 },
    { denomination: 50, count: 1 },
    { denomination: 0.5, count: 3 },
  ];
  assert.equal(countDenominations(denominations), 451.5);
});

test('denomination counting tolerates junk input', () => {
  assert.equal(countDenominations([{ denomination: Number.NaN, count: 3 }, { denomination: 10, count: -5 }]), -50);
});
