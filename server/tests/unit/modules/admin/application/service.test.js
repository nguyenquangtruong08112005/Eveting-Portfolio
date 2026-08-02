/* eslint-env jest */
const { STATUS, VISIBILITY, LIFECYCLE } = require('@/modules/events/domain/event-lifecycle');
// BadRequestError NOT imported here — jest.resetModules() creates a different
// module instance than the one the service loads, breaking instanceof checks.
// Assert by error message string instead.

const mockTransaction = { query: jest.fn() };

const mockEventRepo = {
  getEventLifecycleOwnership: jest.fn(),
  getEventDataById: jest.fn(),
  updateEvent: jest.fn(),
};
const mockFeaturedRepo = {
  getFeaturedProfilesByIds: jest.fn(),
};
const mockAdminRepo = {
  getPendingEvents: jest.fn(),
};
const mockNotifHelper = {
  buildPayloadData: jest.fn(),
  buildTopicName: jest.fn(),
};
const mockNotifications = { fcmService: {}, helper: mockNotifHelper };
const mockPublisher = { publish: jest.fn() };
const mockOutbox = { triggerProcess: jest.fn() };
const mockPostgresClient = { transaction: jest.fn() };
const mockAuditLogger = { logAction: jest.fn() };

jest.mock('@/providers/database/event.repository', () => mockEventRepo);
jest.mock('@/providers/database/featuredProfile.repository', () => mockFeaturedRepo);
jest.mock('@/providers/database/admin.repository', () => mockAdminRepo);
jest.mock('@/modules/notifications', () => mockNotifications);
jest.mock('@/shared/events/event-publisher', () => mockPublisher);
jest.mock('@/shared/events/outbox-processor', () => mockOutbox);
jest.mock('@/providers/database/postgres.client', () => mockPostgresClient);
jest.mock('@/shared/audit/audit-logger', () => mockAuditLogger);

const EVENT_ID = 'evt_001';
const ADMIN_USER = 'admin_1';
const IP_ADDRESS = '192.168.1.1';
const REASON = 'Inappropriate content';

function reloadService() {
  jest.resetModules();
  jest.doMock('@/shared/config/elasticsearch.config', () => null);
  return require('@/modules/admin/application/service');
}

let service;
beforeAll(() => { service = reloadService(); });

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ now: 1700000000000 });
  mockPostgresClient.transaction.mockImplementation(async (cb) => cb(mockTransaction));
});

const NOW = 1700000000000;

describe('getPendingEvents', () => {
  it('forwards page and limit to adminRepository', async () => {
    const rows = [{ id: 'evt_1' }];
    mockAdminRepo.getPendingEvents.mockResolvedValue(rows);
    await expect(service.getPendingEvents(2, 10)).resolves.toBe(rows);
    expect(mockAdminRepo.getPendingEvents).toHaveBeenCalledWith(2, 10);
  });

  it('uses defaults (1, 20)', async () => {
    mockAdminRepo.getPendingEvents.mockResolvedValue([]);
    await service.getPendingEvents();
    expect(mockAdminRepo.getPendingEvents).toHaveBeenCalledWith(1, 20);
  });
});

