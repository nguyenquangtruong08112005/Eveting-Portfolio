import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import React from 'react'

const mockFeature = (name: string) => {
  const Component = ({ children }: { children?: React.ReactNode }) =>
    <div data-testid={name}>{children}</div>
  Component.displayName = name
  return Component
}

vi.mock('@/features/events/EventDiscovery', () => ({
  EventDiscovery: mockFeature('EventDiscovery'),
}))

vi.mock('@/features/auth/LoginForm', () => ({
  LoginForm: mockFeature('LoginForm'),
}))

vi.mock('@/features/auth/RegisterForm', () => ({
  RegisterForm: mockFeature('RegisterForm'),
}))

vi.mock('@/features/auth/ForgotPasswordForm', () => ({
  ForgotPasswordForm: mockFeature('ForgotPasswordForm'),
}))

vi.mock('@/features/auth/ResetPasswordForm', () => ({
  ResetPasswordForm: mockFeature('ResetPasswordForm'),
}))

vi.mock('@/features/auth/VerifyEmailForm', () => ({
  VerifyEmailForm: mockFeature('VerifyEmailForm'),
}))

vi.mock('@/features/search/SearchView', () => ({
  SearchView: mockFeature('SearchView'),
}))

vi.mock('@/features/checkout/CheckoutView', () => ({
  CheckoutView: mockFeature('CheckoutView'),
}))

vi.mock('@/features/tickets/MyTicketsView', () => ({
  MyTicketsView: mockFeature('MyTicketsView'),
}))

vi.mock('@/features/tickets/TicketDetailView', () => ({
  TicketDetailView: mockFeature('TicketDetailView'),
}))

vi.mock('@/features/notifications/NotificationsView', () => ({
  NotificationsView: mockFeature('NotificationsView'),
}))

vi.mock('@/features/profile/ProfileView', () => ({
  ProfileView: mockFeature('ProfileView'),
}))

vi.mock('@/components/shared/RouteGuard', () => ({
  RouteGuard: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="RouteGuard">{children}</div>
  ),
}))

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

describe('Route entrypoints — page renders', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('src/app/page.tsx renders EventDiscovery', async () => {
    const { default: HomePage } = await import('./page')
    const html = renderToStaticMarkup(<HomePage />)
    expect(html).toContain('data-testid="EventDiscovery"')
  })

  it('src/app/[locale]/page.tsx renders EventDiscovery', async () => {
    const { default: LocaleHomePage } = await import('./[locale]/page')
    const html = renderToStaticMarkup(<LocaleHomePage />)
    expect(html).toContain('data-testid="EventDiscovery"')
  })

  it('src/app/login/page.tsx renders LoginForm', async () => {
    const { default: LoginPage } = await import('./login/page')
    const html = renderToStaticMarkup(<LoginPage />)
    expect(html).toContain('data-testid="LoginForm"')
  })

  it('src/app/register/page.tsx renders RegisterForm', async () => {
    const { default: RegisterPage } = await import('./register/page')
    const html = renderToStaticMarkup(<RegisterPage />)
    expect(html).toContain('data-testid="RegisterForm"')
  })

  it('src/app/forgot-password/page.tsx renders ForgotPasswordForm', async () => {
    const { default: ForgotPasswordPage } = await import('./forgot-password/page')
    const html = renderToStaticMarkup(<ForgotPasswordPage />)
    expect(html).toContain('data-testid="ForgotPasswordForm"')
  })

  it('src/app/reset-password/page.tsx renders ResetPasswordForm', async () => {
    const { default: ResetPasswordPage } = await import('./reset-password/page')
    const html = renderToStaticMarkup(<ResetPasswordPage />)
    expect(html).toContain('data-testid="ResetPasswordForm"')
  })

  it('src/app/verify-email/page.tsx renders VerifyEmailForm', async () => {
    const { default: VerifyEmailPage } = await import('./verify-email/page')
    const html = renderToStaticMarkup(<VerifyEmailPage />)
    expect(html).toContain('data-testid="VerifyEmailForm"')
  })

  it('src/app/search/page.tsx renders SearchView', async () => {
    const { default: SearchPage } = await import('./search/page')
    const html = renderToStaticMarkup(<SearchPage />)
    expect(html).toContain('data-testid="SearchView"')
  })

  it('src/app/checkout/page.tsx renders CheckoutView', async () => {
    const { default: CheckoutPage } = await import('./checkout/page')
    const html = renderToStaticMarkup(<CheckoutPage />)
    expect(html).toContain('data-testid="CheckoutView"')
  })

  it('src/app/my-tickets/page.tsx renders MyTicketsView', async () => {
    const { default: MyTicketsPage } = await import('./my-tickets/page')
    const html = renderToStaticMarkup(<MyTicketsPage />)
    expect(html).toContain('data-testid="MyTicketsView"')
  })

  it('src/app/my-tickets/[id]/page.tsx renders TicketDetailView', async () => {
    const { default: TicketDetailPage } = await import('./my-tickets/[id]/page')
    const html = renderToStaticMarkup(<TicketDetailPage />)
    expect(html).toContain('data-testid="TicketDetailView"')
  })

  it('src/app/notifications/page.tsx renders NotificationsView', async () => {
    const { default: NotificationsPage } = await import('./notifications/page')
    const html = renderToStaticMarkup(<NotificationsPage />)
    expect(html).toContain('data-testid="NotificationsView"')
  })

  it('src/app/profile/page.tsx renders ProfileView', async () => {
    const { default: ProfilePage } = await import('./profile/page')
    const html = renderToStaticMarkup(<ProfilePage />)
    expect(html).toContain('data-testid="ProfileView"')
  })
})

describe('Route entrypoints — layout renders children', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('src/app/checkout/layout.tsx wraps children with RouteGuard', async () => {
    const { default: CheckoutLayout } = await import('./checkout/layout')
    const child = <span data-testid="child-content" />
    const html = renderToStaticMarkup(<CheckoutLayout>{child}</CheckoutLayout>)
    expect(html).toContain('data-testid="RouteGuard"')
    expect(html).toContain('data-testid="child-content"')
  })
})