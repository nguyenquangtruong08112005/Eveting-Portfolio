'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CalendarDays, MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { formatDate } from '@/lib/constants';
import type { Event } from '@/types';

interface HeroCarouselProps {
  events: Event[];
}

export function HeroCarousel({ events }: HeroCarouselProps) {
  const [activeSlide, setActiveSlide] = useState(0);
  const t = useTranslations('home');
  const tCommon = useTranslations('common');

  // Take the first 3 published/active events to feature
  const slides = events.slice(0, 3);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (slides.length === 0) {
    return (
      <section className="relative w-full h-[300px] flex items-center justify-center bg-[#0a0a0c] border-b border-white/10">
        <div className="text-zinc-500 text-sm">{t('no_featured_events')}</div>
      </section>
    );
  }

  const tags = ['RECOMMENDED', 'TRENDING', 'HOT EVENT'];

  return (
    <section className="relative w-full h-[400px] md:h-[460px] overflow-hidden bg-[#0a0a0c] border-b border-white/10">
      {slides.map((slide, index) => {
        const isActive = index === activeSlide;
        const tag = slide.tags?.[0] || tags[index % tags.length];
        
        return (
          <div
            key={slide.id}
            className={cn(
              "absolute inset-0 transition-opacity duration-1000 flex items-center",
              isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
            )}
          >
            <div
              className="absolute inset-0 bg-cover bg-center brightness-[0.35] scale-105 transition-transform duration-[10000ms]"
              style={{ backgroundImage: `url(${slide.imageUrl || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&auto=format&fit=crop&q=80'})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#12141A] via-[#12141A]/50 to-transparent" />
            
            <div className="relative max-w-7xl mx-auto px-6 w-full text-white">
              <span className="bg-gradient-to-r from-[#FF8F66] to-[#FF7043] text-[#12141A] px-3.5 py-1 rounded-full text-[10px] font-bold self-start mb-4 uppercase tracking-wider inline-block">
                {tag}
              </span>
              <h2 className="text-3xl md:text-5xl font-black mb-4 max-w-2xl leading-tight tracking-tight drop-shadow-md">
                {slide.name}
              </h2>
              <div className="flex flex-col gap-2 mb-8 text-zinc-300 text-sm">
                <div className="flex items-center gap-2">
                  <CalendarDays className="size-4 text-[var(--primary)]" />
                  <span>{formatDate(slide.date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 text-[var(--primary)]" />
                  <span>{slide.venueName || slide.location?.address || tCommon('unknown')}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Link
                  href={`/attendee/events/${slide.id}`}
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "btn-primary-gradient rounded-xl font-bold px-8 py-5 text-sm shadow-xl shadow-orange-500/10 btn-tactile border-none"
                  )}
                >
                  {t('book_now')}
                </Link>
                <Link
                  href={`/attendee/events/${slide.id}`}
                  className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white font-bold px-8 py-3 rounded-xl transition-all text-sm"
                >
                  {t('details')}
                </Link>
              </div>
            </div>
          </div>
        );
      })}

      {/* Slider Controls (Dots) */}
      {slides.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2.5 z-20">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveSlide(index)}
              className={cn(
                "h-2 rounded-full transition-all duration-300 cursor-pointer border-none",
                index === activeSlide ? "w-6 bg-[var(--primary)]" : "w-2 bg-white/40 hover:bg-white/70"
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}
