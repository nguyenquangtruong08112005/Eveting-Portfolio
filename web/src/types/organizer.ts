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
  lastUpdatedAt?: number;
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
