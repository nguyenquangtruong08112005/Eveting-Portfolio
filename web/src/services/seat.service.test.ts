vi.mock('./apiClient', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./apiClient')>()
  return { ...mod, request: vi.fn() }
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SeatApiClient, SeatService, defaultSeatApiEndpoints, getSeatApiErrorCode, isSeatReservationConflict } from './seat.service'
import { HttpError, request } from './apiClient'
import type { HoldSeatsRequest, SeatLayout } from '@/types/seat'

const mockedRequest = vi.mocked(request)

describe('SeatApiEndpointAdapter', () => {
  it('builds organizer layout endpoint URL', () => {
    const url = defaultSeatApiEndpoints.organizerLayout('evt_1', { performanceId: 'perf_1' })
    expect(url).toContain('/api/organizer/events/evt_1/seat-layout')
    expect(url).toContain('performanceId=perf_1')
  })

  it('encodes eventId in availability endpoint', () => {
    const url = defaultSeatApiEndpoints.availability('evt/123', { performanceId: 'perf_1', fresh: 42 })
    expect(url).toContain('/api/web/tickets/events/evt%2F123/seats')
    expect(url).toContain('performanceId=perf_1')
    expect(url).toContain('fresh=42')
  })

  it('omits performanceId when undefined', () => {
    const url = defaultSeatApiEndpoints.availability('evt_1', { performanceId: undefined, fresh: 999 })
    expect(url).not.toContain('performanceId')
    expect(url).toContain('fresh=999')
  })

  it('omits empty string query values', () => {
    const url = defaultSeatApiEndpoints.availability('evt_1', { performanceId: '', fresh: 1 })
    expect(url).not.toContain('performanceId')
  })

  it('builds hold endpoint without query string', () => {
    const url = defaultSeatApiEndpoints.hold('evt_1')
    expect(url).toBe('/api/web/tickets/events/evt_1/seats/hold')
    expect(url).not.toContain('?')
  })
})

describe('SeatApiClient getAvailability', () => {
  beforeEach(() => { mockedRequest.mockReset() })

  it('normalizes all seat statuses', async () => {
    mockedRequest.mockResolvedValue({
      seats: [
        { seatId: 's1', status: 'AVAILABLE' },
        { seatId: 's2', status: 'HELD' },
        { seatId: 's3', status: 'SOLD' },
        { seatId: 's4', status: 'UNKNOWN' },
        { seatId: 's5', status: null },
        { seatId: 's6' },
      ],
    })

    const result = await SeatService.getAvailability('evt_1', 'perf_1')
    expect(result.eventId).toBe('evt_1')
    expect(result.performanceId).toBe('perf_1')
    expect(result.seats[0].status).toBe('AVAILABLE')
    expect(result.seats[1].status).toBe('HELD')
    expect(result.seats[2].status).toBe('SOLD')
    expect(result.seats[3].status).toBe('BLOCKED')
    expect(result.seats[4].status).toBe('BLOCKED')
    expect(result.seats[5].status).toBe('BLOCKED')
  })

  it('parses currentHold from currentHold field', async () => {
    mockedRequest.mockResolvedValue({
      seats: [],
      currentHold: {
        holdToken: 'ht_abc',
        expiresAt: 2000000000000,
        seatIds: ['s1', 's2'],
        performanceId: 'perf_1',
      },
    })

    const result = await SeatService.getAvailability('evt_1', 'perf_1')
    expect(result.currentHold).toBeDefined()
    expect(result.currentHold!.holdToken).toBe('ht_abc')
    expect(result.currentHold!.seatIds).toEqual(['s1', 's2'])
    expect(result.currentHold!.expiresAt).toBeDefined()
  })

  it('parses currentHold from hold field', async () => {
    mockedRequest.mockResolvedValue({
      seats: [],
      hold: { holdId: 'ht_xyz', expiresAt: 2000000000000, seatIds: ['s3'] },
    })

    const result = await SeatService.getAvailability('evt_1', 'perf_1')
    expect(result.currentHold).toBeDefined()
    expect(result.currentHold!.holdToken).toBe('ht_xyz')
    expect(result.currentHold!.seatIds).toEqual(['s3'])
  })

  it('returns undefined currentHold when holdToken missing', async () => {
    mockedRequest.mockResolvedValue({
      seats: [],
      currentHold: { expiresAt: 2000000000000, seatIds: [] },
    })

    const result = await SeatService.getAvailability('evt_1', 'perf_1')
    expect(result.currentHold).toBeUndefined()
  })

  it('maps seat fields from various API shapes', async () => {
    mockedRequest.mockResolvedValue({
      seats: [
        { seatId: 's1', rowLabel: 'A', column: 1, label: 'A1', sectionId: 'sec1' },
        { id: 's2', rowName: 'B', seatNumber: 2, sectionName: 'Balcony' },
      ],
    })

    const result = await SeatService.getAvailability('evt_1', 'perf_1')
    expect(result.seats[0].id).toBe('s1')
    expect(result.seats[0].rowLabel).toBe('A')
    expect(result.seats[0].column).toBe(1)
    expect(result.seats[0].label).toBe('A1')
    expect(result.seats[0].sectionId).toBe('sec1')
    expect(result.seats[1].id).toBe('s2')
    expect(result.seats[1].rowLabel).toBe('B')
    expect(result.seats[1].column).toBe(2)
    expect(result.seats[1].label).toBe('B2')
    expect(result.seats[1].sectionName).toBe('Balcony')
  })

  it('sends fresh=Date.now() in query', async () => {
    mockedRequest.mockResolvedValue({ seats: [] })
    await SeatService.getAvailability('evt_1', 'perf_1')
    const callUrl = mockedRequest.mock.calls[0][1] as string
    expect(callUrl).toContain('fresh=')
  })
})

