import {
  LayoutDashboard,
  PlusCircle,
  TicketPercent,
  MapPin,
  QrCode,
  Wallet,
} from 'lucide-react';
import type { NavItem } from '@/components/layout/AppShell';

/**
 * Shared organizer sidebar — labelKey resolves via next-intl `common.*`.
 */
export const ORG_NAV: NavItem[] = [
  { href: '/organizer/dashboard', labelKey: 'org_dashboard', icon: LayoutDashboard },
  { href: '/organizer/events/new', labelKey: 'org_create_event', icon: PlusCircle },
  { href: '/organizer/promotions', labelKey: 'org_promotions', icon: TicketPercent },
  { href: '/organizer/venues', labelKey: 'org_venues', icon: MapPin },
  { href: '/organizer/check-in', labelKey: 'org_check_in', icon: QrCode },
  { href: '/organizer/finance', labelKey: 'org_finance', icon: Wallet },
];
