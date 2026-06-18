'use client';

import React from 'react';
import Link from 'next/link';
import { Flame } from 'lucide-react';

const footerLinks = [
  {
    title: 'Sản phẩm',
    links: [
      { label: 'Khám phá sự kiện', href: '/' },
      { label: 'Đặt vé', href: '/' },
      { label: 'Chọn ghế ngồi', href: '/' },
    ],
  },
  {
    title: 'Ban tổ chức',
    links: [
      { label: 'Dashboard', href: '/organizer/dashboard' },
      { label: 'Quản lý sự kiện', href: '/organizer/dashboard' },
      { label: 'Báo cáo doanh thu', href: '/organizer/dashboard' },
    ],
  },
  {
    title: 'Hỗ trợ',
    links: [
      { label: 'Trung tâm trợ giúp', href: '#' },
      { label: 'Liên hệ', href: '#' },
      { label: 'Điều khoản sử dụng', href: '#' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="w-full border-t border-[var(--surface-border)] bg-[var(--surface)]">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-extrabold text-lg text-[var(--text-primary)] mb-3">
              <div className="size-7 rounded-md bg-gradient-to-br from-[#F76B10] to-[#FF9C5B] flex items-center justify-center">
                <Flame className="size-3.5 text-[var(--on-primary)]" />
              </div>
              <span>
                Aura<span className="text-[var(--primary-dark)]">Events</span>
              </span>
            </Link>
            <p className="text-[var(--text-muted)] text-sm leading-relaxed">
              Nền tảng khám phá và đặt vé sự kiện trực tuyến hàng đầu Việt Nam.
            </p>
          </div>

          {/* Link Columns */}
          {footerLinks.map((group) => (
            <div key={group.title}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-4">
                {group.title}
              </h4>
              <ul className="space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-[var(--text-muted)] hover:text-[var(--primary-dark)] transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 pt-6 border-t border-[var(--surface-border)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[var(--text-muted)] text-xs">
            © 2026 AuraEvents. Phase P — Business Redesign & Web Expansion.
          </p>
          <p className="text-[var(--text-muted)] text-xs">
            TDT University — Mobile Development Final Project
          </p>
        </div>
      </div>
    </footer>
  );
}
