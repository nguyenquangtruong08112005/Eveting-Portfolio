'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { Calendar, MapPin, Sparkles, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';

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

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
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
        const orderData = await res.json();
        setInfoMessage('Seats booked successfully! Redirecting to payment...');
        // Simulate redirect to callback
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 flex flex-col relative bg-[#09090b]">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-white">
            <Sparkles className="h-6 w-6 text-purple-400 glow-text" />
            <span>Aura<span className="text-purple-400">Events</span></span>
          </Link>
          <Link href="/" className="text-xs text-zinc-400 hover:text-white transition-all">
            Back to Home
          </Link>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-6 py-12 w-full flex-grow grid grid-cols-1 lg:grid-cols-3 gap-12 text-left">
        {/* Left Side: Seat Map */}
        <section className="lg:col-span-2 flex flex-col premium-card p-8 rounded-2xl">
          <h2 className="text-2xl font-bold text-white mb-2">Select Seats</h2>
          <p className="text-zinc-400 text-xs mb-8">Click on available seats to hold them for checkout. Holds expire in 10 minutes.</p>

          {holdTimer !== null && holdTimer > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-xl text-purple-300 text-xs font-semibold mb-6">
              <Clock className="h-4 w-4" />
              <span>Hold expires in: {formatTime(holdTimer)}</span>
            </div>
          )}

          {/* Stage Visual */}
          <div className="w-full flex flex-col items-center mb-12">
            <div className="w-[80%] h-4 bg-gradient-to-r from-purple-500 via-cyan-400 to-purple-500 rounded-full blur-[1px] opacity-80" />
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-2">STAGE</span>
          </div>

          {/* Seat Grid */}
          <div className="flex justify-center overflow-x-auto pb-4">
            <div className="grid grid-cols-10 gap-3 min-w-[340px]">
              {seats.map(seat => {
                let statusClass = 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-purple-500 hover:text-white';
                if (seat.status === 'held_by_you') {
                  statusClass = 'border-purple-500 bg-purple-600 text-white shadow-lg shadow-purple-500/35 glow-text';
                } else if (seat.status === 'held_by_others') {
                  statusClass = 'border-orange-500/50 bg-orange-600/40 text-orange-200 cursor-not-allowed';
                } else if (seat.status === 'blocked') {
                  statusClass = 'border-red-950 bg-red-950/40 text-red-700 cursor-not-allowed';
                }

                return (
                  <button
                    key={seat.id}
                    onClick={() => handleSeatClick(seat)}
                    className={`w-10 h-10 rounded-xl border text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${statusClass}`}
                  >
                    {seat.rowName}{seat.number}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legends */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-8 pt-8 border-t border-zinc-800 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-zinc-900 border border-zinc-800" />
              <span className="text-zinc-400">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-purple-600 border border-purple-500 shadow-md shadow-purple-500/35" />
              <span className="text-zinc-300 font-medium">Selected / Held By You</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-orange-600/40 border border-orange-500/50" />
              <span className="text-zinc-400">Held By Others</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-950/40 border border-red-950" />
              <span className="text-zinc-500">Sold / Reserved</span>
            </div>
          </div>
        </section>

        {/* Right Side: Booking Panel */}
        <section className="flex flex-col gap-6">
          {/* Messages */}
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

          <div className="premium-card p-6 rounded-2xl">
            <h3 className="text-xl font-bold text-white mb-6">Booking Details</h3>

            <div className="flex flex-col gap-4 mb-8">
              <div className="text-white text-lg font-bold line-clamp-1">{event.name}</div>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Calendar className="h-4 w-4 text-purple-400" />
                <span>{new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <MapPin className="h-4 w-4 text-cyan-400" />
                <span>{event.venueName || event.location?.address}, {event.city || 'HCM'}</span>
              </div>
            </div>

            <div className="border-t border-zinc-800 pt-6 mb-6">
              <label className="text-xs text-zinc-500 uppercase font-bold tracking-wider block mb-3">Selected Seats</label>
              {selectedSeats.length === 0 ? (
                <span className="text-xs text-zinc-500 italic block">No seats selected yet.</span>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto">
                  {selectedSeats.map(id => (
                    <span key={id} className="px-3 py-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 text-xs text-purple-300 font-semibold uppercase">
                      {id.replace('seat_', '').replace('_', '')}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-zinc-800 pt-6 mb-8">
              <div className="flex items-center justify-between text-sm text-zinc-400 mb-2">
                <span>Subtotal</span>
                <span>
                  {selectedSeats.length > 0
                    ? ((selectedSeats.length * event.minPrice).toLocaleString('vi-VN') + ' ₫')
                    : '0 ₫'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm text-zinc-400 mb-4">
                <span>Handling Fee</span>
                <span>0 ₫</span>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                <span className="text-sm text-white font-semibold">Total Amount</span>
                <span className="text-lg font-bold text-cyan-400">
                  {selectedSeats.length > 0
                    ? ((selectedSeats.length * event.minPrice).toLocaleString('vi-VN') + ' ₫')
                    : '0 ₫'}
                </span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={selectedSeats.length === 0}
              className="w-full py-3.5 rounded-xl bg-purple-600 text-white hover:bg-purple-500 font-bold text-sm tracking-wide transition-all shadow-lg hover:shadow-purple-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55"
            >
              Proceed to Book
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
