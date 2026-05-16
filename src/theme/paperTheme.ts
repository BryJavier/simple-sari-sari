import { MD3LightTheme, MD3DarkTheme, type MD3Theme } from 'react-native-paper';
import type { Palette } from '@/theme/palette';
import { scaleTypography } from './typography';

export function buildPaperTheme(p: Palette, textScale: number, dark: boolean): MD3Theme {
  const t = scaleTypography(textScale);
  const base = dark ? MD3DarkTheme : MD3LightTheme;
  return {
    ...base,
    dark,
    colors: {
      ...base.colors,
      primary: p.primary,
      onPrimary: dark ? p.surface : '#ffffff',
      surface: p.card,
      surfaceVariant: p.softBg,
      background: p.surface,
      onBackground: p.text,
      onSurface: p.text,
      onSurfaceVariant: p.text3,
      outline: p.border,
      outlineVariant: p.borderLight,
      error: p.danger,
    },
    fonts: {
      ...base.fonts,
      default: { ...base.fonts.default, fontFamily: 'PlusJakartaSans_500Medium', ...t.body, fontWeight: '500' },
      bodyLarge: { ...base.fonts.bodyLarge, fontFamily: 'PlusJakartaSans_500Medium', ...t.body },
      bodyMedium: { ...base.fonts.bodyMedium, fontFamily: 'PlusJakartaSans_500Medium', ...t.body },
      bodySmall: { ...base.fonts.bodySmall, fontFamily: 'PlusJakartaSans_500Medium', fontSize: t.caption.fontSize, fontWeight: '500' },
      titleLarge: { ...base.fonts.titleLarge, fontFamily: 'PlusJakartaSans_700Bold', ...t.title },
      titleMedium: { ...base.fonts.titleMedium, fontFamily: 'PlusJakartaSans_700Bold', ...t.title, fontSize: t.title.fontSize - 2 },
      titleSmall: { ...base.fonts.titleSmall, fontFamily: 'PlusJakartaSans_600SemiBold', ...t.tileName },
      labelLarge: { ...base.fonts.labelLarge, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: t.body.fontSize, fontWeight: '600' },
      labelMedium: { ...base.fonts.labelMedium, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: t.caption.fontSize, fontWeight: '600' },
      labelSmall: { ...base.fonts.labelSmall, fontFamily: 'PlusJakartaSans_600SemiBold', ...t.caption },
      headlineLarge: { ...base.fonts.headlineLarge, fontFamily: 'PlusJakartaSans_800ExtraBold', ...t.display },
      headlineMedium: { ...base.fonts.headlineMedium, fontFamily: 'PlusJakartaSans_800ExtraBold', ...t.total },
      headlineSmall: { ...base.fonts.headlineSmall, fontFamily: 'PlusJakartaSans_800ExtraBold', ...t.price },
      displayLarge: { ...base.fonts.displayLarge, fontFamily: 'PlusJakartaSans_800ExtraBold', ...t.display },
      displayMedium: { ...base.fonts.displayMedium, fontFamily: 'PlusJakartaSans_800ExtraBold', ...t.total },
      displaySmall: { ...base.fonts.displaySmall, fontFamily: 'PlusJakartaSans_800ExtraBold', ...t.price },
    },
  };
}
