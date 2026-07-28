'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, MailPlus, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { toast } from 'sonner';
import { OrganizerShell } from '@/components/organizer/OrganizerShell';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  OrganizerBusinessService,
} from '@/features/organizer/api';
import { useOrganizerWorkspace } from '@/features/organizer/OrganizerWorkspace';
import type {
  OrganizerPermission,
  OrganizerTeamMember,
  OrganizerTeamRole,
} from '@/types';

const PERMISSIONS: Array<{ value: OrganizerPermission; label: string }> = [
  { value: 'SCAN_TICKETS', label: 'Scan tickets' },
  { value: 'VIEW_CHECKIN_REPORTS', label: 'View check-in reports' },
  { value: 'MANAGE_TEAM', label: 'Manage team' },
  { value: 'MANAGE_SEATMAP', label: 'Manage seat map' },
  { value: 'VIEW_ORDERS', label: 'View orders' },
  { value: 'SEND_CUSTOMER_EMAIL', label: 'Send customer email' },
  { value: 'EXPORT_ORDER_REPORTS', label: 'Export order reports' },
  { value: 'VIEW_REVENUE', label: 'View revenue' },
  { value: 'VIEW_ANALYTICS', label: 'View analytics' },
  { value: 'MARKETING_OPERATIONS', label: 'Marketing operations' },
  { value: 'MANAGE_VOUCHERS', label: 'Manage vouchers' },
  { value: 'EDIT_EVENT', label: 'Edit event' },
];

const ROLE_DEFAULTS: Record<OrganizerTeamRole, OrganizerPermission[]> = {
  ADMIN: PERMISSIONS.map(({ value }) => value),
  MANAGER: [
    'VIEW_CHECKIN_REPORTS',
    'VIEW_ORDERS',
    'SEND_CUSTOMER_EMAIL',
    'EXPORT_ORDER_REPORTS',
    'VIEW_REVENUE',
    'VIEW_ANALYTICS',
    'MARKETING_OPERATIONS',
    'MANAGE_VOUCHERS',
    'EDIT_EVENT',
  ],
  CHECK_IN_STAFF: ['SCAN_TICKETS', 'VIEW_CHECKIN_REPORTS'],
};

