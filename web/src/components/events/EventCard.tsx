'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, MapPin, ArrowRight, Globe } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { SafeImage } from '@/components/shared/SafeImage';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatPrice, formatDate, FALLBACK_IMAGE, localizeCategory } from '@/lib/constants';
import type { Event } from '@/types';

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const t = useTranslations('navbar.categories');
  const tCommon = useTranslations('common');
  const isOnline = event.eventType === 'online';
  const displayCategories = (event.category ?? []).slice(0, 2);
  const [mounted, setMounted] = React.useState(false);
  const href = `/attendee/events/${event.id}`;

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <article className="aura-card overflow-hidden flex flex-col group h-full relative">
      {/* Full-card click target (image + body); CTA still looks like a button */}
      <Link
        href={href}
        className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        aria-label={event.name}
      />

      <div className="aspect-[16/10] w-full relative overflow-hidden bg-[var(--surface-hover)]">
        <SafeImage
          src={event.imageUrl || FALLBACK_IMAGE}
          alt={event.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700"
        />
        <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap z-[1]">
          {displayCategories.map((cat, idx) => (
            <Badge
              key={idx}
              className="px-2.5 py-1 rounded-full bg-black/55 border border-white/10 text-[10px] text-white font-semibold uppercase tracking-wider backdrop-blur-md"
            >
              {localizeCategory(cat, t)}
            </Badge>
          ))}
        </div>
        {isOnline && (
          <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-[var(--info)]/15 border border-[var(--info)]/30 flex items-center gap-1 backdrop-blur-md z-[1]">
            <Globe className="size-3 text-[var(--info)]" />
            <span className="text-[9px] font-bold text-[var(--info)] uppercase tracking-wider">
              Online
            </span>
          </div>
        )}
        <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-black/55 backdrop-blur-md border border-white/10 z-[1]">
          <span className="text-[10px] text-white/70 block leading-none">{tCommon('from')}</span>
          <span className="text-sm font-bold text-[var(--primary)]">
            {formatPrice(event.minPrice)}
          </span>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors line-clamp-1 mb-1.5">
          {event.name}
        </h3>
        <p className="text-[var(--text-secondary)] text-sm line-clamp-2 mb-4 leading-relaxed">
          {event.description || event.name}
        </p>

        <div className="flex flex-col gap-2 text-xs text-[var(--text-secondary)] mt-auto mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="size-3.5 text-[var(--primary)]" />
            <span>{mounted ? formatDate(event.date) : '...'}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="size-3.5 text-[var(--primary)]" />
            <span className="truncate">
              {event.venueName || event.location?.address || tCommon('unknown')}
              {event.city ? `, ${event.city}` : ''}
            </span>
          </div>
        </div>

        <div
          className={cn(
            buttonVariants({ variant: 'default' }),
            'w-full py-2.5 rounded-xl btn-primary-gradient text-sm tracking-wide flex items-center justify-center gap-2 pointer-events-none text-[var(--on-primary)] border-none font-bold'
          )}
        >
          {tCommon('book_now')}
          <ArrowRight className="size-3.5" />
        </div>
      </div>
    </article>
  );
}
