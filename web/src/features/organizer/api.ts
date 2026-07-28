import { API_BASE, HttpError, request } from '@/services/apiClient';
import type {
  EventAnalytics,
  FeaturedProfile,
  OrganizerOrder,
  OrganizerOrdersResponse,
  OrganizerPaymentProfile,
  OrganizerPermission,
  OrganizerTeam,
  OrganizerTeamMember,
  OrganizerTeamRole,
} from '@/types';

export { OrganizerService } from '@/services/organizer.service';
export { PromotionService } from '@/services/promotion.service';
export { VenueService } from '@/services/venue.service';

export const ORGANIZER_ENDPOINTS = {
  teamMemberships: '/api/organizer/team/memberships',
  teamMembers: '/api/organizer/team/members',
  teamInvite: '/api/organizer/team/invite',
  paymentProfile: '/api/organizer/payment-profile',
  eventAnalytics: (eventId: string) => `/api/organizer/events/${eventId}/analytics`,
  eventOrders: (eventId: string) => `/api/organizer/events/${eventId}/orders`,
  eventOrderExport: (eventId: string) => `/api/organizer/events/${eventId}/orders/export`,
  eventInvoiceRequests: (eventId: string) =>
    `/api/organizer/events/${eventId}/tax-invoice-requests`,
  eventOrderEmail: (eventId: string) => `/api/organizer/events/${eventId}/orders/send-email`,
  featuredProfiles: '/api/web/profiles',
} as const;

export class OrganizerEndpointUnavailableError extends Error {
  readonly endpoint: string;

  constructor(endpoint: string) {
    super(`Organizer endpoint unavailable: ${endpoint}`);
    this.name = 'OrganizerEndpointUnavailableError';
    this.endpoint = endpoint;
  }
}

function withTeam(path: string, teamId?: string | null): string {
  if (!teamId) return path;
  const joiner = path.includes('?') ? '&' : '?';
  return `${path}${joiner}teamId=${encodeURIComponent(teamId)}`;
}

async function requestPhase07<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown
): Promise<T> {
  try {
    return await request<T>(method, path, body === undefined ? {} : { body });
  } catch (error) {
    if (error instanceof HttpError && (error.status === 404 || error.status === 501)) {
      throw new OrganizerEndpointUnavailableError(path);
    }
    throw error;
  }
}

export interface TeamInviteBody {
  teamId: string;
  email: string;
  role: OrganizerTeamRole;
  permissions: OrganizerPermission[];
  performanceIds?: string[];
  ticketTypeIds?: string[];
}

export interface OrganizerInvoiceRequest {
  id: string;
  orderId?: string;
  status: 'REQUESTED' | 'PROCESSING' | 'ISSUED' | 'REJECTED';
  companyName?: string;
  taxNumber?: string;
  createdAt?: string | number;
}

export interface FeaturedProfileWriteBody {
  name: string;
  profileType: string;
  bio?: string;
  imageUrl?: string;
  bannerUrl?: string;
  slug?: string;
  category?: string;
  genres?: string[];
  socialLinks?: FeaturedProfile['socialLinks'];
  pinnedEventIds?: string[];
  activities?: FeaturedProfile['activities'];
}

export class OrganizerBusinessService {
  static async getTeams(): Promise<OrganizerTeam[]> {
    const data = await requestPhase07<OrganizerTeam[] | { teams: OrganizerTeam[] }>(
      'GET',
      ORGANIZER_ENDPOINTS.teamMemberships
    );
    return Array.isArray(data) ? data : data.teams || [];
  }

  static async getTeamMembers(teamId: string): Promise<OrganizerTeamMember[]> {
    const path = `${ORGANIZER_ENDPOINTS.teamMembers}?teamId=${encodeURIComponent(teamId)}`;
    const data = await requestPhase07<
      OrganizerTeamMember[] | { members: OrganizerTeamMember[] }
    >('GET', path);
    return Array.isArray(data) ? data : data.members || [];
  }

  static async inviteTeamMember(body: TeamInviteBody): Promise<OrganizerTeamMember> {
    // The server calls this an invitation. It is not an active member until accepted.
    const data = await requestPhase07<
      OrganizerTeamMember | { invitation: OrganizerTeamMember }
    >('POST', ORGANIZER_ENDPOINTS.teamInvite, { ...body, scopes: [] });
    return 'invitation' in data ? data.invitation : data;
  }

