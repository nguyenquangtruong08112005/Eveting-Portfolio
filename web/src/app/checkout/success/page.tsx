'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Ticket, Home, ArrowRight, ShieldCheck, Calendar, MapPin, User } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/hooks/useAuth';
import { EventService } from '@/services/event.service';
import { formatPrice, formatDate, enrichEvent } from '@/lib/constants';
import { useTranslations } from 'next-intl';

function CheckoutSuccessPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const t = useTranslations('checkout');

  const eventId = searchParams?.get('eventId') || '';
  const ticketId = searchParams?.get('ticketId') || '';
  const amount = searchParams?.get('amount') || '0';
  const method = searchParams?.get('method') || 'zalopay';

  const [event, setEvent] = useState<any>(null);

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
  }, [eventId, router]);

  return (
    <div className="flex-1 flex flex-col bg-[var(--background)] min-h-screen">
      <Navbar />

      <main className="max-w-xl mx-auto px-6 py-12 w-full flex-grow flex flex-col justify-center">
        <div className="glass-card rounded-2xl p-8 bg-[#1E212B] border border-white/5 text-center space-y-6 shadow-2xl relative overflow-hidden">
          {/* Decorative gradients */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-[var(--primary)]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[var(--primary-dark)]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Icon */}
          <div className="mx-auto size-16 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/20 flex items-center justify-center text-[var(--primary)] animate-bounce">
            <CheckCircle2 className="size-10" />
          </div>

          {/* Message */}
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">{t('payment_success')}</h1>
            <p className="text-zinc-400 text-xs mt-1.5 leading-relaxed">
              {t('success_message')}
            </p>
            {!token && (
              <p className="text-[var(--primary)] text-[11px] font-bold mt-2">
                {t('email_sent')}
              </p>
            )}
          </div>

          {/* Receipt Info */}
          <div className="p-4 bg-[var(--background)] rounded-xl border border-white/5 text-left space-y-3">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-white/5 pb-2">{t('booking_receipt')}</h3>
            
            {event ? (
              <div className="space-y-1.5">
                <h4 className="text-sm font-bold text-white leading-tight">{event.name}</h4>
                <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] mt-1">
                  <Calendar className="size-3 text-[var(--primary)]" />
                  <span>{formatDate(event.date)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] mt-0.5">
                  <MapPin className="size-3 text-[var(--primary)]" />
                  <span className="truncate max-w-[300px]">{event.venueName}</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-zinc-500 italic">
                {t('syncing_details')}
              </div>
            )}

            <div className="border-t border-white/5 pt-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">{t('ticket_id')}</span>
                <span className="font-mono font-bold text-white select-all">{ticketId || t('no_info')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">{t('payment_method')}</span>
                <span className="text-white font-medium">{paymentMethods[method] || t('zalopay')}</span>
              </div>
              <div className="flex justify-between border-t border-white/5 pt-2">
                <span className="text-zinc-500 font-bold">{t('total_payment')}</span>
                <span className="text-[var(--primary)] font-black">
                  {amount ? formatPrice(parseInt(amount, 10)) : t('contact')}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2.5 pt-2">
            {token ? (
              <Link
                href="/my-tickets"
                className="w-full py-3 rounded-xl btn-primary-gradient font-black text-sm tracking-wide text-[#12141A] hover:scale-[1.01] active:scale-[0.99] transition-all border-none flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-500/10"
              >
                <Ticket className="size-4" />
                {t('view_my_tickets')}
                <ArrowRight className="size-4" />
              </Link>
            ) : (
              <Link
                href="/register"
                className="w-full py-3 rounded-xl btn-primary-gradient font-black text-sm tracking-wide text-[#12141A] hover:scale-[1.01] active:scale-[0.99] transition-all border-none flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-500/10"
              >
                <User className="size-4" />
                Đăng ký tài khoản để quản lý vé
                <ArrowRight className="size-4" />
              </Link>
            )}

            <Link
              href="/"
              className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer border-none"
            >
              <Home className="size-4" />
              {t('back_home')}
            </Link>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-zinc-500 text-[10px] pt-1">
            <ShieldCheck className="size-3.5 text-[var(--primary)]" />
            <span>{t('security_note')}</span>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="bg-[#12141A] min-h-screen text-zinc-400 flex flex-col items-center justify-center gap-3">
        <div className="size-8 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
        <span className="text-xs font-bold tracking-wider uppercase text-zinc-500">Đang hiển thị hóa đơn...</span>
      </div>
    }>
      <CheckoutSuccessPageContent />
    </Suspense>
  );
}
