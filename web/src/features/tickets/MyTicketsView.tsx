'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Ticket as TicketIcon, Calendar, MapPin, ArrowRight, RefreshCw, Printer } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Badge } from '@/components/ui/badge';
import { SafeImage } from '@/components/shared/SafeImage';
import { useAuth } from '@/hooks/useAuth';
import { TicketService } from '@/features/tickets/api';
import { formatDate, enrichEvent } from '@/lib/constants';
import type { Ticket, Event } from '@/types';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { TicketQr, buildClientTicketQrValue } from '@/components/tickets/TicketQr';



export function MyTicketsView() {
  const t = useTranslations('my_tickets');
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [eventsMap, setEventsMap] = useState<Record<string, Event>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 10;

  const mapServerStatus = (s: string | undefined): Ticket['status'] => {
    if (s === 'paid' || s === 'active') return 'active';
    if (s === 'checkedIn' || s === 'used') return 'used';
    if (s === 'cancelled' || s === 'failed') return 'cancelled';
    // pending / processing — not cancelled
    if (s === 'pending' || s === 'processing') return 'pending' as Ticket['status'];
    return (s as Ticket['status']) || 'pending';
  };

  const loadData = useCallback(async (pageNum = 1) => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/my-tickets');
      return;
    }

    try {
      const data = await TicketService.getUserTickets(pageNum, PAGE_SIZE);
      const map: Record<string, Event> = { ...eventsMap };

      if (data?.tickets) {
        const mappedTickets: Ticket[] = data.tickets.map((t: any) => {
          const eventId = t.event?.id || t.eventId || '';
          if (t.event?.id) {
            map[t.event.id] = enrichEvent({
              id: t.event.id,
              name: t.event.name,
              date: t.event.date,
              imageUrl: t.event.imageUrl,
              venueName: t.event.venueName,
              city: t.event.city,
              status: t.event.status,
            } as Event);
          }
          return {
            id: t.id,
            eventId,
            userId: t.userId || '',
            seatId: t.seat || undefined,
            ticketType: t.type === 'standard' ? 'Standard' : t.type || 'Standard',
            status: mapServerStatus(t.status),
            purchasedAt: t.purchaseDate || Date.now(),
            qrCode: t.qrCode || t.qr_code || undefined,
          };
        });
        setTickets(mappedTickets);
        setEventsMap(map);
        const pag = (data as { pagination?: { totalPages?: number; currentPage?: number } })
          .pagination;
        setTotalPages(Math.max(1, pag?.totalPages || 1));
        setPage(pag?.currentPage || pageNum);
      } else {
        setTickets([]);
      }
    } catch (err: unknown) {
      console.error('Failed to load tickets:', err);
      setTickets([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load by page; avoid eventsMap loop
  }, [isAuthenticated, router]);

  useEffect(() => {
    loadData(1);
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Re-query ZaloPay for any still-pending tickets (webhook often misses localhost)
    try {
      await Promise.allSettled(
        tickets
          .filter((t) => t.status === 'pending')
          .map((t) => TicketService.checkPaymentStatus(t.id))
      );
    } catch {
      /* ignore */
    }
    await loadData(page);
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  if (loading) {
    return (
      <div className="flex-grow flex flex-col bg-[var(--background)] min-h-screen text-[var(--text-primary)]">
        <Navbar />
        <main className="max-w-4xl mx-auto px-6 py-10 w-full flex-grow space-y-8 animate-pulse">
          {/* Skeleton Title */}
          <div className="flex items-center justify-between border-b border-[var(--surface-border)] pb-4">
            <div className="h-8 w-48 bg-[var(--surface-hover)] rounded-xl" />
            <div className="h-10 w-36 bg-[var(--surface-hover)] rounded-xl" />
          </div>
          {/* Skeleton List */}
          <div className="space-y-6">
            {[1, 2].map((i) => (
              <div key={i} className="h-44 rounded-2xl bg-[var(--surface-hover)] border border-[var(--surface-border)] flex flex-col md:flex-row" />
            ))}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[var(--background)] min-h-screen">
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 py-10 w-full flex-grow space-y-8">
        {/* Title row */}
        <div className="flex items-center justify-between border-b border-[var(--surface-border)] pb-4">
          <div>
            <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight flex items-center gap-2">
              <TicketIcon className="size-6 text-[var(--primary)]" />
              {t('title')}
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {t('ticket_count', { count: tickets.length })}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--surface-border)] hover:bg-[var(--surface-hover)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
          >
            <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
            {t('refresh')}
          </button>
        </div>

        {tickets.length === 0 ? (
          <div className="text-center py-20 bg-[var(--surface)] rounded-2xl border border-[var(--surface-border)] p-8">
            <TicketIcon className="size-12 text-[var(--text-muted)] mx-auto mb-4 opacity-50" />
            <h3 className="text-[var(--text-secondary)] text-lg font-bold">{t('no_tickets')}</h3>
            <p className="text-[var(--text-muted)] text-sm mt-1 max-w-sm mx-auto mb-6">
              {t('empty_hint')}
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-xl btn-primary-gradient text-sm font-semibold text-[var(--on-primary)] border-none cursor-pointer btn-tactile font-bold"
            >
              {t('explore_events')}
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {tickets.map((ticket) => {
              const eventInfo = eventsMap[ticket.eventId];
              return (
                <div
                  key={ticket.id}
                  className="relative rounded-2xl overflow-hidden bg-[var(--surface)] border border-[var(--surface-border)] flex flex-col md:flex-row hover:border-[var(--surface-border)] transition-all duration-300 shadow-xl"
                >
                  {/* Left Ticket Stub (70%) */}
                  <div className="flex-1 p-6 flex gap-5">
                    {/* Event Image */}
                    {eventInfo?.imageUrl && (
                      <div className="w-24 h-32 rounded-lg overflow-hidden shrink-0 border border-[var(--surface-border)] relative hidden sm:block">
                        <SafeImage
                          src={eventInfo.imageUrl}
                          alt={eventInfo.name || 'Event'}
                          fill
                          sizes="96px"
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    )}
                    
                    {/* Event detail */}
                    <div className="flex flex-col justify-between py-0.5">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <Badge className="bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[9px] text-[var(--primary)] font-bold uppercase tracking-wider px-2 py-0.5">
                            {ticket.ticketType}
                          </Badge>
                          {ticket.seatId && (
                            <Badge className="bg-[var(--warning)]/10 border border-[var(--warning)]/20 text-[9px] text-[var(--warning)] font-bold uppercase tracking-wider px-2 py-0.5">
                              {t('seat_label', { seatId: ticket.seatId })}
                            </Badge>
                          )}
                          <Badge className={cn(
                            "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border",
                            ticket.status === 'active'
                              ? "bg-[var(--primary)]/10 border-[var(--primary)]/20 text-[var(--primary)]"
                              : ticket.status === 'used'
                                ? "bg-[var(--success)]/10 border-[var(--success)]/20 text-[var(--success)]"
                                : ticket.status === 'pending' || (ticket.status as string) === 'processing'
                                  ? "bg-[var(--warning)]/10 border-[var(--warning)]/20 text-[var(--warning)]"
                                  : "bg-[var(--surface-hover)] border-[var(--surface-border)] text-[var(--text-muted)]"
                          )}>
                            {ticket.status === 'active'
                              ? t('active')
                              : ticket.status === 'used'
                                ? t('used')
                                : ticket.status === 'pending' || (ticket.status as string) === 'processing'
                                  ? 'Pending'
                                  : t('cancelled')}
                          </Badge>
                        </div>
                        
                        <h3 className="text-base font-extrabold text-[var(--text-primary)] leading-snug hover:text-[var(--primary)] transition-colors">
                          {eventInfo?.name || t('unknown_event')}
                        </h3>
                        
                        <div className="flex flex-col gap-1.5 mt-3 text-xs text-[var(--text-secondary)]">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="size-3.5 text-[var(--primary)]" />
                            <span>{eventInfo ? formatDate(eventInfo.date) : t('loading_event')}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="size-3.5 text-[var(--primary)]" />
                            <span className="truncate max-w-[320px]">{eventInfo?.venueName || t('loading_event')}</span>
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-[10px] text-[var(--text-muted)] mt-4">
                        {t('purchase_date')} {formatDate(ticket.purchasedAt)}
                      </p>
                    </div>
                  </div>

                  {/* Cutout Dot Separators (Classic Ticket Stub Look) */}
                  <div className="absolute right-[28%] top-0 bottom-0 w-[2px] hidden md:flex flex-col justify-between pointer-events-none select-none">
                    <div className="size-4 bg-[var(--background)] rounded-full -mt-2 -ml-2 border-b border-[var(--surface-border)]" />
                    <div className="w-[1px] h-full border-r border-dashed border-[var(--surface-border)] mx-auto" />
                    <div className="size-4 bg-[var(--background)] rounded-full -mb-2 -ml-2 border-t border-[var(--surface-border)]" />
                  </div>

                  {/* Right QR Stub (30%) */}
                  <div className="w-full md:w-[28%] bg-[var(--surface-hover)] p-6 flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-[var(--surface-border)] gap-3">
                    <div className="w-full bg-white p-3 rounded-lg flex flex-col items-center justify-center gap-1.5 shadow">
                      <TicketQr
                        value={buildClientTicketQrValue({
                          ticketId: ticket.id,
                          eventId: ticket.eventId,
                          qrCode: ticket.qrCode,
                        })}
                        size={120}
                        alt={t('qr_hint')}
                      />
                      <span className="font-mono text-[9px] text-[var(--foreground)] tracking-[0.15em] font-bold select-all leading-none mt-1 max-w-full truncate">
                        {ticket.id.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex gap-2 w-full mt-1">
                      <button
                        onClick={handlePrint}
                        className="flex-1 py-2 bg-[var(--surface-hover)] hover:bg-[var(--muted)] text-[var(--text-primary)] font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer transition-all border-none"
                      >
                        <Printer className="size-3.5" />
                        {t('print_ticket')}
                      </button>
                      
                      <Link
                        href={`/my-tickets/${ticket.id}`}
                        className="px-3 py-2 bg-[var(--primary)] text-[var(--on-primary)] font-bold rounded-xl text-xs flex items-center justify-center hover:opacity-90 cursor-pointer transition-all"
                        title={t('view_event')}
                      >
                        <ArrowRight className="size-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={page <= 1 || refreshing}
                  onClick={() => {
                    setRefreshing(true);
                    loadData(page - 1);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-[var(--surface-border)] text-xs font-bold disabled:opacity-40 cursor-pointer"
                >
                  Prev
                </button>
                <span className="text-xs text-[var(--text-muted)]">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages || refreshing}
                  onClick={() => {
                    setRefreshing(true);
                    loadData(page + 1);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-[var(--surface-border)] text-xs font-bold disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
