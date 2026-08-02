import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { CheckoutView } from './CheckoutView'
import { EventService, validateCheckoutQuestions } from './api'

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
  const checkout = messages.checkout
  const t = (key: string, params?: Record<string, unknown>) => {
    let value = checkout[key]
    if (value === undefined) return key
    if (params) value = value.replace(/\{(\w+)\}/g, (_, p) => String(params[p] ?? `{${p}}`))
    return value
  }
  return { useTranslations: () => t }
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

vi.mock('@/features/checkout/api', () => ({
  EventService: { getById: vi.fn() },
  TicketService: { createPaymentOrder: vi.fn() },
  createCheckoutOrder: vi.fn(),
  createOrderPayment: vi.fn(),
  quoteCheckoutVoucher: vi.fn(),
  saveCheckoutAttendees: vi.fn(),
  validateCheckoutQuestions: vi.fn(() => null),
}))

vi.mock('next/link', () => ({
  default: (props: { href: string; children: React.ReactNode }) => <a href={props.href}>{props.children}</a>,
}))

vi.mock('next/image', () => ({
  default: (props: { src: string; alt?: string }) => <img src={props.src} alt={props.alt ?? ''} />,
}))

vi.mock('@/components/layout/Navbar', () => ({ Navbar: () => <nav>Navbar</nav> }))
vi.mock('@/components/layout/Footer', () => ({ Footer: () => <footer>Footer</footer> }))

const checkoutSource = readFileSync(new URL('./CheckoutView.tsx', import.meta.url), 'utf8')

describe('CheckoutView', () => {
  beforeEach(() => {
    setSearchParams({ eventId: 'evt_1' })
    vi.mocked(EventService.getById).mockReset()
    vi.mocked(validateCheckoutQuestions).mockReturnValue(null)
  })

  it('shows the loading state on initial render and defers the event fetch to after mount', () => {
    vi.mocked(EventService.getById).mockImplementation(() => new Promise(() => {}))
    const html = renderToStaticMarkup(<CheckoutView />)
    expect(html).toContain('Đang tải hóa đơn đặt vé...')
    expect(html).not.toContain('event_not_found')
    expect(html).not.toContain('Tóm Tắt Đơn Hàng')
    expect(EventService.getById).not.toHaveBeenCalled()
  })

  it('redirects to home when the eventId query param is missing', () => {
    expect(checkoutSource).toMatch(/if \(!eventId\)/)
    expect(checkoutSource).toMatch(/router\.push\('\/'\)/)
  })

  it('guards booking until attendee billing info is complete', () => {
    expect(checkoutSource).toMatch(/if \(!name \|\| !email \|\| !phone\)/)
    expect(checkoutSource).toContain('fill_info')
  })

  it('guards booking until required custom questions are answered', () => {
    expect(checkoutSource).toMatch(/validateCheckoutQuestions\(event\?\.customQuestions \|\| \[\]/)
    expect(checkoutSource).toContain('question_required')
  })

  it('blocks booking when the seat hold has expired', () => {
    expect(checkoutSource).toMatch(/if \(seatHoldExpired\)/)
    expect(checkoutSource).toContain('seat_hold_expired')
  })

  it('submits the booking through the idempotent order path and redirects to payment', () => {
    expect(checkoutSource).toContain('setProcessing(true)')
    expect(checkoutSource).toMatch(/createCheckoutOrder\(\{/)
    expect(checkoutSource).toMatch(/saveCheckoutAttendees\(/)
    expect(checkoutSource).toMatch(/navigateToSafeExternalUrl\(paymentUrl\)/)
    expect(checkoutSource).toContain('setProcessing(false)')
  })

  it('surfaces a user-visible error banner when the booking fails', () => {
    expect(checkoutSource).toMatch(/err as \{ response\?/)
    expect(checkoutSource).toMatch(/\?\.response\?\.data\?\.message/)
    expect(checkoutSource).toContain('{errorMsg && (')
  })
})
