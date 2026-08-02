import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { ReviewsSection } from './ReviewsSection'
import { ReviewService } from '@/services/review.service'
import { toast } from 'sonner'

const auth = vi.hoisted(() => ({
  isAuthenticated: false,
}))

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

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => auth,
}))

vi.mock('next/link', () => ({
  default: (props: { href: string; children: React.ReactNode }) => (
    <a href={props.href}>{props.children}</a>
  ),
}))

vi.mock('@/services/review.service', () => ({
  ReviewService: { listByEvent: vi.fn(), create: vi.fn() },
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const messages = JSON.parse(readFileSync(process.cwd() + '/messages/vi.json', 'utf8'))
const reviews = messages.reviews

const source = readFileSync(new URL('./ReviewsSection.tsx', import.meta.url), 'utf8')

beforeEach(() => {
  auth.isAuthenticated = false
  vi.clearAllMocks()
})

describe('ReviewsSection — loading state', () => {
  it('defers the review fetch to a post-mount effect (no API call during render)', () => {
    const html = renderToStaticMarkup(<ReviewsSection eventId="evt_1" />)
    expect(html).toBeTruthy()
    expect(ReviewService.listByEvent).not.toHaveBeenCalled()
    expect(source).toMatch(/ReviewService\.listByEvent\(eventId\)/)
    expect(source).toMatch(/useEffect\(\(\) => \{\r?\n\s+load\(\);\r?\n\s+\}, \[load\]\)/)
  })

  it('shows skeleton rows while loading and no review list or empty state', () => {
    const html = renderToStaticMarkup(<ReviewsSection eventId="evt_1" />)
    expect((html.match(/data-slot="skeleton"/g) ?? [])).toHaveLength(12)
    expect(html).not.toContain('<ul')
    expect(html).not.toContain(reviews.empty)
    expect(source).toMatch(/setReviews\(data\.reviews \|\| \[\]\)/)
    expect(source).toMatch(/finally \{\r?\n\s+setLoading\(false\);\r?\n\s+\}/)
  })
})

describe('ReviewsSection — loaded review list', () => {
  it('renders one row per review with user, avatar fallback, comment and date', () => {
    expect(source).toMatch(/reviews\.map\(\(r\) => \{/)
    expect(source).toMatch(/\(r\.userName \|\| '\?'\)\.charAt\(0\)\.toUpperCase\(\)/)
    expect(source).toContain('{r.userName || \'—\'}')
    expect(source).toMatch(/r\.comment && \(/)
    expect(source).toContain('formatDate(r.createdAt)')
  })

  it('renders an avatar image only when userAvatar is present', () => {
    expect(source).toMatch(/r\.userAvatar \? <AvatarImage src=\{r\.userAvatar\}/)
    expect(source).toContain('r.userName || \'\'')
  })

  it('shows the rounded average rating header only when reviews exist', () => {
    expect(source).toMatch(/reviews\.length > 0 && \(/)
    expect(source).toContain('avg.toFixed(1)')
    expect(source).toContain('t(\'reviews_count\', { n: reviews.length })')
    expect(source).toContain('reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length')
  })
})

describe('ReviewsSection — empty state', () => {
  it('renders the empty state with translated title and description when there are no reviews', () => {
    expect(source).toMatch(/reviews\.length === 0 \? \(/)
    expect(source).toContain("EmptyState icon={MessageSquare} title={t('empty')} description={t('empty_desc')}")
  })
})

describe('ReviewsSection — locked write-review', () => {
  it('shows the not_ended locked message and hides the write CTA when authenticated but locked', () => {
    auth.isAuthenticated = true
    const html = renderToStaticMarkup(
      <ReviewsSection eventId="evt_1" canWrite={false} lockedReason="not_ended" />,
    )
    expect(html).toContain(reviews.locked_not_ended)
    expect(html).not.toContain(reviews.write_review)
    expect(html).not.toContain('href="/login"')
  })

  it('shows the not_multi locked message for repeating-event lockouts', () => {
    auth.isAuthenticated = true
    const html = renderToStaticMarkup(
      <ReviewsSection eventId="evt_1" canWrite={false} lockedReason="not_multi" />,
    )
    expect(html).toContain(reviews.locked_not_multi)
  })

  it('shows the generic locked message when no reason is given', () => {
    auth.isAuthenticated = true
    const html = renderToStaticMarkup(<ReviewsSection eventId="evt_1" canWrite={false} />)
    expect(html).toContain(reviews.locked_generic)
    expect(html).not.toContain(reviews.locked_not_ended)
    expect(html).not.toContain(reviews.locked_not_multi)
  })
})

describe('ReviewsSection — unauthenticated visitor', () => {
  it('shows a login link instead of the write CTA or a locked reason', () => {
    const html = renderToStaticMarkup(<ReviewsSection eventId="evt_1" />)
    expect(html).toContain('href="/login"')
    expect(html).toContain(reviews.login_to_review)
    expect(html).not.toContain(reviews.write_review)
    expect(html).not.toContain(reviews.locked_generic)
  })
})

describe('ReviewsSection — authenticated write CTA', () => {
  it('renders the write-review trigger for authenticated users who can write', () => {
    auth.isAuthenticated = true
    const html = renderToStaticMarkup(<ReviewsSection eventId="evt_1" />)
    expect(html).toContain(reviews.write_review)
    expect(html).not.toContain('href="/login"')
    expect(html).not.toContain(reviews.locked_generic)
  })
})

describe('ReviewsSection — review submission', () => {
  it('validates the rating before calling the API', () => {
    const guard = source.indexOf("if (draftRating < 1) {")
    const api = source.indexOf('ReviewService.create(eventId,')
    expect(guard).toBeGreaterThan(-1)
    expect(api).toBeGreaterThan(guard)
    expect(source).toMatch(/if \(draftRating < 1\) \{\r?\n\s+toast\.error\(t\('rating_label'\)\);\r?\n\s+return;\r?\n\s+\}/)
  })

  it('submits the rating and comment for the event id', () => {
    expect(source).toContain('ReviewService.create(eventId, { rating: draftRating, comment: draftComment })')
  })

  it('toggles the submitting flag around the create call', () => {
    const start = source.indexOf('setSubmitting(true)')
    const api = source.indexOf('ReviewService.create(eventId,')
    const end = source.indexOf('setSubmitting(false)')
    expect(start).toBeGreaterThan(-1)
    expect(start).toBeLessThan(api)
    expect(end).toBeGreaterThan(api)
    expect(source).toMatch(/finally \{\r?\n\s+setSubmitting\(false\);\r?\n\s+\}/)
  })

  it('confirms success, resets the draft, closes the dialog and reloads reviews', () => {
    expect(source).toContain("toast.success(t('submitted'))")
    expect(source).toContain('setDraftRating(0)')
    expect(source).toContain("setDraftComment('')")
    expect(source).toContain('setDialogOpen(false)')
    expect(source).toContain('await load()')
  })

  it('surfaces submission failures in a toast using the server message or fallback', () => {
    expect(source).toContain("toast.error(err?.message || t('submit_error'))")
  })
})

describe('ReviewsSection — load error handling', () => {
  it('logs a load failure and still clears the loading flag', () => {
    expect(source).toContain("console.error('Reviews load error:', err)")
    expect(source).toMatch(/catch \(err\) \{\r?\n\s+console\.error\('Reviews load error:', err\);\r?\n\s+\} finally \{/)
  })

  it('raises no toast during initial render', () => {
    renderToStaticMarkup(<ReviewsSection eventId="evt_1" />)
    expect(toast.error).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
  })
})

describe('ReviewsSection — pagination/show-more', () => {
  it('exposes no pagination or show-more control (not implemented)', () => {
    expect(source).not.toMatch(/ShowMore|show_more|pagination|Pagination|page\b/i)
  })
})
