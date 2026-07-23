export interface EventMedia {
  id: string;
  eventId: string;
  url: string;
  type: 'image' | 'video';
  caption?: string;
  uploaderName?: string;
  createdAt: string | number;
}
