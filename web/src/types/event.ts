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
