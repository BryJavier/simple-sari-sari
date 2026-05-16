import { useMemo, type ReactNode } from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { useSettingsStore } from '@/store/settings';
import { TEXT_SIZE_SCALE } from '@/theme/types';
import { buildPaperTheme } from '@/theme/paperTheme';
import { useAppPalette } from '@/theme/useAppPalette';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const textSize = useSettingsStore((s) => s.textSize);
  const themeDarkMode = useSettingsStore((s) => s.themeDarkMode);
  const palette = useAppPalette();
  const theme = useMemo(
    () => buildPaperTheme(palette, TEXT_SIZE_SCALE[textSize], themeDarkMode),
    [palette, textSize, themeDarkMode],
  );
  return <PaperProvider theme={theme}>{children}</PaperProvider>;
}
