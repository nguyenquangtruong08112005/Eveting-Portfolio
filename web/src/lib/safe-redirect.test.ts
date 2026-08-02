import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { isSafeExternalUrl, navigateToSafeExternalUrl } from './safe-redirect'
import { request, requestCached, HttpError, invalidateApiCache } from '../services/apiClient'

describe('isSafeExternalUrl', () => {
  beforeEach(() => {
    ;(globalThis as any).window = { location: { hostname: 'localhost' } }
  })

  it('allows zalopay sandbox host', () => {
    expect(isSafeExternalUrl('https://sbh.portal.zalopay.vn/pay/abc')).toBe(true)
  })

  it('allows zalopay suffix', () => {
    expect(isSafeExternalUrl('https://social.zalopay.vn/x')).toBe(true)
  })

  it('blocks evil host', () => {
    expect(isSafeExternalUrl('https://evil.com/phish')).toBe(false)
  })

  it('blocks javascript scheme', () => {
    expect(isSafeExternalUrl('javascript:alert(1)')).toBe(false)
  })

  it('blocks protocol-relative URL', () => {
    expect(isSafeExternalUrl('//evil.com')).toBe(false)
  })

  it('allows same origin', () => {
    expect(isSafeExternalUrl('https://localhost/checkout/success')).toBe(true)
  })

  it('blocks empty string', () => {
    expect(isSafeExternalUrl('')).toBe(false)
  })

  it('blocks null', () => {
    expect(isSafeExternalUrl(null)).toBe(false)
  })

  it('blocks suffix spoof', () => {
    expect(isSafeExternalUrl('http://scam.zalopay.vn.evil.com')).toBe(false)
  })

  it('allows http protocol (not just https)', () => {
    expect(isSafeExternalUrl('http://zalopay.vn/checkout')).toBe(true)
  })

  it('blocks undefined input', () => {
    expect(isSafeExternalUrl(undefined)).toBe(false)
  })

  it('blocks relative path (no valid host)', () => {
    expect(isSafeExternalUrl('/local/path')).toBe(false)
  })

  it('accepts custom allowedHostSuffixes option', () => {
    expect(isSafeExternalUrl('https://custom.example.com/page', {
      allowedHostSuffixes: ['example.com'],
    })).toBe(true)
  })

  it('blocks host not in custom allowedHostSuffixes', () => {
    expect(isSafeExternalUrl('https://evil.com', {
      allowedHostSuffixes: ['example.com'],
    })).toBe(false)
  })

  it('disallows different host when allowSameOrigin is false', () => {
    expect(isSafeExternalUrl('https://other.com/path', {
      allowSameOrigin: false,
    })).toBe(false)
  })

  it('allows same origin when allowSameOrigin is false', () => {
    expect(isSafeExternalUrl('https://localhost/path', {
      allowSameOrigin: false,
    })).toBe(false)
  })

  it('blocks subdomain suffix match with dot prefix', () => {
    expect(isSafeExternalUrl('https://xzalopay.vn/')).toBe(false)
  })

  it('allows subdomain of allowed host', () => {
    expect(isSafeExternalUrl('https://checkout.zalopay.vn/pay')).toBe(true)
  })

  it('rejects non-http(s) protocol', () => {
    expect(isSafeExternalUrl('ftp://zalopay.vn/file')).toBe(false)
  })
})

describe('navigateToSafeExternalUrl', () => {
  beforeEach(() => {
    (globalThis as any).window = {
      location: { hostname: 'localhost', href: 'http://localhost/' },
    }
  })

  it('sets window.location.href for safe URL', () => {
    const target = 'https://zalopay.vn/checkout'
    navigateToSafeExternalUrl(target)
    expect(window.location.href).toBe(target)
  })

  it('throws for unsafe URL', () => {
    expect(() => navigateToSafeExternalUrl('https://evil.com/phish')).toThrow(
      'Unsafe or disallowed payment redirect URL'
    )
  })
})