describe('SeatApiClient holdSeats', () => {
  beforeEach(() => { mockedRequest.mockReset() })

  const validResponse = {
    hold: { holdToken: 'ht_1', expiresAt: 2000000000000, seatIds: ['s1'] },
  }

  it('includes X-Idempotency-Key with generated key when none provided', async () => {
    mockedRequest.mockResolvedValue(validResponse)
    await SeatService.holdSeats('evt_1', { performanceId: 'perf_1', seatIds: ['s1'] })
    const [, , opts] = mockedRequest.mock.calls[0]
    expect(opts?.headers?.['X-Idempotency-Key']).toBeDefined()
  })

  it('uses provided idempotency key', async () => {
    mockedRequest.mockResolvedValue(validResponse)
    await SeatService.holdSeats('evt_1', { performanceId: 'perf_1', seatIds: ['s1'] }, 'my-key-42')
    const [, , opts] = mockedRequest.mock.calls[0]
    expect(opts?.headers?.['X-Idempotency-Key']).toBe('my-key-42')
  })

  it('calls POST with correct endpoint and body', async () => {
    mockedRequest.mockResolvedValue(validResponse)
    const body: HoldSeatsRequest = { performanceId: 'perf_1', seatIds: ['s1', 's2'] }
    await SeatService.holdSeats('evt_1', body)

    expect(mockedRequest).toHaveBeenCalledWith(
      'POST',
      '/api/web/tickets/events/evt_1/seats/hold',
      expect.objectContaining({ body })
    )
  })

  it('throws on invalid hold response (missing holdToken)', async () => {
    mockedRequest.mockResolvedValue({
      hold: { expiresAt: 2000000000000, seatIds: ['s1'] },
    })

    await expect(
      SeatService.holdSeats('evt_1', { performanceId: 'perf_1', seatIds: ['s1'] })
    ).rejects.toThrow('Invalid seat hold response')
  })

  it('throws on invalid hold response (missing expiresAt)', async () => {
    mockedRequest.mockResolvedValue({
      hold: { holdToken: 'ht_1', seatIds: ['s1'] },
    })

    await expect(
      SeatService.holdSeats('evt_1', { performanceId: 'perf_1', seatIds: ['s1'] })
    ).rejects.toThrow('Invalid seat hold response')
  })

  it('returns normalized SeatHold on success', async () => {
    mockedRequest.mockResolvedValue(validResponse)
    const result = await SeatService.holdSeats('evt_1', { performanceId: 'perf_1', seatIds: ['s1'] })

    expect(result.holdToken).toBe('ht_1')
    expect(result.eventId).toBe('evt_1')
    expect(result.performanceId).toBe('perf_1')
    expect(result.seatIds).toEqual(['s1'])
    expect(result.expiresAt).toBeDefined()
  })
})

describe('SeatApiClient releaseHold', () => {
  beforeEach(() => { mockedRequest.mockReset() })

  it('calls DELETE with correct endpoint and body', async () => {
    mockedRequest.mockResolvedValue(undefined)
    await SeatService.releaseHold('evt_1', { performanceId: 'perf_1', holdToken: 'ht_1', seatIds: ['s1'] })

    expect(mockedRequest).toHaveBeenCalledWith(
      'DELETE',
      '/api/web/tickets/events/evt_1/seats/hold',
      { body: { performanceId: 'perf_1', holdToken: 'ht_1', seatIds: ['s1'] } },
    )
  })
})

