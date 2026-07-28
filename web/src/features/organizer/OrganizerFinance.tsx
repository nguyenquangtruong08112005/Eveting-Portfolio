'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Wallet,
  Loader2,
  AlertCircle,
  Banknote,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Building2,
  Plus,
  ArrowUpFromLine,
  SendHorizonal,
  AlertTriangle,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { OrganizerShell } from '@/components/organizer/OrganizerShell';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import {
  OrganizerBusinessService,
  OrganizerService,
} from '@/features/organizer/api';
import { useOrganizerWorkspace } from '@/features/organizer/OrganizerWorkspace';
import { formatMoney, formatDate } from '@/lib/constants';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import type {
  BankAccountInfo,
  BankAccountUpdateBody,
  OrganizerPaymentProfile,
  Payout,
  PayoutSummary,
} from '@/types';

const PAYOUTS_PER_PAGE = 10;

const summaryCards = [
  { key: 'eligibleNetAmount' as const, labelKey: 'finance_eligible', icon: Banknote, token: '--success' },
  { key: 'pendingApprovalAmount' as const, labelKey: 'finance_pending_approval', icon: Clock, token: '--warning' },
  { key: 'processingAmount' as const, labelKey: 'finance_processing', icon: Loader2, token: '--primary' },
  { key: 'completedAmount' as const, labelKey: 'finance_completed_payouts', icon: CheckCircle2, token: '--accent-brand' },
];

const statusConfig: Record<string, { labelKey: string; icon: typeof Clock; color: string }> = {
  pending_admin_approval: { labelKey: 'payout_status_pending_admin_approval', icon: Clock, color: 'var(--warning)' },
  pending_provider_submission: { labelKey: 'payout_status_pending_provider_submission', icon: SendHorizonal, color: 'var(--primary)' },
  submitting: { labelKey: 'payout_status_submitting', icon: ArrowUpFromLine, color: 'var(--accent-brand)' },
  processing: { labelKey: 'payout_status_processing', icon: Loader2, color: 'var(--primary)' },
  completed: { labelKey: 'payout_status_completed', icon: CheckCircle2, color: 'var(--success)' },
  failed: { labelKey: 'payout_status_failed', icon: XCircle, color: 'var(--error)' },
};

const STATUS_FALLBACK = statusConfig.pending_admin_approval;

function safeSummary(raw: Partial<PayoutSummary> | null | undefined): PayoutSummary {
  return {
    eligibleNetAmount: Number(raw?.eligibleNetAmount ?? 0) || 0,
    pendingApprovalAmount: Number(raw?.pendingApprovalAmount ?? 0) || 0,
    processingAmount: Number(raw?.processingAmount ?? 0) || 0,
    completedAmount: Number(raw?.completedAmount ?? 0) || 0,
    nextScheduledPayoutAt: raw?.nextScheduledPayoutAt ?? null,
  };
}

type ErrorSection = 'summary' | 'payouts' | 'bankAccount';

