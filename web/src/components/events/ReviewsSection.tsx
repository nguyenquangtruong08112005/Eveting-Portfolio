'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Star, MessageSquare, Loader2, Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { ReviewService } from '@/services/review.service';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/lib/constants';
import type { Review } from '@/types';
import { cn } from '@/lib/utils';

interface ReviewsSectionProps {
  eventId: string;
  /** When false, hide write-review CTA and show reason */
  canWrite?: boolean;
  /** i18n key suffix under reviews.* for locked message */
  lockedReason?: 'not_ended' | 'not_multi' | null;
}

function StarRow({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const dim = size === 'lg' ? 'size-6' : 'size-3.5';
  return (
    <div className="flex items-center gap-0.5" aria-label={`Rating ${rating} of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(dim, i < rating ? 'fill-[var(--warning)] text-[var(--warning)]' : 'text-[var(--text-muted)]')}
        />
      ))}
    </div>
  );
}

export function ReviewsSection({
  eventId,
  canWrite = true,
  lockedReason = null,
}: ReviewsSectionProps) {
  const t = useTranslations('reviews');
  const { isAuthenticated } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draftRating, setDraftRating] = useState(0);
  const [draftComment, setDraftComment] = useState('');
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await ReviewService.listByEvent(eventId);
      setReviews(data.reviews || []);
    } catch (err) {
      console.error('Reviews load error:', err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  const avg =
    reviews.length > 0 ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length : 0;

  const handleSubmit = async () => {
    if (draftRating < 1) {
      toast.error(t('rating_label'));
      return;
    }
    setSubmitting(true);
    try {
      await ReviewService.create(eventId, { rating: draftRating, comment: draftComment });
      toast.success(t('submitted'));
      setDraftRating(0);
      setDraftComment('');
      setDialogOpen(false);
      await load();
    } catch (err: any) {
      toast.error(err?.message || t('submit_error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[var(--surface)] border border-[var(--surface-border)] rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-5 text-[var(--primary)]" />
          <h3 className="text-base font-bold text-[var(--text-primary)]">{t('title')}</h3>
        </div>
        {isAuthenticated && canWrite ? (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger
              render={
                <Button className="btn-primary-gradient text-[var(--on-primary)] border-none rounded-xl text-xs font-bold btn-tactile cursor-pointer" />
              }
            >
              {t('write_review')}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{t('write_review')}</DialogTitle>
                <DialogDescription>{t('subtitle')}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-2">
                    {t('rating_label')}
                  </label>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => {
                      const val = i + 1;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setDraftRating(val)}
                          onMouseEnter={() => setHoverRating(val)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="p-0.5 cursor-pointer"
                          aria-label={`${val} stars`}
                        >
                          <Star
                            className={cn(
                              'size-7 transition-colors',
                              (hoverRating || draftRating) >= val
                                ? 'fill-[var(--warning)] text-[var(--warning)]'
                                : 'text-[var(--text-muted)]'
                            )}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-2">
                    {t('comment_label')}
                  </label>
                  <textarea
                    value={draftComment}
                    onChange={(e) => setDraftComment(e.target.value)}
                    rows={4}
                    placeholder={t('comment_placeholder')}
                    className="w-full rounded-xl border border-[var(--surface-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] resize-none"
                  />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <DialogClose
                  render={<Button variant="outline" className="rounded-xl text-xs" />}
                >
                  {t('cancel')}
                </DialogClose>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="btn-primary-gradient text-[var(--on-primary)] border-none rounded-xl text-xs btn-tactile"
                >
                  {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                  {submitting ? t('submitting') : t('submit')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : isAuthenticated && !canWrite ? (
          <p className="text-[11px] text-[var(--text-muted)] max-w-[220px] text-right">
            {lockedReason === 'not_ended'
              ? t('locked_not_ended')
              : lockedReason === 'not_multi'
                ? t('locked_not_multi')
                : t('locked_generic')}
          </p>
        ) : (
          <Link
            href="/login"
            className="text-xs font-bold text-[var(--primary)] hover:underline"
          >
            {t('login_to_review')}
          </Link>
        )}
      </div>

      {reviews.length > 0 && (
        <div className="flex items-center gap-3 mb-5 pb-5 border-b border-[var(--surface-border)]">
          <span className="text-3xl font-black text-[var(--text-primary)]">
            {avg.toFixed(1)}
          </span>
          <div>
            <StarRow rating={Math.round(avg)} />
            <p className="text-[10px] text-[var(--text-muted)] mt-1">
              {t('reviews_count', { n: reviews.length })}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="size-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <EmptyState icon={MessageSquare} title={t('empty')} description={t('empty_desc')} className="border-none bg-transparent py-8" />
      ) : (
        <ul className="space-y-5">
          {reviews.map((r) => {
            const initials = (r.userName || '?').charAt(0).toUpperCase();
            return (
              <li key={r.id} className="flex gap-3">
                <Avatar className="size-9 shrink-0">
                  {r.userAvatar ? <AvatarImage src={r.userAvatar} alt={r.userName || ''} /> : null}
                  <AvatarFallback className="bg-[var(--accent-brand)]/15 text-[var(--accent-brand)] font-bold text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-[var(--text-primary)]">{r.userName || '—'}</p>
                    <StarRow rating={r.rating} />
                  </div>
                  {r.comment && (
                    <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed whitespace-pre-line">
                      {r.comment}
                    </p>
                  )}
                  <p className="text-[10px] text-[var(--text-muted)] mt-1.5">
                    {formatDate(r.createdAt)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
