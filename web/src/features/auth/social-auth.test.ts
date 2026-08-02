import { describe, it, expect, beforeEach } from 'vitest'
import { applyAuthSession } from './session'
import type { AuthResponse } from '../../types/index'

describe('applyAuthSession', () => {
  const storage: Record<string, string> = {}

  beforeEach(() => {
    for (const key of Object.keys(storage)) delete storage[key]
    ;(globalThis as any).window = { location: { hostname: 'localhost' } }
    ;(globalThis as any).localStorage = {
      setItem: (k: string, v: string) => { storage[k] = v },
      getItem: (k: string) => storage[k] || null,
      removeItem: (k: string) => { delete storage[k] },
    }
  })

  it('user / attendee role redirects to / and saves profile to localStorage', () => {
    let loginArgs: { token: string; role: string; uid: string; refreshToken?: string } | null = null
    let pushedRoute: string | null = null

    const mockLogin = (token: string, role: string, uid: string, refreshToken?: string) => {
      loginArgs = { token, role, uid, refreshToken }
    }

    const mockRouter = {
      push: (route: string) => { pushedRoute = route },
      replace: () => {},
      back: () => {},
      forward: () => {},
      refresh: () => {},
      prefetch: async () => {},
    }

    const userAuthData: AuthResponse = {
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      user: { id: 'usr-123', name: 'Nguyen Van A', email: 'a@example.com', roles: ['user'] },
    }

    applyAuthSession(userAuthData, mockLogin, mockRouter as never)

    expect(loginArgs).not.toBeNull()
    expect(loginArgs!.token).toBe('test-access-token')
    expect(loginArgs!.role).toBe('attendee')
    expect(loginArgs!.uid).toBe('usr-123')
    expect(loginArgs!.refreshToken).toBe('test-refresh-token')
    expect(pushedRoute).toBe('/')
    expect(storage['userEmail']).toBe('a@example.com')
    expect(storage['userName']).toBe('Nguyen Van A')
  })

  it('organizer role redirects to /organizer/dashboard', () => {
    let loginArgs: { token: string; role: string; uid: string; refreshToken?: string } | null = null
    let pushedRoute: string | null = null

    const mockLogin = (token: string, role: string, uid: string, refreshToken?: string) => {
      loginArgs = { token, role, uid, refreshToken }
    }

    const mockRouter = {
      push: (route: string) => { pushedRoute = route },
      replace: () => {},
      back: () => {},
      forward: () => {},
      refresh: () => {},
      prefetch: async () => {},
    }

    const orgAuthData: AuthResponse = {
      accessToken: 'org-token',
      user: { id: 'org-456', name: 'Organizer B', email: 'org@example.com', roles: ['organizer'] },
    }

    applyAuthSession(orgAuthData, mockLogin, mockRouter as never)

    expect(loginArgs).not.toBeNull()
    expect(loginArgs!.role).toBe('organizer')
    expect(pushedRoute).toBe('/organizer/dashboard')
  })

  it('admin role redirects to /admin/moderation', () => {
    let loginArgs: { token: string; role: string; uid: string; refreshToken?: string } | null = null
    let pushedRoute: string | null = null

    const mockLogin = (token: string, role: string, uid: string, refreshToken?: string) => {
      loginArgs = { token, role, uid, refreshToken }
    }

    const mockRouter = {
      push: (route: string) => { pushedRoute = route },
      replace: () => {},
      back: () => {},
      forward: () => {},
      refresh: () => {},
      prefetch: async () => {},
    }

    const adminAuthData: AuthResponse = {
      accessToken: 'admin-token',
      user: { id: 'admin-789', name: 'Admin User', email: 'admin@example.com', roles: ['admin'] },
    }

    applyAuthSession(adminAuthData, mockLogin, mockRouter as never)

    expect(loginArgs).not.toBeNull()
    expect(loginArgs!.role).toBe('admin')
    expect(pushedRoute).toBe('/admin/moderation')
  })

  it('empty roles falls back to attendee and redirects to /', () => {
    let loginArgs: { token: string; role: string; uid: string; refreshToken?: string } | null = null
    let pushedRoute: string | null = null

    const mockLogin = (token: string, role: string, uid: string, refreshToken?: string) => {
      loginArgs = { token, role, uid, refreshToken }
    }

    const mockRouter = {
      push: (route: string) => { pushedRoute = route },
      replace: () => {},
      back: () => {},
      forward: () => {},
      refresh: () => {},
      prefetch: async () => {},
    }

    const emptyRolesData: AuthResponse = {
      accessToken: 'fallback-token',
      user: { id: 'usr-999', name: 'Fallback User', email: 'fallback@example.com', roles: [] },
    }

    applyAuthSession(emptyRolesData, mockLogin, mockRouter as never)

    expect(loginArgs).not.toBeNull()
    expect(loginArgs!.role).toBe('attendee')
    expect(pushedRoute).toBe('/')
  })
})
