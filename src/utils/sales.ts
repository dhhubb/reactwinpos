import { CartItem, Product, Transaction, Customer } from '../types';
import { roundMoney } from './currency';

export interface CartTotals {
  subtotal: number;
  tax: number;
  total: number;
  itemCount: number;
}

/**
 * Line-level VAT. The POS previously summed a single "avg" tax rate and rounded only
 * at the end, so a mixed basket of 0% and 15% items produced a wrong VAT figure.
 * Tax is now computed per line and rounded per line, which is what a till slip shows.
 */
export function computeCartTotals(cart: CartItem[]): CartTotals {
  let subtotal = 0;
  let tax = 0;
  let itemCount = 0;
  for (const item of cart) {
    const line = roundMoney(item.product.price * item.quantity);
    subtotal = roundMoney(subtotal + line);
    tax = roundMoney(tax + roundMoney((line * (item.product.taxRate ?? 0)) / 100));
    itemCount += item.quantity;
  }
  return { subtotal, tax, total: roundMoney(subtotal + tax), itemCount };
}

/** Decrements stock for every sold line, clamping at zero so stock can never go negative. */
export function applySaleToStock(products: Product[], items: { productId: string; quantity: number }[]): Product[] {
  const sold = new Map<string, number>();
  for (const item of items) {
    sold.set(item.productId, (sold.get(item.productId) ?? 0) + item.quantity);
  }
  return products.map(p => {
    const qty = sold.get(p.id);
    if (!qty) return p;
    return { ...p, stock: Math.max(0, p.stock - qty) };
  });
}

/**
 * Reverses a sale's stock movement (used when a transaction is deleted or refunded)
 * and returns the customer's new outstanding balance for credit sales.
 */
export function restoreStockForItems(products: Product[], items: { productId: string; quantity: number }[]): Product[] {
  const returned = new Map<string, number>();
  for (const item of items) {
    returned.set(item.productId, (returned.get(item.productId) ?? 0) + item.quantity);
  }
  return products.map(p => {
    const qty = returned.get(p.id);
    if (!qty) return p;
    return { ...p, stock: p.stock + qty };
  });
}

/**
 * Credit sales raise a customer's balance; cash/card sales and payments reduce it.
 * Returns a new customers array so the reducer stays pure.
 */
export function applyCustomerBalance(
  customers: Customer[],
  transaction: Pick<Transaction, 'type' | 'status' | 'customerId' | 'total'>,
  direction: 1 | -1 = 1
): Customer[] {
  if (!transaction.customerId) return customers;
  const onCredit = transaction.type === 'sale' && transaction.status !== 'paid' && transaction.status !== 'cancelled';
  const isPayment = transaction.type === 'payment';
  if (!onCredit && !isPayment) return customers;

  const delta = roundMoney((isPayment ? -transaction.total : transaction.total) * direction);
  return customers.map(c =>
    c.id === transaction.customerId ? { ...c, balance: roundMoney(c.balance + delta) } : c
  );
}

/** Payment methods the till supports, mapped to the transaction status they produce. */
export type PaymentMethod = 'cash' | 'card' | 'credit';

export function statusForPaymentMethod(method: PaymentMethod): Transaction['status'] {
  return method === 'credit' ? 'pending' : 'paid';
}
