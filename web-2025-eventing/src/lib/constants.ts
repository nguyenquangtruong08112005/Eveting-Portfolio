// Design tokens as TypeScript constants — matches DESIGN.md and mobile Color.kt
// Single source of truth for all color references in components

export const colors = {
  // Primary
  primary: '#F76B10',
  primaryDark: '#FF8F66',
  primaryContainer: '#3E1C0A',
  onPrimary: '#12141A',

  // Backgrounds & Surfaces
  background: '#12141A',
  surface: '#1E212B',
  surfaceHover: '#262A36',
  surfaceBorder: 'rgba(255,255,255,0.06)',

  // Secondary
  yellow: '#FBBE47',
  yellowDark: '#FFD54F',
  blue: '#3B82F7',
  blueDark: '#64B5F6',
  green: '#2D9687',
  greenDark: '#81C784',
  darkOrange: '#8C3700',

  // Semantic
  info: '#64B5F6',
  success: '#81C784',
  warning: '#FFD54F',
  error: '#E57373',

  // Text
  textPrimary: '#E8EAED',
  textSecondary: '#B0B3B8',
  textMuted: '#6B7280',
} as const;

export const HOLD_TIMER_SECONDS = 600; // 10 minutes seat hold

export const CURRENCY_LOCALE = 'vi-VN';

export function formatPrice(price: number): string {
  if (price === 0) return 'Miễn phí';
  return price.toLocaleString(CURRENCY_LOCALE) + ' ₫';
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatShortDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('vi-VN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
