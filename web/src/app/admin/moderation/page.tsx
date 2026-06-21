'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertCircle, CheckCircle, Clock, ShieldCheck, Ban, Activity } from 'lucide-react';
import Image from 'next/image';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { PendingEventCard } from '@/components/admin/PendingEventCard';
import { useAuth } from '@/hooks/useAuth';
import { AdminService } from '@/services/admin.service';
import { formatDate } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import type { Event } from '@/types';
import { cn } from '@/lib/utils';
import type { RejectedEvent } from '@/types';

export default function AdminModerationPage() {
  const { token } = useAuth();
  const [pendingEvents, setPendingEvents] = useState<Event[]>([]);
  const [approvedEvents, setApprovedEvents] = useState<Event[]>([]);
  const [rejectedEvents, setRejectedEvents] = useState<RejectedEvent[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    setErrorMessage(null);
    AdminService
      .getPendingEvents()
      .then((data) => {
        if (data?.events) {
          // Filter to avoid showing tests in queue
          const cleaned = data.events.filter(e => e && e.name && !e.name.toLowerCase().includes('test'));
          setPendingEvents(cleaned);
        }
      })
      .catch((err: any) => {
        console.error('Failed to load pending events:', err);
        setErrorMessage(err.message || 'Không thể tải danh sách sự kiện chờ duyệt từ máy chủ.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleApprove = async (eventId: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    const event = pendingEvents.find((e) => e.id === eventId);
    try {
      if (!token) {
        throw new Error('Chưa đăng nhập hoặc phiên làm việc hết hạn.');
      }
      await AdminService.approveEvent(eventId);
      setSuccessMessage(`Đã phê duyệt sự kiện "${event?.name || ''}" thành công.`);
      if (event) {
        setApprovedEvents((prev) => [event, ...prev]);
      }
      setPendingEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch (err: any) {
      console.error('Approve error:', err);
      setErrorMessage(err.message || `Lỗi phê duyệt sự kiện: "${event?.name || ''}".`);
      throw err; // Propagate to subcomponent
    }
  };

  const handleReject = async (eventId: string, reason: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    const event = pendingEvents.find((e) => e.id === eventId);
    try {
      if (!token) {
        throw new Error('Chưa đăng nhập hoặc phiên làm việc hết hạn.');
      }
      await AdminService.rejectEvent(eventId, reason);
      setSuccessMessage(`Đã từ chối sự kiện "${event?.name || ''}".`);
      if (event) {
        setRejectedEvents((prev) => [{ ...event, reason }, ...prev]);
      }
      setPendingEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch (err: any) {
      console.error('Reject error:', err);
      setErrorMessage(err.message || `Lỗi từ chối sự kiện: "${event?.name || ''}".`);
      throw err; // Propagate to subcomponent
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[var(--background)] min-h-screen">
      <Navbar isAdminPage />

      <main className="max-w-7xl mx-auto px-6 py-10 w-full flex-grow">
        {/* Page Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-[var(--text-primary)] flex items-center gap-3 tracking-tight">
              <ShieldAlert className="size-7 text-[var(--primary)]" />
              Bảng kiểm duyệt của Admin
            </h1>
            <p className="text-xs text-zinc-400 mt-1">Quản lý và phê duyệt các sự kiện mới đăng tải từ Ban tổ chức</p>
          </div>
          <Badge className="px-3 py-1 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/30 text-xs font-bold text-[var(--primary)] shrink-0 self-start md:self-center">
            Quyền hạn: Admin Hệ thống
          </Badge>
        </div>

        {/* Telemetry Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Card 1: Pending */}
          <div className="bg-[#1E212B] border border-white/5 p-4 rounded-2xl flex items-center gap-4">
            <div className="size-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
              <Clock className="size-5 text-[var(--primary)]" />
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Chờ kiểm duyệt</span>
              <span className="text-xl font-black text-white">{pendingEvents.length}</span>
            </div>
          </div>
          
          {/* Card 2: Approved */}
          <div className="bg-[#1E212B] border border-white/5 p-4 rounded-2xl flex items-center gap-4">
            <div className="size-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="size-5 text-green-400" />
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Đã duyệt (Phiên này)</span>
              <span className="text-xl font-black text-green-400">{approvedEvents.length}</span>
            </div>
          </div>

          {/* Card 3: Rejected */}
          <div className="bg-[#1E212B] border border-white/5 p-4 rounded-2xl flex items-center gap-4">
            <div className="size-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
              <Ban className="size-5 text-red-400" />
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Từ chối (Phiên này)</span>
              <span className="text-xl font-black text-red-400">{rejectedEvents.length}</span>
            </div>
          </div>

          {/* Card 4: Status */}
          <div className="bg-[#1E212B] border border-white/5 p-4 rounded-2xl flex items-center gap-4">
            <div className="size-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
              <Activity className="size-5 text-blue-400" />
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Kết nối Gateway</span>
              <span className="text-xs font-black text-blue-400 flex items-center gap-1.5 mt-0.5">
                <span className="size-2 rounded-full bg-blue-400 animate-ping inline-block" />
                ONLINE
              </span>
            </div>
          </div>
        </div>

        {/* Messaging Feedback */}
        {errorMessage && (
          <div className="p-4 bg-[var(--error)]/10 border border-[var(--error)]/30 rounded-xl flex items-start gap-2 text-[var(--error)] text-sm mb-6 animate-fade-in">
            <AlertCircle className="size-5 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-start gap-2 text-green-400 text-sm mb-6 animate-fade-in">
            <CheckCircle className="size-5 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Tab Controllers */}
        <div className="flex gap-2 border-b border-white/5 pb-4 mb-6">
          <button
            onClick={() => setActiveTab('pending')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
              activeTab === 'pending'
                ? "bg-[var(--primary)] text-[#12141A] shadow-md shadow-orange-500/10"
                : "bg-[#1E212B] text-zinc-400 hover:text-white"
            )}
          >
            Hàng đợi chờ duyệt ({pendingEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
              activeTab === 'approved'
                ? "bg-green-500 text-[#12141A] shadow-md shadow-green-500/10"
                : "bg-[#1E212B] text-zinc-400 hover:text-white"
            )}
          >
            Lịch sử đã duyệt ({approvedEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('rejected')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
              activeTab === 'rejected'
                ? "bg-red-500 text-white shadow-md shadow-red-500/10"
                : "bg-[#1E212B] text-zinc-400 hover:text-white"
            )}
          >
            Nhật ký từ chối ({rejectedEvents.length})
          </button>
        </div>

        {/* Main List Display */}
        {loading ? (
          <div className="text-center py-20 text-zinc-500 text-sm">Đang tải danh sách kiểm duyệt...</div>
        ) : activeTab === 'pending' ? (
          pendingEvents.length === 0 ? (
            <div className="text-center py-16 bg-[#1E212B] border border-white/5 rounded-2xl">
              <ShieldCheck className="size-12 text-zinc-600 mx-auto mb-4 opacity-50" />
              <p className="text-zinc-300 font-bold">Hàng đợi trống</p>
              <p className="text-zinc-500 text-xs mt-1">Tất cả các sự kiện gửi lên từ đối tác đều đã được phê duyệt.</p>
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
          )
        ) : activeTab === 'approved' ? (
          approvedEvents.length === 0 ? (
            <div className="text-center py-16 bg-[#1E212B] border border-white/5 rounded-2xl">
              <p className="text-zinc-500 text-sm italic">Chưa duyệt sự kiện nào trong phiên làm việc này.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {approvedEvents.map((event) => (
                <div key={event.id} className="bg-[#1E212B]/40 border border-green-500/20 p-5 rounded-2xl flex gap-4 items-center">
                  <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-zinc-800 relative">
                    <Image src={event.imageUrl || ''} alt={event.name} fill className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white leading-tight">{event.name}</h4>
                    <p className="text-[10px] text-zinc-400 mt-1">{event.city} · {formatDate(event.date)}</p>
                    <Badge className="bg-green-500/10 text-green-400 border border-green-500/20 font-bold text-[9px] px-2 py-0.5 rounded mt-2.5">
                      ✓ ĐÃ PHÊ DUYỆT
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          rejectedEvents.length === 0 ? (
            <div className="text-center py-16 bg-[#1E212B] border border-white/5 rounded-2xl">
              <p className="text-zinc-500 text-sm italic">Không có sự kiện nào bị từ chối trong phiên làm việc này.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {rejectedEvents.map((event) => (
                <div key={event.id} className="bg-[#1E212B]/40 border border-red-500/20 p-5 rounded-2xl flex gap-4 items-start">
                  <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-zinc-800 mt-0.5 relative">
                    <Image src={event.imageUrl || ''} alt={event.name} fill className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white leading-tight">{event.name}</h4>
                    <p className="text-[10px] text-zinc-400 mt-1">{event.city} · {formatDate(event.date)}</p>
                    <p className="text-[10px] text-red-400 font-semibold mt-2.5 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded">
                      Lý do từ chối: {event.reason}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </main>

      <Footer />
    </div>
  );
}
