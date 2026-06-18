'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, ArrowRight, Flame, LayoutDashboard, Shield, Ticket } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { EventCard } from '@/components/events/EventCard';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { eventsApi } from '@/lib/api';
import type { Event } from '@/types';

const MOCK_EVENTS: Event[] = [
  {
    id: 'evt_1',
    name: 'Neo-Tokyo Symphony 2026',
    description:
      'Trải nghiệm hòa nhạc cyberpunk đắm chìm — kết hợp nhạc cụ cổ điển với âm thanh synthwave tương lai.',
    date: Date.now() + 86400000 * 5,
    imageUrl:
      'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?q=80&w=600&auto=format&fit=crop',
    location: { address: '79 Nguyễn Huệ, Quận 1' },
    city: 'TP. Hồ Chí Minh',
    venueName: 'Rex Premium Theatre',
    minPrice: 150000,
    category: ['Âm nhạc', 'Cyberpunk'],
  },
  {
    id: 'evt_2',
    name: 'Triển lãm AI & Nghệ thuật',
    description:
      'Chứng kiến giao điểm của AI generative và biểu đạt con người trong không gian nghệ thuật động.',
    date: Date.now() + 86400000 * 12,
    imageUrl:
      'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?q=80&w=600&auto=format&fit=crop',
    location: { address: '182 Lê Đại Hành, Quận 11' },
    city: 'TP. Hồ Chí Minh',
    venueName: 'Lotte Innovation Labs',
    minPrice: 75000,
    category: ['Nghệ thuật', 'Công nghệ'],
  },
  {
    id: 'evt_3',
    name: 'Sunset Beats — Poolside Lounge',
    description:
      'Thư giãn với tropical house DJ dưới hoàng hôn đỏ rực. Bao gồm đồ uống miễn phí.',
    date: Date.now() + 86400000 * 3,
    imageUrl:
      'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=600&auto=format&fit=crop',
    location: { address: 'Saigon Rooftop Lounge' },
    city: 'TP. Hồ Chí Minh',
    venueName: 'The Grand Vista',
    minPrice: 200000,
    category: ['Nightlife', 'DJ'],
  },
];

const CATEGORIES = ['Tất cả', 'Âm nhạc', 'Nghệ thuật', 'Nightlife', 'Thể thao', 'Công nghệ'];

