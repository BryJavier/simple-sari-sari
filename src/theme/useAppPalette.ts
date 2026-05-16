import { useMemo } from 'react';
import { useSettingsStore } from '@/store/settings';
import { deriveTokens, type Palette } from '@/theme/palette';
import { PRESET_HUES } from '@/theme/types';

export type { Palette };

export function useAppPalette(): Palette {
  const themePreset = useSettingsStore((s) => s.themePreset);
  const themeCustomHue = useSettingsStore((s) => s.themeCustomHue);
  const themeDarkMode = useSettingsStore((s) => s.themeDarkMode);

  return useMemo(() => {
    const hue = themePreset === 'custom' ? themeCustomHue : PRESET_HUES[themePreset];
    return deriveTokens(hue, themeDarkMode);
  }, [themePreset, themeCustomHue, themeDarkMode]);
}