  static updateTeamMember(
    _teamId: string,
    memberId: string,
    body: Partial<Pick<OrganizerTeamMember, 'role' | 'permissions' | 'performanceIds' | 'ticketTypeIds' | 'status'>>
  ): Promise<OrganizerTeamMember> {
    void _teamId;
    return requestPhase07<OrganizerTeamMember | { member: OrganizerTeamMember }>(
      'PATCH',
      `${ORGANIZER_ENDPOINTS.teamMembers}/${encodeURIComponent(memberId)}`,
      body
    ).then((data) => ('member' in data ? data.member : data));
  }

  static async getPaymentProfile(_teamId?: string | null): Promise<OrganizerPaymentProfile> {
    void _teamId;
    const data = await requestPhase07<{
      registered: boolean;
      profile: OrganizerPaymentProfile | null;
    }>(
      'GET',
      ORGANIZER_ENDPOINTS.paymentProfile
    );
    return data.profile || { verificationStatus: 'UNSUBMITTED' };
  }

  static async updatePaymentProfile(
    body: OrganizerPaymentProfile,
    _teamId?: string | null
  ): Promise<OrganizerPaymentProfile> {
    void _teamId;
    const data = await requestPhase07<{ profile: OrganizerPaymentProfile }>(
      'POST',
      ORGANIZER_ENDPOINTS.paymentProfile,
      body
    );
    return data.profile;
  }

  static getEventAnalytics(
    eventId: string,
    teamId?: string | null
  ): Promise<EventAnalytics> {
    return requestPhase07<EventAnalytics>(
      'GET',
      withTeam(ORGANIZER_ENDPOINTS.eventAnalytics(eventId), teamId)
    );
  }

  static async getEventOrders(
    eventId: string,
    options: { teamId?: string | null; search?: string; status?: string } = {}
  ): Promise<OrganizerOrdersResponse> {
    const params = new URLSearchParams();
    if (options.teamId) params.set('teamId', options.teamId);
    if (options.search) params.set('search', options.search);
    if (options.status) params.set('status', options.status);
    const suffix = params.size ? `?${params.toString()}` : '';
    const data = await requestPhase07<
      OrganizerOrdersResponse | OrganizerOrder[] | { data: OrganizerOrder[]; total?: number }
    >('GET', `${ORGANIZER_ENDPOINTS.eventOrders(eventId)}${suffix}`);
    if (Array.isArray(data)) return { orders: data, total: data.length };
    if ('orders' in data) return data;
    return { orders: data.data || [], total: data.total ?? data.data?.length ?? 0 };
  }

  static sendOrderEmail(
    eventId: string,
    body: { subject: string; message: string; orderIds?: string[] },
    teamId?: string | null
  ): Promise<{ queued: number }> {
    return requestPhase07<{ queued: number }>(
      'POST',
      withTeam(ORGANIZER_ENDPOINTS.eventOrderEmail(eventId), teamId),
      body
    );
  }

  static async getInvoiceRequests(eventId: string): Promise<OrganizerInvoiceRequest[]> {
    const data = await requestPhase07<
      OrganizerInvoiceRequest[] | { requests?: OrganizerInvoiceRequest[]; data?: OrganizerInvoiceRequest[] }
    >('GET', ORGANIZER_ENDPOINTS.eventInvoiceRequests(eventId));
    if (Array.isArray(data)) return data;
    return data.requests || data.data || [];
  }

  static async downloadOrderExport(eventId: string): Promise<void> {
    const path = ORGANIZER_ENDPOINTS.eventOrderExport(eventId);
    const response = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
    if (!response.ok) {
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        body = { message: response.statusText };
      }
      const message =
        typeof (body as { message?: unknown }).message === 'string'
          ? String((body as { message: string }).message)
          : `API error: ${response.status}`;
      throw new HttpError(response.status, message, body);
    }
    const objectUrl = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = `orders_${eventId}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  }

  static async listFeaturedProfiles(): Promise<FeaturedProfile[]> {
    const data = await request<
      FeaturedProfile[] | { profiles: FeaturedProfile[] }
    >('GET', `${ORGANIZER_ENDPOINTS.featuredProfiles}?page=1&limit=100`);
    return Array.isArray(data) ? data : data.profiles || [];
  }

  static createFeaturedProfile(body: FeaturedProfileWriteBody): Promise<FeaturedProfile> {
    return request<FeaturedProfile>('POST', ORGANIZER_ENDPOINTS.featuredProfiles, { body });
  }

  static updateFeaturedProfile(
    id: string,
    body: Partial<FeaturedProfileWriteBody>
  ): Promise<FeaturedProfile> {
    return request<FeaturedProfile>(
      'PUT',
      `${ORGANIZER_ENDPOINTS.featuredProfiles}/${encodeURIComponent(id)}`,
      { body }
    );
  }
}
