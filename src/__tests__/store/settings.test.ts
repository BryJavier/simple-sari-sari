import { openTestDatabase } from '@/db/testClient';
import { applyMigrations } from '@/db/migrations';
import { setSetting } from '@/db/queries/settings';
import { useSettingsStore, hydrateSettings, DEFAULT_STORE_NAME } from '@/store/settings';
import { DEFAULT_TEXT_SIZE, DEFAULT_DENSITY } from '@/theme/types';

beforeEach(() => {
  // Reset store to defaults between tests
  useSettingsStore.setState({
    textSize: DEFAULT_TEXT_SIZE,
    density: DEFAULT_DENSITY,
    storeName: DEFAULT_STORE_NAME,
    hydrated: false,
  });
});

describe('settings store', () => {
  it('starts with defaults before hydration', () => {
    const s = useSettingsStore.getState();
    expect(s.textSize).toBe(DEFAULT_TEXT_SIZE);
    expect(s.density).toBe(DEFAULT_DENSITY);
    expect(s.storeName).toBe(DEFAULT_STORE_NAME);
    expect(s.hydrated).toBe(false);
  });

  it('hydrates from the database', async () => {
    const db = openTestDatabase();
    await applyMigrations(db);
    await setSetting(db, 'textSize', 'large');
    await setSetting(db, 'density', 'spacious');
    await setSetting(db, 'storeName', 'My Store');

    await hydrateSettings(db);

    const s = useSettingsStore.getState();
    expect(s.textSize).toBe('large');
    expect(s.density).toBe('spacious');
    expect(s.storeName).toBe('My Store');
    expect(s.hydrated).toBe(true);
    await db.close();
  });

  it('persists on update', async () => {
    const db = openTestDatabase();
    await applyMigrations(db);
    await hydrateSettings(db);

    await useSettingsStore.getState().setTextSize(db, 'xlarge');

    expect(useSettingsStore.getState().textSize).toBe('xlarge');
    const row = await db.get<{ value: string }>(
      "SELECT value FROM settings WHERE key='textSize'",
    );
    expect(row?.value).toBe('xlarge');
    await db.close();
  });

  it('ignores unknown values from the DB', async () => {
    const db = openTestDatabase();
    await applyMigrations(db);
    await setSetting(db, 'textSize', 'gigantic'); // not a valid TextSizeKey

    await hydrateSettings(db);

    expect(useSettingsStore.getState().textSize).toBe(DEFAULT_TEXT_SIZE);
    await db.close();
  });
});
