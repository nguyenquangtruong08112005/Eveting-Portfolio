'use client';

import { useEffect, useState } from 'react';
import { Heart, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { EventCard } from '@/components/events/EventCard';
import { EventAdBanner } from '@/components/events/EventAdBanner';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { EventService } from '@/services/event.service';
import { enrichEvent, isPublicEvent } from '@/lib/constants';
import type { Event } from '@/types';

interface EventRecommendStripProps {
  eventId: string;
  category?: string[];
}

/**
 * Bottom of event detail:
 * 1) Recommend — 2 rows (8 cards)
 * 2) Advertise — landing-style promotions
 * 3) More events — 1 row (4 cards)
 */
export function EventRecommendStrip({ eventId, category }: EventRecommendStripProps) {
  const t = useTranslations('event_detail');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const categoryKey = category?.[0] ?? '';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        let list: Event[] = [];
        try {
          const rec = await EventService.recommendations(12);
          list = (rec.events || []).filter(isPublicEvent).map(enrichEvent);
        } catch {
          list = [];
        }

        if (list.length < 12 && categoryKey) {
          try {
            const search = await EventService.search({
              category: categoryKey,
              limit: 16,
              page: 1,
            });
            const extra = (search.events || []).filter(isPublicEvent).map(enrichEvent);
            list = [...list, ...extra];
          } catch {
            /* ignore */
          }
        }

        if (!list.length) {
          try {
            const all = await EventService.list(24);
            list = (all.events || []).filter(isPublicEvent).map(enrichEvent);
          } catch {
            list = [];
          }
        }

        const seen = new Set<string>();
        const filtered = list.filter((e) => {
          if (!e.id || e.id === eventId || seen.has(e.id)) return false;
          seen.add(e.id);
          return true;
        });

        if (!cancelled) setEvents(filtered.slice(0, 12));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [eventId, categoryKey]);

  const recommend = events.slice(0, 8);
  const moreRow = events.slice(8, 12);

  if (!loading && events.length === 0) {
    // Still show advertise if no recommend events
    return <EventAdBanner eventId={eventId} />;
  }

  return (
    <div className="w-full">
      {/* ── Recommend: 2 rows ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-6 w-full">
        <SectionHeading title={t('recommended_events')} icon={Heart} />
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-64 rounded-2xl skeleton-shimmer" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {recommend.map((ev) => (
              <EventCard key={ev.id} event={ev} />
            ))}
          </div>
        )}
      </section>

      {/* ── Advertise (landing-style) below recommend ── */}
      <EventAdBanner eventId={eventId} />

      {/* ── 1 more row of events ── */}
      {(loading || moreRow.length > 0) && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-12 w-full">
          <SectionHeading title={t('more_events')} icon={Sparkles} />
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-64 rounded-2xl skeleton-shimmer" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {moreRow.map((ev) => (
                <EventCard key={ev.id} event={ev} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
