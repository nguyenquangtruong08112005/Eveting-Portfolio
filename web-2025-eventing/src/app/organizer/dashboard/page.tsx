'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Calendar, DollarSign, Percent, ArrowUpRight, TrendingUp, Receipt } from 'lucide-react';

export default function OrganizerDashboard() {
  const [loading, setLoading] = useState(true);
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
    // Attempt to load from real backend endpoints
    const token = localStorage.getItem('token');
    
    // We fetch organizer events / ledger if server is online
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

  return (
    <div className="flex-1 flex flex-col relative bg-[#09090b]">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-white">
            <Sparkles className="h-6 w-6 text-purple-400 glow-text" />
            <span>Aura<span className="text-purple-400">Events</span></span>
            <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full border border-purple-500/30 bg-purple-500/5 text-purple-300 ml-2">ORGANIZER</span>
          </div>
          <a href="/" className="text-xs text-zinc-400 hover:text-white transition-all">
            Back to Home
          </a>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-12 w-full flex-grow text-left">
        <h1 className="text-3xl font-bold text-white mb-8">Organizer Dashboard</h1>

        {/* Stats Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="premium-card p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Tickets Sold</span>
              <TrendingUp className="h-4 w-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-white mb-1">{stats.totalSales}</div>
            <span className="text-[10px] text-zinc-500">+12% from last week</span>
          </div>

          <div className="premium-card p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Gross Revenue</span>
              <DollarSign className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-cyan-400 mb-1">{stats.grossRevenue.toLocaleString('vi-VN')} ₫</div>
            <span className="text-[10px] text-zinc-500">Platform rate configured: 5%</span>
          </div>

          <div className="premium-card p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Platform Fees</span>
              <Percent className="h-4 w-4 text-red-400" />
            </div>
            <div className="text-2xl font-bold text-red-400 mb-1">{stats.platformFees.toLocaleString('vi-VN')} ₫</div>
            <span className="text-[10px] text-zinc-500">Calculated dynamic ledger deduction</span>
          </div>

          <div className="premium-card p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Net Payout Balance</span>
              <DollarSign className="h-4 w-4 text-green-400" />
            </div>
            <div className="text-2xl font-bold text-green-400 mb-1">{stats.netRevenue.toLocaleString('vi-VN')} ₫</div>
            <span className="text-[10px] text-zinc-500">Available for instant withdrawal</span>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Event List */}
          <section className="lg:col-span-2 premium-card p-6 rounded-2xl">
            <h3 className="text-lg font-bold text-white mb-6">Manage Events</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400">
                    <th className="pb-3 font-semibold">Event Name</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold">Sales / Capacity</th>
                    <th className="pb-3 font-semibold text-right">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850">
                  {events.map((evt) => (
                    <tr key={evt.id} className="text-zinc-300">
                      <td className="py-4 font-semibold text-white">{evt.name}</td>
                      <td className="py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                          evt.status === 'active' 
                            ? 'border-green-500/20 bg-green-500/5 text-green-400' 
                            : 'border-zinc-800 bg-zinc-900 text-zinc-500'
                        }`}>
                          {evt.status}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{evt.sold}</span>
                          <span className="text-zinc-500">/ {evt.capacity}</span>
                          <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500" style={{ width: `${(evt.sold / evt.capacity) * 100}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-4 text-right font-bold text-cyan-400">{evt.price.toLocaleString('vi-VN')} ₫</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Ledger Logs */}
          <section className="premium-card p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-1.5">
                <Receipt className="h-5 w-5 text-purple-400" />
                Ledger Payout Logs
              </h3>

              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {ledgerEntries.map((led) => (
                  <div key={led.id} className="p-3.5 border border-zinc-800 bg-zinc-900/30 rounded-xl text-xs flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-white line-clamp-1">{led.eventName}</span>
                      <span className="text-[10px] text-zinc-500 font-mono uppercase">{led.orderId}</span>
                    </div>

                    <div className="flex justify-between items-center text-zinc-400">
                      <span>Gross subtotal:</span>
                      <span className="font-semibold">{led.gross.toLocaleString('vi-VN')} ₫</span>
                    </div>

                    <div className="flex justify-between items-center text-red-400">
                      <span>Platform fee (5%):</span>
                      <span>-{led.fee.toLocaleString('vi-VN')} ₫</span>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-zinc-800 text-green-400 font-bold">
                      <span>Net Credit:</span>
                      <span>+{led.net.toLocaleString('vi-VN')} ₫</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button className="w-full mt-6 py-3 rounded-xl border border-zinc-850 hover:bg-zinc-900 transition-all font-semibold text-xs tracking-wider uppercase text-zinc-300 flex items-center justify-center gap-1.5 cursor-pointer">
              Withdraw All Funds
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </section>
        </div>
      </main>
    </div>
  );
}
