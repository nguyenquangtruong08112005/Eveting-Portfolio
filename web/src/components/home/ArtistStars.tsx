'use client';

import { useState, useEffect } from 'react';
import { Star, ChevronRight } from 'lucide-react';
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

  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-6 py-10 w-full relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#1E212B]/30 to-transparent border border-white/5 mb-6">
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide relative z-10 px-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex-shrink-0 w-32 h-36 rounded-2xl bg-[var(--surface-hover)] animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (profiles.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-6 py-10 w-full relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#1E212B]/30 to-transparent border border-white/5 mb-6">
      {/* Orange Wave Background SVG */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
        <svg className="w-full h-full min-h-[200px]" preserveAspectRatio="none" viewBox="0 0 800 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF8F66" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#FF7043" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#FF8F66" stopOpacity="0.0" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <path d="M 0 80 C 150 130, 250 30, 450 70 C 650 110, 720 40, 800 90 L 800 200 L 0 200 Z" fill="url(#waveGrad)" />
          <path d="M 0 110 C 180 60, 320 140, 480 80 C 640 20, 700 120, 800 60" stroke="url(#waveGrad)" strokeWidth="2.5" filter="url(#glow)" fill="none" />
          <path d="M 0 50 C 120 120, 280 40, 420 110 C 560 180, 680 80, 800 130" stroke="url(#waveGrad)" strokeWidth="1" strokeDasharray="4 4" fill="none" />
        </svg>
      </div>

      <div className="flex justify-between items-center mb-6 relative z-10 px-4">
        <h3 className="text-lg font-extrabold flex items-center gap-2 text-[var(--text-primary)] tracking-tight">
          <Star className="size-5 text-[var(--primary)] fill-[var(--primary)]" />
          {t('featured_artists')}
        </h3>
        <span className="text-xs font-bold text-zinc-500 hover:text-[var(--primary)] transition-colors cursor-pointer flex items-center gap-0.5">
          {t('see_more')} <ChevronRight className="size-3.5" />
        </span>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide relative z-10 px-4">
        {profiles.map((profile) => {
          const imageUrl = profile.imageUrl || FALLBACK_IMAGE;
          
          return (
            <div
              key={profile.id}
              onClick={() => onSelectArtist(profile.name)}
              className="flex-shrink-0 text-center group cursor-pointer bg-[#1E212B]/40 hover:bg-[#1E212B]/90 border border-white/5 hover:border-[var(--primary)]/30 rounded-2xl p-4 transition-all duration-300 w-32 relative flex flex-col items-center shadow-lg"
            >
              <div className="relative size-16 rounded-full p-[2px] mb-3 bg-gradient-to-tr from-transparent to-transparent group-hover:from-[#FF8F66] group-hover:to-[#FF7043] transition-all duration-500 shadow-md">
                <Image
                  src={imageUrl}
                  alt={profile.name}
                  fill
                  className="w-full h-full object-cover rounded-full border-2 border-[#12141A] group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 rounded-full bg-[var(--primary)] opacity-0 group-hover:opacity-20 blur-md transition-opacity duration-300 -z-10" />
              </div>
              <p className="text-xs font-bold text-zinc-300 group-hover:text-[var(--primary)] transition-colors truncate w-full text-center flex items-center justify-center gap-1">
                {profile.name}
                <span className="inline-flex size-3.5 rounded-full bg-[var(--primary)] text-[#12141A] items-center justify-center text-[8px] font-black shrink-0 shadow">✓</span>
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