export default function LandingPage() {
  const { token, role, logout } = useAuth();
  const [events, setEvents] = useState<Event[]>(MOCK_EVENTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tất cả');

  useEffect(() => {
    eventsApi
      .list()
      .then((data) => {
        if (data?.events?.length) setEvents(data.events);
      })
      .catch(() => {
        /* use mock data */
      });
  }, []);

  const filteredEvents = events.filter((e) => {
    const matchesSearch =
      !searchQuery ||
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      activeCategory === 'Tất cả' || (e.category ?? []).some((c) => c === activeCategory);
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex-1 flex flex-col bg-[var(--background)] min-h-screen">
      {/* Ambient Glow */}
      <div className="fixed top-0 left-0 w-full h-[600px] pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-200px] left-[10%] w-[500px] h-[500px] rounded-full bg-[#F76B10]/5 blur-[150px]" />
        <div className="absolute top-[-100px] right-[15%] w-[400px] h-[400px] rounded-full bg-[#FF9C5B]/4 blur-[120px]" />
      </div>

      <Navbar userToken={token} userRole={role} onLogout={logout} />

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-6 pt-16 pb-12 text-center flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--primary)]/20 bg-[var(--primary)]/5 text-sm text-[var(--primary-dark)] mb-6 animate-fade-in-up">
          <Flame className="size-4" />
          <span>Nền tảng sự kiện trực tuyến hàng đầu</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[var(--text-primary)] max-w-4xl mb-5 leading-[1.1]">
          Khám phá &{' '}
          <span className="bg-gradient-to-r from-[#F76B10] via-[#FF8F66] to-[#FF9C5B] bg-clip-text text-transparent">
            Đặt vé sự kiện
          </span>{' '}
          yêu thích
        </h1>

        <p className="text-[var(--text-secondary)] text-lg max-w-2xl mb-10 leading-relaxed">
          Chọn ghế tương tác thời gian thực, thanh toán an toàn qua ZaloPay, phát hành vé tức thì.
        </p>

        {/* Search Bar */}
        <div className="w-full max-w-xl relative">
          <Input
            type="text"
            placeholder="Tìm sự kiện, địa điểm, thể loại..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-7 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)]/60 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus-visible:ring-1 focus-visible:ring-[var(--primary-dark)] focus-visible:border-[var(--primary-dark)]/50 transition-all backdrop-blur-md"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-[var(--text-muted)]" />
        </div>

        {/* Category Tabs — Ticketbox style */}
        <div className="flex items-center gap-2 mt-6 flex-wrap justify-center">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium transition-all btn-tactile cursor-pointer',
                activeCategory === cat
                  ? 'bg-[var(--primary)] text-[var(--on-primary)]'
                  : 'bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border border-[var(--surface-border)]'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Quick Navigation Panels */}
      <section className="max-w-7xl mx-auto px-6 mb-12 w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Link
            href="/attendee/events/evt_1"
            className="aura-card p-5 flex flex-col group cursor-pointer btn-tactile"
          >
            <div className="size-10 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 flex items-center justify-center text-[var(--primary-dark)] mb-3 group-hover:bg-[var(--primary)]/20 transition-all">
              <Ticket className="size-5" />
            </div>
            <h3 className="text-base font-bold text-[var(--text-primary)] mb-1 flex items-center justify-between">
              Chọn ghế tương tác
              <ArrowRight className="size-4 text-[var(--primary-dark)] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </h3>
            <p className="text-[var(--text-muted)] text-sm">
              Giữ ghế real-time, đồng bộ WebSocket, thanh toán nhanh.
            </p>
          </Link>

          <Link
            href="/organizer/dashboard"
            className="aura-card p-5 flex flex-col group cursor-pointer btn-tactile"
          >
            <div className="size-10 rounded-xl bg-[var(--secondary-yellow)]/10 border border-[var(--secondary-yellow)]/20 flex items-center justify-center text-[var(--secondary-yellow)] mb-3 group-hover:bg-[var(--secondary-yellow)]/20 transition-all">
              <LayoutDashboard className="size-5" />
            </div>
            <h3 className="text-base font-bold text-[var(--text-primary)] mb-1 flex items-center justify-between">
              Ban tổ chức
              <ArrowRight className="size-4 text-[var(--secondary-yellow)] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </h3>
            <p className="text-[var(--text-muted)] text-sm">
              Quản lý vé, doanh thu, và chi phí nền tảng.
            </p>
          </Link>

          <Link
            href="/admin/moderation"
            className="aura-card p-5 flex flex-col group cursor-pointer btn-tactile"
          >
            <div className="size-10 rounded-xl bg-[var(--error)]/10 border border-[var(--error)]/20 flex items-center justify-center text-[var(--error)] mb-3 group-hover:bg-[var(--error)]/20 transition-all">
              <Shield className="size-5" />
            </div>
            <h3 className="text-base font-bold text-[var(--text-primary)] mb-1 flex items-center justify-between">
              Kiểm duyệt Admin
              <ArrowRight className="size-4 text-[var(--error)] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </h3>
            <p className="text-[var(--text-muted)] text-sm">
              Duyệt / từ chối sự kiện draft từ ban tổ chức.
            </p>
          </Link>
        </div>
      </section>

      {/* Events Grid */}
      <main className="max-w-7xl mx-auto px-6 pb-20 w-full flex-1">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Sự kiện nổi bật</h2>
          <span className="text-sm text-[var(--text-muted)]">
            {filteredEvents.length} sự kiện
          </span>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="text-center py-16 aura-card">
            <p className="text-[var(--text-muted)]">
              Không tìm thấy sự kiện phù hợp.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}
