'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { EventService } from '@/services/event.service';
import { TicketService } from '@/services/ticket.service';
import { enrichEvent } from '@/lib/constants';
import { BillingForm } from '@/components/checkout/BillingForm';
import { PaymentMethods } from '@/components/checkout/PaymentMethods';
import { OrderSummary } from '@/components/checkout/OrderSummary';
import type { TicketQuantities } from '@/types';

function CheckoutPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('checkout');

  const eventId = searchParams?.get('eventId') || '';
  const seatsParam = searchParams?.get('seats') || '';
  const ticketsParam = searchParams?.get('tickets') || '';
  const seatPriceParam = searchParams?.get('price') || '150000';

  const [event, setEvent] = useState<import('@/types').Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'zalopay' | 'card' | 'atm'>('zalopay');
  const [voucherCode, setVoucherCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [voucherError, setVoucherError] = useState('');
  const [voucherSuccess, setVoucherSuccess] = useState('');
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Billing details
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Ticket or Seat definitions
  const selectedSeats = seatsParam ? seatsParam.split(',') : [];
  const seatPrice = event?.ticketTypes?.standard?.price
    ? Number(event.ticketTypes.standard.price)
    : parseInt(seatPriceParam, 10);
  
  let selectedTickets: { name: string; qty: number; price: number }[] = [];
  if (ticketsParam) {
    try {
      const parsed: TicketQuantities = JSON.parse(decodeURIComponent(ticketsParam));
      selectedTickets = Object.entries(parsed)
        .filter(([, qty]) => qty > 0)
        .map(([name, qty]) => {
          const matchedType = event?.ticketTypes?.[name] || event?.ticketTypes?.[name.toLowerCase()];
          const price = matchedType ? Number(matchedType.price) : (name.toLowerCase().includes('vip') ? 300000 : 150000);
          return { name, qty, price };
        });
    } catch (e) {
      console.error(e);
    }
  }

  // Calculate pricing
  const subtotal = selectedSeats.length > 0 
    ? selectedSeats.length * seatPrice 
    : selectedTickets.reduce((sum, t) => sum + t.qty * t.price, 0);

  const total = Math.max(0, subtotal - discount);

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
      })
      .finally(() => setLoading(false));
  }, [eventId, router]);

  const handleApplyVoucher = async () => {
    setVoucherError('');
    setVoucherSuccess('');
    if (!voucherCode.trim()) {
      setVoucherError(t('voucher_empty'));
      return;
    }

    try {
      const result = await TicketService.validateVoucher(voucherCode, subtotal, eventId);
      if (result.valid) {
        setDiscount(result.discountAmount || 0);
        setVoucherSuccess(result.message);
      } else {
        setVoucherError(result.message);
        setDiscount(0);
      }
    } catch {
      setVoucherError(t('voucher_invalid'));
      setDiscount(0);
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name || !email || !phone) {
      setErrorMsg(t('fill_info'));
      return;
    }

    setProcessing(true);
    setErrorMsg('');

    try {
      let bookingResult: { tickets?: { id: string }[] } | null = null;
      const activePromo = voucherSuccess ? voucherCode.toUpperCase().trim() : undefined;

      // 1. Book tickets inside the DB
      if (selectedSeats.length > 0) {
        bookingResult = await TicketService.bookHeldSeats(eventId, selectedSeats, activePromo);
      } else {
        const items = selectedTickets.map(t => ({ ticketType: t.name, quantity: t.qty }));
        bookingResult = await TicketService.bookTickets(eventId, items, activePromo);
      }

      const ticket = bookingResult?.tickets?.[0];
      if (!ticket || !ticket.id) {
        throw new Error(t('no_ticket'));
      }
      const ticketId = ticket.id;

      // 2. Process payments depending on chosen method
      if (paymentMethod === 'zalopay') {
        const redirectUrl = `${window.location.origin}/checkout/success?eventId=${eventId}&ticketId=${ticketId}`;
        const payment = await TicketService.createPaymentOrder(ticketId, redirectUrl);
        if (payment.order_url) {
          window.location.href = payment.order_url;
        } else {
          throw new Error(t('no_payment_url'));
        }
      } else {
        throw new Error(t('payment_not_configured'));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMsg((err as { response?: { data?: { message?: string } } })?.response?.data?.message || message || t('error_generic'));
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center bg-[var(--background)] min-h-[400px]">
        <div className="size-8 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin mb-3" />
        <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">{t('loading')}</span>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex-1 flex flex-col bg-[var(--background)] min-h-screen">
        <Navbar />
        <div className="flex-grow flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md glass-card rounded-2xl p-8 border border-white/5 bg-[#1E212B]">
            <AlertCircle className="size-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-zinc-200 text-lg font-bold">{t('event_not_found')}</h2>
            <p className="text-zinc-500 text-sm mt-1 mb-6">
              {t('event_not_found_desc')}
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-2.5 rounded-xl btn-primary-gradient text-xs font-bold text-[#12141A] border-none"
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

      {/* Back button */}
      <div className="max-w-6xl mx-auto px-6 mt-6 w-full">
        <Link
          href={`/attendee/events/${eventId}`}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          {t('back_to_event')}
        </Link>
      </div>

      <form onSubmit={handlePayment} className="max-w-6xl mx-auto px-6 py-6 w-full flex-grow grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Billing + Payment (7/12) */}
        <section className="lg:col-span-7 space-y-6">
          {errorMsg && (
            <div className="p-4 bg-[var(--error)]/10 border border-[var(--error)]/30 rounded-2xl flex items-start gap-2.5 text-[var(--error)] text-sm">
              <AlertCircle className="size-5 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Billing Info Form */}
          <BillingForm
            name={name}
            setName={setName}
            email={email}
            setEmail={setEmail}
            phone={phone}
            setPhone={setPhone}
          />

          {/* Payment Methods */}
          <PaymentMethods
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
          />
        </section>

        {/* Right: Order Summary (5/12) */}
        <section className="lg:col-span-5">
          <OrderSummary
            event={event}
            selectedSeats={selectedSeats}
            selectedTickets={selectedTickets}
            subtotal={subtotal}
            discount={discount}
            total={total}
            voucherCode={voucherCode}
            setVoucherCode={setVoucherCode}
            voucherError={voucherError}
            voucherSuccess={voucherSuccess}
            onApplyVoucher={handleApplyVoucher}
            processing={processing}
            seatPrice={seatPrice}
          />
        </section>
      </form>

      <Footer />
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="bg-[#12141A] min-h-screen text-zinc-400 flex flex-col items-center justify-center gap-3">
        <div className="size-8 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
        <span className="text-xs font-bold tracking-wider uppercase text-zinc-500">Preparing payment gateway...</span>
      </div>
    }>
      <CheckoutPageContent />
    </Suspense>
  );
}
