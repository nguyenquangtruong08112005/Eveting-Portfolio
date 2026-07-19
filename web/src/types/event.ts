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
  status?: 'draft' | 'submitted' | 'approved' | 'published' | 'rejected' | 'cancelled' | 'active' | 'finished';
  organizerId?: string;
  capacity?: number;
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
  condition?: string;
  icon?: string;
  humidity?: number;
  windKph?: number;
  forecast?: string;
}
