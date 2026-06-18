'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, MapPin, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EventLocation {
  address: string;
}

interface Event {
  id: string;
  name: string;
  description: string;
  date: number;
  imageUrl?: string;
  location: EventLocation;
  city?: string;
  venueName?: string;
  minPrice: number;
  category: string[];
}

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const formattedDate = new Date(event.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Card className="premium-card rounded-2xl overflow-hidden flex flex-col border-none ring-0">
      <div className="aspect-video w-full relative overflow-hidden bg-zinc-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={event.imageUrl || 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?q=80&w=600&auto=format&fit=crop'}
          alt={event.name}
          className="object-cover w-full h-full hover:scale-105 transition-all duration-500"
        />
        <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
          {event.category.map((cat, idx) => (
            <Badge
              key={idx}
              className="px-2.5 py-1 rounded-full bg-zinc-950/80 border border-zinc-800/80 text-[10px] text-zinc-300 font-semibold uppercase tracking-wider backdrop-blur-md"
            >
              {cat}
            </Badge>
          ))}
        </div>
      </div>

      <CardHeader className="p-6 pb-2 text-left">
        <CardTitle className="text-xl font-bold text-white hover:text-purple-400 transition-colors line-clamp-1">
          {event.name}
        </CardTitle>
        <CardDescription className="text-zinc-400 text-sm line-clamp-2 mt-1">
          {event.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 pt-0 pb-4 text-left flex-1 flex flex-col justify-end">
        <div className="flex flex-col gap-2.5 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-purple-400" />
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-cyan-400" />
            <span>
              {event.venueName || event.location.address}, {event.city || 'HCM'}
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="px-6 py-4 border-t border-zinc-800/80 bg-zinc-900/10 flex items-center justify-between text-left">
        <div>
          <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block">
            Tickets From
          </span>
          <span className="text-lg font-bold text-cyan-400">
            {event.minPrice ? event.minPrice.toLocaleString('vi-VN') + ' ₫' : 'Free'}
          </span>
        </div>
        <Link
          href={`/attendee/events/${event.id}`}
          className={cn(
            buttonVariants({ variant: "default" }),
            "px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs tracking-wide transition-all shadow-md hover:shadow-purple-500/25 flex items-center gap-1.5 cursor-pointer border-none"
          )}
        >
          Book Seat
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardFooter>
    </Card>
  );
}
