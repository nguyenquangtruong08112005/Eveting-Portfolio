'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
  defaultCenter?: { lat: number; lng: number };
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google?: any;
    __gmapsInit?: () => void;
  }
}

/** Singleton Google Maps script loader (async + callback). */
function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));
  if (window.google?.maps?.Map) return Promise.resolve();

  const existing = document.getElementById('gmaps-js') as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve, reject) => {
      if (window.google?.maps?.Map) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('gmaps load error')), {
        once: true,
      });
    });
  }

  return new Promise((resolve, reject) => {
    const prev = window.__gmapsInit;
    window.__gmapsInit = () => {
      prev?.();
      resolve();
    };
    const script = document.createElement('script');
    script.id = 'gmaps-js';
    script.async = true;
    script.defer = true;
    // Google recommends loading=async in the URL for best-practice loading
    script.src =
      `https://maps.googleapis.com/maps/api/js` +
      `?key=${encodeURIComponent(apiKey)}` +
      `&v=weekly` +
      `&loading=async` +
      `&callback=__gmapsInit`;
    script.onerror = () => reject(new Error('gmaps script error'));
    document.head.appendChild(script);
  });
}

/**
 * Click/drag map to pick venue coordinates.
 * Google Maps when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set; else Leaflet/OSM.
 *
 * Important: the map host div must stay empty of React children so map libs
 * can own the DOM without removeChild conflicts on unmount (e.g. Dialog close).
 */
