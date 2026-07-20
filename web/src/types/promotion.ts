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
  eventId?: string | null;
  validFrom?: number;
  validUntil?: number;
  usageLimit?: number;
  usedCount?: number;
  isPublic?: boolean;
  organizerId?: string;
}
