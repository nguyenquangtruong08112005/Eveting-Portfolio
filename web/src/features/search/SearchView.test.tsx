import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { SearchView } from './SearchView'
import { EventService } from '@/services/event.service'

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

vi.mock('@/i18n/routing', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: (key: string) => searchParamsStore[key] ?? '' }),
}))

vi.mock('@/services/event.service', () => ({
  EventService: { search: vi.fn() },
}))

vi.mock('next/link', () => ({
  default: (props: { href: string; children: React.ReactNode }) => <a href={props.href}>{props.children}</a>,
}))

vi.mock('next/image', () => ({
  default: (props: { src: string; alt?: string }) => <img src={props.src} alt={props.alt ?? ''} />,
}))

vi.mock('@/components/layout/Navbar', () => ({ Navbar: () => <nav>Navbar</nav> }))
vi.mock('@/components/layout/Footer', () => ({ Footer: () => <footer>Footer</footer> }))

const source = readFileSync(new URL('./SearchView.tsx', import.meta.url), 'utf8')
const eventCardSource = readFileSync(new URL('../../../src/components/events/EventCard.tsx', import.meta.url), 'utf8')

describe('SearchView — loading / default results', () => {
  beforeEach(() => {
    setSearchParams({})
    vi.mocked(EventService.search).mockReset()
  })

  it('renders the page header, query box and filter button on first render', () => {
    const html = renderToStaticMarkup(<SearchView />)
    expect(html).toContain('Tìm sự kiện')
    expect(html).toContain('Nghệ sĩ, địa điểm, thành phố…')
    expect(html).toContain('Bộ lọc')
    expect(html).toContain('Tìm thấy 0 sự kiện')
  })

  it('shows the skeleton grid while loading and defers the fetch to after mount', () => {
    vi.mocked(EventService.search).mockImplementation(() => new Promise(() => {}))
    const html = renderToStaticMarkup(<SearchView />)
    expect(html).toContain('skeleton-shimmer')
    expect(html).not.toContain('Không tìm thấy sự kiện nào')
    expect(html).not.toContain('Nhạc sống')
    expect(EventService.search).not.toHaveBeenCalled()
  })

  it('hydrates filters from the URL query params on mount', () => {
    expect(source).toMatch(/q: searchParams\.get\('q'\)/)
    expect(source).toMatch(/category: searchParams\.get\('category'\)/)
    expect(source).toMatch(/city: searchParams\.get\('city'\)/)
    expect(source).toMatch(/dateFrom: searchParams\.get\('dateFrom'\)/)
    expect(source).toMatch(/dateTo: searchParams\.get\('dateTo'\)/)
    expect(source).toMatch(/minPrice: searchParams\.get\('minPrice'\)/)
    expect(source).toMatch(/maxPrice: searchParams\.get\('maxPrice'\)/)
    expect(source).toMatch(/setFilters\(next\);\s+setDraft\(next\)/)
  })
})

describe('SearchView — query submit', () => {
  beforeEach(() => {
    setSearchParams({})
    vi.mocked(EventService.search).mockReset()
  })

  it('submits the trimmed keyword through the URL and into the search call', () => {
    expect(source).toMatch(/if \(draft\.q\.trim\(\)\) qs\.set\('q', draft\.q\.trim\(\)\)/)
    expect(source).toMatch(/params\.q = filters\.q\.trim\(\)/)
    expect(source).toContain('router.push(qs.toString() ? `/search?${qs}` : \'/search\')')
  })

  it('keeps already-applied filters when submitting a new keyword', () => {
    expect(source).toMatch(/const next = \{ \.\.\.filters, q: draft\.q \}/)
    expect(source).toMatch(/if \(next\.category\) qs\.set\('category', next\.category\)/)
    expect(source).toMatch(/if \(next\.city\.trim\(\)\) qs\.set\('city', next\.city\.trim\(\)\)/)
    expect(source).toMatch(/if \(next\.dateFrom\) qs\.set\('dateFrom', next\.dateFrom\)/)
    expect(source).toMatch(/if \(next\.dateTo\) qs\.set\('dateTo', next\.dateTo\)/)
  })
})

