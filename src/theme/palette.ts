export const palette = {
  text: '#212121',
  text2: '#263238',
  text3: '#616161',
  primary: '#455A64',
  accent: '#607D8B',
  muted: '#90A4AE',
  border: '#CFD8DC',
  borderLight: '#ECEFF1',
  softBg: '#ECEFF1',
  surface: '#FAFAFA',
  card: '#FFFFFF',
  profit: '#2E7D32',
  utang: '#E65100',
  danger: '#C62828',
  warning: '#F57C00',
  success: '#2E7D32',
  successBg: '#E8F5E9',
  warningBg: '#FFF8E1',
  utangBg: '#FFF3E0',
} as const;

export type PaletteKey = keyof typeof palette;
