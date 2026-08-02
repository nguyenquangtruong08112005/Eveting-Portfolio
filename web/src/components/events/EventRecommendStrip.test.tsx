import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { EventRecommendStrip } from './EventRecommendStrip'
import { EventService } from '@/services/event.service'
import type { Event } from '@/types'
import type * as React from 'react'

const injectedState = vi.hoisted(() => ({ values: [] as unknown[] }))

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    useState: (initial: unknown) => {
      if (injectedState.values.length > 0) {
        return [injectedState.values.shift(), () => {}]
      }
      return [initial, () => {}]
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
  default: (props: { href: string; children: React.ReactNode; className?: string; 'aria-label'?: string }) => (
    <a href={props.href} className={props.className} aria-label={props['aria-label']}>
      {props.children}
    </a>
  ),
}))

vi.mock('@/components/shared/SafeImage', () => ({
  SafeImage: (props: { src: string; alt: string; fill?: boolean; sizes?: string; className?: string }) => (
    <img src={props.src} alt={props.alt} className={props.className} data-testid="safe-image" />
  ),
}))

vi.mock('lucide-react', () => {
  const icon = (name: string) => {
    const Component = (props: React.SVGProps<SVGSVGElement>) => (
      <svg data-testid={`icon-${name}`} {...props} />
    )
    Component.displayName = `Icon${name}`
    return Component
  }
  return {
    Heart: icon('heart'),
    Sparkles: icon('sparkles'),
    Gift: icon('gift'),
    Calendar: icon('calendar'),
    MapPin: icon('map-pin'),
    ArrowRight: icon('arrow-right'),
    Globe: icon('globe'),
  }
})

vi.mock('@/services/event.service', () => ({
  EventService: {
    recommendations: vi.fn(),
    search: vi.fn(),
    list: vi.fn(),
  },
}))

const messages = JSON.parse(readFileSync(process.cwd() + '/messages/vi.json', 'utf8'))
const eventDetail = messages.event_detail
const promoTitle = messages.home.promo_shopee_title

const source = readFileSync(new URL('./EventRecommendStrip.tsx', import.meta.url), 'utf8')

const makeEvent = (overrides: Partial<Event> = {}): Event => ({
  id: 'e1',
  name: 'Sự kiện 1',
  description: 'A great concert event',
  date: new Date('2026-09-15T18:00:00').getTime(),
  imageUrl: 'https://cdn.example.com/event.jpg',
  city: 'Hà Nội',
  venueName: 'Hoa Lư Stadium',
  minPrice: 500000,
  category: ['music'],
  eventType: 'physical',
  location: { address: '123 Đường Láng' },
  ...overrides,
})

const makeEvents = (n: number, start = 1): Event[] =>
  Array.from({ length: n }, (_, i) =>
    makeEvent({ id: `evt_rec_${start + i}`, name: `Sự kiện ${start + i}` })
  )

beforeEach(() => {
  injectedState.values.length = 0
  vi.clearAllMocks()
})

describe('EventRecommendStrip — loading state', () => {
  it('defers the recommendation fetch to a post-mount effect (no API call during render)', () => {
    const html = renderToStaticMarkup(<EventRecommendStrip eventId="evt_1" />)
    expect(html).toBeTruthy()
    expect(EventService.recommendations).not.toHaveBeenCalled()
    expect(EventService.search).not.toHaveBeenCalled()
    expect(EventService.list).not.toHaveBeenCalled()
    expect(source).toMatch(/useEffect\(\(\) => \{/)
    expect(source).toMatch(/EventService\.recommendations\(12\)/)
    expect(source).toMatch(/}, \[eventId, categoryKey\]\);/)
  })

  it('renders 8 recommend + 4 more skeletons plus the advertise banner while loading', () => {
    injectedState.values = [[], true]
    const html = renderToStaticMarkup(<EventRecommendStrip eventId="evt_1" />)
    expect((html.match(/skeleton-shimmer/g) ?? [])).toHaveLength(12)
    expect(html).toContain(eventDetail.recommended_events)
    expect(html).toContain(eventDetail.more_events)
    expect(html).toContain('data-testid="icon-heart"')
    expect(html).toContain('data-testid="icon-sparkles"')
    expect(html).toContain(promoTitle)
    expect(html).not.toContain('data-testid="safe-image"')
    expect(source).toMatch(/Array\.from\(\{ length: 8 \}\)/)
    expect(source).toMatch(/Array\.from\(\{ length: 4 \}\)/)
  })
})

