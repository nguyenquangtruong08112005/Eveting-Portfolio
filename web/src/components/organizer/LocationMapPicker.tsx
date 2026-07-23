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

/**
 * Click/drag map to pick venue coordinates — OpenStreetMap via Leaflet only.
 * No Google Maps API key required.
 *
 * Map host div stays empty of React children so Leaflet owns the DOM safely.
 */
export function LocationMapPicker({
  value,
  onChange,
  className,
  defaultCenter = { lat: 10.7769, lng: 106.7009 },
}: LocationMapPickerProps) {
  const t = useTranslations('organizer');
  const mapHostRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  const addressRef = useRef(value?.address || '');

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

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
  const destroyedRef = useRef(false);

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

  const destroyMap = useCallback(() => {
    destroyedRef.current = true;
    try {
      if (leafletRef.current) {
        leafletRef.current.map.off();
        leafletRef.current.map.remove();
        leafletRef.current = null;
      }
    } catch {
      /* ignore teardown races */
    }
    const host = mapHostRef.current;
    if (host) {
      try {
        while (host.firstChild) host.removeChild(host.firstChild);
      } catch {
        host.innerHTML = '';
      }
    }
  }, []);

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

      host.innerHTML = '';
      const map = L.map(host, { zoomControl: true }).setView([centerLat, centerLng], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
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

    void initLeaflet().catch((e) => {
      console.error(e);
      if (!cancelled) setError(t('map_load_error'));
    });

    return () => {
      cancelled = true;
      destroyMap();
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destroyMap, emit, t]);

  useEffect(() => {
    if (value?.lat == null || value?.lng == null || !leafletRef.current) return;
    const { map, marker, L } = leafletRef.current;
    const ll = L.latLng(value.lat, value.lng);
    marker.setLatLng(ll);
    map.panTo(ll);
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
    void emit(lat, lng, address || undefined);
  };

  const handleMyLocation = async () => {
    if (!navigator.geolocation) {
      setError(t('map_geo_unsupported'));
      return;
    }
    try {
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

  const lat = value?.lat ?? defaultCenter.lat;
  const lng = value?.lng ?? defaultCenter.lng;
  const osmOpenUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;

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
            onClick={() => void handleMyLocation()}
          >
            <Navigation className="size-3" />
            {t('map_my_location')}
          </Button>
          <a
            href={osmOpenUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 px-2 h-8 rounded-lg border border-[var(--surface-border)] text-[10px] font-bold text-[var(--text-secondary)] hover:text-[var(--primary)]"
          >
            <ExternalLink className="size-3" />
            OpenStreetMap
          </a>
        </div>
      </div>

      <p className="text-[10px] text-[var(--text-muted)]">{t('map_pick_hint')}</p>

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
