'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import Link from 'next/link';
import { SafeImage } from '@/components/shared/SafeImage';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Search,
  MapPin,
  ChevronRight,
  Sparkles,
  Navigation,
  Heart,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { EventCard } from '@/components/events/EventCard';
import { Badge } from '@/components/ui/badge';
import { EventService } from '@/features/events/api';
import {
  matchCategory,
  enrichEvent,
  formatPrice,
  FALLBACK_IMAGE,
  isPublicEvent,
  resolveCategoryKey,
  CATEGORIES,
  type CategoryKey,
} from '@/lib/constants';
import type { Event } from '@/types';
import { cn } from '@/lib/utils';
import { HeroCarousel } from '@/components/home/HeroCarousel';
import { ArtistStars } from '@/components/home/ArtistStars';
import { PopularDestinations } from '@/components/home/PopularDestinations';
import { PartnerAdsStrip, type PartnerId } from '@/components/home/PartnerAdsStrip';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { EmptyState } from '@/components/shared/EmptyState';
import { SkeletonGrid } from '@/components/shared/SkeletonGrid';
import { HomeCarousel } from '@/components/home/HomeCarousel';

/**
 * Named central showcase selection helper for Hero, Special, and Trending sections.
 * Excludes only explicit known test artifacts by id or exact known names (e.g. Promo Test Event, Idempotency Test Event).
 */
export function selectShowcaseEvents(allEvents: Event[]): Event[] {
  if (!allEvents || !Array.isArray(allEvents)) return [];

  const EXCLUDED_TEST_NAMES = [
    'promo test event',
    'idempotency test event',
  ];
  const EXCLUDED_TEST_IDS = [
    'promo-test-event',
    'idempotency-test-event',
  ];

  return allEvents.filter((event) => {
    if (!event) return false;
    const nameLower = (event.name || '').trim().toLowerCase();
    const idLower = (event.id || '').trim().toLowerCase();
    if (EXCLUDED_TEST_NAMES.includes(nameLower) || EXCLUDED_TEST_IDS.includes(idLower)) {
      return false;
    }
    return true;
  });
}

/**
 * Computes a deterministic placement map of single partner ads for category gaps.
 * Uses a stable daily epoch seed so SSR and Client hydration output match 100%
 * without Math.random(), state shifts, flicker, or hydration errors.
 */
export function getDeterministicCategoryAdPlacements(): Record<number, PartnerId> {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const day = now.getUTCDate();
  const daySeed = year * 10000 + month * 100 + day;

  const partners: PartnerId[] = ['shopee', 'hdbank', 'vib'];

  // 5 available gap slots between category rows after Music and before Destinations
  // Sparse patterns selecting 3 distinct positions out of 5 gaps
  const SPARSITY_PATTERNS = [
    [1, 3, 5],
    [1, 3, 4],
    [1, 2, 4],
    [2, 4, 5],
    [1, 2, 5],
  ];

  const patternIndex = daySeed % SPARSITY_PATTERNS.length;
  const selectedGaps = SPARSITY_PATTERNS[patternIndex];

  // Rotate partner cards deterministically based on daySeed
  const partnerShift = daySeed % 3;
  const rotatedPartners = [
    partners[partnerShift % 3],
    partners[(partnerShift + 1) % 3],
    partners[(partnerShift + 2) % 3],
  ];

  const placementMap: Record<number, PartnerId> = {};
  selectedGaps.forEach((gapSlot, i) => {
    placementMap[gapSlot] = rotatedPartners[i];
  });

  return placementMap;
}

function LandingPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations('home');

  const [events, setEvents] = useState<Event[]>([]);
  const [categoryEvents, setCategoryEvents] = useState<Record<string, Event[]>>({});
  const [nearbyEvents, setNearbyEvents] = useState<Event[]>([]);
  const [recommendedEvents, setRecommendedEvents] = useState<Event[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  // Sync with searchParams — prefer dedicated /search for deep filters
  useEffect(() => {
    if (searchParams) {
      const q = searchParams.get('q');
      const cat = searchParams.get('category');
      setSearchQuery(q ?? '');
      setActiveCategory(cat ?? 'all');
    }
  }, [searchParams]);

  useEffect(() => {
    EventService.list()
      .then((data) => {
        if (data?.events?.length) {
          const cleaned = data.events.filter(isPublicEvent).map(enrichEvent);
          setEvents(cleaned);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Category-aware queries — one bounded request per canonical category
    const CATEGORY_KEYS = ['music', 'arts', 'sports', 'workshop', 'nightlife', 'tech'] as const;
    for (const key of CATEGORY_KEYS) {
      EventService.search({ category: key, limit: 4 })
        .then((data) => {
          const list = (data.events || []).filter(isPublicEvent).map(enrichEvent);
          setCategoryEvents((prev) => ({ ...prev, [key]: list }));
        })
        .catch(() => setCategoryEvents((prev) => ({ ...prev, [key]: [] })));
    }

    // Recommendations (auth optional — server may return generic list)
    EventService.recommendations(8)
      .then((data) => {
        const list = (data.events || []).filter(isPublicEvent).map(enrichEvent);
        setRecommendedEvents(list);
      })
      .catch(() => setRecommendedEvents([]));

    // Geolocation → nearby events
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          EventService.nearby({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            radius: 50,
            limit: 8,
          })
            .then((data) => {
              const list = (data.events || []).filter(isPublicEvent).map(enrichEvent);
              setNearbyEvents(list);
            })
            .catch(() => setNearbyEvents([]));
        },
        () => setNearbyEvents([]),
        { maximumAge: 600_000, timeout: 8_000 }
      );
    }
  }, []);

  // Filters
  const [weekendTab, setWeekendTab] = useState<'weekend' | 'month'>('weekend');

  const filteredEvents = useMemo(
    () =>
      events.filter((e) => {
        if (!e) return false;
        const name = e.name || '';
        const desc = e.description || '';
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          !q ||
          name.toLowerCase().includes(q) ||
          desc.toLowerCase().includes(q) ||
          (e.city && e.city.toLowerCase().includes(q)) ||
          (e.venueName && e.venueName.toLowerCase().includes(q));
        const matchesCategory = matchCategory(e.category, activeCategory);
        return matchesSearch && matchesCategory;
      }),
    [events, searchQuery, activeCategory]
  );

  // Filters for Tabs: Weekend vs Month
  const tabFilteredEvents = useMemo(
    () =>
      events
        .filter((e) => {
          if (!e) return false;
          const d = new Date(e.date);
          if (isNaN(d.getTime())) return false;
          if (weekendTab === 'weekend') {
            const day = d.getDay();
            return day === 0 || day === 5 || day === 6; // Fri, Sat, Sun
          }
          const now = new Date();
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        })
        .slice(0, 4),
    [events, weekendTab]
  );

  // Canonical category rows — data sourced from category-aware API queries
  const musicEvents = useMemo(() => categoryEvents['music'] || [], [categoryEvents]);
  const artsEvents = useMemo(() => categoryEvents['arts'] || [], [categoryEvents]);
  const sportsEvents = useMemo(() => categoryEvents['sports'] || [], [categoryEvents]);
  const workshopEvents = useMemo(() => categoryEvents['workshop'] || [], [categoryEvents]);
  const nightlifeEvents = useMemo(() => categoryEvents['nightlife'] || [], [categoryEvents]);
  const techEvents = useMemo(() => categoryEvents['tech'] || [], [categoryEvents]);

  // Central showcase curation for Hero, Special, and Trending sections
  const showcaseEvents = useMemo(() => selectShowcaseEvents(events), [events]);
  // 6 posters fetched for Special Events: 5 visible on lg (1 row), 6 visible on md/sm (2/3 even rows)
  const specialEvents = useMemo(() => showcaseEvents.slice(0, 6), [showcaseEvents]);
  const trendingEvents = useMemo(() => showcaseEvents.slice(0, 10), [showcaseEvents]);

  // Deterministic daily placement rotation for sparse single partner cards
  const adPlacements = useMemo(() => getDeterministicCategoryAdPlacements(), []);

  const isFiltering = !!searchQuery || activeCategory !== 'all';
  const tCat = useTranslations('navbar.categories');
  const filterTitle =
    activeCategory !== 'all'
      ? (() => {
          const key = resolveCategoryKey(activeCategory) as CategoryKey | null;
          if (key && CATEGORIES.some((c) => c.key === key)) {
            try {
              return tCat(key);
            } catch {
              return activeCategory;
            }
          }
          return activeCategory;
        })()
      : t('search_results');

  return (
    <div className="flex-1 flex flex-col bg-[var(--background)] min-h-screen">
      <Navbar />

      {/* Hero only on the unfiltered landing home - receives curated showcase events */}
      {!isFiltering && <HeroCarousel events={showcaseEvents} />}

      {isFiltering ? (
        /* Search / category results */
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12 w-full flex-1">
          <SectionHeading
            title={filterTitle}
            icon={Search}
            action={
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('all');
                  router.push('/');
                }}
                className="text-xs font-bold text-[var(--primary)] hover:underline cursor-pointer"
              >
                {t('clear_filter')}
              </button>
            }
          />
          <p className="text-xs text-[var(--text-muted)] -mt-4 mb-6">
            {t('events_found', { count: filteredEvents.length, query: searchQuery || activeCategory })}
          </p>

          {loading ? (
            <SkeletonGrid count={8} />
          ) : filteredEvents.length === 0 ? (
            <EmptyState
              icon={Search}
              title={t('no_events')}
              description={t('no_events_hint')}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredEvents.map((event, idx) => (
                <div
                  key={event.id}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${Math.min(idx * 40, 300)}ms` }}
                >
                  <EventCard event={event} />
                </div>
              ))}
            </div>
          )}
        </main>
      ) : (
        /* Full multi-section layout */
        <div className="flex-1 flex flex-col pb-12">
          <ArtistStars
            onSelectArtist={(name) => {
              router.push(`/search?q=${encodeURIComponent(name)}`);
            }}
          />

          {/* Near you */}
          {nearbyEvents.length > 0 && (
            <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full">
              <SectionHeading
                title={t('near_you')}
                icon={Navigation}
                action={
                  <button
                    type="button"
                    onClick={() => router.push('/search')}
                    className="text-xs font-bold text-[var(--primary)] hover:underline cursor-pointer flex items-center gap-0.5"
                  >
                    {t('see_more')} <ChevronRight className="size-3.5" />
                  </button>
                }
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {nearbyEvents.slice(0, 4).map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </section>
          )}

          {/* Recommended for you */}
          {(recommendedEvents.length > 0 || !loading) && recommendedEvents.length > 0 && (
            <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full">
              <SectionHeading
                title={t('recommended_for_you')}
                icon={Heart}
                action={
                  <button
                    type="button"
                    onClick={() => router.push('/search')}
                    className="text-xs font-bold text-[var(--primary)] hover:underline cursor-pointer flex items-center gap-0.5"
                  >
                    {t('see_more')} <ChevronRight className="size-3.5" />
                  </button>
                }
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {recommendedEvents.slice(0, 4).map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </section>
          )}

          {/* Special Events - Vertical poster cards with optional HOT badge only */}
          {/* Responsive columns: 5 on lg (1 row), 6 on md/sm (2/3 even rows). Item 6 hidden on lg */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full">
            <SectionHeading title={t('special_events')} icon={Sparkles} />
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="aspect-[3/4] rounded-2xl bg-[var(--surface-hover)] animate-pulse" />
                ))}
              </div>
            ) : specialEvents.length === 0 ? (
              <div className="text-xs text-[var(--text-muted)] py-4">{t('no_events')}</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {specialEvents.map((event, index) => (
                  <Link
                    href={`/attendee/events/${event.id}`}
                    key={event.id}
                    className={cn(
                      "group relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer border border-[var(--surface-border)] hover:border-[var(--primary)]/50 transition-all duration-300 shadow-md hover:shadow-xl flex flex-col justify-end",
                      index === 5 && "lg:hidden"
                    )}
                  >
                    <SafeImage
                      src={event.imageUrl || FALLBACK_IMAGE}
                      alt={event.name || 'Event'}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

                    {/* Optional HOT badge only */}
                    {(index < 2 || event.tags?.includes('HOT') || event.tags?.includes('RECOMMENDED')) && (
                      <div className="absolute top-3 left-3 z-10">
                        <Badge className="bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] text-white font-bold text-[9px] px-2 py-0.5 rounded tracking-wide border-none shadow">
                          HOT
                        </Badge>
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Trending Events - Heading and left/right carousel controls share the same horizontal row */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full">
            {loading ? (
              <>
                <SectionHeading title={t('trending_events')} icon={Sparkles} />
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="w-72 sm:w-80 h-28 shrink-0 rounded-2xl bg-[var(--surface-hover)] animate-pulse" />
                  ))}
                </div>
              </>
            ) : trendingEvents.length === 0 ? (
              <>
                <SectionHeading title={t('trending_events')} icon={Sparkles} />
                <div className="text-xs text-[var(--text-muted)] py-4">{t('no_events')}</div>
              </>
            ) : (
              <HomeCarousel header={<SectionHeading title={t('trending_events')} icon={Sparkles} className="mb-0" />}>
                {trendingEvents.map((event, idx) => (
                  <Link
                    href={`/attendee/events/${event.id}`}
                    key={event.id}
                    className="w-72 sm:w-80 shrink-0 relative bg-[var(--surface)] rounded-2xl border border-[var(--surface-border)] p-4 flex gap-4 group hover:border-[var(--primary)]/40 hover:-translate-y-0.5 transition-all duration-300 shadow-sm hover:shadow-md overflow-hidden select-none"
                  >
                    <div className="flex items-center justify-center font-black text-4xl text-transparent bg-clip-text bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] opacity-80 shrink-0 w-7 select-none">
                      {idx + 1}
                    </div>

                    <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 relative border border-[var(--surface-border)]">
                      <SafeImage
                        src={event.imageUrl || FALLBACK_IMAGE}
                        alt={event.name}
                        fill
                        sizes="80px"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>

                    <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0">
                      <div>
                        <h4 className="text-xs font-bold text-[var(--text-primary)] line-clamp-2 leading-tight group-hover:text-[var(--primary)] transition-colors">
                          {event.name}
                        </h4>
                        <p className="text-[10px] text-[var(--text-muted)] mt-1 flex items-center gap-1">
                          <MapPin className="size-3 text-[var(--primary)]" />
                          <span className="truncate max-w-[100px]">{event.city}</span>
                        </p>
                      </div>
                      <div className="flex justify-between items-center mt-2 pt-1 border-t border-[var(--surface-border)]">
                        <span className="text-[10px] font-bold text-[var(--primary)]">
                          {formatPrice(event.minPrice)}
                        </span>
                        <span className="text-[10px] font-bold text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors flex items-center gap-0.5">
                          {t('book_ticket')} →
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </HomeCarousel>
            )}
          </section>

          {/* Weekend / Monthly Tabs */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--surface-border)] pb-4 mb-6">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setWeekendTab('weekend')}
                  className={cn(
                    'px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer',
                    weekendTab === 'weekend'
                      ? 'bg-[var(--primary)] text-[var(--on-primary)] shadow-md shadow-orange-500/10'
                      : 'bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  )}
                >
                  {t('weekend')}
                </button>
                <button
                  type="button"
                  onClick={() => setWeekendTab('month')}
                  className={cn(
                    'px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer',
                    weekendTab === 'month'
                      ? 'bg-[var(--primary)] text-[var(--on-primary)] shadow-md shadow-orange-500/10'
                      : 'bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  )}
                >
                  {t('this_month')}
                </button>
              </div>
              <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                {t('showing_recent')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {tabFilteredEvents.map((event) => (
                <div key={event.id} className="h-full">
                  <EventCard event={event} />
                </div>
              ))}
            </div>
          </section>

          {/* Category rows — sourced from category-aware API queries */}
          {/* Sparse single partner card insertions between category rows */}
          <CategoryRow label={t('live_music')} events={musicEvents} onSeeMore={() => router.push('/search?category=music')} seeMoreLabel={t('see_more')} loading={loading} />

          {adPlacements[1] && <PartnerAdsStrip singlePartner={adPlacements[1]} className="py-2" />}

          <CategoryRow label={t('theater_arts')} events={artsEvents} onSeeMore={() => router.push('/search?category=arts')} seeMoreLabel={t('see_more')} loading={loading} />

          {adPlacements[2] && <PartnerAdsStrip singlePartner={adPlacements[2]} className="py-2" />}

          <CategoryRow label={t('sports')} events={sportsEvents} onSeeMore={() => router.push('/search?category=sports')} seeMoreLabel={t('see_more')} loading={loading} />

          {adPlacements[3] && <PartnerAdsStrip singlePartner={adPlacements[3]} className="py-2" />}

          <CategoryRow label={t('workshops')} events={workshopEvents} onSeeMore={() => router.push('/search?category=workshop')} seeMoreLabel={t('see_more')} loading={loading} />

          {adPlacements[4] && <PartnerAdsStrip singlePartner={adPlacements[4]} className="py-2" />}

          <CategoryRow label={t('nightlife')} events={nightlifeEvents} onSeeMore={() => router.push('/search?category=nightlife')} seeMoreLabel={t('see_more')} loading={loading} />

          {adPlacements[5] && <PartnerAdsStrip singlePartner={adPlacements[5]} className="py-2" />}

          <CategoryRow label={t('tech_science')} events={techEvents} onSeeMore={() => router.push('/search?category=tech')} seeMoreLabel={t('see_more')} loading={loading} />

          <PopularDestinations
            onSelectCity={(query) => {
              if (query) {
                setSearchQuery(query);
                router.push(`/?q=${encodeURIComponent(query)}`);
              } else {
                setSearchQuery('');
                router.push('/');
              }
            }}
          />
        </div>
      )}

      <Footer />
    </div>
  );
}

function CategoryRow({
  label,
  events,
  onSeeMore,
  seeMoreLabel,
  loading,
}: {
  label: string;
  events: Event[];
  onSeeMore: () => void;
  seeMoreLabel: string;
  loading: boolean;
}) {
  if (!loading && events.length === 0) return null;
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full">
      <SectionHeading
        title={label}
        action={
          <button
            type="button"
            onClick={onSeeMore}
            className="text-xs font-bold text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors flex items-center gap-0.5"
          >
            {seeMoreLabel} <ChevronRight className="size-3.5" />
          </button>
        }
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {events.map((event) => (
          <div key={event.id} className="h-full">
            <EventCard event={event} />
          </div>
        ))}
      </div>
    </section>
  );
}

export function EventDiscovery() {
  return (
    <Suspense
      fallback={
        <div className="bg-[var(--background)] min-h-screen text-[var(--text-secondary)] flex flex-col items-center justify-center gap-3">
          <div className="size-8 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
          <span className="text-xs font-bold tracking-wider uppercase text-[var(--text-muted)]">Loading…</span>
        </div>
      }
    >
      <LandingPageContent />
    </Suspense>
  );
}
