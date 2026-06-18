'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, MapPin, Search, ArrowRight, Sparkles, User, Shield, Compass, LogIn } from 'lucide-react';

interface Event {
  id: string;
  name: string;
  description: string;
  date: number;
  imageUrl?: string;
  location: { address: string };
  city?: string;
  venueName?: string;
  minPrice: number;
  category: string[];
}

const MOCK_EVENTS: Event[] = [
  {
    id: 'evt_1',
    name: 'Neo-Tokyo Symphony 2026',
    description: 'An immersive cyberpunk orchestral experience blending classical instruments with futuristic synthwave aesthetics.',
    date: Date.now() + 86400000 * 5,
    imageUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?q=80&w=600&auto=format&fit=crop',
    location: { address: '79 Nguyen Hue, District 1' },
    city: 'Ho Chi Minh City',
    venueName: 'Rex Premium Theatre',
    minPrice: 150000,
    category: ['Music', 'Cyberpunk']
  },
  {
    id: 'evt_2',
    name: 'AI & Art Frontiers Exhibition',
    description: 'Witness the intersection of generative AI algorithms and human physical expression in a dynamic spatial canvas.',
    date: Date.now() + 86400000 * 12,
    imageUrl: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?q=80&w=600&auto=format&fit=crop',
    location: { address: '182 Le Dai Hanh, District 11' },
    city: 'Ho Chi Minh City',
    venueName: 'Lotte Innovation Labs',
    minPrice: 75000,
    category: ['Art', 'Tech']
  },
  {
    id: 'evt_3',
    name: 'Sunset Beats & Lounge Poolside',
    description: 'Unwind with tropical house DJ sets under a gorgeous crimson sunset. Includes complimentary drinks.',
    date: Date.now() + 86400000 * 3,
    imageUrl: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=600&auto=format&fit=crop',
    location: { address: 'Saigon Rooftop Lounge' },
    city: 'Ho Chi Minh City',
    venueName: 'The Grand Vista',
    minPrice: 200000,
    category: ['Nightlife', 'DJ']
  }
];

