'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { SafeImage } from '@/components/shared/SafeImage';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Search,
  MapPin,
  ChevronRight,
  Gift,
  Sparkles,
  Ticket,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { EventCard } from '@/components/events/EventCard';
import { Badge } from '@/components/ui/badge';
import { EventService } from '@/services/event.service';
import { matchCategory, enrichEvent, formatPrice } from '@/lib/constants';
import type { Event } from '@/types';
import { cn } from '@/lib/utils';
import { HeroCarousel } from '@/components/home/HeroCarousel';
import { ArtistStars } from '@/components/home/ArtistStars';
import { PopularDestinations } from '@/components/home/PopularDestinations';

function LandingPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [events, setEvents] = useState<Event[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [loading, setLoading] = useState(true);

  // Sync with searchParams
  useEffect(() => {
    if (searchParams) {
      const q = searchParams.get('q');
      const cat = searchParams.get('category');
      if (q) setSearchQuery(q);
      else setSearchQuery('');
      
      if (cat) setActiveCategory(cat);
      else setActiveCategory('Tất cả');
    }
  }, [searchParams]);

  useEffect(() => {
    EventService
      .list()
      .then((data) => {
        if (data?.events?.length) {
          const cleaned = data.events
            .filter(
              (e) =>
                e &&
                e.name &&
                !e.name.toLowerCase().includes('smoke') &&
                !e.name.toLowerCase().includes('lifecycle') &&
                !e.id.startsWith('evt_07')
            )
            .map(enrichEvent);
          setEvents(cleaned);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Filters
  const [weekendTab, setWeekendTab] = useState<'weekend' | 'month'>('weekend');

  const filteredEvents = events.filter((e) => {
    if (!e) return false;
    const name = e.name || '';
    const desc = e.description || '';
    const matchesSearch =
      !searchQuery ||
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.city && e.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.venueName && e.venueName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = matchCategory(e.category, activeCategory);
    return matchesSearch && matchesCategory;
  });

  // Filters for Tabs: Weekend vs Month
  const tabFilteredEvents = events.filter((e) => {
    if (!e) return false;
    const d = new Date(e.date);
    if (weekendTab === 'weekend') {
      const day = d.getDay();
      return day === 0 || day === 5 || day === 6; // Fri, Sat, Sun
    } else {
      // Show events in the database timeline: e.g. June or July
      return d.getMonth() === 5 || d.getMonth() === 6;
    }
  }).slice(0, 4);

  // Split into categories for rendering
  const musicEvents = events.filter(e => matchCategory(e.category, 'Âm nhạc')).slice(0, 4);
  const theaterEvents = events.filter(e => matchCategory(e.category, 'Nghệ thuật')).slice(0, 4);
  const workshopEvents = events.filter(e => matchCategory(e.category, 'Nightlife')).slice(0, 4);
  const otherEvents = events.filter(e => matchCategory(e.category, 'Công nghệ')).slice(0, 4);

  const specialEvents = events.slice(0, 5);
  const trendingEvents = events.slice(2, 6);

  return (
    <div className="flex-1 flex flex-col bg-[var(--background)] min-h-screen">
      <Navbar />

      {/* ── Hero Carousel Banner ── */}
      <HeroCarousel events={events} />

      {/* If filtering or searching, show results directly instead of subsections */}
      {searchQuery || activeCategory !== 'Tất cả' ? (
        <main className="max-w-7xl mx-auto px-6 py-12 w-full flex-1">
          <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
            <div>
              <h1 className="text-2xl font-black text-[var(--text-primary)]">
                {activeCategory === 'Tất cả' ? 'Kết quả tìm kiếm' : activeCategory}
              </h1>
              <p className="text-xs text-zinc-400 mt-1">
                Tìm thấy {filteredEvents.length} sự kiện cho &quot;{searchQuery || activeCategory}&quot;
              </p>
            </div>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('Tất cả');
                router.push('/');
              }}
              className="text-xs font-bold text-[var(--primary)] hover:underline"
            >
              Xóa bộ lọc
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="aura-card overflow-hidden animate-pulse">
                  <div className="aspect-[16/10] bg-[var(--surface-hover)]" />
                  <div className="p-4 space-y-2.5">
                    <div className="h-4 w-3/4 rounded bg-[var(--surface-hover)]" />
                    <div className="h-3 w-1/2 rounded bg-[var(--surface-hover)]" />
                    <div className="h-3 w-1/3 rounded bg-[var(--surface-hover)]" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-24 bg-[#1E212B] rounded-2xl border border-white/5">
              <Search className="size-12 text-zinc-600 mx-auto mb-4 opacity-50" />
              <p className="text-zinc-300 text-lg font-bold">
                Không tìm thấy sự kiện nào
              </p>
              <p className="text-zinc-500 text-sm mt-1 max-w-sm mx-auto">
                Hãy thử kiểm tra lại chính tả hoặc chuyển sang danh mục khác để khám phá thêm.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredEvents.map((event, idx) => (
                <div
                  key={event.id}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${Math.min(idx * 40, 300)}ms` }}
                >
                  <EventCard event={event} />
                </div>
              ))}
            </div>
          )}
        </main>
      ) : (
        /* Full multi-section layout */
        <div className="flex-1 flex flex-col pb-12">
          {/* ── 1. Featured Stars Section ── */}
          <ArtistStars onSelectArtist={(name) => {
            setSearchQuery(name);
            router.push(`/?q=${encodeURIComponent(name)}`);
          }} />

          {/* ── 2. Special Events (Sự kiện đặc biệt) ── */}
          <section className="max-w-7xl mx-auto px-6 py-8 w-full">
            <h3 className="text-lg font-extrabold text-[var(--text-primary)] mb-6 tracking-tight flex items-center gap-2">
              <Sparkles className="size-5 text-[var(--primary)]" />
              Sự kiện đặc biệt
            </h3>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="aspect-[3/4] rounded-2xl bg-[var(--surface-hover)] animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {specialEvents.map((event) => (
                  <Link
                    href={`/attendee/events/${event.id}`}
                    key={event.id}
                    className="group relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer border border-white/5 hover:border-[var(--primary)]/30 transition-all duration-300 shadow-xl flex flex-col justify-end"
                  >
                    <SafeImage
                      src={event.imageUrl || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&auto=format&fit=crop&q=80'}
                      alt={event.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 20vw"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90" />
                    
                    {/* Badge in top left */}
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-gradient-to-r from-[#FF8F66] to-[#FF7043] text-[#12141A] font-bold text-[9px] px-2 py-0.5 rounded tracking-wide border-none shadow">
                        HOT
                      </Badge>
                    </div>

                    {/* Content overlay */}
                    <div className="relative p-4 z-10 flex flex-col justify-end">
                      <h4 className="text-sm font-extrabold text-white leading-snug group-hover:text-[var(--primary)] transition-colors line-clamp-2">
                        {event.name}
                      </h4>
                      <p className="text-[10px] text-zinc-400 mt-1 flex items-center gap-1">
                        <MapPin className="size-3 text-[var(--primary)]" />
                        <span className="truncate">{event.city}</span>
                      </p>
                      
                      <div className="mt-3 pt-2.5 border-t border-white/10 flex justify-between items-center">
                        <span className="text-xs font-bold text-[var(--primary)]">
                          {formatPrice(event.minPrice)}
                        </span>
                        <span className="text-[10px] text-zinc-400 group-hover:text-white transition-colors flex items-center gap-0.5">
                          Đặt vé →
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* ── Banner VIB Promo ── */}
          <section className="max-w-7xl mx-auto px-6 py-6 w-full">
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-[#0C1938] to-[#122A5E] border border-[#1E3B87] p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
              <div className="flex items-center gap-5">
                <div className="size-14 rounded-2xl bg-white/10 flex items-center justify-center text-white shrink-0">
                  <Ticket className="size-7 text-[var(--primary)]" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="bg-[#FF8F66] text-[#12141A] text-[9px] font-black px-2 py-0.5 rounded tracking-wider uppercase">VIB Partner</span>
                    <span className="text-white/60 text-xs font-semibold">| ticketbox</span>
                  </div>
                  <h3 className="text-xl font-black text-white leading-tight">MỞ THẺ MỚI NHẬN LIỀN ƯU ĐÃI <span className="text-[#FF8F66]">500K</span></h3>
                  <p className="text-zinc-300 text-xs mt-1">Mua vé đu idol cực hời, hoàn tiền cực khủng khi kích hoạt thành công thẻ VIB.</p>
                </div>
              </div>
              <Link
                href="/checkout"
                className="bg-[#FF8F66] text-[#12141A] font-black px-6 py-3 rounded-xl hover:scale-105 active:scale-95 transition-all text-xs whitespace-nowrap"
              >
                Mở Thẻ Ngay
              </Link>
            </div>
          </section>

          {/* ── 3. Trending Events Section (Sự kiện xu hướng) ── */}
          <section className="max-w-7xl mx-auto px-6 py-8 w-full">
            <h3 className="text-lg font-extrabold text-[var(--text-primary)] mb-6 tracking-tight flex items-center gap-2">
              <span className="text-2xl">🔥</span> Sự kiện xu hướng
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {trendingEvents.map((event, idx) => (
                <div
                  key={event.id}
                  className="relative bg-[#1E212B] rounded-2xl border border-white/5 p-4 flex gap-4 group hover:border-[var(--primary)]/30 hover:translate-x-1 transition-all duration-300 shadow-lg overflow-hidden"
                >
                  {/* Glowing rank number on left column */}
                  <div className="flex items-center justify-center font-black text-5xl text-transparent bg-clip-text bg-gradient-to-br from-[#FF8F66] to-[#FF7043] opacity-80 shrink-0 w-8 select-none">
                    {idx + 1}
                  </div>
                  
                  {/* Poster Image */}
                  <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 relative border border-white/5">
                    <SafeImage
                      src={event.imageUrl || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&auto=format&fit=crop&q=80'}
                      alt={event.name}
                      fill
                      sizes="80px"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  
                  {/* Details */}
                  <div className="flex-1 flex flex-col justify-between py-0.5">
                    <div>
                      <h4 className="text-xs font-bold text-white line-clamp-2 leading-tight group-hover:text-[var(--primary)] transition-colors">
                        {event.name}
                      </h4>
                      <p className="text-[10px] text-zinc-400 mt-1 flex items-center gap-1">
                        <MapPin className="size-3 text-[var(--primary)]" />
                        <span className="truncate max-w-[100px]">{event.city}</span>
                      </p>
                    </div>
                    <div className="flex justify-between items-center mt-2 pt-1 border-t border-white/5">
                      <span className="text-[10px] font-bold text-[var(--primary)]">
                        {formatPrice(event.minPrice)}
                      </span>
                      <Link
                        href={`/attendee/events/${event.id}`}
                        className="text-[10px] font-bold text-zinc-400 group-hover:text-white transition-colors flex items-center gap-0.5"
                      >
                        Đặt vé →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── 4. Weekend / Monthly Tabs ── */}
          <section className="max-w-7xl mx-auto px-6 py-8 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-6">
              <div className="flex gap-2">
                <button
                  onClick={() => setWeekendTab('weekend')}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                    weekendTab === 'weekend'
                      ? "bg-[var(--primary)] text-[#12141A] shadow-md shadow-orange-500/10"
                      : "bg-[#1E212B] text-zinc-400 hover:text-white"
                  )}
                >
                  Cuối tuần này
                </button>
                <button
                  onClick={() => setWeekendTab('month')}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                    weekendTab === 'month'
                      ? "bg-[var(--primary)] text-[#12141A] shadow-md shadow-orange-500/10"
                      : "bg-[#1E212B] text-zinc-400 hover:text-white"
                  )}
                >
                  Tháng này
                </button>
              </div>
              <span className="text-xs text-zinc-400 flex items-center gap-1">
                Hiển thị các sự kiện gần nhất
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {tabFilteredEvents.map((event) => (
                <div key={event.id} className="h-full">
                  <EventCard event={event} />
                </div>
              ))}
            </div>
          </section>

          {/* ── Banner ShopeePay Promo ── */}
          <section className="max-w-7xl mx-auto px-6 py-6 w-full">
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-[#2B1B0E] to-[#42220D] border border-[#7C4018] p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
              <div className="flex items-center gap-5">
                <div className="size-14 rounded-2xl bg-white/10 flex items-center justify-center text-white shrink-0">
                  <Gift className="size-7 text-[var(--primary)]" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="bg-[#FF7043] text-white text-[9px] font-black px-2 py-0.5 rounded tracking-wider uppercase">ShopeePay</span>
                    <span className="text-white/60 text-xs font-semibold">| Ví Điện Tử Partner</span>
                  </div>
                  <h3 className="text-xl font-black text-white leading-tight">GIẢM NGAY <span className="text-[#FF8F66]">40.000Đ</span> SĂN VÉ NHANH CHÓNG</h3>
                  <p className="text-zinc-300 text-xs mt-1">Nhập mã thanh toán ShopeePay tại bước checkout để nhận ngay chiết khấu trực tiếp.</p>
                </div>
              </div>
              <button className="bg-[#FF8F66] text-[#12141A] font-black px-6 py-3 rounded-xl hover:scale-105 active:scale-95 transition-all text-xs whitespace-nowrap">
                Lấy Mã Giảm Giá
              </button>
            </div>
          </section>

          {/* ── 5. Category Rows: Nhạc sống ── */}
          <section className="max-w-7xl mx-auto px-6 py-8 w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-extrabold text-[var(--text-primary)] tracking-tight">
                Nhạc sống
              </h3>
              <button
                onClick={() => setActiveCategory('Âm nhạc')}
                className="text-xs font-bold text-zinc-500 hover:text-[var(--primary)] transition-colors flex items-center gap-0.5"
              >
                Xem thêm <ChevronRight className="size-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {musicEvents.map((event) => (
                <div key={event.id} className="h-full">
                  <EventCard event={event} />
                </div>
              ))}
            </div>
          </section>

          {/* ── 6. Category Rows: Sân khấu & Nghệ thuật ── */}
          <section className="max-w-7xl mx-auto px-6 py-8 w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-extrabold text-[var(--text-primary)] tracking-tight">
                Sân khấu & Nghệ thuật
              </h3>
              <button
                onClick={() => setActiveCategory('Nghệ thuật')}
                className="text-xs font-bold text-zinc-500 hover:text-[var(--primary)] transition-colors flex items-center gap-0.5"
              >
                Xem thêm <ChevronRight className="size-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {theaterEvents.map((event) => (
                <div key={event.id} className="h-full">
                  <EventCard event={event} />
                </div>
              ))}
            </div>
          </section>

          {/* ── Banner HDBank Promo ── */}
          <section className="max-w-7xl mx-auto px-6 py-6 w-full">
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-[#200A0A] to-[#3B1212] border border-[#692020] p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
              <div className="flex items-center gap-5">
                <div className="size-14 rounded-2xl bg-white/10 flex items-center justify-center text-white shrink-0">
                  <Sparkles className="size-7 text-[var(--primary)]" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="bg-[#E31A1A] text-white text-[9px] font-black px-2 py-0.5 rounded tracking-wider uppercase">HDBank</span>
                    <span className="text-white/60 text-xs font-semibold">| ticketbox</span>
                  </div>
                  <h3 className="text-xl font-black text-white leading-tight">QUÉT THẺ HDBANK - RINH VÉ CỰC HỜI</h3>
                  <p className="text-zinc-300 text-xs mt-1">Giảm ngay <span className="font-bold text-[#FF8F66]">50.000đ</span> cho đơn từ 300K | Hoàn tiền <span className="font-bold text-[#FF8F66]">500.000đ</span> cho đơn từ 3 triệu.</p>
                </div>
              </div>
              <button className="bg-[#FF8F66] text-[#12141A] font-black px-6 py-3 rounded-xl hover:scale-105 active:scale-95 transition-all text-xs whitespace-nowrap">
                Xem Điều Khoản
              </button>
            </div>
          </section>

          {/* ── 7. Category Rows: Hội thảo & Workshop ── */}
          <section className="max-w-7xl mx-auto px-6 py-8 w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-extrabold text-[var(--text-primary)] tracking-tight">
                Hội thảo & Workshop
              </h3>
              <button
                onClick={() => setActiveCategory('Nightlife')}
                className="text-xs font-bold text-zinc-500 hover:text-[var(--primary)] transition-colors flex items-center gap-0.5"
              >
                Xem thêm <ChevronRight className="size-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {workshopEvents.map((event) => (
                <div key={event.id} className="h-full">
                  <EventCard event={event} />
                </div>
              ))}
            </div>
          </section>

          {/* ── 8. Category Rows: Khác (Công nghệ) ── */}
          <section className="max-w-7xl mx-auto px-6 py-8 w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-extrabold text-[var(--text-primary)] tracking-tight">
                Khoa học & Công nghệ
              </h3>
              <button
                onClick={() => setActiveCategory('Công nghệ')}
                className="text-xs font-bold text-zinc-500 hover:text-[var(--primary)] transition-colors flex items-center gap-0.5"
              >
                Xem thêm <ChevronRight className="size-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {otherEvents.map((event) => (
                <div key={event.id} className="h-full">
                  <EventCard event={event} />
                </div>
              ))}
            </div>
          </section>

          {/* ── 9. Destination Cities (Điểm đến thú vị) ── */}
          <PopularDestinations onSelectCity={(query) => {
            if (query) {
              setSearchQuery(query);
              router.push(`/?q=${encodeURIComponent(query)}`);
            } else {
              setSearchQuery('');
              router.push('/');
            }
          }} />
        </div>
      )}

      <Footer />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="bg-[#12141A] min-h-screen text-zinc-400 flex flex-col items-center justify-center gap-3">
        <div className="size-8 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
        <span className="text-xs font-bold tracking-wider uppercase text-zinc-500">Đang tải Eventing...</span>
      </div>
    }>
      <LandingPageContent />
    </Suspense>
  );
}
