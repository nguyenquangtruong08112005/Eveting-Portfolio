import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { OrganizerFinanceView } from './OrganizerFinance'
import { OrganizerService, OrganizerBusinessService } from '@/features/organizer/api'
import { toast } from 'sonner'

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

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}))

vi.mock('@/features/organizer/OrganizerWorkspace', () => ({
  useOrganizerWorkspace: () => ({
    activeTeamId: 'team_1',
    can: (permission: string) => permission === 'VIEW_REVENUE',
  }),
}))

vi.mock('@/features/organizer/api', () => ({
  OrganizerService: {
    getPayoutSummary: vi.fn(),
    getPayouts: vi.fn(),
    getBankAccount: vi.fn(),
    updateBankAccount: vi.fn(),
  },
  OrganizerBusinessService: {
    getPaymentProfile: vi.fn(),
    updatePaymentProfile: vi.fn(),
  },
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/components/organizer/OrganizerShell', () => ({
  OrganizerShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="shell">{children}</div>
  ),
}))

vi.mock('@/components/shared/EmptyState', () => ({
  EmptyState: ({ title }: { title?: React.ReactNode }) => <div data-testid="empty">{title}</div>,
}))

vi.mock('@/components/shared/PageHeader', () => ({
  PageHeader: ({ title, description }: { title?: React.ReactNode; description?: React.ReactNode }) => (
    <div data-testid="page-header">
      <span data-testid="page-title">{title}</span>
      {description && <span data-testid="page-description">{description}</span>}
    </div>
  ),
}))

const source = readFileSync(new URL('./OrganizerFinance.tsx', import.meta.url), 'utf8')

describe('OrganizerFinanceView — loading state', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the organizer shell, page header and finance title on first load', () => {
    const html = renderToStaticMarkup(<OrganizerFinanceView />)
    expect(html).toContain('data-testid="shell"')
    expect(html).toContain('data-testid="page-header"')
    expect(html).toContain('Tài chính')
    expect(html).toContain('Thanh toán, tài khoản ngân hàng và tổng quan doanh thu.')
  })

  it('shows loading spinners and hides payout rows, empty states and the bank form while loading', () => {
    const html = renderToStaticMarkup(<OrganizerFinanceView />)
    expect((html.match(/animate-spin/g) ?? []).length).toBeGreaterThanOrEqual(2)
    expect(html).not.toContain('Chưa có thanh toán nào.')
    expect(html).not.toContain('Chưa đăng ký tài khoản ngân hàng.')
    expect(html).not.toContain('Trạng thái')
    expect(html).not.toContain('data-testid="empty"')
  })

  it('renders the four summary cards with zeroed defaults while loading', () => {
    const html = renderToStaticMarkup(<OrganizerFinanceView />)
    for (const label of ['Có thể thanh toán', 'Chờ phê duyệt', 'Đang xử lý', 'Đã hoàn tất']) {
      expect(html).toContain(label)
    }
    expect((html.match(/0 ₫/g) ?? []).length).toBeGreaterThanOrEqual(4)
    expect(source).toMatch(/useState<PayoutSummary>\(safeSummary\(null\)\)/)
  })

  it('defers every finance fetch to a post-mount effect (no API calls during render)', () => {
    const html = renderToStaticMarkup(<OrganizerFinanceView />)
    expect(html).toBeTruthy()
    expect(OrganizerService.getPayoutSummary).not.toHaveBeenCalled()
    expect(OrganizerService.getPayouts).not.toHaveBeenCalled()
    expect(OrganizerService.getBankAccount).not.toHaveBeenCalled()
    expect(OrganizerBusinessService.getPaymentProfile).not.toHaveBeenCalled()
    expect(source).toMatch(/if \(!isAuthenticated\) return;\r?\n\s+loadData\(page\);/)
    expect(source).toMatch(/\[isAuthenticated, loadData, page\]\);/)
  })
})

