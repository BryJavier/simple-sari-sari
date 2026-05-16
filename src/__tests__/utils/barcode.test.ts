import {
  ean13CheckDigit,
  generateEAN13,
  isValidEAN13,
  ean13ToBars,
  generateBarcodeSVGString,
} from '@/utils/barcode';

describe('ean13CheckDigit', () => {
  it('returns the correct check digit for a known EAN-13', () => {
    // EAN-13: 5901234123457 — check digit is 7
    expect(ean13CheckDigit('590123412345')).toBe(7);
  });

  it('returns 0 when the sum is a multiple of 10', () => {
    // Manually craft a first-12 that produces check digit 0
    // 000000000000 → sum=0 → check=(10-0)%10=0
    expect(ean13CheckDigit('000000000000')).toBe(0);
  });
});

describe('isValidEAN13', () => {
  it('accepts a known valid EAN-13', () => {
    expect(isValidEAN13('5901234123457')).toBe(true);
  });

  it('rejects wrong length', () => {
    expect(isValidEAN13('123')).toBe(false);
    expect(isValidEAN13('12345678901234')).toBe(false);
  });

  it('rejects non-digits', () => {
    expect(isValidEAN13('590123412345A')).toBe(false);
  });

  it('rejects a barcode with wrong check digit', () => {
    expect(isValidEAN13('5901234123450')).toBe(false); // should end in 7
  });
});

describe('generateEAN13', () => {
  it('returns a 13-digit string', () => {
    const code = generateEAN13();
    expect(code).toMatch(/^\d{13}$/);
  });

  it('passes isValidEAN13', () => {
    for (let i = 0; i < 10; i++) {
      expect(isValidEAN13(generateEAN13())).toBe(true);
    }
  });

  it('starts with prefix 2 (internal-use range)', () => {
    const code = generateEAN13();
    expect(code[0]).toBe('2');
  });

  it('generates unique codes on consecutive calls', () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateEAN13()));
    // Extremely unlikely to generate the same code twice out of 20
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe('ean13ToBars', () => {
  it('returns a string of 95 characters', () => {
    // EAN-13 encodes to exactly 95 modules (excluding quiet zones)
    expect(ean13ToBars('5901234123457')).toHaveLength(95);
  });

  it('contains only 0 and 1 characters', () => {
    const bars = ean13ToBars('5901234123457');
    expect(bars).toMatch(/^[01]+$/);
  });

  it('starts with 101 (start guard) and ends with 101 (end guard)', () => {
    const bars = ean13ToBars('5901234123457');
    expect(bars.slice(0, 3)).toBe('101');
    expect(bars.slice(-3)).toBe('101');
  });

  it('contains 01010 center guard at position 45–49', () => {
    const bars = ean13ToBars('5901234123457');
    expect(bars.slice(45, 50)).toBe('01010');
  });
});

describe('generateBarcodeSVGString', () => {
  it('returns a string containing an SVG root element', () => {
    const svg = generateBarcodeSVGString('5901234123457');
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });

  it('includes the barcode value as text', () => {
    const svg = generateBarcodeSVGString('5901234123457');
    expect(svg).toContain('5901234123457');
  });

  it('includes rect elements for the bars', () => {
    const svg = generateBarcodeSVGString('5901234123457');
    expect(svg).toContain('<rect');
  });
});
