import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { MediaGallery } from './MediaGallery'
import { MediaService } from '@/services/media.service'
import type { EventMedia } from '@/types'
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
    Image: icon('image'),
    Play: icon('play'),
    X: icon('x'),
    Inbox: icon('inbox'),
  }
})

vi.mock('@/services/media.service', () => ({
  MediaService: { listEventMedia: vi.fn() },
}))

const messages = JSON.parse(readFileSync(process.cwd() + '/messages/vi.json', 'utf8'))
const mediaMessages = messages.media

const source = readFileSync(new URL('./MediaGallery.tsx', import.meta.url), 'utf8')

const makeMedia = (overrides: Partial<EventMedia> = {}): EventMedia => ({
  id: 'm_1',
  eventId: 'evt_1',
  url: 'https://cdn.example.com/media/1.jpg',
  type: 'image',
  createdAt: '2026-07-01T00:00:00Z',
  ...overrides,
})

beforeEach(() => {
  injectedState.values.length = 0
  vi.clearAllMocks()
})

describe('MediaGallery — loading state', () => {
  it('defers the media fetch to a post-mount effect (no API call during render)', () => {
    const html = renderToStaticMarkup(<MediaGallery eventId="evt_1" />)
    expect(html).toBeTruthy()
    expect(MediaService.listEventMedia).not.toHaveBeenCalled()
    expect(source).toMatch(/MediaService\.listEventMedia\(eventId\)/)
    expect(source).toMatch(/useEffect\(\(\) => \{\r?\n\s+load\(\);\r?\n\s+\}, \[load\]\)/)
  })

  it('shows six skeleton tiles while loading and no media grid or empty state', () => {
    const html = renderToStaticMarkup(<MediaGallery eventId="evt_1" />)
    expect((html.match(/data-slot="skeleton"/g) ?? [])).toHaveLength(6)
    expect(html).not.toContain('safe-image')
    expect(html).not.toContain(mediaMessages.empty)
    expect(source).toMatch(/loading \? \(/)
    expect(source).toMatch(/Array\.from\(\{ length: 6 \}\)/)
  })
})

describe('MediaGallery — loaded media grid', () => {
  it('renders one button per media item with an image thumbnail', () => {
    injectedState.values = [
      [
        makeMedia({ id: 'm_1', caption: 'Sân khấu' }),
        makeMedia({
          id: 'm_2',
          url: 'https://cdn.example.com/video/1.mp4',
          type: 'video',
          caption: 'Bản thu',
        }),
      ],
      false,
    ]
    const html = renderToStaticMarkup(<MediaGallery eventId="evt_1" />)
    expect(html.match(/<button/g)).toHaveLength(2)
    expect(html.match(/data-testid="safe-image"/g)).toHaveLength(2)
    expect(html).toContain('https://cdn.example.com/media/1.jpg')
    expect(html).toContain('https://cdn.example.com/video/1.mp4')
    expect(html).not.toContain(mediaMessages.empty)
  })

  it('renders the play badge overlay on video items only', () => {
    injectedState.values = [
      [
        makeMedia({ id: 'm_1', type: 'image' }),
        makeMedia({ id: 'm_2', url: 'https://cdn.example.com/video/1.mp4', type: 'video' }),
      ],
      false,
    ]
    const html = renderToStaticMarkup(<MediaGallery eventId="evt_1" />)
    expect(html.match(/data-testid="icon-play"/g) ?? []).toHaveLength(1)
    expect(source).toMatch(/item\.type === 'image' \? \(/)
  })
})

describe('MediaGallery — empty state', () => {
  it('renders the empty state with translated title and description when media is empty', () => {
    injectedState.values = [[], false]
    const html = renderToStaticMarkup(<MediaGallery eventId="evt_1" />)
    expect(html).toContain(mediaMessages.empty)
    expect(html).toContain(mediaMessages.empty_desc)
    expect(html).not.toContain('safe-image')
    expect(html).not.toContain('data-slot="skeleton"')
    expect(source).toMatch(/media\.length === 0 \? \(/)
  })
})

describe('MediaGallery — load error handling', () => {
  it('logs a load failure and clears the loading flag', () => {
    expect(source).toContain("console.error('Media load error:', err)")
    expect(source).toMatch(/catch \(err\) \{\r?\n\s+console\.error\('Media load error:', err\);\r?\n\s+\} finally \{/)
    expect(source).toMatch(/finally \{\r?\n\s+setLoading\(false\);\r?\n\s+\}/)
  })

  it('falls back to an empty array when the API response lacks a media field', () => {
    expect(source).toMatch(/setMedia\(data\.media \|\| \[\]\)/)
  })

  it('raises no errors during static render', () => {
    renderToStaticMarkup(<MediaGallery eventId="evt_1" />)
    expect(MediaService.listEventMedia).not.toHaveBeenCalled()
  })
})

describe('MediaGallery — lightbox interactions', () => {
  it('opens an image dialog with close button and caption when active media is an image', () => {
    const active = makeMedia({ id: 'm_1', caption: 'Sân khấu chính' })
    injectedState.values = [[makeMedia()], false, active]
    const html = renderToStaticMarkup(<MediaGallery eventId="evt_1" />)
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain(`aria-label="${mediaMessages.close}"`)
    expect(html).toContain(`src="${active.url}"`)
    expect(html).toContain('Sân khấu chính')
    expect(html).not.toContain('<video')
  })

  it('renders a video element with controls and autoplay for active video media', () => {
    const active = makeMedia({
      id: 'm_2',
      url: 'https://cdn.example.com/video/1.mp4',
      type: 'video',
    })
    injectedState.values = [[makeMedia()], false, active]
    const html = renderToStaticMarkup(<MediaGallery eventId="evt_1" />)
    expect(html).toContain('<video')
    expect(html).toContain('controls')
    expect(html).toContain('autoPlay')
    expect(html).toContain('src="https://cdn.example.com/video/1.mp4"')
  })

  it('closes the lightbox on Escape and on backdrop or close-button click', () => {
    expect(source).toMatch(/if \(e\.key === 'Escape'\) setActive\(null\)/)
    expect(source).toMatch(/window\.addEventListener\('keydown', onKey\)/)
    expect(source).toMatch(/return \(\) => window\.removeEventListener\('keydown', onKey\)/)
    expect((source.match(/onClick=\{\(\) => setActive\(null\)\}/g) ?? [])).toHaveLength(2)
  })

  it('stops propagation on the lightbox content so inner clicks do not close it', () => {
    expect(source).toContain('onClick={(e) => e.stopPropagation()}')
  })

  it('omits the caption paragraph when active media has no caption', () => {
    const active = makeMedia()
    injectedState.values = [[makeMedia()], false, active]
    const html = renderToStaticMarkup(<MediaGallery eventId="evt_1" />)
    expect(html).not.toContain('<p')
    expect(source).toMatch(/active\.caption && \(/)
  })
})

describe('MediaGallery — missing optional media fields', () => {
  it('falls back to a default aria-label and empty alt when caption is missing', () => {
    injectedState.values = [[makeMedia({ caption: undefined })], false]
    const html = renderToStaticMarkup(<MediaGallery eventId="evt_1" />)
    expect(html).toContain('aria-label="Open media"')
    expect(html).toContain('alt=""')
    expect(source).toContain("item.caption || 'Open media'")
    expect(source).toContain("item.caption || ''")
  })

  it('uses the caption for both the grid aria-label and the image alt when present', () => {
    injectedState.values = [[makeMedia({ caption: 'Sân khấu chính' })], false]
    const html = renderToStaticMarkup(<MediaGallery eventId="evt_1" />)
    expect(html).toContain('aria-label="Sân khấu chính"')
    expect(html).toContain('alt="Sân khấu chính"')
  })
})

describe('MediaGallery — pagination/load-more', () => {
  it('exposes no pagination or load-more control (not implemented)', () => {
    expect(source).not.toMatch(/ShowMore|show_more|pagination|Pagination|page\b/i)
  })
})
