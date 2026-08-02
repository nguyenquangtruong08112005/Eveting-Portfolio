jest.mock('uuid', () => ({ v4: jest.fn() }), { virtual: true });
jest.mock('@/providers/database/user.repository');
jest.mock('@/providers/database/notification.repository');

const { v4: uuidv4 } = require('uuid');
const userRepository = require('@/providers/database/user.repository');
const notificationRepository = require('@/providers/database/notification.repository');
const helper = require('@/modules/notifications/application/notification-event.helper');
const notificationService = require('@/modules/notifications/application/service');

const OENV = { ...process.env };

beforeEach(() => {
  jest.clearAllMocks();
  uuidv4.mockReturnValue('fixed-uuid');
});

afterEach(() => {
  process.env.NOTIFICATION_PROVIDER = OENV.NOTIFICATION_PROVIDER;
  process.env.ONESIGNAL_TARGET_MODE = OENV.ONESIGNAL_TARGET_MODE;
});

describe('buildTopicName', () => {
  it('prepends artist_ prefix for artist type', () => {
    expect(helper.buildTopicName('artist', '123')).toBe('artist_123');
  });

  it('prepends organizer_ prefix for organizer type', () => {
    expect(helper.buildTopicName('organizer', '456')).toBe('organizer_456');
  });

  it('prepends event_ prefix for event type', () => {
    expect(helper.buildTopicName('event', '789')).toBe('event_789');
  });

  it('returns raw id for unrecognized prefix', () => {
    expect(helper.buildTopicName('unknown', 'abc')).toBe('abc');
  });

  it('returns raw id when prefix is not in TOPIC_PREFIX map', () => {
    expect(helper.buildTopicName('custom', 'xyz')).toBe('xyz');
  });
});

describe('buildPayloadData', () => {
  it('includes eventId, type, and extra fields merged', () => {
    const result = helper.buildPayloadData('ticket_purchased', 'evt_1', { ticketId: 'tkt_1', qty: 2 });
    expect(result).toEqual({ eventId: 'evt_1', type: 'ticket_purchased', ticketId: 'tkt_1', qty: 2 });
  });

  it('works without extra argument', () => {
    const result = helper.buildPayloadData('reminder', 'evt_2');
    expect(result).toEqual({ eventId: 'evt_2', type: 'reminder' });
  });

  it('allows eventId to be null', () => {
    const result = helper.buildPayloadData('general', null);
    expect(result).toEqual({ eventId: null, type: 'general' });
  });

  it('extra fields override base keys if collided', () => {
    const result = helper.buildPayloadData('test', 'evt_1', { type: 'override' });
    expect(result.type).toBe('override');
  });
});

describe('isOneSignalExternalId', () => {
  it('returns true when NOTIFICATION_PROVIDER=onesignal and ONESIGNAL_TARGET_MODE=external_id', () => {
    process.env.NOTIFICATION_PROVIDER = 'onesignal';
    process.env.ONESIGNAL_TARGET_MODE = 'external_id';
    expect(helper.isOneSignalExternalId()).toBe(true);
  });

  it('returns false when provider is not onesignal (FCM mode)', () => {
    process.env.NOTIFICATION_PROVIDER = 'fcm';
    process.env.ONESIGNAL_TARGET_MODE = 'external_id';
    expect(helper.isOneSignalExternalId()).toBe(false);
  });

  it('returns false when target mode is not external_id', () => {
    process.env.NOTIFICATION_PROVIDER = 'onesignal';
    process.env.ONESIGNAL_TARGET_MODE = 'subscription';
    expect(helper.isOneSignalExternalId()).toBe(false);
  });

  it('returns false when env vars are unset', () => {
    delete process.env.NOTIFICATION_PROVIDER;
    delete process.env.ONESIGNAL_TARGET_MODE;
    expect(helper.isOneSignalExternalId()).toBe(false);
  });
});

describe('shouldManageDeviceTopics', () => {
  it('returns true when isOneSignalExternalId is false (subscription mode)', () => {
    process.env.NOTIFICATION_PROVIDER = 'onesignal';
    process.env.ONESIGNAL_TARGET_MODE = 'subscription';
    expect(helper.shouldManageDeviceTopics()).toBe(true);
  });

  it('returns true in FCM mode', () => {
    process.env.NOTIFICATION_PROVIDER = 'fcm';
    expect(helper.shouldManageDeviceTopics()).toBe(true);
  });

  it('returns false when isOneSignalExternalId is true', () => {
    process.env.NOTIFICATION_PROVIDER = 'onesignal';
    process.env.ONESIGNAL_TARGET_MODE = 'external_id';
    expect(helper.shouldManageDeviceTopics()).toBe(false);
  });
});

