vi.mock('./apiClient', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./apiClient')>()
  return { ...mod, request: vi.fn() }
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TicketService } from './ticket.service'
import { request } from './apiClient'

const mockedRequest = vi.mocked(request)

const fakeSeat = { id: 's_1', seatSectionId: 'sec_1', sectionName: 'A', priceMultiplier: 1, rowName: '1', seatNumber: 5, status: 'available' as const }
const ikHeader = { 'X-Idempotency-Key': expect.any(String) }

describe('TicketService', () => {
  beforeEach(() => { mockedRequest.mockReset() })

  describe('getEventSeats', () => {
    it('GET event seats', async () => {
      mockedRequest.mockResolvedValue([fakeSeat])
      const result = await TicketService.getEventSeats('evt_1')
      expect(mockedRequest).toHaveBeenCalledWith('GET', '/api/web/tickets/event/evt_1/seats')
      expect(result).toEqual([fakeSeat])
    })
  })

  describe('holdSeat', () => {
    it('POST hold-seat with body and idempotency key', async () => {
      mockedRequest.mockResolvedValue({ message: 'held' })
      const result = await TicketService.holdSeat('evt_1', 's_1')
      expect(mockedRequest).toHaveBeenCalledWith('POST', '/api/web/tickets/hold-seat', {
        body: { eventId: 'evt_1', seatId: 's_1' },
        headers: ikHeader,
      })
      expect(result).toEqual({ message: 'held' })
    })
  })

  describe('releaseSeat', () => {
    it('POST release-seat with body, no idempotency key', async () => {
      mockedRequest.mockResolvedValue({ message: 'released' })
      const result = await TicketService.releaseSeat('evt_1', 's_1')
      expect(mockedRequest).toHaveBeenCalledWith('POST', '/api/web/tickets/release-seat', {
        body: { eventId: 'evt_1', seatId: 's_1' },
      })
      expect(result).toEqual({ message: 'released' })
    })
  })

  describe('bookHeldSeats', () => {
    it('POST with eventId, seatIds, promoCode', async () => {
      mockedRequest.mockResolvedValue({ message: 'booked', orderId: 'ord_1', tickets: [{ id: 't_1' }] })
      const result = await TicketService.bookHeldSeats('evt_1', ['s_1', 's_2'], 'PROMO10')
      expect(mockedRequest).toHaveBeenCalledWith('POST', '/api/web/tickets/book-held-seats', {
        body: { eventId: 'evt_1', seatIds: ['s_1', 's_2'], promoCode: 'PROMO10' },
        headers: ikHeader,
      })
      expect(result.orderId).toBe('ord_1')
    })

    it('works without promoCode', async () => {
      mockedRequest.mockResolvedValue({ message: 'booked', tickets: [{ id: 't_1' }] })
      const result = await TicketService.bookHeldSeats('evt_1', ['s_1'])
      expect(mockedRequest).toHaveBeenCalledWith('POST', '/api/web/tickets/book-held-seats', {
        body: { eventId: 'evt_1', seatIds: ['s_1'], promoCode: undefined },
        headers: ikHeader,
      })
      expect(result.tickets).toEqual([{ id: 't_1' }])
    })
  })

  describe('bookTickets', () => {
    it('iterates items, one POST per item', async () => {
      mockedRequest.mockResolvedValue({ id: 't_1' })
      const items = [{ ticketType: 'vip', quantity: 1 }, { ticketType: 'regular', quantity: 2 }]
      const result = await TicketService.bookTickets('evt_1', items)
      expect(mockedRequest).toHaveBeenCalledTimes(2)
      expect(mockedRequest).toHaveBeenNthCalledWith(1, 'POST', '/api/web/tickets/book', {
        body: { eventId: 'evt_1', ticketType: 'vip', quantity: 1, promoCode: undefined },
        headers: ikHeader,
      })
      expect(mockedRequest).toHaveBeenNthCalledWith(2, 'POST', '/api/web/tickets/book', {
        body: { eventId: 'evt_1', ticketType: 'regular', quantity: 2, promoCode: undefined },
        headers: ikHeader,
      })
      expect(result.tickets).toEqual([{ id: 't_1' }, { id: 't_1' }])
    })

    it('skips items where response has no id', async () => {
      mockedRequest.mockResolvedValueOnce({ id: 't_1' }).mockResolvedValueOnce({})
      const items = [{ ticketType: 'vip', quantity: 1 }, { ticketType: 'fail', quantity: 1 }]
      const result = await TicketService.bookTickets('evt_1', items)
      expect(result.tickets).toEqual([{ id: 't_1' }])
    })

    it('passes promoCode', async () => {
      mockedRequest.mockResolvedValue({ id: 't_1' })
      await TicketService.bookTickets('evt_1', [{ ticketType: 'vip', quantity: 1 }], 'PROMO')
      expect(mockedRequest).toHaveBeenCalledWith('POST', '/api/web/tickets/book', {
        body: { eventId: 'evt_1', ticketType: 'vip', quantity: 1, promoCode: 'PROMO' },
        headers: ikHeader,
      })
    })
  })

  describe('bookOrderAtomic', () => {
    it('POST book-order with items and idempotency key', async () => {
      mockedRequest.mockResolvedValue({ orderId: 'ord_1', tickets: [{ id: 't_1' }] })
      const items = [{ ticketType: 'vip', quantity: 2 }]
      const result = await TicketService.bookOrderAtomic('evt_1', items, 'PROMO')
      expect(mockedRequest).toHaveBeenCalledWith('POST', '/api/web/tickets/book-order', {
        body: { eventId: 'evt_1', items, promoCode: 'PROMO' },
        headers: ikHeader,
      })
      expect(result.orderId).toBe('ord_1')
    })
  })

  describe('createPaymentOrder', () => {
    it('POST create-order with ticketId and redirectUrl', async () => {
      mockedRequest.mockResolvedValue({ order_url: 'https://pay.example.com/123', app_trans_id: 'app_123' })
      const result = await TicketService.createPaymentOrder('t_1', 'https://example.com/return')
      expect(mockedRequest).toHaveBeenCalledWith('POST', '/api/web/payments/create-order', {
        body: { ticketId: 't_1', redirectUrl: 'https://example.com/return' },
        headers: ikHeader,
      })
      expect(result.order_url).toBe('https://pay.example.com/123')
    })

    it('works without redirectUrl', async () => {
      mockedRequest.mockResolvedValue({ order_url: '', app_trans_id: 'app_123' })
      await TicketService.createPaymentOrder('t_1')
      expect(mockedRequest).toHaveBeenCalledWith('POST', '/api/web/payments/create-order', {
        body: { ticketId: 't_1', redirectUrl: undefined },
        headers: ikHeader,
      })
    })
  })

  describe('createBulkPaymentOrder', () => {
    it('POST create-order-bulk with orderId and redirectUrl', async () => {
      mockedRequest.mockResolvedValue({ order_url: 'https://pay.example.com/456', app_trans_id: 'app_456', orderId: 'ord_1' })
      const result = await TicketService.createBulkPaymentOrder('ord_1', 'https://example.com/return')
      expect(mockedRequest).toHaveBeenCalledWith('POST', '/api/web/payments/create-order-bulk', {
        body: { orderId: 'ord_1', redirectUrl: 'https://example.com/return' },
        headers: ikHeader,
      })
      expect(result.orderId).toBe('ord_1')
    })

    it('works without redirectUrl', async () => {
      mockedRequest.mockResolvedValue({ order_url: '', app_trans_id: 'app_456', orderId: 'ord_1' })
      await TicketService.createBulkPaymentOrder('ord_1')
      expect(mockedRequest).toHaveBeenCalledWith('POST', '/api/web/payments/create-order-bulk', {
        body: { orderId: 'ord_1', redirectUrl: undefined },
        headers: ikHeader,
      })
    })
  })

  describe('checkOrderPaymentStatus', () => {
    it('POST check-order-status', async () => {
      mockedRequest.mockResolvedValue({ status: 'paid', orderId: 'ord_1', totalAmount: 50000 })
      const result = await TicketService.checkOrderPaymentStatus('ord_1')
      expect(mockedRequest).toHaveBeenCalledWith('POST', '/api/web/payments/check-order-status', {
        body: { orderId: 'ord_1' },
        headers: ikHeader,
      })
      expect(result.status).toBe('paid')
    })
  })

  describe('validateVoucher', () => {
    it('POST validate with code, orderTotal, eventId', async () => {
      mockedRequest.mockResolvedValue({ valid: true, discountType: 'percent', discountValue: 10, discountAmount: 5000, message: 'ok' })
      const result = await TicketService.validateVoucher('PROMO10', 50000, 'evt_1')
      expect(mockedRequest).toHaveBeenCalledWith('POST', '/api/web/vouchers/validate', {
        body: { code: 'PROMO10', orderTotal: 50000, eventId: 'evt_1' },
      })
      expect(result.valid).toBe(true)
    })

    it('works without eventId', async () => {
      mockedRequest.mockResolvedValue({ valid: false, message: 'invalid' })
      const result = await TicketService.validateVoucher('CODE', 10000)
      expect(mockedRequest).toHaveBeenCalledWith('POST', '/api/web/vouchers/validate', {
        body: { code: 'CODE', orderTotal: 10000, eventId: undefined },
      })
      expect(result.valid).toBe(false)
    })
  })

  describe('getUserTickets', () => {
    it('GET with default page=1, limit=10', async () => {
      const fake = { tickets: [{ id: 't_1', eventId: 'evt_1', userId: 'u_1', ticketType: 'vip', status: 'active' as const, purchasedAt: 1700000000000 }], pagination: { currentPage: 1, limit: 10, totalPages: 1, totalItems: 1 } }
      mockedRequest.mockResolvedValue(fake)
      const result = await TicketService.getUserTickets()
      expect(mockedRequest).toHaveBeenCalledWith('GET', '/api/web/tickets?page=1&limit=10')
      expect(result.tickets).toHaveLength(1)
    })

    it('custom page/limit', async () => {
      mockedRequest.mockResolvedValue({ tickets: [], pagination: { currentPage: 2, limit: 20, totalPages: 0, totalItems: 0 } })
      const result = await TicketService.getUserTickets(2, 20)
      expect(mockedRequest).toHaveBeenCalledWith('GET', '/api/web/tickets?page=2&limit=20')
      expect(result.pagination?.currentPage).toBe(2)
    })
  })

  describe('getTicketDetails', () => {
    it('GET ticket by id', async () => {
      mockedRequest.mockResolvedValue({ id: 't_1', status: 'active', qrCode: 'qr_data' })
      const result = await TicketService.getTicketDetails('t_1')
      expect(mockedRequest).toHaveBeenCalledWith('GET', '/api/web/tickets/t_1')
      expect(result.qrCode).toBe('qr_data')
    })
  })

  describe('checkPaymentStatus', () => {
    it('POST check-status with ticketId and idempotency key', async () => {
      mockedRequest.mockResolvedValue({ status: 'completed', message: 'paid' })
      const result = await TicketService.checkPaymentStatus('t_1')
      expect(mockedRequest).toHaveBeenCalledWith('POST', '/api/web/payments/check-status', {
        body: { ticketId: 't_1' },
        headers: ikHeader,
      })
      expect(result.status).toBe('completed')
    })
  })

  describe('error propagation', () => {
    it('rejects on API error', async () => {
      mockedRequest.mockRejectedValue(new Error('Seat unavailable'))
      await expect(TicketService.holdSeat('evt_1', 's_1')).rejects.toThrow('Seat unavailable')
    })
  })
})
