import { create } from 'zustand';
import type { Database } from '@/db/types';
import { getAllSettings, setSetting } from '@/db/queries/settings';
import {
  type TextSizeKey,
  type DensityKey,
  TEXT_SIZE_SCALE,
  DENSITY_COLUMNS,
  DEFAULT_TEXT_SIZE,
  DEFAULT_DENSITY,
} from '@/theme/types';

export const DEFAULT_STORE_NAME = 'My Sari-Sari Store';

interface SettingsState {
  textSize: TextSizeKey;
  density: DensityKey;
  storeName: string;
  hydrated: boolean;
  setTextSize: (db: Database, value: TextSizeKey) => Promise<void>;
  setDensity: (db: Database, value: DensityKey) => Promise<void>;
  setStoreName: (db: Database, value: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  textSize: DEFAULT_TEXT_SIZE,
  density: DEFAULT_DENSITY,
  storeName: DEFAULT_STORE_NAME,
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
}));

function isTextSize(v: string | undefined): v is TextSizeKey {
  return v != null && v in TEXT_SIZE_SCALE;
}

function isDensity(v: string | undefined): v is DensityKey {
  return v != null && v in DENSITY_COLUMNS;
}

export async function hydrateSettings(db: Database): Promise<void> {
  const all = await getAllSettings(db);
  useSettingsStore.setState({
    textSize: isTextSize(all['textSize']) ? all['textSize'] : DEFAULT_TEXT_SIZE,
    density: isDensity(all['density']) ? all['density'] : DEFAULT_DENSITY,
    storeName: all['storeName'] ?? DEFAULT_STORE_NAME,
    hydrated: true,
  });
}
