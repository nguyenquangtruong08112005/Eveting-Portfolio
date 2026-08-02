import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('StorageService', () => {
  let StorageService: typeof import('./storage.service').StorageService

  beforeEach(async () => {
    vi.stubGlobal('document', undefined)
    mockFetch.mockReset()
    const mod = await import('./storage.service')
    StorageService = mod.StorageService
  })

  function fakeFile(name = 'photo.png'): File {
    return new File(['fake'], name, { type: 'image/png' })
  }

  function lastFormData(): FormData {
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(init.body).instanceOf(FormData)
    return init.body as FormData
  }

  function lastHeaders(): Record<string, string> {
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    return (init.headers ?? {}) as Record<string, string>
  }

  it('uploads with default purpose and no CSRF', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'https://cdn.test/1.png' }),
    })

    const result = await StorageService.upload(fakeFile())

    const fd = lastFormData()
    expect(fd.get('file')).instanceOf(File)
    expect(fd.get('purpose')).toBe('misc')
    const headers = lastHeaders()
    expect(headers['X-CSRF-Token']).toBeUndefined()
    expect(result).toEqual({ url: 'https://cdn.test/1.png' })
  })

  it('uploads with explicit purpose', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'https://cdn.test/p', key: 'k' }),
    })

    const result = await StorageService.upload(fakeFile(), 'profile')

    expect(lastFormData().get('purpose')).toBe('profile')
    expect(result).toEqual({ url: 'https://cdn.test/p', key: 'k' })
  })

  it('sends CSRF token when cookie present', async () => {
    vi.stubGlobal('document', {
      cookie: 'csrfToken=abc123; other=val',
    })
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'u' }),
    })

    await StorageService.upload(fakeFile())

    expect(lastHeaders()['X-CSRF-Token']).toBe('abc123')
  })

  it('sends multipart/form-data without manually-set Content-Type', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'u' }),
    })

    await StorageService.upload(fakeFile())

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(init.headers).not.toHaveProperty('Content-Type')
  })

  it('posts to correct URL with credentials', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'u' }),
    })

    await StorageService.upload(fakeFile())

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toMatch(/\/api\/web\/storage\/upload$/)
    expect(init.method).toBe('POST')
    expect(init.credentials).toBe('include')
  })

  it('throws JSON error message from server', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 413,
      statusText: 'Payload Too Large',
      json: async () => ({ error: 'File too big' }),
    })

    await expect(StorageService.upload(fakeFile())).rejects.toThrow('File too big')
  })

  it('falls back to message field when no error field', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => ({ message: 'Bad file type' }),
    })

    await expect(StorageService.upload(fakeFile())).rejects.toThrow('Bad file type')
  })

  it('falls back to statusText when JSON parse fails', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => { throw new Error('not json') },
    })

    await expect(StorageService.upload(fakeFile())).rejects.toThrow('Internal Server Error')
  })
})
