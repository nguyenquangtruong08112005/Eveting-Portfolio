import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { VerifyEmailForm } from './VerifyEmailForm'

const { searchParamsStore, setSearchParams } = vi.hoisted(() => {
  const store: Record<string, string> = {}
  return {
    searchParamsStore: store,
    setSearchParams: (next: Record<string, string>) => {
      Object.keys(store).forEach((k) => delete store[k])
      Object.assign(store, next)
    },
  }
})

vi.mock('next-intl', () => {
  const messages = JSON.parse(readFileSync(process.cwd() + '/messages/vi.json', 'utf8'))
  const lookup = (obj: Record<string, unknown>, path: string[]) => {
    let cur: unknown = obj
    for (const part of path) {
      if (typeof cur !== 'object' || cur === null) return undefined
      cur = (cur as Record<string, unknown>)[part]
    }
    return cur
  }
  const useTranslations = (ns: string) => (key: string, params?: Record<string, unknown>) => {
    const value = lookup(messages, ns.split('.').concat(key.split('.')))
    if (value === undefined) return key
    if (typeof value !== 'string') return String(value)
    if (params) return value.replace(/\{(\w+)\}/g, (_, p) => String(params[p] ?? `{${p}}`))
    return value
  }
  return { useTranslations }
})

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: (key: string) => searchParamsStore[key] ?? '' }),
}))

vi.mock('@/services/auth.service', () => ({
  AuthService: { confirmEmailVerify: vi.fn(), requestEmailVerify: vi.fn() },
}))

vi.mock('next/link', () => ({
  default: (props: { href: string; children: React.ReactNode }) => <a href={props.href}>{props.children}</a>,
}))

const source = readFileSync(new URL('./VerifyEmailForm.tsx', import.meta.url), 'utf8')

describe('VerifyEmailForm — registered redirect flow', () => {
  beforeEach(() => setSearchParams({}))

  it('shows the verify-after-register notice with the email prefilled when registered=1', () => {
    setSearchParams({ email: 'new.user@example.com', registered: '1' })
    const html = renderToStaticMarkup(<VerifyEmailForm />)
    expect(html).toContain('value="new.user@example.com"')
    expect(html).toContain('type="submit"')
    expect(html).toContain('bg-[var(--primary)]/8')
  })

  it('starts in the ok status when arriving from registration', () => {
    expect(source).toMatch(/fromRegister \? 'ok' : 'idle'/)
    expect(source).toMatch(/fromRegister \? t\('verify_after_register'\) : ''/)
  })
})

describe('VerifyEmailForm — token verification', () => {
  beforeEach(() => setSearchParams({}))

  it('reads the verification token and email from the query string', () => {
    expect(source).toMatch(/const token = searchParams\?\.get\('token'\) \|\| ''/)
    expect(source).toMatch(/const emailFromQuery = searchParams\?\.get\('email'\) \|\| ''/)
  })

  it('auto-confirms the token once on mount and reports success or error', () => {
    expect(source).toMatch(/setStatus\('loading'\)/)
    expect(source).toMatch(/AuthService\.confirmEmailVerify\(token\)/)
    expect(source).toMatch(/setStatus\('ok'\)/)
    expect(source).toMatch(/setStatus\('error'\)/)
    expect(source).toMatch(/res\.message \|\| t\('verify_success'\)/)
    expect(source).toMatch(/err instanceof Error \? err\.message : t\('verify_error'\)/)
  })

  it('renders the status view instead of the form when a token is present', () => {
    setSearchParams({ token: 'verify-token-abc' })
    const html = renderToStaticMarkup(<VerifyEmailForm />)
    expect(html).not.toContain('type="submit"')
    expect(html).toContain('href="/login"')
  })

  it('does not verify when no token is present', () => {
    expect(source).toMatch(/if \(!token\) return;/)
  })
})

describe('VerifyEmailForm — resend form', () => {
  beforeEach(() => setSearchParams({}))

  it('requests a fresh verification link and reflects success or failure', () => {
    expect(source).toMatch(/await AuthService\.requestEmailVerify\(email\)/)
    expect(source).toMatch(/res\.message \|\| t\('verify_email_sent'\)/)
    expect(source).toMatch(/err instanceof Error \? err\.message : t\('verify_error'\)/)
    expect(source).toMatch(/setStatus\('ok'\)/)
    expect(source).toMatch(/setStatus\('error'\)/)
  })

  it('disables the resend button while a request is in flight', () => {
    expect(source).toMatch(/disabled=\{status === 'loading'\}/)
    expect(source).toMatch(/status === 'loading' \? t\('sending'\) : t\('send_verify_link'\)/)
  })

  it('requires an email address', () => {
    expect(source).toContain('required')
  })

  it('wraps the form in a Suspense boundary with a spinner fallback', () => {
    expect(source).toMatch(/<Suspense\s+fallback=\{/)
    expect(source).toMatch(/animate-spin/)
  })
})
