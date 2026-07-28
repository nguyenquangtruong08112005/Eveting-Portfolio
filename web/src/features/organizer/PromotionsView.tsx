'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Loader2,
  Plus,
  TicketPercent,
  Trash2,
  Pencil,
  CalendarClock,
  Layers2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { OrganizerShell } from '@/components/organizer/OrganizerShell';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
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
import { PromotionService, OrganizerService } from '@/features/organizer/api';
import { useOrganizerWorkspace } from '@/features/organizer/OrganizerWorkspace';
import { formatPrice } from '@/lib/constants';
import type { Promotion, OrganizerEvent } from '@/types';

function toLocalInput(value?: number): string {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function PromotionsView() {
  const t = useTranslations('organizer');
  const { can } = useOrganizerWorkspace();
  const [list, setList] = useState<Promotion[]>([]);
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editPromo, setEditPromo] = useState<Promotion | null>(null);
  const [saving, setSaving] = useState(false);

  // Create form
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');
  const [discountValue, setDiscountValue] = useState(10000);
  const [eventId, setEventId] = useState('');
  const [usageLimit, setUsageLimit] = useState(100);
  const [isPublic, setIsPublic] = useState(false);
  const [description, setDescription] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [minQty, setMinQty] = useState(1);
  const [maxQty, setMaxQty] = useState(0);
  const [maxOrdersPerBuyer, setMaxOrdersPerBuyer] = useState(1);
  const [promoImageUrl, setPromoImageUrl] = useState('');

  // Edit form (full CRUD fields)
  const [editCode, setEditCode] = useState('');
  const [editDiscountType, setEditDiscountType] = useState<'amount' | 'percent'>('amount');
  const [editDiscountValue, setEditDiscountValue] = useState(0);
  const [editEventId, setEditEventId] = useState('');
  const [editUsage, setEditUsage] = useState(100);
  const [editPublic, setEditPublic] = useState(false);
  const [editDesc, setEditDesc] = useState('');
  const [editMinQty, setEditMinQty] = useState(1);
  const [editMaxQty, setEditMaxQty] = useState(0);
  const [editMaxOrdersPerBuyer, setEditMaxOrdersPerBuyer] = useState(1);
  const [editValidFrom, setEditValidFrom] = useState('');
  const [editValidUntil, setEditValidUntil] = useState('');
  const [editPromoImageUrl, setEditPromoImageUrl] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, eRes] = await Promise.allSettled([
        PromotionService.listMine(),
        OrganizerService.getEvents(),
      ]);
      if (pRes.status === 'fulfilled') setList(pRes.value || []);
      else setList([]);
      if (eRes.status === 'fulfilled') setEvents(eRes.value.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetCreate = () => {
    setCode('');
    setDiscountType('amount');
    setDiscountValue(10000);
    setEventId('');
    setUsageLimit(100);
    setIsPublic(false);
    setDescription('');
    setValidFrom('');
    setValidUntil('');
    setMinQty(1);
    setMaxQty(0);
    setMaxOrdersPerBuyer(1);
    setPromoImageUrl('');
  };

  const handleCreate = async () => {
    if (!can('MANAGE_VOUCHERS')) return;
    if (!code.trim() || !discountValue) {
      toast.error(t('promo_validation'));
      return;
    }
    setSaving(true);
    try {
      await PromotionService.create({
        code: code.trim().toUpperCase(),
        discountType,
        discountValue: Number(discountValue),
        eventId: eventId || null,
        usageLimit: Number(usageLimit) || 100,
        isPublic,
        description: description.trim() || undefined,
        name: code.trim().toUpperCase(),
        validFrom: validFrom ? new Date(validFrom).getTime() : undefined,
        validUntil: validUntil ? new Date(validUntil).getTime() : undefined,
        minTicketQuantity: Math.max(1, Number(minQty) || 1),
        maxTicketQuantity: Number(maxQty) || undefined,
        maxOrdersPerBuyer: Math.max(1, Number(maxOrdersPerBuyer) || 1),
        promoImageUrl: promoImageUrl.trim() || undefined,
        stackable: false,
      });
      toast.success(t('promo_created'));
      setCreateOpen(false);
      resetCreate();
      await load();
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message || t('promo_error'));
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (p: Promotion) => {
    setEditPromo(p);
    setEditCode(p.code || '');
    setEditDiscountType(p.discountType === 'percent' ? 'percent' : 'amount');
    setEditDiscountValue(Number(p.discountValue) || 0);
    setEditEventId(p.eventId || '');
    setEditUsage(p.usageLimit ?? 100);
    setEditPublic(!!p.isPublic);
    setEditDesc(p.description || '');
    setEditMinQty(p.minTicketQuantity ?? 1);
    setEditMaxQty(p.maxTicketQuantity ?? 0);
    setEditMaxOrdersPerBuyer(p.maxOrdersPerBuyer ?? 1);
    setEditValidFrom(toLocalInput(p.validFrom));
    setEditValidUntil(toLocalInput(p.validUntil));
    setEditPromoImageUrl(p.promoImageUrl || '');
  };

  const handleUpdate = async () => {
    if (!can('MANAGE_VOUCHERS')) return;
    if (!editPromo) return;
    if (!editCode.trim() || !editDiscountValue) {
      toast.error(t('promo_validation'));
      return;
    }
    setSaving(true);
    try {
      await PromotionService.update(editPromo.id, {
        code: editCode.trim().toUpperCase(),
        discountType: editDiscountType,
        discountValue: Number(editDiscountValue),
        eventId: editEventId || null,
        usageLimit: Number(editUsage) || 0,
        isPublic: editPublic,
        description: editDesc,
        minTicketQuantity: Number(editMinQty) || 1,
        name: editCode.trim().toUpperCase(),
        maxTicketQuantity: Number(editMaxQty) || undefined,
        maxOrdersPerBuyer: Math.max(1, Number(editMaxOrdersPerBuyer) || 1),
        validFrom: editValidFrom ? new Date(editValidFrom).getTime() : undefined,
        validUntil: editValidUntil ? new Date(editValidUntil).getTime() : undefined,
        promoImageUrl: editPromoImageUrl.trim() || undefined,
        stackable: false,
      });
      toast.success(t('promo_updated'));
      setEditPromo(null);
      await load();
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message || t('promo_error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: Promotion) => {
    if (!can('MANAGE_VOUCHERS')) return;
    if (!confirm(t('promo_delete_confirm', { code: p.code }))) return;
    try {
      await PromotionService.remove(p.id);
      toast.success(t('promo_deleted'));
      await load();
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message || t('promo_error'));
    }
  };

  const eventName = (id?: string | null) => {
    if (!id) return t('promo_all_events');
    return events.find((e) => e.id === id)?.name || id.slice(0, 8);
  };

  return (
    <OrganizerShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 lg:py-10 w-full">
        <PageHeader
          title={t('promotions_title')}
          description={t('promotions_subtitle')}
          icon={<TicketPercent className="size-5" />}
          actions={
            <Button
              onClick={() => setCreateOpen(true)}
              disabled={!can('MANAGE_VOUCHERS')}
              title={!can('MANAGE_VOUCHERS') ? 'MANAGE_VOUCHERS permission required' : undefined}
              className="btn-primary-gradient text-[var(--on-primary)] border-none rounded-xl text-xs font-bold"
            >
              <Plus className="size-4" />
              {t('promo_create')}
            </Button>
          }
        />

        <div className="mb-6 flex items-start gap-3 rounded-lg border border-[var(--primary)]/25 bg-[var(--primary)]/10 p-4">
          <Layers2 className="mt-0.5 size-4 shrink-0 text-[var(--primary)]" />
          <div>
            <p className="text-xs font-bold text-[var(--text-primary)]">
              Promotions are non-stackable
            </p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Checkout may apply one public voucher or one private code per order, never
              both. The best eligible discount must be selected by the server.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="size-10 text-[var(--primary)] animate-spin" />
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            icon={TicketPercent}
            title={t('promo_empty')}
            description={t('promo_empty_desc')}
            action={
              <Button
                onClick={() => setCreateOpen(true)}
                className="btn-primary-gradient text-[var(--on-primary)] border-none rounded-xl text-xs font-bold"
              >
                <Plus className="size-4" />
                {t('promo_create')}
              </Button>
            }
          />
        ) : (
          <div className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--surface-border)] text-[var(--text-muted)]">
                    <th className="text-left py-3 px-4 text-xs font-bold uppercase">{t('promo_col_code')}</th>
                    <th className="text-left py-3 px-4 text-xs font-bold uppercase">{t('promo_col_discount')}</th>
                    <th className="text-left py-3 px-4 text-xs font-bold uppercase">{t('promo_col_event')}</th>
                    <th className="text-left py-3 px-4 text-xs font-bold uppercase">{t('promo_col_usage')}</th>
                    <th className="text-left py-3 px-4 text-xs font-bold uppercase">{t('promo_col_public')}</th>
                    <th className="text-right py-3 px-4 text-xs font-bold uppercase">{t('promo_col_actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--surface-border)]">
                  {list.map((p) => (
                    <tr key={p.id} className="hover:bg-[var(--surface-hover)]/40">
                      <td className="py-3 px-4 font-black text-[var(--primary)] tracking-wide">
                        {p.code}
                      </td>
                      <td className="py-3 px-4 font-bold text-[var(--text-primary)]">
                        {p.discountType === 'percent'
                          ? `-${p.discountValue}%`
                          : formatPrice(p.discountValue ?? 0)}
                      </td>
                      <td className="py-3 px-4 text-xs text-[var(--text-secondary)] max-w-[160px] truncate">
                        {eventName(p.eventId)}
                      </td>
                      <td className="py-3 px-4 text-xs text-[var(--text-muted)]">
                        {p.usedCount ?? 0}/{p.usageLimit ?? '∞'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          className={
                            p.isPublic
                              ? 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20 text-[10px]'
                              : 'bg-[var(--surface-hover)] text-[var(--text-muted)] text-[10px]'
                          }
                        >
                          {p.isPublic ? t('promo_public') : t('promo_private')}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="xs"
                            variant="outline"
                            className="rounded-lg"
                            onClick={() => openEdit(p)}
                            disabled={!can('MANAGE_VOUCHERS')}
                          >
                            <Pencil className="size-3" />
                          </Button>
                          <Button
                            size="xs"
                            variant="destructive"
                            className="rounded-lg"
                            onClick={() => handleDelete(p)}
                            disabled={!can('MANAGE_VOUCHERS')}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Create dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('promo_create')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label className="text-xs mb-1.5 block">{t('promo_code')}</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="rounded-xl uppercase"
                  placeholder="SAVE10"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1.5 block">{t('promo_type')}</Label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as 'amount' | 'percent')}
                    className="w-full h-10 rounded-xl border border-[var(--surface-border)] bg-[var(--background)] px-3 text-sm"
                  >
                    <option value="amount">{t('promo_type_amount')}</option>
                    <option value="percent">{t('promo_type_percent')}</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">{t('promo_value')}</Label>
                  <Input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    className="rounded-xl"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">{t('promo_event')}</Label>
                <select
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                  className="w-full h-10 rounded-xl border border-[var(--surface-border)] bg-[var(--background)] px-3 text-sm"
                >
                  <option value="">{t('promo_all_events')}</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs mb-1.5 block">Starts at</Label>
                  <Input
                    type="datetime-local"
                    value={validFrom}
                    onChange={(event) => setValidFrom(event.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">Ends at</Label>
                  <Input
                    type="datetime-local"
                    value={validUntil}
                    onChange={(event) => setValidUntil(event.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">{t('promo_usage_limit')}</Label>
                <Input
                  type="number"
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(Number(e.target.value))}
                  className="rounded-xl"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs mb-1.5 block">Min tickets</Label>
                  <Input
                    type="number"
                    min={1}
                    value={minQty}
                    onChange={(event) => setMinQty(Number(event.target.value))}
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">Max tickets</Label>
                  <Input
                    type="number"
                    min={0}
                    value={maxQty}
                    onChange={(event) => setMaxQty(Number(event.target.value))}
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">Orders / buyer</Label>
                  <Input
                    type="number"
                    min={1}
                    value={maxOrdersPerBuyer}
                    onChange={(event) =>
                      setMaxOrdersPerBuyer(Number(event.target.value))
                    }
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Promotion image URL</Label>
                <Input
                  type="url"
                  value={promoImageUrl}
                  onChange={(event) => setPromoImageUrl(event.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">{t('promo_description')}</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <label className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
                {t('promo_is_public')}
              </label>
              <p className="flex items-start gap-2 rounded-lg bg-[var(--background)] p-3 text-[11px] text-[var(--text-muted)]">
                <CalendarClock className="mt-0.5 size-3.5 shrink-0" />
                Public promotions may appear automatically at checkout. Private promotions
                require buyers to enter the code.
              </p>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                className="rounded-xl text-xs"
                onClick={() => setCreateOpen(false)}
              >
                {t('promo_cancel')}
              </Button>
              <Button
                disabled={saving}
                onClick={handleCreate}
                className="btn-primary-gradient text-[var(--on-primary)] border-none rounded-xl text-xs"
              >
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
                {t('promo_save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit dialog — full CRUD */}
        <Dialog open={!!editPromo} onOpenChange={(o) => !o && setEditPromo(null)}>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('promo_edit')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label className="text-xs mb-1.5 block">{t('promo_code')}</Label>
                <Input
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                  className="rounded-xl uppercase"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1.5 block">{t('promo_type')}</Label>
                  <select
                    value={editDiscountType}
                    onChange={(e) =>
                      setEditDiscountType(e.target.value as 'amount' | 'percent')
                    }
                    className="w-full h-10 rounded-xl border border-[var(--surface-border)] bg-[var(--background)] px-3 text-sm"
                  >
                    <option value="amount">{t('promo_type_amount')}</option>
                    <option value="percent">{t('promo_type_percent')}</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">{t('promo_value')}</Label>
                  <Input
                    type="number"
                    value={editDiscountValue}
                    onChange={(e) => setEditDiscountValue(Number(e.target.value))}
                    className="rounded-xl"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">{t('promo_event')}</Label>
                <select
                  value={editEventId}
                  onChange={(e) => setEditEventId(e.target.value)}
                  className="w-full h-10 rounded-xl border border-[var(--surface-border)] bg-[var(--background)] px-3 text-sm"
                >
                  <option value="">{t('promo_all_events')}</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs mb-1.5 block">Starts at</Label>
                  <Input
                    type="datetime-local"
                    value={editValidFrom}
                    onChange={(event) => setEditValidFrom(event.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">Ends at</Label>
                  <Input
                    type="datetime-local"
                    value={editValidUntil}
                    onChange={(event) => setEditValidUntil(event.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1.5 block">{t('promo_usage_limit')}</Label>
                  <Input
                    type="number"
                    value={editUsage}
                    onChange={(e) => setEditUsage(Number(e.target.value))}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">{t('promo_min_qty')}</Label>
                  <Input
                    type="number"
                    value={editMinQty}
                    onChange={(e) => setEditMinQty(Number(e.target.value))}
                    className="rounded-xl"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1.5 block">Max tickets</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editMaxQty}
                    onChange={(event) => setEditMaxQty(Number(event.target.value))}
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">Orders / buyer</Label>
                  <Input
                    type="number"
                    min={1}
                    value={editMaxOrdersPerBuyer}
                    onChange={(event) =>
                      setEditMaxOrdersPerBuyer(Number(event.target.value))
                    }
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Promotion image URL</Label>
                <Input
                  type="url"
                  value={editPromoImageUrl}
                  onChange={(event) => setEditPromoImageUrl(event.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">{t('promo_description')}</Label>
                <Input
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <label className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={editPublic}
                  onChange={(e) => setEditPublic(e.target.checked)}
                />
                {t('promo_is_public')}
              </label>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                className="rounded-xl text-xs"
                onClick={() => setEditPromo(null)}
              >
                {t('promo_cancel')}
              </Button>
              <Button
                disabled={saving}
                onClick={handleUpdate}
                className="btn-primary-gradient text-[var(--on-primary)] border-none rounded-xl text-xs"
              >
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
                {t('promo_save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </OrganizerShell>
  );
}
