import test from 'node:test';
import assert from 'node:assert/strict';
import { formatZAR, formatZARShort, roundMoney } from '../utils/currency.ts';

test('formatZAR uses ZAR grouping (space thousands, comma decimals)', () => {
  assert.equal(formatZAR(1234.56), 'R 1 234,56');
  assert.equal(formatZAR(1234567.891), 'R 1 234 567,89');
  assert.equal(formatZAR(0), 'R 0,00');
  assert.equal(formatZAR(-45.5), '-R 45,50');
});

test('formatZAR is stable regardless of host ICU locale data', () => {
  // Previously delegated to toLocaleString('en-ZA') which returns "1 234,56" on
  // full-ICU and "1,234.56" on small-ICU builds, so totals changed per machine.
  assert.equal(formatZAR(1000), 'R 1 000,00');
  assert.equal(formatZAR(999), 'R 999,00');
});

test('formatZAR guards non-finite input', () => {
  assert.equal(formatZAR(Number.NaN), 'R 0,00');
  assert.equal(formatZAR(Number.POSITIVE_INFINITY), 'R 0,00');
});

test('formatZARShort abbreviates thousands and millions', () => {
  assert.equal(formatZARShort(1500), 'R 1.5k');
  assert.equal(formatZARShort(2_500_000), 'R 2.50M');
  assert.equal(formatZARShort(950), 'R 950');
});

test('roundMoney removes floating point drift', () => {
  assert.equal(roundMoney(0.1 + 0.2), 0.3);
  assert.equal(roundMoney(19.995), 20);
});
