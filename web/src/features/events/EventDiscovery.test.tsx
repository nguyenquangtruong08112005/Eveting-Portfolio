import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { EventDiscovery, selectShowcaseEvents, getDeterministicCategoryAdPlacements } from './EventDiscovery'
import { EventService } from '@/services/event.service'
import type { Event } from '@/types'

const { searchParamsStore, setSearchParams } = vi.hoisted(() => {
  const store: Record<string, string> = {}
  return {
    searchParamsStore: store,
    setSearchParams: (next: Record<string, string>) => {
      Object.keys(store).forEach((k) => delete store[k])
      Object.assign(store, next)
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

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: (key: string) => searchParamsStore[key] ?? '' }),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}))

vi.mock('@/services/event.service', () => ({
  EventService: {
    list: vi.fn(),
    search: vi.fn(),
    recommendations: vi.fn(),
    nearby: vi.fn(),
  },
}))

vi.mock('next/link', () => ({
  default: (props: { href: string; children: React.ReactNode }) => <a href={props.href}>{props.children}</a>,
}))

vi.mock('@/components/layout/Navbar', () => ({ Navbar: () => <nav data-testid="navbar" /> }))
vi.mock('@/components/layout/Footer', () => ({ Footer: () => <footer data-testid="footer" /> }))
vi.mock('@/components/events/EventCard', () => ({ EventCard: ({ event }: { event?: { name?: string } }) => <div data-testid="card">{event?.name}</div> }))
vi.mock('@/components/ui/badge', () => ({ Badge: ({ children }: { children?: React.ReactNode }) => <span data-testid="badge">{children}</span> }))
vi.mock('@/components/shared/SafeImage', () => ({ SafeImage: (props: { src?: string; alt?: string }) => <img src={props.src} alt={props.alt ?? ''} /> }))
vi.mock('@/components/home/HeroCarousel', () => ({ HeroCarousel: ({ events }: { events: unknown[] }) => <div data-testid="hero">{events.length}</div> }))
vi.mock('@/components/home/ArtistStars', () => ({ ArtistStars: () => <div data-testid="artist-stars" /> }))
vi.mock('@/components/home/PopularDestinations', () => ({ PopularDestinations: () => <div data-testid="destinations" /> }))
vi.mock('@/components/home/PartnerAdsStrip', () => ({ PartnerAdsStrip: () => <div data-testid="ads" /> }))
vi.mock('@/components/shared/SectionHeading', () => ({ SectionHeading: ({ title }: { title?: string }) => <h2 data-testid="heading">{title}</h2> }))
vi.mock('@/components/shared/EmptyState', () => ({ EmptyState: ({ title }: { title?: string }) => <div data-testid="empty">{title}</div> }))
vi.mock('@/components/shared/SkeletonGrid', () => ({ SkeletonGrid: () => <div data-testid="skeleton" /> }))
vi.mock('@/components/home/HomeCarousel', () => ({ HomeCarousel: ({ header, children }: { header?: React.ReactNode; children?: React.ReactNode }) => <div data-testid="carousel">{header}{children}</div> }))

const source = readFileSync(new URL('./EventDiscovery.tsx', import.meta.url), 'utf8')
const eventServiceSource = readFileSync(new URL('../../../src/services/event.service.ts', import.meta.url), 'utf8')
const eventCardSource = readFileSync(new URL('../../../src/components/events/EventCard.tsx', import.meta.url), 'utf8')

