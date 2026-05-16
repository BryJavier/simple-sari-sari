import { create } from 'zustand';
import type { Database } from '@/db/types';
import { getAllSettings, setSetting } from '@/db/queries/settings';
import {
  type TextSizeKey,
  type DensityKey,
  type ThemePreset,
  TEXT_SIZE_SCALE,
  DENSITY_COLUMNS,
  PRESET_HUES,
  DEFAULT_TEXT_SIZE,
  DEFAULT_DENSITY,
  DEFAULT_THEME_PRESET,
  DEFAULT_THEME_CUSTOM_HUE,
  DEFAULT_THEME_DARK_MODE,
} from '@/theme/types';

export const DEFAULT_STORE_NAME = 'My Sari-Sari Store';

interface SettingsState {
  textSize: TextSizeKey;
  density: DensityKey;
  storeName: string;
  themePreset: ThemePreset;
  themeCustomHue: number;
  themeDarkMode: boolean;
  hydrated: boolean;
  setTextSize: (db: Database, value: TextSizeKey) => Promise<void>;
  setDensity: (db: Database, value: DensityKey) => Promise<void>;
  setStoreName: (db: Database, value: string) => Promise<void>;
  setThemePreset: (db: Database, value: ThemePreset) => Promise<void>;
  setThemeCustomHue: (db: Database, value: number) => Promise<void>;
  setThemeDarkMode: (db: Database, value: boolean) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  textSize: DEFAULT_TEXT_SIZE,
  density: DEFAULT_DENSITY,
  storeName: DEFAULT_STORE_NAME,
  themePreset: DEFAULT_THEME_PRESET,
  themeCustomHue: DEFAULT_THEME_CUSTOM_HUE,
  themeDarkMode: DEFAULT_THEME_DARK_MODE,
  hydrated: false,
  setTextSize: async (db, value) => {
    await setSetting(db, 'textSize', value);
    set({ textSize: value });
  },
  setDensity: async (db, value) => {
    await setSetting(db, 'density', value);
    set({ density: value });
  },
  setStoreName: async (db, value) => {
    await setSetting(db, 'storeName', value);
    set({ storeName: value });
  },
  setThemePreset: async (db, value) => {
    await setSetting(db, 'themePreset', value);
    set({ themePreset: value });
  },
  setThemeCustomHue: async (db, value) => {
    await setSetting(db, 'themeCustomHue', String(value));
    set({ themeCustomHue: value });
  },
  setThemeDarkMode: async (db, value) => {
    await setSetting(db, 'themeDarkMode', value ? '1' : '0');
    set({ themeDarkMode: value });
  },
}));

function isTextSize(v: string | undefined): v is TextSizeKey {
  return v != null && v in TEXT_SIZE_SCALE;
}

function isDensity(v: string | undefined): v is DensityKey {
  return v != null && v in DENSITY_COLUMNS;
}

function isThemePreset(v: string | undefined): v is ThemePreset {
  if (v == null) return false;
  return (v as ThemePreset) in { ...PRESET_HUES, custom: true };
}

function parseHue(v: string | undefined): number | null {
  if (v == null) return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 && n <= 359 ? n : null;
}

export async function hydrateSettings(db: Database): Promise<void> {
  const all = await getAllSettings(db);
  useSettingsStore.setState({
    textSize: isTextSize(all['textSize']) ? all['textSize'] : DEFAULT_TEXT_SIZE,
    density: isDensity(all['density']) ? all['density'] : DEFAULT_DENSITY,
    storeName: all['storeName'] ?? DEFAULT_STORE_NAME,
    themePreset: isThemePreset(all['themePreset']) ? all['themePreset'] : DEFAULT_THEME_PRESET,
    themeCustomHue: parseHue(all['themeCustomHue']) ?? DEFAULT_THEME_CUSTOM_HUE,
    themeDarkMode: all['themeDarkMode'] === '1',
    hydrated: true,
  });
}
