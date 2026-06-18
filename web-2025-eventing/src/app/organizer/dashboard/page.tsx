'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { StatsGrid } from '@/components/organizer/StatsGrid';
import { EventManageTable } from '@/components/organizer/EventManageTable';
import { LedgerEntries } from '@/components/organizer/LedgerEntries';

export default function OrganizerDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  const [stats, setStats] = useState({
    totalSales: 24,
    grossRevenue: 5400000,
    platformFees: 270000,
    netRevenue: 5130000
  });

  const [events, setEvents] = useState([
    { id: 'evt_1', name: 'Neo-Tokyo Symphony 2026', status: 'active', sold: 18, capacity: 60, price: 150000 },
    { id: 'evt_2', name: 'AI & Art Frontiers Exhibition', status: 'active', sold: 6, capacity: 100, price: 75000 },
    { id: 'evt_3', name: 'Sunset Beats & Lounge Poolside', status: 'draft', sold: 0, capacity: 50, price: 200000 }
  ]);

  const [ledgerEntries, setLedgerEntries] = useState([
    { id: 'led_1', orderId: 'ord_101', eventName: 'Neo-Tokyo Symphony 2026', gross: 300000, fee: 15000, net: 285000, date: Date.now() - 3600000 },
    { id: 'led_2', orderId: 'ord_102', eventName: 'Neo-Tokyo Symphony 2026', gross: 150000, fee: 7500, net: 142500, date: Date.now() - 7200000 },
    { id: 'led_3', orderId: 'ord_103', eventName: 'AI & Art Frontiers Exhibition', gross: 75000, fee: 3750, net: 71250, date: Date.now() - 14400000 }
  ]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    setUserToken(token);
    setUserRole(role);

    // Fetch organizer events / ledger if server is online
    fetch('http://localhost:3000/organizer/ledger', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.entries)) {
          setLedgerEntries(data.entries);
        }
      })
      .catch(() => {});

    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('uid');
    setUserToken(null);
    setUserRole(null);
    router.push('/login');
  };

  return (
    <div className="flex-1 flex flex-col relative bg-[#09090b] min-h-screen">
      {/* Navbar Layout */}
      <Navbar userToken={userToken} userRole={userRole} onLogout={handleLogout} isOrganizerPage />

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-12 w-full flex-grow text-left">
        <h1 className="text-3xl font-bold text-white mb-8">Organizer Dashboard</h1>

        {/* Stats Grid */}
        <StatsGrid stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Event List Section */}
          <section className="lg:col-span-2 premium-card p-6 rounded-2xl">
            <h3 className="text-lg font-bold text-white mb-6">Manage Events</h3>
            <EventManageTable events={events} />
          </section>

          {/* Ledger Logs Section */}
          <section>
            <LedgerEntries entries={ledgerEntries} />
          </section>
        </div>
      </main>

      {/* Footer Layout */}
      <Footer />
    </div>
  );
}
