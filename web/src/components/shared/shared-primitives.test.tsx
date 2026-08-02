import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { BrandMark } from './BrandMark'
import { EmptyState } from './EmptyState'
import { ErrorState } from './ErrorState'
import { LanguageSwitcher } from './LanguageSwitcher'
import { PageHeader } from './PageHeader'
import { Spinner } from './Spinner'
import { ThemeToggle } from './ThemeToggle'
import { ToastHost } from './ToastHost'
import type { LucideIcon } from 'lucide-react'

// Force client-only components to their post-mount state so static markup
// reaches the visible branches: LanguageSwitcher dropdown open, ThemeToggle
// mounted toggle. react-dom/server itself is unaffected.
vi.mock('react', async (importOriginal) => {
  const actual: any = await importOriginal()
  return {
    ...actual,
    useState: (initial: unknown) => actual.useState(initial === false ? true : initial),
  }
})

const intl = vi.hoisted(() => ({
  locale: 'vi',
  overrides: new Map<string, string>(),
}))

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
    const override = intl.overrides.get(`${ns}.${key}`)
    const value = override ?? lookup(messages, ns.split('.').concat(key.split('.')))
    if (value === undefined) return key
    if (typeof value !== 'string') return String(value)
    if (params) return value.replace(/\{(\w+)\}/g, (_, p) => String(params[p] ?? `{${p}}`))
    return value
  }
  return { useTranslations, useLocale: () => intl.locale }
})

const router = vi.hoisted(() => ({ replace: vi.fn() }))

vi.mock('@/i18n/routing', () => ({
  useRouter: () => router,
  usePathname: () => '/current/path',
}))

const localeCtx = vi.hoisted(() => ({ setLocale: vi.fn() }))

vi.mock('@/components/shared/Providers', () => ({
  useLocaleState: () => ({ locale: intl.locale, setLocale: localeCtx.setLocale }),
}))

const themeCtx = vi.hoisted(() => ({ theme: 'light', setTheme: vi.fn() }))

vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: themeCtx.theme, setTheme: themeCtx.setTheme }),
}))

const toastProps = vi.hoisted(() => ({ value: null as Record<string, unknown> | null }))

vi.mock('@/components/ui/sonner', () => ({
  Toaster: (props: Record<string, unknown>) => {
    toastProps.value = props
    return <div data-testid="sonner-toaster" />
  },
}))

vi.mock('lucide-react', () => {
  const makeIcon = (testid: string) => {
    function Icon(props: Record<string, unknown>) {
      return <svg data-testid={testid} {...props} />
    }
    return Icon
  }
  return {
    Flame: makeIcon('flame'),
    Inbox: makeIcon('inbox'),
    AlertCircle: makeIcon('alert-circle'),
    RefreshCw: makeIcon('refresh-cw'),
    ChevronDown: makeIcon('chevron-down'),
    Loader2: makeIcon('loader'),
    Sun: makeIcon('sun'),
    Moon: makeIcon('moon'),
  }
})

beforeEach(() => {
  intl.locale = 'vi'
  intl.overrides.clear()
  themeCtx.theme = 'light'
  router.replace.mockClear()
  localeCtx.setLocale.mockClear()
  themeCtx.setTheme.mockClear()
  toastProps.value = null
})

describe('BrandMark', () => {
  it('renders the translated app name with the flame icon as plain content by default', () => {
    const html = renderToStaticMarkup(<BrandMark />)
    expect(html).toContain('Eventing')
    expect(html).toContain('data-testid="flame"')
    expect(html).not.toMatch(/<a\b/)
  })

  it('renders the tagline only when the translation provides one', () => {
    const without = renderToStaticMarkup(<BrandMark />)
    expect(without).not.toContain('Vé sự kiện')

    intl.overrides.set('common.app_tagline', 'Vé sự kiện')
    const withTagline = renderToStaticMarkup(<BrandMark />)
    expect(withTagline).toContain('Vé sự kiện')
  })

  it('renders an anchor to the default href when asLink is set', () => {
    const html = renderToStaticMarkup(<BrandMark asLink />)
    expect(html).toMatch(/<a\b/)
    expect(html).toContain('href="/"')
  })

  it('honors a custom href when asLink is set', () => {
    const html = renderToStaticMarkup(<BrandMark asLink href="/admin" />)
    expect(html).toContain('href="/admin"')
  })

  it('applies the size variant to the icon tile', () => {
    expect(renderToStaticMarkup(<BrandMark size="sm" />)).toContain('size-7')
    expect(renderToStaticMarkup(<BrandMark size="md" />)).toContain('size-8')
    expect(renderToStaticMarkup(<BrandMark size="lg" />)).toContain('size-9')
  })

  it('forwards className to the lockup', () => {
    const html = renderToStaticMarkup(<BrandMark className="px-2" />)
    expect(html).toContain('px-2')
  })
})

