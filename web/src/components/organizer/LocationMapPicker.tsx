'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Loader2, MapPin, Navigation } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface MapLocation {
  lat: number;
  lng: number;
  address?: string;
}

interface LocationMapPickerProps {
  value?: MapLocation | null;
  onChange: (loc: MapLocation) => void;
  className?: string;
  /** Default center when no value (HCMC) */
  defaultCenter?: { lat: number; lng: number };
}

/**
 * Click/drag map to pick venue coordinates.
 * Uses Google Maps JS when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set;
 * otherwise Leaflet + OpenStreetMap (still opens selection in Google Maps).
 */
export function LocationMapPicker({
  value,
  onChange,
  className,
  defaultCenter = { lat: 10.7769, lng: 106.7009 },
}: LocationMapPickerProps) {
  const t = useTranslations('organizer');
  const mapEl = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latInput, setLatInput] = useState(String(value?.lat ?? defaultCenter.lat));
  const [lngInput, setLngInput] = useState(String(value?.lng ?? defaultCenter.lng));
  const [address, setAddress] = useState(value?.address || '');
  const [geocoding, setGeocoding] = useState(false);
  const leafletRef = useRef<{
    map: import('leaflet').Map;
    marker: import('leaflet').Marker;
    L: typeof import('leaflet');
  } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const googleRef = useRef<{ map: any; marker: any } | null>(null);

  const googleKey =
    typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
      : '';

  // Sync external value → inputs
  useEffect(() => {
    if (value?.lat != null) setLatInput(String(value.lat));
    if (value?.lng != null) setLngInput(String(value.lng));
    if (value?.address != null) setAddress(value.address);
  }, [value?.lat, value?.lng, value?.address]);

  const reverseGeocode = async (lat: number, lng: number) => {
    setGeocoding(true);
    try {
      // Nominatim (OSM) — no key; rate-limit friendly for organizer tools
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
        { headers: { Accept: 'application/json' } }
      );
      if (!res.ok) return undefined;
      const data = (await res.json()) as { display_name?: string };
      return data.display_name;
    } catch {
      return undefined;
    } finally {
      setGeocoding(false);
    }
  };

  const emit = async (lat: number, lng: number, keepAddress?: string) => {
    setLatInput(String(lat));
    setLngInput(String(lng));
    let addr = keepAddress;
    if (!addr) {
      addr = await reverseGeocode(lat, lng);
      if (addr) setAddress(addr);
    }
    onChange({ lat, lng, address: addr || address || undefined });
  };

  // Init Google Maps or Leaflet
  useEffect(() => {
    let cancelled = false;

    const initLeaflet = async () => {
      if (!mapEl.current || cancelled) return;
      const L = await import('leaflet');
      // Fix default marker icons in bundlers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // CSS once
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      const center: [number, number] = [
        value?.lat ?? defaultCenter.lat,
        value?.lng ?? defaultCenter.lng,
      ];
      const map = L.map(mapEl.current).setView(center, 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker(center, { draggable: true }).addTo(map);
      marker.on('dragend', () => {
        const p = marker.getLatLng();
        void emit(p.lat, p.lng);
      });
      map.on('click', (e: { latlng: { lat: number; lng: number } }) => {
        marker.setLatLng(e.latlng);
        void emit(e.latlng.lat, e.latlng.lng);
      });

      leafletRef.current = { map, marker, L };
      setReady(true);
      setTimeout(() => map.invalidateSize(), 100);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = () => (window as any).google;

    const initGoogle = () => {
      if (!mapEl.current || cancelled || !g()?.maps) return;
      const center = {
        lat: value?.lat ?? defaultCenter.lat,
        lng: value?.lng ?? defaultCenter.lng,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapsApi: any = g().maps;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map: any = new mapsApi.Map(mapEl.current, {
        center,
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const marker: any = new mapsApi.Marker({
        map,
        position: center,
        draggable: true,
      });
      marker.addListener('dragend', () => {
        const p = marker.getPosition();
        if (p) void emit(p.lat(), p.lng());
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.addListener('click', (e: any) => {
        if (!e.latLng) return;
        marker.setPosition(e.latLng);
        void emit(e.latLng.lat(), e.latLng.lng());
      });
      googleRef.current = { map, marker };
      setReady(true);
    };

    if (googleKey) {
      if (g()?.maps) {
        initGoogle();
      } else {
        const existing = document.getElementById('gmaps-js');
        if (existing) {
          existing.addEventListener('load', initGoogle);
        } else {
          const script = document.createElement('script');
          script.id = 'gmaps-js';
          script.src = `https://maps.googleapis.com/maps/api/js?key=${googleKey}`;
          script.async = true;
          script.onload = () => initGoogle();
          script.onerror = () => {
            setError(t('map_google_fail'));
            void initLeaflet();
          };
          document.head.appendChild(script);
        }
      }
    } else {
      void initLeaflet().catch((e) => {
        console.error(e);
        setError(t('map_load_error'));
      });
    }

    return () => {
      cancelled = true;
      if (leafletRef.current) {
        leafletRef.current.map.remove();
        leafletRef.current = null;
      }
      googleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, [googleKey]);

  // Move marker when value changes externally
  useEffect(() => {
    if (value?.lat == null || value?.lng == null) return;
    if (leafletRef.current) {
      const { map, marker, L } = leafletRef.current;
      const ll = L.latLng(value.lat, value.lng);
      marker.setLatLng(ll);
      map.panTo(ll);
    }
    if (googleRef.current) {
      const pos = { lat: value.lat, lng: value.lng };
      googleRef.current.marker.setPosition(pos);
      googleRef.current.map.panTo(pos);
    }
  }, [value?.lat, value?.lng]);

  const applyManualCoords = () => {
    const lat = Number(latInput);
    const lng = Number(lngInput);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      setError(t('map_invalid_coords'));
      return;
    }
    setError(null);
    if (leafletRef.current) {
      leafletRef.current.marker.setLatLng([lat, lng]);
      leafletRef.current.map.setView([lat, lng], 16);
    }
    if (googleRef.current) {
      const pos = { lat, lng };
      googleRef.current.marker.setPosition(pos);
      googleRef.current.map.setCenter(pos);
    }
    void emit(lat, lng, address || undefined);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError(t('map_geo_unsupported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setError(null);
        if (leafletRef.current) {
          leafletRef.current.marker.setLatLng([lat, lng]);
          leafletRef.current.map.setView([lat, lng], 16);
        }
        if (googleRef.current) {
          const p = { lat, lng };
          googleRef.current.marker.setPosition(p);
          googleRef.current.map.setCenter(p);
        }
        void emit(lat, lng);
      },
      () => setError(t('map_geo_denied')),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const googleMapsUrl =
    value?.lat != null && value?.lng != null
      ? `https://www.google.com/maps/search/?api=1&query=${value.lat},${value.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${defaultCenter.lat},${defaultCenter.lng}`;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1.5">
          <MapPin className="size-3.5 text-[var(--primary)]" />
          {t('map_pick_label')}
        </Label>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-lg text-[10px] h-8"
            onClick={useMyLocation}
          >
            <Navigation className="size-3" />
            {t('map_my_location')}
          </Button>
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 px-2 h-8 rounded-lg border border-[var(--surface-border)] text-[10px] font-bold text-[var(--text-secondary)] hover:text-[var(--primary)]"
          >
            <ExternalLink className="size-3" />
            Google Maps
          </a>
        </div>
      </div>

      <p className="text-[10px] text-[var(--text-muted)]">{t('map_pick_hint')}</p>

      <div
        ref={mapEl}
        className="relative w-full h-[260px] rounded-xl overflow-hidden border border-[var(--surface-border)] bg-[var(--surface-hover)] z-0"
      >
        {!ready && !error && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <Loader2 className="size-6 text-[var(--primary)] animate-spin" />
          </div>
        )}
      </div>

      {error && <p className="text-[11px] text-[var(--error)]">{error}</p>}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] mb-1 block">Lat</Label>
          <Input
            value={latInput}
            onChange={(e) => setLatInput(e.target.value)}
            className="rounded-xl h-9 text-xs font-mono"
          />
        </div>
        <div>
          <Label className="text-[10px] mb-1 block">Lng</Label>
          <Input
            value={lngInput}
            onChange={(e) => setLngInput(e.target.value)}
            className="rounded-xl h-9 text-xs font-mono"
          />
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-xl text-xs"
        onClick={applyManualCoords}
      >
        {t('map_apply_coords')}
      </Button>

      <div>
        <Label className="text-[10px] mb-1 block flex items-center gap-1">
          {t('venue_address')}
          {geocoding && <Loader2 className="size-3 animate-spin" />}
        </Label>
        <Input
          value={address}
          onChange={(e) => {
            setAddress(e.target.value);
            if (value?.lat != null && value?.lng != null) {
              onChange({ lat: value.lat, lng: value.lng, address: e.target.value });
            }
          }}
          className="rounded-xl text-xs"
          placeholder={t('map_address_placeholder')}
        />
      </div>
    </div>
  );
}


