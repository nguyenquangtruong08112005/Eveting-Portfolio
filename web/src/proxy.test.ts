import { describe, it, expect, vi, beforeEach } from 'vitest'

const redirectResponse = vi.hoisted(() => ({
  cookies: { set: vi.fn() },
}))

vi.mock('next/server', () => ({
  NextResponse: {
    next: vi.fn(),
    redirect: vi.fn(() => redirectResponse),
  },
}))

import { proxy, config } from './proxy'
import { NextResponse } from 'next/server'

const mockedNextResponse = vi.mocked(NextResponse)

function makeRequest(pathname: string, search = '') {
  const url = `http://localhost:3000${pathname}${search}`
  return { url, nextUrl: new URL(url) } as never
}

describe('proxy — root app routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each([
    '/',
    '/login',
    '/register',
    '/register?role=organizer',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
    '/search',
    '/search?category=music',
    '/checkout',
    '/checkout/success',
    '/profile',
    '/notifications',
    '/my-tickets',
    '/my-tickets/42',
    '/attendee/events/123',
    '/organizer/dashboard',
    '/organizer/events/123/edit',
    '/admin/users',
  ])('passes %s through without rewriting or redirecting', (path) => {
    const [pathname, rawSearch] = path.split('?')
    proxy(makeRequest(pathname, rawSearch ? `?${rawSearch}` : ''))

    expect(mockedNextResponse.next).toHaveBeenCalledTimes(1)
    expect(mockedNextResponse.redirect).not.toHaveBeenCalled()
  })
})

describe('proxy — locale cookie-switch redirects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects /vi to / and sets NEXT_LOCALE=vi', () => {
    proxy(makeRequest('/vi'))

    expect(mockedNextResponse.redirect).toHaveBeenCalledWith(new URL('/', 'http://localhost:3000/vi'))
    expect(redirectResponse.cookies.set).toHaveBeenCalledWith('NEXT_LOCALE', 'vi', { path: '/' })
  })

  it('redirects /en to / and sets NEXT_LOCALE=en', () => {
    proxy(makeRequest('/en'))

    expect(mockedNextResponse.redirect).toHaveBeenCalledWith(new URL('/', 'http://localhost:3000/en'))
    expect(redirectResponse.cookies.set).toHaveBeenCalledWith('NEXT_LOCALE', 'en', { path: '/' })
  })
})

describe('proxy — matcher', () => {
  it('only runs on app routes and excludes api/_next/_vercel and file requests', () => {
    expect(config.matcher).toEqual(['/((?!api|_next|_vercel|.*\\..*).*)'])
  })
})
