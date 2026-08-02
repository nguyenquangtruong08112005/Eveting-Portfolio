vi.mock('./apiClient', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./apiClient')>()
  return { ...mod, request: vi.fn() }
})

vi.mock('@/lib/user-profile', () => ({
  normalizeUserProfile: vi.fn((raw: unknown) => {
    const anyRaw = raw as Record<string, unknown> | undefined | null
    if (!anyRaw || typeof anyRaw !== 'object') {
      return { id: '' } as any
    }
    const interests = Array.isArray(anyRaw.interests) ? (anyRaw.interests as string[]) : []
    return {
      id: String(anyRaw.id ?? ''),
      name: typeof anyRaw.name === 'string' ? anyRaw.name as string : undefined,
      bio: typeof anyRaw.bio === 'string' ? anyRaw.bio as string : undefined,
      interests,
      profilePicUrl: typeof anyRaw.profilePicUrl === 'string' ? anyRaw.profilePicUrl as string : undefined,
      ageRange: typeof anyRaw.ageRange === 'string' ? anyRaw.ageRange as string : undefined,
    }
  }),
  toProfileUpdateBody: vi.fn((data: Record<string, unknown>) => {
    const body: Record<string, unknown> = {}
    if (data.name !== undefined) body.name = data.name
    if (data.bio !== undefined) body.aboutMe = data.bio
    if (data.interests !== undefined) body.interests = data.interests
    if (data.profilePicUrl) body.profilePicUrl = data.profilePicUrl
    return body
  }),
}))

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UserService } from './user.service'
import { request } from './apiClient'

const mockedRequest = vi.mocked(request)

describe('UserService', () => {
  beforeEach(() => { mockedRequest.mockReset() })

  describe('getMe', () => {
    it('GET /users/me and normalizes response', async () => {
      mockedRequest.mockResolvedValue({ id: 'u1', name: 'Alice', interests: ['a'] })
      const result = await UserService.getMe()
      expect(mockedRequest).toHaveBeenCalledWith('GET', '/users/me')
      expect(result).toMatchObject({ id: 'u1', name: 'Alice', interests: ['a'] })
    })
  })

  describe('updateMe', () => {
    it('PUT /users/me with mapped body and merge fallback', async () => {
      mockedRequest.mockResolvedValue({ id: 'u1' })
      const result = await UserService.updateMe({ name: 'NewName', bio: 'My bio', interests: ['x'], profilePicUrl: 'http://pic', ageRange: '18-24' })
      expect(mockedRequest).toHaveBeenCalledWith('PUT', '/users/me', {
        body: { name: 'NewName', aboutMe: 'My bio', interests: ['x'], profilePicUrl: 'http://pic' },
      })
      expect(result.name).toBe('NewName')
      expect(result.bio).toBe('My bio')
      expect(result.interests).toEqual(['x'])
      expect(result.profilePicUrl).toBe('http://pic')
      expect(result.ageRange).toBe('18-24')
    })

    it('normalized value takes priority over fallback when API returns it', async () => {
      mockedRequest.mockResolvedValue({ id: 'u1', name: 'ServerName' })
      const result = await UserService.updateMe({ name: 'Submitted' })
      expect(result.name).toBe('ServerName')
    })
  })

  describe('registerProfile', () => {
    it('POST /users/register with name, profilePicUrl, bio, interests, ageRange', async () => {
      mockedRequest.mockResolvedValue({ message: 'ok' })
      const result = await UserService.registerProfile({
        name: 'Bob',
        profilePicUrl: 'http://pic',
        bio: 'hey',
        interests: ['c'],
        ageRange: '25-34',
      })
      expect(mockedRequest).toHaveBeenCalledWith('POST', '/users/register', {
        body: { name: 'Bob', profilePicUrl: 'http://pic', bio: 'hey', interests: ['c'], ageRange: '25-34' },
      })
      expect(result).toEqual({ message: 'ok' })
    })
  })

  describe('follow', () => {
    it('POST /users/me/follow with profileId', async () => {
      mockedRequest.mockResolvedValue({ message: 'followed' })
      const result = await UserService.follow('prof_123')
      expect(mockedRequest).toHaveBeenCalledWith('POST', '/users/me/follow', { body: { profileId: 'prof_123' } })
      expect(result).toEqual({ message: 'followed' })
    })
  })

  describe('unfollow', () => {
    it('DELETE /users/me/follow/:profileId', async () => {
      mockedRequest.mockResolvedValue({ message: 'unfollowed' })
      const result = await UserService.unfollow('prof_456')
      expect(mockedRequest).toHaveBeenCalledWith('DELETE', '/users/me/follow/prof_456')
      expect(result).toEqual({ message: 'unfollowed' })
    })
  })

  describe('removeDeviceToken', () => {
    it('POST /users/me/device-token/remove with fcmToken', async () => {
      mockedRequest.mockResolvedValue({ message: 'removed' })
      const result = await UserService.removeDeviceToken('tok_abc')
      expect(mockedRequest).toHaveBeenCalledWith('POST', '/users/me/device-token/remove', { body: { fcmToken: 'tok_abc' } })
      expect(result).toEqual({ message: 'removed' })
    })
  })
})
