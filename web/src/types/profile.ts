export interface FeaturedProfile {
  id: string;
  name: string;
  profileType: string;
  bio?: string;
  imageUrl?: string;
  genres?: string[];
  followerCount?: number;
}
