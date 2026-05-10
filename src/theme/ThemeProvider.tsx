import { useMemo, type ReactNode } from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { useSettingsStore } from '@/store/settings';
import { TEXT_SIZE_SCALE } from '@/theme/types';
import { buildPaperTheme } from '@/theme/paperTheme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const textSize = useSettingsStore((s) => s.textSize);
  const theme = useMemo(() => buildPaperTheme(TEXT_SIZE_SCALE[textSize]), [textSize]);
  return <PaperProvider theme={theme}>{children}</PaperProvider>;
}
