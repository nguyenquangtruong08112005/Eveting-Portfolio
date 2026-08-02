import { describe, it, expect, vi, beforeEach } from 'vitest'

const cookieStore = vi.hoisted(() => ({
  get: vi.fn(),
}))

vi.mock('next-intl/server', () => ({
  getRequestConfig: (fn: unknown) => fn,
}))

vi.mock('next/headers', () => ({
  cookies: () => cookieStore,
}))

vi.mock('./routing', () => ({
  routing: { locales: ['vi', 'en'], defaultLocale: 'vi' },
}))

import requestConfig from './request'

function setCookie(value: string | undefined) {
  cookieStore.get.mockReturnValue(
    value === undefined ? undefined : { name: 'NEXT_LOCALE', value }
  )
}

describe('i18n request config — locale resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resolves locale from the NEXT_LOCALE cookie', async () => {
    setCookie('en')
    const config = await requestConfig({ requestLocale: Promise.resolve(undefined) })
    expect(config.locale).toBe('en')
    expect(config.messages).toBeDefined()
  })

  it('falls back to the default locale (vi) when no cookie is present', async () => {
    setCookie(undefined)
    const config = await requestConfig({ requestLocale: Promise.resolve(undefined) })
    expect(config.locale).toBe('vi')
    expect(config.messages).toBeDefined()
  })

  it('ignores an unsupported cookie value', async () => {
    setCookie('fr')
    const config = await requestConfig({ requestLocale: Promise.resolve(undefined) })
    expect(config.locale).toBe('vi')
  })

  it('prefers an explicit requestLocale over the cookie', async () => {
    setCookie('vi')
    const config = await requestConfig({ requestLocale: Promise.resolve('en') })
    expect(config.locale).toBe('en')
  })

  it('falls back to the default locale when cookies() is unavailable', async () => {
    cookieStore.get.mockImplementation(() => {
      throw new Error('DYNAMIC_SERVER_USAGE')
    })
    const config = await requestConfig({ requestLocale: Promise.resolve(undefined) })
    expect(config.locale).toBe('vi')
  })
})
