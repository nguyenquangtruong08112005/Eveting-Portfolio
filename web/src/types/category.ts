/**
 * Canonical event category model — single source of truth for typing.
 * Runtime table + helpers live in `lib/constants.ts`.
 */

export type CategoryKey =
  | 'music'
  | 'arts'
  | 'sports'
  | 'workshop'
  | 'nightlife'
  | 'tech';

export interface CategoryDef {
  /** i18n key under navbar.categories */
  key: CategoryKey;
  /** Canonical slug for filtering / URL */
  slug: string;
  /** DB tag aliases that roll up to this category */
  aliases: string[];
}
