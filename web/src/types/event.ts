export interface EventLocation {
  address: string;
  latitude?: number;
  longitude?: number;
}

export type EventQuestionType = 'text' | 'single_choice' | 'multi_choice';

export interface EventCustomQuestion {
  /** Persisted questions carry a stable server id (eq_*); drafts may not yet have one. */
  id?: string;
  questionText: string;
  questionType: EventQuestionType;
  isRequired: boolean;
  options: string[];
}

export interface EventAddressDetails {
  province?: string;
  city?: string;
  district?: string;
  ward?: string;
  street?: string;
  venueName?: string;
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
  isPrivate?: boolean;
  messageForAttendee?: string;
  addressDetails?: EventAddressDetails;
  customQuestions?: EventCustomQuestion[];
  featuredProfileIds?: string[];
  featuredProfiles?: Array<{ id: string; name?: string }>;
  ticketTypes?: Record<
    string,
    {
      price: number;
      available: number;
      quantity?: number;
      isFree?: boolean;
      minPerOrder?: number;
      maxPerOrder?: number;
      sellAt?: number;
      endSellAt?: number;
      description?: string;
      imageUrl?: string;
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
