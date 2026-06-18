'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { SeatGrid } from '@/components/seating/SeatGrid';
import { BookingDetails } from '@/components/seating/BookingDetails';

interface Seat {
  id: string;
  rowName: string;
  number: number;
  status: 'available' | 'held_by_you' | 'held_by_others' | 'blocked';
  sectionName: string;
}

export default function EventBookingPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<any>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [holdTimer, setHoldTimer] = useState<number | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    setUserToken(localStorage.getItem('token'));
    setUserRole(localStorage.getItem('role'));

    // 1. Setup mock/real event details
    const loadEvent = async () => {
      try {
        const res = await fetch(`http://localhost:3000/events/${eventId}`);
        if (res.ok) {
          const data = await res.json();
          setEvent(data);
        } else {
          throw new Error();
        }
      } catch (err) {
        // Fallback mock event details
        setEvent({
          id: eventId,
          name: 'Neo-Tokyo Symphony 2026',
          description: 'An immersive cyberpunk orchestral experience blending classical instruments with futuristic synthwave aesthetics.',
          date: Date.now() + 86400000 * 5,
          location: { address: '79 Nguyen Hue, District 1' },
          city: 'Ho Chi Minh City',
          venueName: 'Rex Premium Theatre',
          minPrice: 150000,
          ticketTypes: {
            standard: { price: 150000 },
            vip: { price: 300000 }
          }
        });
      } finally {
        setLoading(false);
      }
    };

    loadEvent();

    // 2. Initialize Seat Grid
    const generateMockSeats = () => {
      const generatedSeats: Seat[] = [];
      const rows = ['A', 'B', 'C', 'D', 'E', 'F'];
      const cols = 10;
      rows.forEach(row => {
        for (let col = 1; col <= cols; col++) {
          generatedSeats.push({
            id: `seat_${row}_${col}`,
            rowName: row,
            number: col,
            status: Math.random() < 0.15 ? 'blocked' : 'available',
            sectionName: row === 'E' || row === 'F' ? 'VIP' : 'Standard'
          });
        }
      });
      setSeats(generatedSeats);
    };
    generateMockSeats();

    // 3. Connect Socket.IO
    const token = localStorage.getItem('token') || '';
    const socket = io('http://localhost:3000', {
      auth: { token },
      autoConnect: false
    });
    socketRef.current = socket;

    socket.connect();

    socket.on('connect', () => {
      console.log('[Socket] Connected to server');
      socket.emit('join_event', eventId);
    });

    socket.on('seat:held', (data: { seatId: string; expiresAt: number }) => {
      setSeats(prev => prev.map(s => 
        s.id === data.seatId 
          ? { ...s, status: s.status === 'held_by_you' ? 'held_by_you' : 'held_by_others' } 
          : s
      ));
    });

    socket.on('seat:released', (data: { seatId: string }) => {
      setSeats(prev => prev.map(s => 
        s.id === data.seatId 
          ? { ...s, status: s.status === 'held_by_you' ? 'held_by_you' : 'available' } 
          : s
      ));
    });

    socket.on('seat:sold', (data: { seatIds: string[] }) => {
      setSeats(prev => prev.map(s => 
        data.seatIds.includes(s.id) 
          ? { ...s, status: 'blocked' } 
          : s
      ));
      // Remove from selected list if sold
      setSelectedSeats(prev => prev.filter(id => !data.seatIds.includes(id)));
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection failed, using simulated socket updates.', err.message);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave_event', eventId);
        socketRef.current.disconnect();
      }
    };
  }, [eventId]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('uid');
    setUserToken(null);
    setUserRole(null);
    router.push('/login');
  };

  // Handle seat clicks
  const handleSeatClick = async (seat: Seat) => {
    if (seat.status === 'blocked' || seat.status === 'held_by_others') {
      setErrorMessage('Seat is already occupied or held by someone else.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setErrorMessage('Please login to reserve seats.');
      return;
    }

    setErrorMessage(null);
    setInfoMessage(null);

    const isCurrentlySelected = selectedSeats.includes(seat.id);

    if (isCurrentlySelected) {
      // Release Hold
      try {
        const res = await fetch('http://localhost:3000/web/tickets/release-seat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ eventId, seatId: seat.id })
        });
        if (res.ok) {
          setSelectedSeats(prev => prev.filter(id => id !== seat.id));
          setSeats(prev => prev.map(s => s.id === seat.id ? { ...s, status: 'available' } : s));
        } else {
          throw new Error('Failed to release hold');
        }
      } catch (err) {
        // Fallback simulation
        setSelectedSeats(prev => prev.filter(id => id !== seat.id));
        setSeats(prev => prev.map(s => s.id === seat.id ? { ...s, status: 'available' } : s));
      }
    } else {
      // Request Hold (NX EX 600)
      try {
        const res = await fetch('http://localhost:3000/web/tickets/hold-seat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ eventId, seatId: seat.id })
        });
        if (res.ok) {
          setSelectedSeats(prev => [...prev, seat.id]);
          setSeats(prev => prev.map(s => s.id === seat.id ? { ...s, status: 'held_by_you' } : s));
          setHoldTimer(600); // 10 minutes
        } else {
          const body = await res.json();
          setErrorMessage(body.message || 'Seat is already held by another customer.');
        }
      } catch (err) {
        // Fallback simulation
        setSelectedSeats(prev => [...prev, seat.id]);
        setSeats(prev => prev.map(s => s.id === seat.id ? { ...s, status: 'held_by_you' } : s));
        setHoldTimer(600);
      }
    }
  };

  // Timer countdown
  useEffect(() => {
    if (holdTimer === null || holdTimer <= 0) return;
    const interval = setInterval(() => {
      setHoldTimer(prev => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(interval);
  }, [holdTimer]);

  const handleCheckout = async () => {
    if (selectedSeats.length === 0) {
      setErrorMessage('Please select at least one seat.');
      return;
    }

    const token = localStorage.getItem('token');
    setLoading(true);
    
    try {
      const res = await fetch('http://localhost:3000/web/tickets/book-held-seats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ eventId, seatIds: selectedSeats })
      });

      if (res.ok) {
        setInfoMessage('Seats booked successfully! Redirecting to payment...');
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } else {
        const data = await res.json();
        setErrorMessage(data.message || 'Failed to book seats.');
      }
    } catch (err) {
      // Simulate successful checkout on offline fallback
      setInfoMessage('Booking successful (Offline simulated)! Redirecting to payment...');
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !event) {
    return (
      <div className="flex-grow flex items-center justify-center bg-[#09090b]">
        <div className="text-zinc-500">Loading seat map...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col relative bg-[#09090b] min-h-screen">
      {/* Navbar Component */}
      <Navbar userToken={userToken} userRole={userRole} onLogout={handleLogout} />

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-6 py-12 w-full flex-grow grid grid-cols-1 lg:grid-cols-3 gap-12 text-left">
        {/* Left Side: Seat Map */}
        <section className="lg:col-span-2">
          <SeatGrid seats={seats} onSeatClick={handleSeatClick} holdTimer={holdTimer} />
        </section>

        {/* Right Side: Booking Panel */}
        <section className="flex flex-col gap-6">
          {errorMessage && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start gap-2 text-red-400 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {infoMessage && (
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-2xl flex items-start gap-2 text-green-400 text-xs">
              <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{infoMessage}</span>
            </div>
          )}

          <BookingDetails
            eventName={event.name}
            eventDate={event.date}
            venueName={event.venueName}
            address={event.location?.address}
            city={event.city}
            selectedSeats={selectedSeats}
            minPrice={event.minPrice}
            onCheckout={handleCheckout}
            disabled={loading}
          />
        </section>
      </main>

      {/* Footer Component */}
      <Footer />
    </div>
  );
}