describe('SeatApiClient organizer layout', () => {
  beforeEach(() => { mockedRequest.mockReset() })

  const sampleLayout: SeatLayout = { version: 1, sections: [] }

  it('getOrganizerLayout returns wrapped OrganizerSeatLayoutResponse', async () => {
    mockedRequest.mockResolvedValue({ eventId: 'evt_1', performanceId: 'perf_1', layout: sampleLayout })
    const result = await SeatService.getOrganizerLayout('evt_1', 'perf_1')
    expect(result.eventId).toBe('evt_1')
    expect(result.layout).toEqual(sampleLayout)
  })

  it('getOrganizerLayout wraps bare SeatLayout into response', async () => {
    mockedRequest.mockResolvedValue(sampleLayout)
    const result = await SeatService.getOrganizerLayout('evt_1', 'perf_1')
    expect(result.eventId).toBe('evt_1')
    expect(result.performanceId).toBe('perf_1')
    expect(result.layout).toEqual(sampleLayout)
  })

  it('saveOrganizerLayout calls PUT with layout body', async () => {
    mockedRequest.mockResolvedValue({ eventId: 'evt_1', performanceId: 'perf_1', layout: sampleLayout })
    const result = await SeatService.saveOrganizerLayout('evt_1', 'perf_1', sampleLayout)

    expect(mockedRequest).toHaveBeenCalledWith(
      'PUT',
      expect.stringContaining('/api/organizer/events/evt_1/seat-layout'),
      { body: { performanceId: 'perf_1', layout: sampleLayout } },
    )
    expect(result.layout).toEqual(sampleLayout)
  })
})

describe('getSeatApiErrorCode', () => {
  it('extracts code from HttpError body', () => {
    const err = new HttpError(409, 'Conflict', { code: 'SEAT_ALREADY_RESERVED' })
    expect(getSeatApiErrorCode(err)).toBe('SEAT_ALREADY_RESERVED')
  })

  it('extracts error field when code is absent', () => {
    const err = new HttpError(400, 'Bad', { error: 'INVALID_SEAT' })
    expect(getSeatApiErrorCode(err)).toBe('INVALID_SEAT')
  })

  it('extracts nested error.code', () => {
    const err = new HttpError(422, 'Bad', { error: { code: 'VALIDATION_FAILED' } })
    expect(getSeatApiErrorCode(err)).toBe('VALIDATION_FAILED')
  })

  it('returns null for non-HttpError', () => {
    expect(getSeatApiErrorCode(new Error('generic'))).toBeNull()
    expect(getSeatApiErrorCode(null)).toBeNull()
    expect(getSeatApiErrorCode('string')).toBeNull()
  })

  it('returns null when no known code field exists', () => {
    const err = new HttpError(500, 'Oops', { unrelated: true })
    expect(getSeatApiErrorCode(err)).toBeNull()
  })
})

describe('isSeatReservationConflict', () => {
  it('returns true for 409 with SEAT_ALREADY_RESERVED', () => {
    const err = new HttpError(409, 'Conflict', { code: 'SEAT_ALREADY_RESERVED' })
    expect(isSeatReservationConflict(err)).toBe(true)
  })

  it('returns false for 409 with different code', () => {
    const err = new HttpError(409, 'Conflict', { code: 'OTHER_ERROR' })
    expect(isSeatReservationConflict(err)).toBe(false)
  })

  it('returns false for non-409 status', () => {
    const err = new HttpError(400, 'Bad', { code: 'SEAT_ALREADY_RESERVED' })
    expect(isSeatReservationConflict(err)).toBe(false)
  })

  it('returns false for non-HttpError', () => {
    expect(isSeatReservationConflict(new Error('test'))).toBe(false)
  })
})

describe('SeatApiClient custom endpoints', () => {
  beforeEach(() => { mockedRequest.mockReset() })

  it('uses custom endpoint adapter', async () => {
    mockedRequest.mockResolvedValue({ seats: [] })
    const customEndpoints = {
      availability: () => '/custom/availability',
      hold: () => '/custom/hold',
      organizerLayout: () => '/custom/layout',
    }
    const client = new SeatApiClient(customEndpoints)
    await client.getAvailability('evt_1')
    expect(mockedRequest).toHaveBeenCalledWith('GET', '/custom/availability')
  })
})
