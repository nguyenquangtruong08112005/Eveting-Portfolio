export type NotificationType = 'order' | 'event' | 'system' | 'promotion' | 'reminder';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body?: string;
  read: boolean;
  linkUrl?: string;
  createdAt: string | number;
}
