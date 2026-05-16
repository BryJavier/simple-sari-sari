export function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number): string => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export interface Palette {
  text: string;
  text2: string;
  text3: string;
  primary: string;
  accent: string;
  muted: string;
  border: string;
  borderLight: string;
  softBg: string;
  surface: string;
  card: string;
  profit: string;
  utang: string;
  danger: string;
  warning: string;
  success: string;
  successBg: string;
  warningBg: string;
  utangBg: string;
}

export function deriveTokens(hue: number, dark: boolean): Palette {
  const h = hue;
  if (!dark) {
    return {
      text: '#212121',
      text2: '#263238',
      text3: '#616161',
      primary: hslToHex(h, 38, 33),
      accent: hslToHex(h, 28, 44),
      muted: hslToHex(h, 15, 60),
      border: hslToHex(h, 12, 80),
      borderLight: hslToHex(h, 8, 92),
      softBg: hslToHex(h, 8, 93),
      surface: hslToHex(h, 5, 98),
      card: '#ffffff',
      profit: '#2e7d32',
      utang: '#e65100',
      danger: '#c62828',
      warning: '#f57c00',
      success: '#2e7d32',
      successBg: '#e8f5e9',
      warningBg: '#fff8e1',
      utangBg: '#fff3e0',
    };
  }
  return {
    text: hslToHex(0, 0, 92),
    text2: hslToHex(0, 0, 88),
    text3: hslToHex(0, 0, 58),
    primary: hslToHex(h, 55, 65),
    accent: hslToHex(h, 40, 72),
    muted: hslToHex(h, 20, 48),
    border: hslToHex(h, 12, 25),
    borderLight: hslToHex(h, 8, 18),
    softBg: hslToHex(h, 10, 13),
    surface: hslToHex(h, 10, 10),
    card: hslToHex(h, 8, 15),
    profit: '#66bb6a',
    utang: '#ffa040',
    danger: '#ef5350',
    warning: '#ffb74d',
    success: '#66bb6a',
    successBg: '#1b5e20',
    warningBg: '#4e342e',
    utangBg: '#4e2a04',
  };
}
