'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Calendar, MapPin, CheckCircle, Clock, XCircle, QrCode } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { TicketService } from '@/features/tickets/api';
import { formatDate } from '@/lib/constants';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export function TicketDetailView() {
  const t = useTranslations('my_tickets');
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const ticketId = params.id as string;

  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      router.push('/login?redirect=/my-tickets');
      return;
    }

    TicketService.getTicketDetails(ticketId)
      .then((data) => {
        setTicket(data);
      })
      .catch((err) => {
        console.error('Failed to load ticket details:', err);
        setError('Could not load ticket details.');
      })
      .finally(() => setLoading(false));
  }, [ticketId, token, router]);

  const statusConfig = {
    paid: { label: t('active'), icon: CheckCircle, color: 'text-[var(--primary)]', bg: 'bg-[var(--primary)]/10', border: 'border-[var(--primary)]/20' },
    pending: { label: 'Pending', icon: Clock, color: 'text-[var(--warning)]', bg: 'bg-[var(--warning)]/10', border: 'border-[var(--warning)]/20' },
    checkedIn: { label: t('used'), icon: CheckCircle, color: 'text-[var(--success)]', bg: 'bg-[var(--success)]/10', border: 'border-[var(--success)]/20' },
    cancelled: { label: t('cancelled'), icon: XCircle, color: 'text-[var(--text-muted)]', bg: 'bg-[var(--surface-hover)]', border: 'border-[var(--surface-border)]' },
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col bg-[var(--background)] min-h-screen">
        <Navbar />
        <main className="max-w-2xl mx-auto px-6 py-10 w-full flex-grow flex items-center justify-center">
          <div className="text-[var(--text-muted)] text-sm">{t('loading_event')}</div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="flex-1 flex flex-col bg-[var(--background)] min-h-screen">
        <Navbar />
        <main className="max-w-2xl mx-auto px-6 py-10 w-full flex-grow text-center">
          <p className="text-[var(--text-muted)] text-sm mb-4">{error || t('no_tickets')}</p>
          <Link href="/my-tickets" className="text-[var(--primary)] text-xs font-bold hover:underline">
            {t('title')}
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const event = ticket.event;
  const status = statusConfig[ticket.status as keyof typeof statusConfig] || statusConfig.paid;
  const StatusIcon = status.icon;

  return (
    <div className="flex-1 flex flex-col bg-[var(--background)] min-h-screen">
      <Navbar />

      <main className="max-w-2xl mx-auto px-6 py-10 w-full flex-grow space-y-6">
        {/* Back */}
        <Link
          href="/my-tickets"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          {t('title')}
        </Link>

        {/* Ticket Card */}
        <div className="rounded-2xl overflow-hidden bg-[var(--surface)] border border-[var(--surface-border)] shadow-xl">
          {/* Event Image */}
          {event?.imageUrl && (
            <div className="aspect-[21/9] w-full overflow-hidden relative">
              <Image src={event.imageUrl} alt={event.name} fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-5 right-5">
                <h1 className="text-xl font-extrabold text-white leading-snug drop-shadow-md">{event.name}</h1>
              </div>
            </div>
          )}

          <div className="p-6 space-y-5">
            {/* Status */}
            <div className="flex items-center justify-between">
              <Badge className={cn("text-[10px] font-bold uppercase tracking-wider px-3 py-1 border", status.color, status.bg, status.border)}>
                <StatusIcon className="size-3 mr-1 inline" />
                {status.label}
              </Badge>
              <Badge className="bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[10px] text-[var(--primary)] font-bold uppercase tracking-wider px-3 py-1">
                {ticket.type || 'Standard'}
              </Badge>
            </div>

            {/* Event Info */}
            <div className="space-y-3 text-sm">
              {event?.date && (
                <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                  <Calendar className="size-4 text-[var(--primary)] shrink-0" />
                  <span>{formatDate(event.date)}</span>
                </div>
              )}
              {(event?.venueName || event?.city) && (
                <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                  <MapPin className="size-4 text-[var(--primary)] shrink-0" />
                  <span>{event.venueName}{event.city ? `, ${event.city}` : ''}</span>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-[var(--surface-border)] pt-4">
              <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">{t('title')}</h3>

              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">{t('ticket_id')}</span>
                  <span className="font-mono text-[var(--text-primary)] font-bold text-xs select-all">{ticket.id}</span>
                </div>
                {ticket.seat && (
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">{t('seat_label', { seatId: '' }).replace(' ', '')}</span>
                    <span className="font-bold text-[var(--text-primary)]">{ticket.seat}</span>
                  </div>
                )}
                {ticket.price !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">{t('price')}</span>
                    <span className="font-bold text-[var(--primary)]">
                      {ticket.price === 0 ? t('active') : `${ticket.price?.toLocaleString()} ₫`}
                    </span>
                  </div>
                )}
                {ticket.purchaseDate && (
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">{t('purchase_date')}</span>
                    <span className="text-[var(--text-secondary)]">{formatDate(ticket.purchaseDate)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* QR Code placeholder */}
            {ticket.qrCode && (
              <div className="border-t border-[var(--surface-border)] pt-4 text-center">
                <div className="inline-block bg-white p-4 rounded-xl">
                  <QrCode className="size-24 text-[var(--foreground)]" />
                </div>
                <p className="text-[10px] text-[var(--text-muted)] mt-2">{t('qr_hint')}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Link
                href={`/attendee/events/${ticket.event?.id || ticket.eventId}`}
                className="flex-1 py-2.5 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[var(--primary)] text-xs font-bold text-center hover:bg-[var(--primary)]/20 transition-colors"
              >
                {t('view_event_page')}
              </Link>
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl bg-[var(--surface-hover)] border border-[var(--surface-border)] text-[var(--text-secondary)] text-xs font-bold hover:bg-[var(--muted)] transition-colors cursor-pointer"
              >
                {t('print_ticket')}
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
