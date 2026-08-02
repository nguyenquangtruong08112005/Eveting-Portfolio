import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { LayoutDashboard, PlusCircle, TicketPercent } from 'lucide-react'
import { AppShell, type NavItem } from './AppShell'

const auth = vi.hoisted(() => ({
  role: 'organizer' as string | null,
  isAuthenticated: false,
  login: vi.fn(),
  logout: vi.fn(),
}))

const pathnameStore = vi.hoisted(() => ({ current: '/organizer/dashboard' as string | null }))

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
  default: (props: { href: string; className?: string; children?: React.ReactNode }) => (
    <a href={props.href} className={props.className}>
      {props.children}
    </a>
  ),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameStore.current,
}))

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth }))

vi.mock('@/components/shared/ThemeToggle', () => ({
  ThemeToggle: () => <span data-testid="theme-toggle">theme-toggle</span>,
}))

vi.mock('@/components/shared/LanguageSwitcher', () => ({
  LanguageSwitcher: () => <span data-testid="language-switcher">language-switcher</span>,
}))

vi.mock('@/features/notifications/NotificationBell', () => ({
  NotificationBell: () => <span data-testid="notification-bell">notification-bell</span>,
}))

const source = readFileSync(new URL('./AppShell.tsx', import.meta.url), 'utf8')

const ORG_ITEMS: NavItem[] = [
  { href: '/organizer/dashboard', labelKey: 'org_dashboard', icon: LayoutDashboard },
  { href: '/organizer/events/new', labelKey: 'org_create_event', icon: PlusCircle, badge: 3 },
  { href: '/organizer/promotions', labelKey: 'org_promotions', icon: TicketPercent, badge: 0 },
]

function render(props: Partial<React.ComponentProps<typeof AppShell>> = {}) {
  return renderToStaticMarkup(
    <AppShell variant="organizer" items={ORG_ITEMS} heading="Tổ chức" {...props}>
      <p data-testid="content">Main content</p>
    </AppShell>,
  )
}

beforeEach(() => {
  pathnameStore.current = '/organizer/dashboard'
  auth.role = 'organizer'
  auth.logout.mockClear()
})

describe('AppShell — organizer variant', () => {
  it('links the brand to the organizer dashboard and shows the Org badge', () => {
    const html = render()
    expect(html).toContain('href="/organizer/dashboard"')
    expect(html).toContain('Org')
    expect(html).not.toContain('Admin')
  })

  it('renders the mobile trigger, heading and every nav item with its localized label', () => {
    const html = render()
    expect(html).toContain('aria-label="Mở menu"')
    expect(html).toContain('>Tổ chức<')
    expect(html).toContain('href="/organizer/events/new"')
    expect(html).toContain('Bảng điều khiển nhà tổ chức')
    expect(html).toContain('Tạo sự kiện')
    expect(html).toContain('Khuyến mãi')
  })

  it('renders a badge count when > 0 and omits it at 0 or undefined', () => {
    const html = render()
    expect(html).toContain('>3</span>')
    expect(html.match(/\{[0-9]+\}/g)).toBeNull()
    expect(html.split('>0<').length - 1).toBe(0)
  })

  it('renders the back-to-site link, role label and logout button', () => {
    const html = render()
    expect(html).toContain('href="/"')
    expect(html).toContain('Về trang chủ')
    expect(html).toContain('>organizer<')
    expect(html).toContain('Đăng xuất')
  })

  it('renders children inside the main content region', () => {
    const html = render()
    expect(html).toContain('<main')
    expect(html).toContain('<p data-testid="content">Main content</p>')
  })

  it('uses the accent-tinted role badge class for organizers', () => {
    const html = render()
    expect(html).toContain('bg-[var(--accent-brand)]/15')
    expect(html).not.toContain('bg-[var(--error)]/15')
  })
})

describe('AppShell — admin variant', () => {
  it('links the brand to the admin moderation home and shows the Admin badge', () => {
    const html = render({ variant: 'admin' })
    expect(html).toContain('href="/admin/moderation"')
    expect(html).toContain('Admin')
    expect(html).not.toContain('Org')
  })

  it('uses the error-tinted role badge class for admins', () => {
    const html = render({ variant: 'admin' })
    expect(html).toContain('bg-[var(--error)]/15')
    expect(html).not.toContain('bg-[var(--accent-brand)]/15')
  })
})

describe('AppShell — desktop vs mobile navigation', () => {
  it('renders a desktop-only sticky sidebar and a mobile-only top bar', () => {
    const html = render()
    expect(html).toContain('<aside class="hidden lg:flex')
    expect(html).toMatch(/class="lg:hidden sticky/)
    expect(html).toMatch(/class="hidden lg:flex sticky/)
  })

  it('offsets the main content and top utility bar to the right of the sidebar', () => {
    const html = render()
    expect(html).toContain('lg:ml-64')
    expect(html).toContain('<main class="lg:ml-64 flex-1"')
  })

  it('wires the mobile sheet to the open state and labels the drawer with the heading', () => {
    const html = render()
    expect(html).toContain('data-slot="sheet-trigger"')
    expect(html).toContain('>Tổ chức<')
    expect(source).toContain('<Sheet open={mobileOpen} onOpenChange={setMobileOpen}>')
    expect(source).toContain('<SheetContent side="left"')
    expect(source).toContain('<SheetTitle>{heading}</SheetTitle>')
  })

  it('shows theme, language and notification controls in the top bars', () => {
    const html = render()
    expect(html.match(/data-testid="theme-toggle"/g)).toHaveLength(2)
    expect(html.match(/data-testid="language-switcher"/g)).toHaveLength(2)
    expect(html.match(/data-testid="notification-bell"/g)).toHaveLength(2)
  })
})

describe('AppShell — active nav item', () => {
  it('marks the exact-matching item as active', () => {
    pathnameStore.current = '/organizer/dashboard'
    const html = render()
    expect(html).toMatch(/[^:]bg-\[var\(--sidebar-accent\)\](?!\/)/)
    expect(html).toContain('chevron-right')
  })

  it('marks a section item active for nested routes under it', () => {
    pathnameStore.current = '/organizer/events/123'
    const html = render({ items: [{ href: '/organizer/events', labelKey: 'org_dashboard', icon: LayoutDashboard }] })
    expect(html).toMatch(/[^:]bg-\[var\(--sidebar-accent\)\](?!\/)/)
  })

  it('leaves every item inactive for a non-matching pathname', () => {
    pathnameStore.current = '/checkout'
    const html = render()
    expect(html).not.toMatch(/[^:]bg-\[var\(--sidebar-accent\)\](?!\/)/)
    expect(html).not.toContain('chevron-right')
  })

  it('treats a null pathname as inactive', () => {
    pathnameStore.current = null
    const html = render()
    expect(html).not.toMatch(/[^:]bg-\[var\(--sidebar-accent\)\](?!\/)/)
  })
})

describe('AppShell — navigation behavior', () => {
  it('closes the mobile sheet when a nav item is clicked', () => {
    const closers = source.match(/onClick=\{\(\) => setMobileOpen\(false\)\}/g) || []
    expect(closers.length).toBeGreaterThanOrEqual(1)
  })

  it('wires the logout button to auth.logout', () => {
    expect(source).toContain('onClick={logout}')
    expect(auth.logout).not.toHaveBeenCalled()
  })

  it('renders the authenticated role from auth context in the sidebar footer', () => {
    auth.role = 'admin'
    const html = render()
    expect(html).toContain('>admin<')
    expect(html).toContain('capitalize')
  })
})
