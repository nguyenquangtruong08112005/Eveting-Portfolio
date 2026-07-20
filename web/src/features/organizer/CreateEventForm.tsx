'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Calendar, Ticket, Sparkles, CheckCircle2, AlertCircle, FileText, Loader2 } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EventService } from '@/features/events/api';
import { VenueService } from '@/features/organizer/api';
import { ORG_NAV } from '@/features/organizer/nav';
import { useTranslations } from 'next-intl';
import { CATEGORY_KEYS, type CategoryKey } from '@/lib/constants';
import type { Venue } from '@/types';

interface TicketTier {
  name: string;
  price: number;
  available: number;
}

function toLocalInput(ts?: number | null): string {
  if (!ts) return '';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface CreateEventFormProps {
  mode?: 'create' | 'edit';
}

export function CreateEventForm({ mode = 'create' }: CreateEventFormProps) {
  const t = useTranslations('organizer');
  const tCommon = useTranslations('common');
  const tCat = useTranslations('navbar.categories');
  const router = useRouter();
  const params = useParams();
  const editId = mode === 'edit' ? (params?.id as string) : undefined;

  const [loading, setLoading] = useState(false);
  const [bootLoading, setBootLoading] = useState(mode === 'edit');
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venueId, setVenueId] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [dateInput, setDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  const [eventType, setEventType] = useState<'physical' | 'online'>('physical');
  
  // Location states
  const [venueName, setVenueName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [onlineUrl, setOnlineUrl] = useState('');

  // Category states
  const [selectedCategories, setSelectedCategories] = useState<CategoryKey[]>([]);

  // Ticket Tiers
  const [ticketTiers, setTicketTiers] = useState<TicketTier[]>([
    { name: 'Standard', price: 150000, available: 100 }
  ]);

  useEffect(() => {
    VenueService.list()
      .then((list) => setVenues(list || []))
      .catch(() => setVenues([]));
  }, []);

  useEffect(() => {
    if (mode !== 'edit' || !editId) return;
    let cancelled = false;
    setBootLoading(true);
    EventService.getById(editId)
      .then((ev) => {
        if (cancelled) return;
        setName(ev.name || '');
        setDescription(ev.description || '');
        setImageUrl(ev.imageUrl || '');
        setBannerUrl(ev.bannerUrl || '');
        setVideoUrl(ev.videoUrl || '');
        setDateInput(toLocalInput(ev.date));
        setEndDateInput(toLocalInput(ev.endDate as number | undefined));
        setEventType(ev.eventType === 'online' ? 'online' : 'physical');
        setVenueName(ev.venueName || '');
        setCity(ev.city || '');
        setAddress(ev.location?.address || '');
        const cats = (ev.category || []).filter((c): c is CategoryKey =>
          (CATEGORY_KEYS as readonly string[]).includes(c)
        );
        setSelectedCategories(cats);
        if (ev.ticketTypes) {
          const tiers = Object.entries(ev.ticketTypes).map(([n, v]) => ({
            name: n,
            price: v.price ?? 0,
            available: v.available ?? v.quantity ?? 0,
          }));
          if (tiers.length) setTicketTiers(tiers);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setErrorMsg((err as { message?: string })?.message || t('create_error'));
        }
      })
      .finally(() => {
        if (!cancelled) setBootLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, editId, t]);

  const applyVenue = (id: string) => {
    setVenueId(id);
    const v = venues.find((x) => x.id === id);
    if (!v) return;
    setVenueName(v.name || '');
    setCity(v.city || '');
    setAddress(v.address || '');
  };

  const toggleCategory = (cat: CategoryKey) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const addTicketTier = () => {
    setTicketTiers(prev => [...prev, { name: '', price: 100000, available: 50 }]);
  };

  const removeTicketTier = (index: number) => {
    if (ticketTiers.length === 1) return;
    setTicketTiers(prev => prev.filter((_, i) => i !== index));
  };

  const updateTicketTier = (index: number, field: keyof TicketTier, value: string | number) => {
    setTicketTiers(prev =>
      prev.map((tier, i) => {
        if (i === index) {
          return { ...tier, [field]: value };
        }
        return tier;
      })
    );
  };

  const handleSubmit = async (saveAsDraft: boolean) => {
    if (!name || !dateInput) {
      setErrorMsg(t('error_required_fields'));
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      // Structure ticketTypes object matching: { [name]: { price, available } }
      const ticketTypes: Record<string, { price: number; available: number }> = {};
      ticketTiers.forEach(tier => {
        if (tier.name.trim()) {
          ticketTypes[tier.name.trim()] = {
            price: Number(tier.price) || 0,
            available: Number(tier.available) || 0
          };
        }
      });

      if (eventType === 'physical' && !venueId && !venueName.trim() && !city.trim() && !address.trim()) {
        setErrorMsg(t('error_venue_required'));
        setLoading(false);
        return;
      }
      if (eventType === 'online' && !onlineUrl.trim()) {
        setErrorMsg(t('error_online_url_required'));
        setLoading(false);
        return;
      }

      const eventData = {
        name,
        description,
        imageUrl: imageUrl.trim() || undefined,
        bannerUrl: bannerUrl.trim() || undefined,
        videoUrl: videoUrl.trim() || undefined,
        date: new Date(dateInput).getTime(),
        endDate: endDateInput ? new Date(endDateInput).getTime() : undefined,
        eventType,
        category: selectedCategories,
        onlineUrl: eventType === 'online' ? onlineUrl.trim() : undefined,
        // Physical: server accepts venueId OR free-form name/city/address
        venueName: eventType === 'physical' ? venueName.trim() || undefined : undefined,
        city: eventType === 'physical' ? city.trim() || undefined : undefined,
        location:
          eventType === 'physical'
            ? {
                address: address.trim() || '',
              }
            : undefined,
        addressDetails:
          eventType === 'physical'
            ? {
                street: address.trim() || '',
                city: city.trim() || '',
                district: '',
                ward: '',
              }
            : undefined,
        venueId: eventType === 'physical' && venueId ? venueId : undefined,
        ticketTypes,
        ...(mode === 'create' ? { saveAsDraft } : {}),
      };

      if (mode === 'edit' && editId) {
        await EventService.update(editId, eventData);
        setSuccess(true);
        setTimeout(() => {
          router.push(`/organizer/events/${editId}`);
        }, 1200);
      } else {
        await EventService.create(eventData);
        setSuccess(true);
        setTimeout(() => {
          router.push('/organizer/dashboard');
        }, 1500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || t('create_error'));
      setLoading(false);
    }
  };

  return (
    <AppShell variant="organizer" items={ORG_NAV} heading={tCommon('org_badge')}>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 lg:py-10 w-full flex-grow space-y-8">
        {/* Back Link */}
        <div>
          <Link
            href={mode === 'edit' && editId ? `/organizer/events/${editId}` : '/organizer/dashboard'}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            {mode === 'edit' ? t('back_to_event') : t('back_to_dashboard')}
          </Link>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] flex items-center gap-2.5 tracking-tight">
            <Sparkles className="size-6 text-[var(--primary)]" />
            {mode === 'edit' ? t('edit_event_title') : t('new_event_title')}
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            {mode === 'edit' ? t('edit_event_subtitle') : t('new_event_subtitle')}
          </p>
        </div>

        {bootLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="size-10 text-[var(--primary)] animate-spin" />
          </div>
        )}

        {errorMsg && (
          <div className="p-4 bg-[var(--error)]/10 border border-[var(--error)]/30 rounded-2xl flex items-start gap-2.5 text-[var(--error)] text-sm">
            <AlertCircle className="size-5 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {success ? (
          <div className="p-10 bg-[var(--surface)] border border-[var(--surface-border)] rounded-2xl text-center flex flex-col items-center justify-center gap-4 shadow-xl">
            <CheckCircle2 className="size-16 text-[var(--success)] animate-bounce" />
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              {mode === 'edit' ? t('update_success') : t('create_success')}
            </h2>
            <p className="text-[var(--text-secondary)] text-sm max-w-sm">
              {mode === 'edit' ? t('update_success_msg') : t('create_success_msg')}
            </p>
          </div>
        ) : bootLoading ? null : (
          <div className="space-y-6">
            {/* Step 1: Basic Information */}
            <section className="bg-[var(--surface)] border border-[var(--surface-border)] p-6 rounded-2xl shadow-xl space-y-5">
              <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2 border-b border-[var(--surface-border)] pb-3">
                <FileText className="size-4 text-[var(--primary)]" />
                1. {t('step_basics')}
              </h2>

              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-[var(--text-secondary)] block mb-1.5">{t('field_name')}</Label>
                  <Input
                    type="text"
                    required
                    placeholder={t('placeholder_name')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--surface-border)] text-[var(--text-primary)] rounded-xl py-3 px-4 text-sm focus:border-[var(--primary)]"
                  />
                </div>

                <div>
                  <Label className="text-xs text-[var(--text-secondary)] block mb-1.5">{t('field_description')}</Label>
                  <textarea
                    placeholder={t('placeholder_description')}
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--surface-border)] text-[var(--text-primary)] rounded-xl py-3 px-4 text-sm focus:border-[var(--primary)] focus:outline-none resize-y"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs text-[var(--text-secondary)] block mb-1.5">{t('field_image')}</Label>
                    <Input
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="w-full bg-[var(--background)] border border-[var(--surface-border)] text-[var(--text-primary)] rounded-xl py-3 px-4 text-xs focus:border-[var(--primary)]"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-[var(--text-secondary)] block mb-1.5">{t('field_banner')}</Label>
                    <Input
                      type="url"
                      placeholder="https://example.com/banner.jpg"
                      value={bannerUrl}
                      onChange={(e) => setBannerUrl(e.target.value)}
                      className="w-full bg-[var(--background)] border border-[var(--surface-border)] text-[var(--text-primary)] rounded-xl py-3 px-4 text-xs focus:border-[var(--primary)]"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-[var(--text-secondary)] block mb-1.5">{t('field_video')}</Label>
                    <Input
                      type="url"
                      placeholder="https://youtube.com/watch?v=..."
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      className="w-full bg-[var(--background)] border border-[var(--surface-border)] text-[var(--text-primary)] rounded-xl py-3 px-4 text-xs focus:border-[var(--primary)]"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-[var(--text-secondary)] block mb-1.5">{t('field_category')}</Label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {CATEGORY_KEYS.map((cat) => {
                      const isSelected = selectedCategories.includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => toggleCategory(cat)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                            isSelected
                              ? 'bg-[var(--primary)]/10 border-[var(--primary)]/30 text-[var(--primary)]'
                              : 'bg-[var(--surface-hover)] border-[var(--surface-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          {tCat(cat)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            {/* Step 2: Time & Venue */}
            <section className="bg-[var(--surface)] border border-[var(--surface-border)] p-6 rounded-2xl shadow-xl space-y-5">
              <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2 border-b border-[var(--surface-border)] pb-3">
                <Calendar className="size-4 text-[var(--primary)]" />
                2. {t('step_time_location')}
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-[var(--text-secondary)] block mb-1.5">{t('field_start_date')}</Label>
                    <Input
                      type="datetime-local"
                      required
                      value={dateInput}
                      onChange={(e) => setDateInput(e.target.value)}
                      className="w-full bg-[var(--background)] border border-[var(--surface-border)] text-[var(--text-primary)] rounded-xl py-3 px-4 text-sm focus:border-[var(--primary)]"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-[var(--text-secondary)] block mb-1.5">{t('field_end_date')}</Label>
                    <Input
                      type="datetime-local"
                      value={endDateInput}
                      onChange={(e) => setEndDateInput(e.target.value)}
                      className="w-full bg-[var(--background)] border border-[var(--surface-border)] text-[var(--text-primary)] rounded-xl py-3 px-4 text-sm focus:border-[var(--primary)]"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-[var(--text-secondary)] block mb-1.5">{t('field_event_type')}</Label>
                  <div className="flex gap-4 pt-1">
                    <button
                      type="button"
                      onClick={() => setEventType('physical')}
                      className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                        eventType === 'physical'
                          ? 'bg-[var(--primary)]/10 border-[var(--primary)] text-[var(--primary)]'
                          : 'bg-[var(--background)] border-[var(--surface-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {t('event_type_physical')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEventType('online')}
                      className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                        eventType === 'online'
                          ? 'bg-[var(--primary)]/10 border-[var(--primary)] text-[var(--primary)]'
                          : 'bg-[var(--background)] border-[var(--surface-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {t('event_type_online')}
                    </button>
                  </div>
                </div>

                {eventType === 'physical' ? (
                  <div className="space-y-4 pt-1">
                    {venues.length > 0 && (
                      <div>
                        <Label className="text-xs text-[var(--text-secondary)] block mb-1.5">
                          {t('field_venue_picker')}
                        </Label>
                        <select
                          value={venueId}
                          onChange={(e) => applyVenue(e.target.value)}
                          className="w-full bg-[var(--background)] border border-[var(--surface-border)] text-[var(--text-primary)] rounded-xl py-3 px-4 text-sm"
                        >
                          <option value="">{t('venue_picker_none')}</option>
                          {venues.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name}
                              {v.city ? ` — ${v.city}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-[var(--text-secondary)] block mb-1.5">{t('field_venue')}</Label>
                        <Input
                          type="text"
                          placeholder={t('placeholder_venue')}
                          value={venueName}
                          onChange={(e) => setVenueName(e.target.value)}
                          className="w-full bg-[var(--background)] border border-[var(--surface-border)] text-[var(--text-primary)] rounded-xl py-3 px-4 text-sm focus:border-[var(--primary)]"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-[var(--text-secondary)] block mb-1.5">{t('field_city')}</Label>
                        <Input
                          type="text"
                          placeholder={t('placeholder_city')}
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="w-full bg-[var(--background)] border border-[var(--surface-border)] text-[var(--text-primary)] rounded-xl py-3 px-4 text-sm focus:border-[var(--primary)]"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-[var(--text-secondary)] block mb-1.5">{t('field_address')}</Label>
                      <Input
                        type="text"
                        placeholder={t('placeholder_address')}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full bg-[var(--background)] border border-[var(--surface-border)] text-[var(--text-primary)] rounded-xl py-3 px-4 text-sm focus:border-[var(--primary)]"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label className="text-xs text-[var(--text-secondary)] block mb-1.5">{t('field_online_url')}</Label>
                    <Input
                      type="url"
                      placeholder={t('placeholder_online_url')}
                      value={onlineUrl}
                      onChange={(e) => setOnlineUrl(e.target.value)}
                      className="w-full bg-[var(--background)] border border-[var(--surface-border)] text-[var(--text-primary)] rounded-xl py-3 px-4 text-sm focus:border-[var(--primary)]"
                    />
                  </div>
                )}
              </div>
            </section>

            {/* Step 3: Ticketing */}
            <section className="bg-[var(--surface)] border border-[var(--surface-border)] p-6 rounded-2xl shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-[var(--surface-border)] pb-3">
                <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                  <Ticket className="size-4 text-[var(--primary)]" />
                  3. {t('step_pricing')}
                </h2>
                <button
                  type="button"
                  onClick={addTicketTier}
                  className="flex items-center gap-1 text-[11px] font-bold text-[var(--primary)] hover:underline cursor-pointer"
                >
                  <Plus className="size-3.5" />
                  {t('add_ticket_tier')}
                </button>
              </div>

              <div className="space-y-4">
                {ticketTiers.map((tier, idx) => (
                  <div key={idx} className="p-4 bg-[var(--background)] border border-[var(--surface-border)] rounded-xl flex flex-col md:flex-row gap-4 items-end relative">
                    <div className="flex-1 space-y-4 w-full">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-1">
                          <Label className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wider block mb-1">{t('field_ticket_name')}</Label>
                          <Input
                            type="text"
                            required
                            placeholder={t('placeholder_ticket_name')}
                            value={tier.name}
                            onChange={(e) => updateTicketTier(idx, 'name', e.target.value)}
                            className="w-full bg-[var(--surface)] border border-[var(--surface-border)] text-[var(--text-primary)] rounded-xl py-2 px-3 text-xs focus:border-[var(--primary)]"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wider block mb-1">{t('field_ticket_price')}</Label>
                          <Input
                            type="number"
                            required
                            value={tier.price}
                            onChange={(e) => updateTicketTier(idx, 'price', Number(e.target.value))}
                            className="w-full bg-[var(--surface)] border border-[var(--surface-border)] text-[var(--text-primary)] rounded-xl py-2 px-3 text-xs focus:border-[var(--primary)]"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wider block mb-1">{t('field_ticket_quantity')}</Label>
                          <Input
                            type="number"
                            required
                            value={tier.available}
                            onChange={(e) => updateTicketTier(idx, 'available', Number(e.target.value))}
                            className="w-full bg-[var(--surface)] border border-[var(--surface-border)] text-[var(--text-primary)] rounded-xl py-2 px-3 text-xs focus:border-[var(--primary)]"
                          />
                        </div>
                      </div>
                    </div>

                    {ticketTiers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTicketTier(idx)}
                        className="p-2 text-[var(--text-muted)] hover:text-[var(--error)] rounded-lg hover:bg-[var(--surface-hover)] transition-all cursor-pointer mb-0.5 shrink-0"
                        title={t('remove_ticket_title')}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              {mode === 'edit' ? (
                <Button
                  type="button"
                  onClick={() => handleSubmit(false)}
                  disabled={loading}
                  className="flex-1 py-6 rounded-xl btn-primary-gradient text-sm font-black tracking-wide text-[var(--on-primary)] border-none cursor-pointer"
                >
                  {loading ? t('processing') : t('save_changes')}
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    onClick={() => handleSubmit(true)}
                    disabled={loading}
                    variant="outline"
                    className="flex-1 py-6 bg-transparent hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] text-[var(--text-primary)] font-bold text-sm rounded-xl cursor-pointer"
                  >
                    {loading ? t('processing') : t('save_draft')}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleSubmit(false)}
                    disabled={loading}
                    className="flex-1 py-6 rounded-xl btn-primary-gradient text-sm font-black tracking-wide text-[var(--on-primary)] border-none hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer shadow-lg shadow-orange-500/10"
                  >
                    {loading ? t('processing') : t('submit_review')}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}
