vi.mock('./apiClient', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./apiClient')>()
  return { ...mod, request: vi.fn() }
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OrganizerService } from './organizer.service'
import { request } from './apiClient'

const mockedRequest = vi.mocked(request)

describe('OrganizerService', () => {
  beforeEach(() => { mockedRequest.mockReset() })

  describe('getLedger', () => {
    it('GET /api/organizer/ledger and returns entries wrapper', async () => {
      const data = { entries: [{ id: 'l1', orderId: 'o1', eventName: 'E1', gross: 100, fee: 10, net: 90, date: 1 }] }
      mockedRequest.mockResolvedValue(data)
      const result = await OrganizerService.getLedger()
      expect(mockedRequest).toHaveBeenCalledWith('GET', '/api/organizer/ledger')
      expect(result).toEqual(data)
    })

    it('propagates apiClient error', async () => {
      mockedRequest.mockRejectedValue(new Error('API error'))
      await expect(OrganizerService.getLedger()).rejects.toThrow('API error')
    })
  })

  describe('getStats', () => {
    it('GET /api/organizer/me/stats and normalizes standard fields', async () => {
      mockedRequest.mockResolvedValue({ totalSales: 50, grossRevenue: 1000, platformFees: 80, netRevenue: 920 })
      const result = await OrganizerService.getStats()
      expect(mockedRequest).toHaveBeenCalledWith('GET', '/api/organizer/me/stats')
      expect(result).toEqual({ totalSales: 50, grossRevenue: 1000, platformFees: 80, netRevenue: 920 })
    })

    it('maps alternative field names (totalRevenue, totalTicketsSold, fees)', async () => {
      mockedRequest.mockResolvedValue({ totalTicketsSold: 30, totalRevenue: 600, fees: 45 })
      const result = await OrganizerService.getStats()
      expect(result.totalSales).toBe(30)
      expect(result.grossRevenue).toBe(600)
      expect(result.platformFees).toBe(45)
      expect(result.netRevenue).toBe(555)
    })

    it('maps platformFee as alternative for platformFees', async () => {
      mockedRequest.mockResolvedValue({ totalSales: 10, grossRevenue: 200, platformFee: 15, netRevenue: 185 })
      const result = await OrganizerService.getStats()
      expect(result.platformFees).toBe(15)
    })

    it('computes netRevenue as grossRevenue minus platformFees when netRevenue absent', async () => {
      mockedRequest.mockResolvedValue({ totalSales: 10, grossRevenue: 200, platformFees: 30 })
      const result = await OrganizerService.getStats()
      expect(result.netRevenue).toBe(170)
    })

    it('falls back to zeros for all fields when API returns empty object', async () => {
      mockedRequest.mockResolvedValue({})
      const result = await OrganizerService.getStats()
      expect(result).toEqual({ totalSales: 0, grossRevenue: 0, platformFees: 0, netRevenue: 0 })
    })

    it('propagates apiClient error', async () => {
      mockedRequest.mockRejectedValue(new Error('Unauthorized'))
      await expect(OrganizerService.getStats()).rejects.toThrow('Unauthorized')
    })
  })

  describe('getEvents', () => {
    it('GET /api/organizer/me/events and returns data wrapper', async () => {
      const data = { data: [{ id: 'evt1', name: 'Concert', status: 'published', sold: 100, capacity: 200, price: 50 }] }
      mockedRequest.mockResolvedValue(data)
      const result = await OrganizerService.getEvents()
      expect(mockedRequest).toHaveBeenCalledWith('GET', '/api/organizer/me/events')
      expect(result).toEqual(data)
    })

    it('propagates apiClient error', async () => {
      mockedRequest.mockRejectedValue(new Error('Forbidden'))
      await expect(OrganizerService.getEvents()).rejects.toThrow('Forbidden')
    })
  })

  describe('getEventStats', () => {
    it('GET /api/organizer/events/:id/stats and returns analytics', async () => {
      const data = { eventId: 'evt1', totalRevenue: 5000, ticketsSold: 100, checkIns: 80, views: 2000 }
      mockedRequest.mockResolvedValue(data)
      const result = await OrganizerService.getEventStats('evt1')
      expect(mockedRequest).toHaveBeenCalledWith('GET', '/api/organizer/events/evt1/stats')
      expect(result).toEqual(data)
    })

    it('propagates apiClient error', async () => {
      mockedRequest.mockRejectedValue(new Error('Not found'))
      await expect(OrganizerService.getEventStats('evt_missing')).rejects.toThrow('Not found')
    })
  })

  describe('getAttendees', () => {
    it('GET /api/organizer/events/:id/attendees and returns attendees wrapper', async () => {
      const data = {
        attendees: [{
          ticket: { id: 't1', type: 'VIP', status: 'checked_in' },
          user: { id: 'u1', name: 'Alice', email: 'a@x.com' },
        }],
      }
      mockedRequest.mockResolvedValue(data)
      const result = await OrganizerService.getAttendees('evt1')
      expect(mockedRequest).toHaveBeenCalledWith('GET', '/api/organizer/events/evt1/attendees')
      expect(result).toEqual(data)
    })

    it('propagates apiClient error', async () => {
      mockedRequest.mockRejectedValue(new Error('Server error'))
      await expect(OrganizerService.getAttendees('evt1')).rejects.toThrow('Server error')
    })
  })

  describe('checkInByQr', () => {
    it('POST /api/organizer/check-in-qr with qrToken body', async () => {
      const data = { valid: true, ticketInfo: { ticketId: 't1', status: 'checked_in', checkedInAt: 1000 } }
      mockedRequest.mockResolvedValue(data)
      const result = await OrganizerService.checkInByQr('qr_abc')
      expect(mockedRequest).toHaveBeenCalledWith('POST', '/api/organizer/check-in-qr', { body: { qrToken: 'qr_abc' } })
      expect(result).toEqual(data)
    })

    it('handles invalid QR response', async () => {
      const data = { valid: false, error: 'Invalid or expired QR code' }
      mockedRequest.mockResolvedValue(data)
      const result = await OrganizerService.checkInByQr('bad_qr')
      expect(result).toEqual(data)
    })

    it('propagates apiClient error', async () => {
      mockedRequest.mockRejectedValue(new Error('Conflict'))
      await expect(OrganizerService.checkInByQr('qr_abc')).rejects.toThrow('Conflict')
    })
  })

  describe('broadcast', () => {
    it('POST /api/organizer/events/:id/broadcast with title and message', async () => {
      const data = { success: true, sentTo: 150 }
      mockedRequest.mockResolvedValue(data)
      const result = await OrganizerService.broadcast('evt1', 'Important', 'Doors open at 7')
      expect(mockedRequest).toHaveBeenCalledWith('POST', '/api/organizer/events/evt1/broadcast', {
        body: { title: 'Important', message: 'Doors open at 7' },
      })
      expect(result).toEqual(data)
    })

    it('propagates apiClient error', async () => {
      mockedRequest.mockRejectedValue(new Error('Rate limited'))
      await expect(OrganizerService.broadcast('evt1', 'Hi', 'Msg')).rejects.toThrow('Rate limited')
    })
  })

  describe('getPayoutSummary', () => {
    it('GET /api/organizer/me/payout-summary and returns summary', async () => {
      const data = {
        eligibleNetAmount: 1000,
        pendingApprovalAmount: 200,
        processingAmount: 300,
        completedAmount: 500,
        nextScheduledPayoutAt: '2026-08-15T00:00:00Z',
      }
      mockedRequest.mockResolvedValue(data)
      const result = await OrganizerService.getPayoutSummary()
      expect(mockedRequest).toHaveBeenCalledWith('GET', '/api/organizer/me/payout-summary')
      expect(result).toEqual(data)
    })

    it('propagates apiClient error', async () => {
      mockedRequest.mockRejectedValue(new Error('Unauthorized'))
      await expect(OrganizerService.getPayoutSummary()).rejects.toThrow('Unauthorized')
    })
  })

  describe('getPayouts', () => {
    it('GET /api/organizer/me/payouts with default page and limit', async () => {
      const data = { page: 1, limit: 10, total: 5, payouts: [] }
      mockedRequest.mockResolvedValue(data)
      const result = await OrganizerService.getPayouts()
      expect(mockedRequest).toHaveBeenCalledWith('GET', '/api/organizer/me/payouts?page=1&limit=10')
      expect(result).toEqual(data)
    })

    it('uses provided page and limit as query params', async () => {
      const data = { page: 2, limit: 25, total: 30, payouts: [{ id: 'p1', amount: 100, status: 'completed', createdAt: 'd1', completedAt: 'd2' }] }
      mockedRequest.mockResolvedValue(data)
      const result = await OrganizerService.getPayouts(2, 25)
      expect(mockedRequest).toHaveBeenCalledWith('GET', '/api/organizer/me/payouts?page=2&limit=25')
      expect(result).toEqual(data)
    })

    it('propagates apiClient error', async () => {
      mockedRequest.mockRejectedValue(new Error('Not found'))
      await expect(OrganizerService.getPayouts()).rejects.toThrow('Not found')
    })
  })

  describe('getBankAccount', () => {
    it('GET /api/organizer/me/payout-bank-account and normalizes registered account', async () => {
      mockedRequest.mockResolvedValue({ registered: true, maskedDisplay: '****1234', createdAt: '2026-01-01', updatedAt: '2026-06-01' })
      const result = await OrganizerService.getBankAccount()
      expect(mockedRequest).toHaveBeenCalledWith('GET', '/api/organizer/me/payout-bank-account')
      expect(result).toEqual({ registered: true, maskedDisplay: '****1234', createdAt: '2026-01-01', updatedAt: '2026-06-01' })
    })

    it('normalizes unregistered account', async () => {
      mockedRequest.mockResolvedValue({ registered: false })
      const result = await OrganizerService.getBankAccount()
      expect(result).toEqual({ registered: false })
    })

    it('normalizes null/undefined to unregistered', async () => {
      mockedRequest.mockResolvedValue(null)
      const result = await OrganizerService.getBankAccount()
      expect(result).toEqual({ registered: false })
    })

    it('propagates apiClient error', async () => {
      mockedRequest.mockRejectedValue(new Error('Forbidden'))
      await expect(OrganizerService.getBankAccount()).rejects.toThrow('Forbidden')
    })
  })

  describe('updateBankAccount', () => {
    const updateBody = { accountNumber: '123456', accountHolder: 'Alice', bankName: 'Test Bank' }

    it('PUT /api/organizer/me/payout-bank-account with body and normalizes PUT response', async () => {
      mockedRequest.mockResolvedValue({ organizerId: 'org1', maskedDisplay: '****3456' })
      const result = await OrganizerService.updateBankAccount(updateBody)
      expect(mockedRequest).toHaveBeenCalledWith('PUT', '/api/organizer/me/payout-bank-account', { body: updateBody })
      expect(result).toEqual({ registered: true, maskedDisplay: '****3456', createdAt: undefined, updatedAt: undefined })
    })

    it('normalizes registered GET-shaped response from PUT', async () => {
      mockedRequest.mockResolvedValue({ registered: true, maskedDisplay: '****3456' })
      const result = await OrganizerService.updateBankAccount(updateBody)
      expect(result).toEqual({ registered: true, maskedDisplay: '****3456' })
    })

    it('propagates apiClient error', async () => {
      mockedRequest.mockRejectedValue(new Error('Validation failed'))
      await expect(OrganizerService.updateBankAccount(updateBody)).rejects.toThrow('Validation failed')
    })
  })
})