export function TeamManagementView() {
  const {
    activeTeam,
    activeTeamId,
    endpointAvailable,
    can,
  } = useOrganizerWorkspace();
  const [members, setMembers] = useState<OrganizerTeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrganizerTeamRole>('MANAGER');
  const [permissions, setPermissions] = useState<OrganizerPermission[]>(
    ROLE_DEFAULTS.MANAGER
  );
  const [saving, setSaving] = useState(false);

  const manageable = can('MANAGE_TEAM');

  const loadMembers = useCallback(async () => {
    if (!activeTeamId) {
      setMembers([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      setMembers(await OrganizerBusinessService.getTeamMembers(activeTeamId));
    } catch (caught) {
      setMembers([]);
      setError(caught instanceof Error ? caught.message : 'Unable to load team members');
    } finally {
      setLoading(false);
    }
  }, [activeTeamId]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const roleDescription = useMemo(() => {
    if (role === 'ADMIN') return 'Full team, financial, event, and operational control.';
    if (role === 'CHECK_IN_STAFF') {
      return 'Keep this role limited to scanning and assigned check-in reports.';
    }
    return 'Operational access controlled by the selected permissions.';
  }, [role]);

  const selectRole = (nextRole: OrganizerTeamRole) => {
    setRole(nextRole);
    setPermissions(ROLE_DEFAULTS[nextRole]);
  };

  const togglePermission = (permission: OrganizerPermission) => {
    if (role === 'ADMIN') return;
    setPermissions((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission]
    );
  };

  const invite = async () => {
    if (!activeTeamId || !email.trim()) return;
    setSaving(true);
    try {
      const member = await OrganizerBusinessService.inviteTeamMember({
        teamId: activeTeamId,
        email: email.trim(),
        role,
        permissions,
      });
      setMembers((current) => [member, ...current]);
      setInviteOpen(false);
      setEmail('');
      toast.success('Invitation sent');
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Unable to invite member');
    } finally {
      setSaving(false);
    }
  };

  return (
    <OrganizerShell>
      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:py-10">
        <PageHeader
          title="Team and permissions"
          description="Switch organizations, invite staff, and keep operational access scoped."
          icon={<Users className="size-5" />}
          actions={
            <Button
              type="button"
              onClick={() => setInviteOpen(true)}
              disabled={!manageable || !activeTeamId}
              className="rounded-lg text-xs font-bold"
              title={!manageable ? 'MANAGE_TEAM permission required' : undefined}
            >
              <MailPlus className="size-4" />
              Invite member
            </Button>
          }
        />

        {!endpointAvailable && (
          <div role="alert" className="rounded-lg border border-[var(--warning)]/40 bg-[var(--warning)]/10 p-4 text-sm text-[var(--warning)]">
            Team endpoints are not available in this backend. Existing organizer-owner
            permissions remain active, but invitations and multi-team switching are disabled.
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] p-4">
            <p className="text-[10px] font-bold uppercase text-[var(--text-muted)]">
              Workspace
            </p>
            <p className="mt-2 truncate text-sm font-bold text-[var(--text-primary)]">
              {activeTeam?.name || 'Current organizer'}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] p-4">
            <p className="text-[10px] font-bold uppercase text-[var(--text-muted)]">
              Your role
            </p>
            <div className="mt-2 flex items-center gap-2">
              <ShieldCheck className="size-4 text-[var(--primary)]" />
              <span className="text-sm font-bold text-[var(--text-primary)]">
                {activeTeam?.role || 'ADMIN'}
              </span>
            </div>
          </div>
          <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] p-4">
            <p className="text-[10px] font-bold uppercase text-[var(--text-muted)]">
              Members
            </p>
            <p className="mt-2 text-sm font-bold text-[var(--text-primary)]">
              {activeTeam?.memberCount ?? members.length}
            </p>
          </div>
        </section>

        <section className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface)]">
          <div className="flex items-center justify-between border-b border-[var(--surface-border)] p-4">
            <h2 className="text-sm font-bold text-[var(--text-primary)]">Members</h2>
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              onClick={() => void loadMembers()}
              disabled={!activeTeamId || loading}
              aria-label="Refresh members"
              title="Refresh members"
            >
              <RefreshCw className="size-3.5" />
            </Button>
          </div>
          {error ? (
            <div className="p-6">
              <p className="text-sm text-[var(--error)]">{error}</p>
              {error.includes('endpoint unavailable') && (
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  Expected: GET /api/organizer/team/members?teamId=:teamId
                </p>
              )}
            </div>
          ) : loading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="size-6 animate-spin text-[var(--primary)]" />
            </div>
          ) : members.length === 0 ? (
            <EmptyState
              icon={Users}
              title={activeTeamId ? 'No members yet' : 'Select a team'}
              description={
                activeTeamId
                  ? 'Invite a manager or check-in staff member to begin delegation.'
                  : 'The team service must return a workspace before members can be managed.'
              }
              className="border-0 bg-transparent"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[var(--surface-border)] text-[10px] font-bold uppercase text-[var(--text-muted)]">
                  <tr>
                    <th className="px-4 py-3">Member</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Permissions</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.id} className="border-b border-[var(--surface-border)]/60">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[var(--text-primary)]">
                          {member.name || member.email}
                        </p>
                        {member.name && (
                          <p className="text-xs text-[var(--text-muted)]">{member.email}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge>{member.role}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                        {member.permissions.length} / {PERMISSIONS.length}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-[var(--text-secondary)]">
                        {member.status || 'ACTIVE'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Invite team member</DialogTitle>
              <DialogDescription>{roleDescription}</DialogDescription>
            </DialogHeader>
            <div className="space-y-5 py-2">
              <div>
                <Label htmlFor="team-email" className="mb-1.5 block text-xs">
                  Email
                </Label>
                <Input
                  id="team-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="staff@example.com"
                />
              </div>
              <fieldset>
                <legend className="mb-2 text-xs font-bold text-[var(--text-secondary)]">
                  Role
                </legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {(['ADMIN', 'MANAGER', 'CHECK_IN_STAFF'] as OrganizerTeamRole[]).map(
                    (option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => selectRole(option)}
                        className={`rounded-lg border px-3 py-2 text-xs font-bold ${
                          role === option
                            ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]'
                            : 'border-[var(--surface-border)] text-[var(--text-secondary)]'
                        }`}
                      >
                        {option.replaceAll('_', ' ')}
                      </button>
                    )
                  )}
                </div>
              </fieldset>
              <fieldset>
                <legend className="mb-2 text-xs font-bold text-[var(--text-secondary)]">
                  Permissions
                </legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {PERMISSIONS.map((permission) => (
                    <label
                      key={permission.value}
                      className="flex items-center gap-2 rounded-lg border border-[var(--surface-border)] px-3 py-2 text-xs text-[var(--text-secondary)]"
                    >
                      <input
                        type="checkbox"
                        checked={permissions.includes(permission.value)}
                        disabled={role === 'ADMIN'}
                        onChange={() => togglePermission(permission.value)}
                      />
                      {permission.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void invite()}
                disabled={saving || !email.trim() || !activeTeamId}
              >
                {saving && <Loader2 className="size-4 animate-spin" />}
                Send invitation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </OrganizerShell>
  );
}