export function LocationMapPicker({
  value,
  onChange,
  className,
  defaultCenter = { lat: 10.7769, lng: 106.7009 },
}: LocationMapPickerProps) {
  const t = useTranslations('organizer');
  /** Host element only for map lib — never put React children inside */
  const mapHostRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const addressRef = useRef(value?.address || '');

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
  const googleRef = useRef<{ map: any; marker: any; clickListener?: any; dragListener?: any } | null>(
    null
  );
  const destroyedRef = useRef(false);

  const googleKey =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '' : '';

  useEffect(() => {
    addressRef.current = address;
  }, [address]);

  useEffect(() => {
    if (value?.lat != null) setLatInput(String(value.lat));
    if (value?.lng != null) setLngInput(String(value.lng));
    if (value?.address != null) {
      setAddress(value.address);
      addressRef.current = value.address;
    }
  }, [value?.lat, value?.lng, value?.address]);

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setGeocoding(true);
    try {
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
  }, []);

  const emit = useCallback(
    async (lat: number, lng: number, keepAddress?: string) => {
      if (destroyedRef.current) return;
      setLatInput(String(lat));
      setLngInput(String(lng));
      let addr = keepAddress;
      if (!addr) {
        addr = await reverseGeocode(lat, lng);
        if (destroyedRef.current) return;
        if (addr) {
          setAddress(addr);
          addressRef.current = addr;
        }
      }
      onChangeRef.current({
        lat,
        lng,
        address: addr || addressRef.current || undefined,
      });
    },
    [reverseGeocode]
  );

  const destroyMaps = useCallback(() => {
    destroyedRef.current = true;
    try {
      if (leafletRef.current) {
        const { map } = leafletRef.current;
        map.off();
        map.remove();
        leafletRef.current = null;
      }
    } catch {
      /* ignore leaflet teardown races */
    }
    try {
      if (googleRef.current) {
        const { marker, clickListener, dragListener } = googleRef.current;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const g = (window as any).google;
        if (g?.maps?.event) {
          if (clickListener) g.maps.event.removeListener(clickListener);
          if (dragListener) g.maps.event.removeListener(dragListener);
          if (marker) g.maps.event.clearInstanceListeners(marker);
          if (googleRef.current.map) g.maps.event.clearInstanceListeners(googleRef.current.map);
        }
        // Detach marker from map without fighting React
        if (marker?.setMap) marker.setMap(null);
        googleRef.current = null;
      }
    } catch {
      /* ignore google teardown races */
    }
    // Clear host after libs release — React never owned these children
    const host = mapHostRef.current;
    if (host) {
      try {
        while (host.firstChild) {
          host.removeChild(host.firstChild);
        }
      } catch {
        host.innerHTML = '';
      }
    }
  }, []);

  // Init map once
  useEffect(() => {
    destroyedRef.current = false;
    let cancelled = false;

    const centerLat = value?.lat ?? defaultCenter.lat;
    const centerLng = value?.lng ?? defaultCenter.lng;

    const initLeaflet = async () => {
      const host = mapHostRef.current;
      if (!host || cancelled || destroyedRef.current) return;

      const L = await import('leaflet');
      if (cancelled || destroyedRef.current || !mapHostRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      // Ensure empty host
      host.innerHTML = '';
      const map = L.map(host, { zoomControl: true }).setView([centerLat, centerLng], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([centerLat, centerLng], { draggable: true }).addTo(map);
      marker.on('dragend', () => {
        const p = marker.getLatLng();
        void emit(p.lat, p.lng);
      });
      map.on('click', (e: { latlng: { lat: number; lng: number } }) => {
        marker.setLatLng(e.latlng);
        void emit(e.latlng.lat, e.latlng.lng);
      });

      leafletRef.current = { map, marker, L };
      if (!cancelled) {
        setReady(true);
        requestAnimationFrame(() => {
          try {
            map.invalidateSize();
          } catch {
            /* ignore */
          }
        });
      }
    };

    const initGoogle = async () => {
      const host = mapHostRef.current;
      if (!host || cancelled || destroyedRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapsApi: any = window.google?.maps;
      if (!mapsApi?.Map) return;

      host.innerHTML = '';
      const center = { lat: centerLat, lng: centerLng };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map: any = new mapsApi.Map(host, {
        center,
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        // Avoid gesture conflicts inside scrollable dialogs
        gestureHandling: 'greedy',
      });

      // Prefer AdvancedMarkerElement when Map ID is configured; else classic Marker
      // (classic is deprecated but still supported; AdvancedMarker needs mapId)
      const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || '';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let marker: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let dragListener: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let clickListener: any;

      if (mapId && mapsApi.marker?.AdvancedMarkerElement) {
        map.setOptions({ mapId });
        marker = new mapsApi.marker.AdvancedMarkerElement({
          map,
          position: center,
          gmpDraggable: true,
        });
        dragListener = marker.addListener('dragend', () => {
          const p = marker.position;
          if (!p) return;
          const lat = typeof p.lat === 'function' ? p.lat() : p.lat;
          const lng = typeof p.lng === 'function' ? p.lng() : p.lng;
          void emit(Number(lat), Number(lng));
        });
        clickListener = map.addListener('click', (e: { latLng?: { lat: () => number; lng: () => number } }) => {
          if (!e.latLng) return;
          marker.position = e.latLng;
          void emit(e.latLng.lat(), e.latLng.lng());
        });
      } else {
        // Classic Marker — still supported; avoids requiring a Cloud Map ID
        marker = new mapsApi.Marker({
          map,
          position: center,
          draggable: true,
        });
        dragListener = marker.addListener('dragend', () => {
          const p = marker.getPosition();
          if (p) void emit(p.lat(), p.lng());
        });
        clickListener = map.addListener('click', (e: { latLng?: { lat: () => number; lng: () => number } }) => {
          if (!e.latLng) return;
          marker.setPosition(e.latLng);
          void emit(e.latLng.lat(), e.latLng.lng());
        });
      }

      googleRef.current = { map, marker, clickListener, dragListener };
      if (!cancelled) setReady(true);
    };

    const boot = async () => {
      try {
        if (googleKey) {
          try {
            await loadGoogleMapsScript(googleKey);
            if (cancelled || destroyedRef.current) return;
            await initGoogle();
            return;
          } catch (e) {
            console.warn(e);
            if (!cancelled) setError(t('map_google_fail'));
          }
        }
        await initLeaflet();
      } catch (e) {
        console.error(e);
        if (!cancelled) setError(t('map_load_error'));
      }
    };

    void boot();

    return () => {
      cancelled = true;
      destroyMaps();
      setReady(false);
    };
    // Mount once per picker instance (key on parent when reopening dialog)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleKey, destroyMaps, emit, t]);

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
      const m = googleRef.current.marker;
      if (m.setPosition) m.setPosition(pos);
      else m.position = pos;
      googleRef.current.map.panTo?.(pos);
      googleRef.current.map.setCenter?.(pos);
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
      const m = googleRef.current.marker;
      if (m.setPosition) m.setPosition(pos);
      else m.position = pos;
      googleRef.current.map.setCenter?.(pos);
      googleRef.current.map.panTo?.(pos);
    }
    void emit(lat, lng, address || undefined);
  };

  const useMyLocation = async () => {
    if (!navigator.geolocation) {
      setError(t('map_geo_unsupported'));
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const perms = (navigator as any).permissions;
      if (perms?.query) {
        const status = await perms.query({ name: 'geolocation' as PermissionName });
        if (status.state === 'denied') {
          setError(t('map_geo_denied_help'));
          return;
        }
      }
    } catch {
      /* ignore */
    }

    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (leafletRef.current) {
          leafletRef.current.marker.setLatLng([lat, lng]);
          leafletRef.current.map.setView([lat, lng], 16);
        }
        if (googleRef.current) {
          const p = { lat, lng };
          const m = googleRef.current.marker;
          if (m.setPosition) m.setPosition(p);
          else m.position = p;
          googleRef.current.map.setCenter?.(p);
        }
        void emit(lat, lng);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setError(t('map_geo_denied_help'));
        else if (err.code === err.TIMEOUT) setError(t('map_geo_timeout'));
        else setError(t('map_geo_denied'));
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
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
            onClick={() => void useMyLocation()}
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

      {/* Overlay spinner OUTSIDE map host so React never fights map DOM */}
      <div className="relative w-full h-[260px] rounded-xl overflow-hidden border border-[var(--surface-border)] bg-[var(--surface-hover)] z-0">
        {!ready && !error && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <Loader2 className="size-6 text-[var(--primary)] animate-spin" />
          </div>
        )}
        <div ref={mapHostRef} className="absolute inset-0 z-0" />
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
        <Label className="text-[10px] mb-1 flex items-center gap-1">
          {t('venue_address')}
          {geocoding && <Loader2 className="size-3 animate-spin" />}
        </Label>
        <Input
          value={address}
          onChange={(e) => {
            setAddress(e.target.value);
            addressRef.current = e.target.value;
            if (value?.lat != null && value?.lng != null) {
              onChangeRef.current({
                lat: value.lat,
                lng: value.lng,
                address: e.target.value,
              });
            }
          }}
          className="rounded-xl text-xs"
          placeholder={t('map_address_placeholder')}
        />
      </div>
    </div>
  );
}
