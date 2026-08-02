jest.mock('uuid', () => ({ v4: jest.fn() }), { virtual: true });
jest.mock('@/providers/database/user.repository');

const { v4: uuidv4 } = require('uuid');
const userRepository = require('@/providers/database/user.repository');
const helper = require('@/modules/notifications/application/notification-event.helper');

const OENV = { ...process.env };

beforeEach(() => {
  jest.clearAllMocks();
  uuidv4.mockReturnValue('fixed-uuid');
});

afterEach(() => {
  process.env.NOTIFICATION_PROVIDER = OENV.NOTIFICATION_PROVIDER;
  process.env.ONESIGNAL_TARGET_MODE = OENV.ONESIGNAL_TARGET_MODE;
});

describe('buildNotificationDoc', () => {
  beforeAll(() => { jest.useFakeTimers({ now: 1700000000000 }); });
  afterAll(() => { jest.useRealTimers(); });

  it('builds a notification document with correct structure', () => {
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

  it('returns raw id for unknown prefix', () => {
    expect(helper.buildTopicName('unknown', 'abc')).toBe('abc');
  });
});

describe('buildPayloadData', () => {
  it('includes eventId, type, and extra fields', () => {
    const result = helper.buildPayloadData('ticket_purchased', 'evt_1', { ticketId: 'tkt_1' });
    expect(result).toEqual({ eventId: 'evt_1', type: 'ticket_purchased', ticketId: 'tkt_1' });
  });

  it('works without extra', () => {
    const result = helper.buildPayloadData('reminder', 'evt_2');
    expect(result).toEqual({ eventId: 'evt_2', type: 'reminder' });
  });

  it('allows eventId to be null', () => {
    const result = helper.buildPayloadData('general', null);
    expect(result).toEqual({ eventId: null, type: 'general' });
  });
});

describe('isOneSignalExternalId', () => {
  it('returns true when NOTIFICATION_PROVIDER=onesignal and ONESIGNAL_TARGET_MODE=external_id', () => {
    process.env.NOTIFICATION_PROVIDER = 'onesignal';
    process.env.ONESIGNAL_TARGET_MODE = 'external_id';
    expect(helper.isOneSignalExternalId()).toBe(true);
  });

  it('returns false when provider is not onesignal', () => {
    process.env.NOTIFICATION_PROVIDER = 'fcm';
    process.env.ONESIGNAL_TARGET_MODE = 'external_id';
    expect(helper.isOneSignalExternalId()).toBe(false);
  });

  it('returns false when target mode is not external_id', () => {
    process.env.NOTIFICATION_PROVIDER = 'onesignal';
    process.env.ONESIGNAL_TARGET_MODE = 'subscription';
    expect(helper.isOneSignalExternalId()).toBe(false);
  });
});

describe('shouldManageDeviceTopics', () => {
  it('returns true when isOneSignalExternalId is false', () => {
    process.env.NOTIFICATION_PROVIDER = 'onesignal';
    process.env.ONESIGNAL_TARGET_MODE = 'subscription';
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

  it('returns recipientIds as tokens when external_id mode', async () => {
    process.env.NOTIFICATION_PROVIDER = 'onesignal';
    process.env.ONESIGNAL_TARGET_MODE = 'external_id';
    userRepository.getUsersFcmTokens.mockResolvedValue(mockResult);

    const result = await helper.collectMessagingTargets(userIds);

    expect(userRepository.getUsersFcmTokens).toHaveBeenCalledWith(userIds);
    expect(result).toEqual({ recipientIds: mockResult.recipientIds, tokens: mockResult.recipientIds });
  });

  it('returns result as-is when subscription mode', async () => {
    process.env.NOTIFICATION_PROVIDER = 'onesignal';
    process.env.ONESIGNAL_TARGET_MODE = 'subscription';
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

  it('returns recipientIds when external_id mode', async () => {
    process.env.NOTIFICATION_PROVIDER = 'onesignal';
    process.env.ONESIGNAL_TARGET_MODE = 'external_id';
    userRepository.getUsersFcmTokens.mockResolvedValue(mockResult);

    const result = await helper.collectTokens(userIds);

    expect(result).toEqual(mockResult.recipientIds);
  });

  it('returns tokens when subscription mode', async () => {
    process.env.NOTIFICATION_PROVIDER = 'onesignal';
    process.env.ONESIGNAL_TARGET_MODE = 'subscription';
    userRepository.getUsersFcmTokens.mockResolvedValue(mockResult);

    const result = await helper.collectTokens(userIds);

    expect(result).toEqual(mockResult.tokens);
  });

  it('propagates userRepository errors', async () => {
    userRepository.getUsersFcmTokens.mockRejectedValue(new Error('DB error'));

    await expect(helper.collectTokens(userIds)).rejects.toThrow('DB error');
  });
});
