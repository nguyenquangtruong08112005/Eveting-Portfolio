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
}

export interface PromotionUpdateBody {
  usageLimit?: number;
  validUntil?: number;
  description?: string;
  isPublic?: boolean;
}
