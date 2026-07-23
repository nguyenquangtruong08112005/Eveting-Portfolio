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
