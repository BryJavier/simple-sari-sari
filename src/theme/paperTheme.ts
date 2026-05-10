import { MD3LightTheme, type MD3Theme } from 'react-native-paper';
import { palette } from './palette';
import { scaleTypography } from './typography';

export function buildPaperTheme(textScale: number): MD3Theme {
  const t = scaleTypography(textScale);
  return {
    ...MD3LightTheme,
    colors: {
      ...MD3LightTheme.colors,
      primary: palette.primary,
      onPrimary: '#FFFFFF',
      surface: palette.card,
      surfaceVariant: palette.softBg,
      background: palette.surface,
      onBackground: palette.text,
      onSurface: palette.text,
      onSurfaceVariant: palette.text3,
      outline: palette.border,
      outlineVariant: palette.borderLight,
      error: palette.danger,
    },
    fonts: {
      ...MD3LightTheme.fonts,
      default: { ...MD3LightTheme.fonts.default, fontFamily: 'PlusJakartaSans_500Medium', ...t.body, fontWeight: '500' },
      bodyLarge: { ...MD3LightTheme.fonts.bodyLarge, fontFamily: 'PlusJakartaSans_500Medium', ...t.body },
      bodyMedium: { ...MD3LightTheme.fonts.bodyMedium, fontFamily: 'PlusJakartaSans_500Medium', ...t.body },
      bodySmall: { ...MD3LightTheme.fonts.bodySmall, fontFamily: 'PlusJakartaSans_500Medium', fontSize: t.caption.fontSize, fontWeight: '500' },
      titleLarge: { ...MD3LightTheme.fonts.titleLarge, fontFamily: 'PlusJakartaSans_700Bold', ...t.title },
      titleMedium: { ...MD3LightTheme.fonts.titleMedium, fontFamily: 'PlusJakartaSans_700Bold', ...t.title, fontSize: t.title.fontSize - 2 },
      titleSmall: { ...MD3LightTheme.fonts.titleSmall, fontFamily: 'PlusJakartaSans_600SemiBold', ...t.tileName },
      labelLarge: { ...MD3LightTheme.fonts.labelLarge, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: t.body.fontSize, fontWeight: '600' },
      labelMedium: { ...MD3LightTheme.fonts.labelMedium, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: t.caption.fontSize, fontWeight: '600' },
      labelSmall: { ...MD3LightTheme.fonts.labelSmall, fontFamily: 'PlusJakartaSans_600SemiBold', ...t.caption },
      headlineLarge: { ...MD3LightTheme.fonts.headlineLarge, fontFamily: 'PlusJakartaSans_800ExtraBold', ...t.display },
      headlineMedium: { ...MD3LightTheme.fonts.headlineMedium, fontFamily: 'PlusJakartaSans_800ExtraBold', ...t.total },
      headlineSmall: { ...MD3LightTheme.fonts.headlineSmall, fontFamily: 'PlusJakartaSans_800ExtraBold', ...t.price },
      displayLarge: { ...MD3LightTheme.fonts.displayLarge, fontFamily: 'PlusJakartaSans_800ExtraBold', ...t.display },
      displayMedium: { ...MD3LightTheme.fonts.displayMedium, fontFamily: 'PlusJakartaSans_800ExtraBold', ...t.total },
      displaySmall: { ...MD3LightTheme.fonts.displaySmall, fontFamily: 'PlusJakartaSans_800ExtraBold', ...t.price },
    },
  };
}
