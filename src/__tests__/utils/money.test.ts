import {
  parseMoney,
  formatMoney,
  formatMoneyShort,
  isValidMoneyInput,
  MoneyParseError,
} from '@/utils/money';

describe('parseMoney', () => {
  it('parses whole pesos', () => {
    expect(parseMoney('12')).toBe(1200);
  });
  it('parses pesos with two decimals', () => {
    expect(parseMoney('12.50')).toBe(1250);
  });
  it('parses pesos with one decimal as ten-centavo', () => {
    expect(parseMoney('12.5')).toBe(1250);
  });
  it('strips a leading peso symbol', () => {
    expect(parseMoney('₱12.50')).toBe(1250);
  });
  it('strips surrounding whitespace', () => {
    expect(parseMoney('  ₱12.50 ')).toBe(1250);
  });
  it('treats empty string as zero', () => {
    expect(parseMoney('')).toBe(0);
  });
  it('rejects negative numbers', () => {
    expect(() => parseMoney('-5')).toThrow(MoneyParseError);
  });
  it('rejects more than two decimals', () => {
    expect(() => parseMoney('12.501')).toThrow(MoneyParseError);
  });
  it('rejects non-numeric input', () => {
    expect(() => parseMoney('abc')).toThrow(MoneyParseError);
  });
  it('parses zero whole pesos with only centavos', () => {
    expect(parseMoney('0.05')).toBe(5);
  });
  it('parses explicit zero', () => {
    expect(parseMoney('0')).toBe(0);
  });
});

describe('formatMoney', () => {
  it('formats zero', () => {
    expect(formatMoney(0)).toBe('₱0');
  });
  it('formats whole pesos without decimal', () => {
    expect(formatMoney(1200)).toBe('₱12');
  });
  it('formats fractional pesos with two decimals', () => {
    expect(formatMoney(1250)).toBe('₱12.50');
  });
  it('formats large amounts with thousands separator', () => {
    expect(formatMoney(234000)).toBe('₱2,340');
    expect(formatMoney(234050)).toBe('₱2,340.50');
  });
  it('formats single-digit centavos with leading zero', () => {
    expect(formatMoney(5)).toBe('₱0.05');
  });
});

describe('formatMoneyShort', () => {
  it('omits the peso symbol', () => {
    expect(formatMoneyShort(1250)).toBe('12.50');
    expect(formatMoneyShort(1200)).toBe('12');
  });
});

describe('isValidMoneyInput', () => {
  it.each([
    ['', true],
    ['1', true],
    ['12', true],
    ['12.', true],
    ['12.5', true],
    ['12.50', true],
    ['0.05', true],
  ])('accepts in-progress input %p', (input, expected) => {
    expect(isValidMoneyInput(input)).toBe(expected);
  });

  it.each([
    ['12.501', false],
    ['-1', false],
    ['abc', false],
    ['1.2.3', false],
  ])('rejects %p', (input) => {
    expect(isValidMoneyInput(input)).toBe(false);
  });
});
