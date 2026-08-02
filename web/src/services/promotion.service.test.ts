vi.mock('./apiClient', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./apiClient')>()
  return { ...mod, request: vi.fn(), requestCached: vi.fn() }
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PromotionService } from './promotion.service'
import { request, requestCached } from './apiClient'

const mockedRequest = vi.mocked(request)
const mockedCached = vi.mocked(requestCached)

const fakePromo = { id: 'p_1', code: 'PROMO10' }

describe('PromotionService', () => {
  beforeEach(() => {
    mockedRequest.mockReset()
    mockedCached.mockReset()
  })

  describe('listPublic', () => {
    const TTL = 3 * 60 * 1000

    it('returns raw array via requestCached', async () => {
      mockedCached.mockResolvedValue([fakePromo])
      const result = await PromotionService.listPublic()
      expect(mockedCached).toHaveBeenCalledWith('GET', '/promotions', {}, TTL)
      expect(result).toEqual([fakePromo])
    })

    it('returns envelope { promotions }', async () => {
      mockedCached.mockResolvedValue({ promotions: [fakePromo] })
      const result = await PromotionService.listPublic()
      expect(result).toEqual([fakePromo])
    })

    it('returns [] when data is missing', async () => {
      mockedCached.mockResolvedValue({})
      const result = await PromotionService.listPublic()
      expect(result).toEqual([])
    })
  })

  describe('listMine', () => {
    it('returns raw array', async () => {
      mockedRequest.mockResolvedValue([fakePromo])
      const result = await PromotionService.listMine()
      expect(mockedRequest).toHaveBeenCalledWith('GET', '/promotions/organizer')
      expect(result).toEqual([fakePromo])
    })

    it('returns envelope { promotions }', async () => {
      mockedRequest.mockResolvedValue({ promotions: [fakePromo] })
      const result = await PromotionService.listMine()
      expect(result).toEqual([fakePromo])
    })

    it('returns [] when data is missing', async () => {
      mockedRequest.mockResolvedValue({})
      const result = await PromotionService.listMine()
      expect(result).toEqual([])
    })
  })

  it('create calls POST /promotions/organizer with body', async () => {
    mockedRequest.mockResolvedValue(fakePromo)
    const body = { code: 'NEW10', discountValue: 10 }
    const result = await PromotionService.create(body)
    expect(mockedRequest).toHaveBeenCalledWith('POST', '/promotions/organizer', { body })
    expect(result).toEqual(fakePromo)
  })

  it('update calls PUT /promotions/organizer/:id with body', async () => {
    mockedRequest.mockResolvedValue(fakePromo)
    const body = { code: 'UPDATED' }
    const result = await PromotionService.update('p_1', body)
    expect(mockedRequest).toHaveBeenCalledWith('PUT', '/promotions/organizer/p_1', { body })
    expect(result).toEqual(fakePromo)
  })

  it('remove calls DELETE /promotions/organizer/:id', async () => {
    mockedRequest.mockResolvedValue(undefined)
    const result = await PromotionService.remove('p_1')
    expect(mockedRequest).toHaveBeenCalledWith('DELETE', '/promotions/organizer/p_1')
    expect(result).toBeUndefined()
  })
})
