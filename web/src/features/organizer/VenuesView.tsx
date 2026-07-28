'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, MapPin, Plus, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { OrganizerShell } from '@/components/organizer/OrganizerShell';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { LocationMapPicker, type MapLocation } from '@/components/organizer/LocationMapPicker';
import { VenueService } from '@/features/organizer/api';
import type { Venue } from '@/types';

export function VenuesView() {
  const t = useTranslations('organizer');
  const [list, setList] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Venue | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [capacity, setCapacity] = useState<number | ''>('');
  const [mapLoc, setMapLoc] = useState<MapLocation | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await VenueService.list();
      setList(data || []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setName('');
    setAddress('');
    setCity('');
    setCapacity('');
    setMapLoc(null);
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (v: Venue) => {
    setEditing(v);
    setName(v.name || '');
    setAddress(v.address || '');
    setCity(v.city || '');
    setCapacity(v.capacity != null ? Number(v.capacity) : '');
    const lat = v.lat ?? v.location?.latitude ?? v.location?.lat;
    const lng = v.lng ?? v.location?.longitude ?? v.location?.lng;
    if (lat != null && lng != null) {
      setMapLoc({ lat: Number(lat), lng: Number(lng), address: v.address });
    } else {
      setMapLoc(null);
    }
    setOpen(true);
  };

  const handleMapChange = (loc: MapLocation) => {
    setMapLoc(loc);
    if (loc.address) setAddress(loc.address);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(t('venue_validation'));
      return;
    }
    if (mapLoc?.lat == null || mapLoc?.lng == null) {
      toast.error(t('venue_map_required'));
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        address: address.trim() || mapLoc.address || undefined,
        city: city.trim() || undefined,
        capacity: capacity === '' ? undefined : Number(capacity),
        lat: mapLoc.lat,
        lng: mapLoc.lng,
        location: { latitude: mapLoc.lat, longitude: mapLoc.lng },
      };
      if (editing) {
        await VenueService.update(editing.id, body);
        toast.success(t('venue_updated'));
      } else {
        await VenueService.create(body);
        toast.success(t('venue_created'));
      }
      setOpen(false);
      resetForm();
      await load();
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message || t('venue_error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (v: Venue) => {
    if (!confirm(t('venue_delete_confirm', { name: v.name }))) return;
    try {
      await VenueService.remove(v.id);
      toast.success(t('venue_deleted'));
      await load();
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message || t('venue_error'));
    }
  };

  const mapsLink = (v: Venue) => {
    const lat = v.lat ?? v.location?.latitude ?? v.location?.lat;
    const lng = v.lng ?? v.location?.longitude ?? v.location?.lng;
    if (lat == null || lng == null) return null;
    return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;
  };

  return (
    <OrganizerShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 lg:py-10 w-full">
        <PageHeader
          title={t('venues_title')}
          description={t('venues_subtitle')}
          icon={<MapPin className="size-5" />}
          actions={
            <Button
              onClick={openCreate}
              className="btn-primary-gradient text-[var(--on-primary)] border-none rounded-xl text-xs font-bold"
            >
              <Plus className="size-4" />
              {t('venue_create')}
            </Button>
          }
        />

        <p className="text-[11px] text-[var(--text-muted)] mb-4">{t('venues_catalog_note')}</p>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="size-10 text-[var(--primary)] animate-spin" />
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title={t('venue_empty')}
            description={t('venue_empty_desc')}
            action={
              <Button
                onClick={openCreate}
                className="btn-primary-gradient text-[var(--on-primary)] border-none rounded-xl text-xs font-bold"
              >
                <Plus className="size-4" />
                {t('venue_create')}
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map((v) => {
              const link = mapsLink(v);
              return (
                <div
                  key={v.id}
                  className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] p-5 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <MapPin className="size-4 text-[var(--primary)] shrink-0 mt-0.5" />
                      <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">
                        {v.name}
                      </h3>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="xs"
                        variant="outline"
                        className="rounded-lg"
                        onClick={() => openEdit(v)}
                      >
                        <Pencil className="size-3" />
                      </Button>
                      <Button
                        size="xs"
                        variant="destructive"
                        className="rounded-lg"
                        onClick={() => handleDelete(v)}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>
                  {(v.address || v.city) && (
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                      {[v.address, v.city].filter(Boolean).join(', ')}
                    </p>
                  )}
                  {v.lat != null && v.lng != null && (
                    <p className="text-[10px] font-mono text-[var(--text-muted)]">
                      {Number(v.lat).toFixed(5)}, {Number(v.lng).toFixed(5)}
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    {v.capacity != null ? (
                      <p className="text-[10px] text-[var(--text-muted)] font-semibold">
                        {t('venue_capacity', { n: v.capacity })}
                      </p>
                    ) : (
                      <span />
                    )}
                    {link && (
                      <a
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--primary)] hover:underline"
                      >
                        <ExternalLink className="size-3" />
                        OpenStreetMap
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) resetForm();
          }}
        >
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editing ? t('venue_edit') : t('venue_create')}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label className="text-xs mb-1.5 block">{t('venue_name')}</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-xl"
                  required
                />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">{t('venue_city')}</Label>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">{t('venue_capacity_label')}</Label>
                <Input
                  type="number"
                  value={capacity}
                  onChange={(e) =>
                    setCapacity(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  className="rounded-xl"
                />
              </div>

              {/* key forces clean remount; avoids map DOM removeChild races on dialog close */}
              {open && (
                <LocationMapPicker
                  key={editing?.id || 'new-venue-map'}
                  value={mapLoc}
                  onChange={handleMapChange}
                />
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                className="rounded-xl text-xs"
                onClick={() => {
                  setOpen(false);
                  resetForm();
                }}
              >
                {t('promo_cancel')}
              </Button>
              <Button
                disabled={saving}
                onClick={handleSave}
                className="btn-primary-gradient text-[var(--on-primary)] border-none rounded-xl text-xs"
              >
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
                {t('venue_save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </OrganizerShell>
  );
}
