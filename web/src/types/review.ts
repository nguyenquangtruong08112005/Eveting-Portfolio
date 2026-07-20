export interface Review {
  id: string;
  eventId: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  rating: number;
  comment?: string;
  createdAt: string | number;
}
