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
  Gift,
  Sparkles,
  Ticket,
  Navigation,
  Heart,
  Tag,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { EventCard } from '@/components/events/EventCard';
import { Badge } from '@/components/ui/badge';
import { EventService } from '@/features/events/api';
import { PromotionService } from '@/services/promotion.service';
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
import type { Event, Promotion } from '@/types';
import { cn } from '@/lib/utils';
import { HeroCarousel } from '@/components/home/HeroCarousel';
import { ArtistStars } from '@/components/home/ArtistStars';
import { PopularDestinations } from '@/components/home/PopularDestinations';
import { PromoBanner } from '@/components/home/PromoBanner';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { EmptyState } from '@/components/shared/EmptyState';
import { SkeletonGrid } from '@/components/shared/SkeletonGrid';

function LandingPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations('home');

  const [events, setEvents] = useState<Event[]>([]);
  const [nearbyEvents, setNearbyEvents] = useState<Event[]>([]);
  const [recommendedEvents, setRecommendedEvents] = useState<Event[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
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

    // Recommendations (auth optional — server may return generic list)
    EventService.recommendations(8)
      .then((data) => {
        const list = (data.events || []).filter(isPublicEvent).map(enrichEvent);
        setRecommendedEvents(list);
      })
      .catch(() => setRecommendedEvents([]));

    PromotionService.listPublic()
      .then((list) => setPromotions(Array.isArray(list) ? list.slice(0, 6) : []))
      .catch(() => setPromotions([]));

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

  // Canonical category rows — no more wrong mappings (Nightlife→Workshops etc.)
  const eventsByCategory = (key: 'music' | 'arts' | 'workshop' | 'tech') =>
    events.filter((e) => resolveCategoryKey(e.category?.[0]) === key).slice(0, 4);

  const musicEvents = useMemo(() => eventsByCategory('music'), [events]);
  const artsEvents = useMemo(() => eventsByCategory('arts'), [events]);
  const workshopEvents = useMemo(() => eventsByCategory('workshop'), [events]);
  const techEvents = useMemo(() => eventsByCategory('tech'), [events]);

  const specialEvents = useMemo(() => events.slice(0, 5), [events]);
  const trendingEvents = useMemo(() => events.slice(2, 6), [events]);

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

      {/* Hero only on the unfiltered landing home */}
      {!isFiltering && <HeroCarousel events={events} />}

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

          {/* API promotions strip */}
          {promotions.length > 0 && (
            <section className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full">
              <SectionHeading title={t('promotions')} icon={Tag} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {promotions.map((promo) => (
                  <div
                    key={promo.id}
                    className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] p-5 flex flex-col gap-2 hover:border-[var(--primary)]/30 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge className="bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20 text-[10px] font-black uppercase tracking-wider">
                        {promo.code}
                      </Badge>
                      <span className="text-xs font-bold text-[var(--accent-brand)]">
                        {promo.discountType === 'percent'
                          ? `-${promo.discountValue}%`
                          : promo.discountValue != null
                            ? formatPrice(promo.discountValue)
                            : ''}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-[var(--text-primary)]">
                      {promo.name || promo.code}
                    </h4>
                    {promo.description ? (
                      <p className="text-xs text-[var(--text-muted)] line-clamp-2">{promo.description}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Special Events */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full">
            <SectionHeading title={t('special_events')} icon={Sparkles} />
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="aspect-[3/4] rounded-2xl skeleton-shimmer" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {specialEvents.map((event) => (
                  <Link
                    href={`/attendee/events/${event.id}`}
                    key={event.id}
                    className="group relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer border border-[var(--surface-border)] hover:border-[var(--primary)]/30 transition-all duration-300 shadow-lg flex flex-col justify-end"
                  >
                    <SafeImage
                      src={event.imageUrl || FALLBACK_IMAGE}
                      alt={event.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 20vw"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90" />

                    <div className="absolute top-3 left-3">
                      <Badge className="bg-gradient-to-r from-[var(--primary)] to-[var(--primary)] text-white font-bold text-[9px] px-2 py-0.5 rounded tracking-wide border-none shadow">
                        HOT
                      </Badge>
                    </div>

                    <div className="relative p-4 z-10 flex flex-col justify-end">
                      <h4 className="text-sm font-extrabold text-white leading-snug group-hover:text-[var(--primary)] transition-colors line-clamp-2">
                        {event.name}
                      </h4>
                      <p className="text-[10px] text-white/70 mt-1 flex items-center gap-1">
                        <MapPin className="size-3 text-[var(--primary)]" />
                        <span className="truncate">{event.city}</span>
                      </p>

                      <div className="mt-3 pt-2.5 border-t border-white/10 flex justify-between items-center">
                        <span className="text-xs font-bold text-[var(--primary)]">
                          {formatPrice(event.minPrice)}
                        </span>
                        <span className="text-[10px] text-white/70 group-hover:text-white transition-colors flex items-center gap-0.5">
                          {t('book_ticket')} →
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Promo banner */}
          <PromoBanner
            variant="vib"
            icon={<Ticket className="size-7 text-[var(--primary)]" />}
            badge="VIB Partner"
            title={t('promo_vib_title')}
            highlight="500K"
            body={t('promo_vib_body')}
            cta={t('promo_vib_cta')}
          />

          {/* Trending Events */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full">
            <SectionHeading title={t('trending_events')} icon={Sparkles} />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {trendingEvents.map((event, idx) => (
                <div
                  key={event.id}
                  className="relative bg-[var(--surface)] rounded-2xl border border-[var(--surface-border)] p-4 flex gap-4 group hover:border-[var(--primary)]/30 hover:translate-x-1 transition-all duration-300 shadow-sm overflow-hidden"
                >
                  <div className="flex items-center justify-center font-black text-5xl text-transparent bg-clip-text bg-gradient-to-br from-[var(--primary)] to-[var(--primary)] opacity-80 shrink-0 w-8 select-none">
                    {idx + 1}
                  </div>

                  <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 relative border border-[var(--surface-border)]">
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
                      <Link
                        href={`/attendee/events/${event.id}`}
                        className="text-[10px] font-bold text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors flex items-center gap-0.5"
                      >
                        {t('book_ticket')} →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Weekend / Monthly Tabs */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--surface-border)] pb-4 mb-6">
              <div className="flex gap-2">
                <button
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

          {/* Promo banner */}
          <PromoBanner
            variant="shopee"
            icon={<Gift className="size-7 text-[var(--primary)]" />}
            badge="ShopeePay"
            title={t('promo_shopee_title')}
            highlight="40.000Đ"
            body={t('promo_shopee_body')}
            cta={t('promo_shopee_cta')}
          />

          {/* Category rows */}
          <CategoryRow label={t('live_music')} events={musicEvents} onSeeMore={() => setActiveCategory('music')} seeMoreLabel={t('see_more')} loading={loading} />
          <CategoryRow label={t('theater_arts')} events={artsEvents} onSeeMore={() => setActiveCategory('arts')} seeMoreLabel={t('see_more')} loading={loading} />

          <PromoBanner
            variant="hdbank"
            icon={<Sparkles className="size-7 text-[var(--primary)]" />}
            badge="HDBank"
            title={t('promo_hd_title')}
            body={t('promo_hd_body')}
            cta={t('promo_hd_cta')}
          />

          <CategoryRow label={t('workshops')} events={workshopEvents} onSeeMore={() => setActiveCategory('workshop')} seeMoreLabel={t('see_more')} loading={loading} />
          <CategoryRow label={t('tech_science')} events={techEvents} onSeeMore={() => setActiveCategory('tech')} seeMoreLabel={t('see_more')} loading={loading} />

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