describe('collectMessagingTargets', () => {
  const userIds = ['user_1', 'user_2'];
  const mockResult = { recipientIds: ['uid1', 'uid2'], tokens: ['tok1', 'tok2'] };

  it('returns recipientIds as tokens in OneSignal external_id mode', async () => {
    process.env.NOTIFICATION_PROVIDER = 'onesignal';
    process.env.ONESIGNAL_TARGET_MODE = 'external_id';
    userRepository.getUsersFcmTokens.mockResolvedValue(mockResult);

    const result = await helper.collectMessagingTargets(userIds);

    expect(userRepository.getUsersFcmTokens).toHaveBeenCalledWith(userIds);
    expect(result).toEqual({ recipientIds: ['uid1', 'uid2'], tokens: ['uid1', 'uid2'] });
  });

  it('returns result as-is in OneSignal subscription mode (not external_id)', async () => {
    process.env.NOTIFICATION_PROVIDER = 'onesignal';
    process.env.ONESIGNAL_TARGET_MODE = 'subscription';
    userRepository.getUsersFcmTokens.mockResolvedValue(mockResult);

    const result = await helper.collectMessagingTargets(userIds);

    expect(result).toBe(mockResult);
  });

  it('returns result as-is in FCM mode', async () => {
    process.env.NOTIFICATION_PROVIDER = 'fcm';
    userRepository.getUsersFcmTokens.mockResolvedValue(mockResult);

    const result = await helper.collectMessagingTargets(userIds);

    expect(result).toBe(mockResult);
  });

  it('propagates userRepository errors', async () => {
    userRepository.getUsersFcmTokens.mockRejectedValue(new Error('DB error'));
    await expect(helper.collectMessagingTargets(userIds)).rejects.toThrow('DB error');
  });
});

describe('collectTokens', () => {
  const userIds = ['user_1'];
  const mockResult = { recipientIds: ['uid1'], tokens: ['tok1'] };

  it('returns recipientIds in OneSignal external_id mode', async () => {
    process.env.NOTIFICATION_PROVIDER = 'onesignal';
    process.env.ONESIGNAL_TARGET_MODE = 'external_id';
    userRepository.getUsersFcmTokens.mockResolvedValue(mockResult);

    const result = await helper.collectTokens(userIds);

    expect(result).toEqual(['uid1']);
  });

  it('returns tokens in OneSignal subscription mode', async () => {
    process.env.NOTIFICATION_PROVIDER = 'onesignal';
    process.env.ONESIGNAL_TARGET_MODE = 'subscription';
    userRepository.getUsersFcmTokens.mockResolvedValue(mockResult);

    const result = await helper.collectTokens(userIds);

    expect(result).toEqual(['tok1']);
  });

  it('returns tokens in FCM mode', async () => {
    process.env.NOTIFICATION_PROVIDER = 'fcm';
    userRepository.getUsersFcmTokens.mockResolvedValue(mockResult);

    const result = await helper.collectTokens(userIds);

    expect(result).toEqual(['tok1']);
  });

  it('propagates userRepository errors', async () => {
    userRepository.getUsersFcmTokens.mockRejectedValue(new Error('DB error'));
    await expect(helper.collectTokens(userIds)).rejects.toThrow('DB error');
  });
});

describe('buildNotificationDoc', () => {
  beforeAll(() => { jest.useFakeTimers({ now: 1700000000000 }); });
  afterAll(() => { jest.useRealTimers(); });

  it('builds a notification document with all fields', () => {
    const doc = helper.buildNotificationDoc('user_1', 'Title', 'Message', 'info', 'evt_1');

    expect(doc).toEqual({
      id: 'notif_fixed-uuid',
      userId: 'user_1',
      title: 'Title',
      message: 'Message',
      type: 'info',
      eventId: 'evt_1',
      isRead: false,
      createdAt: 1700000000000,
    });
  });

  it('sets eventId to null when omitted', () => {
    const doc = helper.buildNotificationDoc('user_1', 'T', 'M', 'alert');
    expect(doc.eventId).toBeNull();
  });

  it('uses uuid for id generation', () => {
    helper.buildNotificationDoc('u', 't', 'm', 't');
    expect(uuidv4).toHaveBeenCalledTimes(1);
  });

  it('creates createdAt as current timestamp', () => {
    const doc = helper.buildNotificationDoc('u', 't', 'm', 't');
    expect(doc.createdAt).toBe(1700000000000);
  });

  it('sets isRead to false', () => {
    const doc = helper.buildNotificationDoc('u', 't', 'm', 't');
    expect(doc.isRead).toBe(false);
  });
});

