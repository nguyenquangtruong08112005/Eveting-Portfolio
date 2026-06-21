'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, MapPin, ArrowRight, Globe } from 'lucide-react';
import { SafeImage } from '@/components/shared/SafeImage';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatPrice, formatDate } from '@/lib/constants';
import type { Event } from '@/types';

interface EventCardProps {
  event: Event;
}

// Map English category tags to Vietnamese labels for display
const CATEGORY_LABELS: Record<string, string> = {
  music: 'Âm nhạc',
  concert: 'Concert',
  edm: 'EDM',
  'hip-hop': 'Hip-Hop',
  'v-pop': 'V-Pop',
  art: 'Nghệ thuật',
  exhibition: 'Triển lãm',
  culture: 'Văn hóa',
  festival: 'Festival',
  food: 'Ẩm thực',
  conference: 'Hội nghị',
  tech: 'Công nghệ',
  expo: 'Triển lãm',
  business: 'Kinh doanh',
  networking: 'Networking',
  sports: 'Thể thao',
  wellness: 'Wellness',
  nightlife: 'Nightlife',
  performance: 'Biểu diễn',
  family: 'Gia đình',
  esports: 'Esports',
  education: 'Giáo dục',
  pets: 'Thú cưng',
  online: 'Online',
  inspiration: 'Cảm hứng',
  fashion: 'Thời trang',
};

function localizeCategory(cat: string): string {
  return CATEGORY_LABELS[cat.toLowerCase()] || cat;
}

export function EventCard({ event }: EventCardProps) {
  const isFree = event.minPrice === 0 || event.minPrice === null || event.minPrice === undefined;
  const isOnline = event.eventType === 'online';
  const displayCategories = (event.category ?? []).slice(0, 2);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <article className="glass-card rounded-xl overflow-hidden flex flex-col group h-full hover:translate-y-[-8px] transition-all duration-300 shadow-xl border border-white/10 bg-[#18181A]/70">
      {/* Image */}
      <div className="aspect-[16/10] w-full relative overflow-hidden bg-[var(--background)]">
        <SafeImage
          src={event.imageUrl || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&auto=format&fit=crop&q=80'}
          alt={event.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700"
        />
        {/* Category Badges */}
        <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
          {displayCategories.map((cat, idx) => (
            <Badge
              key={idx}
              className="px-2.5 py-1 rounded-full bg-black/60 border border-white/10 text-[10px] text-[var(--text-secondary)] font-semibold uppercase tracking-wider backdrop-blur-md"
            >
              {localizeCategory(cat)}
            </Badge>
          ))}
        </div>
        {/* Event type indicator */}
        {isOnline && (
          <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-[var(--info)]/15 border border-[var(--info)]/30 flex items-center gap-1 backdrop-blur-md">
            <Globe className="size-3 text-[var(--info)]" />
            <span className="text-[9px] font-bold text-[var(--info)] uppercase tracking-wider">
              Online
            </span>
          </div>
        )}
        {/* Price Tag */}
        <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/10">
          <span className="text-[10px] text-zinc-400 block leading-none">Từ</span>
          <span
            className={cn(
              'text-sm font-bold',
              isFree ? 'text-[var(--primary)]' : 'text-[var(--primary)]'
            )}
          >
            {formatPrice(event.minPrice)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors line-clamp-1 mb-1.5">
          {event.name}
        </h3>
        <p className="text-zinc-400 text-sm line-clamp-2 mb-4 leading-relaxed">
          {event.description || `${event.name} — sự kiện hấp dẫn tại ${event.city || 'Việt Nam'}.`}
        </p>

        {/* Meta */}
        <div className="flex flex-col gap-2 text-xs text-[var(--text-secondary)] mt-auto mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="size-3.5 text-[var(--primary)]" />
            <span>{mounted ? formatDate(event.date) : '...'}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="size-3.5 text-[var(--primary)]" />
            <span className="truncate">
              {event.venueName || event.location?.address || 'Chưa xác định'}
              {event.city ? `, ${event.city}` : ''}
            </span>
          </div>
        </div>

        {/* CTA */}
        <Link
          href={`/attendee/events/${event.id}`}
          className={cn(
            buttonVariants({ variant: 'default' }),
            'w-full py-2.5 rounded-xl btn-primary-gradient text-sm tracking-wide flex items-center justify-center gap-2 cursor-pointer btn-tactile text-[#00210f] border-none font-bold'
          )}
        >
          Đặt vé ngay
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </article>
  );
}
