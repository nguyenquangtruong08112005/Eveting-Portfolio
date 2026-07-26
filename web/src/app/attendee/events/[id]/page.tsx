'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/i18n/routing';
import Link from 'next/link';
import {
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { TicketTypePicker, TicketType } from '@/components/booking/TicketTypePicker';
import { SeatGrid } from '@/components/seating/SeatGrid';
import { TicketService } from '@/services/ticket.service';
import { Seat, BackendSeat } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { EventService } from '@/services/event.service';
import { enrichEvent, formatPrice, HOLD_TIMER_SECONDS } from '@/lib/constants';
import { EventHeader } from '@/components/events/EventHeader';
import { EventInfoContent } from '@/components/events/EventInfoContent';
import { ReviewsSection } from '@/components/events/ReviewsSection';
import { MediaGallery } from '@/components/events/MediaGallery';
import { WeatherWidget } from '@/components/events/WeatherWidget';
import { OrganizerCard } from '@/components/events/OrganizerCard';
import { EventRecommendStrip } from '@/components/events/EventRecommendStrip';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTranslations } from 'next-intl';
import { reviewUnavailableReason } from '@/lib/event-review';

export default function EventDetailPage() {
  const t = useTranslations('event_detail');
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const { isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<import('@/types').Event | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Seat booking states
  const [seats, setSeats] = useState<Seat[]>([]);
  const [holdTimer, setHoldTimer] = useState<number | null>(null);
  // Default fallback price per seat (used when ticketTypes not available)
  const seatPrice = 150000;

  const isSeatingEvent = event && ['sân khấu', 'concert', 'nhạc sống', 'music', 'theater'].some(
    cat => event.name?.toLowerCase().includes(cat) || event.category?.some((c: string) => c.toLowerCase().includes(cat))
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize Seats for Seating Event
  useEffect(() => {
    if (event && isSeatingEvent) {
      TicketService.getEventSeats(eventId)
        .then((data) => {
          if (data && data.length > 0) {
            const mappedSeats: Seat[] = data.map((s: BackendSeat) => ({
              id: s.id,
              rowName: s.rowName,
              number: s.seatNumber,
              status: (s.status === 'held' ? 'held_by_others' : (s.status === 'sold' ? 'blocked' : s.status)) as Seat['status'],
              sectionName: s.sectionName || 'Standard Section'
            }));
            setSeats(mappedSeats);
            } else {
              setSeats([]);
              setErrorMessage(t('seat_load_error'));
            }
          })
          .catch(() => {
            setSeats([]);
            setErrorMessage(t('seat_connect_error'));
          });
    }
  }, [event, isSeatingEvent, eventId]);

  // Seat hold countdown
  useEffect(() => {
    if (holdTimer === null) return;
    if (holdTimer === 0) {
      setSeats((prev) =>
        prev.map((s) => (s.status === 'held_by_you' ? { ...s, status: 'available' } : s))
      );
      setHoldTimer(null);
      setErrorMessage(t('hold_expired'));
      return;
    }
    const interval = setInterval(() => {
      setHoldTimer((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(interval);
  }, [holdTimer]);

  // Load event
  useEffect(() => {
    const loadEvent = async () => {
      try {
        const data = await EventService.getById(eventId);
        const enriched = enrichEvent(data);
        setEvent(enriched);

        // Parse ticketTypes from API response
        if (data.ticketTypes && typeof data.ticketTypes === 'object') {
          const types: TicketType[] = Object.entries(data.ticketTypes).map(
            ([key, val]: [string, any]) => ({
              key,
              name: key,
              price: val.price ?? 0,
              available: val.available !== undefined ? val.available : (val.quantity !== undefined ? val.quantity : 999),
            })
          );
          setTicketTypes(types);
        }
      } catch {
        setEvent(null);
      } finally {
        setLoading(false);
      }
    };

    loadEvent();
  }, [eventId]);

  const handleQuantityChange = (key: string, qty: number) => {
    setQuantities((prev) => ({ ...prev, [key]: qty }));
  };

  const handleSeatClick = async (clickedSeat: Seat) => {
    setErrorMessage(null);
    if (clickedSeat.status === 'available') {
      try {
        await TicketService.holdSeat(eventId, clickedSeat.id);
        setSeats((prevSeats) =>
          prevSeats.map((s) => (s.id === clickedSeat.id ? { ...s, status: 'held_by_you' as const } : s))
        );
        if (holdTimer === null) {
          setHoldTimer(HOLD_TIMER_SECONDS);
        }
      } catch (error: any) {
        setErrorMessage(error?.response?.data?.message || error?.message || t('hold_seat_error'));
      }
    } else if (clickedSeat.status === 'held_by_you') {
      try {
        await TicketService.releaseSeat(eventId, clickedSeat.id);
        setSeats((prevSeats) => {
          const nextSeats = prevSeats.map((s) => (s.id === clickedSeat.id ? { ...s, status: 'available' as const } : s));
          const remainingSelected = nextSeats.some(ps => ps.status === 'held_by_you');
          if (!remainingSelected) {
            setHoldTimer(null);
          }
          return nextSeats;
        });
      } catch (error: any) {
        setErrorMessage(error?.response?.data?.message || error?.message || t('release_seat_error'));
      }
    }
  };

  const selectedSeats = seats.filter((s) => s.status === 'held_by_you');
  const totalSeatPrice = selectedSeats.length * seatPrice;

  const handleCheckout = () => {
    if (isSeatingEvent) {
      if (selectedSeats.length === 0) {
        setErrorMessage(t('select_seat_error'));
        return;
      }
      router.push(
        `/checkout?eventId=${eventId}&seats=${encodeURIComponent(
          selectedSeats.map((s) => s.id).join(',')
        )}&price=${seatPrice}`
      );
    } else {
      const totalItems = Object.values(quantities).reduce((s, q) => s + q, 0);
      if (totalItems === 0) {
        setErrorMessage(t('select_ticket_error'));
        return;
      }
      router.push(
        `/checkout?eventId=${eventId}&tickets=${encodeURIComponent(
          JSON.stringify(quantities)
        )}`
      );
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col bg-[var(--background)] min-h-screen">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-[var(--text-muted)] text-sm">{t('loading')}</div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex-1 flex flex-col bg-[var(--background)] min-h-screen">
        <Navbar />
        <div className="flex-grow flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md glass-card rounded-2xl p-8 border border-[var(--surface-border)] bg-[var(--surface)]">
            <AlertCircle className="size-12 text-[var(--error)] mx-auto mb-4" />
            <h2 className="text-[var(--text-primary)] text-lg font-bold">{t('not_found')}</h2>
            <p className="text-[var(--text-muted)] text-sm mt-1 mb-6">
              {t('not_found_desc')}
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-2.5 rounded-xl btn-primary-gradient text-xs font-bold text-[var(--on-primary)] border-none"
            >
              {t('back_home')}
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[var(--background)] min-h-screen">
      <Navbar />

      {/* Banner Image */}
      <EventHeader event={event} />

      {/* Back nav */}
      <div className="max-w-7xl mx-auto px-6 mt-4 w-full">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          {t('back_home')}
        </Link>
      </div>

      {/* Main content: 7:5 layout */}
      <main className="max-w-7xl mx-auto px-6 py-6 w-full flex-grow grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Event info (7/12) */}
        <div className="lg:col-span-7 space-y-5 min-w-0 max-w-full">
          <EventInfoContent event={event} mounted={mounted} />
          <OrganizerCard organizerId={event.organizerId} />
        </div>

        {/* Right: Ticket Picker (5/12) ── sticky */}
        <section className="lg:col-span-5">
          <div className="lg:sticky lg:top-24 space-y-4">
            {/* Error message */}
            {errorMessage && (
              <div className="p-3 bg-[var(--error)]/10 border border-[var(--error)]/30 rounded-xl flex items-start gap-2 text-[var(--error)] text-xs">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Ticket type picker or SeatGrid */}
            {isSeatingEvent ? (
              <div className="space-y-4">
                <SeatGrid
                  seats={seats}
                  onSeatClick={handleSeatClick}
                  holdTimer={holdTimer}
                />
                
                {/* Booking details panel */}
                <div className="glass-card rounded-xl p-5 bg-[var(--surface)] border border-[var(--surface-border)]">
                  <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">{t('booking_info')}</h3>
                  {selectedSeats.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                        <span>{t('selected_seats', { count: selectedSeats.length })}</span>
                        <span className="font-bold text-[var(--primary)]">
                          {selectedSeats.map(s => `${s.rowName}${s.number}`).join(', ')}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                        <span>{t('unit_price')}</span>
                        <span>{formatPrice(seatPrice)} {t('per_seat')}</span>
                      </div>
                      <div className="border-t border-[var(--surface-border)] pt-3 flex justify-between text-sm font-bold text-[var(--text-primary)]">
                        <span>{t('total')}</span>
                        <span className="text-[var(--primary)]">{formatPrice(totalSeatPrice)}</span>
                      </div>
                      
                      <button
                        onClick={handleCheckout}
                        className="w-full py-2.5 rounded-xl btn-primary-gradient text-sm tracking-wide flex items-center justify-center gap-2 cursor-pointer btn-tactile text-[var(--on-primary)] border-none font-bold mt-4"
                      >
                        {t('continue_payment')}
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--text-muted)] italic">{t('select_seats_hint')}</p>
                  )}
                </div>
              </div>
            ) : (
              <TicketTypePicker
                ticketTypes={ticketTypes}
                quantities={quantities}
                onQuantityChange={handleQuantityChange}
                onCheckout={handleCheckout}
                disabled={false}
              />
            )}

            {/* Login prompt if not authenticated */}
            {!isAuthenticated && (
              <div className="glass-card rounded-xl p-4 text-center bg-[var(--surface)]/80 border border-[var(--surface-border)]">
                <p className="text-xs text-[var(--text-secondary)] mb-2">
                  {t('guest_hint')}
                </p>
                <Link
                  href="/login"
                  className="text-xs text-[var(--primary)] font-bold hover:underline"
                >
                  {t('login_hint')}
                </Link>
              </div>
            )}

            <WeatherWidget eventId={eventId} />
          </div>
        </section>
      </main>

      {/* Reviews + Photos tabs */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-12 w-full">
        <Tabs defaultValue="photos">
          <TabsList className="bg-[var(--surface)] border border-[var(--surface-border)] p-1 h-auto">
            <TabsTrigger
              value="photos"
              className="data-[selected]:bg-[var(--primary)] data-[selected]:text-[var(--on-primary)] rounded-lg text-xs font-bold px-4 py-2"
            >
              {t('tab_photos')}
            </TabsTrigger>
            <TabsTrigger
              value="reviews"
              className="data-[selected]:bg-[var(--primary)] data-[selected]:text-[var(--on-primary)] rounded-lg text-xs font-bold px-4 py-2"
            >
              {t('tab_reviews')}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="photos" className="mt-6">
            <MediaGallery eventId={eventId} />
          </TabsContent>
          <TabsContent value="reviews" className="mt-6">
            {(() => {
              const reason = reviewUnavailableReason(event);
              return (
                <ReviewsSection
                  eventId={eventId}
                  canWrite={reason === 'ok'}
                  lockedReason={reason === 'ok' ? null : reason}
                />
              );
            })()}
          </TabsContent>
        </Tabs>
      </section>

      <EventRecommendStrip eventId={eventId} category={event.category} />

      <Footer />
    </div>
  );
}
