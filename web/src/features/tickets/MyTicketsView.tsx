'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Ticket as TicketIcon, Calendar, MapPin, ArrowRight, RefreshCw, Printer } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { TicketService } from '@/features/tickets/api';
import { EventService } from '@/features/events/api';
import { formatDate, enrichEvent } from '@/lib/constants';
import type { Ticket, Event } from '@/types';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';



export function MyTicketsView() {
  const t = useTranslations('my_tickets');
  const router = useRouter();
  const { token } = useAuth();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [eventsMap, setEventsMap] = useState<Record<string, Event>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!token) {
      router.push('/login?redirect=/my-tickets');
      return;
    }

    try {
      // Fetch user tickets
      const data = await TicketService.getUserTickets();
      
      // Fetch all events to construct map
      const eventsData = await EventService.list();
      const map: Record<string, Event> = {};
      if (eventsData?.events) {
        eventsData.events.forEach((e) => {
          map[e.id] = enrichEvent(e);
        });
      }
      setEventsMap(map);

      if (data?.tickets) {
        const mappedTickets: Ticket[] = data.tickets.map((t: any) => ({
          id: t.id,
          eventId: t.event?.id || t.eventId || '',
          userId: t.userId || '',
          seatId: t.seat || undefined,
          ticketType: t.type === 'standard' ? 'Standard' : (t.type || 'Standard'),
          // Map server statuses to frontend statuses
          status: t.status === 'paid' ? 'active' : t.status === 'checkedIn' ? 'used' : t.status || 'active',
          purchasedAt: t.purchaseDate || Date.now(),
        }));
        setTickets(mappedTickets);
      } else {
        setTickets([]);
      }
    } catch (err: any) {
      console.error('Failed to load tickets:', err);
      setTickets([]);
      setEventsMap({});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  if (loading) {
    return (
      <div className="flex-grow flex flex-col bg-[var(--background)] min-h-screen text-white">
        <Navbar />
        <main className="max-w-4xl mx-auto px-6 py-10 w-full flex-grow space-y-8 animate-pulse">
          {/* Skeleton Title */}
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="h-8 w-48 bg-zinc-800/80 rounded-xl" />
            <div className="h-10 w-36 bg-zinc-800/80 rounded-xl" />
          </div>
          {/* Skeleton List */}
          <div className="space-y-6">
            {[1, 2].map((i) => (
              <div key={i} className="h-44 rounded-2xl bg-zinc-800/20 border border-white/5 flex flex-col md:flex-row" />
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
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <TicketIcon className="size-6 text-[var(--primary)]" />
              {t('title')}
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              {t('ticket_count', { count: tickets.length })}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-xs text-zinc-400 hover:text-white transition-all cursor-pointer"
          >
            <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
            {t('refresh')}
          </button>
        </div>

        {tickets.length === 0 ? (
          <div className="text-center py-20 bg-[#1E212B] rounded-2xl border border-white/5 p-8">
            <TicketIcon className="size-12 text-zinc-600 mx-auto mb-4 opacity-50" />
            <h3 className="text-zinc-300 text-lg font-bold">{t('no_tickets')}</h3>
            <p className="text-zinc-500 text-sm mt-1 max-w-sm mx-auto mb-6">
              {t('empty_hint')}
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-xl btn-primary-gradient text-sm font-semibold text-[#12141A] border-none cursor-pointer btn-tactile font-bold"
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
                  className="relative rounded-2xl overflow-hidden bg-[#1E212B] border border-white/5 flex flex-col md:flex-row hover:border-white/15 transition-all duration-300 shadow-xl"
                >
                  {/* Left Ticket Stub (70%) */}
                  <div className="flex-1 p-6 flex gap-5">
                    {/* Event Image */}
                    {eventInfo?.imageUrl && (
                      <div className="w-24 h-32 rounded-lg overflow-hidden shrink-0 border border-white/5 relative hidden sm:block">
                        <Image src={eventInfo.imageUrl || ''} alt={eventInfo.name} fill className="w-full h-full object-cover" />
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
                            <Badge className="bg-[#fcc025]/10 border border-[#fcc025]/20 text-[9px] text-[#fcc025] font-bold uppercase tracking-wider px-2 py-0.5">
                              {t('seat_label', { seatId: ticket.seatId })}
                            </Badge>
                          )}
                          <Badge className={cn(
                            "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border",
                            ticket.status === 'active' ? "bg-[var(--primary)]/10 border-[var(--primary)]/20 text-[var(--primary)]" : "bg-zinc-800 border-zinc-700 text-zinc-500"
                          )}>
                            {ticket.status === 'active' ? t('active') : ticket.status === 'used' ? t('used') : t('cancelled')}
                          </Badge>
                        </div>
                        
                        <h3 className="text-base font-extrabold text-white leading-snug hover:text-[var(--primary)] transition-colors">
                          {eventInfo?.name || t('unknown_event')}
                        </h3>
                        
                        <div className="flex flex-col gap-1.5 mt-3 text-xs text-zinc-400">
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
                      
                      <p className="text-[10px] text-zinc-500 mt-4">
                        {t('purchase_date')} {formatDate(ticket.purchasedAt)}
                      </p>
                    </div>
                  </div>

                  {/* Cutout Dot Separators (Classic Ticket Stub Look) */}
                  <div className="absolute right-[28%] top-0 bottom-0 w-[2px] hidden md:flex flex-col justify-between pointer-events-none select-none">
                    <div className="size-4 bg-[var(--background)] rounded-full -mt-2 -ml-2 border-b border-white/5" />
                    <div className="w-[1px] h-full border-r border-dashed border-white/10 mx-auto" />
                    <div className="size-4 bg-[var(--background)] rounded-full -mb-2 -ml-2 border-t border-white/5" />
                  </div>

                  {/* Right Barcode Stub (30%) */}
                  <div className="w-full md:w-[28%] bg-[#1A1C24] p-6 flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-white/5 gap-3">
                    {/* Mock Barcode */}
                    <div className="w-full bg-white p-3 rounded-lg flex flex-col items-center justify-center gap-1.5 shadow">
                      {/* Barcode lines */}
                      <div className="w-full h-10 bg-zinc-950 flex gap-[2px] items-stretch p-1 rounded overflow-hidden">
                        {[4, 2, 6, 2, 8, 4, 2, 6, 2, 8, 4, 2, 6, 2, 8, 4, 2, 6, 2, 8, 4].map((width, idx) => (
                          <div key={idx} className="bg-white flex-1" style={{ flexGrow: width }} />
                        ))}
                      </div>
                      <span className="font-mono text-[9px] text-zinc-900 tracking-[0.25em] font-bold select-all leading-none mt-1">
                        {ticket.id.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex gap-2 w-full mt-1">
                      <button
                        onClick={handlePrint}
                        className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer transition-all border-none"
                      >
                        <Printer className="size-3.5" />
                        {t('print_ticket')}
                      </button>
                      
                      <Link
                        href={`/my-tickets/${ticket.id}`}
                        className="px-3 py-2 bg-[var(--primary)] text-[#12141A] font-bold rounded-xl text-xs flex items-center justify-center hover:opacity-90 cursor-pointer transition-all"
                        title={t('view_event')}
                      >
                        <ArrowRight className="size-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
