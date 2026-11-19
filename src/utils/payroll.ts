// South African payroll calculations.
// The previous implementation applied each bracket as a flat rate to the *whole*
// annual income (e.g. 26% of everything above R237 100), which overstated PAYE and
// ignored the primary rebate. Brackets below follow the SARS 2025/2026 tables and are
// applied progressively with the primary rebate deducted.

export interface TaxBracket {
  /** Upper bound of the bracket in annual ZAR; `null` means the top bracket. */
  upTo: number | null;
  /** Marginal rate applied to income inside this bracket. */
  rate: number;
}

export const TAX_YEAR = '2025/2026';
export const PRIMARY_REBATE = 17235;
export const TAX_THRESHOLD = 95750;
/** UIF is 1% of earnings, capped at a monthly ceiling of R17 712 (i.e. R177.12). */
export const UIF_RATE = 0.01;
export const UIF_MONTHLY_CEILING = 17712;

export const TAX_BRACKETS: TaxBracket[] = [
  { upTo: 237100, rate: 0.18 },
  { upTo: 370500, rate: 0.26 },
  { upTo: 512800, rate: 0.31 },
  { upTo: 673000, rate: 0.36 },
  { upTo: 857900, rate: 0.39 },
  { upTo: 1817000, rate: 0.41 },
  { upTo: null, rate: 0.45 },
];

/** Annual PAYE before rebates, computed progressively across the brackets. */
export function annualTaxBeforeRebate(annualIncome: number): number {
  if (!Number.isFinite(annualIncome) || annualIncome <= 0) return 0;
  let remaining = annualIncome;
  let lower = 0;
  let tax = 0;
  for (const bracket of TAX_BRACKETS) {
    const upper = bracket.upTo ?? Infinity;
    const slice = Math.min(remaining, upper - lower);
    if (slice <= 0) break;
    tax += slice * bracket.rate;
    remaining -= slice;
    lower = upper;
  }
  return tax;
}

/** Annual PAYE after the primary rebate, floored at zero. */
export function annualPaye(annualIncome: number): number {
  if (!Number.isFinite(annualIncome) || annualIncome <= TAX_THRESHOLD) return 0;
  return Math.max(0, annualTaxBeforeRebate(annualIncome) - PRIMARY_REBATE);
}

/** Monthly PAYE for a monthly gross salary, rounded to whole rand. */
export function calculatePAYE(monthlySalary: number): number {
  const monthly = Number.isFinite(monthlySalary) ? Math.max(0, monthlySalary) : 0;
  return Math.round(annualPaye(monthly * 12) / 12);
}

/** Monthly UIF employee contribution (1% capped at the ceiling). */
export function calculateUIF(monthlySalary: number): number {
  const monthly = Number.isFinite(monthlySalary) ? Math.max(0, monthlySalary) : 0;
  return Math.round(Math.min(monthly * UIF_RATE, UIF_MONTHLY_CEILING * UIF_RATE) * 100) / 100;
}

export interface Payslip {
  gross: number;
  paye: number;
  uif: number;
  net: number;
}

export function calculatePayslip(monthlySalary: number): Payslip {
  const gross = Number.isFinite(monthlySalary) ? Math.max(0, monthlySalary) : 0;
  const paye = calculatePAYE(gross);
  const uif = calculateUIF(gross);
  return { gross, paye, uif, net: Math.max(0, Math.round((gross - paye - uif) * 100) / 100) };
}

/**
 * Converts any supported pay frequency into a monthly gross figure so payroll runs
 * and dashboard totals compare like with like.
 */
export function toMonthlyGross(salary: number, frequency: 'monthly' | 'weekly' | 'biweekly'): number {
  const safe = Number.isFinite(salary) ? Math.max(0, salary) : 0;
  switch (frequency) {
    case 'weekly':
      return Math.round((safe * 52 / 12) * 100) / 100;
    case 'biweekly':
      return Math.round((safe * 26 / 12) * 100) / 100;
    case 'monthly':
    default:
      return Math.round(safe * 100) / 100;
  }
}
