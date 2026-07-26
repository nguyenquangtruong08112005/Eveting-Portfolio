'use client';

import { useState, useEffect, useCallback } from 'react';
import { User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { PageHeader } from '@/components/shared/PageHeader';
import { Spinner } from '@/components/shared/Spinner';
import { ProfileForm } from './ProfileForm';
import { MembershipCard } from './MembershipCard';
import { FollowedOrganizers } from './FollowedOrganizers';
import { UserService } from '@/services/user.service';
import { MembershipService } from '@/services/membership.service';
import { ProfileService } from '@/services/profile.service';
import { useAuth } from '@/hooks/useAuth';
import type { UserProfile, Membership, FeaturedProfile } from '@/types';

export function ProfileView() {
  const t = useTranslations('profile');
  const { isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [organizers, setOrganizers] = useState<FeaturedProfile[]>([]);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    try {
      const [meRes, memRes, orgRes] = await Promise.allSettled([
        UserService.getMe(),
        MembershipService.getMine(),
        ProfileService.list(1, 20),
      ]);
      if (meRes.status === 'fulfilled') setProfile(meRes.value);
      if (memRes.status === 'fulfilled') setMembership(memRes.value);
      if (orgRes.status === 'fulfilled') setOrganizers(orgRes.value.profiles || []);
    } catch (err) {
      console.error('Profile load error:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (
    data: Partial<UserProfile>,
    options?: { silent?: boolean }
  ) => {
    try {
      const updated = await UserService.updateMe(data);
      // Force new object so ProfileForm useEffect re-syncs
      setProfile({ ...updated, profilePicUrl: updated.profilePicUrl ?? data.profilePicUrl });
      if (!options?.silent) toast.success(t('saved'));
      // Re-fetch to confirm what the server stored
      try {
        const fresh = await UserService.getMe();
        setProfile({
          ...fresh,
          profilePicUrl: fresh.profilePicUrl ?? data.profilePicUrl ?? updated.profilePicUrl,
        });
      } catch {
        /* keep optimistic updated */
      }
    } catch (err: unknown) {
      // No profile yet → create then retry update
      const anyErr = err as { message?: string; status?: number };
      const msg = String(anyErr?.message || '');
      if (msg.toLowerCase().includes('not found') || anyErr?.status === 404) {
        try {
          await UserService.registerProfile({
            name: data.name || profile?.name || 'User',
            bio: data.bio,
            interests: data.interests,
            profilePicUrl: data.profilePicUrl,
            // ageRange only on first register if server already has it; never change later
          });
          const created = await UserService.getMe();
          setProfile(created);
          if (!options?.silent) toast.success(t('saved'));
          return;
        } catch (e2: unknown) {
          toast.error((e2 as { message?: string })?.message || t('save_error'));
          throw e2;
        }
      }
      toast.error(anyErr?.message || t('save_error'));
      throw err;
    }
  };

  const handleToggleFollow = async (org: FeaturedProfile) => {
    const isFollowed = followedIds.has(org.id);
    // Optimistic update
    setFollowedIds((prev) => {
      const next = new Set(prev);
      if (isFollowed) next.delete(org.id);
      else next.add(org.id);
      return next;
    });
    try {
      if (isFollowed) {
        await UserService.unfollow(org.id);
        toast.success(t('unfollow_success'));
      } else {
        await UserService.follow(org.id);
        toast.success(t('follow_success'));
      }
    } catch (err: any) {
      // Revert on error
      setFollowedIds((prev) => {
        const next = new Set(prev);
        if (isFollowed) next.add(org.id);
        else next.delete(org.id);
        return next;
      });
      toast.error(err?.message || t('save_error'));
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[var(--background)] min-h-screen">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 lg:py-10 w-full flex-grow">
        <PageHeader title={t('title')} description={t('subtitle')} icon={<User className="size-5" />} />

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Spinner className="size-8" />
            <p className="text-[var(--text-muted)] text-sm">{t('loading')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <ProfileForm profile={profile} onSave={handleSave} />
            </div>
            <div className="lg:col-span-1">
              <MembershipCard membership={membership} />
            </div>
            <div className="lg:col-span-3">
              <FollowedOrganizers
                organizers={organizers}
                followedIds={followedIds}
                onToggleFollow={handleToggleFollow}
              />
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
