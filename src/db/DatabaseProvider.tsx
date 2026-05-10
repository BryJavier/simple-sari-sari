import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const opened = await openExpoDatabase();
      await applyMigrations(opened);
      await hydrateSettings(opened);
      if (!cancelled) setDb(opened);
    })();
    return () => { cancelled = true; };
  }, []);

  if (!db) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surface }}>
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }

  return <DatabaseContext.Provider value={db}>{children}</DatabaseContext.Provider>;
}
