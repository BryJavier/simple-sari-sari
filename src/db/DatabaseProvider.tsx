import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import type { Database } from '@/db/types';
import { openExpoDatabase } from '@/db/expoClient';
import { applyMigrations } from '@/db/migrations';
import { hydrateSettings } from '@/store/settings';
import { deriveTokens } from '@/theme/palette';
import { useSettingsStore } from '@/store/settings';
import { PRESET_HUES } from '@/theme/types';

const DatabaseContext = createContext<Database | null>(null);

export function useDatabase(): Database {
  const db = useContext(DatabaseContext);
  if (!db) throw new Error('useDatabase must be used within DatabaseProvider');
  return db;
}

// DatabaseProvider renders before the theme is hydrated, so we derive the
// loading/error palette directly from the store's current (pre-hydration) state
// rather than calling useAppPalette(), which would create a circular dependency.
export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Database | null>(null);
  const [error, setError] = useState<string | null>(null);

  const themePreset = useSettingsStore((s) => s.themePreset);
  const themeCustomHue = useSettingsStore((s) => s.themeCustomHue);
  const themeDarkMode = useSettingsStore((s) => s.themeDarkMode);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const opened = await openExpoDatabase();
        await applyMigrations(opened);
        await hydrateSettings(opened);
        if (!cancelled) setDb(opened);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Database failed to initialize');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const hue = themePreset === 'custom' ? themeCustomHue : PRESET_HUES[themePreset as Exclude<typeof themePreset, 'custom'>];
  const p = deriveTokens(hue, themeDarkMode);

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: p.surface, padding: 24 }}>
        <Text style={{ color: p.danger, textAlign: 'center' }}>{error}</Text>
      </View>
    );
  }

  if (!db) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: p.surface }}>
        <ActivityIndicator color={p.primary} />
      </View>
    );
  }

  return <DatabaseContext.Provider value={db}>{children}</DatabaseContext.Provider>;
}
