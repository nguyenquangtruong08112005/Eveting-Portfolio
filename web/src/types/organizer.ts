export interface OrganizerEvent {
  id: string;
  name: string;
  /** Prefer lifecycle: draft | submitted | approved | published | … */
  status: string;
  lifecycleStatus?: string;
  sold: number;
  capacity: number;
  price: number;
}

export interface OrganizerStats {
  totalSales: number;
  grossRevenue: number;
  platformFees: number;
  netRevenue: number;
}

export interface EventAnalytics {
  eventId?: string;
  totalRevenue?: number;
  ticketsSold?: Record<string, number> | number;
  dailySales?: Record<string, number>;
  checkIns?: number;
  views?: number;
  viewsOverTime?: Record<string, number>;
  uniqueVisitors?: number;
  conversionRate?: number;
  trafficSources?: Record<string, number>;
  ticketBreakdown?: OrganizerTicketBreakdown[];
  lastUpdatedAt?: number;
}

export interface OrganizerTicketBreakdown {
  ticketType: string;
  price: number;
  sold: number;
  locked?: number;
  capacity?: number;
}

export interface OrganizerAttendeeRow {
  ticket: {
    id: string;
    type?: string;
    seat?: string;
    status?: string;
    purchaseDate?: number | string;
  };
  user: {
    id: string;
    name?: string;
    email?: string;
    profilePicUrl?: string;
  };
}

// ── Phase 05: Finance / Payouts ──────────────────────────────────────────

export interface PayoutSummary {
  eligibleNetAmount: number;
  pendingApprovalAmount: number;
  processingAmount: number;
  completedAmount: number;
  nextScheduledPayoutAt: string | null;
}

export interface Payout {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  completedAt?: string | null;
}

export interface PaginatedPayouts {
  page: number;
  limit: number;
  total: number;
  payouts: Payout[];
}

export interface BankAccountInfo {
  registered: boolean;
  maskedDisplay?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BankAccountUpdateBody {
  accountNumber: string;
  accountHolder: string;
  bankName: string;
}

export type OrganizerTeamRole = 'ADMIN' | 'MANAGER' | 'CHECK_IN_STAFF';

export type OrganizerPermission =
  | 'SCAN_TICKETS'
  | 'VIEW_CHECKIN_REPORTS'
  | 'MANAGE_TEAM'
  | 'MANAGE_SEATMAP'
  | 'VIEW_ORDERS'
  | 'SEND_CUSTOMER_EMAIL'
  | 'EXPORT_ORDER_REPORTS'
  | 'VIEW_REVENUE'
  | 'VIEW_ANALYTICS'
  | 'MARKETING_OPERATIONS'
  | 'MANAGE_VOUCHERS'
  | 'EDIT_EVENT';

export interface OrganizerTeam {
  id: string;
  name: string;
  role: OrganizerTeamRole;
  permissions: OrganizerPermission[];
  memberCount?: number;
}

export interface OrganizerTeamMember {
  id: string;
  email: string;
  name?: string;
  role: OrganizerTeamRole;
  permissions: OrganizerPermission[];
  performanceIds?: string[];
  ticketTypeIds?: string[];
  status?: 'PENDING' | 'ACTIVE' | 'SUSPENDED';
}

export interface OrganizerPaymentProfile {
  fullName?: string;
  bankAccountNumber?: string;
  bankName?: string;
  bankBranch?: string;
  redInvoiceEnabled?: boolean;
  businessType?: 'individual' | 'company' | 'household';
  address?: string;
  taxNumber?: string;
  verificationStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'UNSUBMITTED';
  rejectionReason?: string;
  kycRequired?: boolean;
  kycRevision?: number;
  verifiedAt?: string;
  updatedAt?: string;
}

export interface OrganizerOrder {
  id: string;
  createdAt: string | number;
  customerName?: string;
  customerEmail?: string;
  totalValue: number;
  paymentMethod?: string;
  status: string;
  performanceId?: string;
  ticketCount?: number;
  invoiceRequested?: boolean;
  invoiceTaxNumber?: string;
  invoiceCompanyName?: string;
}

export interface OrganizerOrdersResponse {
  orders: OrganizerOrder[];
  total: number;
  invoiceRequestCount?: number;
}
