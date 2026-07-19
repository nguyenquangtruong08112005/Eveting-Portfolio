'use client';

import { Calendar, MapPin, Globe } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { formatDate, localizeCategory } from '@/lib/constants';
import type { Event } from '@/types';

interface EventInfoContentProps {
  event: Event & {
    endDate?: number;
    venue?: {
      name: string;
      addressDetails?: {
        street: string;
        district: string;
        city: string;
      };
      nearby?: string[];
    };
  };
  mounted: boolean;
}

export function EventInfoContent({ event, mounted }: EventInfoContentProps) {
  const t = useTranslations('event_info');
  const tCat = useTranslations('navbar.categories');

  return (
    <section className="lg:col-span-7 space-y-6">
      {/* Category badges */}
      {event?.category && event.category.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {event.category.map((cat: string, idx: number) => (
            <Badge
              key={idx}
              className="px-2.5 py-1 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[10px] text-[var(--primary)] font-semibold uppercase tracking-wider"
            >
              {localizeCategory(cat, (k) => tCat(k))}
            </Badge>
          ))}
        </div>
      )}

      {/* Title */}
      <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] leading-tight">
        {event?.name}
      </h1>

      {/* Meta info */}
      <div className="glass-card rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-3 text-sm">
          <Calendar className="size-4 text-[var(--primary)] shrink-0" />
          <div>
            <p className="text-[var(--text-primary)] font-medium">
              {mounted ? formatDate(event?.date) : '...'}
            </p>
            <p className="text-[var(--text-muted)] text-xs mt-0.5">
              {event?.endDate
                ? `${t('ends_at')} ${mounted ? formatDate(event.endDate) : '...'}`
                : t('time_tbd')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <MapPin className="size-4 text-[var(--primary)] shrink-0" />
          <div>
            <p className="text-[var(--text-primary)] font-medium">
              {event?.venueName || event?.venue?.name || t('venue')}
            </p>
            <p className="text-[var(--text-muted)] text-xs mt-0.5">
              {event?.venue?.addressDetails
                ? `${event.venue.addressDetails.street}, ${event.venue.addressDetails.district}, ${event.venue.addressDetails.city}`
                : event?.location?.address || event?.city || ''}
            </p>
          </div>
        </div>

        {event?.eventType === 'online' && (
          <div className="flex items-center gap-3 text-sm">
            <Globe className="size-4 text-[var(--primary)] shrink-0" />
            <p className="text-[var(--text-primary)] font-medium">{t('online_event')}</p>
          </div>
        )}
      </div>

      {/* Description */}
      <div className="glass-card rounded-xl p-5">
        <h2 className="text-base font-bold text-[var(--text-primary)] mb-3">
          {t('intro')}
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
          {event?.description || t('intro_hint')}
        </p>
      </div>

      {/* Online banner notice */}
      {event?.eventType === 'online' && (
        <div className="glass-card rounded-xl p-5 bg-[var(--primary)]/5 border-[var(--primary)]/20 mt-4 flex items-start gap-3">
          <Globe className="size-5 text-[var(--primary)] shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-[var(--text-primary)] mb-1">{t('online_event')}</h4>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {t('online_notice')}
            </p>
          </div>
        </div>
      )}

      {/* Map Location iframe */}
      {event?.eventType === 'physical' && (
        <div className="glass-card rounded-xl p-5 mt-6">
          <h2 className="text-base font-bold text-[var(--text-primary)] mb-3">
            {t('venue_map')}
          </h2>
          <div className="w-full h-[250px] overflow-hidden rounded-xl bg-[var(--surface-hover)] border border-[var(--surface-border)]">
            <iframe
              width="100%"
              height="100%"
              style={{ border: 0 }}
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${(event?.location?.longitude || 106.7009) - 0.005}%2C${(event?.location?.latitude || 10.7769) - 0.005}%2C${(event?.location?.longitude || 106.7009) + 0.005}%2C${(event?.location?.latitude || 10.7769) + 0.005}&layer=mapnik&marker=${event?.location?.latitude || 10.7769}%2C${event?.location?.longitude || 106.7009}`}
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* Venue nearby */}
      {event?.venue?.nearby && event.venue.nearby.length > 0 && (
        <div className="glass-card rounded-xl p-5 mt-6">
          <h2 className="text-base font-bold text-[var(--text-primary)] mb-3">
            {t('nearby')}
          </h2>
          <div className="flex flex-wrap gap-2">
            {event.venue.nearby.map((place: string, idx: number) => (
              <Badge key={idx} variant="secondary" className="px-2 py-0.5 text-[10px]">
                {place}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
