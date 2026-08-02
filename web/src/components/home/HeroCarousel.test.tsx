import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { HeroCarousel } from './HeroCarousel'
import { formatDate, FALLBACK_IMAGE } from '@/lib/constants'
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
  default: (props: { href: string; children: React.ReactNode }) => (
    <a href={props.href}>{props.children}</a>
  ),
}))

const messages = JSON.parse(readFileSync(process.cwd() + '/messages/vi.json', 'utf8'))
const heroSource = readFileSync(new URL('./HeroCarousel.tsx', import.meta.url), 'utf8')

const makeEvent = (overrides: Partial<Event> = {}): Event => ({
  id: 'evt_1',
  name: 'Anh Trai Say Hi',
  date: new Date('2026-09-15T18:00:00').getTime(),
  imageUrl: 'https://cdn.example.com/evt1.jpg',
  city: 'Hà Nội',
  ...overrides,
})

describe('HeroCarousel — empty / fallback rendering', () => {
  it('renders a fallback panel with the translated message when there are no events', () => {
    const html = renderToStaticMarkup(<HeroCarousel events={[]} />)
    expect(html).toContain(messages.home.no_featured_events)
    expect(html).toContain('photo-1492684223066-81342ee5ff30')
    expect(html).not.toContain('Go to slide')
    expect(html).not.toContain('/attendee/events/')
  })

  it('uses the fallback image for events missing banner and image urls', () => {
    const html = renderToStaticMarkup(<HeroCarousel events={[makeEvent({ imageUrl: undefined })]} />)
    expect(html).toContain('photo-1492684223066-81342ee5ff30')
    expect(FALLBACK_IMAGE).toContain('photo-1492684223066-81342ee5ff30')
  })

  it('shows the translated unknown label when an event has no venue or address', () => {
    const html = renderToStaticMarkup(
      <HeroCarousel events={[makeEvent({ venueName: undefined, location: undefined })]} />,
    )
    expect(html).toContain(messages.common.unknown)
  })

  it('prefers banner over image for the backdrop and shows the venue name when present', () => {
    const html = renderToStaticMarkup(
      <HeroCarousel
        events={[makeEvent({ bannerUrl: 'https://cdn.example.com/banner.jpg', venueName: 'Hoa Lư Stadium' })]}
      />,
    )
    expect(html).toContain('https://cdn.example.com/banner.jpg')
    expect(html).toContain('Hoa Lư Stadium')
  })
})

describe('HeroCarousel — slides, links and indicators', () => {
  it('renders a single slide without dots and links into the event detail page', () => {
    const event = makeEvent()
    const html = renderToStaticMarkup(<HeroCarousel events={[event]} />)
    expect(html).toContain(event.name)
    expect(html).toContain(formatDate(event.date))
    expect(html).not.toContain('Go to slide')
    const links = html.match(/href="\/attendee\/events\/evt_1"/g)
    expect(links).toHaveLength(2)
  })

  it('features at most the first three events and renders one dot per slide', () => {
    const events = ['Một', 'Hai', 'Ba', 'Bốn'].map((name, i) =>
      makeEvent({ id: `evt_${i + 1}`, name }),
    )
    const html = renderToStaticMarkup(<HeroCarousel events={events} />)
    expect(html).toContain('Một')
    expect(html).toContain('Hai')
    expect(html).toContain('Ba')
    expect(html).not.toContain('Bốn')
    expect(html).toContain('aria-label="Go to slide 1"')
    expect(html).toContain('aria-label="Go to slide 2"')
    expect(html).toContain('aria-label="Go to slide 3"')
  })

  it('marks exactly one slide as active on first render', () => {
    const events = ['Một', 'Hai', 'Ba'].map((name, i) =>
      makeEvent({ id: `evt_${i + 1}`, name }),
    )
    const html = renderToStaticMarkup(<HeroCarousel events={events} />)
    expect(html.match(/opacity-100/g)).toHaveLength(1)
  })

  it('falls back to a rotating tag for events without tags and keeps given tags', () => {
    const html = renderToStaticMarkup(
      <HeroCarousel
        events={[
          makeEvent({ id: 'evt_1', name: 'Không tag' }),
          makeEvent({ id: 'evt_2', name: 'Không tag 2' }),
          makeEvent({ id: 'evt_3', name: 'Không tag 3' }),
        ]}
      />,
    )
    expect(html).toContain('RECOMMENDED')
    expect(html).toContain('TRENDING')
    expect(html).toContain('HOT EVENT')

    const tagged = renderToStaticMarkup(
      <HeroCarousel events={[makeEvent({ name: 'Có tag', tags: ['LIVE'] })]} />,
    )
    expect(tagged).toContain('LIVE')
    expect(tagged).not.toContain('RECOMMENDED')
  })
})

describe('HeroCarousel — video backdrop handling', () => {
  it('embeds a youtube iframe for a youtube video url', () => {
    const html = renderToStaticMarkup(
      <HeroCarousel
        events={[
          makeEvent({ videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }),
        ]}
      />,
    )
    expect(html).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ')
    expect(html).not.toContain('<video')
  })

  it('renders a muted autoplay video element for a direct mp4 url', () => {
    const html = renderToStaticMarkup(
      <HeroCarousel
        events={[
          makeEvent({ videoUrl: '  https://cdn.example.com/clip.mp4  ' }),
        ]}
      />,
    )
    expect(html).toContain('src="https://cdn.example.com/clip.mp4"')
    expect(html).toContain('<video')
    expect(html).toContain('autoPlay')
    expect(html).not.toContain('youtube-nocookie')
  })

  it('renders only the image backdrop when the video url is not recognized', () => {
    const html = renderToStaticMarkup(
      <HeroCarousel
        events={[
          makeEvent({ videoUrl: 'not-a-real-media-source' }),
        ]}
      />,
    )
    expect(html).not.toContain('<video')
    expect(html).not.toContain('youtube-nocookie')
  })
})

describe('HeroCarousel — autoplay transitions', () => {
  it('advances the active slide on a 5s interval, wrapping to the first slide', () => {
    expect(heroSource).toContain('5000')
    expect(heroSource).toMatch(/setInterval\(/)
    expect(heroSource).toMatch(/\(prev \+ 1\) % slides\.length/)
  })

  it('skips the autoplay timer when there are zero or one slides', () => {
    expect(heroSource).toMatch(/if \(slides\.length <= 1\) return;/)
  })

  it('lets each indicator dot select its slide directly', () => {
    expect(heroSource).toMatch(/onClick=\{\(\) => setActiveSlide\(index\)\}/)
  })

  it('falls back to a static image backdrop when the featured video fails to load', () => {
    expect(heroSource).toMatch(/failedVideoIds\[slide\.id\]/)
    expect(heroSource).toMatch(/handleVideoError\(slide\.id\)/)
    expect(heroSource).toMatch(/slide\.bannerUrl \|\| slide\.imageUrl \|\| FALLBACK_IMAGE/)
  })
})
