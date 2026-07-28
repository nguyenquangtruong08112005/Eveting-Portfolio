'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  HelpCircle,
  Loader2,
  Lock,
  MessageSquare,
  Plus,
  Sparkles,
  Ticket,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { OrganizerShell } from '@/components/organizer/OrganizerShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EventService } from '@/features/events/api';
import {
  OrganizerBusinessService,
  OrganizerService,
  VenueService,
} from '@/features/organizer/api';
import { useOrganizerWorkspace } from '@/features/organizer/OrganizerWorkspace';
import { useTranslations } from 'next-intl';
import { CATEGORY_KEYS, type CategoryKey } from '@/lib/constants';
import type {
  EventCustomQuestion,
  EventQuestionType,
  FeaturedProfile,
  Venue,
} from '@/types';

interface TicketTier {
  name: string;
  price: number;
  available: number;
  isFree: boolean;
  minPerOrder: number;
  maxPerOrder: number;
  sellAt: string;
  endSellAt: string;
  description: string;
  imageUrl: string;
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
  const tCat = useTranslations('navbar.categories');
  const router = useRouter();
  const { can } = useOrganizerWorkspace();
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
  const [district, setDistrict] = useState('');
  const [ward, setWard] = useState('');
  const [onlineUrl, setOnlineUrl] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [messageForAttendee, setMessageForAttendee] = useState('');
  const [customQuestions, setCustomQuestions] = useState<EventCustomQuestion[]>([]);
  const [questionsLocked, setQuestionsLocked] = useState(false);

  // Category states
  const [selectedCategories, setSelectedCategories] = useState<CategoryKey[]>([]);

  // Ticket Tiers
  const [ticketTiers, setTicketTiers] = useState<TicketTier[]>([
    {
      name: 'Standard',
      price: 150000,
      available: 100,
      isFree: false,
      minPerOrder: 1,
      maxPerOrder: 10,
      sellAt: '',
      endSellAt: '',
      description: '',
      imageUrl: '',
    }
  ]);

  // Featured artists / speakers on the event
  const [featuredProfiles, setFeaturedProfiles] = useState<FeaturedProfile[]>([]);
  const [selectedFeaturedIds, setSelectedFeaturedIds] = useState<string[]>([]);
  const [newArtistName, setNewArtistName] = useState('');
  const [creatingArtist, setCreatingArtist] = useState(false);

