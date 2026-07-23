export interface Venue {
  id: string;
  name: string;
  address?: string;
  city?: string;
  district?: string;
  country?: string;
  lat?: number | null;
  lng?: number | null;
  capacity?: number | null;
  location?: {
    latitude?: number;
    longitude?: number;
    lat?: number;
    lng?: number;
  };
}
