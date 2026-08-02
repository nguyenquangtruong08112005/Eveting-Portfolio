import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { ArtistStars } from './ArtistStars'
import { ProfileService } from '@/services/profile.service'

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

vi.mock('@/services/profile.service', () => ({
  ProfileService: { list: vi.fn() },
}))

const messages = JSON.parse(readFileSync(process.cwd() + '/messages/vi.json', 'utf8'))
const artistSource = readFileSync(new URL('./ArtistStars.tsx', import.meta.url), 'utf8')

describe('ArtistStars — loading state', () => {
  it('renders six skeleton placeholders while the profile list is loading', () => {
    const html = renderToStaticMarkup(<ArtistStars onSelectArtist={vi.fn()} />)
    expect(html.match(/animate-pulse/g)).toHaveLength(6)
    expect(html).not.toContain('FeaturedArtist')
  })

  it('defers the profile fetch until after mount', () => {
    renderToStaticMarkup(<ArtistStars onSelectArtist={vi.fn()} />)
    expect(ProfileService.list).not.toHaveBeenCalled()
  })
})

describe('ArtistStars — profile list rendering', () => {
  it('requests the first fifteen featured profiles', () => {
    expect(artistSource).toMatch(/ProfileService\.list\(1, 15\)/)
  })

  it('keeps the previous list when the response has no profiles', () => {
    expect(artistSource).toMatch(/if \(data\?\.profiles\) \{/)
    expect(artistSource).toMatch(/setProfiles\(data\.profiles\);/)
  })

  it('renders nothing at all when no profiles are returned', () => {
    expect(artistSource).toMatch(/if \(profiles\.length === 0\) return null;/)
  })

  it('falls back to the shared image when a profile has no image url', () => {
    expect(artistSource).toMatch(/profile\.imageUrl \|\| FALLBACK_IMAGE/)
    expect(artistSource).toMatch(/alt=\{profile\.name\}/)
  })

  it('selects the artist on click, Enter and Space', () => {
    expect(artistSource).toMatch(/onClick=\{\(\) => onSelectArtist\(profile\.name\)\}/)
    expect(artistSource).toMatch(/e\.key === 'Enter' \|\| e\.key === ' '/)
    expect(artistSource).toMatch(/onSelectArtist\(profile\.name\);/)
  })
})

describe('ArtistStars — scroll controls', () => {
  it('scrolls the artist row left and right through the arrow buttons', () => {
    expect(artistSource).toMatch(/aria-label="Scroll left"/)
    expect(artistSource).toMatch(/aria-label="Scroll right"/)
    expect(artistSource).toMatch(/handleScroll\('left'\)/)
    expect(artistSource).toMatch(/handleScroll\('right'\)/)
    expect(artistSource).toMatch(/container\.scrollBy\(/)
  })

  it('enables arrows only when the row can scroll further', () => {
    expect(artistSource).toMatch(/setCanScrollLeft\(scrollLeft > 4\);/)
    expect(artistSource).toMatch(
      /setCanScrollRight\(scrollLeft \+ clientWidth < scrollWidth - 4\);/,
    )
  })

  it('re-checks arrow availability on resize and cleanup the listener on unmount', () => {
    expect(artistSource).toMatch(/window\.addEventListener\('resize', checkScrollButtons\)/)
    expect(artistSource).toMatch(/window\.removeEventListener\('resize', checkScrollButtons\)/)
  })
})
