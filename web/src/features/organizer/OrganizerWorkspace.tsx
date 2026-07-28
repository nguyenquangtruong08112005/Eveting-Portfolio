'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  OrganizerBusinessService,
  OrganizerEndpointUnavailableError,
} from '@/features/organizer/api';
import type {
  OrganizerPermission,
  OrganizerTeam,
  OrganizerTeamRole,
} from '@/types';

const OWNER_PERMISSIONS: OrganizerPermission[] = [
  'SCAN_TICKETS',
  'VIEW_CHECKIN_REPORTS',
  'MANAGE_TEAM',
  'MANAGE_SEATMAP',
  'VIEW_ORDERS',
  'SEND_CUSTOMER_EMAIL',
  'EXPORT_ORDER_REPORTS',
  'VIEW_REVENUE',
  'VIEW_ANALYTICS',
  'MARKETING_OPERATIONS',
  'MANAGE_VOUCHERS',
  'EDIT_EVENT',
];

interface OrganizerWorkspaceValue {
  teams: OrganizerTeam[];
  activeTeam: OrganizerTeam | null;
  activeTeamId: string | null;
  teamRole: OrganizerTeamRole;
  permissions: OrganizerPermission[];
  loading: boolean;
  endpointAvailable: boolean;
  error: string;
  selectTeam: (teamId: string) => void;
  refreshTeams: () => Promise<void>;
  can: (permission: OrganizerPermission) => boolean;
}

const OrganizerWorkspaceContext = createContext<OrganizerWorkspaceValue | null>(null);

export function OrganizerWorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { role, isAuthenticated } = useAuth();
  const [teams, setTeams] = useState<OrganizerTeam[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [endpointAvailable, setEndpointAvailable] = useState(true);
  const [error, setError] = useState('');

  const refreshTeams = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError('');
    try {
      const nextTeams = await OrganizerBusinessService.getTeams();
      setTeams(nextTeams);
      setEndpointAvailable(true);
      setActiveTeamId((current) => {
        const stored =
          typeof window === 'undefined' ? null : localStorage.getItem('organizerTeamId');
        const candidate = current || stored;
        return nextTeams.some((team) => team.id === candidate)
          ? candidate
          : nextTeams[0]?.id || null;
      });
    } catch (caught) {
      setTeams([]);
      setActiveTeamId(null);
      setEndpointAvailable(!(caught instanceof OrganizerEndpointUnavailableError));
      setError(caught instanceof Error ? caught.message : 'Unable to load organizer teams');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void refreshTeams();
  }, [refreshTeams]);

  const selectTeam = useCallback((teamId: string) => {
    setActiveTeamId(teamId);
    localStorage.setItem('organizerTeamId', teamId);
  }, []);

  const activeTeam = teams.find((team) => team.id === activeTeamId) || null;
  const isOrganizerOwner = role === 'organizer' && !activeTeam;
  const teamRole: OrganizerTeamRole = activeTeam?.role || 'ADMIN';
  const permissions = useMemo(
    () => activeTeam?.permissions || (isOrganizerOwner ? OWNER_PERMISSIONS : []),
    [activeTeam?.permissions, isOrganizerOwner]
  );
  const can = useCallback(
    (permission: OrganizerPermission) =>
      teamRole === 'ADMIN' || permissions.includes(permission),
    [permissions, teamRole]
  );

  const value = useMemo<OrganizerWorkspaceValue>(
    () => ({
      teams,
      activeTeam,
      activeTeamId,
      teamRole,
      permissions,
      loading,
      endpointAvailable,
      error,
      selectTeam,
      refreshTeams,
      can,
    }),
    [
      teams,
      activeTeam,
      activeTeamId,
      teamRole,
      permissions,
      loading,
      endpointAvailable,
      error,
      selectTeam,
      refreshTeams,
      can,
    ]
  );

  return (
    <OrganizerWorkspaceContext.Provider value={value}>
      {children}
    </OrganizerWorkspaceContext.Provider>
  );
}

export function useOrganizerWorkspace(): OrganizerWorkspaceValue {
  const context = useContext(OrganizerWorkspaceContext);
  if (!context) {
    throw new Error('useOrganizerWorkspace must be used inside OrganizerWorkspaceProvider');
  }
  return context;
}