describe('EventDiscovery — initial loading lifecycle', () => {
  beforeEach(() => {
    setSearchParams({})
    vi.clearAllMocks()
  })

  it('renders the landing chrome (navbar, footer, hero) on first server render', () => {
    const html = renderToStaticMarkup(<EventDiscovery />)
    expect(html).toContain('data-testid="navbar"')
    expect(html).toContain('data-testid="footer"')
    expect(html).toContain('data-testid="hero"')
  })

  it('shows skeleton placeholders instead of empty states or cards while loading', () => {
    const html = renderToStaticMarkup(<EventDiscovery />)
    expect(html).toContain('animate-pulse')
    expect(html).not.toContain('Không tìm thấy sự kiện nào')
    expect(html).not.toContain('data-testid="card"')
    expect(html).not.toContain('data-testid="carousel"')
  })

  it('hides the identity-aware and location sections before data resolves', () => {
    const html = renderToStaticMarkup(<EventDiscovery />)
    expect(html).not.toContain('Gần bạn')
    expect(html).not.toContain('Gợi ý cho bạn')
  })

  it('renders the weekend tabs and all six canonical category headings while loading', () => {
    const html = renderToStaticMarkup(<EventDiscovery />)
    for (const label of [
      'Cuối tuần này',
      'Tháng này',
      'Nhạc sống',
      'Sân khấu &amp; Nghệ thuật',
      'Thể thao',
      'Hội thảo &amp; Workshop',
      'Đời sống &amp; Tiệc',
      'Khoa học &amp; Công nghệ',
    ]) {
      expect(html).toContain(label)
    }
  })

  it('starts loading true and clears it only after the primary fetch settles', () => {
    expect(source).toMatch(/const \[loading, setLoading\] = useState\(true\)/)
    expect(source).toMatch(/\.finally\(\(\) => setLoading\(false\)\)/)
  })

  it('defers every service call to a post-mount effect (no fetch during server render)', () => {
    const html = renderToStaticMarkup(<EventDiscovery />)
    expect(html).toBeTruthy()
    expect(EventService.list).not.toHaveBeenCalled()
    expect(EventService.search).not.toHaveBeenCalled()
    expect(EventService.recommendations).not.toHaveBeenCalled()
    expect(EventService.nearby).not.toHaveBeenCalled()
  })
})

