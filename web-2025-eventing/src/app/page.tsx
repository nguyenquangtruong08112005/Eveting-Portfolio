'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, ArrowRight, Sparkles, User, Shield, Compass } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { EventCard } from '@/components/events/EventCard';
import { Input } from '@/components/ui/input';

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
    localStorage.removeItem('uid');
    setUserToken(null);
    setUserRole(null);
  };

  const filteredEvents = events.filter(e => 
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (e.description && e.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex-1 flex flex-col relative bg-[#09090b] min-h-screen">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-900/10 blur-[120px] pointer-events-none" />

      {/* Navbar Layout */}
      <Navbar userToken={userToken} userRole={userRole} onLogout={handleLogout} />

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-6 py-20 text-center flex flex-col items-center">
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-purple-500/20 bg-purple-500/5 text-sm text-purple-300 mb-6">
          <Sparkles className="size-4 text-purple-400" />
          <span>Redefining Live Entertainment Tech</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mb-6 leading-tight">
          Discover and Book <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">Immersive Events</span> Locally
        </h1>
        <p className="text-zinc-400 text-lg max-w-2xl mb-10">
          Experience real-time interactive seat selection, secure payment processing via ZaloPay, and instant tickets delivery.
        </p>

        {/* Search Bar using shadcn Input */}
        <div className="w-full max-w-xl relative">
          <Input 
            type="text" 
            placeholder="Search events, cities, categories..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-7 rounded-2xl border border-zinc-850 bg-zinc-900/50 text-white placeholder-zinc-500 focus-visible:ring-1 focus-visible:ring-purple-500 focus-visible:border-purple-500 transition-all backdrop-blur-md"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-zinc-500" />
        </div>
      </section>

      {/* Quick Navigation Panels for Demo */}
      <section className="max-w-7xl mx-auto px-6 mb-16 w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/attendee/events/evt_1" className="premium-card p-6 rounded-2xl flex flex-col group cursor-pointer text-left btn-tactile">
            <div className="size-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4 group-hover:bg-cyan-500/20 transition-all">
              <Compass className="size-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 flex items-center justify-between">
              Interactive Seating
              <ArrowRight className="size-4 text-cyan-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </h3>
            <p className="text-zinc-400 text-sm">
              Real-time interactive seat booking, holds, and live WebSocket synchronization.
            </p>
          </Link>

          <Link href="/organizer/dashboard" className="premium-card p-6 rounded-2xl flex flex-col group cursor-pointer text-left btn-tactile">
            <div className="size-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4 group-hover:bg-purple-500/20 transition-all">
              <User className="size-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 flex items-center justify-between">
              Organizer Panel
              <ArrowRight className="size-4 text-purple-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </h3>
            <p className="text-zinc-400 text-sm">
              Manage ticket prices, check balances, and view dynamic platform fee ledger payouts.
            </p>
          </Link>

          <Link href="/admin/moderation" className="premium-card p-6 rounded-2xl flex flex-col group cursor-pointer text-left btn-tactile">
            <div className="size-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4 group-hover:bg-red-500/20 transition-all">
              <Shield className="size-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 flex items-center justify-between">
              Admin Moderation
              <ArrowRight className="size-4 text-red-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </h3>
            <p className="text-zinc-400 text-sm">
              Moderator queue for reviewing submitted event drafts, approving, or rejecting.
            </p>
          </Link>
        </div>
      </section>

      {/* Events Grid */}
      <main className="max-w-7xl mx-auto px-6 pb-24 w-full flex-1 flex flex-col justify-start">
        <h2 className="text-2xl font-bold text-white mb-8 text-left">Featured Events</h2>

        {filteredEvents.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-zinc-800 rounded-2xl w-full">
            <p className="text-zinc-500">No events found matching your query.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </main>

      {/* Footer Layout */}
      <Footer />
    </div>
  );
}
