export type TextSizeKey = 'small' | 'medium' | 'large' | 'xlarge';
export type DensityKey = 'compact' | 'comfortable' | 'spacious';

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

export const DEFAULT_TEXT_SIZE: TextSizeKey = 'medium';
export const DEFAULT_DENSITY: DensityKey = 'comfortable';
