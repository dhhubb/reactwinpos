// ZAR (South African Rand) currency formatter.
// Intl output varies by ICU build (Windows ships a full-ICU Node/Chromium, but the
// renderer bundle may be built with small-icu), so grouping is done manually to keep
// amounts identical across every platform. ZAR convention: space thousands, comma decimal.
function groupDigits(integerPart: string): string {
  return integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function formatZAR(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const negative = safe < 0;
  const fixed = Math.abs(safe).toFixed(2);
  const [whole, fraction] = fixed.split('.');
  return `${negative ? '-' : ''}R ${groupDigits(whole)},${fraction}`;
}

export function formatZARShort(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const sign = safe < 0 ? '-' : '';
  const abs = Math.abs(safe);
  if (abs >= 1000000) return `${sign}R ${(abs / 1000000).toFixed(2)}M`;
  if (abs >= 1000) return `${sign}R ${(abs / 1000).toFixed(1)}k`;
  return `${sign}R ${abs.toFixed(0)}`;
}

/** Rounds a monetary value to cents to avoid floating point drift in ledgers. */
export function roundMoney(amount: number): number {
  return Math.round((Number.isFinite(amount) ? amount : 0) * 100) / 100;
}

export const CURRENCY_SYMBOL = 'R';
export const CURRENCY_CODE = 'ZAR';
