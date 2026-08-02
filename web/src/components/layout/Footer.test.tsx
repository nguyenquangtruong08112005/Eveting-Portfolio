import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { Footer } from './Footer'

const messages = JSON.parse(readFileSync(process.cwd() + '/messages/vi.json', 'utf8'))
const footerMessages = messages.footer as Record<string, unknown>
const policies = footerMessages.policies as string[]

vi.mock('next-intl', () => {
  const msgs = JSON.parse(readFileSync(process.cwd() + '/messages/vi.json', 'utf8'))
  const lookup = (obj: Record<string, unknown>, path: string[]) => {
    let cur: unknown = obj
    for (const part of path) {
      if (typeof cur !== 'object' || cur === null) return undefined
      cur = (cur as Record<string, unknown>)[part]
    }
    return cur
  }
  const useTranslations = (ns: string) => {
    const t = (key: string, params?: Record<string, unknown>) => {
      const value = lookup(msgs, ns.split('.').concat(key.split('.')))
      if (value === undefined) return key
      if (typeof value !== 'string') return String(value)
      if (params) return value.replace(/\{(\w+)\}/g, (_, p) => String(params[p] ?? `{${p}}`))
      return value
    }
    t.raw = (key: string) => lookup(msgs, ns.split('.').concat(key.split('.')))
    return t
  }
  return { useTranslations }
})

vi.mock('@/components/shared/BrandMark', () => ({
  BrandMark: ({ href }: { href?: string }) => (
    <a href={href} data-testid="brand-mark">
      Eventing
    </a>
  ),
}))

const SOCIAL_URLS: Record<string, string> = {
  NEXT_PUBLIC_FACEBOOK_URL: 'https://facebook.com/eventing',
  NEXT_PUBLIC_INSTAGRAM_URL: 'https://instagram.com/eventing',
  NEXT_PUBLIC_TIKTOK_URL: 'https://tiktok.com/@eventing',
  NEXT_PUBLIC_LINKEDIN_URL: 'https://linkedin.com/company/eventing',
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_HOTLINE = '1900 1234'
  process.env.NEXT_PUBLIC_EMAIL = 'hello@eventing.vn'
  for (const [key, value] of Object.entries(SOCIAL_URLS)) {
    process.env[key] = value
  }
})

describe('Footer — top row contact sections', () => {
  it('renders the hotline section with hours and the configured number', () => {
    const html = renderToStaticMarkup(<Footer />)
    expect(html).toContain('Hotline')
    expect(html).toContain('Thứ 2 - Chủ Nhật (8:00 - 23:00)')
    expect(html).toContain('1900 1234')
  })

  it('renders the email and office sections with their content', () => {
    const html = renderToStaticMarkup(<Footer />)
    expect(html).toContain('Email')
    expect(html).toContain('hello@eventing.vn')
    expect(html).toContain('Văn phòng chính')
    expect(html).toContain('Tầng 12, Tòa nhà Viettel, 285 Cách Mạng Tháng Tám')
  })
})

describe('Footer — terms sections', () => {
  it('renders the customer and organizer term entries', () => {
    const html = renderToStaticMarkup(<Footer />)
    expect(html).toContain('Dành cho Khách hàng')
    expect(html).toContain('Điều khoản sử dụng cho khách hàng')
    expect(html).toContain('Dành cho Ban Tổ chức')
    expect(html).toContain('Điều khoản sử dụng cho ban tổ chức')
  })
})

describe('Footer — company policies list', () => {
  it('renders one entry per policy from the i18n array', () => {
    const html = renderToStaticMarkup(<Footer />)
    expect(html).toContain('Về công ty chúng tôi')
    for (const policy of policies) {
      expect(html).toContain(policy)
    }
    expect(html.match(/<li /g)).toHaveLength(policies.length)
  })
})

describe('Footer — app store buttons', () => {
  it('renders Google Play and App Store buttons for both app sections', () => {
    const html = renderToStaticMarkup(<Footer />)
    expect(html).toContain('Ứng dụng Eventing')
    expect(html).toContain('Ứng dụng check-in cho Ban tổ chức')
    expect(html.match(/Google Play/g)).toHaveLength(2)
    expect(html.match(/App Store/g)).toHaveLength(2)
    expect(html.match(/Tải ứng dụng trên/g)).toHaveLength(2)
    expect(html.match(/Tải về trên/g)).toHaveLength(2)
  })
})

describe('Footer — social links', () => {
  it('links each social platform to its configured URL with an accessible label', () => {
    const html = renderToStaticMarkup(<Footer />)
    expect(html).toContain('aria-label="Facebook"')
    expect(html).toContain('aria-label="Instagram"')
    expect(html).toContain('aria-label="TikTok"')
    expect(html).toContain('aria-label="LinkedIn"')
    for (const url of Object.values(SOCIAL_URLS)) {
      expect(html).toContain(`href="${url}"`)
    }
  })

  it('falls back to "#" for every social link when no URL is configured', () => {
    for (const key of Object.keys(SOCIAL_URLS)) {
      delete process.env[key]
    }
    const html = renderToStaticMarkup(<Footer />)
    expect(html.match(/href="#"/g)).toHaveLength(4)
  })
})

describe('Footer — language controls', () => {
  it('renders the Vietnamese active badge and English inactive badge with flags', () => {
    const html = renderToStaticMarkup(<Footer />)
    expect(html).toContain('Ngôn ngữ')
    expect(html).toContain('Tiếng Việt')
    expect(html).toContain('English')
    expect(html).toContain('🇻🇳')
    expect(html).toContain('🇬🇧')
  })

  it('styles the active badge differently from the inactive one', () => {
    const html = renderToStaticMarkup(<Footer />)
    expect(html).toContain('bg-[var(--surface)] border')
    expect(html).toContain('bg-[var(--background)]/40')
  })
})

describe('Footer — bottom row', () => {
  it('links the brand back to the site root and shows the platform tagline', () => {
    const html = renderToStaticMarkup(<Footer />)
    expect(html).toContain('href="/"')
    expect(html).toContain('data-testid="brand-mark"')
    expect(html).toContain('Nền tảng quản lý và phân phối vé sự kiện hàng đầu Việt Nam')
  })

  it('renders the copyright line with a four-digit year', () => {
    const html = renderToStaticMarkup(<Footer />)
    const copyright = footerMessages.copyright as string
    const year = copyright.match(/© (\d{4})/)?.[1]
    expect(year).toMatch(/^\d{4}$/)
    expect(html).toContain(copyright)
  })

  it('renders the portfolio demo disclaimer title and body', () => {
    const html = renderToStaticMarkup(<Footer />)
    expect(html).toContain('Dự Án Portfolio Demo')
    expect(html).toContain('Website này là sản phẩm thử nghiệm và portfolio cá nhân')
  })
})