describe('EventDiscovery — event & recommendation fetch success', () => {
  it('hydrates events from EventService.list, filtered to public and enriched', () => {
    expect(source).toMatch(/EventService\.list\(\)/)
    expect(source).toMatch(/if \(data\?\.events\?\.length\) \{/)
    expect(source).toMatch(/const cleaned = data\.events\.filter\(isPublicEvent\)\.map\(enrichEvent\);/)
    expect(source).toMatch(/setEvents\(cleaned\)/)
  })

  it('does not overwrite the list when the list endpoint returns no events', () => {
    expect(source).toMatch(/if \(data\?\.events\?\.length\) \{\r?\n\s+const cleaned/)
  })

  it('requests 8 recommendations as an auth-optional call for every visitor', () => {
    expect(source).toContain('EventService.recommendations(8)')
    expect(source).toMatch(/const list = \(data\.events \|\| \[\]\)\.filter\(isPublicEvent\)\.map\(enrichEvent\);\r?\n\s+setRecommendedEvents\(list\)/)
    expect(eventServiceSource).toMatch(/allowAnonymous: true/)
  })

  it('derives nearby events from geolocation with a 50km radius and 8-event cap', () => {
    expect(source).toMatch(/EventService\.nearby\(\{/)
    expect(source).toMatch(/lat: pos\.coords\.latitude,/)
    expect(source).toMatch(/lon: pos\.coords\.longitude,/)
    expect(source).toMatch(/radius: 50,/)
    expect(source).toMatch(/limit: 8,/)
  })

  it('guards geolocation access before requesting nearby events', () => {
    expect(source).toContain("typeof navigator !== 'undefined' && navigator.geolocation")
  })
})

describe('EventDiscovery — partial failures & fallbacks', () => {
  it('swallows a list failure and still clears the loading flag', () => {
    expect(source).toMatch(/\.catch\(\(\) => \{\}\)\r?\n\s+\.finally\(\(\) => setLoading\(false\)\)/)
  })

  it('falls back to an empty category row when a category search fails', () => {
    expect(source).toMatch(/\.catch\(\(\) => setCategoryEvents\(\(prev\) => \(\{ \.\.\.prev, \[key\]: \[\] \}\)\)\)/)
  })

  it('guards category search results with an empty-array default', () => {
    expect(source).toMatch(/\(data\.events \|\| \[\]\)\.filter\(isPublicEvent\)\.map\(enrichEvent\)/)
  })

  it('resets recommendations to empty on failure', () => {
    expect(source).toMatch(/\.catch\(\(\) => setRecommendedEvents\(\[\]\)\)/)
  })

  it('resets nearby events on both API failure and geolocation denial', () => {
    expect(source).toMatch(/\.catch\(\(\) => setNearbyEvents\(\[\]\)\)/)
    expect(source).toMatch(/\(\) => setNearbyEvents\(\[\]\),/)
  })

  it('hides empty category rows once loading finishes', () => {
    expect(source).toMatch(/if \(!loading && events\.length === 0\) return null;/)
  })

  it('renders the no-events fallback text in special/trending sections when empty', () => {
    expect(source).toMatch(/specialEvents\.length === 0 \? \(/)
    expect(source).toMatch(/trendingEvents\.length === 0 \? \(/)
  })
})

describe('EventDiscovery — category rows with cards', () => {
  it('issues one bounded search per canonical category, capped at 4', () => {
    expect(source).toMatch(/const CATEGORY_KEYS = \['music', 'arts', 'sports', 'workshop', 'nightlife', 'tech'\] as const;/)
    expect(source).toMatch(/EventService\.search\(\{ category: key, limit: 4 \}\)/)
  })

  it('merges each category result into the category map by key', () => {
    expect(source).toMatch(/setCategoryEvents\(\(prev\) => \(\{ \.\.\.prev, \[key\]: list \}\)\)/)
  })

  it('renders one EventCard per event in a category row', () => {
    expect(source).toMatch(/<div key=\{event\.id\} className="h-full">\r?\n\s+<EventCard event=\{event\} \/>/)
  })

  it('keys the grid event cards in the search results by event id', () => {
    expect(source).toMatch(/<div\r?\n\s+key=\{event\.id\}\r?\n\s+className="animate-fade-in-up"/)
  })

  it('navigates each category see-more button to its canonical search query', () => {
    for (const cat of ['music', 'arts', 'sports', 'workshop', 'nightlife', 'tech']) {
      expect(source).toContain(`router.push('/search?category=${cat}')`)
    }
  })
})

describe('EventDiscovery — featured / trending / special section selection', () => {
  it('selects showcase events shared by hero, special and trending from the same curated pool', () => {
    expect(source).toMatch(/const showcaseEvents = useMemo\(\(\) => selectShowcaseEvents\(events\), \[events\]\);/)
    expect(source).toMatch(/const specialEvents = useMemo\(\(\) => showcaseEvents\.slice\(0, 6\), \[showcaseEvents\]\);/)
    expect(source).toMatch(/const trendingEvents = useMemo\(\(\) => showcaseEvents\.slice\(0, 10\), \[showcaseEvents\]\);/)
    expect(source).toContain('{!isFiltering && <HeroCarousel events={showcaseEvents} />}')
  })

  it('wraps the trending list in a horizontal carousel', () => {
    expect(source).toMatch(/<HomeCarousel header=\{<SectionHeading title=\{t\('trending_events'\)\}/)
  })

  it('returns an empty showcase for null or non-array input', () => {
    expect(selectShowcaseEvents(null as unknown as Event[])).toEqual([])
    expect(selectShowcaseEvents(undefined as unknown as Event[])).toEqual([])
    expect(selectShowcaseEvents({} as unknown as Event[])).toEqual([])
  })

  it('drops the known promo/idempotency test artifacts by name and id', () => {
    const promo = { id: 'evt_x', name: 'Promo Test Event' }
    const idem = { id: 'idempotency-test-event', name: 'Anything' }
    const live = { id: 'evt_1', name: 'Anh Trai Say Hi' }
    expect(selectShowcaseEvents([promo, idem, live] as unknown as Event[])).toEqual([live] as unknown as Event[])
  })

  it('rejects falsy entries from the showcase pool', () => {
    expect(selectShowcaseEvents([null, undefined] as unknown as Event[])).toEqual([])
  })
})

describe('EventDiscovery — deterministic partner ad placements', () => {
  it('picks 3 distinct gap slots and valid partner ids deterministically', () => {
    const map = getDeterministicCategoryAdPlacements()
    const gaps = Object.keys(map).map(Number)
    expect(gaps).toHaveLength(3)
    expect(new Set(gaps).size).toBe(3)
    for (const gap of gaps) {
      expect(gap).toBeGreaterThanOrEqual(1)
      expect(gap).toBeLessThanOrEqual(5)
    }
    for (const id of Object.values(map)) {
      expect(['shopee', 'hdbank', 'vib']).toContain(id)
    }
    expect(getDeterministicCategoryAdPlacements()).toEqual(map)
  })
})

describe('EventDiscovery — destination navigation', () => {
  it('pushes a city query to the landing page and syncs the local query state', () => {
    expect(source).toMatch(/router\.push\(`\/\?q=\$\{encodeURIComponent\(query\)\}`\)/)
    expect(source).toMatch(/setSearchQuery\(query\);\r?\n\s+router\.push/)
  })

  it('clears the query when an empty destination is selected', () => {
    expect(source).toMatch(/else \{\r?\n\s+setSearchQuery\(''\);\r?\n\s+router\.push\('\/'\);\r?\n\s+\}/)
  })

  it('navigates the near-you and recommended see-more buttons to /search', () => {
    expect(source.match(/onClick=\{\(\) => router\.push\('\/search'\)\}/g)).toHaveLength(2)
  })

  it('forwards an artist selection into the search results page', () => {
    expect(source).toMatch(/router\.push\(`\/search\?q=\$\{encodeURIComponent\(name\)\}`\)/)
  })
})

describe('EventDiscovery — attendance navigation from cards and links', () => {
  it('links special and trending event cards into the attendee detail route', () => {
    const links = source.match(/href=\{`\/attendee\/events\/\$\{event\.id\}`\}/g)
    expect(links).toHaveLength(2)
  })

  it('links every rendered EventCard into the attendee detail route', () => {
    expect(eventCardSource).toMatch(/const href = `\/attendee\/events\/\$\{event\.id\}`/)
  })
})

describe('EventDiscovery — authenticated vs anonymous outcomes', () => {
  it('makes no auth-gated calls: recommendations run for every visitor', () => {
    expect(source).toContain('EventService.recommendations(8)')
    expect(source).not.toMatch(/useSession|useAuth|getToken|signIn/)
    expect(eventServiceSource).toMatch(/allowAnonymous: true/)
  })

  it('renders a complete logged-out landing page without auth chrome', () => {
    const html = renderToStaticMarkup(<EventDiscovery />)
    expect(html).toContain('data-testid="navbar"')
    expect(html).not.toContain('data-testid="skeleton"')
    expect(html).not.toContain('data-testid="empty"')
  })

  it('syncs search and category filters from the URL for deep links', () => {
    expect(source).toMatch(/const q = searchParams\.get\('q'\);/)
    expect(source).toMatch(/const cat = searchParams\.get\('category'\);/)
    expect(source).toMatch(/setSearchQuery\(q \?\? ''\);/)
    expect(source).toMatch(/setActiveCategory\(cat \?\? 'all'\);/)
  })

  it('enters the filtered layout when a search or category filter is active', () => {
    expect(source).toMatch(/const isFiltering = !!searchQuery \|\| activeCategory !== 'all';/)
    expect(source).toMatch(/loading \? \(\r?\n\s+<SkeletonGrid count=\{8\} \/>/)
  })
})
