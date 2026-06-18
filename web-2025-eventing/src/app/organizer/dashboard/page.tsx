'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { StatsGrid } from '@/components/organizer/StatsGrid';
import { EventManageTable } from '@/components/organizer/EventManageTable';
import { LedgerEntries } from '@/components/organizer/LedgerEntries';
import { useAuth } from '@/hooks/useAuth';
import { organizerApi } from '@/lib/api';
import type { OrganizerStats, OrganizerEvent, LedgerEntry } from '@/types';

const MOCK_STATS: OrganizerStats = {
  totalSales: 24,
  grossRevenue: 5400000,
  platformFees: 270000,
  netRevenue: 5130000,
};

const MOCK_EVENTS: OrganizerEvent[] = [
  { id: 'evt_1', name: 'Neo-Tokyo Symphony 2026', status: 'active', sold: 18, capacity: 60, price: 150000 },
  { id: 'evt_2', name: 'Triển lãm AI & Nghệ thuật', status: 'active', sold: 6, capacity: 100, price: 75000 },
  { id: 'evt_3', name: 'Sunset Beats — Poolside', status: 'draft', sold: 0, capacity: 50, price: 200000 },
];

const MOCK_LEDGER: LedgerEntry[] = [
  { id: 'led_1', orderId: 'ord_101', eventName: 'Neo-Tokyo Symphony 2026', gross: 300000, fee: 15000, net: 285000, date: Date.now() - 3600000 },
  { id: 'led_2', orderId: 'ord_102', eventName: 'Neo-Tokyo Symphony 2026', gross: 150000, fee: 7500, net: 142500, date: Date.now() - 7200000 },
  { id: 'led_3', orderId: 'ord_103', eventName: 'Triển lãm AI & Nghệ thuật', gross: 75000, fee: 3750, net: 71250, date: Date.now() - 14400000 },
];

export default function OrganizerDashboard() {
  const { token, role, logout } = useAuth();
  const [stats] = useState<OrganizerStats>(MOCK_STATS);
  const [events] = useState<OrganizerEvent[]>(MOCK_EVENTS);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>(MOCK_LEDGER);

  useEffect(() => {
    if (!token) return;
    organizerApi
      .getLedger(token)
      .then((data) => {
        if (data?.entries?.length) setLedgerEntries(data.entries);
      })
      .catch(() => {
        /* use mock data */
      });
  }, [token]);

  return (
    <div className="flex-1 flex flex-col bg-[var(--background)] min-h-screen">
      <Navbar userToken={token} userRole={role} onLogout={logout} isOrganizerPage />

      <main className="max-w-7xl mx-auto px-6 py-10 w-full flex-grow">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-8">
          Dashboard Ban tổ chức
        </h1>

        <StatsGrid stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Event Management */}
          <section className="lg:col-span-2 aura-card p-5">
            <h3 className="text-base font-bold text-[var(--text-primary)] mb-5">
              Quản lý sự kiện
            </h3>
            <EventManageTable events={events} />
          </section>

          {/* Ledger */}
          <section>
            <LedgerEntries entries={ledgerEntries} />
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
