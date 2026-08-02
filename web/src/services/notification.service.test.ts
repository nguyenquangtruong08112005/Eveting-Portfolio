vi.mock('./apiClient', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./apiClient')>()
  return { ...mod, request: vi.fn(), requestCached: vi.fn() }
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NotificationService } from './notification.service'
import { request, requestCached } from './apiClient'

const mockedRequest = vi.mocked(request)
const mockedRequestCached = vi.mocked(requestCached)

describe('NotificationService', () => {
  beforeEach(() => {
    mockedRequest.mockReset()
    mockedRequestCached.mockReset()
  })

  describe('list', () => {
    it('wraps raw array into { notifications: [...] }', async () => {
      const arr = [{ id: 'n1' }, { id: 'n2' }] as any
      mockedRequestCached.mockResolvedValue(arr)

      const result = await NotificationService.list()

      expect(mockedRequestCached).toHaveBeenCalledWith(
        'GET',
        '/notifications',
        {},
        2 * 60 * 1000,
      )
      expect(result).toEqual({ notifications: arr })
    })

    it('passes through envelope with notifications key', async () => {
      const envelope = { notifications: [{ id: 'n3' }] } as any
      mockedRequestCached.mockResolvedValue(envelope)

      const result = await NotificationService.list()

      expect(result).toEqual({ notifications: [{ id: 'n3' }] })
    })

    it('returns empty array when notifications field is missing', async () => {
      mockedRequestCached.mockResolvedValue({ unexpected: true })

      const result = await NotificationService.list()

      expect(result).toEqual({ notifications: [] })
    })

    it('returns empty array when notifications field is undefined', async () => {
      mockedRequestCached.mockResolvedValue({ notifications: undefined })

      const result = await NotificationService.list()

      expect(result).toEqual({ notifications: [] })
    })
  })

  describe('markRead', () => {
    it('calls POST /notifications/:id/read', async () => {
      const fake = { message: 'ok' }
      mockedRequest.mockResolvedValue(fake)

      const result = await NotificationService.markRead('n42')

      expect(mockedRequest).toHaveBeenCalledWith(
        'POST',
        '/notifications/n42/read',
      )
      expect(result).toEqual(fake)
    })
  })
})
