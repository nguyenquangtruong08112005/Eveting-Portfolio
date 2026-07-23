'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { Search, TrendingUp, Sparkles, Loader2 } from 'lucide-react';
import { EventService } from '@/services/event.service';
import { enrichEvent, isPublicEvent, FALLBACK_IMAGE } from '@/lib/constants';
import type { Event } from '@/types';
import { cn } from '@/lib/utils';
import { SafeImage } from '@/components/shared/SafeImage';

const TRENDING_KEYS = [
  'music',
  'concert',
  'workshop',
  'hanoi',
  'hcm',
  'festival',
] as const;

interface SearchBarDropdownProps {
  className?: string;
  /** Compact mode for mobile sheet */
  compact?: boolean;
  onNavigate?: () => void;
}

/**
 * Navbar search: opens a dropdown with trending queries + suggested events.
 * Does not navigate until user picks a suggestion or submits the form.
 */
export function SearchBarDropdown({ className, compact, onNavigate }: SearchBarDropdownProps) {
  const t = useTranslations('common');
  const tSearch = useTranslations('search_page');
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Event[]>([]);
  const [trendingEvents, setTrendingEvents] = useState<Event[]>([]);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedTrendRef = useRef(false);

  // Close on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // Load trending once when dropdown first opens (cached list)
  const ensureTrending = useCallback(async () => {
    if (loadedTrendRef.current) return;
    loadedTrendRef.current = true;
    try {
      const data = await EventService.list(30);
      const list = (data.events || []).filter(isPublicEvent).map(enrichEvent).slice(0, 5);
      setTrendingEvents(list);
    } catch {
      setTrendingEvents([]);
    }
  }, []);

  const runSuggest = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSuggestions([]);
      setLoadingSuggest(false);
      return;
    }
    setLoadingSuggest(true);
    try {
      const data = await EventService.search({ q: q.trim(), limit: 6, page: 1 });
      setSuggestions((data.events || []).filter(isPublicEvent).map(enrichEvent));
    } catch {
      setSuggestions([]);
    } finally {
      setLoadingSuggest(false);
    }
  }, []);

  const onChange = (value: string) => {
    setQuery(value);
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSuggest(value), 450);
  };

  const goSearchPage = (q?: string, extra?: Record<string, string>) => {
    const qs = new URLSearchParams();
    const term = (q ?? query).trim();
    if (term) qs.set('q', term);
    if (extra) {
      for (const [k, v] of Object.entries(extra)) {
        if (v) qs.set(k, v);
      }
    }
    setOpen(false);
    onNavigate?.();
    router.push(qs.toString() ? `/search?${qs}` : '/search');
  };

  const goEvent = (id: string) => {
    setOpen(false);
    onNavigate?.();
    router.push(`/attendee/events/${id}`);
  };

  const onFocus = () => {
    setOpen(true);
    void ensureTrending();
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    goSearchPage();
  };

  const showSuggestions = query.trim().length > 0;
  const list = showSuggestions ? suggestions : trendingEvents;

  return (
    <div ref={rootRef} className={cn('relative w-full', className)}>
      <form onSubmit={onSubmit} className="relative w-full flex items-center">
        <div
          className={cn(
            'relative w-full flex items-center bg-[var(--surface)] border border-[var(--surface-border)] rounded-full overflow-hidden',
            'focus-within:border-[var(--primary)] focus-within:ring-2 focus-within:ring-[var(--primary)]/20 transition-all'
          )}
        >
          <Search className="absolute left-4 size-4 text-[var(--text-muted)] pointer-events-none" />
          <input
            type="search"
            autoComplete="off"
            placeholder={t('search_placeholder')}
            value={query}
            onChange={(e) => onChange(e.target.value)}
            onFocus={onFocus}
            className={cn(
              'w-full pl-11 bg-transparent text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm focus:outline-none border-none',
              compact ? 'pr-4 py-2.5' : 'pr-28 py-2.5'
            )}
            aria-label={t('search_placeholder')}
            aria-expanded={open}
            aria-controls="search-suggest-panel"
          />
          {!compact && (
            <button
              type="submit"
              className="absolute right-1 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-full bg-[var(--primary)] text-[var(--on-primary)] text-xs font-bold hover:bg-[var(--primary-dark)] active:scale-95 transition-all flex items-center gap-1 cursor-pointer btn-tactile"
            >
              {t('search_button')}
            </button>
          )}
        </div>
      </form>

      {open && (
        <div
          id="search-suggest-panel"
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] shadow-xl overflow-hidden max-h-[min(70vh,420px)] overflow-y-auto"
        >
          {/* Trending keywords */}
          <div className="px-4 pt-3 pb-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5 mb-2">
              <TrendingUp className="size-3.5 text-[var(--primary)]" />
              {tSearch('trending')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {TRENDING_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => goSearchPage(key)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold border border-[var(--surface-border)] bg-[var(--background)] text-[var(--text-secondary)] hover:border-[var(--primary)]/40 hover:text-[var(--primary)] cursor-pointer transition-colors"
                >
                  {key}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-[var(--surface-border)] px-2 py-2">
            <p className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-[var(--accent-brand)]" />
              {showSuggestions ? tSearch('suggestions') : tSearch('suggested_events')}
              {loadingSuggest && <Loader2 className="size-3 animate-spin ml-1" />}
            </p>

            {list.length === 0 && !loadingSuggest ? (
              <p className="px-2 py-4 text-xs text-[var(--text-muted)] text-center">
                {showSuggestions ? tSearch('no_suggestions') : tSearch('empty_trending')}
              </p>
            ) : (
              <ul className="space-y-0.5">
                {list.map((ev) => (
                  <li key={ev.id}>
                    <button
                      type="button"
                      onClick={() => goEvent(ev.id)}
                      className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-[var(--surface-hover)] text-left cursor-pointer transition-colors"
                    >
                      <div className="relative size-10 rounded-lg overflow-hidden shrink-0 bg-[var(--surface-hover)]">
                        <SafeImage
                          src={ev.imageUrl || FALLBACK_IMAGE}
                          alt=""
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                          {ev.name}
                        </p>
                        <p className="text-[10px] text-[var(--text-muted)] truncate">
                          {ev.city || ev.venueName || '—'}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-[var(--surface-border)] px-3 py-2">
            <button
              type="button"
              onClick={() => goSearchPage()}
              className="w-full text-center text-xs font-bold text-[var(--primary)] hover:underline py-1.5 cursor-pointer"
            >
              {tSearch('view_all_results')}
              {query.trim() ? ` “${query.trim()}”` : ''}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
