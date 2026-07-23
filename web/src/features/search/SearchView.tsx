'use client';

import { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { Search, SlidersHorizontal, ChevronDown, Loader2, X } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { EventCard } from '@/components/events/EventCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { SkeletonGrid } from '@/components/shared/SkeletonGrid';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { EventService } from '@/services/event.service';
import {
  enrichEvent,
  isPublicEvent,
  SEARCH_CATEGORY_OPTIONS,
  type CategoryKey,
} from '@/lib/constants';
import type { Event } from '@/types';
import { cn } from '@/lib/utils';
import { HttpError } from '@/services/apiClient';

const PAGE_SIZE = 12;

type Filters = {
  q: string;
  category: string;
  city: string;
  dateFrom: string;
  dateTo: string;
  minPrice: string;
  maxPrice: string;
};

const emptyFilters: Filters = {
  q: '',
  category: '',
  city: '',
  dateFrom: '',
  dateTo: '',
  minPrice: '',
  maxPrice: '',
};

function countActiveFilters(f: Filters): number {
  let n = 0;
  if (f.category) n++;
  if (f.city.trim()) n++;
  if (f.dateFrom) n++;
  if (f.dateTo) n++;
  if (f.minPrice) n++;
  if (f.maxPrice) n++;
  return n;
}

function SearchViewContent() {
  const t = useTranslations('search_page');
  const tCat = useTranslations('navbar.categories');
  const tHome = useTranslations('home');
  const searchParams = useSearchParams();
  const router = useRouter();

  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [draft, setDraft] = useState<Filters>(emptyFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const [events, setEvents] = useState<Event[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);

  // Hydrate from URL once
  useEffect(() => {
    if (!searchParams) return;
    const next: Filters = {
      q: searchParams.get('q') || '',
      category: searchParams.get('category') || '',
      city: searchParams.get('city') || '',
      dateFrom: searchParams.get('dateFrom') || '',
      dateTo: searchParams.get('dateTo') || '',
      minPrice: searchParams.get('minPrice') || '',
      maxPrice: searchParams.get('maxPrice') || '',
    };
    setFilters(next);
    setDraft(next);
  }, [searchParams]);

  // Close filter panel on outside click
  useEffect(() => {
    if (!filterOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!filterRef.current?.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [filterOpen]);

  const fetchPage = useCallback(
    async (pageNum: number, replace: boolean) => {
      if (replace) {
        setLoading(true);
        setError('');
      } else {
        if (loadingMoreRef.current) return;
        loadingMoreRef.current = true;
        setLoadingMore(true);
      }

      try {
        const params: Parameters<typeof EventService.search>[0] = {
          limit: PAGE_SIZE,
          page: pageNum,
        };
        if (filters.q.trim()) params.q = filters.q.trim();
        if (filters.category) params.category = filters.category;
        if (filters.city.trim()) params.city = filters.city.trim();
        if (filters.dateFrom) params.dateFrom = filters.dateFrom;
        if (filters.dateTo) params.dateTo = filters.dateTo;
        if (filters.minPrice) params.minPrice = Number(filters.minPrice);
        if (filters.maxPrice) params.maxPrice = Number(filters.maxPrice);

        const data = await EventService.search(params);
        const list = (data.events || []).filter(isPublicEvent).map(enrichEvent);

        setEvents((prev) => (replace ? list : [...prev, ...list]));
        setTotal(data.total);
        setHasMore(data.hasMore ?? list.length >= PAGE_SIZE);
        setPage(pageNum);
      } catch (err: unknown) {
        console.error(err);
        const msg =
          err instanceof HttpError && err.status === 429
            ? t('rate_limited')
            : err instanceof Error
              ? err.message
              : t('error');
        setError(msg);
        if (replace) {
          setEvents([]);
          setTotal(0);
          setHasMore(false);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
        loadingMoreRef.current = false;
      }
    },
    [filters, t]
  );

  // Reset + load page 1 when applied filters change
  useEffect(() => {
    void fetchPage(1, true);
  }, [fetchPage]);

  // Infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loading && !loadingMoreRef.current) {
          void fetchPage(page + 1, false);
        }
      },
      { rootMargin: '240px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loading, page, fetchPage]);

  const applyDraftToUrl = () => {
    const qs = new URLSearchParams();
    if (draft.q.trim()) qs.set('q', draft.q.trim());
    if (draft.category) qs.set('category', draft.category);
    if (draft.city.trim()) qs.set('city', draft.city.trim());
    if (draft.dateFrom) qs.set('dateFrom', draft.dateFrom);
    if (draft.dateTo) qs.set('dateTo', draft.dateTo);
    if (draft.minPrice) qs.set('minPrice', draft.minPrice);
    if (draft.maxPrice) qs.set('maxPrice', draft.maxPrice);
    setFilterOpen(false);
    setFilters(draft);
    const s = qs.toString();
    router.push(s ? `/search?${s}` : '/search');
  };

  const clearFilters = () => {
    setDraft(emptyFilters);
    setFilters(emptyFilters);
    setFilterOpen(false);
    router.push('/search');
  };

  const categoryLabel = (key: '' | CategoryKey | string) => {
    if (!key) return t('all_categories');
    try {
      return tCat(key as CategoryKey);
    } catch {
      return key;
    }
  };

  const activeFilterCount = countActiveFilters(filters);

  return (
    <div className="flex-1 flex flex-col bg-[var(--background)] min-h-screen">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full flex-1">
        <SectionHeading title={t('title')} icon={Search} />
        <p className="text-xs text-[var(--text-muted)] -mt-4 mb-6">{t('subtitle')}</p>

        {/* Compact toolbar: keyword + filter button */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <form
            className="flex-1 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setFilters((f) => ({ ...f, q: draft.q }));
              const qs = new URLSearchParams();
              const next = { ...filters, q: draft.q };
              if (next.q.trim()) qs.set('q', next.q.trim());
              if (next.category) qs.set('category', next.category);
              if (next.city.trim()) qs.set('city', next.city.trim());
              if (next.dateFrom) qs.set('dateFrom', next.dateFrom);
              if (next.dateTo) qs.set('dateTo', next.dateTo);
              if (next.minPrice) qs.set('minPrice', next.minPrice);
              if (next.maxPrice) qs.set('maxPrice', next.maxPrice);
              router.push(qs.toString() ? `/search?${qs}` : '/search');
            }}
          >
            <Input
              value={draft.q}
              onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))}
              placeholder={t('query_placeholder')}
              className="rounded-xl h-11 bg-[var(--background)] flex-1"
            />
            <Button
              type="submit"
              className="btn-primary-gradient rounded-xl font-bold text-[var(--on-primary)] border-none cursor-pointer shrink-0"
            >
              <Search className="size-4" />
            </Button>
          </form>

          <div className="relative" ref={filterRef}>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDraft(filters);
                setFilterOpen((o) => !o);
              }}
              className="rounded-xl h-11 cursor-pointer w-full sm:w-auto"
            >
              <SlidersHorizontal className="size-4 mr-1.5" />
              {t('filters')}
              {activeFilterCount > 0 && (
                <span className="ml-1.5 min-w-5 h-5 px-1 rounded-full bg-[var(--primary)] text-[var(--on-primary)] text-[10px] font-bold inline-flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown
                className={cn('size-4 ml-1 transition-transform', filterOpen && 'rotate-180')}
              />
            </Button>

            {filterOpen && (
              <div className="absolute right-0 sm:left-auto left-0 top-[calc(100%+8px)] z-40 w-[min(100vw-2rem,360px)] rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] shadow-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-[var(--text-primary)]">{t('filter_criteria')}</p>
                  <button
                    type="button"
                    onClick={() => setFilterOpen(false)}
                    className="p-1 rounded-lg hover:bg-[var(--surface-hover)] cursor-pointer"
                    aria-label="Close"
                  >
                    <X className="size-4 text-[var(--text-muted)]" />
                  </button>
                </div>

                <div>
                  <Label className="text-[10px] text-[var(--text-muted)] uppercase font-bold mb-1 block">
                    {t('category')}
                  </Label>
                  <select
                    value={draft.category}
                    onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                    className="w-full h-10 rounded-xl border border-[var(--surface-border)] bg-[var(--background)] text-sm px-3 cursor-pointer"
                  >
                    {SEARCH_CATEGORY_OPTIONS.map((c) => (
                      <option key={c || 'all'} value={c}>
                        {categoryLabel(c)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-[10px] text-[var(--text-muted)] uppercase font-bold mb-1 block">
                    {t('city')}
                  </Label>
                  <Input
                    value={draft.city}
                    onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
                    placeholder={t('city_placeholder')}
                    className="rounded-xl h-10"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-[var(--text-muted)] uppercase font-bold mb-1 block">
                      {t('date_from')}
                    </Label>
                    <Input
                      type="date"
                      value={draft.dateFrom}
                      onChange={(e) => setDraft((d) => ({ ...d, dateFrom: e.target.value }))}
                      className="rounded-xl h-10"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-[var(--text-muted)] uppercase font-bold mb-1 block">
                      {t('date_to')}
                    </Label>
                    <Input
                      type="date"
                      value={draft.dateTo}
                      onChange={(e) => setDraft((d) => ({ ...d, dateTo: e.target.value }))}
                      className="rounded-xl h-10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-[var(--text-muted)] uppercase font-bold mb-1 block">
                      {t('min_price')}
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={draft.minPrice}
                      onChange={(e) => setDraft((d) => ({ ...d, minPrice: e.target.value }))}
                      className="rounded-xl h-10"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-[var(--text-muted)] uppercase font-bold mb-1 block">
                      {t('max_price')}
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={draft.maxPrice}
                      onChange={(e) => setDraft((d) => ({ ...d, maxPrice: e.target.value }))}
                      className="rounded-xl h-10"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    onClick={applyDraftToUrl}
                    className="flex-1 btn-primary-gradient rounded-xl font-bold text-[var(--on-primary)] border-none cursor-pointer"
                  >
                    {t('apply')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearFilters}
                    className="rounded-xl cursor-pointer"
                  >
                    {tHome('clear_filter')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-[var(--error)]/10 border border-[var(--error)]/30 text-xs text-[var(--error)]">
            {error}
          </div>
        )}

        <p className="text-xs text-[var(--text-muted)] mb-4">
          {t('results_count', { count: total ?? events.length })}
        </p>

        {loading ? (
          <SkeletonGrid count={8} />
        ) : events.length === 0 ? (
          <EmptyState icon={Search} title={tHome('no_events')} description={tHome('no_events_hint')} />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>

            {/* Lazy-load sentinel */}
            <div ref={sentinelRef} className="h-12 flex items-center justify-center mt-8">
              {loadingMore && (
                <Loader2 className="size-6 animate-spin text-[var(--primary)]" aria-label="Loading more" />
              )}
              {!hasMore && events.length > 0 && (
                <p className="text-[11px] text-[var(--text-muted)]">{t('end_of_results')}</p>
              )}
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

export function SearchView() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
          <div className="size-8 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
        </div>
      }
    >
      <SearchViewContent />
    </Suspense>
  );
}
