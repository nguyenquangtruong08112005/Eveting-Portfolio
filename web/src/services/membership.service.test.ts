vi.mock('./apiClient', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./apiClient')>()
  return { ...mod, request: vi.fn() }
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MembershipService } from './membership.service'
import { request } from './apiClient'

const mockedRequest = vi.mocked(request)

describe('MembershipService', () => {
  beforeEach(() => { mockedRequest.mockReset() })

  it('getMine calls GET /api/web/memberships/me', async () => {
    const fake = { id: 'm1', plan: 'VIP' } as any
    mockedRequest.mockResolvedValue(fake)

    const result = await MembershipService.getMine()

    expect(mockedRequest).toHaveBeenCalledWith('GET', '/api/web/memberships/me')
    expect(result).toEqual(fake)
  })
})
