'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Ticket, Home, ArrowRight, ShieldCheck, Calendar, MapPin, User } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/hooks/useAuth';
import { EventService } from '@/services/event.service';
import { formatPrice, formatDate, enrichEvent } from '@/lib/constants';

function CheckoutSuccessPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuth();

  const eventId = searchParams?.get('eventId') || '';
  const ticketId = searchParams?.get('ticketId') || '';
  const amount = searchParams?.get('amount') || '0';
  const method = searchParams?.get('method') || 'zalopay';

  const [event, setEvent] = useState<any>(null);

  const paymentMethods: Record<string, string> = {
    zalopay: 'Ví điện tử ZaloPay',
    card: 'Thẻ tín dụng quốc tế',
    atm: 'Thẻ ATM nội địa',
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
            <h1 className="text-2xl font-black text-white tracking-tight">Thanh Toán Thành Công!</h1>
            <p className="text-zinc-400 text-xs mt-1.5 leading-relaxed">
              Cảm ơn bạn đã lựa chọn dịch vụ của chúng tôi. Giao dịch của bạn đã được xác nhận và vé điện tử đã sẵn sàng.
            </p>
            {!token && (
              <p className="text-[var(--primary)] text-[11px] font-bold mt-2">
                Thông tin vé đã được gửi đến email đăng ký mua vé của bạn.
              </p>
            )}
          </div>

          {/* Receipt Info */}
          <div className="p-4 bg-[var(--background)] rounded-xl border border-white/5 text-left space-y-3">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-white/5 pb-2">Hóa đơn đặt vé</h3>
            
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
                Chi tiết sự kiện đang được đồng bộ...
              </div>
            )}

            <div className="border-t border-white/5 pt-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Mã vé (Ticket ID)</span>
                <span className="font-mono font-bold text-white select-all">{ticketId || 'Chưa có thông tin'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Phương thức thanh toán</span>
                <span className="text-white font-medium">{paymentMethods[method] || 'Ví điện tử ZaloPay'}</span>
              </div>
              <div className="flex justify-between border-t border-white/5 pt-2">
                <span className="text-zinc-500 font-bold">Tổng thanh toán</span>
                <span className="text-[var(--primary)] font-black">
                  {amount ? formatPrice(parseInt(amount, 10)) : 'Liên hệ'}
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
                Xem vé của tôi
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
              Về trang chủ
            </Link>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-zinc-500 text-[10px] pt-1">
            <ShieldCheck className="size-3.5 text-[var(--primary)]" />
            <span>Thanh toán bảo mật bởi Eventing SSL 256-bit</span>
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