describe('EmptyState', () => {
  it('renders the default translated title and inbox icon', () => {
    const html = renderToStaticMarkup(<EmptyState />)
    expect(html).toContain('Chưa có nội dung')
    expect(html).toContain('data-testid="inbox"')
  })

  it('renders a custom title override instead of the default', () => {
    const html = renderToStaticMarkup(<EmptyState title="Không có kết quả" />)
    expect(html).toContain('Không có kết quả')
    expect(html).not.toContain('Chưa có nội dung')
  })

  it('renders the description and action only when provided', () => {
    const withBoth = renderToStaticMarkup(
      <EmptyState description="Thử bộ lọc khác" action={<button>Đặt lại</button>} />,
    )
    expect(withBoth).toContain('Thử bộ lọc khác')
    expect(withBoth).toContain('Đặt lại')

    const bare = renderToStaticMarkup(<EmptyState />)
    expect(bare).not.toContain('Thử bộ lọc khác')
    expect(bare).not.toContain('Đặt lại')
  })

  it('renders the provided icon instead of the default inbox', () => {
    const html = renderToStaticMarkup(<EmptyState icon={CustomIconStub as unknown as LucideIcon} />)
    expect(html).not.toContain('data-testid="inbox"')
    expect(html).toContain('data-testid="custom-icon"')
  })

  it('forwards className to the container', () => {
    const html = renderToStaticMarkup(<EmptyState className="max-w-md" />)
    expect(html).toContain('max-w-md')
  })
})

describe('ErrorState', () => {
  it('renders an alert with the default translated title, message and retry button', () => {
    const html = renderToStaticMarkup(<ErrorState />)
    expect(html).toContain('role="alert"')
    expect(html).toContain('Đã có lỗi xảy ra')
    expect(html).toContain('Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.')
    expect(html).toContain('Thử lại')
    expect(html).toContain('data-testid="alert-circle"')
    expect(html).toContain('data-testid="refresh-cw"')
  })

  it('renders custom title and message overrides', () => {
    const html = renderToStaticMarkup(<ErrorState title="Lỗi mạng" message="Mất kết nối" />)
    expect(html).toContain('Lỗi mạng')
    expect(html).toContain('Mất kết nối')
    expect(html).not.toContain('Đã có lỗi xảy ra')
  })

  it('invokes onRetry when provided, otherwise reloads the page', () => {
    const source = readFileSync(new URL('./ErrorState.tsx', import.meta.url), 'utf8')
    expect(source).toContain('onClick={handleRetry}')
    expect(source).toContain('if (onRetry) onRetry()')
    expect(source).toContain("window.location.reload()")
  })
})

describe('LanguageSwitcher', () => {
  it('shows the current locale flag on the trigger', () => {
    const vi = renderToStaticMarkup(<LanguageSwitcher />)
    expect(vi).toContain('🇻🇳')

    intl.locale = 'en'
    const en = renderToStaticMarkup(<LanguageSwitcher />)
    expect(en).toContain('🇬🇧')
  })

  it('renders both locale options with the current one styled as active', () => {
    const html = renderToStaticMarkup(<LanguageSwitcher />)
    expect(html).toContain('Tiếng Việt')
    expect(html).toContain('English')
    expect((html.match(/font-semibold/g) || []).length).toBe(1)
    expect(html).toContain('text-[var(--primary)] font-semibold')
  })

  it('marks English as the active option when the locale is en', () => {
    intl.locale = 'en'
    const html = renderToStaticMarkup(<LanguageSwitcher />)
    expect((html.match(/font-semibold/g) || []).length).toBe(1)
    expect(html).toContain('text-[var(--primary)] font-semibold')
  })

  it('wires locale switching to the locale state and the router', () => {
    const source = readFileSync(new URL('./LanguageSwitcher.tsx', import.meta.url), 'utf8')
    expect(source).toContain('setLocaleState(next)')
    expect(source).toContain('router.replace(pathname, { locale: next })')
    expect(source).toContain('setOpen(false)')
  })

  it('closes the dropdown when clicking outside', () => {
    const source = readFileSync(new URL('./LanguageSwitcher.tsx', import.meta.url), 'utf8')
    expect(source).toContain("document.addEventListener('mousedown', handleClickOutside)")
    expect(source).toContain('setOpen(false)')
  })
})