  useEffect(() => {
    VenueService.list()
      .then((list) => setVenues(list || []))
      .catch(() => setVenues([]));
    OrganizerBusinessService.listFeaturedProfiles()
      .then((profiles) => setFeaturedProfiles(profiles))
      .catch(() => setFeaturedProfiles([]));
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
        setCity(ev.addressDetails?.province || ev.addressDetails?.city || ev.city || '');
        setDistrict(ev.addressDetails?.district || '');
        setWard(ev.addressDetails?.ward || '');
        setAddress(ev.location?.address || '');
        setIsPrivate(!!ev.isPrivate);
        setMessageForAttendee(ev.messageForAttendee || '');
        setCustomQuestions(ev.customQuestions || []);
        const cats = (ev.category || []).filter((c): c is CategoryKey =>
          (CATEGORY_KEYS as readonly string[]).includes(c)
        );
        setSelectedCategories(cats);
        if (ev.ticketTypes) {
          const tiers = Object.entries(ev.ticketTypes).map(([n, v]) => ({
            name: n,
            price: v.price ?? 0,
            available: v.available ?? v.quantity ?? 0,
            isFree: !!v.isFree,
            minPerOrder: v.minPerOrder ?? 1,
            maxPerOrder: v.maxPerOrder ?? 10,
            sellAt: toLocalInput(v.sellAt),
            endSellAt: toLocalInput(v.endSellAt),
            description: v.description || '',
            imageUrl: v.imageUrl || '',
          }));
          if (tiers.length) setTicketTiers(tiers);
        }
        const fp =
          (ev as { featuredProfileIds?: string[] }).featuredProfileIds ||
          ((ev as { featuredProfiles?: { id: string }[] }).featuredProfiles || []).map(
            (p) => p.id
          );
        if (fp?.length) setSelectedFeaturedIds(fp);
        OrganizerService.getEventStats(editId)
          .then((eventStats) => {
            const sold =
              typeof eventStats.ticketsSold === 'number'
                ? eventStats.ticketsSold
                : Object.values(eventStats.ticketsSold || {}).reduce(
                    (sum, count) => sum + Number(count || 0),
                    0
                  );
            setQuestionsLocked(sold > 0);
          })
          .catch(() => setQuestionsLocked(false));
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
    setTicketTiers(prev => [
      ...prev,
      {
        name: '',
        price: 100000,
        available: 50,
        isFree: false,
        minPerOrder: 1,
        maxPerOrder: 10,
        sellAt: '',
        endSellAt: '',
        description: '',
        imageUrl: '',
      },
    ]);
  };

  const removeTicketTier = (index: number) => {
    if (ticketTiers.length === 1) return;
    setTicketTiers(prev => prev.filter((_, i) => i !== index));
  };

  const updateTicketTier = (
    index: number,
    field: keyof TicketTier,
    value: string | number | boolean
  ) => {
    setTicketTiers(prev =>
      prev.map((tier, i) => {
        if (i === index) {
          return { ...tier, [field]: value };
        }
        return tier;
      })
    );
  };

  const createFeaturedArtist = async () => {
    const artistName = newArtistName.trim();
    if (!artistName) return;
    setCreatingArtist(true);
    try {
      const profile = await OrganizerBusinessService.createFeaturedProfile({
        name: artistName,
        profileType: 'artist',
      });
      setFeaturedProfiles((current) => [profile, ...current]);
      setSelectedFeaturedIds((current) => [...current, profile.id]);
      setNewArtistName('');
    } catch (error) {
      setErrorMsg(
        error instanceof Error ? error.message : 'Unable to create featured artist'
      );
    } finally {
      setCreatingArtist(false);
    }
  };

  const addQuestion = () => {
    if (questionsLocked) return;
    setCustomQuestions((current) => [
      ...current,
      {
        questionText: '',
        questionType: 'text',
        isRequired: false,
        options: [],
      },
    ]);
  };

  const updateQuestion = (
    index: number,
    patch: Partial<EventCustomQuestion>
  ) => {
    if (questionsLocked) return;
    setCustomQuestions((current) =>
      current.map((question, questionIndex) =>
        questionIndex === index ? { ...question, ...patch } : question
      )
    );
  };

  const removeQuestion = (index: number) => {
    if (questionsLocked) return;
    setCustomQuestions((current) =>
      current.filter((_, questionIndex) => questionIndex !== index)
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
      const ticketTypes: Record<
        string,
        {
          price: number;
          available: number;
          isFree: boolean;
          minPerOrder: number;
          maxPerOrder: number;
          sellAt?: number;
          endSellAt?: number;
          description?: string;
          imageUrl?: string;
        }
      > = {};
      ticketTiers.forEach(tier => {
        if (tier.name.trim()) {
          ticketTypes[tier.name.trim()] = {
            price: tier.isFree ? 0 : Number(tier.price) || 0,
            available: Number(tier.available) || 0,
            isFree: tier.isFree,
            minPerOrder: Math.max(1, Number(tier.minPerOrder) || 1),
            maxPerOrder: Math.max(1, Number(tier.maxPerOrder) || 1),
            sellAt: tier.sellAt ? new Date(tier.sellAt).getTime() : undefined,
            endSellAt: tier.endSellAt
              ? new Date(tier.endSellAt).getTime()
              : undefined,
            description: tier.description.trim() || undefined,
            imageUrl: tier.imageUrl.trim() || undefined,
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
                province: city.trim() || '',
                city: city.trim() || '',
                district: district.trim() || '',
                ward: ward.trim() || '',
                venueName: venueName.trim() || '',
              }
            : undefined,
        venueId: eventType === 'physical' && venueId ? venueId : undefined,
        ticketTypes,
        featuredProfileIds: selectedFeaturedIds,
        isPrivate,
        messageForAttendee: messageForAttendee.trim() || undefined,
        customQuestions,
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
    <OrganizerShell>
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
        {!can('EDIT_EVENT') && (
          <div role="alert" className="rounded-lg border border-[var(--warning)]/40 bg-[var(--warning)]/10 p-4 text-sm text-[var(--warning)]">
            EDIT_EVENT permission is required to save this event.
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

                <div>
                  <Label className="text-xs text-[var(--text-secondary)] block mb-1.5">
                    Featured artists / speakers
                  </Label>
                  {featuredProfiles.length === 0 ? (
                    <p className="text-[11px] text-[var(--text-muted)]">
                      No featured profiles yet. Seed platform data or create profiles first.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2 pt-1 max-h-36 overflow-y-auto">
                      {featuredProfiles.map((p) => {
                        const on = selectedFeaturedIds.includes(p.id);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() =>
                              setSelectedFeaturedIds((prev) =>
                                on ? prev.filter((id) => id !== p.id) : [...prev, p.id]
                              )
                            }
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                              on
                                ? 'bg-[var(--accent-brand)]/15 border-[var(--accent-brand)]/40 text-[var(--accent-brand)]'
                                : 'bg-[var(--surface-hover)] border-[var(--surface-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                          >
                            {p.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <Input
                      value={newArtistName}
                      onChange={(event) => setNewArtistName(event.target.value)}
                      placeholder="Create a featured artist profile"
                      className="h-9 flex-1 rounded-lg text-xs"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void createFeaturedArtist()}
                      disabled={creatingArtist || !newArtistName.trim()}
                      className="rounded-lg text-xs"
                    >
                      {creatingArtist ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <UserPlus className="size-3.5" />
                      )}
                      Create artist
                    </Button>
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
                        <Label className="text-xs text-[var(--text-secondary)] block mb-1.5">
                          Province / city
                        </Label>
                        <Input
                          type="text"
                          placeholder="Ho Chi Minh City"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          list="vietnam-provinces"
                          className="w-full bg-[var(--background)] border border-[var(--surface-border)] text-[var(--text-primary)] rounded-xl py-3 px-4 text-sm focus:border-[var(--primary)]"
                        />
                        <datalist id="vietnam-provinces">
                          <option value="Ha Noi" />
                          <option value="Ho Chi Minh City" />
                          <option value="Da Nang" />
                          <option value="Hai Phong" />
                          <option value="Can Tho" />
                          <option value="Hue" />
                        </datalist>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-[var(--text-secondary)] block mb-1.5">
                          District
                        </Label>
                        <Input
                          type="text"
                          value={district}
                          onChange={(event) => setDistrict(event.target.value)}
                          placeholder="District or city subdivision"
                          className="w-full bg-[var(--background)] border border-[var(--surface-border)] text-[var(--text-primary)] rounded-xl py-3 px-4 text-sm focus:border-[var(--primary)]"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-[var(--text-secondary)] block mb-1.5">
                          Ward / commune
                        </Label>
                        <Input
                          type="text"
                          value={ward}
                          onChange={(event) => setWard(event.target.value)}
                          placeholder="Ward or commune"
                          className="w-full bg-[var(--background)] border border-[var(--surface-border)] text-[var(--text-primary)] rounded-xl py-3 px-4 text-sm focus:border-[var(--primary)]"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-[var(--text-secondary)] block mb-1.5">
                        House number / street / free-text address
                      </Label>
                      <Input
                        type="text"
                        placeholder={t('placeholder_address')}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full bg-[var(--background)] border border-[var(--surface-border)] text-[var(--text-primary)] rounded-xl py-3 px-4 text-sm focus:border-[var(--primary)]"
                      />
                      <p className="mt-1.5 text-[10px] text-[var(--text-muted)]">
                        Free text remains accepted for venues not yet covered by the Vietnam
                        address dictionary.
                      </p>
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
                            disabled={tier.isFree}
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
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <label className="col-span-2 flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] sm:col-span-1">
                          <input
                            type="checkbox"
                            checked={tier.isFree}
                            onChange={(event) =>
                              updateTicketTier(idx, 'isFree', event.target.checked)
                            }
                          />
                          Free ticket
                        </label>
                        <div>
                          <Label className="mb-1 block text-[10px] font-bold uppercase text-[var(--text-muted)]">
                            Min / order
                          </Label>
                          <Input
                            type="number"
                            min={1}
                            value={tier.minPerOrder}
                            onChange={(event) =>
                              updateTicketTier(idx, 'minPerOrder', Number(event.target.value))
                            }
                            className="h-9 text-xs"
                          />
                        </div>
                        <div>
                          <Label className="mb-1 block text-[10px] font-bold uppercase text-[var(--text-muted)]">
                            Max / order
                          </Label>
                          <Input
                            type="number"
                            min={1}
                            value={tier.maxPerOrder}
                            onChange={(event) =>
                              updateTicketTier(idx, 'maxPerOrder', Number(event.target.value))
                            }
                            className="h-9 text-xs"
                          />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <Label className="mb-1 block text-[10px] font-bold uppercase text-[var(--text-muted)]">
                            Ticket image
                          </Label>
                          <Input
                            type="url"
                            value={tier.imageUrl}
                            onChange={(event) =>
                              updateTicketTier(idx, 'imageUrl', event.target.value)
                            }
                            className="h-9 text-xs"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <Label className="mb-1 block text-[10px] font-bold uppercase text-[var(--text-muted)]">
                            Sale starts
                          </Label>
                          <Input
                            type="datetime-local"
                            value={tier.sellAt}
                            onChange={(event) =>
                              updateTicketTier(idx, 'sellAt', event.target.value)
                            }
                            className="h-9 text-xs"
                          />
                        </div>
                        <div>
                          <Label className="mb-1 block text-[10px] font-bold uppercase text-[var(--text-muted)]">
                            Sale ends
                          </Label>
                          <Input
                            type="datetime-local"
                            value={tier.endSellAt}
                            onChange={(event) =>
                              updateTicketTier(idx, 'endSellAt', event.target.value)
                            }
                            className="h-9 text-xs"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="mb-1 block text-[10px] font-bold uppercase text-[var(--text-muted)]">
                          Ticket description
                        </Label>
                        <Input
                          value={tier.description}
                          onChange={(event) =>
                            updateTicketTier(idx, 'description', event.target.value)
                          }
                          className="h-9 text-xs"
                        />
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

            {/* Step 4: Visibility, buyer message, and attendee questions */}
            <section className="space-y-5 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] p-6 shadow-xl">
              <h2 className="flex items-center gap-2 border-b border-[var(--surface-border)] pb-3 text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                <MessageSquare className="size-4 text-[var(--primary)]" />
                4. Visibility and attendee details
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setIsPrivate(false)}
                  className={`flex items-start gap-3 rounded-xl border p-4 text-left ${
                    !isPrivate
                      ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                      : 'border-[var(--surface-border)] bg-[var(--background)]'
                  }`}
                >
                  <Eye className="mt-0.5 size-4 shrink-0 text-[var(--primary)]" />
                  <span>
                    <span className="block text-sm font-bold text-[var(--text-primary)]">
                      Public event
                    </span>
                    <span className="mt-1 block text-xs text-[var(--text-muted)]">
                      Eligible for discovery and public search.
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrivate(true)}
                  className={`flex items-start gap-3 rounded-xl border p-4 text-left ${
                    isPrivate
                      ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                      : 'border-[var(--surface-border)] bg-[var(--background)]'
                  }`}
                >
                  <EyeOff className="mt-0.5 size-4 shrink-0 text-[var(--primary)]" />
                  <span>
                    <span className="block text-sm font-bold text-[var(--text-primary)]">
                      Private event
                    </span>
                    <span className="mt-1 block text-xs text-[var(--text-muted)]">
                      Accessible only through a shared event link.
                    </span>
                  </span>
                </button>
              </div>

              <div>
                <Label className="mb-1.5 block text-xs text-[var(--text-secondary)]">
                  Message for ticket buyers
                </Label>
                <textarea
                  rows={4}
                  value={messageForAttendee}
                  onChange={(event) => setMessageForAttendee(event.target.value)}
                  placeholder="Appended to the ticket confirmation email."
                  className="w-full resize-y rounded-xl border border-[var(--surface-border)] bg-[var(--background)] p-3 text-sm text-[var(--text-primary)]"
                />
              </div>

              <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
                      <HelpCircle className="size-4 text-[var(--primary)]" />
                      Attendee questions
                    </h3>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Text, single-choice, and multi-choice answers are collected per attendee.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addQuestion}
                    disabled={questionsLocked}
                  >
                    <Plus className="size-3.5" />
                    Add question
                  </Button>
                </div>

                {questionsLocked && (
                  <div role="alert" className="mb-3 flex items-start gap-2 rounded-lg border border-[var(--warning)]/40 bg-[var(--warning)]/10 p-3 text-xs text-[var(--warning)]">
                    <Lock className="mt-0.5 size-4 shrink-0" />
                    Questions are locked because ticket sales have started. This protects
                    existing attendee answers from schema changes.
                  </div>
                )}

                <div className="space-y-3">
                  {customQuestions.map((question, index) => (
                    <div key={question.id || index} className="rounded-xl border border-[var(--surface-border)] bg-[var(--background)] p-4">
                      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto]">
                        <Input
                          value={question.questionText}
                          disabled={questionsLocked}
                          onChange={(event) =>
                            updateQuestion(index, { questionText: event.target.value })
                          }
                          placeholder="Question shown to attendees"
                        />
                        <select
                          value={question.questionType}
                          disabled={questionsLocked}
                          onChange={(event) =>
                            updateQuestion(index, {
                              questionType: event.target.value as EventQuestionType,
                              options:
                                event.target.value === 'text' ? [] : question.options,
                            })
                          }
                          className="h-10 rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] px-3 text-xs text-[var(--text-primary)]"
                        >
                          <option value="text">Text</option>
                          <option value="single_choice">Single choice</option>
                          <option value="multi_choice">Multi choice</option>
                        </select>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          disabled={questionsLocked}
                          onClick={() => removeQuestion(index)}
                          aria-label="Remove question"
                          title="Remove question"
                        >
                          <Trash2 className="size-4 text-[var(--error)]" />
                        </Button>
                      </div>
                      <label className="mt-3 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                        <input
                          type="checkbox"
                          checked={question.isRequired}
                          disabled={questionsLocked}
                          onChange={(event) =>
                            updateQuestion(index, { isRequired: event.target.checked })
                          }
                        />
                        Required response
                      </label>
                      {question.questionType !== 'text' && (
                        <div className="mt-3">
                          <Label className="mb-1 block text-[10px] font-bold uppercase text-[var(--text-muted)]">
                            Options, one per line
                          </Label>
                          <textarea
                            rows={3}
                            value={question.options.join('\n')}
                            disabled={questionsLocked}
                            onChange={(event) =>
                              updateQuestion(index, {
                                options: event.target.value
                                  .split('\n')
                                  .map((option) => option.trim())
                                  .filter(Boolean),
                              })
                            }
                            className="w-full resize-y rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] p-3 text-xs text-[var(--text-primary)]"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                  {customQuestions.length === 0 && (
                    <p className="rounded-lg border border-dashed border-[var(--surface-border)] p-5 text-center text-xs text-[var(--text-muted)]">
                      No custom attendee questions.
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              {mode === 'edit' ? (
                <Button
                  type="button"
                  onClick={() => handleSubmit(false)}
                  disabled={loading || !can('EDIT_EVENT')}
                  className="flex-1 py-6 rounded-xl btn-primary-gradient text-sm font-black tracking-wide text-[var(--on-primary)] border-none cursor-pointer"
                >
                  {loading ? t('processing') : t('save_changes')}
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    onClick={() => handleSubmit(true)}
                    disabled={loading || !can('EDIT_EVENT')}
                    variant="outline"
                    className="flex-1 py-6 bg-transparent hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] text-[var(--text-primary)] font-bold text-sm rounded-xl cursor-pointer"
                  >
                    {loading ? t('processing') : t('save_draft')}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleSubmit(false)}
                    disabled={loading || !can('EDIT_EVENT')}
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
    </OrganizerShell>
  );
}
