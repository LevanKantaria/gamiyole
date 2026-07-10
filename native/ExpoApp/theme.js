// Central design system for Gamiyole.
// Every screen/component should pull colors, spacing and typography from here
// so the app stays visually consistent.

export const colors = {
  primary: '#4361ee',
  primaryDark: '#2f4bd1',
  primaryLight: '#eef1ff',

  success: '#10b981',
  successLight: '#ecfdf5',
  warning: '#f59e0b',
  danger: '#ef4444',
  dangerLight: '#fef2f2',
  star: '#fbbf24',

  text: '#1f2937',
  textMuted: '#6b7280',
  textFaint: '#9ca3af',

  background: '#f3f4f6',
  surface: '#ffffff',
  surfaceAlt: '#f1f5f9',
  border: '#e5e7eb',

  white: '#ffffff',
  black: '#111827',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
};

export const typography = {
  h1: { fontSize: 28, fontWeight: '700', color: colors.text },
  h2: { fontSize: 22, fontWeight: '700', color: colors.text },
  h3: { fontSize: 18, fontWeight: '600', color: colors.text },
  body: { fontSize: 16, color: colors.text },
  bodyMuted: { fontSize: 16, color: colors.textMuted },
  caption: { fontSize: 13, color: colors.textMuted },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
};

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  button: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
};

export const DEFAULT_AVATAR =
  'https://t3.ftcdn.net/jpg/03/46/83/96/360_F_346839683_6nAPzbhpSkIpb8pmAwufkC7c5eD7wYws.jpg';

export default { colors, spacing, radius, typography, shadows, DEFAULT_AVATAR };
