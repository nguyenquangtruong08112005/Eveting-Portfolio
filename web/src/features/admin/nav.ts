import { ShieldAlert, Activity, Users, MapPin } from 'lucide-react';
import type { NavItem } from '@/components/layout/AppShell';

/**
 * Shared admin sidebar — labelKey resolves via next-intl `common.*`.
 */
export const ADMIN_NAV: NavItem[] = [
  { href: '/admin/moderation', labelKey: 'moderation', icon: ShieldAlert },
  { href: '/admin/observability', labelKey: 'observability', icon: Activity },
  { href: '/admin/users', labelKey: 'users', icon: Users },
  { href: '/admin/venues', labelKey: 'venues_admin', icon: MapPin },
];
