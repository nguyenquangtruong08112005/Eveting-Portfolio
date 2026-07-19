'use client';

import { useState } from 'react';
import { Check, X, Calendar, MapPin } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatDate, localizeCategory } from '@/lib/constants';
import type { Event } from '@/types';

interface PendingEventCardProps {
  event: Event;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
}

export function PendingEventCard({ event, onApprove, onReject }: PendingEventCardProps) {
  const t = useTranslations('admin_card');
  const tCat = useTranslations('navbar.categories');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState(t('reject_default'));
  const [rejectError, setRejectError] = useState('');

  const handleApprove = async () => {
    setLoading(true);
    try {
      await onApprove(event.id);
      setStatus('approved');
    } catch {
      /* handled upstream */
    }
    setLoading(false);
  };

  const handleReject = async () => {
    if (!showRejectForm) {
      setShowRejectForm(true);
      return;
    }
    const trimmed = rejectReason.trim();
    if (!trimmed) {
      setRejectError(t('reject_empty'));
      return;
    }
    setRejectError('');
    setLoading(true);
    try {
      await onReject(event.id, trimmed);
      setStatus('rejected');
    } catch {
      /* handled upstream */
    }
    setLoading(false);
  };

  const handleCancelReject = () => {
    setShowRejectForm(false);
    setRejectReason(t('reject_default'));
    setRejectError('');
  };

  if (status !== 'pending') {
    return (
      <div className="aura-card p-5 opacity-60">
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--text-primary)] font-medium">{event.name}</p>
          <Badge
            className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
              status === 'approved'
                ? 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/30'
                : 'bg-[var(--error)]/10 text-[var(--error)] border-[var(--error)]/30'
            }`}
          >
            {status === 'approved' ? t('approved') : t('rejected')}
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <div className="aura-card overflow-hidden">
      {event.imageUrl && (
        <div className="aspect-[21/9] w-full overflow-hidden bg-[var(--surface-hover)] relative">
          <Image src={event.imageUrl || ''} alt={event.name} fill className="object-cover w-full h-full" />
        </div>
      )}

      <div className="p-5">
        <div className="flex gap-1.5 flex-wrap mb-3">
          {event.category?.map((cat, idx) => (
            <Badge
              key={idx}
              className="px-2 py-0.5 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[10px] text-[var(--primary)] font-semibold uppercase tracking-wider"
            >
              {localizeCategory(cat, (k) => tCat(k))}
            </Badge>
          ))}
        </div>

        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">{event.name}</h3>
        <p className="text-sm text-[var(--text-muted)] line-clamp-2 mb-4">{event.description}</p>

        <div className="flex flex-col gap-1.5 text-xs text-[var(--text-secondary)] mb-5">
          <div className="flex items-center gap-2">
            <Calendar className="size-3.5 text-[var(--primary)]" />
            <span>{formatDate(event.date)}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="size-3.5 text-[var(--accent-brand)]" />
            <span>{event.venueName || event.location?.address}</span>
          </div>
        </div>

        {/* Inline reject form */}
        {showRejectForm && (
          <div className="mb-4 p-3 bg-[var(--error)]/5 border border-[var(--error)]/20 rounded-xl space-y-2">
            <label htmlFor={`reject-${event.id}`} className="text-xs text-[var(--text-secondary)] font-semibold block">
              {t('reject_prompt')}
            </label>
            <Input
              id={`reject-${event.id}`}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="text-xs rounded-lg"
              placeholder={t('reject_default')}
            />
            {rejectError && <p className="text-[10px] text-[var(--error)]">{rejectError}</p>}
            <div className="flex gap-2">
              <Button
                onClick={handleCancelReject}
                variant="outline"
                className="flex-1 py-1.5 rounded-lg text-[10px] font-semibold cursor-pointer"
              >
                {t('cancel')}
              </Button>
              <Button
                onClick={handleReject}
                disabled={loading}
                className="flex-1 py-1.5 rounded-lg bg-[var(--error)]/20 text-[var(--error)] hover:bg-[var(--error)]/30 border border-[var(--error)]/30 text-[10px] font-semibold cursor-pointer"
              >
                {t('reject')}
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button
            onClick={handleApprove}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-[var(--success)]/15 text-[var(--success)] hover:bg-[var(--success)]/25 border border-[var(--success)]/30 font-semibold text-xs cursor-pointer btn-tactile"
          >
            <Check className="size-4 mr-1.5" />
            {t('approve')}
          </Button>
          {!showRejectForm && (
            <Button
              onClick={handleReject}
              disabled={loading}
              variant="outline"
              className="flex-1 py-2.5 rounded-xl bg-[var(--error)]/10 text-[var(--error)] hover:bg-[var(--error)]/20 border border-[var(--error)]/30 font-semibold text-xs cursor-pointer btn-tactile"
            >
              <X className="size-4 mr-1.5" />
              {t('reject')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
