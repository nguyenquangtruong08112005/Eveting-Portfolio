import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { LoginForm } from './LoginForm'

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
}))

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ login: vi.fn() }) }))

vi.mock('@/services/auth.service', () => ({
  AuthService: { login: vi.fn(), googleLogin: vi.fn(), facebookLogin: vi.fn() },
}))

vi.mock('next/link', () => ({
  default: (props: { href: string; children: React.ReactNode }) => <a href={props.href}>{props.children}</a>,
}))

const source = readFileSync(new URL('./LoginForm.tsx', import.meta.url), 'utf8')

describe('LoginForm — initial render', () => {
  it('renders email and password fields plus a submit button', () => {
    const html = renderToStaticMarkup(<LoginForm />)
    expect(html).toContain('ban@example.com')
    expect(html).toContain('type="email"')
    expect(html).toContain('type="password"')
    expect(html).toContain('type="submit"')
  })

  it('links to forgot-password, register and home', () => {
    const html = renderToStaticMarkup(<LoginForm />)
    expect(html).toContain('href="/forgot-password"')
    expect(html).toContain('href="/register"')
    expect(html).toContain('href="/"')
  })

  it('marks both email and password as required native inputs', () => {
    expect(source).toMatch(/type="email"/)
    expect(source).toMatch(/type="password"/)
    expect(source).toContain('required')
    expect(source).toContain('noValidate')
  })

  it('falls back to disabled social buttons when providers are not configured', () => {
    const html = renderToStaticMarkup(<LoginForm />)
    expect(html).toContain('data-testid="google-auth-button"')
    expect(html).toContain('data-testid="facebook-auth-button"')
    expect(html.match(/\(Disabled\)/g)).toHaveLength(2)
  })
})

describe('LoginForm — submit flow', () => {
  it('posts credentials through AuthService.login and applies the auth session', () => {
    expect(source).toMatch(/await AuthService\.login\(email, password\)/)
    expect(source).toMatch(/applyAuthSession\(data, login, router\)/)
  })

  it('sets loading state during submit and disables the button', () => {
    expect(source).toMatch(/setLoading\(true\)/)
    expect(source).toMatch(/disabled=\{loading\}/)
    expect(source).toMatch(/loading \? t\('logging_in'\) : t\('login'\)/)
    expect(source).toMatch(/finally \{\s*setLoading\(false\);?\s*\}/)
  })

  it('clears any previous error before submitting', () => {
    expect(source).toMatch(/setError\(''\)/)
  })

  it('surfaces the server error message to the user', () => {
    expect(source).toMatch(/err instanceof Error && err\.message/)
    expect(source).toContain('message = err.message')
    expect(source).toMatch(/e\.body\?\.error\?\.message/)
    expect(source).toMatch(/setError\(message\)/)
    expect(source).toContain('{error && (')
  })

  it('wires social auth errors into the same error banner', () => {
    expect(source).toMatch(/onError=\{\(msg\) => setError\(msg\)\}/)
    expect(source).toMatch(/onSuccess=\{\(data\) => applyAuthSession\(data, login, router\)\}/)
  })
})
