/**
 * mobile/src/utils/theme.ts
 * Design tokens matching the web app's design language.
 * Use these constants throughout all mobile components for consistency.
 */

export const Colors = {
  // Brand
  primary:       '#10b981',   // electric emerald
  primaryLight:  '#d1fae5',   // emerald-100
  primaryHover:  '#047857',
  accent:        '#7c3aed',   // violet
  gold:          '#f59e0b',
  cyanGlow:      '#06b6d4',

  // Glass & Glow Effects
  emeraldGlow:   'rgba(16, 185, 129, 0.25)',
  violetGlow:    'rgba(124, 58, 237, 0.25)',
  glassSurface:  'rgba(255, 255, 255, 0.75)',
  glassBorder:   'rgba(255, 255, 255, 0.4)',
  glassSurfaceDark: 'rgba(16, 23, 41, 0.85)',
  glassBorderDark:  'rgba(255, 255, 255, 0.08)',

  // Status
  danger:        '#dc2626',
  warning:       '#d97706',
  success:       '#16a34a',
  info:          '#2563eb',

  // Light mode surfaces
  bgLight:       '#f6f8fc',
  surfaceLight:  '#ffffff',
  surface2Light: '#f1f5f9',
  borderLight:   '#e2e8f0',
  textLight:     '#0f172a',
  mutedLight:    '#64748b',

  // Dark mode surfaces
  bgDark:        '#050810',
  surfaceDark:   '#101729',
  surface2Dark:  '#0b1220',
  borderDark:    '#23304a',
  textDark:      '#f8fafc',
  mutedDark:     '#b1bfd4',
} as const;

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const;

export const Radius = {
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  '2xl': 24,
  full: 9999,
} as const;

export const FontSize = {
  xs:   11,
  sm:   13,
  base: 15,
  lg:   17,
  xl:   19,
  '2xl': 22,
  '3xl': 28,
  '4xl': 34,
} as const;

export const FontWeight = {
  normal:    '400' as const,
  medium:    '500' as const,
  semibold:  '600' as const,
  bold:      '700' as const,
  extrabold: '800' as const,
};

/** Get the right color set based on dark/light mode */
export function getColors(dark: boolean) {
  return {
    bg:       dark ? Colors.bgDark       : Colors.bgLight,
    surface:  dark ? Colors.surfaceDark  : Colors.surfaceLight,
    surface2: dark ? Colors.surface2Dark : Colors.surface2Light,
    border:   dark ? Colors.borderDark   : Colors.borderLight,
    text:     dark ? Colors.textDark     : Colors.textLight,
    muted:    dark ? Colors.mutedDark    : Colors.mutedLight,
    // Semantic colors deliberately shift by mode. This keeps labels, badges and
    // controls legible against both the light canvas and the near-black canvas.
    primary:  dark ? '#34d399' : '#047857',
    onPrimary: dark ? '#06281f' : '#f8fffc',
    accent:   dark ? '#c4b5fd' : '#6d28d9',
    gold:     dark ? '#fbbf24' : '#a16207',
    danger:   dark ? '#f87171' : '#b91c1c',
    warning:  dark ? '#fbbf24' : '#b45309',
    success:  dark ? '#4ade80' : '#15803d',
    info:     dark ? '#60a5fa' : '#1d4ed8',
  };
}
