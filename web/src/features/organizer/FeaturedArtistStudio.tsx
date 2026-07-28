'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarPlus,
  ExternalLink,
  ImageIcon,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { OrganizerShell } from '@/components/organizer/OrganizerShell';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  OrganizerBusinessService,
  OrganizerService,
  type FeaturedProfileWriteBody,
} from '@/features/organizer/api';
import type {
  FeaturedArtistActivity,
  FeaturedProfile,
  OrganizerEvent,
} from '@/types';

const EMPTY_ACTIVITY: FeaturedArtistActivity = {
  title: '',
  startsAt: Date.now(),
  location: '',
  url: '',
};

const emptyDraft = (): FeaturedProfileWriteBody => ({
  name: '',
  profileType: 'artist',
  category: '',
  bio: '',
  imageUrl: '',
  bannerUrl: '',
  slug: '',
  genres: [],
  socialLinks: {},
  pinnedEventIds: [],
  activities: [],
});

export function FeaturedArtistStudio() {
  const [profiles, setProfiles] = useState<FeaturedProfile[]>([]);
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<FeaturedProfileWriteBody>(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [profileResult, eventResult] = await Promise.allSettled([
      OrganizerBusinessService.listFeaturedProfiles(),
      OrganizerService.getEvents(),
    ]);
    if (profileResult.status === 'fulfilled') setProfiles(profileResult.value);
    else setError(profileResult.reason instanceof Error ? profileResult.reason.message : 'Unable to load profiles');
    if (eventResult.status === 'fulfilled') setEvents(eventResult.value.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectProfile = (profile: FeaturedProfile) => {
    setSelectedId(profile.id);
    setDraft({
      name: profile.name || '',
      profileType: profile.profileType || 'artist',
      category: profile.category || '',
      bio: profile.bio || '',
      imageUrl: profile.imageUrl || '',
      bannerUrl: profile.bannerUrl || '',
      slug: profile.slug || '',
      genres: profile.genres || [],
      socialLinks: profile.socialLinks || {},
      pinnedEventIds: profile.pinnedEventIds || [],
      activities: profile.activities || [],
    });
  };

  const newProfile = () => {
    setSelectedId(null);
    setDraft(emptyDraft());
  };

  const updateSocial = (
    key: keyof NonNullable<FeaturedProfile['socialLinks']>,
    value: string
  ) => {
    setDraft((current) => ({
      ...current,
      socialLinks: { ...current.socialLinks, [key]: value },
    }));
  };

  const togglePinnedEvent = (eventId: string) => {
    setDraft((current) => {
      const currentIds = current.pinnedEventIds || [];
      return {
        ...current,
        pinnedEventIds: currentIds.includes(eventId)
          ? currentIds.filter((id) => id !== eventId)
          : [...currentIds, eventId],
      };
    });
  };

  const addActivity = () => {
    setDraft((current) => ({
      ...current,
      activities: [...(current.activities || []), { ...EMPTY_ACTIVITY, startsAt: Date.now() }],
    }));
  };

  const updateActivity = (
    index: number,
    field: keyof FeaturedArtistActivity,
    value: string | number
  ) => {
    setDraft((current) => ({
      ...current,
      activities: (current.activities || []).map((activity, activityIndex) =>
        activityIndex === index ? { ...activity, [field]: value } : activity
      ),
    }));
  };

  const removeActivity = (index: number) => {
    setDraft((current) => ({
      ...current,
      activities: (current.activities || []).filter((_, activityIndex) => activityIndex !== index),
    }));
  };

  const advancedRequested = useMemo(
    () =>
      Boolean(
        draft.bannerUrl ||
          draft.slug ||
          draft.category ||
          Object.values(draft.socialLinks || {}).some(Boolean) ||
          draft.pinnedEventIds?.length ||
          draft.activities?.length
      ),
    [draft]
  );

  const save = async () => {
    if (!draft.name.trim()) {
      toast.error('Artist name is required');
      return;
    }
    setSaving(true);
    try {
      const saved = selectedId
        ? await OrganizerBusinessService.updateFeaturedProfile(selectedId, draft)
        : await OrganizerBusinessService.createFeaturedProfile(draft);
      setProfiles((current) => {
        const exists = current.some((profile) => profile.id === saved.id);
        return exists
          ? current.map((profile) => (profile.id === saved.id ? saved : profile))
          : [saved, ...current];
      });
      setSelectedId(saved.id);
      if (
        advancedRequested &&
        !saved.bannerUrl &&
        !saved.socialLinks &&
        !saved.activities
      ) {
        toast.warning(
          'Core profile saved. The current backend did not persist advanced studio fields.'
        );
      } else {
        toast.success('Artist profile saved');
      }
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Unable to save artist profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <OrganizerShell>
      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:py-10">
        <PageHeader
          title="Featured artist studio"
          description="Manage public identity, official links, pinned events, and activity schedule."
          icon={<Sparkles className="size-5" />}
          actions={
            <Button type="button" variant="outline" onClick={newProfile}>
              <Plus className="size-4" />
              New profile
            </Button>
          }
        />

        {error && (
          <div role="alert" className="rounded-lg border border-[var(--error)]/30 bg-[var(--error)]/10 p-4 text-sm text-[var(--error)]">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface)]">
            <div className="border-b border-[var(--surface-border)] p-4">
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Profiles</h2>
            </div>
            {loading ? (
              <div className="flex justify-center p-10">
                <Loader2 className="size-6 animate-spin text-[var(--primary)]" />
              </div>
            ) : profiles.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="No artist profiles"
                description="Create the first profile from the studio."
                className="border-0 bg-transparent px-4"
              />
            ) : (
              <div className="max-h-[70vh] overflow-y-auto p-2">
                {profiles.map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => selectProfile(profile)}
                    className={`flex w-full items-center gap-3 rounded-lg p-3 text-left ${
                      selectedId === profile.id
                        ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                    }`}
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--background)]">
                      {profile.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={profile.imageUrl} alt="" className="size-full object-cover" />
                      ) : (
                        <ImageIcon className="size-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold">{profile.name}</p>
                      <p className="truncate text-[10px] text-[var(--text-muted)]">
                        {profile.category || profile.profileType}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </aside>

          <section className="space-y-6 rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="mb-1.5 block text-xs">Display name</Label>
                <Input
                  value={draft.name}
                  onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs">Category</Label>
                <Input
                  value={draft.category || ''}
                  onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
                  placeholder="Singer, DJ, actor"
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs">Avatar URL</Label>
                <Input
                  type="url"
                  value={draft.imageUrl || ''}
                  onChange={(event) => setDraft((current) => ({ ...current, imageUrl: event.target.value }))}
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs">Banner URL</Label>
                <Input
                  type="url"
                  value={draft.bannerUrl || ''}
                  onChange={(event) => setDraft((current) => ({ ...current, bannerUrl: event.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="mb-1.5 block text-xs">Public slug</Label>
                <Input
                  value={draft.slug || ''}
                  onChange={(event) => setDraft((current) => ({ ...current, slug: event.target.value }))}
                  placeholder="artist-name"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="mb-1.5 block text-xs">Biography</Label>
                <textarea
                  rows={5}
                  value={draft.bio || ''}
                  onChange={(event) => setDraft((current) => ({ ...current, bio: event.target.value }))}
                  className="w-full resize-y rounded-lg border border-[var(--surface-border)] bg-[var(--background)] p-3 text-sm text-[var(--text-primary)]"
                />
              </div>
            </div>

            <fieldset>
              <legend className="mb-3 text-sm font-bold text-[var(--text-primary)]">
                Official links
              </legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {(['website', 'spotify', 'youtube', 'instagram', 'facebook'] as const).map(
                  (network) => (
                    <div key={network}>
                      <Label className="mb-1 block text-[10px] capitalize">{network}</Label>
                      <div className="relative">
                        <ExternalLink className="absolute left-3 top-3 size-3.5 text-[var(--text-muted)]" />
                        <Input
                          type="url"
                          value={draft.socialLinks?.[network] || ''}
                          onChange={(event) => updateSocial(network, event.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>
                  )
                )}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-3 text-sm font-bold text-[var(--text-primary)]">
                Highlight events
              </legend>
              {events.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">No organizer events available.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {events.map((event) => (
                    <label key={event.id} className="flex items-center gap-2 rounded-lg border border-[var(--surface-border)] p-3 text-xs text-[var(--text-secondary)]">
                      <input
                        type="checkbox"
                        checked={draft.pinnedEventIds?.includes(event.id) || false}
                        onChange={() => togglePinnedEvent(event.id)}
                      />
                      <span className="truncate">{event.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </fieldset>

            <fieldset>
              <div className="mb-3 flex items-center justify-between">
                <legend className="text-sm font-bold text-[var(--text-primary)]">
                  Activity schedule
                </legend>
                <Button type="button" size="sm" variant="outline" onClick={addActivity}>
                  <CalendarPlus className="size-4" />
                  Add activity
                </Button>
              </div>
              <div className="space-y-3">
                {(draft.activities || []).map((activity, index) => (
                  <div key={index} className="grid gap-3 rounded-lg border border-[var(--surface-border)] p-4 sm:grid-cols-2">
                    <Input
                      value={activity.title}
                      onChange={(event) => updateActivity(index, 'title', event.target.value)}
                      placeholder="Activity title"
                    />
                    <Input
                      type="datetime-local"
                      value={new Date(activity.startsAt).toISOString().slice(0, 16)}
                      onChange={(event) => updateActivity(index, 'startsAt', new Date(event.target.value).getTime())}
                    />
                    <Input
                      value={activity.location || ''}
                      onChange={(event) => updateActivity(index, 'location', event.target.value)}
                      placeholder="Location"
                    />
                    <div className="flex gap-2">
                      <Input
                        type="url"
                        value={activity.url || ''}
                        onChange={(event) => updateActivity(index, 'url', event.target.value)}
                        placeholder="Event URL"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeActivity(index)}
                        aria-label="Remove activity"
                        title="Remove activity"
                      >
                        <Trash2 className="size-4 text-[var(--error)]" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </fieldset>

            <div className="flex justify-end border-t border-[var(--surface-border)] pt-5">
              <Button type="button" onClick={() => void save()} disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Save profile
              </Button>
            </div>
          </section>
        </div>
      </main>
    </OrganizerShell>
  );
}
