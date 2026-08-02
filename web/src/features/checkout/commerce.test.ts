import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { buildCheckoutPayload, validateCheckoutQuestions } from './commerce.contract'

const questions = [
  { id: 'eq_text', questionText: 'Name', questionType: 'text' as const, isRequired: true, options: [] },
  { id: 'eq_single', questionText: 'Size', questionType: 'single_choice' as const, isRequired: true, options: ['S', 'M'] },
  { id: 'eq_multi', questionText: 'Days', questionType: 'multi_choice' as const, isRequired: true, options: ['Fri', 'Sat'] },
]

describe('buildCheckoutPayload', () => {
  it('preserves items in payload', () => {
    expect(
      buildCheckoutPayload({
        eventId: 'evt_1',
        items: [{ ticketType: 'standard', quantity: 1 }, { ticketType: 'vip', quantity: 2 }],
        promoCode: 'ONECODE',
        attendees: [{ name: 'Buyer', email: 'buyer@example.com', answers: { eq_text: 'Buyer' } }],
      }).items,
    ).toEqual([{ ticketType: 'standard', quantity: 1 }, { ticketType: 'vip', quantity: 2 }])
  })

  it('includes seatHold when provided', () => {
    expect(
      buildCheckoutPayload({
        eventId: 'evt_seated',
        items: [{ ticketType: 'vip', quantity: 2 }],
        attendees: [{ name: 'Buyer', email: 'buyer@example.com', answers: {} }],
        seatHold: { performanceId: 'perf_1', holdToken: 'hold_1', seatIds: ['seat_1', 'seat_2'] },
      }).seatHold,
    ).toEqual({ performanceId: 'perf_1', holdToken: 'hold_1', seatIds: ['seat_1', 'seat_2'] })
  })
})

describe('validateCheckoutQuestions', () => {
  it('returns null when all required questions are answered validly', () => {
    expect(validateCheckoutQuestions(questions, { eq_text: 'Buyer', eq_single: 'M', eq_multi: ['Fri'] })).toBeNull()
  })

  it('returns question id when required text answer is empty', () => {
    expect(validateCheckoutQuestions(questions, { eq_text: '', eq_single: 'M', eq_multi: ['Fri'] })).toBe('eq_text')
  })

  it('returns question id when single_choice answer is not in options', () => {
    expect(validateCheckoutQuestions(questions, { eq_text: 'Buyer', eq_single: 'L', eq_multi: ['Fri'] })).toBe('eq_single')
  })
})

describe('commerce adapter endpoint constants', () => {
  const commerceAdapterSource = readFileSync(new URL('./commerce.ts', import.meta.url), 'utf8')

  it('defines ORDER_CHECKOUT_PATH', () => {
    expect(commerceAdapterSource).toMatch(/const ORDER_CHECKOUT_PATH = '\/api\/web\/orders\/checkout';/)
  })

  it('constructs attendees URL with encodeURIComponent', () => {
    expect(commerceAdapterSource).toMatch(/`\/api\/web\/orders\/\$\{encodeURIComponent\(orderId\)\}\/attendees`/)
  })

  it('sends eventId and attendees in the body', () => {
    expect(commerceAdapterSource).toMatch(/body: \{ eventId, attendees \}/)
  })

  it('references create-order payment endpoint', () => {
    expect(commerceAdapterSource).toMatch(/'\/api\/web\/payments\/create-order'/)
  })
})