describe('OrganizerFinanceView — finance summary and payout history success', () => {
  it('fetches summary, payouts, bank and payment profile together via allSettled', () => {
    expect(source).toMatch(
      /const \[summaryRes, payoutsRes, bankRes, profileRes\] = await Promise\.allSettled\(\[\r?\n\s+OrganizerService\.getPayoutSummary\(\),\r?\n\s+OrganizerService\.getPayouts\(targetPage, PAYOUTS_PER_PAGE\),\r?\n\s+OrganizerService\.getBankAccount\(\),\r?\n\s+OrganizerBusinessService\.getPaymentProfile\(activeTeamId\),\r?\n\s+\]\);/
    )
  })

  it('hydrates the summary into the cards and pagination totals on success', () => {
    expect(source).toContain('setSummary(safeSummary(summaryRes.value))')
    expect(source).toContain('setPayouts(payoutsRes.value.payouts ?? [])')
    expect(source).toContain('setTotalPayouts(payoutsRes.value.total ?? 0)')
  })

  it('normalizes partial or null summary values to safe numbers', () => {
    expect(source).toMatch(/Number\(raw\?\.eligibleNetAmount \?\? 0\) \|\| 0,/)
    expect(source).toMatch(/nextScheduledPayoutAt: raw\?\.nextScheduledPayoutAt \?\? null,/)
  })

  it('renders one payout row per entry with status, amount, date and completed date', () => {
    expect(source).toContain('payouts.map((payout) => {')
    expect(source).toContain('formatMoney(payout.amount)')
    expect(source).toContain('formatDate(new Date(payout.createdAt))')
    expect(source).toContain("payout.completedAt ? formatDate(new Date(payout.completedAt)) : '—'")
  })

  it('falls back unknown payout statuses to the admin-approval label', () => {
    expect(source).toMatch(/statusConfig\[payout\.status\?\.toLowerCase\(\)\] \|\| STATUS_FALLBACK;/)
  })

  it('shows the next-scheduled-payout card only when a date is present', () => {
    expect(source).toMatch(/summary\.nextScheduledPayoutAt && \(/)
  })
})

describe('OrganizerFinanceView — safe inline failed-load state', () => {
  it('collects per-section failures without blocking the other sections', () => {
    expect(source).toMatch(/summaryRes\.status === 'fulfilled' && summaryRes\.value/)
    expect(source).toMatch(/newErrors\.summary = msg;/)
    expect(source).toMatch(/newErrors\.payouts = msg;/)
    expect(source).toMatch(/newErrors\.bankAccount = msg;/)
  })

  it('renders an inline error only when a section message exists', () => {
    expect(source).toMatch(
      /function renderInlineError\(section: ErrorSection\) \{\r?\n\s+const msg = loadErrors\[section\];\r?\n\s+if \(!msg\) return null;/
    )
    expect(source).toMatch(/\{t\(errorSectionKeys\[section\]\)\} \{msg\}/)
  })

  it('surfaces a payment-profile load failure in the profile alert instead of a toast', () => {
    expect(source).toContain('setPaymentProfileError(')
    expect(source).toMatch(/\{paymentProfileError && \(/)
  })

  it('adds the endpoint-unavailable hint only when the message names it', () => {
    expect(source).toContain("paymentProfileError.includes('endpoint unavailable')")
    expect(source).toContain('GET/PUT /api/organizer/payment-profile')
  })
})

describe('OrganizerFinanceView — mock bank/tax form validation', () => {
  it('requires account number, account holder and bank name before saving', () => {
    expect(source).toMatch(
      /if \(!bankForm\.accountNumber \|\| !bankForm\.accountHolder \|\| !bankForm\.bankName\) \{\r?\n\s+toast\.error\(t\('finance_account_number'\)\);\r?\n\s+return;\r?\n\s+\}/
    )
  })

  it('does not call the API when bank fields are missing', () => {
    const guardIndex = source.indexOf('if (!bankForm.accountNumber')
    const apiIndex = source.indexOf('OrganizerService.updateBankAccount(bankForm)')
    expect(guardIndex).toBeGreaterThan(-1)
    expect(apiIndex).toBeGreaterThan(guardIndex)
  })

  it('closes the form, resets it and confirms success after a save', () => {
    expect(source).toContain('const result = await OrganizerService.updateBankAccount(bankForm)')
    expect(source).toContain('setBankAccount(result)')
    expect(source).toContain('setShowBankForm(false)')
    expect(source).toContain("setBankForm({ accountNumber: '', accountHolder: '', bankName: '' })")
    expect(source).toContain("toast.success(t('finance_saved'))")
  })

  it('surfaces bank-save failures both inline and in a toast', () => {
    expect(source).toContain('const msg = err.message || t(\'finance_saved\')')
    expect(source).toContain('setLoadErrors((prev) => ({ ...prev, bankAccount: msg }))')
    expect(source).toContain('toast.error(msg)')
  })
})

describe('OrganizerFinanceView — successful verification/profile submission', () => {
  it('blocks profile submission without VIEW_REVENUE permission', () => {
    expect(source).toMatch(
      /if \(!can\('VIEW_REVENUE'\)\) \{\r?\n\s+toast\.error\('VIEW_REVENUE permission required'\);\r?\n\s+return;\r?\n\s+\}/
    )
  })

  it('requires legal name, business type and registered address', () => {
    expect(source).toContain('!paymentProfile.fullName?.trim() ||')
    expect(source).toContain("toast.error('Legal name, business type, and registered address are required')")
  })

  it('submits the profile and confirms verification submission on success', () => {
    expect(source).toContain('const saved = await OrganizerBusinessService.updatePaymentProfile(')
    expect(source).toContain('setPaymentProfile(saved)')
    expect(source).toContain("toast.success('Payment and tax profile submitted for verification')")
  })

  it('toggles the saving flag around the profile save', () => {
    expect(source).toContain('setSavingProfile(true)')
    expect(source).toMatch(/finally \{\r?\n\s+setSavingProfile\(false\);/)
  })

  it('surfaces profile-save errors in the alert and toast', () => {
    expect(source).toMatch(/caught instanceof Error \? caught\.message : 'Unable to save payment profile'/)
    expect(source).toContain('setPaymentProfileError(message)')
    expect(source).toContain('toast.error(message)')
  })

  it('shows the re-KYC warning only for already-verified profiles', () => {
    expect(source).toMatch(/paymentProfile\.verificationStatus === 'VERIFIED' && \(/)
  })
})

describe('OrganizerFinanceView — payout eligibility display', () => {
  it('lists the eligible-amount card first', () => {
    expect(source).toMatch(
      /key: 'eligibleNetAmount' as const, labelKey: 'finance_eligible', icon: Banknote, token: '--success'/
    )
  })

  it('enables the verification submit only for revenue-visible organizers', () => {
    expect(source).toContain("disabled={savingProfile || !can('VIEW_REVENUE')}")
    expect(source).toContain("title={!can('VIEW_REVENUE') ? 'VIEW_REVENUE permission required' : undefined}")
  })

  it('disables pagination controls at the page edges', () => {
    expect(source).toContain('disabled={page <= 1}')
    expect(source).toContain('disabled={page >= totalPages}')
  })

  it('shows a page indicator only when more than one page exists', () => {
    expect(source).toContain('const totalPages = Math.max(1, Math.ceil(totalPayouts / PAYOUTS_PER_PAGE))')
    expect(source).toMatch(/totalPages > 1 && \(/)
    expect(source).toContain("t('payout_page', { page: `${page} / ${totalPages}` })")
  })

  it('shows the empty payout state and bank registration prompts when data is empty', () => {
    expect(source).toMatch(/payouts\.length === 0 \? \(/)
    expect(source).toMatch(/<EmptyState\r?\n\s+title=\{t\('finance_no_payouts'\)\}/)
    expect(source).toContain('t(\'finance_not_registered\')')
    expect(source).toContain('t(\'finance_register\')')
  })

  it('renders a masked bank display with an update action once registered', () => {
    expect(source).toContain('bankAccount?.registered && !showBankForm && (')
    expect(source).toContain('{bankAccount.maskedDisplay}')
    expect(source).toContain("t('finance_update')")
  })
})

describe('OrganizerFinanceView — errors only after user interaction', () => {
  it('shows no toast and no inline error on first load', () => {
    renderToStaticMarkup(<OrganizerFinanceView />)
    expect(toast.error).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
    const html = renderToStaticMarkup(<OrganizerFinanceView />)
    expect(html).not.toContain('Không thể tải')
    expect(html).not.toContain('VIEW_REVENUE permission required')
    expect(html).not.toContain('Legal name, business type, and registered address are required')
  })

  it('raises bank validation errors only from the save handler', () => {
    const handler = source.indexOf('const handleSaveBank = async () => {')
    const validation = source.indexOf("toast.error(t('finance_account_number'))")
    expect(handler).toBeGreaterThan(-1)
    expect(validation).toBeGreaterThan(handler)
  })

  it('raises profile validation errors only from the submit handler', () => {
    const handler = source.indexOf('const handleSavePaymentProfile = async () => {')
    const validation = source.indexOf("toast.error('Legal name, business type, and registered address are required')")
    expect(handler).toBeGreaterThan(-1)
    expect(validation).toBeGreaterThan(handler)
  })
})

describe('OrganizerFinanceView — CSV/download action', () => {
  it('exposes no CSV or browser download action in the finance view', () => {
    expect(source).not.toMatch(/createObjectURL|\.download|\.csv|order_export/i)
  })
})
