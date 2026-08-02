vi.mock('./apiClient', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./apiClient')>()
  return { ...mod, request: vi.fn() }
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ReviewService } from './review.service'
import { request } from './apiClient'

const mockedRequest = vi.mocked(request)

const fakeReview = { id: 'rev_1', eventId: 'evt_1', userId: 'u_1', rating: 5, createdAt: 1 }

describe('ReviewService', () => {
  beforeEach(() => { mockedRequest.mockReset() })

  it('listByEvent calls GET /api/web/events/:id/reviews and returns reviews wrapper', async () => {
    mockedRequest.mockResolvedValue({ reviews: [fakeReview] })
    const result = await ReviewService.listByEvent('evt_1')
    expect(mockedRequest).toHaveBeenCalledWith('GET', '/api/web/events/evt_1/reviews')
    expect(result).toEqual({ reviews: [fakeReview] })
  })

  it('create calls POST /api/web/events/:id/reviews with body', async () => {
    mockedRequest.mockResolvedValue(fakeReview)
    const body = { rating: 4, comment: 'good' }
    const result = await ReviewService.create('evt_1', body)
    expect(mockedRequest).toHaveBeenCalledWith('POST', '/api/web/events/evt_1/reviews', { body })
    expect(result).toEqual(fakeReview)
  })

  it('create works without comment', async () => {
    mockedRequest.mockResolvedValue(fakeReview)
    const body = { rating: 3 }
    const result = await ReviewService.create('evt_2', body)
    expect(mockedRequest).toHaveBeenCalledWith('POST', '/api/web/events/evt_2/reviews', { body })
    expect(result).toEqual(fakeReview)
  })
})