describe('HttpError', () => {
  it('has correct shape', () => {
    const err = new HttpError(404, 'Not Found', { detail: 'missing' })
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(HttpError)
    expect(err.status).toBe(404)
    expect(err.message).toBe('Not Found')
    expect(err.body).toEqual({ detail: 'missing' })
    expect(err.name).toBe('HttpError')
  })

  it('works without body', () => {
    const err = new HttpError(500, 'Server Error')
    expect(err.status).toBe(500)
    expect(err.body).toBeUndefined()
  })
})

describe('apiClient allowAnonymous', () => {
  const originalFetch = globalThis.fetch
  let redirectOccurred: boolean
  let fetchUrls: string[]

  const mockLocation = {
    hostname: 'localhost',
    href: 'http://localhost/',
  }

  beforeEach(() => {
    fetchUrls = []
    redirectOccurred = false

    Object.defineProperty(mockLocation, 'href', {
      get: () => 'http://localhost/',
      set: (val: string) => {
        if (val) redirectOccurred = true
      },
      configurable: true,
    })

    ;(globalThis as any).window = { location: mockLocation }
    ;(globalThis as any).localStorage = {
      removeItem: () => {},
      getItem: () => null,
      setItem: () => {},
    }

    globalThis.fetch = vi.fn(
      async (input: RequestInfo | URL) => {
        const urlStr = typeof input === 'string' ? input : input.toString()
        fetchUrls.push(urlStr)
        return new Response(JSON.stringify({ message: 'Unauthorized' }), {
          status: 401,
          statusText: 'Unauthorized',
          headers: { 'Content-Type': 'application/json' },
        })
      },
    ) as unknown as typeof fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    delete (globalThis as any).localStorage
  })

  it('allowAnonymous: true suppresses refresh and redirect on 401', async () => {
    let caughtError: HttpError | null = null
    try {
      await request('GET', '/api/web/users/me', { allowAnonymous: true })
    } catch (err) {
      if (err instanceof HttpError) caughtError = err
    }

    expect(caughtError).not.toBeNull()
    expect(caughtError?.status).toBe(401)
    expect(fetchUrls).toHaveLength(1)
    expect(fetchUrls[0]).toContain('/api/web/users/me')
    expect(redirectOccurred).toBe(false)
  })

  it('default (allowAnonymous omitted) triggers refresh and redirect on 401', async () => {
    let caughtError: Error | null = null
    try {
      await request('GET', '/api/web/protected-resource')
    } catch (err) {
      if (err instanceof Error) caughtError = err
    }

    expect(caughtError).not.toBeNull()
    expect(fetchUrls).toHaveLength(2)
    expect(fetchUrls[1]).toContain('/api/web/auth/refresh')
    expect(redirectOccurred).toBe(true)
  })

  it('requestCached with allowAnonymous: true suppresses refresh and redirect on 401', async () => {
    let caughtError: HttpError | null = null
    try {
      await requestCached('GET', '/api/web/events/recommendations?limit=8', { allowAnonymous: true })
    } catch (err) {
      if (err instanceof HttpError) caughtError = err
    }

    expect(caughtError).not.toBeNull()
    expect(caughtError?.status).toBe(401)
    expect(fetchUrls).toHaveLength(1)
    expect(fetchUrls[0]).toContain('/api/web/events/recommendations?limit=8')
    expect(redirectOccurred).toBe(false)
  })
})

