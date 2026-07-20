'use client';

import { useState, useEffect, useRef } from 'react';
import { Save, Loader2, Camera } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { StorageService } from '@/services/storage.service';
import type { UserProfile } from '@/types';

interface ProfileFormProps {
  profile: UserProfile | null;
  /** @param options.silent skip success toast (e.g. avatar auto-save) */
  onSave: (data: Partial<UserProfile>, options?: { silent?: boolean }) => Promise<void>;
}

export function ProfileForm({ profile, onSave }: ProfileFormProps) {
  const t = useTranslations('profile');
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setName(profile?.name || '');
    setBio(profile?.bio || '');
    setInterests((profile?.interests || []).join(', '));
    setAvatarUrl(profile?.profilePicUrl || '');
  }, [profile]);

  const displayName = name || profile?.name || '—';
  const initials =
    displayName
      .split(' ')
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?';

  const onPickAvatar = () => fileRef.current?.click();

  const onAvatarSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error(t('avatar_type_error'));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t('avatar_size_error'));
      return;
    }

    setUploading(true);
    try {
      // Same as mobile: purpose=profile → R2 key profile/{userId}/...
      const result = await StorageService.upload(file, 'profile');
      const url = result.url;
      setAvatarUrl(url);
      // Persist immediately so avatar survives even if user forgets Save
      await onSave({ profilePicUrl: url }, { silent: true });
      toast.success(t('avatar_updated'));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('avatar_upload_error'));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const data: Partial<UserProfile> = {
      name: name.trim(),
      bio: bio.trim(),
      interests: interests
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      profilePicUrl: avatarUrl || undefined,
    };
    try {
      await onSave(data);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[var(--surface)] border border-[var(--surface-border)] rounded-2xl p-6 space-y-5"
    >
      <div className="flex items-center gap-4 pb-4 border-b border-[var(--surface-border)]">
        <div className="relative shrink-0">
          <Avatar size="lg" className="size-16">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
            <AvatarFallback className="bg-[var(--primary)]/15 text-[var(--primary)] font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={onPickAvatar}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 size-8 rounded-full bg-[var(--primary)] text-[var(--on-primary)] border-2 border-[var(--surface)] flex items-center justify-center cursor-pointer hover:opacity-90 disabled:opacity-60"
            aria-label={t('upload_avatar')}
          >
            {uploading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Camera className="size-3.5" />
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onAvatarSelected}
          />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-[var(--text-primary)] truncate">{displayName}</h2>
          <p className="text-xs text-[var(--text-muted)] truncate">{profile?.email || ''}</p>
          <p className="text-[10px] text-[var(--text-muted)] mt-1">{t('avatar_hint')}</p>
          {profile?.bio ? (
            <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">{profile.bio}</p>
          ) : null}
        </div>
      </div>

      <div>
        <Label htmlFor="pf-name" className="text-xs text-[var(--text-secondary)] font-semibold block mb-2">
          {t('name_label')}
        </Label>
        <Input
          id="pf-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-xl"
          autoComplete="name"
          required
        />
      </div>

      <div>
        <Label htmlFor="pf-email" className="text-xs text-[var(--text-secondary)] font-semibold block mb-2">
          {t('email_label')}
        </Label>
        <Input
          id="pf-email"
          value={profile?.email || ''}
          disabled
          className="rounded-xl bg-[var(--surface-hover)] text-[var(--text-muted)]"
        />
      </div>

      <div>
        <Label htmlFor="pf-bio" className="text-xs text-[var(--text-secondary)] font-semibold block mb-2">
          {t('bio_label')}
        </Label>
        <textarea
          id="pf-bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-[var(--surface-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] resize-none"
          placeholder={t('bio_placeholder')}
        />
      </div>

      <div>
        <Label htmlFor="pf-interests" className="text-xs text-[var(--text-secondary)] font-semibold block mb-2">
          {t('interests_label')}
        </Label>
        <Input
          id="pf-interests"
          value={interests}
          onChange={(e) => setInterests(e.target.value)}
          className="rounded-xl"
          placeholder={t('interests_hint')}
        />
        <p className="text-[10px] text-[var(--text-muted)] mt-1.5">{t('interests_hint')}</p>
      </div>

      {/* Age range is read-only — server does not support changing it from web */}
      <div>
        <Label className="text-xs text-[var(--text-secondary)] font-semibold block mb-2">
          {t('age_label')}
        </Label>
        <Input
          value={profile?.ageRange || t('age_not_set')}
          disabled
          className="rounded-xl bg-[var(--surface-hover)] text-[var(--text-muted)] cursor-not-allowed"
        />
        <p className="text-[10px] text-[var(--text-muted)] mt-1.5">{t('age_locked_hint')}</p>
      </div>

      <Button
        type="submit"
        disabled={saving || uploading}
        className="btn-primary-gradient rounded-xl font-bold text-sm btn-tactile text-[var(--on-primary)] border-none cursor-pointer"
      >
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        {t('save_button')}
      </Button>
    </form>
  );
}