describe('PageHeader', () => {
  it('renders the title and optional description', () => {
    const withDescription = renderToStaticMarkup(<PageHeader title="Vé của tôi" description="Danh sách vé đã mua" />)
    expect(withDescription).toContain('Vé của tôi')
    expect(withDescription).toContain('Danh sách vé đã mua')

    const bare = renderToStaticMarkup(<PageHeader title="Vé của tôi" />)
    expect(bare).not.toContain('Danh sách vé đã mua')
  })

  it('renders the icon chip only when an icon is provided', () => {
    const withIcon = renderToStaticMarkup(<PageHeader title="T" icon={<span>ico</span>} />)
    expect(withIcon).toContain('ico')

    const withoutIcon = renderToStaticMarkup(<PageHeader title="T" />)
    expect(withoutIcon).not.toContain('ico')
  })

  it('renders actions only when provided', () => {
    const withActions = renderToStaticMarkup(<PageHeader title="T" actions={<button>Tạo mới</button>} />)
    expect(withActions).toContain('Tạo mới')

    const withoutActions = renderToStaticMarkup(<PageHeader title="T" />)
    expect(withoutActions).not.toContain('Tạo mới')
  })

  it('forwards className to the header container', () => {
    const html = renderToStaticMarkup(<PageHeader title="T" className="sticky top-0" />)
    expect(html).toContain('sticky top-0')
  })
})

describe('Spinner', () => {
  it('renders a status loader with the given label', () => {
    const html = renderToStaticMarkup(<Spinner label="Đang tải" />)
    expect(html).toContain('role="status"')
    expect(html).toContain('aria-label="Đang tải"')
    expect(html).toContain('data-testid="loader"')
  })

  it('omits the label when none is provided and forwards className', () => {
    const html = renderToStaticMarkup(<Spinner className="size-8" />)
    expect(html).toContain('role="status"')
    expect(html).not.toContain('aria-label')
    expect(html).toContain('size-8')
  })
})

describe('ThemeToggle', () => {
  it('renders the sun icon in dark mode and labels the switch to light', () => {
    themeCtx.theme = 'dark'
    const html = renderToStaticMarkup(<ThemeToggle />)
    expect(html).toContain('data-testid="sun"')
    expect(html).toContain('aria-label="Chuyển giao diện sáng"')
    expect(html).not.toContain('data-testid="moon"')
  })

  it('renders the moon icon in light mode and labels the switch to dark', () => {
    const html = renderToStaticMarkup(<ThemeToggle />)
    expect(html).toContain('data-testid="moon"')
    expect(html).toContain('aria-label="Chuyển giao diện tối"')
    expect(html).not.toContain('data-testid="sun"')
  })

  it('wires the toggle click to setTheme with the opposite theme', () => {
    const source = readFileSync(new URL('./ThemeToggle.tsx', import.meta.url), 'utf8')
    expect(source).toContain("setTheme(isDark ? 'light' : 'dark')")
  })

  it('forwards className to the toggle button', () => {
    const html = renderToStaticMarkup(<ThemeToggle className="ml-auto" />)
    expect(html).toContain('ml-auto')
  })
})

describe('ToastHost', () => {
  it('mounts the sonner toaster with the app-wide configuration', () => {
    const html = renderToStaticMarkup(<ToastHost />)
    expect(html).toContain('data-testid="sonner-toaster"')
    expect(toastProps.value).toMatchObject({
      position: 'bottom-right',
      richColors: true,
      closeButton: true,
    })
    expect((toastProps.value?.toastOptions as { classNames: { toast: string } }).classNames.toast).toBe('font-sans')
  })
})

function CustomIconStub(props: Record<string, unknown>) {
  return <svg data-testid="custom-icon" {...props} />
}
