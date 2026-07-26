'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Ticket, Home, ArrowRight, ShieldCheck, Calendar, MapPin, User } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/hooks/useAuth';
import { EventService } from '@/services/event.service';
import { TicketService } from '@/services/ticket.service';
import { formatPrice, formatDate, enrichEvent } from '@/lib/constants';
import { useTranslations } from 'next-intl';
import { TicketQr, buildClientTicketQrValue } from '@/components/tickets/TicketQr';

function CheckoutSuccessPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();
  const t = useTranslations('checkout');
  const tTickets = useTranslations('my_tickets');

  const eventId = searchParams?.get('eventId') || '';
  const ticketId = searchParams?.get('ticketId') || '';
  const amount = searchParams?.get('amount') || '0';
  const method = searchParams?.get('method') || 'zalopay';

  const [event, setEvent] = useState<any>(null);
  const [paymentVerified, setPaymentVerified] = useState<boolean | null>(null);
  const [qrPayload, setQrPayload] = useState<string>('');

  const paymentMethods: Record<string, string> = {
    zalopay: t('zalopay'),
    card: t('credit_card'),
    atm: t('atm_card'),
  };

  useEffect(() => {
    if (!eventId) {
      router.push('/');
      return;
    }

    // Load Event details
    EventService.getById(eventId)
      .then((data) => {
        setEvent(enrichEvent(data));
      })
      .catch(() => {
        setEvent(null);
      });

    // Confirm payment with backend (ZaloPay webhook often never hits localhost —
    // success page re-query is the real confirmation path).
    if (ticketId) {
      let cancelled = false;
      const runVerify = async () => {
        // Retry: ZaloPay query can lag right after redirect
        for (let i = 0; i < 4 && !cancelled; i++) {
          try {
            const result = await TicketService.checkPaymentStatus(ticketId);
            if (cancelled) return;
            if (result.status === 'paid') {
              setPaymentVerified(true);
              break;
            }
            if (result.status === 'failed' || result.status === 'cancelled') {
              setPaymentVerified(false);
              break;
            }
            setPaymentVerified(false);
          } catch {
            if (!cancelled) setPaymentVerified(null);
          }
          await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
        }

        try {
          const data: any = await TicketService.getTicketDetails(ticketId);
          if (cancelled) return;
          setQrPayload(
            buildClientTicketQrValue({
              ticketId: data?.id || ticketId,
              eventId: data?.event?.id || data?.eventId || eventId,
              qrCode: data?.qrCode || data?.qr_code,
            })
          );
          if (data?.status === 'paid' || data?.status === 'checkedIn') {
            setPaymentVerified(true);
          }
        } catch {
          if (!cancelled) {
            setQrPayload(buildClientTicketQrValue({ ticketId, eventId }));
          }
        }
      };
      void runVerify();
      return () => {
        cancelled = true;
      };
    }
    setQrPayload('');
  }, [eventId, ticketId, router]);

  return (
    <div className="flex-1 flex flex-col bg-[var(--background)] min-h-screen">
      <Navbar />

      <main className="max-w-xl mx-auto px-6 py-12 w-full flex-grow flex flex-col justify-center">
        <div className="glass-card rounded-2xl p-8 bg-[var(--surface)] border border-[var(--surface-border)] text-center space-y-6 shadow-2xl relative overflow-hidden">
          {/* Decorative gradients */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-[var(--primary)]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[var(--primary-dark)]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Icon */}
          <div className="mx-auto size-16 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/20 flex items-center justify-center text-[var(--primary)] animate-bounce">
            <CheckCircle2 className="size-10" />
          </div>

          {/* Message */}
          <div>
            <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">
              {paymentVerified === false ? t('payment_success') : t('payment_success')}
            </h1>
            <p className="text-[var(--text-secondary)] text-xs mt-1.5 leading-relaxed">
              {paymentVerified === false
                ? 'Payment is still processing. Your ticket will activate when ZaloPay confirms (or use “Check status” on My Tickets).'
                : t('success_message')}
            </p>
            {paymentVerified === true && (
              <p className="text-[var(--success)] text-[11px] font-bold mt-2">{t('payment_verified')}</p>
            )}
            {!isAuthenticated && (
              <p className="text-[var(--primary)] text-[11px] font-bold mt-2">
                {t('email_sent')}
              </p>
            )}
          </div>

          {/* Ticket QR */}
          {qrPayload ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <div className="bg-white p-3 rounded-xl shadow-sm inline-block">
                <TicketQr value={qrPayload} size={160} alt={tTickets('qr_hint')} />
              </div>
              <p className="text-[10px] text-[var(--text-muted)]">{tTickets('qr_hint')}</p>
              {paymentVerified === true && (
                <p className="text-[10px] font-bold text-[var(--success)]">{t('payment_verified')}</p>
              )}
            </div>
          ) : null}

          {/* Receipt Info */}
          <div className="p-4 bg-[var(--background)] rounded-xl border border-[var(--surface-border)] text-left space-y-3">
            <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest border-b border-[var(--surface-border)] pb-2">{t('booking_receipt')}</h3>
            
            {event ? (
              <div className="space-y-1.5">
                <h4 className="text-sm font-bold text-[var(--text-primary)] leading-tight">{event.name}</h4>
                <div className="flex items-center gap-1.5 text-[var(--text-secondary)] text-[10px] mt-1">
                  <Calendar className="size-3 text-[var(--primary)]" />
                  <span>{formatDate(event.date)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[var(--text-secondary)] text-[10px] mt-0.5">
                  <MapPin className="size-3 text-[var(--primary)]" />
                  <span className="truncate max-w-[300px]">{event.venueName}</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-[var(--text-muted)] italic">
                {t('syncing_details')}
              </div>
            )}

            <div className="border-t border-[var(--surface-border)] pt-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">{t('ticket_id')}</span>
                <span className="font-mono font-bold text-[var(--text-primary)] select-all">{ticketId || t('no_info')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">{t('payment_method')}</span>
                <span className="text-[var(--text-primary)] font-medium">{paymentMethods[method] || t('zalopay')}</span>
              </div>
              <div className="flex justify-between border-t border-[var(--surface-border)] pt-2">
                <span className="text-[var(--text-muted)] font-bold">{t('total_payment')}</span>
                <span className="text-[var(--primary)] font-black">
                  {amount ? formatPrice(parseInt(amount, 10)) : t('contact')}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2.5 pt-2">
            {isAuthenticated ? (
              <Link
                href="/my-tickets"
                className="w-full py-3 rounded-xl btn-primary-gradient font-black text-sm tracking-wide text-[var(--on-primary)] hover:scale-[1.01] active:scale-[0.99] transition-all border-none flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-500/10"
              >
                <Ticket className="size-4" />
                {t('view_my_tickets')}
                <ArrowRight className="size-4" />
              </Link>
            ) : (
              <Link
                href="/register"
                className="w-full py-3 rounded-xl btn-primary-gradient font-black text-sm tracking-wide text-[var(--on-primary)] hover:scale-[1.01] active:scale-[0.99] transition-all border-none flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-500/10"
              >
                <User className="size-4" />
                {t('register_to_manage')}
                <ArrowRight className="size-4" />
              </Link>
            )}

            <Link
              href="/"
              className="w-full py-3 rounded-xl bg-[var(--surface-hover)] hover:bg-[var(--muted)] text-[var(--text-primary)] font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer border-none"
            >
              <Home className="size-4" />
              {t('back_home')}
            </Link>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[var(--text-muted)] text-[10px] pt-1">
            <ShieldCheck className="size-3.5 text-[var(--primary)]" />
            <span>{t('security_note')}</span>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function CheckoutSuccessFallback() {
  const t = useTranslations('checkout');
  return (
    <div className="bg-[var(--background)] min-h-screen text-[var(--text-secondary)] flex flex-col items-center justify-center gap-3">
      <div className="size-8 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
      <span className="text-xs font-bold tracking-wider uppercase text-[var(--text-muted)]">{t('loading_receipt')}</span>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<CheckoutSuccessFallback />}>
      <CheckoutSuccessPageContent />
    </Suspense>
  );
}
