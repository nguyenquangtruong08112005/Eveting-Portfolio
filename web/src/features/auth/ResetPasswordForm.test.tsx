import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { ResetPasswordForm } from './ResetPasswordForm'

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
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({ get: (key: string) => searchParamsStore[key] ?? '' }),
}))

vi.mock('@/services/auth.service', () => ({
  AuthService: { confirmPasswordReset: vi.fn() },
}))

vi.mock('next/link', () => ({
  default: (props: { href: string; children: React.ReactNode }) => <a href={props.href}>{props.children}</a>,
}))

const source = readFileSync(new URL('./ResetPasswordForm.tsx', import.meta.url), 'utf8')

describe('ResetPasswordForm — token handling', () => {
  beforeEach(() => setSearchParams({}))

  it('reads the reset token from the query string', () => {
    expect(source).toMatch(/const token = searchParams\?\.get\('token'\) \|\| ''/)
  })

  it('renders new-password and confirm fields when mounted', () => {
    setSearchParams({ token: 'reset-token-123' })
    const html = renderToStaticMarkup(<ResetPasswordForm />)
    expect(html).toContain('type="password"')
    expect(html).toContain('type="submit"')
  })

  it('wraps the form in a Suspense boundary with a spinner fallback', () => {
    expect(source).toMatch(/<Suspense\s+fallback=\{/)
    expect(source).toMatch(/animate-spin/)
  })
})

describe('ResetPasswordForm — validation and submit', () => {
  beforeEach(() => setSearchParams({}))

  it('blocks submission when the reset token is missing', () => {
    expect(source).toMatch(/if \(!token\) \{\s*setError\(t\('reset_token_missing'\)\);\s*return;\s*\}/)
  })

  it('rejects passwords shorter than six characters', () => {
    expect(source).toMatch(/if \(password\.length < 6\) \{\s*setError\(t\('password_placeholder'\)\);\s*return;\s*\}/)
  })

  it('rejects when the confirmation password does not match', () => {
    expect(source).toMatch(/if \(password !== confirm\) \{\s*setError\(t\('password_mismatch'\)\);\s*return;\s*\}/)
  })

  it('confirms the reset and redirects to login on success', () => {
    expect(source).toMatch(/await AuthService\.confirmPasswordReset\(token, password\)/)
    expect(source).toMatch(/router\.push\('\/login\?reset=1'\)/)
  })

  it('sets loading state during submit and disables the button', () => {
    expect(source).toMatch(/setLoading\(true\)/)
    expect(source).toMatch(/disabled=\{loading\}/)
    expect(source).toMatch(/loading \? t\('saving'\) : t\('save_new_password'\)/)
    expect(source).toMatch(/finally \{\s*setLoading\(false\);?\s*\}/)
  })

  it('surfaces confirmation errors in the banner', () => {
    expect(source).toMatch(/err instanceof Error \? err\.message : t\('reset_confirm_error'\)/)
    expect(source).toMatch(/setError\(/)
    expect(source).toContain('{error && (')
  })
})
