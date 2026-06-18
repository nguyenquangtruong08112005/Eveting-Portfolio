'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertCircle, CheckCircle } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { PendingEventCard } from '@/components/admin/PendingEventCard';
import { useAuth } from '@/hooks/useAuth';
import { adminApi } from '@/lib/api';
import type { Event } from '@/types';

const MOCK_PENDING: Event[] = [
  {
    id: 'evt_pending_1',
    name: 'Ultra Rave Saigon 2026',
    description:
      'Lễ hội âm nhạc progressive house ngoài trời với headliner quốc tế và show ánh sáng khổng lồ.',
    date: Date.now() + 86400000 * 20,
    location: { address: 'Khu Đô Thị Sala' },
    city: 'TP. Hồ Chí Minh',
    venueName: 'Khu Đô Thị Sala',
    minPrice: 350000,
    category: ['Âm nhạc', 'Festival'],
    imageUrl:
      'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: 'evt_pending_2',
    name: 'Venture Capital Summit Vietnam',
    description:
      'Kết nối nhà sáng lập Việt với quỹ đầu tư quốc tế cho thế hệ công nghệ, logistics và web tiếp theo.',
    date: Date.now() + 86400000 * 30,
    location: { address: 'Trung tâm Triển lãm Sài Gòn' },
    city: 'TP. Hồ Chí Minh',
    venueName: 'SECC',
    minPrice: 500000,
    category: ['Kinh doanh', 'Công nghệ'],
    imageUrl:
      'https://images.unsplash.com/photo-1540575467063-178a50da2fd8?q=80&w=600&auto=format&fit=crop',
  },
];

export default function AdminModerationPage() {
  const { token, role, logout } = useAuth();
  const [pendingEvents, setPendingEvents] = useState<Event[]>(MOCK_PENDING);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    adminApi
      .getPendingEvents(token)
      .then((data) => {
        if (data?.events?.length) setPendingEvents(data.events);
      })
      .catch(() => {
        /* use mock data */
      });
  }, [token]);

  const handleApprove = async (eventId: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      if (token) await adminApi.approveEvent(eventId, token);
      setSuccessMessage('Sự kiện đã được phê duyệt thành công.');
      setPendingEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch {
      setSuccessMessage('Đã phê duyệt (mô phỏng offline).');
      setPendingEvents((prev) => prev.filter((e) => e.id !== eventId));
    }
  };

  const handleReject = async (eventId: string, reason: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      if (token) await adminApi.rejectEvent(eventId, reason, token);
      setSuccessMessage('Sự kiện đã bị từ chối.');
      setPendingEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch {
      setSuccessMessage('Đã từ chối (mô phỏng offline).');
      setPendingEvents((prev) => prev.filter((e) => e.id !== eventId));
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[var(--background)] min-h-screen">
      <Navbar userToken={token} userRole={role} onLogout={logout} isAdminPage />

      <main className="max-w-4xl mx-auto px-6 py-10 w-full flex-grow">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-8 flex items-center gap-2.5">
          <ShieldAlert className="size-7 text-[var(--error)]" />
          Hàng đợi kiểm duyệt sự kiện
        </h1>

        {errorMessage && (
          <div className="p-4 bg-[var(--error)]/10 border border-[var(--error)]/30 rounded-xl flex items-start gap-2 text-[var(--error)] text-sm mb-6">
            <AlertCircle className="size-5 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-4 bg-[var(--success)]/10 border border-[var(--success)]/30 rounded-xl flex items-start gap-2 text-[var(--success)] text-sm mb-6">
            <CheckCircle className="size-5 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {pendingEvents.length === 0 ? (
          <div className="text-center py-16 aura-card">
            <p className="text-[var(--text-muted)]">
              Không có sự kiện nào đang chờ kiểm duyệt.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pendingEvents.map((event) => (
              <PendingEventCard
                key={event.id}
                event={event}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
