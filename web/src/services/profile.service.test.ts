vi.mock('./apiClient', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./apiClient')>()
  return { ...mod, request: vi.fn(), requestCached: vi.fn() }
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProfileService } from './profile.service'
import { request, requestCached } from './apiClient'

const mockedRequest = vi.mocked(request)
const mockedRequestCached = vi.mocked(requestCached)

describe('ProfileService', () => {
  beforeEach(() => {
    mockedRequest.mockReset()
    mockedRequestCached.mockReset()
  })

  describe('list', () => {
    it('uses default page=1 and limit=10 via requestCached', async () => {
      const fake = { profiles: [{ id: 'p1' }] } as any
      mockedRequestCached.mockResolvedValue(fake)

      const result = await ProfileService.list()

      expect(mockedRequestCached).toHaveBeenCalledWith(
        'GET',
        '/api/web/profiles?page=1&limit=10',
      )
      expect(result).toEqual(fake)
    })

    it('uses explicit page and limit', async () => {
      const fake = { profiles: [] }
      mockedRequestCached.mockResolvedValue(fake)

      const result = await ProfileService.list(5, 25)

      expect(mockedRequestCached).toHaveBeenCalledWith(
        'GET',
        '/api/web/profiles?page=5&limit=25',
      )
      expect(result).toEqual(fake)
    })
  })

  describe('getById', () => {
    it('calls GET /api/web/profiles/:id via request', async () => {
      const fake = { id: 'p99', name: 'Alice' } as any
      mockedRequest.mockResolvedValue(fake)

      const result = await ProfileService.getById('p99')

      expect(mockedRequest).toHaveBeenCalledWith('GET', '/api/web/profiles/p99')
      expect(result).toEqual(fake)
    })
  })
})
