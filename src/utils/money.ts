export class MoneyParseError extends Error {
  constructor(input: string) {
    super(`Invalid money input: "${input}"`);
    Object.setPrototypeOf(this, MoneyParseError.prototype);
    this.name = 'MoneyParseError';
  }
}

const MONEY_RE = /^\d+(\.\d{1,2})?$/;
const IN_PROGRESS_RE = /^\d*(\.\d{0,2})?$/;

function strip(input: string): string {
  return input.trim().replace(/^₱/, '');
}

export function parseMoney(raw: string): number {
  const s = strip(raw);
  if (s === '') return 0;
  if (!MONEY_RE.test(s)) throw new MoneyParseError(raw);
  const [whole, frac = ''] = s.split('.');
  const fracPadded = (frac + '00').slice(0, 2);
  return Number(whole) * 100 + Number(fracPadded);
}

export function formatMoney(centavos: number): string {
  return '₱' + formatMoneyShort(centavos);
}

export function formatMoneyShort(centavos: number): string {
  if (!Number.isFinite(centavos) || centavos < 0) {
    throw new Error(`formatMoneyShort: invalid centavos value ${centavos}`);
  }
  const whole = Math.floor(centavos / 100);
  const frac = centavos % 100;
  const wholeStr = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (frac === 0) return wholeStr;
  return `${wholeStr}.${frac.toString().padStart(2, '0')}`;
}

export function isValidMoneyInput(raw: string): boolean {
  const s = strip(raw);
  if (s === '') return true;
  return IN_PROGRESS_RE.test(s);
}
