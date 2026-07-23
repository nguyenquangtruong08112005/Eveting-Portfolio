export interface EventLocation {
  address: string;
  latitude?: number;
  longitude?: number;
}

export interface Event {
  id: string;
  name: string;
  description?: string;
  date: number;
  /** Optional multi-day / last performance end */
  endDate?: number | null;
  imageUrl?: string;
  bannerUrl?: string;
  videoUrl?: string;
  location?: EventLocation;
  city?: string;
  venueName?: string;
  minPrice?: number | null;
  category?: string[];
  tags?: string[];
  eventType?: 'physical' | 'online' | 'hybrid';
  status?:
    | 'draft'
    | 'submitted'
    | 'approved'
    | 'published'
    | 'rejected'
    | 'cancelled'
    | 'active'
    | 'finished'
    | 'ended';
  lifecycleStatus?: string;
  organizerId?: string;
  capacity?: number;
  /** Recurring / series rule from backend */
  recurringRule?: string | Record<string, unknown> | null;
  /** Optional multi-show schedule */
  performances?: Array<{ id?: string; name?: string; date?: number }>;
  sponsors?: Array<{ name?: string; logoUrl?: string; url?: string } | string>;
  ticketTypes?: Record<
    string,
    {
      price: number;
      available: number;
      quantity?: number;
    }
  >;
}

export interface RejectedEvent extends Event {
  reason: string;
}

export interface Destination {
  name: string;
  query: string;
  eventCount: number;
}

export interface EventWeather {
  tempC?: number;
  temperature?: number;
  condition?: string;
  description?: string;
  icon?: string;
  iconUrl?: string;
  humidity?: number;
  windKph?: number;
  windSpeed?: number;
  forecast?: string;
}