describe('apiClient GET cache', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => { invalidateApiCache() })

  afterEach(() => {
    globalThis.fetch = originalFetch
    invalidateApiCache()
  })

  it('serves cached data on repeated GET', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ value: 'first' }), { status: 200 }))

    globalThis.fetch = fetchMock as unknown as typeof fetch

    const r1 = await request<{ value: string }>('GET', '/api/cached')
    expect(r1).toEqual({ value: 'first' })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const r2 = await request<{ value: string }>('GET', '/api/cached')
    expect(r2).toEqual({ value: 'first' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('fetches again after invalidateApiCache clears all', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ value: 'old' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ value: 'new' }), { status: 200 }))
    globalThis.fetch = fetchMock as unknown as typeof fetch

    invalidateApiCache()
    await request('GET', '/api/cached')
    invalidateApiCache()

    const result = await request<{ value: string }>('GET', '/api/cached')
    expect(result).toEqual({ value: 'new' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('fetches again after invalidateApiCache with matching prefix', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ value: 'a' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ value: 'b' }), { status: 200 }))
    globalThis.fetch = fetchMock as unknown as typeof fetch

    await request('GET', '/api/cached/data')
    invalidateApiCache('/api/cached')

    const result = await request<{ value: string }>('GET', '/api/cached/data')
    expect(result).toEqual({ value: 'b' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not invalidate unrelated cache entries', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ x: 1 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ x: 2 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ x: 1 }), { status: 200 }))
    globalThis.fetch = fetchMock as unknown as typeof fetch

    await request('GET', '/api/keep')
    await request('GET', '/api/other')
    invalidateApiCache('/api/keep')

    await request('GET', '/api/keep')
    const r = await request<{ x: number }>('GET', '/api/other')
    expect(r).toEqual({ x: 2 })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})

describe('apiClient POST', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    delete (globalThis as any).document
  })

  it('sends JSON body and CSRF token header', async () => {
    ;(globalThis as any).document = {
      cookie: 'csrfToken=test-csrf-value; other=1',
    }

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    )
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const result = await request<{ success: boolean }>('POST', '/api/submit', {
      body: { name: 'test' },
    })

    expect(result).toEqual({ success: true })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const callArgs = fetchMock.mock.calls[0]
    const url = callArgs[0] as string
    const init = callArgs[1] as RequestInit
    expect(url).toContain('/api/submit')
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json')
    expect((init.headers as Record<string, string>)['X-CSRF-Token']).toBe('test-csrf-value')
    expect(init.body).toBe(JSON.stringify({ name: 'test' }))
  })

  it('includes CSRF header for PUT method', async () => {
    ;(globalThis as any).document = {
      cookie: 'csrfToken=put-csrf',
    }

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    )
    globalThis.fetch = fetchMock as unknown as typeof fetch

    await request('PUT', '/api/update', { body: { id: 1 } })

    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect((init.headers as Record<string, string>)['X-CSRF-Token']).toBe('put-csrf')
  })
})

describe('apiClient retries on 429', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.useRealTimers()
    invalidateApiCache()
  })

  it('retries once on 429 and succeeds', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('{}', { status: 429 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const promise = request('GET', '/api/retry-test')
    await vi.advanceTimersByTimeAsync(5000)
    const result = await promise

    expect(result).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('retries up to 3 times on persistent 429', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('{}', { status: 429 }))
      .mockResolvedValueOnce(new Response('{}', { status: 429 }))
      .mockResolvedValueOnce(new Response('{}', { status: 429 }))
    globalThis.fetch = fetchMock as unknown as typeof fetch

    let caught: Error | null = null
    const promise = request('GET', '/api/retry-429').catch(e => { caught = e; return undefined })
    await vi.advanceTimersByTimeAsync(10000)
    await promise

    expect(caught).not.toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('honors Retry-After header', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('{}', { status: 429, headers: { 'Retry-After': '1' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ done: true }), { status: 200 }))
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const promise = request('GET', '/api/retry-after')
    await vi.advanceTimersByTimeAsync(5000)
    const result = await promise

    expect(result).toEqual({ done: true })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('apiClient HTTP error messages', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('extracts message from { message } shape', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'Not allowed' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    ) as unknown as typeof fetch

    let err: unknown = null
    try { await request('GET', '/api/test') } catch (e) { err = e }
    expect(err).toBeInstanceOf(HttpError)
    expect((err as HttpError).status).toBe(403)
    expect((err as HttpError).message).toBe('Not allowed')
  })

  it('extracts message from { error: string } shape', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    ) as unknown as typeof fetch

    let err: unknown = null
    try { await request('GET', '/api/test') } catch (e) { err = e }
    expect((err as HttpError).message).toBe('Server error')
  })

  it('extracts message from { error: { message } } shape', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { message: 'Nested error' } }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    ) as unknown as typeof fetch

    let err: unknown = null
    try { await request('GET', '/api/test') } catch (e) { err = e }
    expect((err as HttpError).message).toBe('Nested error')
  })

  it('falls back to status text when body is not JSON', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response('not json', { status: 502, statusText: 'Bad Gateway' })
    ) as unknown as typeof fetch

    let err: unknown = null
    try { await request('GET', '/api/test') } catch (e) { err = e }
    expect((err as HttpError).message).toBe('Bad Gateway')
  })

  it('falls back to API error: status when message is object', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: { invalid: true } }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    ) as unknown as typeof fetch

    let err: unknown = null
    try { await request('GET', '/api/test') } catch (e) { err = e }
    expect((err as HttpError).message).toBe('API error: 400')
  })

  it('preserves HttpError body for downstream inspection', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 'INVALID_INPUT', message: 'Bad request' }), {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
      })
    ) as unknown as typeof fetch

    let err: unknown = null
    try { await request('GET', '/api/test') } catch (e) { err = e }
    expect((err as HttpError).body).toEqual({ code: 'INVALID_INPUT', message: 'Bad request' })
  })
})

