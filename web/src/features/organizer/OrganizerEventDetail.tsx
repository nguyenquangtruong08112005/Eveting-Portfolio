'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  BarChart3,
  Loader2,
  QrCode,
  Pencil,
  Send,
  Ticket,
  Eye,
  UserCheck,
  Banknote,
  Grid3X3,
  Mail,
  ReceiptText,
  Search,
  ShieldAlert,
  Download,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { OrganizerShell } from '@/components/organizer/OrganizerShell';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AnalyticsSeries } from '@/components/organizer/AnalyticsSeries';
import { AttendeeTable } from '@/components/organizer/AttendeeTable';
import {
  OrganizerBusinessService,
  OrganizerService,
} from '@/features/organizer/api';
import { useOrganizerWorkspace } from '@/features/organizer/OrganizerWorkspace';
import { EventService } from '@/features/events/api';
import { formatPrice } from '@/lib/constants';
import type {
  Event,
  EventAnalytics,
  OrganizerAttendeeRow,
  OrganizerOrder,
} from '@/types';

export function OrganizerEventDetailView() {
  const t = useTranslations('organizer');
  const tSeats = useTranslations('seat_layout_editor');
  const params = useParams();
  const eventId = params?.id as string;
  const { activeTeamId, can } = useOrganizerWorkspace();

  const [event, setEvent] = useState<Event | null>(null);
  const [stats, setStats] = useState<EventAnalytics | null>(null);
  const [businessAnalytics, setBusinessAnalytics] = useState<EventAnalytics | null>(null);
  const [attendees, setAttendees] = useState<OrganizerAttendeeRow[]>([]);
  const [orders, setOrders] = useState<OrganizerOrder[]>([]);
  const [invoiceRequestCount, setInvoiceRequestCount] = useState(0);
  const [ordersError, setOrdersError] = useState('');
  const [analyticsError, setAnalyticsError] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [exportingOrders, setExportingOrders] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const [evRes, stRes, atRes, analyticsRes, ordersRes, invoicesRes] = await Promise.allSettled([
        EventService.getById(eventId),
        OrganizerService.getEventStats(eventId),
        OrganizerService.getAttendees(eventId),
        OrganizerBusinessService.getEventAnalytics(eventId, activeTeamId),
        OrganizerBusinessService.getEventOrders(eventId, { teamId: activeTeamId }),
        OrganizerBusinessService.getInvoiceRequests(eventId),
      ]);
      if (evRes.status === 'fulfilled') setEvent(evRes.value);
      else setEvent(null);
      if (stRes.status === 'fulfilled') setStats(stRes.value || {});
      else setStats({});
      if (atRes.status === 'fulfilled') setAttendees(atRes.value.attendees || []);
      else setAttendees([]);
      if (analyticsRes.status === 'fulfilled') {
        setBusinessAnalytics(analyticsRes.value);
        setAnalyticsError('');
      } else {
        setBusinessAnalytics(null);
        setAnalyticsError(
          analyticsRes.reason instanceof Error
            ? analyticsRes.reason.message
            : String(analyticsRes.reason)
        );
      }
      if (ordersRes.status === 'fulfilled') {
        setOrders(ordersRes.value.orders || []);
        setOrdersError('');
      } else {
        setOrders([]);
        setOrdersError(
          ordersRes.reason instanceof Error
            ? ordersRes.reason.message
            : String(ordersRes.reason)
        );
      }
      setInvoiceRequestCount(invoicesRes.status === 'fulfilled' ? invoicesRes.value.length : 0);
    } finally {
      setLoading(false);
    }
  }, [activeTeamId, eventId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmitDraft = async () => {
    setActionLoading(true);
    try {
      await EventService.submitDraft(eventId);
      toast.success(t('submit_ok'));
      await load();
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message || t('submit_draft_error'));
    } finally {
      setActionLoading(false);
    }
  };

  const status = (event?.lifecycleStatus || event?.status || '').toLowerCase();
  const ticketsSold =
    typeof stats?.ticketsSold === 'number'
      ? stats.ticketsSold
      : stats?.ticketsSold && typeof stats.ticketsSold === 'object'
        ? Object.values(stats.ticketsSold).reduce((s, n) => s + (Number(n) || 0), 0)
        : 0;
  const checkedInCount = attendees.filter(
    (attendee) => attendee.ticket.status?.toUpperCase() === 'CHECKED_IN'
  ).length;
  const checkInRate = attendees.length
    ? Math.round((checkedInCount / attendees.length) * 100)
    : 0;
  const visibleOrders = orders.filter((order) => {
    const query = orderSearch.trim().toLowerCase();
    if (!query) return true;
    return [order.id, order.customerName, order.customerEmail, order.status]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });
  const sendCustomerEmail = async () => {
    if (!emailSubject.trim() || !emailMessage.trim()) return;
    setSendingEmail(true);
    try {
      const response = await OrganizerService.broadcast(
        eventId,
        emailSubject.trim(),
        emailMessage.trim()
      );
      toast.success(`Message queued for ${response.sentTo ?? attendees.length} attendees`);
      setEmailSubject('');
      setEmailMessage('');
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : 'Unable to queue customer email'
      );
    } finally {
      setSendingEmail(false);
    }
  };

  const exportOrders = async () => {
    setExportingOrders(true);
    try {
      await OrganizerBusinessService.downloadOrderExport(eventId);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Unable to export orders');
    } finally {
      setExportingOrders(false);
    }
  };

  return (
    <OrganizerShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 lg:py-10 w-full space-y-6">
        <Link
          href="/organizer/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="size-3.5" />
          {t('back_to_dashboard')}
        </Link>

        {loading ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <Loader2 className="size-10 text-[var(--primary)] animate-spin" />
            <p className="text-sm text-[var(--text-muted)]">{t('loading_event')}</p>
          </div>
        ) : !event ? (
          <EmptyState
            icon={BarChart3}
            title={t('event_not_found')}
            description={t('event_not_found_desc')}
          />
        ) : (
          <>
            <PageHeader
              title={event.name}
              description={status || t('manage_events')}
              icon={<BarChart3 className="size-5" />}
              actions={
                <div className="flex flex-wrap gap-2">
                  <Badge className="capitalize text-[10px] font-bold">{status || '—'}</Badge>
                  <Link
                    href={`/organizer/events/${eventId}/seat-layout`}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--surface-border)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    <Grid3X3 className="size-3.5 text-[var(--primary)]" />
                    {tSeats('open_editor')}
                  </Link>
                  {can('EDIT_EVENT') && (status === 'draft' || status === 'rejected') && (
                    <>
                      <Link
                        href={`/organizer/events/${eventId}/edit`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--surface-border)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      >
                        <Pencil className="size-3.5" />
                        {t('edit_event')}
                      </Link>
                      {status === 'draft' && (
                        <Button
                          size="sm"
                          disabled={actionLoading}
                          onClick={handleSubmitDraft}
                          className="rounded-xl text-xs font-bold btn-primary-gradient text-[var(--on-primary)] border-none"
                        >
                          {actionLoading ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Send className="size-3.5" />
                          )}
                          {t('submit_review')}
                        </Button>
                      )}
                    </>
                  )}
                  {can('SCAN_TICKETS') && (
                    <Link
                      href={`/organizer/check-in?eventId=${encodeURIComponent(eventId)}`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--surface-border)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      <QrCode className="size-3.5 text-[var(--primary)]" />
                      {t('open_check_in')}
                    </Link>
                  )}
                </div>
              }
            />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Kpi
                icon={Banknote}
                label={t('kpi_revenue')}
                value={can('VIEW_REVENUE') ? formatPrice(stats?.totalRevenue ?? 0) : 'Restricted'}
              />
              <Kpi icon={Ticket} label={t('kpi_tickets')} value={String(ticketsSold)} />
              <Kpi
                icon={UserCheck}
                label={t('kpi_checkins')}
                value={String(stats?.checkIns ?? 0)}
              />
              <Kpi icon={Eye} label={t('kpi_views')} value={String(stats?.views ?? 0)} />
            </div>

            {stats?.ticketsSold && typeof stats.ticketsSold === 'object' && (
              <section className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] p-5">
                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">
                  {t('tickets_by_type')}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats.ticketsSold).map(([type, count]) => (
                    <Badge
                      key={type}
                      className="bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20 text-xs font-bold"
                    >
                      {type}: {count}
                    </Badge>
                  ))}
                </div>
              </section>
            )}

            <section className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] p-5">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">
                {t('daily_sales')}
              </h3>
              <AnalyticsSeries data={stats?.dailySales} emptyLabel={t('no_series')} />
            </section>

            <section className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Audience analytics
                  </h3>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Traffic quality, conversion, and acquisition sources.
                  </p>
                </div>
                <BarChart3 className="size-5 text-[var(--primary)]" />
              </div>
              {!can('VIEW_ANALYTICS') ? (
                <PermissionMessage permission="VIEW_ANALYTICS" />
              ) : analyticsError ? (
                <EndpointMessage
                  message={analyticsError}
                  endpoint="GET /api/organizer/events/:eventId/analytics"
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  <Metric
                    label="Unique visitors"
                    value={String(businessAnalytics?.uniqueVisitors ?? 0)}
                  />
                  <Metric
                    label="Purchase conversion"
                    value={`${Number(businessAnalytics?.conversionRate ?? 0).toFixed(1)}%`}
                  />
                  <Metric
                    label="Page views"
                    value={String(businessAnalytics?.views ?? stats?.views ?? 0)}
                  />
                  <div className="md:col-span-3">
                    <p className="mb-2 text-[10px] font-bold uppercase text-[var(--text-muted)]">
                      Traffic sources
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(businessAnalytics?.trafficSources || {}).map(
                        ([source, count]) => (
                          <Badge
                            key={source}
                            className="border border-[var(--surface-border)] bg-[var(--background)] text-xs text-[var(--text-secondary)]"
                          >
                            {source}: {count}
                          </Badge>
                        )
                      )}
                      {Object.keys(businessAnalytics?.trafficSources || {}).length === 0 && (
                        <span className="text-xs text-[var(--text-muted)]">
                          No traffic source data.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] p-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
                    <ReceiptText className="size-4 text-[var(--primary)]" />
                    Orders and invoice requests
                  </h3>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {invoiceRequestCount} order{invoiceRequestCount === 1 ? '' : 's'} requested a
                    red invoice.
                  </p>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-2.5 size-4 text-[var(--text-muted)]" />
                  <Input
                    value={orderSearch}
                    onChange={(inputEvent) => setOrderSearch(inputEvent.target.value)}
                    placeholder="Search order or customer"
                    className="pl-9"
                    disabled={!can('VIEW_ORDERS')}
                  />
                </div>
                {can('EXPORT_ORDER_REPORTS') && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void exportOrders()}
                    disabled={exportingOrders}
                  >
                    {exportingOrders ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                    Export CSV
                  </Button>
                )}
              </div>
              {!can('VIEW_ORDERS') ? (
                <PermissionMessage permission="VIEW_ORDERS" />
              ) : ordersError ? (
                <EndpointMessage
                  message={ordersError}
                  endpoint="GET /api/organizer/events/:eventId/orders"
                />
              ) : visibleOrders.length === 0 ? (
                <p className="py-8 text-center text-xs text-[var(--text-muted)]">
                  No matching orders.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-[var(--surface-border)] text-left text-[10px] font-bold uppercase text-[var(--text-muted)]">
                      <tr>
                        <th className="px-3 py-3">Order</th>
                        <th className="px-3 py-3">Customer</th>
                        <th className="px-3 py-3">Value</th>
                        <th className="px-3 py-3">Payment</th>
                        <th className="px-3 py-3">Status</th>
                        <th className="px-3 py-3">Invoice</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleOrders.map((order) => (
                        <tr key={order.id} className="border-b border-[var(--surface-border)]/60">
                          <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-[var(--text-primary)]">
                            {order.id}
                          </td>
                          <td className="px-3 py-3">
                            <p className="font-semibold text-[var(--text-primary)]">
                              {order.customerName || 'Unknown'}
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">
                              {order.customerEmail}
                            </p>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 font-semibold">
                            {formatPrice(order.totalValue)}
                          </td>
                          <td className="px-3 py-3 text-xs text-[var(--text-secondary)]">
                            {order.paymentMethod || '—'}
                          </td>
                          <td className="px-3 py-3">
                            <Badge>{order.status}</Badge>
                          </td>
                          <td className="px-3 py-3">
                            {order.invoiceRequested ? (
                              <Badge className="bg-[var(--warning)]/10 text-[var(--warning)]">
                                Requested
                              </Badge>
                            ) : (
                              <span className="text-xs text-[var(--text-muted)]">No</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-5 border-t border-[var(--surface-border)] pt-5">
                <h4 className="mb-3 flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                  <Mail className="size-4 text-[var(--primary)]" />
                  Email attendees
                </h4>
                {!can('SEND_CUSTOMER_EMAIL') ? (
                  <PermissionMessage permission="SEND_CUSTOMER_EMAIL" />
                ) : (
                  <div className="grid gap-3 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)_auto]">
                    <Input
                      value={emailSubject}
                      onChange={(inputEvent) => setEmailSubject(inputEvent.target.value)}
                      placeholder="Subject"
                    />
                    <Input
                      value={emailMessage}
                      onChange={(inputEvent) => setEmailMessage(inputEvent.target.value)}
                      placeholder="Message to all event attendees"
                    />
                    <Button
                      type="button"
                      onClick={() => void sendCustomerEmail()}
                      disabled={
                        sendingEmail || !emailSubject.trim() || !emailMessage.trim()
                      }
                    >
                      {sendingEmail ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}
                      Queue email
                    </Button>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Check-in progress
                </h3>
                <span className="text-sm font-black text-[var(--primary)]">{checkInRate}%</span>
              </div>
              {!can('VIEW_CHECKIN_REPORTS') ? (
                <PermissionMessage permission="VIEW_CHECKIN_REPORTS" />
              ) : (
                <>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--background)]">
                    <div
                      className="h-full bg-[var(--success)] transition-[width]"
                      style={{ width: `${checkInRate}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    {checkedInCount} checked in / {attendees.length} sold attendee tickets
                  </p>
                </>
              )}
            </section>

            <section className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] p-5">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">
                {t('attendees_title')} ({attendees.length})
              </h3>
              <AttendeeTable attendees={attendees} />
            </section>
          </>
        )}
      </div>
    </OrganizerShell>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] p-4">
      <div className="flex items-center gap-2 text-[var(--text-muted)] mb-2">
        <Icon className="size-4 text-[var(--primary)]" />
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-lg font-black text-[var(--text-primary)] tabular-nums">{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--background)] p-4">
      <p className="text-[10px] font-bold uppercase text-[var(--text-muted)]">{label}</p>
      <p className="mt-2 text-xl font-black text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

function PermissionMessage({ permission }: { permission: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-[var(--surface-border)] bg-[var(--background)] p-4 text-xs text-[var(--text-muted)]">
      <ShieldAlert className="size-4 shrink-0" />
      {permission} permission is required for this section.
    </div>
  );
}

function EndpointMessage({ message, endpoint }: { message: string; endpoint: string }) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-[var(--warning)]/40 bg-[var(--warning)]/10 p-4"
    >
      <p className="text-xs font-semibold text-[var(--warning)]">{message}</p>
      <p className="mt-1 text-[10px] text-[var(--text-muted)]">Expected: {endpoint}</p>
    </div>
  );
}
