export type TextSizeKey = 'small' | 'medium' | 'large' | 'xlarge';
export type DensityKey = 'compact' | 'comfortable' | 'spacious';
export type ThemePreset = 'default' | 'ocean' | 'forest' | 'rose' | 'sunset' | 'custom';

export const TEXT_SIZE_SCALE: Record<TextSizeKey, number> = {
  small: 0.9,
  medium: 1.0,
  large: 1.15,
  xlarge: 1.3,
};

export const DENSITY_COLUMNS: Record<DensityKey, { phone: number; tablet: number }> = {
  compact: { phone: 3, tablet: 4 },
  comfortable: { phone: 2, tablet: 3 },
  spacious: { phone: 2, tablet: 3 },
};

export const DENSITY_TILE_PADDING: Record<DensityKey, number> = {
  compact: 10,
  comfortable: 14,
  spacious: 18,
};

// Hue (0–359°) for each named preset
export const PRESET_HUES: Record<Exclude<ThemePreset, 'custom'>, number> = {
  default: 200,
  ocean: 210,
  forest: 150,
  rose: 345,
  sunset: 28,
};

export const DEFAULT_TEXT_SIZE: TextSizeKey = 'medium';
export const DEFAULT_DENSITY: DensityKey = 'comfortable';
export const DEFAULT_THEME_PRESET: ThemePreset = 'default';
export const DEFAULT_THEME_CUSTOM_HUE = 210;
export const DEFAULT_THEME_DARK_MODE = false;
