export type MembershipTier = 'none' | 'bronze' | 'silver' | 'gold' | 'platinum';

export interface Membership {
  tier: MembershipTier;
  points: number;
  pointsToNextTier?: number;
  benefits?: string[];
  expiresAt?: string | number;
}
