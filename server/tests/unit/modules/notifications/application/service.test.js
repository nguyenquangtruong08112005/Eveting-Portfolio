jest.mock('@/providers/database/notification.repository');
jest.mock('@/modules/notifications/application/notification-event.helper', () => ({
  buildNotificationDoc: jest.fn(),
}));

const notificationRepository = require('@/providers/database/notification.repository');
const notifHelper = require('@/modules/notifications/application/notification-event.helper');
const notificationService = require('@/modules/notifications/application/service');

const mockUserId = 'user_001';
const mockNotifId = 'notif_abc123';

const mockNotifications = [
  { id: 'notif_1', userId: mockUserId, title: 'Test', message: 'Message 1', type: 'info', eventId: null, isRead: false, createdAt: 1000 },
  { id: 'notif_2', userId: 'all', title: 'Broadcast', message: 'Broadcast msg', type: 'broadcast', eventId: null, isRead: true, createdAt: 900 },
];

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getNotificationsByUserId', () => {
  it('returns notifications for the given user', async () => {
    notificationRepository.getNotificationsByUserId.mockResolvedValue(mockNotifications);

    const result = await notificationService.getNotificationsByUserId(mockUserId);

    expect(notificationRepository.getNotificationsByUserId).toHaveBeenCalledWith(mockUserId);
    expect(result).toEqual(mockNotifications);
    expect(result).toHaveLength(2);
  });

  it('returns empty array when user has no notifications', async () => {
    notificationRepository.getNotificationsByUserId.mockResolvedValue([]);

    const result = await notificationService.getNotificationsByUserId(mockUserId);

    expect(result).toEqual([]);
  });

  it('propagates repository errors', async () => {
    const dbError = new Error('DB connection failed');
    notificationRepository.getNotificationsByUserId.mockRejectedValue(dbError);

    await expect(notificationService.getNotificationsByUserId(mockUserId)).rejects.toThrow('DB connection failed');
  });

  it('preserves notification list contract consumed by web and attendee', async () => {
    notificationRepository.getNotificationsByUserId.mockResolvedValue(mockNotifications);

    const result = await notificationService.getNotificationsByUserId(mockUserId);

    result.forEach((n) => {
      expect(n).toHaveProperty('id');
      expect(n).toHaveProperty('userId');
      expect(n).toHaveProperty('title');
      expect(n).toHaveProperty('message');
      expect(n).toHaveProperty('type');
      expect(n).toHaveProperty('isRead');
      expect(n).toHaveProperty('createdAt');
    });
  });
});

describe('markNotificationAsRead', () => {
  it('marks notification as read and returns updated notification', async () => {
    const updatedNotif = { ...mockNotifications[0], isRead: true };
    notificationRepository.markNotificationAsRead.mockResolvedValue(updatedNotif);

    const result = await notificationService.markNotificationAsRead(mockNotifId);

    expect(notificationRepository.markNotificationAsRead).toHaveBeenCalledWith(mockNotifId);
    expect(result.isRead).toBe(true);
    expect(result.id).toBe(mockNotifications[0].id);
  });

  it('throws when notification is not found', async () => {
    const notFoundError = new Error('Notification not found.');
    notificationRepository.markNotificationAsRead.mockRejectedValue(notFoundError);

    await expect(notificationService.markNotificationAsRead('nonexistent')).rejects.toThrow('Notification not found.');
  });
});

describe('createNotification', () => {
  const mockTitle = 'New notification';
  const mockMessage = 'You have a new update';
  const mockType = 'info';
  const mockEventId = 'evt_001';
  const mockDoc = { id: 'notif_generated', userId: mockUserId, title: mockTitle, message: mockMessage, type: mockType, eventId: mockEventId, isRead: false, createdAt: Date.now() };

  beforeEach(() => {
    notifHelper.buildNotificationDoc.mockReturnValue(mockDoc);
    notificationRepository.createNotification.mockResolvedValue(mockDoc);
  });

  it('builds notification doc via helper and creates via repository', async () => {
    const result = await notificationService.createNotification(mockUserId, mockTitle, mockMessage, mockType, mockEventId);

    expect(notifHelper.buildNotificationDoc).toHaveBeenCalledWith(mockUserId, mockTitle, mockMessage, mockType, mockEventId);
    expect(notificationRepository.createNotification).toHaveBeenCalledWith(mockDoc);
    expect(result).toEqual(mockDoc);
  });

  it('works without eventId', async () => {
    const docNoEvent = { ...mockDoc, eventId: null };
    notifHelper.buildNotificationDoc.mockReturnValue(docNoEvent);
    notificationRepository.createNotification.mockResolvedValue(docNoEvent);

    const result = await notificationService.createNotification(mockUserId, mockTitle, mockMessage, mockType);

    expect(notifHelper.buildNotificationDoc).toHaveBeenCalledWith(mockUserId, mockTitle, mockMessage, mockType, null);
    expect(result.eventId).toBeNull();
  });

  it('propagates repository creation failures', async () => {
    const repoError = new Error('Insert failed');
    notificationRepository.createNotification.mockRejectedValue(repoError);

    await expect(notificationService.createNotification(mockUserId, mockTitle, mockMessage, mockType)).rejects.toThrow('Insert failed');
  });
});
