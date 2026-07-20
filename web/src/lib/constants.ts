// Design tokens as TypeScript constants — matches DESIGN.md v3.0 (Ember & Tide).
// NOTE: For UI styling, prefer CSS variables (var(--primary)) over these hex values.
// These constants are for places that cannot use CSS vars (e.g. inline chart configs,
// canvas rendering, server-side SVG). Do NOT use them as a substitute for tokens in JSX.

import type { CategoryKey, CategoryDef } from '@/types/category';

export type { CategoryKey, CategoryDef };

export const colors = {
  // Primary (Orange)
  primary: '#F97316',
  primaryDark: '#EA580C',
  primaryLight: '#FB923C',
  primaryContainer: '#FFF7ED',
  onPrimary: '#FFFFFF',

  // Accent (Teal)
  accent: '#0D9488',
  accentDark: '#0F766E',
  accentLight: '#14B8A6',

  // Semantic
  success: '#16A34A',
  warning: '#D97706',
  error: '#DC2626',
  info: '#0EA5E9',

  // Chart series (must mirror --chart-1..5 in globals.css)
  chart: ['#F97316', '#0D9488', '#2563EB', '#16A34A', '#DC2626'],
} as const;

export const HOLD_TIMER_SECONDS = 600; // 10 minutes seat hold

export const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&auto=format&fit=crop&q=80';

export const DEFAULT_CURRENCY = '₫';

type TranslateFn = (key: string, params?: Record<string, unknown>) => string;

export function formatPrice(price: number | null | undefined, t?: TranslateFn): string {
  if (price === null || price === undefined) return t ? t('common.contact') : 'Liên hệ';
  if (price === 0) return t ? t('common.free') : 'Miễn phí';
  return price.toLocaleString('vi-VN') + ' ' + DEFAULT_CURRENCY;
}

export function formatDate(timestamp: number | string | Date, locale = 'vi-VN'): string {
  const d = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatShortDate(timestamp: number | string | Date, locale = 'vi-VN'): string {
  const d = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Canonical category system — single source of truth.
 *
 * Types: `types/category.ts` (CategoryKey, CategoryDef).
 * Runtime table + helpers: this file.
 *
 * A category has: an i18n key (used in navbar/home translations), a slug
 * (used in DB tags and /events/search), and the set of DB tag aliases that
 * roll up to it.
 */
export const CATEGORIES: CategoryDef[] = [
  {
    key: 'music',
    slug: 'music',
    aliases: ['music', 'concert', 'edm', 'pop', 'hip-hop', 'v-pop', 'show', 'nhạc', 'âm nhạc'],
  },
  {
    key: 'arts',
    slug: 'arts',
    aliases: ['art', 'arts', 'exhibition', 'culture', 'museum', 'fashion', 'theater', 'theatre', 'nghệ thuật', 'sân khấu'],
  },
  {
    key: 'sports',
    slug: 'sports',
    aliases: ['sports', 'sport', 'marathon', 'running', 'fitness', 'yoga', 'wellness', 'thể thao'],
  },
  {
    key: 'workshop',
    slug: 'workshop',
    aliases: ['workshop', 'conference', 'expo', 'business', 'networking', 'education', 'seminar', 'hội thảo'],
  },
  {
    key: 'nightlife',
    slug: 'nightlife',
    aliases: ['nightlife', 'dj', 'club', 'party', 'festival', 'bar'],
  },
  {
    key: 'tech',
    slug: 'tech',
    aliases: ['tech', 'technology', 'esports', 'gaming', 'online', 'công nghệ'],
  },
];

/** Ordered list of canonical category keys (no empty "all" sentinel). */
export const CATEGORY_KEYS: CategoryKey[] = CATEGORIES.map((c) => c.key);

/**
 * Category filter options for search / discovery UI.
 * Leading empty string = "all categories".
 */
export const SEARCH_CATEGORY_OPTIONS: readonly ('' | CategoryKey)[] = [
  '',
  ...CATEGORY_KEYS,
] as const;

/** Map any DB tag / display label → canonical CategoryKey (case-insensitive). */
export function resolveCategoryKey(raw: string | undefined | null): CategoryKey | null {
  if (!raw) return null;
  const needle = raw.toLowerCase().trim();
  for (const def of CATEGORIES) {
    if (def.slug === needle || def.key === needle) return def.key;
    if (def.aliases.includes(needle)) return def.key;
  }
  return null;
}

/**
 * Does an event's category list match the active filter?
 * `activeCategory` may be an i18n key, a slug, a display label, or the
 * sentinel values "all" / "Tất cả".
 */
export function matchCategory(
  eventCategories: string[] | undefined,
  activeCategory: string
): boolean {
  if (!activeCategory) return true;
  const lowered = activeCategory.toLowerCase();
  if (lowered === 'all' || activeCategory === 'Tất cả') return true;
  if (!eventCategories || eventCategories.length === 0) return false;

  const targetKey = resolveCategoryKey(activeCategory);
  if (!targetKey) {
    // Unknown filter — fall back to direct string match
    return eventCategories.some((c) => c.toLowerCase().includes(lowered));
  }

  const def = CATEGORIES.find((c) => c.key === targetKey)!;
  return eventCategories.some((cat) => {
    const key = resolveCategoryKey(cat);
    return key === targetKey || def.aliases.includes(cat.toLowerCase());
  });
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

/** Filter out internal / smoke / lifecycle test events from public listings. */
export function isPublicEvent(event: { id?: string; name?: string }): boolean {
  if (!event || !event.name) return false;
  const name = event.name.toLowerCase();
  if (name.includes('smoke') || name.includes('lifecycle')) return false;
  if (event.id && /^evt_07/i.test(event.id)) return false;
  return true;
}

/**
 * Localize a raw DB category tag for display.
 *
 * Tries (1) the canonical category key via the translator, falling back to
 * (2) a humanized version of the tag itself. Never throws.
 *
 * Usage:
 *   const t = useTranslations('navbar.categories');
 *   localizeCategory('v-pop', t);   // -> localized "Music" label or "V-Pop"
 */
export function localizeCategory(
  cat: string,
  tCat?: (key: string) => string
): string {
  if (!cat) return '';
  const key = resolveCategoryKey(cat);
  if (key && tCat) {
    try {
      return tCat(key);
    } catch {
      /* fall through to humanize */
    }
  }
  return humanizeTag(cat);
}

function humanizeTag(cat: string): string {
  const lower = cat.toLowerCase();
  // Preserve well-known acronyms / stylized forms
  const known: Record<string, string> = {
    edm: 'EDM',
    'hip-hop': 'Hip-Hop',
    'v-pop': 'V-Pop',
    esports: 'Esports',
    online: 'Online',
    nightlife: 'Nightlife',
    networking: 'Networking',
    wellness: 'Wellness',
  };
  if (known[lower]) return known[lower];
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}