export function OrganizerFinanceView() {
  const t = useTranslations('organizer');
  const { isAuthenticated } = useAuth();
  const { activeTeamId, can } = useOrganizerWorkspace();

  const [summary, setSummary] = useState<PayoutSummary>(safeSummary(null));
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [totalPayouts, setTotalPayouts] = useState(0);
  const [page, setPage] = useState(1);
  const [bankAccount, setBankAccount] = useState<BankAccountInfo | null>(null);
  const [showBankForm, setShowBankForm] = useState(false);
  const [bankForm, setBankForm] = useState<BankAccountUpdateBody>({
    accountNumber: '',
    accountHolder: '',
    bankName: '',
  });
  const [savingBank, setSavingBank] = useState(false);
  const [paymentProfile, setPaymentProfile] = useState<OrganizerPaymentProfile>({
    businessType: 'individual',
    redInvoiceEnabled: false,
    verificationStatus: 'UNSUBMITTED',
  });
  const [paymentProfileError, setPaymentProfileError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadErrors, setLoadErrors] = useState<Partial<Record<ErrorSection, string>>>({});

  const loadData = useCallback(async (targetPage: number) => {
    setLoading(true);
    setLoadErrors({});
    try {
      const [summaryRes, payoutsRes, bankRes, profileRes] = await Promise.allSettled([
        OrganizerService.getPayoutSummary(),
        OrganizerService.getPayouts(targetPage, PAYOUTS_PER_PAGE),
        OrganizerService.getBankAccount(),
        OrganizerBusinessService.getPaymentProfile(activeTeamId),
      ]);

      const newErrors: Partial<Record<ErrorSection, string>> = {};

      if (summaryRes.status === 'fulfilled' && summaryRes.value) {
        setSummary(safeSummary(summaryRes.value));
      } else if (summaryRes.status === 'rejected') {
        const msg = summaryRes.reason instanceof Error ? summaryRes.reason.message : String(summaryRes.reason);
        newErrors.summary = msg;
      }

      if (payoutsRes.status === 'fulfilled' && payoutsRes.value) {
        setPayouts(payoutsRes.value.payouts ?? []);
        setTotalPayouts(payoutsRes.value.total ?? 0);
      } else if (payoutsRes.status === 'rejected') {
        const msg = payoutsRes.reason instanceof Error ? payoutsRes.reason.message : String(payoutsRes.reason);
        newErrors.payouts = msg;
      }

      if (bankRes.status === 'fulfilled' && bankRes.value) {
        setBankAccount(bankRes.value);
      } else if (bankRes.status === 'rejected') {
        const msg = bankRes.reason instanceof Error ? bankRes.reason.message : String(bankRes.reason);
        newErrors.bankAccount = msg;
      }

      if (profileRes.status === 'fulfilled' && profileRes.value) {
        setPaymentProfile(profileRes.value);
        setPaymentProfileError('');
      } else if (profileRes.status === 'rejected') {
        setPaymentProfileError(
          profileRes.reason instanceof Error
            ? profileRes.reason.message
            : String(profileRes.reason)
        );
      }

      setLoadErrors(newErrors);
    } catch (error) {
      console.error('Error loading finance data:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTeamId]);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadData(page);
  }, [isAuthenticated, loadData, page]);

  const totalPages = Math.max(1, Math.ceil(totalPayouts / PAYOUTS_PER_PAGE));

  const handlePrevPage = () => {
    if (page > 1) setPage((p) => p - 1);
  };

  const handleNextPage = () => {
    if (page < totalPages) setPage((p) => p + 1);
  };

  const handleSaveBank = async () => {
    if (!bankForm.accountNumber || !bankForm.accountHolder || !bankForm.bankName) {
      toast.error(t('finance_account_number'));
      return;
    }
    setSavingBank(true);
    try {
      const result = await OrganizerService.updateBankAccount(bankForm);
      setBankAccount(result);
      setShowBankForm(false);
      setBankForm({ accountNumber: '', accountHolder: '', bankName: '' });
      toast.success(t('finance_saved'));
    } catch (err: any) {
      const msg = err.message || t('finance_saved');
      setLoadErrors((prev) => ({ ...prev, bankAccount: msg }));
      toast.error(msg);
    } finally {
      setSavingBank(false);
    }
  };

  const handleSavePaymentProfile = async () => {
    if (!can('VIEW_REVENUE')) {
      toast.error('VIEW_REVENUE permission required');
      return;
    }
    if (
      !paymentProfile.fullName?.trim() ||
      !paymentProfile.businessType ||
      !paymentProfile.address?.trim()
    ) {
      toast.error('Legal name, business type, and registered address are required');
      return;
    }
    setSavingProfile(true);
    setPaymentProfileError('');
    try {
      const saved = await OrganizerBusinessService.updatePaymentProfile(
        paymentProfile,
        activeTeamId
      );
      setPaymentProfile(saved);
      toast.success('Payment and tax profile submitted for verification');
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : 'Unable to save payment profile';
      setPaymentProfileError(message);
      toast.error(message);
    } finally {
      setSavingProfile(false);
    }
  };

  const errorSectionKeys: Record<ErrorSection, string> = {
    summary: 'finance_summary_error',
    payouts: 'finance_payouts_error',
    bankAccount: 'finance_bank_error',
  };

  function renderInlineError(section: ErrorSection) {
    const msg = loadErrors[section];
    if (!msg) return null;
    return (
      <p className="flex items-center gap-1.5 text-[11px] text-[var(--error)] mt-2">
        <AlertCircle className="size-3.5 shrink-0" />
        <span>{t(errorSectionKeys[section])} {msg}</span>
      </p>
    );
  }

  const body = (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 lg:py-10 w-full flex-grow">
      <PageHeader
        title={t('finance_title')}
        description={t('finance_subtitle')}
        icon={<Wallet className="size-5" />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {summaryCards.map(({ key, labelKey, icon: Icon, token }) => {
          const value = summary[key];
          return (
            <div
              key={key}
              className="bg-[var(--surface)] border border-[var(--surface-border)] p-5 rounded-2xl flex items-start gap-4 hover:border-[var(--primary)]/20 transition-all"
            >
              <div
                className="size-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: `color-mix(in srgb, var(${token}) 12%, transparent)` }}
              >
                <Icon className="size-5" style={{ color: `var(${token})` }} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider mb-1">
                  {t(labelKey)}
                </p>
                <p
                  className="text-xl font-black truncate"
                  style={{ color: `var(${token})` }}
                  title={formatMoney(value)}
                >
                  {formatMoney(value)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {renderInlineError('summary')}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <section className="lg:col-span-2 bg-[var(--surface)] border border-[var(--surface-border)] p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
              <Banknote className="size-4 text-[var(--primary)]" />
              {t('finance_payout_history')}
            </h3>
          </div>

          {renderInlineError('payouts')}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="size-8 text-[var(--primary)] animate-spin" />
            </div>
          ) : payouts.length === 0 ? (
            <EmptyState
              title={t('finance_no_payouts')}
              className="border-none bg-transparent py-8"
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--surface-border)] text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">
                      <th className="text-left pb-3 pr-4">{t('payout_col_status')}</th>
                      <th className="text-right pb-3 pr-4">{t('payout_col_amount')}</th>
                      <th className="text-left pb-3 pr-4">{t('payout_col_date')}</th>
                      <th className="text-left pb-3">{t('payout_col_completed')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map((payout) => {
                      const cfg = statusConfig[payout.status?.toLowerCase()] || STATUS_FALLBACK;
                      const StatusIcon = cfg.icon;
                      return (
                        <tr
                          key={payout.id}
                          className="border-b border-[var(--surface-border)]/50 hover:bg-[var(--background)]/40 transition-colors"
                        >
                          <td className="py-3.5 pr-4">
                            <span className="flex items-center gap-1.5 text-xs font-semibold">
                              <StatusIcon className="size-3.5" style={{ color: cfg.color }} />
                              <span style={{ color: cfg.color }}>{t(cfg.labelKey)}</span>
                            </span>
                          </td>
                          <td className="py-3.5 pr-4 text-right font-bold text-[var(--text-primary)]">
                            {formatMoney(payout.amount)}
                          </td>
                          <td className="py-3.5 pr-4 text-xs text-[var(--text-secondary)] whitespace-nowrap">
                            {formatDate(new Date(payout.createdAt))}
                          </td>
                          <td className="py-3.5 text-xs text-[var(--text-muted)] whitespace-nowrap">
                            {payout.completedAt ? formatDate(new Date(payout.completedAt)) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-[var(--surface-border)] mt-4">
                  <p className="text-[11px] text-[var(--text-muted)] font-medium">
                    {t('payout_page', { page: `${page} / ${totalPages}` })}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handlePrevPage}
                      disabled={page <= 1}
                      aria-label={t('payout_prev')}
                      className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <button
                      onClick={handleNextPage}
                      disabled={page >= totalPages}
                      aria-label={t('payout_next')}
                      className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        <div className="space-y-6">
          {summary.nextScheduledPayoutAt && (
            <section className="bg-[var(--surface)] border border-[var(--surface-border)] p-5 rounded-2xl">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="size-4 text-[var(--primary)]" />
                <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
                  {t('finance_next_payout')}
                </h3>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                {formatDate(new Date(summary.nextScheduledPayoutAt))}
              </p>
            </section>
          )}

          <section className="bg-[var(--surface)] border border-[var(--surface-border)] p-5 rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Building2 className="size-4 text-[var(--primary)]" />
                <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
                  {t('finance_bank_account')}
                </h3>
              </div>
              {bankAccount?.registered && !showBankForm && (
                <button
                  onClick={() => setShowBankForm(true)}
                  className="text-[10px] font-bold text-[var(--primary)] hover:underline cursor-pointer"
                >
                  {t('finance_update')}
                </button>
              )}
            </div>

            {renderInlineError('bankAccount')}

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-6 text-[var(--primary)] animate-spin" />
              </div>
            ) : bankAccount?.registered && !showBankForm ? (
              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-[var(--background)]/60 border border-[var(--surface-border)]">
                  <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider mb-1">
                    {t('finance_masked')}
                  </p>
                  <p className="text-sm font-mono font-bold text-[var(--text-primary)] tracking-wider">
                    {bankAccount.maskedDisplay}
                  </p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                  {bankAccount.createdAt && (
                    <span>
                      {t('finance_registered_at')}: {formatDate(new Date(bankAccount.createdAt))}
                    </span>
                  )}
                  {bankAccount.updatedAt && bankAccount.updatedAt !== bankAccount.createdAt && (
                    <span>
                      {t('finance_updated_at')}: {formatDate(new Date(bankAccount.updatedAt))}
                    </span>
                  )}
                </div>
              </div>
            ) : showBankForm ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                    {t('finance_bank_name')}
                  </label>
                  <input
                    type="text"
                    value={bankForm.bankName}
                    onChange={(e) => setBankForm((f) => ({ ...f, bankName: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--surface-border)] text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] transition-colors placeholder:text-[var(--text-muted)]"
                    placeholder="e.g. Vietcombank"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                    {t('finance_account_holder')}
                  </label>
                  <input
                    type="text"
                    value={bankForm.accountHolder}
                    onChange={(e) => setBankForm((f) => ({ ...f, accountHolder: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--surface-border)] text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] transition-colors placeholder:text-[var(--text-muted)]"
                    placeholder="NGUYEN VAN A"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                    {t('finance_account_number')}
                  </label>
                  <input
                    type="text"
                    value={bankForm.accountNumber}
                    onChange={(e) => setBankForm((f) => ({ ...f, accountNumber: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--surface-border)] text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] transition-colors placeholder:text-[var(--text-muted)]"
                    placeholder="1234567890"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleSaveBank}
                    disabled={savingBank}
                    className="flex-1 px-3 py-2 rounded-xl btn-primary-gradient font-bold text-xs btn-tactile text-[var(--on-primary)] border-none cursor-pointer disabled:opacity-50"
                  >
                    {savingBank ? t('finance_saving') : t('finance_save')}
                  </button>
                  <button
                    onClick={() => {
                      setShowBankForm(false);
                      setBankForm({ accountNumber: '', accountHolder: '', bankName: '' });
                    }}
                    disabled={savingBank}
                    className="px-3 py-2 rounded-xl border border-[var(--surface-border)] text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                  >
                    {t('finance_cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-3">
                  {t('finance_not_registered')}
                </p>
                <button
                  onClick={() => setShowBankForm(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl btn-primary-gradient font-bold text-xs btn-tactile text-[var(--on-primary)] border-none cursor-pointer"
                >
                  <Plus className="size-3.5" />
                  {t('finance_register')}
                </button>
              </div>
            )}
          </section>
        </div>
      </div>

      <section className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] p-5 sm:p-6">
        <div className="mb-5 flex flex-col gap-3 border-b border-[var(--surface-border)] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
              <FileText className="size-4 text-[var(--primary)]" />
              Bank, tax, and red invoice profile
            </h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Legal details are used for payout verification and buyer invoice requests.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 self-start rounded-lg border border-[var(--surface-border)] bg-[var(--background)] px-2.5 py-1.5 text-[10px] font-bold text-[var(--text-secondary)]">
            <ShieldCheck className="size-3.5 text-[var(--primary)]" />
            {paymentProfile.verificationStatus || 'UNSUBMITTED'}
          </span>
        </div>

        {paymentProfile.verificationStatus === 'VERIFIED' && (
          <div role="alert" className="mb-5 flex items-start gap-3 rounded-lg border border-[var(--warning)]/40 bg-[var(--warning)]/10 p-4 text-xs text-[var(--warning)]">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            Changing verified bank, tax, or legal details will trigger re-KYC review and may
            pause scheduled payouts until verification completes.
          </div>
        )}

        {paymentProfileError && (
          <div role="alert" className="mb-5 rounded-lg border border-[var(--error)]/30 bg-[var(--error)]/10 p-4">
            <p className="text-xs font-semibold text-[var(--error)]">{paymentProfileError}</p>
            {paymentProfileError.includes('endpoint unavailable') && (
              <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                Expected: GET/PUT /api/organizer/payment-profile
              </p>
            )}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase text-[var(--text-muted)]">
              Account holder / legal name
            </label>
            <input
              value={paymentProfile.fullName || ''}
              onChange={(event) =>
                setPaymentProfile((current) => ({
                  ...current,
                  fullName: event.target.value,
                }))
              }
              className="h-10 w-full rounded-lg border border-[var(--surface-border)] bg-[var(--background)] px-3 text-sm text-[var(--text-primary)]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase text-[var(--text-muted)]">
              Bank name
            </label>
            <input
              value={paymentProfile.bankName || ''}
              onChange={(event) =>
                setPaymentProfile((current) => ({
                  ...current,
                  bankName: event.target.value,
                }))
              }
              list="vietnam-banks"
              className="h-10 w-full rounded-lg border border-[var(--surface-border)] bg-[var(--background)] px-3 text-sm text-[var(--text-primary)]"
            />
            <datalist id="vietnam-banks">
              <option value="Vietcombank" />
              <option value="Techcombank" />
              <option value="BIDV" />
              <option value="MBBank" />
              <option value="VietinBank" />
              <option value="VPBank" />
            </datalist>
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase text-[var(--text-muted)]">
              Bank branch
            </label>
            <input
              value={paymentProfile.bankBranch || ''}
              onChange={(event) =>
                setPaymentProfile((current) => ({
                  ...current,
                  bankBranch: event.target.value,
                }))
              }
              className="h-10 w-full rounded-lg border border-[var(--surface-border)] bg-[var(--background)] px-3 text-sm text-[var(--text-primary)]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase text-[var(--text-muted)]">
              Business type
            </label>
            <select
              value={paymentProfile.businessType || 'individual'}
              onChange={(event) =>
                setPaymentProfile((current) => ({
                  ...current,
                  businessType: event.target.value as OrganizerPaymentProfile['businessType'],
                }))
              }
              className="h-10 w-full rounded-lg border border-[var(--surface-border)] bg-[var(--background)] px-3 text-sm text-[var(--text-primary)]"
            >
              <option value="individual">Individual</option>
              <option value="company">Company</option>
              <option value="household">Household business</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase text-[var(--text-muted)]">
              Tax identification number
            </label>
            <input
              value={paymentProfile.taxNumber || ''}
              onChange={(event) =>
                setPaymentProfile((current) => ({
                  ...current,
                  taxNumber: event.target.value,
                }))
              }
              className="h-10 w-full rounded-lg border border-[var(--surface-border)] bg-[var(--background)] px-3 text-sm text-[var(--text-primary)]"
            />
          </div>
          <label className="flex items-center gap-3 self-end rounded-lg border border-[var(--surface-border)] bg-[var(--background)] px-3 py-2.5 text-xs font-semibold text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={!!paymentProfile.redInvoiceEnabled}
              onChange={(event) =>
                setPaymentProfile((current) => ({
                  ...current,
                  redInvoiceEnabled: event.target.checked,
                }))
              }
            />
            Accept red invoice requests
          </label>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="mb-1.5 block text-[10px] font-bold uppercase text-[var(--text-muted)]">
              Registered business address
            </label>
            <textarea
              rows={3}
              value={paymentProfile.address || ''}
              onChange={(event) =>
                setPaymentProfile((current) => ({
                  ...current,
                  address: event.target.value,
                }))
              }
              className="w-full resize-y rounded-lg border border-[var(--surface-border)] bg-[var(--background)] p-3 text-sm text-[var(--text-primary)]"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => void handleSavePaymentProfile()}
            disabled={savingProfile || !can('VIEW_REVENUE')}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-xs font-bold text-[var(--on-primary)] disabled:cursor-not-allowed disabled:opacity-50"
            title={!can('VIEW_REVENUE') ? 'VIEW_REVENUE permission required' : undefined}
          >
            {savingProfile && <Loader2 className="size-3.5 animate-spin" />}
            Submit for verification
          </button>
        </div>
      </section>
    </div>
  );

  return (
    <OrganizerShell>
      {body}
    </OrganizerShell>
  );
}
