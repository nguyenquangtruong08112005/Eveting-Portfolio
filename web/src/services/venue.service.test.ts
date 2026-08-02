vi.mock('./apiClient', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./apiClient')>()
  return { ...mod, request: vi.fn() }
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { VenueService } from './venue.service'
import { request } from './apiClient'

const mockedRequest = vi.mocked(request)

const fakeVenue = { id: 'v_1', name: 'Main Hall' }

describe('VenueService', () => {
  beforeEach(() => { mockedRequest.mockReset() })

  describe('list', () => {
    it('returns raw array', async () => {
      mockedRequest.mockResolvedValue([fakeVenue])
      const result = await VenueService.list()
      expect(mockedRequest).toHaveBeenCalledWith('GET', '/venues')
      expect(result).toEqual([fakeVenue])
    })

    it('returns envelope { venues }', async () => {
      mockedRequest.mockResolvedValue({ venues: [fakeVenue] })
      const result = await VenueService.list()
      expect(result).toEqual([fakeVenue])
    })

    it('returns [] when data is missing', async () => {
      mockedRequest.mockResolvedValue({})
      const result = await VenueService.list()
      expect(result).toEqual([])
    })
  })

  it('getById calls GET /venues/:id', async () => {
    mockedRequest.mockResolvedValue(fakeVenue)
    const result = await VenueService.getById('v_1')
    expect(mockedRequest).toHaveBeenCalledWith('GET', '/venues/v_1')
    expect(result).toEqual(fakeVenue)
  })

  it('create calls POST /venues with body', async () => {
    mockedRequest.mockResolvedValue(fakeVenue)
    const body = { name: 'New Venue' }
    const result = await VenueService.create(body)
    expect(mockedRequest).toHaveBeenCalledWith('POST', '/venues', { body })
    expect(result).toEqual(fakeVenue)
  })

  it('update calls PUT /venues/:id with body', async () => {
    mockedRequest.mockResolvedValue(fakeVenue)
    const body = { name: 'Updated' }
    const result = await VenueService.update('v_1', body)
    expect(mockedRequest).toHaveBeenCalledWith('PUT', '/venues/v_1', { body })
    expect(result).toEqual(fakeVenue)
  })

  it('remove calls DELETE /venues/:id', async () => {
    mockedRequest.mockResolvedValue(undefined)
    const result = await VenueService.remove('v_1')
    expect(mockedRequest).toHaveBeenCalledWith('DELETE', '/venues/v_1')
    expect(result).toBeUndefined()
  })
})
