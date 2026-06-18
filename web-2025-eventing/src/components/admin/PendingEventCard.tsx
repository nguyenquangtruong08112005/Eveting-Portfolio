'use client';

import React from 'react';
import { Calendar, MapPin, X, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PendingEvent {
  id: string;
  name: string;
  description: string;
  date: number;
  organizerId: string;
  venueName?: string;
  city?: string;
}

interface PendingEventCardProps {
  event: PendingEvent;
  rejectionReason: string;
  onRejectionReasonChange: (reason: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function PendingEventCard({
  event,
  rejectionReason,
  onRejectionReasonChange,
  onApprove,
  onReject,
}: PendingEventCardProps) {
  const formattedDate = new Date(event.date).toLocaleDateString('en-US', {
    dateStyle: 'medium',
  });

  return (
    <Card className="premium-card p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 border-none ring-0">
      <CardContent className="p-0 flex-1 text-left">
        <span className="text-[10px] text-zinc-500 font-mono uppercase block mb-1">ID: {event.id}</span>
        <h3 className="text-xl font-bold text-white mb-2">{event.name}</h3>
        <p className="text-zinc-400 text-sm mb-4">{event.description}</p>

        <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-purple-400" />
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-cyan-400" />
            <span>
              {event.venueName || 'Physical'}, {event.city || 'HCM'}
            </span>
          </div>
        </div>
      </CardContent>

      <div className="flex flex-col gap-3 min-w-[200px]">
        {/* Rejection input */}
        <Input
          type="text"
          placeholder="Rejection reason..."
          value={rejectionReason}
          onChange={(e) => onRejectionReasonChange(e.target.value)}
          className="h-9 px-3 rounded-xl border border-zinc-800 bg-zinc-900/50 text-white placeholder-zinc-500 focus-visible:ring-0 focus-visible:border-red-500 transition-all text-xs"
        />

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="destructive"
            onClick={() => onReject(event.id)}
            className="py-4 rounded-xl border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 text-red-400 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
            Reject
          </Button>
          <Button
            onClick={() => onApprove(event.id)}
            className="py-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer border-none"
          >
            <Check className="h-3.5 w-3.5" />
            Approve
          </Button>
        </div>
      </div>
    </Card>
  );
}
