'use client';

import { useState, useEffect, useCallback } from 'react';
import { Image as ImageIcon, Play, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { SafeImage } from '@/components/shared/SafeImage';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { MediaService } from '@/services/media.service';
import type { EventMedia } from '@/types';

interface MediaGalleryProps {
  eventId: string;
}

export function MediaGallery({ eventId }: MediaGalleryProps) {
  const t = useTranslations('media');
  const [media, setMedia] = useState<EventMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<EventMedia | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await MediaService.listEventMedia(eventId);
      setMedia(data.media || []);
    } catch (err) {
      console.error('Media load error:', err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  // Close lightbox on Escape
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActive(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);

  return (
    <div className="bg-[var(--surface)] border border-[var(--surface-border)] rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <ImageIcon className="size-5 text-[var(--primary)]" />
        <h3 className="text-base font-bold text-[var(--text-primary)]">{t('title')}</h3>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      ) : media.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title={t('empty')}
          description={t('empty_desc')}
          className="border-none bg-transparent py-8"
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {media.map((item) => (
            <button
              key={item.id}
              onClick={() => setActive(item)}
              className="relative aspect-square rounded-xl overflow-hidden bg-[var(--surface-hover)] border border-[var(--surface-border)] hover:border-[var(--primary)]/40 transition-all group"
              aria-label={item.caption || 'Open media'}
            >
              {item.type === 'image' ? (
                <SafeImage
                  src={item.url}
                  alt={item.caption || ''}
                  fill
                  sizes="(max-width: 640px) 50vw, 25vw"
                  className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <>
                  <SafeImage
                    src={item.url}
                    alt={item.caption || ''}
                    fill
                    sizes="(max-width: 640px) 50vw, 25vw"
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="size-10 rounded-full bg-white/90 flex items-center justify-center">
                      <Play className="size-4 text-[var(--background)] fill-[var(--background)] ml-0.5" />
                    </div>
                  </div>
                </>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {active && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setActive(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <button
            onClick={() => setActive(null)}
            aria-label={t('close')}
            className="absolute top-4 right-4 size-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="size-5" />
          </button>
          <div className="max-w-4xl max-h-[85vh] w-full" onClick={(e) => e.stopPropagation()}>
            {active.type === 'image' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={active.url}
                alt={active.caption || ''}
                className="w-full h-auto max-h-[80vh] object-contain rounded-xl"
              />
            ) : (
              <video
                src={active.url}
                controls
                autoPlay
                className="w-full h-auto max-h-[80vh] rounded-xl bg-black"
              />
            )}
            {active.caption && (
              <p className="text-white/80 text-sm text-center mt-3">{active.caption}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
