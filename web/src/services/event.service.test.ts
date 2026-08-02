vi.mock('./apiClient', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./apiClient')>()
  return { ...mod, request: vi.fn(), requestCached: vi.fn() }
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EventService } from './event.service'
import { request, requestCached } from './apiClient'
import type { HttpError } from './apiClient'

const mockedRequest = vi.mocked(request)
const mockedRequestCached = vi.mocked(requestCached)

const fakeEvent = { id: 'evt_1', name: 'Test Event', date: 1700000000000 }
const fakeDest = { name: 'Paris', query: 'paris', eventCount: 5 }
const fakeWeather = { tempC: 22, condition: 'Sunny' }

describe('EventService', () => {
  beforeEach(() => {
    mockedRequest.mockReset()
    mockedRequestCached.mockReset()
  })

  describe('list', () => {
    it('default limit=50, GET /api/web/events', async () => {
      mockedRequestCached.mockResolvedValue({ events: [fakeEvent] })
      const result = await EventService.list()
      expect(mockedRequestCached).toHaveBeenCalledWith('GET', '/api/web/events?limit=50', {}, 3 * 60 * 1000)
      expect(result).toEqual({ events: [fakeEvent] })
    })

    it('custom limit', async () => {
      mockedRequestCached.mockResolvedValue({ events: [] })
      await EventService.list(10)
      expect(mockedRequestCached).toHaveBeenCalledWith('GET', '/api/web/events?limit=10', {}, 3 * 60 * 1000)
    })
  })

  describe('getDestinations', () => {
    it('default limit=10', async () => {
      mockedRequestCached.mockResolvedValue({ destinations: [fakeDest] })
      const result = await EventService.getDestinations()
      expect(mockedRequestCached).toHaveBeenCalledWith('GET', '/api/web/events/destinations?limit=10', {}, 3 * 60 * 1000)
      expect(result).toEqual({ destinations: [fakeDest] })
    })

    it('custom limit', async () => {
      mockedRequestCached.mockResolvedValue({ destinations: [] })
      await EventService.getDestinations(5)
      expect(mockedRequestCached).toHaveBeenCalledWith('GET', '/api/web/events/destinations?limit=5', {}, 3 * 60 * 1000)
    })
  })

  describe('getById', () => {
    it('GET with event id', async () => {
      mockedRequestCached.mockResolvedValue(fakeEvent)
      const result = await EventService.getById('evt_1')
      expect(mockedRequestCached).toHaveBeenCalledWith('GET', '/api/web/events/evt_1', {}, 2 * 60 * 1000)
      expect(result).toEqual(fakeEvent)
    })
  })

  describe('create', () => {
    it('POST /api/web/events with body', async () => {
      mockedRequest.mockResolvedValue(fakeEvent)
      const data = { name: 'New Event', date: 1700000000000 }
      const result = await EventService.create(data)
      expect(mockedRequest).toHaveBeenCalledWith('POST', '/api/web/events', { body: data })
      expect(result).toEqual(fakeEvent)
    })
  })

  describe('update', () => {
    it('PUT /api/web/events/:id with body', async () => {
      mockedRequest.mockResolvedValue(fakeEvent)
      const data = { name: 'Updated' }
      const result = await EventService.update('evt_1', data)
      expect(mockedRequest).toHaveBeenCalledWith('PUT', '/api/web/events/evt_1', { body: data })
      expect(result).toEqual(fakeEvent)
    })
  })

  describe('submitDraft', () => {
    it('POST /api/web/events/:id/submit-draft', async () => {
      mockedRequest.mockResolvedValue({ message: 'submitted' })
      const result = await EventService.submitDraft('evt_1')
      expect(mockedRequest).toHaveBeenCalledWith('POST', '/api/web/events/evt_1/submit-draft')
      expect(result).toEqual({ message: 'submitted' })
    })
  })

  describe('cancel', () => {
    it('DELETE /api/web/events/:id', async () => {
      mockedRequest.mockResolvedValue({ message: 'cancelled' })
      const result = await EventService.cancel('evt_1')
      expect(mockedRequest).toHaveBeenCalledWith('DELETE', '/api/web/events/evt_1')
      expect(result).toEqual({ message: 'cancelled' })
    })
  })

  describe('search', () => {
    it('builds query string from params', async () => {
      mockedRequestCached.mockResolvedValue({ events: [fakeEvent] })
      const params = { q: 'jazz', category: 'music', page: 2, limit: 20 }
      const result = await EventService.search(params)
      expect(mockedRequestCached).toHaveBeenCalledWith('GET', '/api/web/events/search?q=jazz&category=music&page=2&limit=20', {}, 90 * 1000)
      expect(result.events).toEqual([fakeEvent])
      expect(result.hasMore).toBe(false)
    })

    it('omits undefined/null/empty params', async () => {
      mockedRequestCached.mockResolvedValue({ events: [] })
      await EventService.search({ q: '', city: undefined as any, category: 'theater', dateFrom: '', minPrice: null as any })
      expect(mockedRequestCached).toHaveBeenCalledWith('GET', '/api/web/events/search?category=theater', {}, 90 * 1000)
    })

    it('empty query when all params empty', async () => {
      mockedRequestCached.mockResolvedValue({ events: [] })
      await EventService.search({})
      expect(mockedRequestCached).toHaveBeenCalledWith('GET', '/api/web/events/search', {}, 90 * 1000)
    })

    it('computes hasMore from data.total', async () => {
      mockedRequestCached.mockResolvedValue({ events: new Array(10).fill(fakeEvent), total: 25 })
      const result = await EventService.search({ page: 1, limit: 10 })
      expect(result.hasMore).toBe(true)
      expect(result.total).toBe(25)
    })

    it('hasMore false when within total', async () => {
      mockedRequestCached.mockResolvedValue({ events: [fakeEvent], total: 1 })
      const result = await EventService.search({ page: 1, limit: 10 })
      expect(result.hasMore).toBe(false)
    })

    it('falls back to events.length for hasMore when total null', async () => {
      mockedRequestCached.mockResolvedValue({ events: new Array(12).fill(fakeEvent) })
      const result = await EventService.search({ limit: 12 })
      expect(result.hasMore).toBe(true)
    })

    it('uses pagination.currentPage and pagination.totalItems for hasMore', async () => {
      mockedRequestCached.mockResolvedValue({ events: [fakeEvent], pagination: { currentPage: 3, totalItems: 50 } })
      const result = await EventService.search({ limit: 10 })
      // page=3 (from pagination), limit=10 (from param default), total=50 → 3*10=30 < 50
      expect(result.hasMore).toBe(true)
    })

    it('falls back events to [] when absent', async () => {
      mockedRequestCached.mockResolvedValue({})
      const result = await EventService.search({})
      expect(result.events).toEqual([])
    })
  })

  describe('nearby', () => {
    it('builds query from lat/lon/radius', async () => {
      mockedRequestCached.mockResolvedValue({ events: [fakeEvent] })
      const result = await EventService.nearby({ lat: 48.8566, lon: 2.3522, radius: 10 })
      expect(mockedRequestCached).toHaveBeenCalledWith('GET', '/api/web/events/nearby?lat=48.8566&lon=2.3522&radius=10', {}, 3 * 60 * 1000)
      expect(result).toEqual({ events: [fakeEvent] })
    })

    it('omits undefined/null params', async () => {
      mockedRequestCached.mockResolvedValue({ events: [] })
      await EventService.nearby({ lat: 48.8566, lon: 2.3522, radius: undefined as any })
      expect(mockedRequestCached).toHaveBeenCalledWith('GET', '/api/web/events/nearby?lat=48.8566&lon=2.3522', {}, 3 * 60 * 1000)
    })

    it('includes page and limit', async () => {
      mockedRequestCached.mockResolvedValue({ events: [] })
      await EventService.nearby({ lat: 1, lon: 2, page: 2, limit: 5 })
      expect(mockedRequestCached).toHaveBeenCalledWith('GET', '/api/web/events/nearby?lat=1&lon=2&page=2&limit=5', {}, 3 * 60 * 1000)
    })
  })

  describe('recommendations', () => {
    it('default limit=10 with allowAnonymous', async () => {
      mockedRequestCached.mockResolvedValue([fakeEvent])
      const result = await EventService.recommendations()
      expect(mockedRequestCached).toHaveBeenCalledWith('GET', '/api/web/events/recommendations?limit=10', { allowAnonymous: true }, 3 * 60 * 1000)
      expect(result).toEqual({ events: [fakeEvent] })
    })

    it('wraps raw array in { events }', async () => {
      mockedRequestCached.mockResolvedValue([fakeEvent])
      const result = await EventService.recommendations(5)
      expect(result).toEqual({ events: [fakeEvent] })
    })

    it('passes through envelope', async () => {
      mockedRequestCached.mockResolvedValue({ events: [fakeEvent] })
      const result = await EventService.recommendations()
      expect(result).toEqual({ events: [fakeEvent] })
    })

    it('empty events when envelope missing', async () => {
      mockedRequestCached.mockResolvedValue({})
      const result = await EventService.recommendations()
      expect(result).toEqual({ events: [] })
    })
  })

  describe('getWeather', () => {
    it('GET weather with 10min TTL', async () => {
      mockedRequestCached.mockResolvedValue(fakeWeather)
      const result = await EventService.getWeather('evt_1')
      expect(mockedRequestCached).toHaveBeenCalledWith('GET', '/api/web/events/evt_1/weather', {}, 10 * 60 * 1000)
      expect(result).toEqual(fakeWeather)
    })
  })

  describe('error propagation', () => {
    it('rejects when requestCached throws', async () => {
      mockedRequestCached.mockRejectedValue(new Error('Network error'))
      await expect(EventService.list()).rejects.toThrow('Network error')
    })

    it('rejects when request throws', async () => {
      mockedRequest.mockRejectedValue(new Error('Forbidden'))
      await expect(EventService.create({} as any)).rejects.toThrow('Forbidden')
    })
  })
})
