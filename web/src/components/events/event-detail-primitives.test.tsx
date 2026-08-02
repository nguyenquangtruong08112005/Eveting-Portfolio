import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { EventHeader } from './EventHeader'
import { OrganizerCard } from './OrganizerCard'
import { WeatherWidget } from './WeatherWidget'
import type { Event, EventWeather, FeaturedProfile } from '@/types'
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

vi.mock('next/image', () => ({
  default: (props: { src: string; alt: string; fill?: boolean; className?: string; priority?: boolean }) => (
    <img src={props.src} alt={props.alt} className={props.className} data-testid="next-image" />
  ),
}))

vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <span data-testid="avatar" className={className}>{children}</span>
  ),
  AvatarImage: ({ src, alt }: { src: string; alt: string }) => (
    <img data-testid="avatar-image" src={src} alt={alt} />
  ),
  AvatarFallback: ({ children }: { children?: React.ReactNode }) => (
    <span data-testid="avatar-fallback">{children}</span>
  ),
}))

vi.mock('@/services/profile.service', () => ({
  ProfileService: {
    getById: vi.fn(),
  },
}))

vi.mock('@/services/event.service', () => ({
  EventService: {
    getWeather: vi.fn(),
  },
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
    Building2: icon('building'),
    Globe: icon('globe'),
    Users: icon('users'),
    Cloud: icon('cloud'),
    CloudRain: icon('cloud-rain'),
    CloudSun: icon('cloud-sun'),
    Sun: icon('sun'),
    Wind: icon('wind'),
    Droplets: icon('droplets'),
  }
})

const messages = JSON.parse(readFileSync(process.cwd() + '/messages/vi.json', 'utf8'))

const makeEvent = (overrides: Partial<Event> = {}): Event => ({
  id: 'evt_1',
  name: 'Anh Trai Say Hi Concert',
  description: 'A great concert event',
  date: new Date('2026-09-15T18:00:00').getTime(),
  imageUrl: 'https://cdn.example.com/header.jpg',
  ...overrides,
})

describe('EventHeader', () => {
  it('renders the banner image with the event image and name', () => {
    const html = renderToStaticMarkup(<EventHeader event={makeEvent()} />)

    expect(html).toContain('data-testid="next-image"')
    expect(html).toContain('https://cdn.example.com/header.jpg')
    expect(html).toContain('alt="Anh Trai Say Hi Concert"')
  })

  it('renders the responsive banner wrapper', () => {
    const html = renderToStaticMarkup(<EventHeader event={makeEvent()} />)

    expect(html).toContain('max-w-7xl')
  })

  it('renders nothing when imageUrl is undefined', () => {
    const html = renderToStaticMarkup(<EventHeader event={makeEvent({ imageUrl: undefined })} />)

    expect(html).toBe('')
  })

  it('renders nothing when imageUrl is an empty string', () => {
    const html = renderToStaticMarkup(<EventHeader event={makeEvent({ imageUrl: '' })} />)

    expect(html).toBe('')
  })
})

describe('OrganizerCard', () => {
  beforeEach(() => {
    injectedState.values.length = 0
  })

  it('renders nothing when organizerId is missing', () => {
    const html = renderToStaticMarkup(<OrganizerCard />)

    expect(html).toBe('')
  })

  it('renders the organizer section header when an organizer is set', () => {
    const html = renderToStaticMarkup(<OrganizerCard organizerId="org_1" />)

    expect(html).toContain(messages.event_detail.organizer_title)
  })

  it('shows a loading skeleton while the profile is being fetched', () => {
    const html = renderToStaticMarkup(<OrganizerCard organizerId="org_1" />)

    expect(html).toContain('skeleton-shimmer')
    expect(html).not.toContain('data-testid="avatar"')
  })

  it('renders the fetched profile with avatar, name, bio, followers and type', () => {
    const profile: FeaturedProfile = {
      id: 'org_1',
      name: 'Ban Nhạc Hà Nội',
      profileType: 'artist',
      bio: 'Chuyên nhạc sống',
      imageUrl: 'https://cdn.example.com/org.jpg',
      followerCount: 1234,
    }
    injectedState.values = [profile, false]
    const html = renderToStaticMarkup(<OrganizerCard organizerId="org_1" />)

    expect(html).toContain(profile.name)
    expect(html).toContain(profile.bio)
    expect(html).toContain('1234 người theo dõi')
    expect(html).toContain('artist')
    expect(html).toContain('>BN<')
    expect(html).toContain('data-testid="avatar-image"')
    expect(html).toContain('src="https://cdn.example.com/org.jpg"')
    expect(html).toContain('data-testid="icon-users"')
  })

  it('falls back to the translated organizer name when the profile has no name', () => {
    const profile = {
      id: 'org_1',
      name: '',
      profileType: 'artist',
    } as unknown as FeaturedProfile
    injectedState.values = [profile, false]
    const html = renderToStaticMarkup(<OrganizerCard organizerId="org_1" />)

    expect(html).toContain(messages.event_detail.organizer_fallback)
    expect(html).not.toContain('>BN<')
  })

  it('shows the no-bio hint and OR fallback when profile data is missing', () => {
    const profile = {
      id: 'org_1',
      name: ' ',
    } as unknown as FeaturedProfile
    injectedState.values = [profile, false]
    const html = renderToStaticMarkup(<OrganizerCard organizerId="org_1" />)

    expect(html).toContain(messages.event_detail.organizer_no_bio)
    expect(html).toContain('>OR<')
    expect(html).not.toContain('data-testid="avatar-image"')
    expect(html).not.toContain('người theo dõi')
    expect(html).not.toContain('data-testid="icon-globe"')
  })

  it('falls back gracefully when the profile request fails', () => {
    injectedState.values = [null, false]
    const html = renderToStaticMarkup(<OrganizerCard organizerId="org_1" />)

    expect(html).toContain(messages.event_detail.organizer_fallback)
    expect(html).toContain(messages.event_detail.organizer_no_bio)
  })

  it('forwards className to the wrapper', () => {
    const html = renderToStaticMarkup(<OrganizerCard organizerId="org_1" className="mt-4" />)

    expect(html).toMatch(/class="[^"]*mt-4/)
  })
})

