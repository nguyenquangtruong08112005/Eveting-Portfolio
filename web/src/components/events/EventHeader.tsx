'use client';

import Image from 'next/image';
import type { Event } from '@/types';

interface EventHeaderProps {
  event: Event;
}

export function EventHeader({ event }: EventHeaderProps) {
  if (!event?.imageUrl) return null;

  return (
    <div className="w-full max-w-7xl mx-auto px-6 mt-6">
      <div className="aspect-[21/8] w-full rounded-2xl overflow-hidden relative bg-[var(--surface)]">
        <Image
          src={event.imageUrl || ''}
          alt={event.name}
          fill
          className="object-cover w-full h-full"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--background)]/80 via-black/20 to-transparent" />
      </div>
    </div>
  );
}
