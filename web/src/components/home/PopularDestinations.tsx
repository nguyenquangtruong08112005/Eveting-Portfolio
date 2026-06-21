'use client';

import React from 'react';
import { useTranslations } from 'next-intl';

const DESTINATIONS = [
  {
    name: 'Tp. Hồ Chí Minh',
    imageUrl: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=600&auto=format&fit=crop&q=80',
    query: 'Hồ Chí Minh'
  },
  {
    name: 'Hà Nội',
    imageUrl: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&auto=format&fit=crop&q=80',
    query: 'Hà Nội'
  },
  {
    name: 'Đà Lạt',
    imageUrl: 'https://images.unsplash.com/photo-1549448834-8c8868e64c39?w=600&auto=format&fit=crop&q=80',
    query: 'Đà Lạt'
  },
  {
    name: 'Vị trí khác',
    imageUrl: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&auto=format&fit=crop&q=80',
    query: ''
  }
];

interface PopularDestinationsProps {
  onSelectCity: (query: string) => void;
}

export function PopularDestinations({ onSelectCity }: PopularDestinationsProps) {
  const t = useTranslations('home');

  return (
    <section className="max-w-7xl mx-auto px-6 py-10 w-full">
      <h3 className="text-lg font-extrabold text-[var(--text-primary)] mb-6 tracking-tight">
        {t('popular_destinations')}
      </h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {DESTINATIONS.map((city) => (
          <div
            key={city.name}
            onClick={() => onSelectCity(city.query)}
            className="group relative h-40 rounded-2xl overflow-hidden cursor-pointer shadow-lg border border-white/5 hover:border-[var(--primary)]/40 transition-all duration-500"
          >
            {/* Background Image */}
            <div
              className="absolute inset-0 bg-cover bg-center brightness-[0.5] group-hover:scale-110 transition-transform duration-700"
              style={{ backgroundImage: `url(${city.imageUrl})` }}
            />
            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            
            {/* Content */}
            <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-col justify-end h-full">
              <h4 className="text-base font-black text-white group-hover:text-[var(--primary)] transition-colors leading-tight">
                {city.name}
              </h4>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
