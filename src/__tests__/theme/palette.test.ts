import { deriveTokens, hslToHex } from '@/theme/palette';

describe('hslToHex', () => {
  it('produces a valid 7-char hex string', () => {
    const result = hslToHex(200, 38, 33);
    expect(result).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('hue=0 high-sat is red-ish', () => {
    const hex = hslToHex(0, 100, 50);
    expect(hex.toLowerCase()).toBe('#ff0000');
  });

  it('saturation=0 is grey', () => {
    const hex = hslToHex(200, 0, 50);
    // r = g = b at 50% lightness
    expect(hex).toMatch(/^#808080$/i);
  });
});

describe('deriveTokens', () => {
  it('returns an object with all required keys', () => {
    const p = deriveTokens(200, false);
    const requiredKeys = [
      'text', 'text2', 'text3', 'primary', 'accent', 'muted',
      'border', 'borderLight', 'softBg', 'surface', 'card',
      'profit', 'utang', 'danger', 'warning', 'success',
      'successBg', 'warningBg', 'utangBg',
    ];
    for (const key of requiredKeys) {
      expect(p).toHaveProperty(key);
      expect((p as Record<string, string>)[key]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('light mode card is white', () => {
    expect(deriveTokens(200, false).card).toBe('#ffffff');
  });

  it('dark mode card is not white', () => {
    const dark = deriveTokens(200, true);
    expect(dark.card).not.toBe('#ffffff');
  });

  it('same hue, different dark mode → different primary', () => {
    const light = deriveTokens(210, false);
    const dark = deriveTokens(210, true);
    expect(light.primary).not.toBe(dark.primary);
  });

  it('different hues → different primary', () => {
    const a = deriveTokens(150, false);
    const b = deriveTokens(345, false);
    expect(a.primary).not.toBe(b.primary);
  });

  it('dark mode text is near-white', () => {
    const dark = deriveTokens(200, true);
    // #ebebeb or similar — lightness > 85%
    const r = parseInt(dark.text.slice(1, 3), 16);
    expect(r).toBeGreaterThan(200);
  });
});
