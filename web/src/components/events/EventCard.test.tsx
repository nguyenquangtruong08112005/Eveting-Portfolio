import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { EventCard } from './EventCard'
import { formatPrice, formatDate, FALLBACK_IMAGE, localizeCategory } from '@/lib/constants'
import type { Event } from '@/types'

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

vi.mock('next/image', () => ({
  default: (props: { src: string; alt: string; fill?: boolean; sizes?: string; className?: string; priority?: boolean }) => (
    <img src={props.src} alt={props.alt} className={props.className} data-testid="next-image" />
  ),
}))

vi.mock('@/components/shared/SafeImage', () => ({
  SafeImage: (props: { src: string; alt: string; fill?: boolean; sizes?: string; className?: string; fallbackSrc?: string }) => (
    <img src={props.src} alt={props.alt} className={props.className} data-testid="safe-image" />
  ),
}))

vi.mock('lucide-react', () => ({
  Calendar: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="calendar" {...props} />,
  MapPin: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="map-pin" {...props} />,
  ArrowRight: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="arrow-right" {...props} />,
  Globe: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="globe" {...props} />,
}))

const messages = JSON.parse(readFileSync(process.cwd() + '/messages/vi.json', 'utf8'))

const makeEvent = (overrides: Partial<Event> = {}): Event => ({
  id: 'evt_123',
  name: 'Anh Trai Say Hi Concert',
  description: 'A great concert event',
  date: new Date('2026-09-15T18:00:00').getTime(),
  imageUrl: 'https://cdn.example.com/event.jpg',
  city: 'Hà Nội',
  venueName: 'Hoa Lư Stadium',
  minPrice: 500000,
  category: ['music', 'concert'],
  eventType: 'physical',
  location: { address: '123 Đường Láng, Đống Đa' },
  ...overrides,
})

describe('EventCard — normal data rendering', () => {
  it('renders event name, description, location, price, and category badges', () => {
    const event = makeEvent()
    const html = renderToStaticMarkup(<EventCard event={event} />)

    expect(html).toContain(event.name)
    expect(html).toContain(event.description)
    expect(html).toContain(event.venueName)
    expect(html).toContain(event.city)
    expect(html).toContain(formatPrice(event.minPrice))
    expect(html).toContain(localizeCategory('music', (k) => messages.navbar.categories[k]))
    expect(html).toContain(localizeCategory('concert', (k) => messages.navbar.categories[k]))
  })

  it('renders the navigation link to the event detail page', () => {
    const event = makeEvent()
    const html = renderToStaticMarkup(<EventCard event={event} />)

    expect(html).toContain(`href="/attendee/events/${event.id}"`)
    expect(html).toContain(`aria-label="${event.name}"`)
  })

  it('renders the event image with the provided imageUrl', () => {
    const event = makeEvent()
    const html = renderToStaticMarkup(<EventCard event={event} />)

    expect(html).toContain(event.imageUrl)
  })

  it('renders the CTA button with translated "book_now" text', () => {
    const event = makeEvent()
    const html = renderToStaticMarkup(<EventCard event={event} />)

    expect(html).toContain(messages.common.book_now)
    expect(html).toContain('data-testid="arrow-right"')
  })

  it('renders date placeholder "..." before mount (static render)', () => {
    const event = makeEvent()
    const html = renderToStaticMarkup(<EventCard event={event} />)

    expect(html).toContain('...')
    expect(html).not.toContain(formatDate(event.date))
  })
})

describe('EventCard — missing optional image', () => {
  it('uses FALLBACK_IMAGE when imageUrl is undefined', () => {
    const event = makeEvent({ imageUrl: undefined })
    const html = renderToStaticMarkup(<EventCard event={event} />)

    expect(html).toContain('photo-1492684223066-81342ee5ff30')
    expect(html).not.toContain('undefined')
  })

  it('uses FALLBACK_IMAGE when imageUrl is empty string', () => {
    const event = makeEvent({ imageUrl: '' })
    const html = renderToStaticMarkup(<EventCard event={event} />)

    expect(html).toContain('photo-1492684223066-81342ee5ff30')
  })
})

describe('EventCard — missing optional date', () => {
  it('renders "..." placeholder for invalid date (NaN)', () => {
    const event = makeEvent({ date: NaN })
    const html = renderToStaticMarkup(<EventCard event={event} />)

    expect(html).toContain('...')
    expect(html).not.toContain('Invalid Date')
  })

  it('renders "..." placeholder for valid date in static render (no mount)', () => {
    const event = makeEvent({ date: new Date('2026-12-25T20:00:00').getTime() })
    const html = renderToStaticMarkup(<EventCard event={event} />)

    expect(html).toContain('...')
    expect(html).not.toContain(formatDate(event.date))
  })
})

