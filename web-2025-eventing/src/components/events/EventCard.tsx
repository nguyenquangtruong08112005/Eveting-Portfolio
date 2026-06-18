'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, MapPin, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatPrice, formatDate } from '@/lib/constants';
import type { Event } from '@/types';

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  return (
    <article className="aura-card overflow-hidden flex flex-col group">
      {/* Image */}
      <div className="aspect-[16/10] w-full relative overflow-hidden bg-[var(--background)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={
            event.imageUrl ||
            'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?q=80&w=600&auto=format&fit=crop'
          }
          alt={event.name}
          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
        />
        {/* Category Badges */}
        <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
          {(event.category ?? []).map((cat, idx) => (
            <Badge
              key={idx}
              className="px-2.5 py-1 rounded-full bg-[var(--background)]/80 border border-[var(--surface-border)] text-[10px] text-[var(--text-secondary)] font-semibold uppercase tracking-wider backdrop-blur-md"
            >
              {cat}
            </Badge>
          ))}
        </div>
        {/* Price Tag — Ticketbox "Từ..." style */}
        <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-[var(--background)]/85 backdrop-blur-md border border-[var(--surface-border)]">
          <span className="text-[10px] text-[var(--text-muted)] block leading-none">Từ</span>
          <span className="text-sm font-bold text-[var(--primary-dark)]">
            {formatPrice(event.minPrice)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--primary-dark)] transition-colors line-clamp-1 mb-1.5">
          {event.name}
        </h3>
        <p className="text-[var(--text-muted)] text-sm line-clamp-2 mb-4 leading-relaxed">
          {event.description}
        </p>

        {/* Meta */}
        <div className="flex flex-col gap-2 text-xs text-[var(--text-secondary)] mt-auto mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="size-3.5 text-[var(--primary-dark)]" />
            <span>{formatDate(event.date)}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="size-3.5 text-[var(--secondary-blue)]" />
            <span className="truncate">
              {event.venueName || event.location.address}, {event.city || 'HCM'}
            </span>
          </div>
        </div>

        {/* CTA */}
        <Link
          href={`/attendee/events/${event.id}`}
          className={cn(
            buttonVariants({ variant: 'default' }),
            'w-full py-2.5 rounded-xl btn-primary-gradient text-sm tracking-wide flex items-center justify-center gap-2 cursor-pointer btn-tactile'
          )}
        >
          Đặt vé ngay
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </article>
  );
}
