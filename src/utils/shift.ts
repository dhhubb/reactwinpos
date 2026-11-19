import { CashDenomination, Shift, Transaction } from '../types';
import { roundMoney } from './currency';

/**
 * A sale belongs to a shift when its timestamp falls inside the shift window.
 * The original code compared only calendar dates and counted every sale of the day,
 * so closing a shift double-counted earlier shifts' sales and ignored shift times.
 */
export function isWithinShift(transaction: Pick<Transaction, 'date' | 'time'>, shift: Pick<Shift, 'openedAt' | 'closedAt'>): boolean {
  const stamp = transaction.time ? `${transaction.date}T${transaction.time}` : `${transaction.date}T00:00:00`;
  const at = new Date(stamp).getTime();
  if (Number.isNaN(at)) return false;
  const opened = new Date(shift.openedAt).getTime();
  const closed = shift.closedAt ? new Date(shift.closedAt).getTime() : Date.now();
  return at >= opened && at <= closed;
}

export interface ShiftTotals {
  transactionCount: number;
  totalSales: number;
  expectedCash: number;
}

export function computeShiftTotals(
  transactions: Transaction[],
  shift: Pick<Shift, 'openedAt' | 'closedAt' | 'openingCash'>,
  paymentMethod?: (t: Transaction) => 'cash' | 'card' | 'credit'
): ShiftTotals {
  const sales = transactions.filter(t => t.type === 'sale' && t.status !== 'cancelled' && isWithinShift(t, shift));
  const totalSales = roundMoney(sales.reduce((s, t) => s + t.total, 0));
  // Only cash lands in the drawer; card and credit sales must not inflate expected cash.
  const cashSales = paymentMethod
    ? roundMoney(sales.filter(t => paymentMethod(t) === 'cash').reduce((s, t) => s + t.total, 0))
    : totalSales;
  return {
    transactionCount: sales.length,
    totalSales,
    expectedCash: roundMoney(shift.openingCash + cashSales),
  };
}

export function countDenominations(denominations: CashDenomination[]): number {
  return roundMoney(
    denominations.reduce((sum, d) => sum + (Number.isFinite(d.denomination) ? d.denomination : 0) * (Number.isFinite(d.count) ? d.count : 0), 0)
  );
}

/** ZAR note and coin denominations, descending. */
export const ZAR_DENOMINATIONS = [200, 100, 50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1];