describe('EventCard — missing optional location', () => {
  it('renders translated "unknown" when venueName and location.address are both missing', () => {
    const event = makeEvent({ venueName: undefined, location: undefined, city: undefined })
    const html = renderToStaticMarkup(<EventCard event={event} />)

    expect(html).toContain(messages.common.unknown)
  })

  it('prefers venueName when present', () => {
    const event = makeEvent({ venueName: 'Custom Venue', location: undefined, city: undefined })
    const html = renderToStaticMarkup(<EventCard event={event} />)

    expect(html).toContain('Custom Venue')
    expect(html).not.toContain(messages.common.unknown)
  })

  it('falls back to location.address when venueName is missing', () => {
    const event = makeEvent({ venueName: undefined, location: { address: '456 Nguyễn Trãi' }, city: undefined })
    const html = renderToStaticMarkup(<EventCard event={event} />)

    expect(html).toContain('456 Nguyễn Trãi')
  })

  it('appends city when present', () => {
    const event = makeEvent({ city: 'TP. Hồ Chí Minh' })
    const html = renderToStaticMarkup(<EventCard event={event} />)

    expect(html).toContain('TP. Hồ Chí Minh')
  })

  it('renders MapPin icon for location', () => {
    const event = makeEvent()
    const html = renderToStaticMarkup(<EventCard event={event} />)

    expect(html).toContain('data-testid="map-pin"')
  })
})

describe('EventCard — missing optional price', () => {
  it('renders translated "contact" when minPrice is null', () => {
    const event = makeEvent({ minPrice: null })
    const html = renderToStaticMarkup(<EventCard event={event} />)

    expect(html).toContain(messages.common.contact)
  })

  it('renders translated "free" when minPrice is 0', () => {
    const event = makeEvent({ minPrice: 0 })
    const html = renderToStaticMarkup(<EventCard event={event} />)

    expect(html).toContain(messages.common.free)
  })

  it('renders formatted price when minPrice is a positive number', () => {
    const event = makeEvent({ minPrice: 150000 })
    const html = renderToStaticMarkup(<EventCard event={event} />)

    expect(html).toContain(formatPrice(150000))
  })

  it('renders translated "contact" when minPrice is undefined', () => {
    const event = makeEvent({ minPrice: undefined })
    const html = renderToStaticMarkup(<EventCard event={event} />)

    expect(html).toContain(messages.common.contact)
  })
})

describe('EventCard — online event badge', () => {
  it('renders "Online" badge when eventType is online', () => {
    const event = makeEvent({ eventType: 'online' })
    const html = renderToStaticMarkup(<EventCard event={event} />)

    expect(html).toContain('Online')
    expect(html).toContain('data-testid="globe"')
  })

  it('does not render online badge for physical event', () => {
    const event = makeEvent({ eventType: 'physical' })
    const html = renderToStaticMarkup(<EventCard event={event} />)

    expect(html).not.toContain('Online')
  })

  it('does not render online badge for hybrid event', () => {
    const event = makeEvent({ eventType: 'hybrid' })
    const html = renderToStaticMarkup(<EventCard event={event} />)

    expect(html).not.toContain('Online')
  })
})

describe('EventCard — category handling', () => {
  it('renders up to 2 category badges', () => {
    const event = makeEvent({ category: ['music', 'concert', 'edm', 'v-pop'] })
    const html = renderToStaticMarkup(<EventCard event={event} />)

    const badgeMatches = html.match(/<span[^>]*class="[^"]*badge/gi)
    expect(badgeMatches).toHaveLength(2)
  })

  it('renders no badges when category is empty', () => {
    const event = makeEvent({ category: [] })
    const html = renderToStaticMarkup(<EventCard event={event} />)

    const badgeMatches = html.match(/<span[^>]*class="[^"]*badge/gi)
    expect(badgeMatches).toBeNull()
  })

  it('renders no badges when category is undefined', () => {
    const event = makeEvent({ category: undefined })
    const html = renderToStaticMarkup(<EventCard event={event} />)

    const badgeMatches = html.match(/<span[^>]*class="[^"]*badge/gi)
    expect(badgeMatches).toBeNull()
  })
})

describe('EventCard — structure and accessibility', () => {
  it('renders article with aura-card class', () => {
    const event = makeEvent()
    const html = renderToStaticMarkup(<EventCard event={event} />)

    expect(html).toContain('article')
    expect(html).toContain('aura-card')
  })

  it('renders heading with event name', () => {
    const event = makeEvent()
    const html = renderToStaticMarkup(<EventCard event={event} />)

    expect(html).toContain('<h3')
    expect(html).toContain(event.name)
  })

  it('renders description paragraph', () => {
    const event = makeEvent()
    const html = renderToStaticMarkup(<EventCard event={event} />)

    expect(html).toContain('<p')
    expect(html).toContain(event.description)
  })

  it('renders Calendar icon for date', () => {
    const event = makeEvent()
    const html = renderToStaticMarkup(<EventCard event={event} />)

    expect(html).toContain('data-testid="calendar"')
  })

  it('renders location with MapPin icon', () => {
    const event = makeEvent()
    const html = renderToStaticMarkup(<EventCard event={event} />)

    expect(html).toContain('data-testid="map-pin"')
    expect(html).toContain(event.venueName)
  })
})