vi.mock('./apiClient', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./apiClient')>()
  return { ...mod, request: vi.fn() }
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MediaService } from './media.service'
import { request } from './apiClient'

const mockedRequest = vi.mocked(request)

describe('MediaService', () => {
  beforeEach(() => { mockedRequest.mockReset() })

  it('listEventMedia uses default page=1 and limit=20', async () => {
    const fake = { media: [{ id: 'e1' }], total: 1 } as any
    mockedRequest.mockResolvedValue(fake)

    const result = await MediaService.listEventMedia('evt_1')

    expect(mockedRequest).toHaveBeenCalledWith(
      'GET',
      '/api/web/events/evt_1/media?page=1&limit=20',
    )
    expect(result).toEqual(fake)
  })

  it('listEventMedia uses explicit page and limit', async () => {
    const fake = { media: [], total: 0 }
    mockedRequest.mockResolvedValue(fake)

    const result = await MediaService.listEventMedia('evt_2', 3, 50)

    expect(mockedRequest).toHaveBeenCalledWith(
      'GET',
      '/api/web/events/evt_2/media?page=3&limit=50',
    )
    expect(result).toEqual(fake)
  })
})