describe('WeatherWidget', () => {
  beforeEach(() => {
    injectedState.values.length = 0
  })

  it('shows a loading placeholder while the forecast is being fetched', () => {
    const html = renderToStaticMarkup(<WeatherWidget eventId="evt_1" />)

    expect(html).toContain('animate-pulse')
  })

  it('renders temperature, condition, humidity, wind and icon when data is available', () => {
    const weather: EventWeather = {
      tempC: 26.4,
      condition: 'Có mây',
      humidity: 60,
      windKph: 12.3,
      iconUrl: 'https://openweathermap.org/img/wn/04d@2x.png',
    }
    injectedState.values = [weather, false, false]
    const html = renderToStaticMarkup(<WeatherWidget eventId="evt_1" />)

    expect(html).toContain(messages.weather.title)
    expect(html).toContain('26°C')
    expect(html).toContain('Có mây')
    expect(html).toContain('Độ ẩm 60%')
    expect(html).toContain('Gió 12 km/h')
    expect(html).toContain('src="https://openweathermap.org/img/wn/04d@2x.png"')
    expect(html).toContain('data-testid="icon-droplets"')
    expect(html).toContain('data-testid="icon-wind"')
  })

  it('falls back to legacy temperature and wind fields and the icon id URL', () => {
    const weather = {
      temperature: 28,
      description: 'Nắng',
      windSpeed: 5,
      icon: '02d',
    } as EventWeather
    injectedState.values = [weather, false, false]
    const html = renderToStaticMarkup(<WeatherWidget eventId="evt_1" />)

    expect(html).toContain('28°C')
    expect(html).toContain('Nắng')
    expect(html).toContain('Gió 5 km/h')
    expect(html).toContain('src="https://openweathermap.org/img/wn/02d@2x.png"')
  })

  it('shows the rain icon for rain/drizzle/storm conditions', () => {
    const weather = { condition: 'Light rain', tempC: 24 } as EventWeather
    injectedState.values = [weather, false, false]
    const html = renderToStaticMarkup(<WeatherWidget eventId="evt_1" />)

    expect(html).toContain('data-testid="icon-cloud-rain"')
  })

  it('shows the sun icon for clear/sunny conditions', () => {
    const weather = { condition: 'Sunny', tempC: 30 } as EventWeather
    injectedState.values = [weather, false, false]
    const html = renderToStaticMarkup(<WeatherWidget eventId="evt_1" />)

    expect(html).toContain('data-testid="icon-sun"')
  })

  it('shows the cloud-sun icon for cloudy conditions', () => {
    const weather = { condition: 'Cloudy', tempC: 25 } as EventWeather
    injectedState.values = [weather, false, false]
    const html = renderToStaticMarkup(<WeatherWidget eventId="evt_1" />)

    expect(html).toContain('data-testid="icon-cloud-sun"')
  })

  it('shows the fallback cloud icon and placeholders when optional data is missing', () => {
    injectedState.values = [{}, false, false]
    const html = renderToStaticMarkup(<WeatherWidget eventId="evt_1" />)

    expect(html).toContain('data-testid="icon-cloud"')
    expect(html).toContain('>—<')
    expect(html).not.toContain('Độ ẩm')
    expect(html).not.toContain('Gió')
  })

  it('shows the unavailable message when the forecast is missing', () => {
    injectedState.values = [null, false, false]
    const html = renderToStaticMarkup(<WeatherWidget eventId="evt_1" />)

    expect(html).toContain(messages.weather.unavailable)
  })

  it('shows the unavailable message when the request fails', () => {
    injectedState.values = [null, false, true]
    const html = renderToStaticMarkup(<WeatherWidget eventId="evt_1" />)

    expect(html).toContain(messages.weather.unavailable)
  })

  it('forwards className to the wrapper', () => {
    const html = renderToStaticMarkup(<WeatherWidget eventId="evt_1" className="mt-4" />)

    expect(html).toMatch(/class="[^"]*mt-4/)
  })
})
