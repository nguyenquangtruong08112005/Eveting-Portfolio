'use client';

import { useEffect, useState } from 'react';
import { Cloud, CloudRain, CloudSun, Sun, Wind, Droplets } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { EventService } from '@/services/event.service';
import type { EventWeather } from '@/types';
import { cn } from '@/lib/utils';

interface WeatherWidgetProps {
  eventId: string;
  className?: string;
}

function WeatherIcon({ condition }: { condition?: string }) {
  const c = (condition || '').toLowerCase();
  if (c.includes('rain') || c.includes('drizzle') || c.includes('storm')) {
    return <CloudRain className="size-8 text-[var(--info)]" />;
  }
  if (c.includes('cloud')) {
    return <CloudSun className="size-8 text-[var(--text-secondary)]" />;
  }
  if (c.includes('clear') || c.includes('sun')) {
    return <Sun className="size-8 text-[var(--warning)]" />;
  }
  return <Cloud className="size-8 text-[var(--text-muted)]" />;
}

export function WeatherWidget({ eventId, className }: WeatherWidgetProps) {
  const t = useTranslations('weather');
  const [weather, setWeather] = useState<EventWeather | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    EventService.getWeather(eventId)
      .then((data) => {
        if (!cancelled) setWeather(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  if (loading) {
    return (
      <div
        className={cn(
          'rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] p-4 animate-pulse h-24',
          className
        )}
      />
    );
  }

  if (error || !weather) {
    return (
      <div
        className={cn(
          'rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] p-4 text-xs text-[var(--text-muted)]',
          className
        )}
      >
        {t('unavailable')}
      </div>
    );
  }

  const temp =
    weather.tempC ??
    (weather as EventWeather & { temperature?: number }).temperature;
  const humidity = weather.humidity;
  const wind = weather.windKph ?? (weather as EventWeather & { windSpeed?: number }).windSpeed;
  const condition = weather.condition || weather.forecast || weather.description;
  const iconUrl = weather.iconUrl || (weather.icon ? `https://openweathermap.org/img/wn/${weather.icon}@2x.png` : null);

  return (
    <div
      className={cn(
        'rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] p-4 flex items-center gap-4',
        className
      )}
    >
      <div className="size-14 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center shrink-0 overflow-hidden">
        {iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={iconUrl} alt="" className="size-12" />
        ) : (
          <WeatherIcon condition={condition} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-0.5">
          {t('title')}
        </p>
        <p className="text-lg font-black text-[var(--text-primary)] leading-none">
          {temp != null ? `${Math.round(Number(temp))}°C` : '—'}
          {condition ? (
            <span className="ml-2 text-xs font-semibold text-[var(--text-secondary)] capitalize">
              {condition}
            </span>
          ) : null}
        </p>
        <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-[var(--text-muted)]">
          {humidity != null && (
            <span className="inline-flex items-center gap-1">
              <Droplets className="size-3 text-[var(--info)]" />
              {t('humidity', { value: humidity })}
            </span>
          )}
          {wind != null && (
            <span className="inline-flex items-center gap-1">
              <Wind className="size-3 text-[var(--accent-brand)]" />
              {t('wind', { value: Math.round(Number(wind)) })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