describe('service - getNotificationsByUserId', () => {
  const mockUserId = 'user_001';
  const mockNotifications = [
    { id: 'notif_1', userId: mockUserId, title: 'Test', message: 'Message 1', type: 'info', eventId: null, isRead: false, createdAt: 1000 },
    { id: 'notif_2', userId: 'all', title: 'Broadcast', message: 'Broadcast msg', type: 'broadcast', eventId: null, isRead: true, createdAt: 900 },
  ];

  it('delegates to repository and returns notifications', async () => {
    notificationRepository.getNotificationsByUserId.mockResolvedValue(mockNotifications);

    const result = await notificationService.getNotificationsByUserId(mockUserId);

    expect(notificationRepository.getNotificationsByUserId).toHaveBeenCalledWith(mockUserId);
    expect(result).toEqual(mockNotifications);
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
});

describe('service - markNotificationAsRead', () => {
  const mockNotifId = 'notif_abc123';
  const mockNotification = { id: mockNotifId, userId: 'user_001', title: 'Test', message: 'Msg', type: 'info', eventId: null, isRead: false, createdAt: 1000 };

  it('delegates to repository and returns updated notification', async () => {
    const updatedNotif = { ...mockNotification, isRead: true };
    notificationRepository.markNotificationAsRead.mockResolvedValue(updatedNotif);

    const result = await notificationService.markNotificationAsRead(mockNotifId);

    expect(notificationRepository.markNotificationAsRead).toHaveBeenCalledWith(mockNotifId);
    expect(result.isRead).toBe(true);
  });

  it('throws when notification is not found', async () => {
    notificationRepository.markNotificationAsRead.mockRejectedValue(new Error('Notification not found.'));

    await expect(notificationService.markNotificationAsRead('nonexistent')).rejects.toThrow('Notification not found.');
  });
});

describe('service - createNotification', () => {
  const mockUserId = 'user_001';
  const mockTitle = 'New notification';
  const mockMessage = 'You have a new update';
  const mockType = 'info';
  const mockEventId = 'evt_001';
  const mockDoc = { id: 'notif_generated', userId: mockUserId, title: mockTitle, message: mockMessage, type: mockType, eventId: mockEventId, isRead: false, createdAt: Date.now() };

  beforeEach(() => {
    helper.buildNotificationDoc = jest.fn().mockReturnValue(mockDoc);
    notificationRepository.createNotification.mockResolvedValue(mockDoc);
  });

  it('builds notification doc via helper and persists through repository', async () => {
    const result = await notificationService.createNotification(mockUserId, mockTitle, mockMessage, mockType, mockEventId);

    expect(helper.buildNotificationDoc).toHaveBeenCalledWith(mockUserId, mockTitle, mockMessage, mockType, mockEventId);
    expect(notificationRepository.createNotification).toHaveBeenCalledWith(mockDoc);
    expect(result).toEqual(mockDoc);
  });

  it('works without eventId (null default)', async () => {
    const docNoEvent = { ...mockDoc, eventId: null };
    helper.buildNotificationDoc.mockReturnValue(docNoEvent);
    notificationRepository.createNotification.mockResolvedValue(docNoEvent);

    const result = await notificationService.createNotification(mockUserId, mockTitle, mockMessage, mockType);

    expect(helper.buildNotificationDoc).toHaveBeenCalledWith(mockUserId, mockTitle, mockMessage, mockType, null);
    expect(result.eventId).toBeNull();
  });

  it('propagates repository creation failures', async () => {
    notificationRepository.createNotification.mockRejectedValue(new Error('Insert failed'));

    await expect(notificationService.createNotification(mockUserId, mockTitle, mockMessage, mockType)).rejects.toThrow('Insert failed');
  });

  it('propagates helper errors', async () => {
    helper.buildNotificationDoc.mockImplementation(() => { throw new Error('Helper error'); });

    await expect(notificationService.createNotification(mockUserId, mockTitle, mockMessage, mockType)).rejects.toThrow('Helper error');
  });
});
