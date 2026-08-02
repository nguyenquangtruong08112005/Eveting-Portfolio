import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { EventInfoContent } from './EventInfoContent'
import { formatDate } from '@/lib/constants'
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

const messages = JSON.parse(readFileSync(process.cwd() + '/messages/vi.json', 'utf8'))

type EventWithVenue = Event & {
  venue?: {
    name: string
    addressDetails?: { street: string; district: string; city: string }
    nearby?: string[]
  }
}

const DATE = new Date('2026-09-15T18:00:00').getTime()

const makeEvent = (overrides: Partial<EventWithVenue> = {}): EventWithVenue => ({
  id: 'evt_1',
  name: 'Anh Trai Say Hi Concert',
  description: 'A great concert event',
  date: DATE,
  ...overrides,
})

const render = (event: EventWithVenue, mounted = true) =>
  renderToStaticMarkup(<EventInfoContent event={event} mounted={mounted} />)

describe('EventInfoContent', () => {
  describe('schedule / date', () => {
    it('renders the formatted event date when mounted', () => {
      const html = render(makeEvent())
      expect(html).toContain(formatDate(DATE))
      expect(html).not.toContain('>...<')
    })

    it('renders a placeholder instead of the date when not mounted', () => {
      const html = render(makeEvent(), false)
      expect(html).toContain('...')
      expect(html).not.toContain(formatDate(DATE))
    })

    it('renders placeholder dates for the end line when not mounted even with endDate', () => {
      const endDate = new Date('2026-09-16T22:00:00').getTime()
      const html = render(makeEvent({ endDate }), false)
      expect(html).toContain(messages.event_info.ends_at)
      expect(html).not.toContain(formatDate(DATE))
      expect(html).not.toContain(formatDate(endDate))
      expect(html).toContain('...')
    })

    it('renders the end date line when endDate is present', () => {
      const endDate = new Date('2026-09-16T22:00:00').getTime()
      const html = render(makeEvent({ endDate }))
      expect(html).toContain(messages.event_info.ends_at)
      expect(html).toContain(formatDate(endDate))
    })

    it('renders the time-tbd line when endDate is absent', () => {
      const html = render(makeEvent({ endDate: null }))
      expect(html).toContain(messages.event_info.time_tbd)
      expect(html).not.toContain(messages.event_info.ends_at)
    })
  })

  describe('venue / address', () => {
    it('prefers event.venueName over venue.name', () => {
      const html = render(makeEvent({ venueName: 'Hòa Bình Theater', venue: { name: 'Venue A' } }))
      expect(html).toContain('Hòa Bình Theater')
      expect(html).not.toContain('Venue A')
    })

    it('falls back to venue.name when venueName is missing', () => {
      const html = render(makeEvent({ venue: { name: 'Venue A' } }))
      expect(html).toContain('Venue A')
    })

    it('falls back to the translated venue label when no venue name exists', () => {
      const html = render(makeEvent())
      expect(html).toContain(messages.event_info.venue)
    })

    it('renders the full address when venue.addressDetails is present', () => {
      const html = render(
        makeEvent({
          venue: {
            name: 'Venue A',
            addressDetails: { street: '123 Lê Lợi', district: 'Quận 1', city: 'HCM' },
          },
        })
      )
      expect(html).toContain('123 Lê Lợi, Quận 1, HCM')
    })

    it('falls back to location.address when addressDetails is missing', () => {
      const html = render(
        makeEvent({ location: { address: '45 Nguyễn Huệ', latitude: 10.77, longitude: 106.7 } })
      )
      expect(html).toContain('45 Nguyễn Huệ')
    })

    it('falls back to city when neither address nor addressDetails exist', () => {
      const html = render(makeEvent({ city: 'Đà Nẵng' }))
      expect(html).toContain('Đà Nẵng')
    })
  })

  describe('category / tags', () => {
    it('renders a localized badge for each category', () => {
      const html = render(makeEvent({ category: ['music', 'nightlife'] }))
      expect(html).toContain(messages.navbar.categories.music)
      expect(html).toContain(messages.navbar.categories.nightlife.replaceAll('&', '&amp;'))
    })

    it('humanizes unknown category tags', () => {
      const html = render(makeEvent({ category: ['street-food'] }))
      expect(html).toContain('Street-food')
    })

    it('renders no badges when category is absent or empty', () => {
      const empty = render(makeEvent({ category: [] }))
      const missing = render(makeEvent({ category: undefined }))
      expect(empty).not.toContain('Nhạc sống')
      expect(missing).not.toContain('Nhạc sống')
    })
  })

  describe('description', () => {
    it('renders the event description', () => {
      const html = render(makeEvent({ description: 'Ba ngày nhạc hội ngoài trời' }))
      expect(html).toContain('Ba ngày nhạc hội ngoài trời')
    })

    it('renders the intro hint when description is missing', () => {
      const html = render(makeEvent({ description: undefined }))
      expect(html).toContain(messages.event_info.intro_hint)
    })
  })

  describe('online events', () => {
    it('renders the online badge and notice and no map', () => {
      const html = render(makeEvent({ eventType: 'online' }))
      expect(html).toContain(messages.event_info.online_event)
      expect(html).toContain(messages.event_info.online_notice)
      expect(html).not.toContain('openstreetmap.org/export/embed')
    })
  })

  describe('map', () => {
    it('renders the embedded map using event coordinates when provided', () => {
      const html = render(
        makeEvent({
          eventType: 'physical',
          location: { address: 'HCM', latitude: 10.82, longitude: 106.63 },
        })
      )
      expect(html).toContain('openstreetmap.org/export/embed')
      expect(html).toContain('marker=10.82%2C106.63')
      expect(html).toContain('mlat=10.82')
      expect(html).toContain('mlon=106.63')
      expect(html).toContain(messages.event_info.open_map)
    })

    it('falls back to HCMC center coordinates when event coordinates are missing', () => {
      const html = render(makeEvent({ eventType: 'physical', location: { address: 'HCM' } }))
      const delta = 0.012
      const bbox = encodeURIComponent(
        `${106.7009 - delta},${10.7769 - delta},${106.7009 + delta},${10.7769 + delta}`
      )
      expect(html).toContain('openstreetmap.org/export/embed')
      expect(html).toContain(`bbox=${bbox}`)
      expect(html).toContain('marker=10.7769%2C106.7009')
    })

    it('shows the map for hybrid events', () => {
      const html = render(makeEvent({ eventType: 'hybrid' }))
      expect(html).toContain('openstreetmap.org/export/embed')
    })

    it('shows the map when eventType is unspecified', () => {
      const html = render(makeEvent())
      expect(html).toContain('openstreetmap.org/export/embed')
    })
  })

  describe('venue nearby', () => {
    it('renders nearby place badges when present', () => {
      const html = render(makeEvent({ venue: { name: 'V', nearby: ['Bitexco', 'Nhà thờ Đức Bà'] } }))
      expect(html).toContain(messages.event_info.nearby)
      expect(html).toContain('Bitexco')
      expect(html).toContain('Nhà thờ Đức Bà')
    })

    it('omits the nearby section when absent or empty', () => {
      const missing = render(makeEvent({ venue: { name: 'V' } }))
      const empty = render(makeEvent({ venue: { name: 'V', nearby: [] } }))
      expect(missing).not.toContain(messages.event_info.nearby)
      expect(empty).not.toContain(messages.event_info.nearby)
    })
  })
})
