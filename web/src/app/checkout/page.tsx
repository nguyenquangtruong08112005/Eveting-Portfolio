'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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

interface TicketQuantities {
  [key: string]: number;
}

function CheckoutPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const eventId = searchParams?.get('eventId') || '';
  const seatsParam = searchParams?.get('seats') || '';
  const ticketsParam = searchParams?.get('tickets') || '';
  const seatPriceParam = searchParams?.get('price') || '150000';

  const [event, setEvent] = useState<any>(null);
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

  const handleApplyVoucher = () => {
    setVoucherError('');
    setVoucherSuccess('');
    if (!voucherCode.trim()) {
      setVoucherError('Vui lòng nhập mã giảm giá.');
      return;
    }

    const code = voucherCode.toUpperCase().trim();
    if (code === 'EVENTING20') {
      const amt = Math.round(subtotal * 0.2);
      setDiscount(amt);
      setVoucherSuccess('Đã áp dụng voucher giảm giá 20% thành công!');
    } else if (code === 'WELCOME10') {
      const amt = Math.min(50000, Math.round(subtotal * 0.1));
      setDiscount(amt);
      setVoucherSuccess('Đã áp dụng voucher chào mừng 10% (tối đa 50k) thành công!');
    } else {
      setVoucherError('Mã giảm giá không hợp lệ hoặc đã hết hạn.');
      setDiscount(0);
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name || !email || !phone) {
      setErrorMsg('Vui lòng điền đầy đủ thông tin cá nhân.');
      return;
    }

    setProcessing(true);
    setErrorMsg('');

    try {
      let bookingResult: any = null;
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
        throw new Error('Không nhận được mã vé từ hệ thống đặt chỗ.');
      }
      const ticketId = ticket.id;

      // 2. Process payments depending on chosen method
      if (paymentMethod === 'zalopay') {
        const redirectUrl = `${window.location.origin}/checkout/success?eventId=${eventId}&ticketId=${ticketId}`;
        const payment = await TicketService.createPaymentOrder(ticketId, redirectUrl);
        if (payment.order_url) {
          window.location.href = payment.order_url;
        } else {
          throw new Error('Hệ thống thanh toán không trả về liên kết giao dịch.');
        }
      } else {
        throw new Error('Phương thức thanh toán bằng Thẻ quốc tế/ATM chưa được cấu hình. Vui lòng thanh toán qua ZaloPay.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Có lỗi xảy ra khi tạo giao dịch. Vui lòng thử lại.');
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center bg-[var(--background)] min-h-[400px]">
        <div className="size-8 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin mb-3" />
        <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Đang tải hóa đơn đặt vé...</span>
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
            <h2 className="text-zinc-200 text-lg font-bold">Không tìm thấy thông tin sự kiện</h2>
            <p className="text-zinc-500 text-sm mt-1 mb-6">
              Sự kiện bạn yêu cầu thanh toán không tồn tại hoặc đã bị hủy.
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-2.5 rounded-xl btn-primary-gradient text-xs font-bold text-[#12141A] border-none"
            >
              Quay lại trang chủ
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
          Quay lại trang chi tiết sự kiện
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
        <span className="text-xs font-bold tracking-wider uppercase text-zinc-500">Đang chuẩn bị cổng thanh toán...</span>
      </div>
    }>
      <CheckoutPageContent />
    </Suspense>
  );
}
