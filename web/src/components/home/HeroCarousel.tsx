'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CalendarDays, MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { formatDate, FALLBACK_IMAGE } from '@/lib/constants';
import type { Event } from '@/types';

interface HeroCarouselProps {
  events: Event[];
}

function extractYouTubeId(url?: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = trimmed.match(regExp);
  return match && match[1] ? match[1] : null;
}

function isDirectVideoUrl(url?: string): boolean {
  if (!url) return false;
  const trimmed = url.trim().toLowerCase();
  return /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(trimmed) || trimmed.startsWith('blob:');
}

export function HeroCarousel({ events }: HeroCarouselProps) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [failedVideoIds, setFailedVideoIds] = useState<Record<string, boolean>>({});
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

  const handleVideoError = (slideId: string) => {
    setFailedVideoIds((prev) => ({ ...prev, [slideId]: true }));
  };

  if (slides.length === 0) {
    return (
      <section className="relative w-full h-[300px] flex items-center justify-center bg-[var(--background)] border-b border-[var(--surface-border)] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center brightness-[0.35] scale-105"
          style={{ backgroundImage: `url(${FALLBACK_IMAGE})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--background)] via-[var(--background)]/60 to-transparent" />
        <div className="relative z-10 text-[var(--text-muted)] text-sm font-semibold">
          {t('no_featured_events')}
        </div>
      </section>
    );
  }

  const tags = ['RECOMMENDED', 'TRENDING', 'HOT EVENT'];

  return (
    <section className="relative w-full h-[400px] md:h-[460px] overflow-hidden bg-[var(--background)] border-b border-[var(--surface-border)]">
      {slides.map((slide, index) => {
        const isActive = index === activeSlide;
        const tag = slide.tags?.[0] || tags[index % tags.length];
        
        // Priority 1: Direct Video, Priority 2: YouTube source, Priority 3 & Fallback: Banner / Image / FALLBACK_IMAGE (Never Blank)
        const bgImage = slide.bannerUrl || slide.imageUrl || FALLBACK_IMAGE;
        const rawVideoUrl = slide.videoUrl?.trim();
        const youtubeId = extractYouTubeId(rawVideoUrl);
        const isDirectVideo = !!rawVideoUrl && !youtubeId && (isDirectVideoUrl(rawVideoUrl) || rawVideoUrl.startsWith('http'));
        const isVideoFailed = !!failedVideoIds[slide.id];

        return (
          <div
            key={slide.id}
            className={cn(
              "absolute inset-0 transition-opacity duration-1000 flex items-center",
              isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
            )}
          >
            {/* Always render background image backdrop to guarantee it is NEVER blank */}
            <div
              className="absolute inset-0 bg-cover bg-center brightness-[0.35] scale-105 transition-transform duration-[10000ms]"
              style={{ backgroundImage: `url(${bgImage})` }}
            />

            {/* Prioritize Direct Video (Muted Autoplay Only) */}
            {isDirectVideo && !isVideoFailed && rawVideoUrl && (
              <video
                src={rawVideoUrl}
                autoPlay
                loop
                muted
                playsInline
                onError={() => handleVideoError(slide.id)}
                className="absolute inset-0 w-full h-full object-cover brightness-[0.35] scale-105 pointer-events-none"
              />
            )}

            {/* Prioritize YouTube source if direct video not present or if URL is YouTube */}
            {youtubeId && !isVideoFailed && (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${youtubeId}&playsinline=1`}
                title={slide.name}
                allow="autoplay; encrypted-media"
                onError={() => handleVideoError(slide.id)}
                className="absolute inset-0 w-full h-full object-cover scale-150 pointer-events-none brightness-[0.35]"
              />
            )}

            {/* Gradient Overlay for Text Legibility */}
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--background)] via-[var(--background)]/60 to-transparent" />
            
            <div className="relative max-w-7xl mx-auto px-6 w-full text-white">
              <span className="bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] text-[var(--on-primary)] px-3.5 py-1 rounded-full text-[10px] font-bold self-start mb-4 uppercase tracking-wider inline-block">
                {tag}
              </span>
              <h2 className="text-3xl md:text-5xl font-black mb-4 max-w-2xl leading-tight tracking-tight drop-shadow-md">
                {slide.name}
              </h2>
              <div className="flex flex-col gap-2 mb-8 text-white/80 text-sm">
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
              type="button"
              onClick={() => setActiveSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
              className={cn(
                "h-2 rounded-full transition-all duration-300 cursor-pointer border-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)]",
                index === activeSlide ? "w-6 bg-[var(--primary)]" : "w-2 bg-white/40 hover:bg-white/70"
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}
