'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, MapPin, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/AppShell';
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
import { ORG_NAV } from '@/features/organizer/nav';
import { VenueService } from '@/features/organizer/api';
import type { Venue } from '@/types';

export function VenuesView() {
  const t = useTranslations('organizer');
  const tCommon = useTranslations('common');
  const [list, setList] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [capacity, setCapacity] = useState<number | ''>('');

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

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error(t('venue_validation'));
      return;
    }
    setSaving(true);
    try {
      await VenueService.create({
        name: name.trim(),
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        capacity: capacity === '' ? undefined : Number(capacity),
      });
      toast.success(t('venue_created'));
      setOpen(false);
      setName('');
      setAddress('');
      setCity('');
      setCapacity('');
      await load();
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message || t('venue_error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell variant="organizer" items={ORG_NAV} heading={tCommon('org_badge')}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 lg:py-10 w-full">
        <PageHeader
          title={t('venues_title')}
          description={t('venues_subtitle')}
          icon={<MapPin className="size-5" />}
          actions={
            <Button
              onClick={() => setOpen(true)}
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
                onClick={() => setOpen(true)}
                className="btn-primary-gradient text-[var(--on-primary)] border-none rounded-xl text-xs font-bold"
              >
                <Plus className="size-4" />
                {t('venue_create')}
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map((v) => (
              <div
                key={v.id}
                className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] p-5 space-y-2"
              >
                <div className="flex items-start gap-2">
                  <MapPin className="size-4 text-[var(--primary)] shrink-0 mt-0.5" />
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">{v.name}</h3>
                </div>
                {(v.address || v.city) && (
                  <p className="text-xs text-[var(--text-secondary)]">
                    {[v.address, v.city].filter(Boolean).join(', ')}
                  </p>
                )}
                {v.capacity != null && (
                  <p className="text-[10px] text-[var(--text-muted)] font-semibold">
                    {t('venue_capacity', { n: v.capacity })}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('venue_create')}</DialogTitle>
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
                <Label className="text-xs mb-1.5 block">{t('venue_address')}</Label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="rounded-xl"
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
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" className="rounded-xl text-xs" onClick={() => setOpen(false)}>
                {t('promo_cancel')}
              </Button>
              <Button
                disabled={saving}
                onClick={handleCreate}
                className="btn-primary-gradient text-[var(--on-primary)] border-none rounded-xl text-xs"
              >
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
                {t('venue_save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
