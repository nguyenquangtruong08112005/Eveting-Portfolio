import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { RegisterForm } from './RegisterForm'

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
  AuthService: { register: vi.fn(), requestEmailVerify: vi.fn(), googleLogin: vi.fn(), facebookLogin: vi.fn() },
}))

vi.mock('next/link', () => ({
  default: (props: { href: string; children: React.ReactNode }) => <a href={props.href}>{props.children}</a>,
}))

const source = readFileSync(new URL('./RegisterForm.tsx', import.meta.url), 'utf8')

describe('RegisterForm — initial render', () => {
  it('renders name, email and password fields plus a submit button', () => {
    const html = renderToStaticMarkup(<RegisterForm />)
    expect(html).toContain('Nguyễn Văn A')
    expect(html).toContain('ban@example.com')
    expect(html).toContain('type="email"')
    expect(html).toContain('type="password"')
    expect(html).toContain('type="submit"')
  })

  it('links to login and home', () => {
    const html = renderToStaticMarkup(<RegisterForm />)
    expect(html).toContain('href="/login"')
    expect(html).toContain('href="/"')
  })

  it('enforces required fields and a minimum password length', () => {
    expect(source).toContain('required')
    expect(source).toMatch(/minLength=\{6\}/)
  })

  it('falls back to disabled social buttons when providers are not configured', () => {
    const html = renderToStaticMarkup(<RegisterForm />)
    expect(html).toContain('data-testid="google-auth-button"')
    expect(html).toContain('data-testid="facebook-auth-button"')
    expect(html.match(/\(Disabled\)/g)).toHaveLength(2)
  })
})

describe('RegisterForm — submit flow', () => {
  it('registers with the resolved role and redirects to email verification', () => {
    expect(source).toMatch(/const role = requestedRole === 'organizer' \? 'organizer' : 'user'/)
    expect(source).toMatch(/await AuthService\.register\(name, email, password, role\)/)
    expect(source).toMatch(/AuthService\.requestEmailVerify\(email\.trim\(\)\)/)
    expect(source).toMatch(/router\.push\(`\/verify-email\?email=\$\{encodeURIComponent\(email\.trim\(\)\)\}&registered=1`\)/)
  })

  it('sets loading state during submit and disables the button', () => {
    expect(source).toMatch(/setLoading\(true\)/)
    expect(source).toMatch(/disabled=\{loading\}/)
    expect(source).toMatch(/loading \? t\('registering'\) \|\| 'Creating…' : t\('create_account'\)/)
    expect(source).toMatch(/finally \{\s*setLoading\(false\);?\s*\}/)
  })

  it('keeps registration errors user-visible via the banner', () => {
    expect(source).toMatch(/\?\.response\?\.data\?\.message/)
    expect(source).toMatch(/t\('register_error'\)/)
    expect(source).toMatch(/setError\(message\)/)
    expect(source).toContain('{error && (')
  })

  it('passes the selected role through to the social auth buttons', () => {
    expect(source).toMatch(/role=\{role\}/)
    expect(source).toMatch(/onError=\{\(msg\) => setError\(msg\)\}/)
  })
})
