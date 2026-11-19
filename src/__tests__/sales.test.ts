import test from 'node:test';
import assert from 'node:assert/strict';
import { computeCartTotals, applySaleToStock, restoreStockForItems, applyCustomerBalance, statusForPaymentMethod } from '../utils/sales.ts';
import type { CartItem, Customer, Product, Transaction } from '../types.ts';

const product = (over: Partial<Product>): Product => ({
  id: 'p1', code: 'SKU-1', name: 'Item', description: '', category: 'Cat',
  price: 100, cost: 50, stock: 10, taxRate: 15, ...over,
});

test('cart totals apply each line\'s own VAT rate', () => {
  // A 0%-rated staple and a 15% item in one basket must not be averaged.
  const cart: CartItem[] = [
    { product: product({ id: 'a', price: 100, taxRate: 15 }), quantity: 2 },
    { product: product({ id: 'b', price: 50, taxRate: 0 }), quantity: 1 },
  ];
  const totals = computeCartTotals(cart);
  assert.equal(totals.subtotal, 250);
  assert.equal(totals.tax, 30);
  assert.equal(totals.total, 280);
  assert.equal(totals.itemCount, 3);
});

test('cart totals survive floating point prices', () => {
  const cart: CartItem[] = [{ product: product({ price: 19.99, taxRate: 15 }), quantity: 3 }];
  const totals = computeCartTotals(cart);
  assert.equal(totals.subtotal, 59.97);
  assert.equal(totals.tax, 9); // 8.9955 rounds to 9.00
  assert.equal(totals.total, 68.97);
});

test('empty cart totals are zero', () => {
  assert.deepEqual(computeCartTotals([]), { subtotal: 0, tax: 0, total: 0, itemCount: 0 });
});

test('a sale decrements stock and clamps at zero', () => {
  const products = [product({ id: 'p1', stock: 5 }), product({ id: 'p2', stock: 1 })];
  const next = applySaleToStock(products, [
    { productId: 'p1', quantity: 2 },
    { productId: 'p2', quantity: 4 },
  ]);
  assert.equal(next[0].stock, 3);
  assert.equal(next[1].stock, 0);
});

test('restoring stock reverses a sale exactly', () => {
  const products = [product({ id: 'p1', stock: 5 })];
  const sold = applySaleToStock(products, [{ productId: 'p1', quantity: 2 }]);
  const restored = restoreStockForItems(sold, [{ productId: 'p1', quantity: 2 }]);
  assert.equal(restored[0].stock, 5);
});

test('credit sales raise the customer balance, cash sales do not', () => {
  const customers: Customer[] = [{ id: 'c1', code: 'C1', name: 'Acme', email: '', phone: '', address: '', creditLimit: 1000, balance: 100 }];
  const creditSale = { type: 'sale' as const, status: 'pending' as const, customerId: 'c1', total: 250 };
  const cashSale = { type: 'sale' as const, status: 'paid' as const, customerId: 'c1', total: 250 };

  assert.equal(applyCustomerBalance(customers, creditSale)[0].balance, 350);
  assert.equal(applyCustomerBalance(customers, cashSale)[0].balance, 100);
});

test('a payment reduces the customer balance and is reversible', () => {
  const customers: Customer[] = [{ id: 'c1', code: 'C1', name: 'Acme', email: '', phone: '', address: '', creditLimit: 1000, balance: 500 }];
  const payment: Pick<Transaction, 'type' | 'status' | 'customerId' | 'total'> = { type: 'payment', status: 'paid', customerId: 'c1', total: 200 };
  const after = applyCustomerBalance(customers, payment);
  assert.equal(after[0].balance, 300);
  assert.equal(applyCustomerBalance(after, payment, -1)[0].balance, 500);
});

test('payment method maps to the right transaction status', () => {
  assert.equal(statusForPaymentMethod('cash'), 'paid');
  assert.equal(statusForPaymentMethod('card'), 'paid');
  assert.equal(statusForPaymentMethod('credit'), 'pending');
});
