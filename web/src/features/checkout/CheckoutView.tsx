'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { EventService, TicketService, createCheckoutOrder, createOrderPayment, quoteCheckoutVoucher, saveCheckoutAttendees, validateCheckoutQuestions } from '@/features/checkout/api';
import { enrichEvent } from '@/lib/constants';
import { navigateToSafeExternalUrl } from '@/lib/safe-redirect';
import { BillingForm } from '@/components/checkout/BillingForm';
import { PaymentMethods } from '@/components/checkout/PaymentMethods';
import { OrderSummary } from '@/components/checkout/OrderSummary';
import { CheckoutQuestions, type CheckoutAnswers } from '@/components/checkout/CheckoutQuestions';
import type { TicketQuantities } from '@/types';

function CheckoutPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('checkout');

  const eventId = searchParams?.get('eventId') || '';
  const seatsParam = searchParams?.get('seats') || '';
  const seatLabelsParam = searchParams?.get('seatLabels') || '';
  const ticketsParam = searchParams?.get('tickets') || '';
  const seatPriceParam = searchParams?.get('price') || '150000';
  const performanceId = searchParams?.get('performanceId') || eventId;
  const holdToken = searchParams?.get('holdToken') || '';
  const holdExpiresAt = searchParams?.get('holdExpiresAt') || '';

  const [event, setEvent] = useState<import('@/types').Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'zalopay' | 'card' | 'atm'>('zalopay');
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucherCode, setAppliedVoucherCode] = useState<string | null>(null);
  const [discount, setDiscount] = useState(0);
  const [quotedTotal, setQuotedTotal] = useState<number | null>(null);
  const [voucherError, setVoucherError] = useState('');
  const [voucherSuccess, setVoucherSuccess] = useState('');
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [holdRemaining, setHoldRemaining] = useState<number | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [answers, setAnswers] = useState<CheckoutAnswers>({});
  const [invalidQuestionId, setInvalidQuestionId] = useState<string | null>(null);

  // Autofill billing from last login / profile cache
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const cachedName = localStorage.getItem('userName') || '';
    const cachedEmail = localStorage.getItem('userEmail') || '';
    if (cachedName) setName((prev) => prev || cachedName);
    if (cachedEmail) setEmail((prev) => prev || cachedEmail);
  }, []);

  const selectedSeats = seatsParam ? seatsParam.split(',').filter(Boolean) : [];
  const selectedSeatLabels = seatLabelsParam
    ? seatLabelsParam.split(',').filter(Boolean)
    : selectedSeats;
  const seatPrice = event?.ticketTypes?.standard?.price
    ? Number(event.ticketTypes.standard.price)
    : parseInt(seatPriceParam, 10);

  let selectedTickets: { name: string; qty: number; price: number }[] = [];
  if (ticketsParam) {
    try {
      const parsed: TicketQuantities = JSON.parse(decodeURIComponent(ticketsParam));
      selectedTickets = Object.entries(parsed)
        .filter(([, qty]) => qty > 0)
        .map(([typeName, qty]) => {
          const matchedType =
            event?.ticketTypes?.[typeName] || event?.ticketTypes?.[typeName.toLowerCase()];
          const price = matchedType
            ? Number(matchedType.price)
            : typeName.toLowerCase().includes('vip')
              ? 300000
              : 150000;
          return { name: typeName, qty, price };
        });
    } catch {
      /* ignore parse */
    }
  }

  const subtotal =
    selectedSeats.length > 0
      ? selectedSeats.length * seatPrice
      : selectedTickets.reduce((sum, row) => sum + row.qty * row.price, 0);

  const total = quotedTotal ?? Math.max(0, subtotal - discount);
  const isSeatCheckout = selectedSeats.length > 0;
  const seatHoldExpired =
    isSeatCheckout &&
    (!holdToken ||
      !holdExpiresAt ||
      holdRemaining === null ||
      holdRemaining === 0 ||
      Number.isNaN(Date.parse(holdExpiresAt)));

  useEffect(() => {
    if (!isSeatCheckout || !holdExpiresAt || Number.isNaN(Date.parse(holdExpiresAt))) {
      setHoldRemaining(null);
      return;
    }
    const update = () =>
      setHoldRemaining(Math.max(0, Math.ceil((Date.parse(holdExpiresAt) - Date.now()) / 1000)));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [holdExpiresAt, isSeatCheckout]);

  useEffect(() => {
    if (!eventId) {
      router.push('/');
      return;
    }

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
      const quote = await quoteCheckoutVoucher(voucherCode.trim(), eventId, subtotal, selectedSeats.length || selectedTickets.reduce((sum, item) => sum + item.qty, 0));
      setDiscount(quote.discountAmount);
      setQuotedTotal(quote.totalAmount);
      setAppliedVoucherCode(voucherCode.trim().toUpperCase());
      setVoucherSuccess(quote.message || t('voucher_applied'));
    } catch {
      setVoucherError(t('voucher_invalid'));
      setDiscount(0);
      setQuotedTotal(null);
      setAppliedVoucherCode(null);
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name || !email || !phone) {
      setErrorMsg(t('fill_info'));
      return;
    }
    if (seatHoldExpired) {
      setErrorMsg(t('seat_hold_expired'));
      return;
    }
    const questionError = validateCheckoutQuestions(event?.customQuestions || [], answers);
    if (questionError) {
      setInvalidQuestionId(questionError);
      setErrorMsg(t('question_required'));
      return;
    }

    setProcessing(true);
    setErrorMsg('');

    try {
      const attendees = [{ name, email, answers }];
      const activePromo = appliedVoucherCode || undefined;
      const order = await createCheckoutOrder({
        eventId,
        items: selectedSeats.length > 0 ? [{ ticketType: 'standard', quantity: selectedSeats.length }] : selectedTickets.map((row) => ({ ticketType: row.name, quantity: row.qty })),
        promoCode: activePromo,
        attendees,
        seatHold: selectedSeats.length > 0 ? { performanceId, holdToken, seatIds: selectedSeats } : undefined,
      });
      if (order.orderId) await saveCheckoutAttendees(eventId, order.orderId, attendees);
      if (order.ticketIds.length === 0 && !order.paymentUrl) {
        throw new Error(t('no_ticket'));
      }

      if (paymentMethod === 'zalopay') {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
        const confirmation = new URL(`${baseUrl}/checkout/success`);
        confirmation.searchParams.set('eventId', eventId);
        if (order.orderId) confirmation.searchParams.set('orderId', order.orderId);
        confirmation.searchParams.set('ticketIds', order.ticketIds.join(','));
        if (order.buyerMessage) confirmation.searchParams.set('buyerMessage', order.buyerMessage);
        const paymentUrl = order.paymentUrl || (order.orderId
          ? (await createOrderPayment(order.orderId, confirmation.toString())).order_url
          : (await TicketService.createPaymentOrder(order.ticketIds[0], confirmation.toString())).order_url);
        if (!paymentUrl) {
          throw new Error(t('no_payment_url'));
        }
        navigateToSafeExternalUrl(paymentUrl);
      } else {
        throw new Error(t('payment_not_configured'));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMsg(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          message ||
          t('error_generic')
      );
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center bg-[var(--background)] min-h-[400px]">
        <div className="size-8 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin mb-3" />
        <span className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-wider">
          {t('loading')}
        </span>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex-1 flex flex-col bg-[var(--background)] min-h-screen">
        <Navbar />
        <div className="flex-grow flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md rounded-2xl p-8 border border-[var(--surface-border)] bg-[var(--surface)]">
            <AlertCircle className="size-12 text-[var(--error)] mx-auto mb-4" />
            <h2 className="text-[var(--text-primary)] text-lg font-bold">{t('event_not_found')}</h2>
            <p className="text-[var(--text-muted)] text-sm mt-1 mb-6">{t('event_not_found_desc')}</p>
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

      <div className="max-w-6xl mx-auto px-6 mt-6 w-full">
        <Link
          href={`/attendee/events/${eventId}`}
          className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          {t('back_to_event')}
        </Link>
      </div>

      <form
        onSubmit={handlePayment}
        className="max-w-6xl mx-auto px-6 py-6 w-full flex-grow grid grid-cols-1 lg:grid-cols-12 gap-8"
      >
        <section className="lg:col-span-7 space-y-6">
          {errorMsg && (
            <div className="p-4 bg-[var(--error)]/10 border border-[var(--error)]/30 rounded-2xl flex items-start gap-2.5 text-[var(--error)] text-sm">
              <AlertCircle className="size-5 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
          {isSeatCheckout && holdRemaining !== null && holdRemaining > 0 ? (
            <div className="flex items-center justify-between rounded-md border border-[var(--primary)]/30 bg-[var(--primary)]/10 px-4 py-3 text-xs font-semibold text-[var(--text-secondary)]">
              <span>{t('seat_hold_expires')}</span>
              <span className="font-mono text-sm font-bold tabular-nums text-[var(--primary)]">
                {Math.floor(holdRemaining / 60)}:{String(holdRemaining % 60).padStart(2, '0')}
              </span>
            </div>
          ) : null}
          {isSeatCheckout && holdRemaining === 0 ? (
            <div className="rounded-md border border-[var(--error)]/30 bg-[var(--error)]/10 px-4 py-3 text-xs font-semibold text-[var(--error)]">
              {t('seat_hold_expired')}
            </div>
          ) : null}

          <BillingForm
            name={name}
            setName={setName}
            email={email}
            setEmail={setEmail}
            phone={phone}
            setPhone={setPhone}
          />
          <CheckoutQuestions
            questions={event.customQuestions || []}
            answers={answers}
            invalidQuestionId={invalidQuestionId}
            onChange={(questionId, answer) => {
              setAnswers((current) => ({ ...current, [questionId]: answer }));
              setInvalidQuestionId((current) => current === questionId ? null : current);
            }}
          />

          <PaymentMethods paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod} />
        </section>

        <section className="lg:col-span-5">
          <OrderSummary
            event={event}
            selectedSeats={selectedSeatLabels}
            selectedTickets={selectedTickets}
            subtotal={subtotal}
            discount={discount}
            total={total}
            voucherCode={voucherCode}
            setVoucherCode={(nextCode) => {
              setVoucherCode(nextCode);
              if (nextCode.trim().toUpperCase() !== appliedVoucherCode) {
                setAppliedVoucherCode(null);
                setVoucherSuccess('');
                setDiscount(0);
                setQuotedTotal(null);
              }
            }}
            voucherError={voucherError}
            voucherSuccess={voucherSuccess}
            onApplyVoucher={handleApplyVoucher}
            processing={processing}
            paymentDisabled={seatHoldExpired}
            seatPrice={seatPrice}
          />
        </section>
      </form>

      <Footer />
    </div>
  );
}

export function CheckoutView() {
  return (
    <Suspense
      fallback={
        <div className="bg-[var(--background)] min-h-screen text-[var(--text-secondary)] flex flex-col items-center justify-center gap-3">
          <div className="size-8 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
          <span className="text-xs font-bold tracking-wider uppercase text-[var(--text-muted)]">
            Preparing payment gateway...
          </span>
        </div>
      }
    >
      <CheckoutPageContent />
    </Suspense>
  );
}
