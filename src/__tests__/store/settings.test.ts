import { openTestDatabase } from '@/db/testClient';
import { applyMigrations } from '@/db/migrations';
import { setSetting } from '@/db/queries/settings';
import { useSettingsStore, hydrateSettings, DEFAULT_STORE_NAME } from '@/store/settings';
import {
  DEFAULT_TEXT_SIZE,
  DEFAULT_DENSITY,
  DEFAULT_THEME_PRESET,
  DEFAULT_THEME_CUSTOM_HUE,
  DEFAULT_THEME_DARK_MODE,
} from '@/theme/types';

beforeEach(() => {
  useSettingsStore.setState({
    textSize: DEFAULT_TEXT_SIZE,
    density: DEFAULT_DENSITY,
    storeName: DEFAULT_STORE_NAME,
    themePreset: DEFAULT_THEME_PRESET,
    themeCustomHue: DEFAULT_THEME_CUSTOM_HUE,
    themeDarkMode: DEFAULT_THEME_DARK_MODE,
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

describe('theme settings', () => {
  it('starts with default theme values before hydration', () => {
    const s = useSettingsStore.getState();
    expect(s.themePreset).toBe('default');
    expect(s.themeCustomHue).toBe(210);
    expect(s.themeDarkMode).toBe(false);
  });

  it('hydrates theme preset from database', async () => {
    const db = openTestDatabase();
    await applyMigrations(db);
    await setSetting(db, 'themePreset', 'ocean');
    await setSetting(db, 'themeCustomHue', '42');
    await setSetting(db, 'themeDarkMode', '1');

    await hydrateSettings(db);

    const s = useSettingsStore.getState();
    expect(s.themePreset).toBe('ocean');
    expect(s.themeCustomHue).toBe(42);
    expect(s.themeDarkMode).toBe(true);
    await db.close();
  });

  it('falls back to default for invalid themePreset', async () => {
    const db = openTestDatabase();
    await applyMigrations(db);
    await setSetting(db, 'themePreset', 'unicorn');

    await hydrateSettings(db);

    expect(useSettingsStore.getState().themePreset).toBe('default');
    await db.close();
  });

  it('falls back to default for out-of-range themeCustomHue', async () => {
    const db = openTestDatabase();
    await applyMigrations(db);
    await setSetting(db, 'themeCustomHue', '999');

    await hydrateSettings(db);

    expect(useSettingsStore.getState().themeCustomHue).toBe(210);
    await db.close();
  });

  it('persists themePreset on update', async () => {
    const db = openTestDatabase();
    await applyMigrations(db);
    await hydrateSettings(db);

    await useSettingsStore.getState().setThemePreset(db, 'forest');

    expect(useSettingsStore.getState().themePreset).toBe('forest');
    const row = await db.get<{ value: string }>(
      "SELECT value FROM settings WHERE key='themePreset'",
    );
    expect(row?.value).toBe('forest');
    await db.close();
  });

  it('persists themeDarkMode on update', async () => {
    const db = openTestDatabase();
    await applyMigrations(db);
    await hydrateSettings(db);

    await useSettingsStore.getState().setThemeDarkMode(db, true);

    expect(useSettingsStore.getState().themeDarkMode).toBe(true);
    const row = await db.get<{ value: string }>(
      "SELECT value FROM settings WHERE key='themeDarkMode'",
    );
    expect(row?.value).toBe('1');
    await db.close();
  });
});
