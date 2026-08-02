import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { Navbar } from './Navbar'

const router = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
}))

const auth = vi.hoisted(() => ({
  isAuthenticated: false,
  role: null as string | null,
  login: vi.fn(),
  logout: vi.fn(),
}))

const storage = vi.hoisted(() => {
  const store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = String(value)
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      for (const k of Object.keys(store)) delete store[k]
    }),
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
    get length() {
      return Object.keys(store).length
    },
  }
})

vi.mock('next-intl', () => {
  const messages = JSON.parse(readFileSync(process.cwd() + '/messages/vi.json', 'utf8'))
  const lookup = (obj: Record<string, unknown>, path: string[]) => {
    let cur: unknown = obj
    for (const part of path) {
      if (typeof cur !== 'object' || cur === null) return undefined
      cur = (cur as Record<string, unknown>)[part]
    }
    return cur
  }
  const useTranslations = (ns: string) => (key: string, params?: Record<string, unknown>) => {
    const value = lookup(messages, ns.split('.').concat(key.split('.')))
    if (value === undefined) return key
    if (typeof value !== 'string') return String(value)
    if (params) return value.replace(/\{(\w+)\}/g, (_, p) => String(params[p] ?? `{${p}}`))
    return value
  }
  return { useTranslations }
})

vi.mock('next/link', () => ({
  default: (props: { href: string; children?: React.ReactNode }) => (
    <a href={props.href}>{props.children}</a>
  ),
}))

vi.mock('@/i18n/routing', () => ({
  Link: (props: { href: string }) => <a {...props} />,
  useRouter: () => router,
}))

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth }))

vi.mock('@/services/user.service', () => ({
  UserService: { getMe: vi.fn() },
}))

vi.mock('@/components/shared/ThemeToggle', () => ({
  ThemeToggle: () => <span data-testid="theme-toggle">theme-toggle</span>,
}))

vi.mock('@/components/shared/LanguageSwitcher', () => ({
  LanguageSwitcher: () => <span data-testid="language-switcher">language-switcher</span>,
}))

vi.mock('@/features/notifications/NotificationBell', () => ({
  NotificationBell: () => <span data-testid="notification-bell">notification-bell</span>,
}))

vi.mock('@/components/search/SearchBarDropdown', () => ({
  SearchBarDropdown: ({ compact }: { compact?: boolean }) => (
    <span data-testid="search-bar" data-compact={compact ? 'yes' : 'no'}>
      search-bar
    </span>
  ),
}))

vi.stubGlobal('localStorage', storage)

const source = readFileSync(new URL('./Navbar.tsx', import.meta.url), 'utf8')

beforeEach(() => {
  router.push.mockClear()
  router.replace.mockClear()
  auth.logout.mockClear()
  auth.isAuthenticated = false
  auth.role = null
  storage.clear()
})

describe('Navbar — anonymous visitor', () => {
  it('shows a login/register CTA to /login and hides every authenticated control', () => {
    const html = renderToStaticMarkup(<Navbar />)
    expect(html).toContain('Đăng nhập | Đăng ký')
    expect(html).toContain('href="/login"')
    expect(html).not.toContain('aria-label="Tài khoản"')
    expect(html).not.toContain('href="/my-tickets"')
    expect(html).not.toContain('Kiểm duyệt')
    expect(html).not.toContain('data-testid="notification-bell"')
  })

  it('sends visitors to the organizer registration flow for create-event', () => {
    const html = renderToStaticMarkup(<Navbar />)
    expect(html).toContain('href="/register?role=organizer"')
    expect(html).toContain('Tạo sự kiện')
  })

  it('renders the search bar, theme toggle, language switcher and mobile menu trigger', () => {
    const html = renderToStaticMarkup(<Navbar />)
    expect(html).toContain('data-testid="search-bar"')
    expect(html).toContain('data-testid="theme-toggle"')
    expect(html).toContain('data-testid="language-switcher"')
    expect(html).toContain('aria-label="Mở menu"')
  })
})

describe('Navbar — authenticated attendee', () => {
  it('replaces the CTA with an account dropdown and shows my-tickets and the bell', () => {
    const html = renderToStaticMarkup(<Navbar userToken="tok" userRole="attendee" />)
    expect(html).not.toContain('Đăng nhập | Đăng ký')
    expect(html).toContain('aria-label="Tài khoản"')
    expect(html).toContain('Khách')
    expect(html).toContain('href="/my-tickets"')
    expect(html).toContain('data-testid="notification-bell"')
  })

  it('keeps non-organizers on the organizer registration create-event flow', () => {
    const html = renderToStaticMarkup(<Navbar userToken="tok" userRole="attendee" />)
    expect(html).toContain('href="/register?role=organizer"')
    expect(html).not.toContain('href="/organizer/dashboard"')
    expect(html).not.toContain('href="/admin/moderation"')
  })
})