describe('EventRecommendStrip — recommendation success', () => {
  it('renders 12 event cards (8 recommend + 4 more) each linking to its detail page', () => {
    injectedState.values = [makeEvents(12), false]
    const html = renderToStaticMarkup(<EventRecommendStrip eventId="evt_cur" />)
    expect((html.match(/href="\/attendee\/events\/[^"]+"/g) ?? [])).toHaveLength(12)
    expect((html.match(/data-testid="safe-image"/g) ?? [])).toHaveLength(12)
    expect(html).toContain(eventDetail.recommended_events)
    expect(html).toContain(eventDetail.more_events)
    expect(html).toContain(promoTitle)
    for (let i = 1; i <= 12; i++) {
      expect(html).toContain(`href="/attendee/events/evt_rec_${i}"`)
      expect(html).toContain(`aria-label="Sự kiện ${i}"`)
    }
  })

  it('renders only the recommend row and hides the more-events section when under 8 results', () => {
    injectedState.values = [makeEvents(5), false]
    const html = renderToStaticMarkup(<EventRecommendStrip eventId="evt_cur" />)
    expect((html.match(/href="\/attendee\/events\/[^"]+"/g) ?? [])).toHaveLength(5)
    expect(html).toContain(eventDetail.recommended_events)
    expect(html).not.toContain(eventDetail.more_events)
  })

  it('renders a full recommend row and no more row at exactly 8 results', () => {
    injectedState.values = [makeEvents(8), false]
    const html = renderToStaticMarkup(<EventRecommendStrip eventId="evt_cur" />)
    expect((html.match(/href="\/attendee\/events\/[^"]+"/g) ?? [])).toHaveLength(8)
    expect(html).not.toContain(eventDetail.more_events)
  })
})

describe('EventRecommendStrip — empty results', () => {
  it('renders only the advertise banner when loaded with no events', () => {
    injectedState.values = [[], false]
    const html = renderToStaticMarkup(<EventRecommendStrip eventId="evt_1" />)
    expect(html).toContain(promoTitle)
    expect(html).not.toContain('skeleton-shimmer')
    expect(html).not.toContain('data-testid="safe-image"')
    expect(html).not.toContain(eventDetail.recommended_events)
    expect(html).not.toContain(eventDetail.more_events)
    expect(source).toMatch(/return <EventAdBanner eventId=\{eventId\} \/>;/)
  })
})

describe('EventRecommendStrip — API failure and fallback', () => {
  it('silently falls back to an empty list when the recommendation API rejects', () => {
    expect(source).toMatch(/const rec = await EventService\.recommendations\(12\);/)
    expect(source).toMatch(/catch \{[\s\S]*?list = \[\];/)
  })

  it('top-up searches by category when recommendations are short', () => {
    expect(source).toMatch(/if \(list\.length < 12 && categoryKey\) \{/)
    expect(source).toMatch(/const search = await EventService\.search\(\{/)
    expect(source).toMatch(/category: categoryKey,/)
    expect(source).toMatch(/limit: 16,/)
    expect(source).toMatch(/page: 1,/)
  })

  it('falls back to a full listing when both recommendations and search yield nothing', () => {
    expect(source).toMatch(/if \(!list\.length\) \{/)
    expect(source).toMatch(/const all = await EventService\.list\(24\);/)
  })

  it('always clears the loading flag via finally and honours the cancel flag', () => {
    expect(source).toMatch(/let cancelled = false;/)
    expect(source).toMatch(/if \(!cancelled\) setLoading\(false\);/)
    expect(source).toMatch(/cancelled = true;/)
  })
})

describe('EventRecommendStrip — category/eventId parameter handling', () => {
  it('derives the top-up search category from the first category entry', () => {
    expect(source).toMatch(/const categoryKey = category\?\.\[0\] \?\? '';/)
  })

  it('re-runs the fetch when eventId or category changes', () => {
    expect(source).toMatch(/}, \[eventId, categoryKey\]\);/)
  })

  it('excludes the current event and de-duplicates the recommendation list', () => {
    expect(source).toMatch(/if \(!e\.id \|\| e\.id === eventId \|\| seen\.has\(e\.id\)\) return false;/)
    expect(source).toMatch(/seen\.add\(e\.id\)/)
  })

  it('caps the final rendered list at 12 events', () => {
    expect(source).toMatch(/setEvents\(filtered\.slice\(0, 12\)\)/)
  })

  it('only surfaces public, enriched events', () => {
    expect((source.match(/filter\(isPublicEvent\)\.map\(enrichEvent\)/g) ?? [])).toHaveLength(3)
  })

  it('forwards eventId to the advertise banner in both render paths', () => {
    expect((source.match(/<EventAdBanner eventId=\{eventId\} \/>/g) ?? [])).toHaveLength(2)
  })
})

describe('EventRecommendStrip — event-card rendering/navigation', () => {
  it('renders one card per event with its image, name and detail link', () => {
    injectedState.values = [makeEvents(3), false]
    const html = renderToStaticMarkup(<EventRecommendStrip eventId="evt_cur" />)
    expect(html.match(/<article/g)).toHaveLength(3)
    for (let i = 1; i <= 3; i++) {
      expect(html).toContain(`href="/attendee/events/evt_rec_${i}"`)
      expect(html).toContain(`aria-label="Sự kiện ${i}"`)
      expect(html).toContain('https://cdn.example.com/event.jpg')
    }
  })

  it('does not render event cards in the loading or empty states', () => {
    injectedState.values = [[], true]
    const loadingHtml = renderToStaticMarkup(<EventRecommendStrip eventId="evt_1" />)
    injectedState.values = [[], false]
    const emptyHtml = renderToStaticMarkup(<EventRecommendStrip eventId="evt_1" />)
    expect(loadingHtml).not.toContain('<article')
    expect(emptyHtml).not.toContain('<article')
  })
})

describe('EventRecommendStrip — carousel/scroll interaction', () => {
  it('exposes no carousel or scroll-based navigation (not implemented, plain grid)', () => {
    expect(source).not.toMatch(/scrollIntoView|scrollBy|scrollTo|scrollLeft|carousel|overflow/i)
  })
})
