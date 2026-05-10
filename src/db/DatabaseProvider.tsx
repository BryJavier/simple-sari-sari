import { createContext, useContext, type ReactNode } from 'react';
import type { Database } from '@/db/types';

const DatabaseContext = createContext<Database | null>(null);

export function useDatabase(): Database {
  const db = useContext(DatabaseContext);
  if (!db) throw new Error('useDatabase must be used within DatabaseProvider');
  return db;
}

export function DatabaseProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
