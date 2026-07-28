/**
 * Public / organizer promotion codes returned by `/promotions`.
 */

export interface Promotion {
  id: string;
  code: string;
  name?: string;
  description?: string;
  discountType?: 'amount' | 'percent' | string;
  discountValue?: number;
  minTicketQuantity?: number;
  eventId?: string | null;
  validFrom?: number;
  validUntil?: number;
  usageLimit?: number;
  usedCount?: number;
  isPublic?: boolean;
  maxTicketQuantity?: number;
  maxOrdersPerBuyer?: number;
  performanceId?: string | null;
  promoImageUrl?: string;
  stackable?: false;
  organizerId?: string;
  createdAt?: number;
}

export interface PromotionCreateBody {
  code: string;
  discountValue: number;
  name?: string;
  description?: string;
  discountType?: 'amount' | 'percent';
  minTicketQuantity?: number;
  eventId?: string | null;
  validFrom?: number;
  validUntil?: number;
  usageLimit?: number;
  isPublic?: boolean;
  maxTicketQuantity?: number;
  maxOrdersPerBuyer?: number;
  performanceId?: string | null;
  promoImageUrl?: string;
  stackable?: false;
}

/** Full update — matches server updatePromotion allowed fields */
export interface PromotionUpdateBody {
  code?: string;
  name?: string;
  description?: string;
  discountType?: 'amount' | 'percent';
  discountValue?: number;
  minTicketQuantity?: number;
  eventId?: string | null;
  validFrom?: number;
  validUntil?: number;
  usageLimit?: number;
  isPublic?: boolean;
  maxTicketQuantity?: number;
  maxOrdersPerBuyer?: number;
  performanceId?: string | null;
  promoImageUrl?: string;
  stackable?: false;
}