describe('apiClient refresh retry', () => {
  const originalFetch = globalThis.fetch
  let fetchUrls: string[]
  let redirectUrl: string

  const mockLocation = {
    hostname: 'localhost',
    href: 'http://localhost/',
  }

  beforeEach(() => {
    invalidateApiCache()
    fetchUrls = []
    redirectUrl = ''

    Object.defineProperty(mockLocation, 'href', {
      get: () => 'http://localhost/',
      set: (val: string) => { redirectUrl = val },
      configurable: true,
    })

    ;(globalThis as any).window = { location: mockLocation }
    ;(globalThis as any).localStorage = {
      removeItem: () => {},
      getItem: () => null,
      setItem: () => {},
    }
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    delete (globalThis as any).localStorage
  })

  it('retries successfully after refresh on 401', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: 'protected' }), { status: 200 }))
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const result = await request<{ data: string }>('GET', '/api/web/secret')

    expect(result).toEqual({ data: 'protected' })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[0][0] as string).toContain('/api/web/secret')
    expect(fetchMock.mock.calls[1][0] as string).toContain('/api/web/auth/refresh')
    expect(fetchMock.mock.calls[2][0] as string).toContain('/api/web/secret')
  })

  it('redirects to /login when refresh fails on 401', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 }))
    globalThis.fetch = fetchMock as unknown as typeof fetch

    let err: unknown = null
    try { await request('GET', '/api/web/secret') } catch (e) { err = e }

    expect(err).toBeInstanceOf(HttpError)
    expect(redirectUrl).toBe('/login')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not attempt refresh when path is /api/web/auth/refresh', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 })
    )
    globalThis.fetch = fetchMock as unknown as typeof fetch

    let err: unknown = null
    try { await request('GET', '/api/web/auth/refresh') } catch (e) { err = e }

    expect(err).toBeInstanceOf(HttpError)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('requestCached non-GET delegation', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    invalidateApiCache()
    delete (globalThis as any).document
  })

  it('delegates POST to request (bypasses cache)', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ created: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ created: true }), { status: 200 }))
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const r1 = await requestCached('POST', '/api/items', { body: { name: 'x' } })
    expect(r1).toEqual({ created: true })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const r2 = await requestCached('POST', '/api/items', { body: { name: 'x' } })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('delegates DELETE to request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 })
    )
    globalThis.fetch = fetchMock as unknown as typeof fetch

    await requestCached('DELETE', '/api/items/1')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