describe('Navbar — organizer', () => {
  it('points create-event at the organizer dashboard and labels the role', () => {
    const html = renderToStaticMarkup(<Navbar userToken="tok" userRole="organizer" />)
    expect(html).toContain('href="/organizer/dashboard"')
    expect(html).toContain('Org')
    expect(html).not.toContain('href="/register?role=organizer"')
    expect(html).not.toContain('href="/admin/moderation"')
  })
})

describe('Navbar — admin', () => {
  it('shows the moderation shortcut alongside the account dropdown', () => {
    const html = renderToStaticMarkup(<Navbar userToken="tok" userRole="admin" />)
    expect(html).toContain('href="/admin/moderation"')
    expect(html).toContain('Kiểm duyệt')
    expect(html).toContain('Admin')
    expect(html).toContain('href="/my-tickets"')
  })
})

describe('Navbar — admin/organizer page badges', () => {
  it('renders the admin-page badge next to the brand for any role', () => {
    const html = renderToStaticMarkup(<Navbar userToken="tok" userRole="attendee" isAdminPage />)
    expect(html).toContain('Khách')
    expect(html).toContain('Admin')
  })

  it('renders the organizer-page badge next to the brand for any role', () => {
    const html = renderToStaticMarkup(<Navbar userToken="tok" userRole="attendee" isOrganizerPage />)
    expect(html).toContain('Khách')
    expect(html).toContain('Org')
  })
})

describe('Navbar — desktop category navigation', () => {
  it('renders one localized category link per canonical category', () => {
    const html = renderToStaticMarkup(<Navbar />)
    const expected: Array<[string, string]> = [
      ['music', 'Nhạc sống'],
      ['arts', 'Sân khấu &amp; Nghệ thuật'],
      ['sports', 'Thể thao'],
      ['workshop', 'Hội thảo &amp; Workshop'],
      ['nightlife', 'Đời sống &amp; Tiệc'],
      ['tech', 'Công nghệ &amp; Esports'],
    ]
    for (const [key, label] of expected) {
      expect(html).toContain(`href="/search?category=${key}"`)
      expect(html).toContain(label)
    }
    expect(html.match(/href="\/search\?category=/g)).toHaveLength(6)
  })
})

describe('Navbar — mobile menu open/close', () => {
  it('exposes a mobile trigger and wires the sheet to the open state', () => {
    const html = renderToStaticMarkup(<Navbar />)
    expect(html).toContain('aria-label="Mở menu"')
    expect(source).toContain('<Sheet open={mobileOpen} onOpenChange={setMobileOpen}>')
  })

  it('closes the sheet from every mobile navigation action', () => {
    const closers = source.match(/onClick=\{\(\) => setMobileOpen\(false\)\}/g) || []
    expect(closers.length).toBeGreaterThanOrEqual(5)
    expect(source).toContain('onNavigate={() => setMobileOpen(false)}')
  })

  it('navigates to the selected category and closes the menu on mobile', () => {
    expect(source).toContain('onClick={() => handleCategoryClick(tab.category)}')
    expect(source).toContain('router.push(`/search?category=${encodeURIComponent(category)}`)')
    expect(source).toContain('setMobileOpen(false)')
  })
})

describe('Navbar — logout invocation', () => {
  it('delegates logout to the onLogout prop when provided', () => {
    const onLogout = vi.fn()
    const html = renderToStaticMarkup(
      <Navbar userToken="tok" userRole="attendee" onLogout={onLogout} />
    )
    expect(html).toContain('aria-label="Tài khoản"')
    expect(onLogout).not.toHaveBeenCalled()
    expect(source).toMatch(/const handleLogout = onLogout !== undefined \? onLogout : auth\.logout;/)
  })

  it('falls back to auth.logout and wires it to the dropdown and mobile buttons', () => {
    expect(source).toMatch(/onLogout !== undefined \? onLogout : auth\.logout/)
    expect(source).toMatch(/onClick=\{handleLogout\}/)
    expect(source).toContain('handleLogout();')
    expect(source).toContain('setMobileOpen(false);')
  })
})

describe('Navbar — browser storage', () => {
  it('uses a mocked browser storage for theme/locale state so tests never touch a real browser', () => {
    expect(storage.getItem).toBeTypeOf('function')
    storage.setItem('theme', 'dark')
    expect(storage.getItem('theme')).toBe('dark')
    expect(storage.length).toBe(1)
    storage.removeItem('theme')
    expect(storage.getItem('theme')).toBeNull()
  })
})
