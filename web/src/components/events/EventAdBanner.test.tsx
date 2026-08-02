import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { EventAdBanner } from './EventAdBanner'

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

const messages = JSON.parse(readFileSync(process.cwd() + '/messages/vi.json', 'utf8'))

describe('EventAdBanner', () => {
  it('renders the ShopeePay promo with translated title, body and cta', () => {
    const html = renderToStaticMarkup(<EventAdBanner />)
    expect(html).toContain('ShopeePay')
    expect(html).toContain('40.000Đ')
    expect(html).toContain(messages.home.promo_shopee_title)
    expect(html).toContain(messages.home.promo_shopee_body)
    expect(html).toContain(messages.home.promo_shopee_cta)
  })

  it('forwards the className to the wrapper', () => {
    const html = renderToStaticMarkup(<EventAdBanner className="mt-4" />)
    expect(html).toMatch(/class="[^"]*mt-4/)
  })

  it('renders a single actionable promo card', () => {
    const html = renderToStaticMarkup(<EventAdBanner />)
    expect(html.match(/<button[^>]*type="button"/g)).toHaveLength(1)
    expect(html.match(/<section/g)).toHaveLength(1)
  })
})
