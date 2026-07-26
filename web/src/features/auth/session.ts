import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { AuthResponse } from '@/types';

/**
 * Applies session token, user info, and performs role-aware navigation
 * upon successful authentication or social auth exchange.
 */
export function applyAuthSession(
  data: AuthResponse,
  login: (token: string, role: string, uid: string, refreshToken?: string) => void,
  router: AppRouterInstance
): void {
  const roles = data.user?.roles ?? [];
  const role =
    roles.find((r) => r === 'admin') ||
    roles.find((r) => r === 'organizer') ||
    roles[0] ||
    'user';
  const normalizedRole = role === 'user' ? 'attendee' : role;
  login(data.accessToken || '', normalizedRole, data.user?.id || '', data.refreshToken);

  // Persist profile basics for checkout autofill
  if (typeof window !== 'undefined') {
    if (data.user?.email) localStorage.setItem('userEmail', data.user.email);
    if (data.user?.name) localStorage.setItem('userName', data.user.name);
  }

  if (normalizedRole === 'admin') {
    router.push('/admin/moderation');
  } else if (normalizedRole === 'organizer') {
    router.push('/organizer/dashboard');
  } else {
    router.push('/');
  }
}
