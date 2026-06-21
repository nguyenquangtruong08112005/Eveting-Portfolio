'use client';

import React, { useState } from 'react';
import { Check, X, Calendar, MapPin } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/constants';
import type { Event } from '@/types';

interface PendingEventCardProps {
  event: Event;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
}

export function PendingEventCard({ event, onApprove, onReject }: PendingEventCardProps) {
  const t = useTranslations('admin_card');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');

  const handleApprove = async () => {
    setLoading(true);
    try {
      await onApprove(event.id);
      setStatus('approved');
    } catch { /* handled upstream */ }
    setLoading(false);
  };

  const handleReject = async () => {
    const reason = prompt(t('reject_prompt'), t('reject_default'));
    if (reason === null) return; // cancelled
    const trimmed = reason.trim();
    if (!trimmed) {
      alert(t('reject_empty'));
      return;
    }
    setLoading(true);
    try {
      await onReject(event.id, trimmed);
      setStatus('rejected');
    } catch { /* handled upstream */ }
    setLoading(false);
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
      {/* Image */}
      {event.imageUrl && (
        <div className="aspect-[21/9] w-full overflow-hidden bg-[var(--background)] relative">
          <Image
            src={event.imageUrl || ''}
            alt={event.name}
            fill
            className="object-cover w-full h-full"
          />
        </div>
      )}

      <div className="p-5">
        {/* Categories */}
        <div className="flex gap-1.5 flex-wrap mb-3">
          {event.category?.map((cat, idx) => (
            <Badge
              key={idx}
              className="px-2 py-0.5 rounded-full bg-[var(--primary)]/8 border border-[var(--primary)]/20 text-[10px] text-[var(--primary-dark)] font-semibold uppercase tracking-wider"
            >
              {cat}
            </Badge>
          ))}
        </div>

        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">{event.name}</h3>
        <p className="text-sm text-[var(--text-muted)] line-clamp-2 mb-4">{event.description}</p>

        {/* Meta */}
        <div className="flex flex-col gap-1.5 text-xs text-[var(--text-secondary)] mb-5">
          <div className="flex items-center gap-2">
            <Calendar className="size-3.5 text-[var(--primary-dark)]" />
            <span>{formatDate(event.date)}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="size-3.5 text-[var(--secondary-blue)]" />
            <span>{event.venueName || event.location?.address}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button
            onClick={handleApprove}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-[var(--success)]/15 text-[var(--success)] hover:bg-[var(--success)]/25 border border-[var(--success)]/30 font-semibold text-xs cursor-pointer btn-tactile"
          >
            <Check className="size-4 mr-1.5" />
            {t('approve')}
          </Button>
          <Button
            onClick={handleReject}
            disabled={loading}
            variant="outline"
            className="flex-1 py-2.5 rounded-xl bg-[var(--error)]/10 text-[var(--error)] hover:bg-[var(--error)]/20 border border-[var(--error)]/30 font-semibold text-xs cursor-pointer btn-tactile"
          >
            <X className="size-4 mr-1.5" />
            {t('reject')}
          </Button>
        </div>
      </div>
    </div>
  );
}
