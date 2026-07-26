'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { ProfileService } from '@/services/profile.service';
import { FALLBACK_IMAGE } from '@/lib/constants';
import type { FeaturedProfile } from '@/types';

interface ArtistStarsProps {
  onSelectArtist: (name: string) => void;
}

export function ArtistStars({ onSelectArtist }: ArtistStarsProps) {
  const [profiles, setProfiles] = useState<FeaturedProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const t = useTranslations('home');

  useEffect(() => {
    ProfileService.list(1, 15)
      .then((data) => {
        if (data?.profiles) {
          setProfiles(data.profiles);
        }
      })
      .catch((err) => {
        console.error('Failed to load profiles:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const checkScrollButtons = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const { scrollLeft, scrollWidth, clientWidth } = container;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    checkScrollButtons();
    window.addEventListener('resize', checkScrollButtons);
    return () => window.removeEventListener('resize', checkScrollButtons);
  }, [profiles, checkScrollButtons]);

  const handleScroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const scrollAmount = container.clientWidth * 0.75;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  if (loading) {
    return (
      <section className="w-full relative overflow-hidden bg-gradient-to-b from-[var(--surface)]/40 to-transparent border-y border-[var(--surface-border)] py-10 mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex-shrink-0 w-32 h-36 rounded-2xl bg-[var(--surface-hover)] animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (profiles.length === 0) return null;

  return (
    <section className="w-full relative overflow-hidden bg-gradient-to-b from-[var(--surface)]/40 to-transparent border-y border-[var(--surface-border)] py-10 mb-6">
      {/* Orange Wave Background SVG - Full browser width band */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40 w-full h-full">
        <svg
          className="w-full h-full min-h-[220px]"
          preserveAspectRatio="none"
          viewBox="0 0 1440 220"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="artistWaveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F97316" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#EA580C" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#F97316" stopOpacity="0.05" />
            </linearGradient>
            <filter id="artistWaveGlow">
              <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <path d="M 0 80 C 360 140, 600 20, 900 80 C 1200 140, 1320 40, 1440 90 L 1440 220 L 0 220 Z" fill="url(#artistWaveGrad)" />
          <path d="M 0 110 C 360 50, 600 150, 900 70 C 1200 10, 1320 130, 1440 60" stroke="url(#artistWaveGrad)" strokeWidth="2.5" filter="url(#artistWaveGlow)" fill="none" />
          <path d="M 0 50 C 240 130, 540 30, 840 120 C 1140 190, 1320 70, 1440 130" stroke="url(#artistWaveGrad)" strokeWidth="1" strokeDasharray="4 4" fill="none" />
        </svg>
      </div>

      {/* Constrained Inner Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-extrabold flex items-center gap-2 text-[var(--text-primary)] tracking-tight">
            <Star className="size-5 text-[var(--primary)] fill-[var(--primary)]" />
            {t('featured_artists')}
          </h3>

          {/* Accessible Lucide Navigation Scroll Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleScroll('left')}
              disabled={!canScrollLeft}
              aria-label="Scroll left"
              className="p-2 rounded-full border border-[var(--surface-border)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => handleScroll('right')}
              disabled={!canScrollRight}
              aria-label="Scroll right"
              className="p-2 rounded-full border border-[var(--surface-border)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          onScroll={checkScrollButtons}
          className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide scroll-smooth relative z-10 px-1"
        >
          {profiles.map((profile) => {
            const imageUrl = profile.imageUrl || FALLBACK_IMAGE;

            return (
              <div
                key={profile.id}
                onClick={() => onSelectArtist(profile.name)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectArtist(profile.name);
                  }
                }}
                className="flex-shrink-0 text-center group cursor-pointer bg-[var(--surface)]/50 hover:bg-[var(--surface)]/90 border border-[var(--surface-border)] hover:border-[var(--primary)]/40 rounded-2xl p-4 transition-all duration-300 w-32 relative flex flex-col items-center shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] select-none"
              >
                <div className="relative size-16 rounded-full p-[2px] mb-3 bg-gradient-to-tr from-transparent to-transparent group-hover:from-[var(--primary)] group-hover:to-[var(--primary-dark)] transition-all duration-500 shadow-md">
                  <Image
                    src={imageUrl}
                    alt={profile.name}
                    fill
                    className="w-full h-full object-cover rounded-full border-2 border-[var(--background)] group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 rounded-full bg-[var(--primary)] opacity-0 group-hover:opacity-20 blur-md transition-opacity duration-300 -z-10" />
                </div>
                <p className="text-xs font-bold text-[var(--text-secondary)] group-hover:text-[var(--primary)] transition-colors truncate w-full text-center flex items-center justify-center gap-1">
                  {profile.name}
                  <span className="inline-flex size-3.5 rounded-full bg-[var(--primary)] text-[var(--on-primary)] items-center justify-center text-[8px] font-black shrink-0 shadow">✓</span>
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
