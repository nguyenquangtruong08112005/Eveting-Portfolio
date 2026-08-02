import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { PopularDestinations } from './PopularDestinations'
import { EventService } from '@/services/event.service'

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

vi.mock('next/image', () => ({
  default: (props: { src: string; alt?: string }) => <img src={props.src} alt={props.alt ?? ''} />,
}))

vi.mock('@/services/event.service', () => ({
  EventService: { getDestinations: vi.fn() },
}))

const messages = JSON.parse(readFileSync(process.cwd() + '/messages/vi.json', 'utf8'))
const destinationsSource = readFileSync(
  new URL('./PopularDestinations.tsx', import.meta.url),
  'utf8',
)

describe('PopularDestinations — loading state', () => {
  it('renders the heading and four skeleton placeholders while loading', () => {
    const html = renderToStaticMarkup(<PopularDestinations onSelectCity={vi.fn()} />)
    expect(html).toContain(messages.home.popular_destinations)
    expect(html.match(/animate-pulse/g)).toHaveLength(4)
  })

  it('defers the destinations fetch until after mount', () => {
    renderToStaticMarkup(<PopularDestinations onSelectCity={vi.fn()} />)
    expect(EventService.getDestinations).not.toHaveBeenCalled()
  })
})

describe('PopularDestinations — destination list rendering', () => {
  it('requests up to four destinations', () => {
    expect(destinationsSource).toMatch(/EventService\.getDestinations\(4\)/)
  })

  it('keeps the built-in fallback cities when the api returns an empty list', () => {
    expect(destinationsSource).toMatch(/useState<Destination\[\]>\(FALLBACK_DESTINATIONS\)/)
    expect(destinationsSource).toMatch(/if \(data\?\.destinations\?\.length\) \{/)
    expect(destinationsSource).toMatch(/setDestinations\(data\.destinations\);/)
  })

  it('keys each city card by its name and forwards the query on click', () => {
    expect(destinationsSource).toMatch(/key=\{city\.name\}/)
    expect(destinationsSource).toMatch(/onClick=\{\(\) => onSelectCity\(city\.query\)\}/)
  })

  it('falls back to the shared image when the city has no curated photo', () => {
    expect(destinationsSource).toMatch(/DESTINATION_IMAGES\[city\.query\] \|\| FALLBACK_IMAGE/)
    expect(destinationsSource).toMatch(/alt=\{city\.name\}/)
  })
})
