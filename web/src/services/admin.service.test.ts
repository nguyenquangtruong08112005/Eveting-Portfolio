vi.mock('./apiClient', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./apiClient')>()
  return { ...mod, request: vi.fn() }
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AdminService } from './admin.service'
import { request } from './apiClient'

const mockedRequest = vi.mocked(request)

describe('AdminService', () => {
  beforeEach(() => { mockedRequest.mockReset() })

  describe('getPendingEvents', () => {
    it('GET with default page/limit', async () => {
      mockedRequest.mockResolvedValue({ events: [], page: 1, limit: 20, total: 0 })
      const result = await AdminService.getPendingEvents()
      expect(mockedRequest).toHaveBeenCalledWith('GET', '/api/admin/events/pending?page=1&limit=20')
      expect(result).toEqual({ events: [], page: 1, limit: 20, total: 0 })
    })

    it('GET with explicit page/limit', async () => {
      mockedRequest.mockResolvedValue({ events: [], page: 2, limit: 10, total: 0 })
      await AdminService.getPendingEvents(2, 10)
      expect(mockedRequest).toHaveBeenCalledWith('GET', '/api/admin/events/pending?page=2&limit=10')
    })

    it('normalizes array payload', async () => {
      mockedRequest.mockResolvedValue([{ id: 'e1' }, { id: 'e2' }])
      const result = await AdminService.getPendingEvents()
      expect(result).toEqual({ events: [{ id: 'e1' }, { id: 'e2' }], page: 1, limit: 2, total: 2 })
    })

    it('normalizes object with events key', async () => {
      mockedRequest.mockResolvedValue({ events: [{ id: 'e1' }], page: 3, limit: 5, total: 1 })
      const result = await AdminService.getPendingEvents()
      expect(result.events).toEqual([{ id: 'e1' }])
      expect(result.page).toBe(3)
    })

    it('normalizes object with data key', async () => {
      mockedRequest.mockResolvedValue({ data: [{ id: 'd1' }] })
      const result = await AdminService.getPendingEvents()
      expect(result.events).toEqual([{ id: 'd1' }])
    })

    it('normalizes malformed object to empty', async () => {
      mockedRequest.mockResolvedValue({ foo: 'bar' })
      const result = await AdminService.getPendingEvents()
      expect(result).toEqual({ events: [], page: 1, limit: 0, total: 0 })
    })

    it('falls back to default for null payload', async () => {
      mockedRequest.mockResolvedValue(null)
      const result = await AdminService.getPendingEvents()
      expect(result).toEqual({ events: [], page: 1, limit: 20, total: 0 })
    })
  })

  describe('approveEvent', () => {
    it('POST /api/admin/events/:id/approve', async () => {
      mockedRequest.mockResolvedValue({ message: 'approved' })
      const result = await AdminService.approveEvent('evt_1')
      expect(mockedRequest).toHaveBeenCalledWith('POST', '/api/admin/events/evt_1/approve')
      expect(result).toEqual({ message: 'approved' })
    })
  })

  describe('rejectEvent', () => {
    it('POST /api/admin/events/:id/reject with reason', async () => {
      mockedRequest.mockResolvedValue({ message: 'rejected' })
      const result = await AdminService.rejectEvent('evt_2', 'inappropriate content')
      expect(mockedRequest).toHaveBeenCalledWith('POST', '/api/admin/events/evt_2/reject', {
        body: { reason: 'inappropriate content' },
      })
      expect(result).toEqual({ message: 'rejected' })
    })
  })
})