describe('approveEvent', () => {
  const baseRow = { status: STATUS.PENDING, lifecycle_status: LIFECYCLE.SUBMITTED };
  const baseEventData = { name: 'Test Event', featuredProfileIds: [] };

  beforeEach(() => {
    mockEventRepo.getEventLifecycleOwnership.mockResolvedValue({ ...baseRow });
    mockEventRepo.getEventDataById.mockResolvedValue({ ...baseEventData });
    mockPublisher.publish.mockResolvedValue(undefined);
    mockAuditLogger.logAction.mockResolvedValue(undefined);
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  it('throws Error when event not found', async () => {
    mockEventRepo.getEventLifecycleOwnership.mockResolvedValue(null);
    await expect(service.approveEvent(EVENT_ID)).rejects.toThrow('Event not found');
    expect(mockEventRepo.getEventDataById).not.toHaveBeenCalled();
    expect(mockPostgresClient.transaction).not.toHaveBeenCalled();
    expect(mockOutbox.triggerProcess).not.toHaveBeenCalled();
  });

  it('throws BadRequestError for invalid lifecycle (draft)', async () => {
    mockEventRepo.getEventLifecycleOwnership.mockResolvedValue({
      status: STATUS.PENDING,
      lifecycle_status: LIFECYCLE.DRAFT,
    });
    await expect(service.approveEvent(EVENT_ID)).rejects.toThrow(
      `Cannot approve event with current lifecycle status "${LIFECYCLE.DRAFT}". Event must be submitted first.`
    );
  });

  it('throws BadRequestError for legacy lifecycle where status is not pending and no lifecycle_status', async () => {
    mockEventRepo.getEventLifecycleOwnership.mockResolvedValue({
      status: STATUS.ACTIVE,
      lifecycle_status: null,
    });
    await expect(service.approveEvent(EVENT_ID)).rejects.toThrow(
      'Cannot approve event with current lifecycle status "legacy active". Event must be submitted first.'
    );
  });

  it('handles legacy pending lifecycle (null lifecycle_status + pending status)', async () => {
    mockEventRepo.getEventLifecycleOwnership.mockResolvedValue({
      status: STATUS.PENDING,
      lifecycle_status: null,
    });
    mockEventRepo.getEventDataById.mockResolvedValue({ ...baseEventData });
    await service.approveEvent(EVENT_ID, ADMIN_USER, IP_ADDRESS);
    expect(mockEventRepo.updateEvent).toHaveBeenCalledWith(
      EVENT_ID,
      expect.objectContaining({ status: STATUS.ACTIVE, lifecycleStatus: LIFECYCLE.PUBLISHED }),
      mockTransaction
    );
  });

  it('performs update with correct fields', async () => {
    await service.approveEvent(EVENT_ID, ADMIN_USER, IP_ADDRESS);
    expect(mockEventRepo.updateEvent).toHaveBeenCalledWith(
      EVENT_ID,
      {
        status: STATUS.ACTIVE,
        visibility: VISIBILITY.PUBLIC,
        lifecycleStatus: LIFECYCLE.PUBLISHED,
        approvedAt: NOW,
        lastUpdatedAt: NOW,
      },
      mockTransaction
    );
  });

  it('publishes search_index with action index', async () => {
    await service.approveEvent(EVENT_ID);
    expect(mockPublisher.publish).toHaveBeenCalledWith(
      'search_index',
      { action: 'index', eventId: EVENT_ID },
      mockTransaction
    );
  });

  it('publishes artist topic notifications for each featured profile', async () => {
    const profileIds = ['artist_1', 'artist_2'];
    mockEventRepo.getEventDataById.mockResolvedValue({
      name: 'Great Event',
      featuredProfileIds: profileIds,
    });
    mockNotifHelper.buildPayloadData.mockReturnValue({ eventId: EVENT_ID, type: 'new_event' });
    mockNotifHelper.buildTopicName.mockImplementation((prefix, id) => `${prefix}_${id}`);

    await service.approveEvent(EVENT_ID, ADMIN_USER);

    expect(mockNotifHelper.buildPayloadData).toHaveBeenCalledWith('new_event', EVENT_ID);
    expect(mockNotifHelper.buildTopicName).toHaveBeenNthCalledWith(1, 'artist', 'artist_1');
    expect(mockNotifHelper.buildTopicName).toHaveBeenNthCalledWith(2, 'artist', 'artist_2');

    const expectedNotif = {
      channel: 'push',
      topic: 'artist_artist_1',
      title: 'Sự kiện mới!',
      body: 'Great Event vừa được công bố. Đặt vé ngay!',
      data: { eventId: EVENT_ID, type: 'new_event' },
    };
    expect(mockPublisher.publish).toHaveBeenCalledWith('notification', expectedNotif, mockTransaction);

    expectedNotif.topic = 'artist_artist_2';
    expect(mockPublisher.publish).toHaveBeenCalledWith('notification', expectedNotif, mockTransaction);

    expect(mockPublisher.publish).toHaveBeenCalledTimes(3); // search_index + 2 notifications
  });

  it('does not publish notifications when no featured profiles', async () => {
    await service.approveEvent(EVENT_ID);
    const notificationCalls = mockPublisher.publish.mock.calls.filter(c => c[0] === 'notification');
    expect(notificationCalls).toHaveLength(0);
  });

  it('logs audit record with correct payload', async () => {
    mockEventRepo.getEventLifecycleOwnership.mockResolvedValue({
      status: STATUS.PENDING,
      lifecycle_status: LIFECYCLE.SUBMITTED,
    });
    await service.approveEvent(EVENT_ID, ADMIN_USER, IP_ADDRESS);
    expect(mockAuditLogger.logAction).toHaveBeenCalledWith(
      mockTransaction,
      {
        userId: ADMIN_USER,
        action: 'EVENT_APPROVED',
        resourceType: 'event',
        resourceId: EVENT_ID,
        changes: { before: { status: STATUS.PENDING }, after: { status: STATUS.ACTIVE } },
        ipAddress: IP_ADDRESS,
      }
    );
  });

  it('triggers outbox processor after transaction', async () => {
    await service.approveEvent(EVENT_ID);
    expect(mockOutbox.triggerProcess).toHaveBeenCalledTimes(1);
  });

  it('uses default adminUserId and ipAddress', async () => {
    await service.approveEvent(EVENT_ID);
    expect(mockAuditLogger.logAction).toHaveBeenCalledWith(
      mockTransaction,
      expect.objectContaining({ userId: 'system_admin', ipAddress: null })
    );
  });

  it('returns success message', async () => {
    const result = await service.approveEvent(EVENT_ID);
    expect(result).toEqual({ success: true, message: 'Event approved and published.' });
  });

  it('survives featured profile name lookup errors in internal buildElasticData', async () => {
    mockFeaturedRepo.getFeaturedProfilesByIds.mockRejectedValue(new Error('DB error'));
    mockEventRepo.getEventDataById.mockResolvedValue({
      name: 'Test Event',
      featuredProfileIds: ['artist_1'],
    });
    mockNotifHelper.buildPayloadData.mockReturnValue({});
    mockNotifHelper.buildTopicName.mockReturnValue('topic');
    await expect(service.approveEvent(EVENT_ID)).resolves.toEqual(
      { success: true, message: 'Event approved and published.' }
    );
  });
});

describe('rejectEvent', () => {
  const baseRow = { status: STATUS.PENDING, lifecycle_status: LIFECYCLE.SUBMITTED };

  beforeEach(() => {
    mockEventRepo.getEventLifecycleOwnership.mockResolvedValue({ ...baseRow });
    mockPublisher.publish.mockResolvedValue(undefined);
    mockAuditLogger.logAction.mockResolvedValue(undefined);
  });

  it('throws Error when event not found', async () => {
    mockEventRepo.getEventLifecycleOwnership.mockResolvedValue(null);
    await expect(service.rejectEvent(EVENT_ID, REASON)).rejects.toThrow('Event not found');
    expect(mockPostgresClient.transaction).not.toHaveBeenCalled();
    expect(mockOutbox.triggerProcess).not.toHaveBeenCalled();
  });

  it('throws BadRequestError for invalid lifecycle (draft)', async () => {
    mockEventRepo.getEventLifecycleOwnership.mockResolvedValue({
      status: STATUS.PENDING,
      lifecycle_status: LIFECYCLE.DRAFT,
    });
    await expect(service.rejectEvent(EVENT_ID, REASON)).rejects.toThrow(
      `Cannot reject event with current lifecycle status "${LIFECYCLE.DRAFT}". Event must be submitted first.`
    );
  });

  it('handles legacy pending lifecycle', async () => {
    mockEventRepo.getEventLifecycleOwnership.mockResolvedValue({
      status: STATUS.PENDING,
      lifecycle_status: null,
    });
    await service.rejectEvent(EVENT_ID, REASON, ADMIN_USER, IP_ADDRESS);
    expect(mockEventRepo.updateEvent).toHaveBeenCalledWith(
      EVENT_ID,
      expect.objectContaining({ status: STATUS.REJECTED, lifecycleStatus: LIFECYCLE.REJECTED }),
      mockTransaction
    );
  });

  it('performs update with correct fields', async () => {
    await service.rejectEvent(EVENT_ID, REASON, ADMIN_USER, IP_ADDRESS);
    expect(mockEventRepo.updateEvent).toHaveBeenCalledWith(
      EVENT_ID,
      {
        status: STATUS.REJECTED,
        lifecycleStatus: LIFECYCLE.REJECTED,
        rejectReason: REASON,
        rejectedAt: NOW,
        lastUpdatedAt: NOW,
      },
      mockTransaction
    );
  });

  it('publishes search_index with action delete', async () => {
    await service.rejectEvent(EVENT_ID, REASON);
    expect(mockPublisher.publish).toHaveBeenCalledWith(
      'search_index',
      { action: 'delete', eventId: EVENT_ID },
      mockTransaction
    );
  });

  it('logs audit record with reason', async () => {
    mockEventRepo.getEventLifecycleOwnership.mockResolvedValue({
      status: STATUS.PENDING,
      lifecycle_status: LIFECYCLE.SUBMITTED,
    });
    await service.rejectEvent(EVENT_ID, REASON, ADMIN_USER, IP_ADDRESS);
    expect(mockAuditLogger.logAction).toHaveBeenCalledWith(
      mockTransaction,
      {
        userId: ADMIN_USER,
        action: 'EVENT_REJECTED',
        resourceType: 'event',
        resourceId: EVENT_ID,
        changes: {
          reason: REASON,
          before: { status: STATUS.PENDING },
          after: { status: STATUS.REJECTED },
        },
        ipAddress: IP_ADDRESS,
      }
    );
  });

  it('triggers outbox processor after transaction', async () => {
    await service.rejectEvent(EVENT_ID, REASON);
    expect(mockOutbox.triggerProcess).toHaveBeenCalledTimes(1);
  });

  it('uses default adminUserId and ipAddress', async () => {
    await service.rejectEvent(EVENT_ID, REASON);
    expect(mockAuditLogger.logAction).toHaveBeenCalledWith(
      mockTransaction,
      expect.objectContaining({ userId: 'system_admin', ipAddress: null })
    );
  });

  it('returns success message', async () => {
    const result = await service.rejectEvent(EVENT_ID, REASON);
    expect(result).toEqual({ success: true, message: 'Event rejected.' });
  });
});
