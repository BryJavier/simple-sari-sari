export const baseTypography = {
  display: { fontSize: 24, fontWeight: '800' as const, letterSpacing: -0.48 },
  total: { fontSize: 22, fontWeight: '800' as const, letterSpacing: -0.44 },
  title: { fontSize: 18, fontWeight: '700' as const, letterSpacing: -0.18 },
  price: { fontSize: 18, fontWeight: '800' as const, letterSpacing: -0.36 },
  tileName: { fontSize: 14, fontWeight: '600' as const, letterSpacing: -0.14 },
  body: { fontSize: 14, fontWeight: '500' as const },
  caption: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.66 },
  pillLabel: { fontSize: 10, fontWeight: '700' as const, letterSpacing: 0.5 },
};

export type TypographyRole = keyof typeof baseTypography;

export function scaleTypography(scale: number) {
  const out = {} as Record<TypographyRole, (typeof baseTypography)[TypographyRole]>;
  (Object.keys(baseTypography) as TypographyRole[]).forEach((key) => {
    const t = baseTypography[key];
    out[key] = { ...t, fontSize: Math.round(t.fontSize * scale) };
  });
  return out;
}