describe('SearchView — category / location / date / price filtering', () => {
  beforeEach(() => {
    setSearchParams({})
    vi.mocked(EventService.search).mockReset()
  })

  it('exposes a filter panel with category, city, date range and price controls', () => {
    const html = renderToStaticMarkup(<SearchView />)
    expect(html).toContain('Bộ lọc')
    expect(source).toContain('SEARCH_CATEGORY_OPTIONS.map((c) =>')
    expect(source).toMatch(/placeholder=\{t\('city_placeholder'\)\}/)
    expect(source).toMatch(/type="date"/)
    expect(source).toMatch(/type="number"/)
    expect(source).toContain("setFilterOpen((o) => !o)")
  })

  it('offers the all-categories option plus every canonical category', () => {
    const allOptions = source.match(/key=\{c \|\| 'all'\}/g)
    expect(allOptions).not.toBeNull()
    expect(source).toContain("SEARCH_CATEGORY_OPTIONS.map((c) =>")
    expect(source).toMatch(/t\('all_categories'\)/)
    expect(source).toMatch(/tCat\(key as CategoryKey\)/)
  })

  it('forwards category, city and date filters to the search request', () => {
    expect(source).toMatch(/params\.category = filters\.category/)
    expect(source).toMatch(/params\.city = filters\.city\.trim\(\)/)
    expect(source).toMatch(/params\.dateFrom = filters\.dateFrom/)
    expect(source).toMatch(/params\.dateTo = filters\.dateTo/)
  })

  it('converts min/max price inputs to numbers for the search request', () => {
    expect(source).toMatch(/params\.minPrice = Number\(filters\.minPrice\)/)
    expect(source).toMatch(/params\.maxPrice = Number\(filters\.maxPrice\)/)
  })

  it('serializes applied filters into the URL when the user applies them', () => {
    expect(source).toMatch(/if \(draft\.category\) qs\.set\('category', draft\.category\)/)
    expect(source).toMatch(/if \(draft\.city\.trim\(\)\) qs\.set\('city', draft\.city\.trim\(\)\)/)
    expect(source).toMatch(/if \(draft\.dateFrom\) qs\.set\('dateFrom', draft\.dateFrom\)/)
    expect(source).toMatch(/if \(draft\.dateTo\) qs\.set\('dateTo', draft\.dateTo\)/)
    expect(source).toMatch(/if \(draft\.minPrice\) qs\.set\('minPrice', draft\.minPrice\)/)
    expect(source).toMatch(/if \(draft\.maxPrice\) qs\.set\('maxPrice', draft\.maxPrice\)/)
    expect(source).toMatch(/setFilters\(draft\)/)
  })

  it('shows an active-filter count badge that ignores the keyword', () => {
    expect(source).toMatch(/if \(f\.category\) n\+\+/)
    expect(source).toMatch(/if \(f\.city\.trim\(\)\) n\+\+/)
    expect(source).toMatch(/if \(f\.dateFrom\) n\+\+/)
    expect(source).toMatch(/if \(f\.dateTo\) n\+\+/)
    expect(source).toMatch(/if \(f\.minPrice\) n\+\+/)
    expect(source).toMatch(/if \(f\.maxPrice\) n\+\+/)
    expect(source).toMatch(/activeFilterCount > 0 && \(/)
    expect(source).not.toMatch(/if \(f\.q\) n\+\+/)
  })

  it('hides the filter badge when no filters are active', () => {
    const html = renderToStaticMarkup(<SearchView />)
    expect(html).not.toMatch(/min-w-5 h-5 px-1 rounded-full/)
  })
})

describe('SearchView — empty and error results', () => {
  beforeEach(() => {
    setSearchParams({})
    vi.mocked(EventService.search).mockReset()
  })

  it('renders the empty state when a completed search returns no events', () => {
    expect(source).toMatch(/events\.length === 0 \? \(/)
    expect(source).toContain('<EmptyState icon={Search} title={tHome(\'no_events\')} description={tHome(\'no_events_hint\')} />')
    expect(source).toContain('loading ? (')
    const messages = JSON.parse(readFileSync(process.cwd() + '/messages/vi.json', 'utf8'))
    expect(messages.home.no_events).toContain('Không tìm thấy sự kiện nào')
    expect(messages.home.no_events_hint).toContain('Hãy thử kiểm tra lại chính tả')
  })

  it('filters out non-public events before rendering results', () => {
    expect(source).toMatch(/\(data\.events \|\| \[\]\)\.filter\(isPublicEvent\)\.map\(enrichEvent\)/)
    expect(source).toContain('isPublicEvent')
  })

  it('surfaces a user-visible error banner and distinguishes rate limiting', () => {
    expect(source).toMatch(/err instanceof HttpError && err\.status === 429/)
    expect(source).toContain("? t('rate_limited')")
    expect(source).toMatch(/err instanceof Error\s+\? err\.message\s+: t\('error'\)/)
    expect(source).toContain('{error && (')
    const messages = JSON.parse(readFileSync(process.cwd() + '/messages/vi.json', 'utf8'))
    expect(messages.search_page.error).toContain('Tìm kiếm thất bại. Vui lòng thử lại.')
    expect(messages.search_page.rate_limited).toContain('Quá nhiều yêu cầu')
  })

  it('clears the result list when a fresh search fails', () => {
    expect(source).toMatch(/if \(replace\) \{\s+setEvents\(\[\]\);\s+setTotal\(0\);\s+setHasMore\(false\);/)
  })
})

describe('SearchView — clear / reset and navigation', () => {
  beforeEach(() => {
    setSearchParams({})
    vi.mocked(EventService.search).mockReset()
  })

  it('resets draft and applied filters and navigates back to /search', () => {
    expect(source).toMatch(/setDraft\(emptyFilters\);\s+setFilters\(emptyFilters\);\s+setFilterOpen\(false\);/)
    expect(source).toContain("router.push('/search')")
    expect(source).toContain('tHome(\'clear_filter\')')
    expect(source).toContain("t('apply')")
  })

  it('renders one event card per result, keyed by event id', () => {
    expect(source).toMatch(/events\.map\(\(event\) => \(/)
    expect(source).toContain('<EventCard key={event.id} event={event} />')
  })

  it('links each result card into the event detail page', () => {
    expect(eventCardSource).toMatch(/const href = `\/attendee\/events\/\$\{event\.id\}`/)
  })
})
