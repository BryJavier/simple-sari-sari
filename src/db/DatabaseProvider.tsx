import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import type { Database } from '@/db/types';
import { openExpoDatabase } from '@/db/expoClient';
import { applyMigrations } from '@/db/migrations';
import { hydrateSettings } from '@/store/settings';
import { palette } from '@/theme/palette';

const DatabaseContext = createContext<Database | null>(null);

export function useDatabase(): Database {
  const db = useContext(DatabaseContext);
  if (!db) throw new Error('useDatabase must be used within DatabaseProvider');
  return db;
}

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Database | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surface, padding: 24 }}>
        <Text style={{ color: palette.danger, textAlign: 'center' }}>{error}</Text>
      </View>
    );
  }

  if (!db) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surface }}>
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }

  return <DatabaseContext.Provider value={db}>{children}</DatabaseContext.Provider>;
}
