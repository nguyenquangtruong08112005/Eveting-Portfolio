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

export const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&auto=format&fit=crop&q=80';

export const DEFAULT_CURRENCY = '₫';

type TranslateFn = (key: string, params?: Record<string, unknown>) => string;

export function formatPrice(price: number | null | undefined, t?: TranslateFn): string {
  if (price === null || price === undefined) return t ? t('common.contact') : 'Liên hệ';
  if (price === 0) return t ? t('common.free') : 'Miễn phí';
  return price.toLocaleString('vi-VN') + ' ' + DEFAULT_CURRENCY;
}

export function formatDate(timestamp: number, locale = 'vi-VN'): string {
  return new Date(timestamp).toLocaleDateString(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatShortDate(timestamp: number, locale = 'vi-VN'): string {
  return new Date(timestamp).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Category tags from DB → display labels (English keys, i18n-agnostic)
// Components use useTranslations('navbar.categories') for localized labels
export const CATEGORY_MAP: Record<string, string[]> = {
  music: ['music', 'concert', 'edm', 'pop', 'hip-hop', 'v-pop', 'show'],
  arts: ['art', 'exhibition', 'culture', 'museum', 'fashion'],
  nightlife: ['nightlife', 'dj', 'club', 'party', 'festival'],
  sports: ['sports', 'marathon', 'running', 'fitness', 'yoga', 'wellness'],
  tech: ['tech', 'conference', 'expo', 'business', 'networking', 'esports', 'gaming', 'online'],
};

// Map i18n category keys to DB tag slugs for filtering
export const I18N_KEY_TO_CATEGORY: Record<string, string> = {
  music: 'music',
  arts: 'arts',
  sports: 'sports',
  workshop: 'tech',
  tours: 'nightlife',
  other: 'nightlife',
};

export function matchCategory(eventCategories: string[] | undefined, activeCategory: string): boolean {
  if (!activeCategory || activeCategory === 'all' || activeCategory === 'Tất cả') return true;
  if (!eventCategories || eventCategories.length === 0) return false;

  // Try matching by i18n key → DB slug
  const slug = I18N_KEY_TO_CATEGORY[activeCategory];
  const targetTags = CATEGORY_MAP[slug] || CATEGORY_MAP[activeCategory] || [];

  return eventCategories.some(cat =>
    targetTags.includes(cat.toLowerCase()) ||
    cat.toLowerCase() === activeCategory.toLowerCase()
  );
}

/** Enrich event from API with generic fallback for missing image/description */
export function enrichEvent(event: import('@/types').Event): import('@/types').Event {
  const isPlaceholderImage = !event.imageUrl || event.imageUrl.includes('tkbcdn.com');
  return {
    ...event,
    imageUrl: isPlaceholderImage ? FALLBACK_IMAGE : event.imageUrl,
    description: event.description || `${event.name} — event at ${event.city || 'Vietnam'}.`,
  };
}
