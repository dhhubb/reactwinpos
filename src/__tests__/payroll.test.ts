import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePAYE,
  calculateUIF,
  calculatePayslip,
  annualTaxBeforeRebate,
  toMonthlyGross,
  PRIMARY_REBATE,
  TAX_THRESHOLD,
} from '../utils/payroll.ts';

test('income below the tax threshold pays no PAYE', () => {
  assert.equal(calculatePAYE(7000), 0); // R84 000 per year
  assert.equal(calculatePAYE(TAX_THRESHOLD / 12), 0);
});

test('PAYE is progressive, not a flat rate on the whole income', () => {
  // The old code charged 26% of the full annual income above R237 100, which
  // overstated tax. At R300 000 annual (R25 000 pm) the correct annual PAYE is:
  //   237100 * 0.18 = 42678
  // + 62900 * 0.26 = 16354
  // - rebate 17235  = 41797  -> R3 483 per month
  const annual = annualTaxBeforeRebate(300_000);
  assert.equal(Math.round(annual), 42678 + Math.round(62900 * 0.26));
  assert.equal(calculatePAYE(25_000), Math.round((annual - PRIMARY_REBATE) / 12));
  assert.equal(calculatePAYE(25_000), 3483);
});

test('PAYE never goes negative after the rebate', () => {
  // R96 000/yr is just over the R95 750 threshold: 96000*0.18 - 17235 = R45/yr.
  assert.equal(calculatePAYE(8000), 4);
  // A salary inside the threshold is exempt entirely.
  assert.equal(calculatePAYE(7900), 0);
  // No input may ever produce a negative deduction.
  for (const salary of [0, 1, 5000, 7900, 8000, 25_000, 200_000]) {
    assert.ok(calculatePAYE(salary) >= 0, `PAYE negative at ${salary}`);
  }
});

test('UIF is 1% and capped at the monthly ceiling', () => {
  assert.equal(calculateUIF(10_000), 100);
  assert.equal(calculateUIF(50_000), 177.12);
});

test('payslip net subtracts PAYE and UIF', () => {
  const slip = calculatePayslip(25_000);
  assert.equal(slip.gross, 25_000);
  assert.equal(slip.paye, 3483);
  assert.equal(slip.uif, 177.12);
  assert.equal(slip.net, Math.round((25_000 - 3483 - 177.12) * 100) / 100);
});

test('pay frequency is normalised to a monthly figure', () => {
  assert.equal(toMonthlyGross(1000, 'weekly'), Math.round((1000 * 52 / 12) * 100) / 100);
  assert.equal(toMonthlyGross(1000, 'biweekly'), Math.round((1000 * 26 / 12) * 100) / 100);
  assert.equal(toMonthlyGross(1000, 'monthly'), 1000);
});

test('negative or invalid salaries are clamped to zero', () => {
  assert.equal(calculatePAYE(-5000), 0);
  assert.equal(calculateUIF(Number.NaN), 0);
});
