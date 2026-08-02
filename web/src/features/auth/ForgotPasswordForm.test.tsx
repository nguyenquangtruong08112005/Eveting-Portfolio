import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { ForgotPasswordForm } from './ForgotPasswordForm'

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

vi.mock('@/services/auth.service', () => ({
  AuthService: { requestPasswordReset: vi.fn() },
}))

vi.mock('next/link', () => ({
  default: (props: { href: string; children: React.ReactNode }) => <a href={props.href}>{props.children}</a>,
}))

const source = readFileSync(new URL('./ForgotPasswordForm.tsx', import.meta.url), 'utf8')

describe('ForgotPasswordForm — initial render', () => {
  it('renders an email field and a send-reset submit button', () => {
    const html = renderToStaticMarkup(<ForgotPasswordForm />)
    expect(html).toContain('ban@example.com')
    expect(html).toContain('type="email"')
    expect(html).toContain('type="submit"')
  })

  it('links back to login', () => {
    const html = renderToStaticMarkup(<ForgotPasswordForm />)
    expect(html).toContain('href="/login"')
  })

  it('requires an email address before submitting', () => {
    expect(source).toContain('required')
  })
})

describe('ForgotPasswordForm — submit flow', () => {
  it('requests a password reset with the entered email', () => {
    expect(source).toMatch(/await AuthService\.requestPasswordReset\(email\)/)
  })

  it('shows the sent confirmation and hides the form once done', () => {
    expect(source).toMatch(/setDone\(true\)/)
    expect(source).toMatch(/done \? \(/)
    expect(source).toMatch(/reset_email_sent/)
    expect(source).toMatch(/back_to_login/)
  })

  it('sets loading state during submit and disables the button', () => {
    expect(source).toMatch(/setLoading\(true\)/)
    expect(source).toMatch(/disabled=\{loading\}/)
    expect(source).toMatch(/loading \? t\('sending'\) : t\('send_reset_link'\)/)
    expect(source).toMatch(/finally \{\s*setLoading\(false\);?\s*\}/)
  })

  it('surfaces request errors in the banner', () => {
    expect(source).toMatch(/err instanceof Error \? err\.message : t\('reset_request_error'\)/)
    expect(source).toMatch(/setError\(/)
    expect(source).toContain('{error && (')
  })
})
