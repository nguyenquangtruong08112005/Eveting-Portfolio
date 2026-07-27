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
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { OrganizerService } from '@/features/organizer/api';
import { ORG_NAV } from '@/features/organizer/nav';
import { formatMoney, formatDate } from '@/lib/constants';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import type { PayoutSummary, Payout, BankAccountInfo, BankAccountUpdateBody } from '@/types';

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
  const tCommon = useTranslations('common');
  const { isAuthenticated } = useAuth();

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

  const [loading, setLoading] = useState(true);
  const [loadErrors, setLoadErrors] = useState<Partial<Record<ErrorSection, string>>>({});

  const loadData = useCallback(async (targetPage: number) => {
    setLoading(true);
    setLoadErrors({});
    try {
      const [summaryRes, payoutsRes, bankRes] = await Promise.allSettled([
        OrganizerService.getPayoutSummary(),
        OrganizerService.getPayouts(targetPage, PAYOUTS_PER_PAGE),
        OrganizerService.getBankAccount(),
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

      setLoadErrors(newErrors);
    } catch (error) {
      console.error('Error loading finance data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

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
    </div>
  );

  return (
    <AppShell variant="organizer" items={ORG_NAV} heading={tCommon('org_badge')}>
      {body}
    </AppShell>
  );
}
