'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { EventService, Destination } from '@/services/event.service';
import { FALLBACK_IMAGE } from '@/lib/constants';

const FALLBACK_DESTINATIONS: Destination[] = [
  { name: 'Tp. Hồ Chí Minh', query: 'Hồ Chí Minh', eventCount: 0 },
  { name: 'Hà Nội', query: 'Hà Nội', eventCount: 0 },
  { name: 'Đà Lạt', query: 'Đà Lạt', eventCount: 0 },
  { name: 'Vị trí khác', query: '', eventCount: 0 },
];

const DESTINATION_IMAGES: Record<string, string> = {
  'Hồ Chí Minh': FALLBACK_IMAGE,
  'Hà Nội': FALLBACK_IMAGE,
  'Đà Lạt': FALLBACK_IMAGE,
};

interface PopularDestinationsProps {
  onSelectCity: (query: string) => void;
}

export function PopularDestinations({ onSelectCity }: PopularDestinationsProps) {
  const t = useTranslations('home');
  const [destinations, setDestinations] = useState<Destination[]>(FALLBACK_DESTINATIONS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    EventService.getDestinations(4)
      .then((data) => {
        if (data?.destinations?.length) {
          setDestinations(data.destinations);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-6 py-10 w-full">
        <h3 className="text-lg font-extrabold text-[var(--text-primary)] mb-6 tracking-tight">
          {t('popular_destinations')}
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 rounded-2xl bg-[var(--surface-hover)] animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-7xl mx-auto px-6 py-10 w-full">
      <h3 className="text-lg font-extrabold text-[var(--text-primary)] mb-6 tracking-tight">
        {t('popular_destinations')}
      </h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {destinations.map((city) => (
          <div
            key={city.name}
            onClick={() => onSelectCity(city.query)}
            className="group relative h-40 rounded-2xl overflow-hidden cursor-pointer shadow-lg border border-[var(--surface-border)] hover:border-[var(--primary)]/40 transition-all duration-500"
          >
            <div
              className="absolute inset-0 bg-cover bg-center brightness-[0.5] group-hover:scale-110 transition-transform duration-700"
              style={{ backgroundImage: `url(${DESTINATION_IMAGES[city.query] || FALLBACK_IMAGE})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
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
