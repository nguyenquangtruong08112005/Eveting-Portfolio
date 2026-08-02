import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { PromoBanner } from './PromoBanner'

const bannerSource = readFileSync(new URL('./PromoBanner.tsx', import.meta.url), 'utf8')

const base = {
  badge: 'ShopeePay',
  title: 'Ưu đãi thanh toán',
  body: 'Nhập mã khi thanh toán.',
  cta: 'Nhận Mã',
}

describe('PromoBanner — content rendering', () => {
  it('renders badge, title, body and call to action', () => {
    const html = renderToStaticMarkup(
      <PromoBanner variant="shopee" icon={<span>ico</span>} {...base} />,
    )
    expect(html).toContain('ShopeePay')
    expect(html).toContain('Ưu đãi thanh toán')
    expect(html).toContain('Nhập mã khi thanh toán.')
    expect(html).toContain('Nhận Mã')
    expect(html).toContain('ico')
  })

  it('renders the highlight only when provided', () => {
    const withHighlight = renderToStaticMarkup(
      <PromoBanner variant="shopee" icon={null} {...base} highlight="40.000Đ" />,
    )
    expect(withHighlight).toContain('40.000Đ')

    const withoutHighlight = renderToStaticMarkup(
      <PromoBanner variant="shopee" icon={null} {...base} />,
    )
    expect(withoutHighlight).not.toContain('40.000Đ')
  })

  it('forwards the className to the outer section', () => {
    const html = renderToStaticMarkup(
      <PromoBanner variant="vib" icon={null} className="pt-8" {...base} />,
    )
    expect(html).toMatch(/<section[^>]*class="[^"]*pt-8/)
  })
})

describe('PromoBanner — variants and interaction', () => {
  it('applies the partner-specific gradient and badge color per variant', () => {
    const vib = renderToStaticMarkup(<PromoBanner variant="vib" icon={null} {...base} />)
    expect(vib).toContain('from-[#0C1938]')
    expect(vib).toContain('bg-[var(--primary)]')

    const shopee = renderToStaticMarkup(<PromoBanner variant="shopee" icon={null} {...base} />)
    expect(shopee).toContain('from-[#2B1B0E]')
    expect(shopee).toContain('bg-[#FF7043]')

    const hdbank = renderToStaticMarkup(<PromoBanner variant="hdbank" icon={null} {...base} />)
    expect(hdbank).toContain('from-[#200A0A]')
    expect(hdbank).toContain('bg-[#E31A1A]')
  })

  it('wires the call-to-action button to the onCtaClick handler', () => {
    expect(bannerSource).toMatch(/onClick=\{onCtaClick\}/)
    const html = renderToStaticMarkup(
      <PromoBanner variant="vib" icon={null} {...base} onCtaClick={vi.fn()} />,
    )
    expect(html).toMatch(/<button[^>]*type="button"/)
  })
})
