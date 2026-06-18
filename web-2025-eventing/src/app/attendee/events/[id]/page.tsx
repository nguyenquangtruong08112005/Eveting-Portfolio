'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { SeatGrid } from '@/components/seating/SeatGrid';
import { BookingDetails } from '@/components/seating/BookingDetails';
import { useAuth } from '@/hooks/useAuth';
import { eventsApi, ticketsApi } from '@/lib/api';
import { HOLD_TIMER_SECONDS } from '@/lib/constants';

interface Seat {
  id: string;
  rowName: string;
  number: number;
  status: 'available' | 'held_by_you' | 'held_by_others' | 'blocked';
  sectionName: string;
}

function generateMockSeats(): Seat[] {
  const seats: Seat[] = [];
  const rows = ['A', 'B', 'C', 'D', 'E', 'F'];
  const cols = 10;
  rows.forEach((row) => {
    for (let col = 1; col <= cols; col++) {
      seats.push({
        id: `seat_${row}_${col}`,
        rowName: row,
        number: col,
        status: Math.random() < 0.15 ? 'blocked' : 'available',
        sectionName: row === 'E' || row === 'F' ? 'VIP' : 'Standard',
      });
    }
  });
  return seats;
}

export default function EventBookingPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const { token, role, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<any>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [holdTimer, setHoldTimer] = useState<number | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);

  // Load event + seats + socket
  useEffect(() => {
    const loadEvent = async () => {
      try {
        const data = await eventsApi.getById(eventId);
        setEvent(data);
      } catch {
        setEvent({
          id: eventId,
          name: 'Neo-Tokyo Symphony 2026',
          description:
            'Trải nghiệm hòa nhạc cyberpunk đắm chìm — kết hợp nhạc cụ cổ điển với synthwave tương lai.',
          date: Date.now() + 86400000 * 5,
          location: { address: '79 Nguyễn Huệ, Quận 1' },
          city: 'TP. Hồ Chí Minh',
          venueName: 'Rex Premium Theatre',
          minPrice: 150000,
        });
      } finally {
        setLoading(false);
      }
    };

    loadEvent();
    setSeats(generateMockSeats());

    // Socket.IO connection
    const currentToken = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';
    const socket = io('http://localhost:3000', {
      auth: { token: currentToken },
      autoConnect: false,
    });
    socketRef.current = socket;
    socket.connect();

    socket.on('connect', () => socket.emit('join_event', eventId));

    socket.on('seat:held', (data: { seatId: string }) => {
      setSeats((prev) =>
        prev.map((s) =>
          s.id === data.seatId
            ? { ...s, status: s.status === 'held_by_you' ? 'held_by_you' : 'held_by_others' }
            : s
        )
      );
    });

    socket.on('seat:released', (data: { seatId: string }) => {
      setSeats((prev) =>
        prev.map((s) =>
          s.id === data.seatId
            ? { ...s, status: s.status === 'held_by_you' ? 'held_by_you' : 'available' }
            : s
        )
      );
    });

    socket.on('seat:sold', (data: { seatIds: string[] }) => {
      setSeats((prev) =>
        prev.map((s) => (data.seatIds.includes(s.id) ? { ...s, status: 'blocked' } : s))
      );
      setSelectedSeats((prev) => prev.filter((id) => !data.seatIds.includes(id)));
    });

    socket.on('connect_error', () => {
      /* Socket offline — continue with simulation */
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave_event', eventId);
        socketRef.current.disconnect();
      }
    };
  }, [eventId]);

  // Hold timer countdown
  useEffect(() => {
    if (holdTimer === null || holdTimer <= 0) return;
    const interval = setInterval(() => {
      setHoldTimer((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(interval);
  }, [holdTimer]);

  // Seat click handler — uses ticketsApi (correct /tickets/* routes)
  const handleSeatClick = async (seat: Seat) => {
    if (seat.status === 'blocked' || seat.status === 'held_by_others') {
      setErrorMessage('Ghế này đã được đặt hoặc đang được giữ bởi người khác.');
      return;
    }

    if (!token) {
      setErrorMessage('Vui lòng đăng nhập để giữ ghế.');
      return;
    }

    setErrorMessage(null);
    setInfoMessage(null);

    const isSelected = selectedSeats.includes(seat.id);

    if (isSelected) {
      try {
        await ticketsApi.releaseSeat(eventId, seat.id, token);
        setSelectedSeats((prev) => prev.filter((id) => id !== seat.id));
        setSeats((prev) => prev.map((s) => (s.id === seat.id ? { ...s, status: 'available' } : s)));
      } catch {
        // Fallback simulation
        setSelectedSeats((prev) => prev.filter((id) => id !== seat.id));
        setSeats((prev) => prev.map((s) => (s.id === seat.id ? { ...s, status: 'available' } : s)));
      }
    } else {
      try {
        await ticketsApi.holdSeat(eventId, seat.id, token);
        setSelectedSeats((prev) => [...prev, seat.id]);
        setSeats((prev) =>
          prev.map((s) => (s.id === seat.id ? { ...s, status: 'held_by_you' } : s))
        );
        setHoldTimer(HOLD_TIMER_SECONDS);
      } catch (err: any) {
        setErrorMessage(err.message || 'Ghế đã được giữ bởi khách hàng khác.');
        // Fallback simulation
        setSelectedSeats((prev) => [...prev, seat.id]);
        setSeats((prev) =>
          prev.map((s) => (s.id === seat.id ? { ...s, status: 'held_by_you' } : s))
        );
        setHoldTimer(HOLD_TIMER_SECONDS);
      }
    }
  };

  // Checkout handler
  const handleCheckout = async () => {
    if (selectedSeats.length === 0) {
      setErrorMessage('Vui lòng chọn ít nhất một ghế.');
      return;
    }

    if (!token) return;
    setLoading(true);

    try {
      await ticketsApi.bookHeldSeats(eventId, selectedSeats, token);
      setInfoMessage('Đặt ghế thành công! Đang chuyển hướng đến thanh toán...');
      setTimeout(() => router.push('/'), 2000);
    } catch {
      setInfoMessage('Đặt ghế thành công (mô phỏng offline)! Đang chuyển hướng...');
      setTimeout(() => router.push('/'), 2000);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !event) {
    return (
      <div className="flex-grow flex items-center justify-center bg-[var(--background)] min-h-screen">
        <div className="text-[var(--text-muted)]">Đang tải sơ đồ ghế ngồi...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[var(--background)] min-h-screen">
      <Navbar userToken={token} userRole={role} onLogout={logout} />

      <main className="max-w-7xl mx-auto px-6 py-10 w-full flex-grow grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Seat Map */}
        <section className="lg:col-span-2">
          <SeatGrid seats={seats} onSeatClick={handleSeatClick} holdTimer={holdTimer} />
        </section>

        {/* Booking Panel */}
        <section className="flex flex-col gap-4">
          {errorMessage && (
            <div className="p-3 bg-[var(--error)]/10 border border-[var(--error)]/30 rounded-xl flex items-start gap-2 text-[var(--error)] text-xs">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {infoMessage && (
            <div className="p-3 bg-[var(--success)]/10 border border-[var(--success)]/30 rounded-xl flex items-start gap-2 text-[var(--success)] text-xs">
              <CheckCircle className="size-4 shrink-0 mt-0.5" />
              <span>{infoMessage}</span>
            </div>
          )}

          <BookingDetails
            eventName={event?.name}
            eventDate={event?.date}
            venueName={event?.venueName}
            address={event?.location?.address}
            city={event?.city}
            selectedSeats={selectedSeats}
            minPrice={event?.minPrice}
            onCheckout={handleCheckout}
            disabled={loading}
          />
        </section>
      </main>

      <Footer />
    </div>
  );
}