export default function LandingPage() {
  const [events, setEvents] = useState<Event[]>(MOCK_EVENTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [userToken, setUserToken] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    // Read local auth storage if present
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    setUserToken(token);
    setUserRole(role);

    // Attempt to fetch from real backend
    fetch('http://localhost:3000/events')
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.events)) {
          setEvents(data.events);
        }
      })
      .catch(err => {
        console.warn('Backend offline, using high-fidelity mock events instead.', err.message);
      });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setUserToken(null);
    setUserRole(null);
  };

  const filteredEvents = events.filter(e => 
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (e.description && e.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex-1 flex flex-col relative bg-[#09090b]">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-900/10 blur-[120px] pointer-events-none" />

      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-white hover:opacity-90">
            <Sparkles className="h-6 w-6 text-purple-400 glow-text" />
            <span>Aura<span className="text-purple-400">Events</span></span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-400">
            <Link href="/" className="text-white hover:text-white transition-colors">Home</Link>
            {userRole === 'organizer' && (
              <Link href="/organizer/dashboard" className="hover:text-white transition-colors flex items-center gap-1">
                <Compass className="h-4 w-4" /> Organizer Dashboard
              </Link>
            )}
            {userRole === 'admin' && (
              <Link href="/admin/moderation" className="hover:text-white transition-colors flex items-center gap-1 text-purple-300">
                <Shield className="h-4 w-4" /> Admin Moderation
              </Link>
            )}
            {userToken && userRole !== 'admin' && userRole !== 'organizer' && (
              <Link href="/attendee/events/evt_1" className="hover:text-white transition-colors flex items-center gap-1 text-cyan-400">
                <Compass className="h-4 w-4" /> Seat Holds Pilot
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-4">
            {userToken ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/5 text-xs text-purple-300">
                  <User className="h-3.5 w-3.5" />
                  <span className="capitalize">{userRole || 'Attendee'}</span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-zinc-800 text-zinc-300 hover:bg-zinc-900 transition-all cursor-pointer"
                >
                  Log out
                </button>
              </div>
            ) : (
              <Link 
                href="/login"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white text-black hover:bg-zinc-200 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <LogIn className="h-3.5 w-3.5" />
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-6 py-20 text-center flex flex-col items-center">
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-purple-500/20 bg-purple-500/5 text-sm text-purple-300 mb-6">
          <Sparkles className="h-4 w-4 text-purple-400" />
          <span>Redefining Live Entertainment Tech</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mb-6 leading-tight">
          Discover and Book <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">Immersive Events</span> Locally
        </h1>
        <p className="text-zinc-400 text-lg max-w-2xl mb-10">
          Experience real-time interactive seat selection, secure payment processing via ZaloPay, and instant tickets delivery.
        </p>

        {/* Search Bar */}
        <div className="w-full max-w-xl relative">
          <input 
            type="text" 
            placeholder="Search events, cities, categories..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all backdrop-blur-md"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
        </div>
      </section>

      {/* Quick Navigation Panels for Demo */}
      <section className="max-w-7xl mx-auto px-6 mb-16 w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/attendee/events/evt_1" className="premium-card p-6 rounded-2xl flex flex-col group cursor-pointer text-left">
            <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4 group-hover:bg-cyan-500/20 transition-all">
              <Compass className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 flex items-center justify-between">
              Interactive Seating
              <ArrowRight className="h-4 w-4 text-cyan-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </h3>
            <p className="text-zinc-400 text-sm">
              Real-time interactive seat booking, holds, and live WebSocket synchronization.
            </p>
          </Link>

          <Link href="/organizer/dashboard" className="premium-card p-6 rounded-2xl flex flex-col group cursor-pointer text-left">
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4 group-hover:bg-purple-500/20 transition-all">
              <User className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 flex items-center justify-between">
              Organizer Panel
              <ArrowRight className="h-4 w-4 text-purple-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </h3>
            <p className="text-zinc-400 text-sm">
              Manage ticket prices, check balances, and view dynamic platform fee ledger payouts.
            </p>
          </Link>

          <Link href="/admin/moderation" className="premium-card p-6 rounded-2xl flex flex-col group cursor-pointer text-left">
            <div className="h-10 w-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4 group-hover:bg-red-500/20 transition-all">
              <Shield className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 flex items-center justify-between">
              Admin Moderation
              <ArrowRight className="h-4 w-4 text-red-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </h3>
            <p className="text-zinc-400 text-sm">
              Moderator queue for reviewing submitted event drafts, approving, or rejecting.
            </p>
          </Link>
        </div>
      </section>

      {/* Events Grid */}
      <main className="max-w-7xl mx-auto px-6 pb-24 w-full flex-1">
        <h2 className="text-2xl font-bold text-white mb-8 text-left">Featured Events</h2>

        {filteredEvents.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-zinc-800 rounded-2xl">
            <p className="text-zinc-500">No events found matching your query.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {filteredEvents.map((event) => (
              <article key={event.id} className="premium-card rounded-2xl overflow-hidden flex flex-col">
                <div className="aspect-video w-full relative overflow-hidden bg-zinc-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={event.imageUrl || 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?q=80&w=600&auto=format&fit=crop'} 
                    alt={event.name} 
                    className="object-cover w-full h-full hover:scale-105 transition-all duration-500"
                  />
                  <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
                    {event.category.map((cat, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-full bg-zinc-950/80 border border-zinc-800/80 text-[10px] text-zinc-300 font-semibold uppercase tracking-wider backdrop-blur-md">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between text-left">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2 hover:text-purple-400 transition-colors line-clamp-1">
                      {event.name}
                    </h3>
                    <p className="text-zinc-400 text-sm mb-6 line-clamp-2">
                      {event.description}
                    </p>
                  </div>

                  <div>
                    <div className="flex flex-col gap-2.5 mb-6 text-xs text-zinc-400">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-purple-400" />
                        <span>{new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-cyan-400" />
                        <span>{event.venueName || event.location.address}, {event.city || 'HCM'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block">Tickets From</span>
                        <span className="text-lg font-bold text-cyan-400">
                          {event.minPrice ? event.minPrice.toLocaleString('vi-VN') + ' ₫' : 'Free'}
                        </span>
                      </div>
                      <Link 
                        href={`/attendee/events/${event.id}`}
                        className="px-4 py-2.5 rounded-xl bg-purple-600 text-white hover:bg-purple-500 font-semibold text-xs tracking-wide transition-all shadow-md hover:shadow-purple-500/25 flex items-center gap-1.5 cursor-pointer"
                      >
                        Book Seat
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-zinc-900 bg-zinc-950 py-8 text-center text-zinc-500 text-xs">
        <p>© 2026 AuraEvents. Build Phase P Business Redesign & Web Expansion.</p>
      </footer>
    </div>
  );
}
