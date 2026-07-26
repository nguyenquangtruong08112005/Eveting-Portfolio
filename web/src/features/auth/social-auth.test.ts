/**
 * Run: node --experimental-strip-types src/features/auth/social-auth.test.ts
 * from web directory.
 */
import { applyAuthSession } from './session.ts';
import type { AuthResponse } from '../../types/index.ts';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

// Mock window and localStorage
const storage: Record<string, string> = {};
(globalThis as unknown as { window: unknown }).window = {
  location: { hostname: 'localhost' },
};
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  setItem: (k: string, v: string) => {
    storage[k] = v;
  },
  getItem: (k: string) => storage[k] || null,
  removeItem: (k: string) => {
    delete storage[k];
  },
};

async function testApplyAuthSession() {
  let loginArgs: { token: string; role: string; uid: string; refreshToken?: string } | null = null;
  let pushedRoute: string | null = null;

  const mockLogin = (token: string, role: string, uid: string, refreshToken?: string) => {
    loginArgs = { token, role, uid, refreshToken };
  };

  const mockRouter = {
    push: (route: string) => {
      pushedRoute = route;
    },
    replace: () => {},
    back: () => {},
    forward: () => {},
    refresh: () => {},
    prefetch: async () => {},
  };

  // Test 1: User / Attendee role redirect to '/'
  const userAuthData: AuthResponse = {
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    user: {
      id: 'usr-123',
      name: 'Nguyen Van A',
      email: 'a@example.com',
      roles: ['user'],
    },
  };

  applyAuthSession(userAuthData, mockLogin, mockRouter as never);

  assert(loginArgs !== null, 'login callback was called');
  const args1 = loginArgs as unknown as { token: string; role: string; uid: string; refreshToken?: string };
  assert(args1.token === 'test-access-token', 'token passed correctly');
  assert(args1.role === 'attendee', 'user role normalized to attendee');
  assert(args1.uid === 'usr-123', 'uid passed correctly');
  assert(args1.refreshToken === 'test-refresh-token', 'refreshToken passed correctly');
  assert(pushedRoute === '/', 'user redirected to home /');
  assert(storage['userEmail'] === 'a@example.com', 'userEmail saved to localStorage');
  assert(storage['userName'] === 'Nguyen Van A', 'userName saved to localStorage');

  // Test 2: Organizer role redirect to '/organizer/dashboard'
  loginArgs = null;
  pushedRoute = null;
  const orgAuthData: AuthResponse = {
    accessToken: 'org-token',
    user: {
      id: 'org-456',
      name: 'Organizer B',
      email: 'org@example.com',
      roles: ['organizer'],
    },
  };

  applyAuthSession(orgAuthData, mockLogin, mockRouter as never);
  assert(loginArgs !== null, 'login callback was called');
  const args2 = loginArgs as unknown as { token: string; role: string; uid: string; refreshToken?: string };
  assert(args2.role === 'organizer', 'organizer role preserved');
  assert(pushedRoute === '/organizer/dashboard', 'organizer redirected to /organizer/dashboard');

  // Test 3: Admin role redirect to '/admin/moderation'
  loginArgs = null;
  pushedRoute = null;
  const adminAuthData: AuthResponse = {
    accessToken: 'admin-token',
    user: {
      id: 'admin-789',
      name: 'Admin User',
      email: 'admin@example.com',
      roles: ['admin'],
    },
  };

  applyAuthSession(adminAuthData, mockLogin, mockRouter as never);
  assert(loginArgs !== null, 'login callback was called');
  const args3 = loginArgs as unknown as { token: string; role: string; uid: string; refreshToken?: string };
  assert(args3.role === 'admin', 'admin role preserved');
  assert(pushedRoute === '/admin/moderation', 'admin redirected to /admin/moderation');

  // Test 4: Default attendee fallback when roles empty
  loginArgs = null;
  pushedRoute = null;
  const emptyRolesData: AuthResponse = {
    accessToken: 'fallback-token',
    user: {
      id: 'usr-999',
      name: 'Fallback User',
      email: 'fallback@example.com',
      roles: [],
    },
  };
  applyAuthSession(emptyRolesData, mockLogin, mockRouter as never);
  assert(loginArgs !== null, 'login callback was called');
  const args4 = loginArgs as unknown as { token: string; role: string; uid: string; refreshToken?: string };
  assert(args4.role === 'attendee', 'empty roles falls back to attendee');
  assert(pushedRoute === '/', 'empty roles redirects to /');

  console.log('social-auth.test.ts: all assertions passed');
}

await testApplyAuthSession();
