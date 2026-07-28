export interface FeaturedProfile {
  id: string;
  name: string;
  profileType: string;
  bio?: string;
  imageUrl?: string;
  bannerUrl?: string;
  slug?: string;
  category?: string;
  genres?: string[];
  followerCount?: number;
  ownerUserId?: string;
  socialLinks?: {
    website?: string;
    spotify?: string;
    youtube?: string;
    instagram?: string;
    facebook?: string;
  };
  pinnedEventIds?: string[];
  activities?: FeaturedArtistActivity[];
}

export interface FeaturedArtistActivity {
  id?: string;
  title: string;
  startsAt: number;
  location?: string;
  url?: string;
}
