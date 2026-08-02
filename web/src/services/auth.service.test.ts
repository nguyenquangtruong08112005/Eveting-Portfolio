vi.mock('./apiClient', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./apiClient')>()
  return { ...mod, request: vi.fn() }
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthService } from './auth.service'
import { request } from './apiClient'

const mockedRequest = vi.mocked(request)

describe('AuthService', () => {
  beforeEach(() => { mockedRequest.mockReset() })

  describe('login', () => {
    it('POST /api/web/auth/login with email and password', async () => {
      mockedRequest.mockResolvedValue({ accessToken: 'at', refreshToken: 'rt', user: { id: 'u1', name: 'a', email: 'a@b', roles: ['user'] } })
      const result = await AuthService.login('a@b', 'secret')
      expect(mockedRequest).toHaveBeenCalledWith('POST', '/api/web/auth/login', { body: { email: 'a@b', password: 'secret' } })
      expect(result.accessToken).toBe('at')
    })
  })

  describe('register', () => {
    it('POST /api/web/auth/register with name, email, password, role', async () => {
      mockedRequest.mockResolvedValue({ message: 'registered' })
      const result = await AuthService.register('Alice', 'a@b', 'pw', 'attendee')
      expect(mockedRequest).toHaveBeenCalledWith('POST', '/api/web/auth/register', { body: { name: 'Alice', email: 'a@b', password: 'pw', role: 'attendee' } })
      expect(result).toEqual({ message: 'registered' })
    })
  })

  describe('googleLogin', () => {
    it('POST /api/web/auth/google-login with idToken and optional role', async () => {
      mockedRequest.mockResolvedValue({ accessToken: 'at', user: { id: 'u1', name: 'g', email: 'g@b', roles: ['user'] } })
      const result = await AuthService.googleLogin('idtok', 'organizer')
      expect(mockedRequest).toHaveBeenCalledWith('POST', '/api/web/auth/google-login', { body: { idToken: 'idtok', role: 'organizer' } })
      expect(result.accessToken).toBe('at')
    })

    it('calls without role', async () => {
      mockedRequest.mockResolvedValue({ accessToken: 'at', user: { id: 'u1', name: 'g', email: 'g@b', roles: ['user'] } })
      const result = await AuthService.googleLogin('idtok')
      expect(mockedRequest).toHaveBeenCalledWith('POST', '/api/web/auth/google-login', { body: { idToken: 'idtok', role: undefined } })
      expect(result.accessToken).toBe('at')
    })
  })

  describe('facebookLogin', () => {
    it('POST /api/web/auth/facebook-login with accessToken and optional role', async () => {
      mockedRequest.mockResolvedValue({ accessToken: 'at', user: { id: 'u1', name: 'f', email: 'f@b', roles: ['user'] } })
      const result = await AuthService.facebookLogin('fbtok', 'attendee')
      expect(mockedRequest).toHaveBeenCalledWith('POST', '/api/web/auth/facebook-login', { body: { accessToken: 'fbtok', role: 'attendee' } })
      expect(result.accessToken).toBe('at')
    })

    it('calls without role', async () => {
      mockedRequest.mockResolvedValue({ accessToken: 'at', user: { id: 'u1', name: 'f', email: 'f@b', roles: ['user'] } })
      await AuthService.facebookLogin('fbtok')
      expect(mockedRequest).toHaveBeenCalledWith('POST', '/api/web/auth/facebook-login', { body: { accessToken: 'fbtok', role: undefined } })
    })
  })

  describe('requestPasswordReset', () => {
    it('POST /api/web/auth/password-reset/request with email', async () => {
      mockedRequest.mockResolvedValue({ message: 'sent' })
      const result = await AuthService.requestPasswordReset('a@b')
      expect(mockedRequest).toHaveBeenCalledWith('POST', '/api/web/auth/password-reset/request', { body: { email: 'a@b' } })
      expect(result).toEqual({ message: 'sent' })
    })
  })

  describe('confirmPasswordReset', () => {
    it('POST /api/web/auth/password-reset/confirm with token and newPassword', async () => {
      mockedRequest.mockResolvedValue({ message: 'reset' })
      const result = await AuthService.confirmPasswordReset('tok', 'newpw')
      expect(mockedRequest).toHaveBeenCalledWith('POST', '/api/web/auth/password-reset/confirm', { body: { token: 'tok', newPassword: 'newpw' } })
      expect(result).toEqual({ message: 'reset' })
    })
  })

  describe('requestEmailVerify', () => {
    it('POST /api/web/auth/email-verification/request with email', async () => {
      mockedRequest.mockResolvedValue({ message: 'sent' })
      await AuthService.requestEmailVerify('a@b')
      expect(mockedRequest).toHaveBeenCalledWith('POST', '/api/web/auth/email-verification/request', { body: { email: 'a@b' } })
    })
  })

  describe('resendVerification', () => {
    it('POST /api/web/auth/resend-verification with email', async () => {
      mockedRequest.mockResolvedValue({ message: 'resent' })
      await AuthService.resendVerification('a@b')
      expect(mockedRequest).toHaveBeenCalledWith('POST', '/api/web/auth/resend-verification', { body: { email: 'a@b' } })
    })
  })

  describe('confirmEmailVerify', () => {
    it('POST /api/web/auth/email-verification/confirm with token', async () => {
      mockedRequest.mockResolvedValue({ message: 'confirmed' })
      await AuthService.confirmEmailVerify('tok')
      expect(mockedRequest).toHaveBeenCalledWith('POST', '/api/web/auth/email-verification/confirm', { body: { token: 'tok' } })
    })
  })

  describe('verifyEmail', () => {
    it('POST /api/web/auth/verify-email with token', async () => {
      mockedRequest.mockResolvedValue({ message: 'verified' })
      await AuthService.verifyEmail('tok')
      expect(mockedRequest).toHaveBeenCalledWith('POST', '/api/web/auth/verify-email', { body: { token: 'tok' } })
    })
  })

  describe('logoutAll', () => {
    it('POST /api/web/auth/logout-all with no body', async () => {
      mockedRequest.mockResolvedValue({ message: 'logged out' })
      const result = await AuthService.logoutAll()
      expect(mockedRequest).toHaveBeenCalledWith('POST', '/api/web/auth/logout-all')
      expect(result).toEqual({ message: 'logged out' })
    })
  })
})
