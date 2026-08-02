process.env.OUTBOX_WORKER_ENABLED = 'false';

const mockQuery = jest.fn();
const mockFcmSendToTopic = jest.fn();
const mockFcmSendMulticast = jest.fn();
const mockGetIo = jest.fn();
const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
const mockEsDelete = jest.fn();
const mockEsIndex = jest.fn();
const mockBuildElasticData = jest.fn();
const mockGetEventById = jest.fn();
const mockInvalidateEvent = jest.fn();
const mockSendEmail = jest.fn();
const mockNotifyUpdate = jest.fn();
const mockNotifyCancellation = jest.fn();

jest.mock('@/providers/database/postgres.client', () => ({
  query: mockQuery,
  transaction: jest.fn(),
  getPool: jest.fn(),
}));

jest.mock('@/modules/notifications/infrastructure/providers/fcm.service', () => ({
  sendToTopic: mockFcmSendToTopic,
  sendMulticast: mockFcmSendMulticast,
}));

jest.mock('@/shared/socket/socket-server', () => ({
  getIo: mockGetIo,
}));

jest.mock('@/shared/logger', () => mockLogger);

jest.mock('@/shared/config/elasticsearch.config', () => ({
  delete: mockEsDelete,
  index: mockEsIndex,
}));

jest.mock('@/modules/events/application/helpers/event-mappers', () => ({
  buildElasticData: mockBuildElasticData,
}));

jest.mock('@/providers/database/event.repository', () => ({
  getEventById: mockGetEventById,
}));

jest.mock('@/shared/cache/namespace-helpers', () => ({
  invalidateEvent: mockInvalidateEvent,
}));

jest.mock('@/providers/email', () => ({
  sendEmail: mockSendEmail,
}));

jest.mock('@/modules/events/application/helpers/notification-sender', () => ({
  notifyAttendeesAboutUpdate: mockNotifyUpdate,
  notifyAttendeesAboutCancellation: mockNotifyCancellation,
}));

const { processPending, PROCESSORS } = require('@/shared/events/outbox-processor');

function makeRow(overrides = {}) {
  return {
    id: 'row-1',
    event_type: 'notification',
    payload: { channel: 'push', topic: 'test', title: 'Hi', body: 'Hello', data: {} },
    retry_count: 0,
    ...overrides,
  };
}

describe('outbox-processor', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockEsDelete.mockResolvedValue();
    mockEsIndex.mockResolvedValue();
    mockBuildElasticData.mockResolvedValue({ name: 'test' });
    mockGetEventById.mockResolvedValue({ status: 'active', visibility: 'public' });
  });

  describe('PROCESSORS.notification', () => {
    it('sends push via topic', async () => {
      await PROCESSORS.notification({ channel: 'push', topic: 'news', title: 'T', body: 'B', data: { k: 1 } });
      expect(mockFcmSendToTopic).toHaveBeenCalledWith('news', 'T', 'B', { k: 1 });
    });

    it('sends push via target', async () => {
      await PROCESSORS.notification({ channel: 'push', target: 'token-1', title: 'T', body: 'B', data: {} });
      expect(mockFcmSendMulticast).toHaveBeenCalledWith(['token-1'], 'T', 'B', {});
    });

    it('no-ops push without topic or target', async () => {
      await PROCESSORS.notification({ channel: 'push', title: 'T', body: 'B', data: {} });
      expect(mockFcmSendToTopic).not.toHaveBeenCalled();
      expect(mockFcmSendMulticast).not.toHaveBeenCalled();
    });

    it('emits socket event to target', async () => {
      const emit = jest.fn();
      const to = jest.fn(() => ({ emit }));
      mockGetIo.mockReturnValue({ to });
      await PROCESSORS.notification({ channel: 'socket', target: 'room-1', title: 'T', body: 'B', data: { k: 2 } });
      expect(to).toHaveBeenCalledWith('room-1');
      expect(emit).toHaveBeenCalledWith('notification', { title: 'T', body: 'B', data: { k: 2 } });
    });

    it('emits socket event with custom event name', async () => {
      const emit = jest.fn();
      const to = jest.fn(() => ({ emit }));
      mockGetIo.mockReturnValue({ to });
      await PROCESSORS.notification({ channel: 'socket', target: 'room-1', event: 'custom_event', title: 'T', body: 'B', data: {} });
      expect(emit).toHaveBeenCalledWith('custom_event', { title: 'T', body: 'B', data: {} });
    });

    it('skips socket emit when io is null', async () => {
      mockGetIo.mockReturnValue(null);
      await PROCESSORS.notification({ channel: 'socket', target: 'room-1', title: 'T', body: 'B', data: {} });
      expect(mockGetIo).toHaveReturnedWith(null);
    });

    it('skips socket emit when target is missing', async () => {
      const to = jest.fn();
      mockGetIo.mockReturnValue({ to });
      await PROCESSORS.notification({ channel: 'socket', title: 'T', body: 'B', data: {} });
      expect(to).not.toHaveBeenCalled();
    });

    it('sends email with escaped HTML from body', async () => {
      await PROCESSORS.notification({ channel: 'email', target: 'a@b.com', title: 'Subj', body: '<script>alert(1)</script>', data: {} });
      expect(mockSendEmail).toHaveBeenCalledWith({
        to: 'a@b.com',
        subject: 'Subj',
        text: '<script>alert(1)</script>',
        html: '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>',
      });
    });

    it('sends email with provided html directly', async () => {
      await PROCESSORS.notification({ channel: 'email', target: 'a@b.com', title: 'Subj', body: 'B', html: '<b>safe</b>', data: {} });
      expect(mockSendEmail).toHaveBeenCalledWith({
        to: 'a@b.com',
        subject: 'Subj',
        text: 'B',
        html: '<b>safe</b>',
      });
    });

    it('sends email without html when body is empty', async () => {
      await PROCESSORS.notification({ channel: 'email', target: 'a@b.com', title: 'Subj', data: {} });
      expect(mockSendEmail).toHaveBeenCalledWith({
        to: 'a@b.com',
        subject: 'Subj',
        text: undefined,
        html: undefined,
      });
    });

    it('calls notifyAttendeesAboutUpdate for event_update channel', async () => {
      await PROCESSORS.notification({ channel: 'event_update', eventId: 'evt-1', eventName: 'Concert' });
      expect(mockNotifyUpdate).toHaveBeenCalledWith('evt-1', 'Concert');
    });

    it('calls notifyAttendeesAboutCancellation for event_cancellation channel', async () => {
      await PROCESSORS.notification({ channel: 'event_cancellation', eventId: 'evt-1', eventName: 'Concert' });
      expect(mockNotifyCancellation).toHaveBeenCalledWith('evt-1', 'Concert');
    });

    it('logs warning for unknown channel', async () => {
      await PROCESSORS.notification({ channel: 'fax', title: 'T' });
      expect(mockLogger.warn).toHaveBeenCalledWith('[Outbox Processor] Unknown notification channel: fax');
    });
  });

  describe('PROCESSORS.search_index', () => {
    beforeEach(() => {
      mockEsDelete.mockResolvedValue();
      mockEsIndex.mockResolvedValue();
      mockBuildElasticData.mockResolvedValue({ name: 'test' });
      mockGetEventById.mockResolvedValue({ status: 'active', visibility: 'public' });
    });

    it('deletes from index and invalidates cache', async () => {
      await PROCESSORS.search_index({ action: 'delete', eventId: 'evt-1' });
      expect(mockEsDelete).toHaveBeenCalledWith({ index: 'events', id: 'evt-1' });
      expect(mockInvalidateEvent).toHaveBeenCalledWith('evt-1');
    });

    it('handles 404 on delete gracefully', async () => {
      const err = new Error('Not Found');
      err.meta = { statusCode: 404 };
      mockEsDelete.mockRejectedValue(err);
      await PROCESSORS.search_index({ action: 'delete', eventId: 'evt-1' });
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('already deleted'));
    });

    it('rethrows non-404 delete error', async () => {
      mockEsDelete.mockRejectedValue(new Error('connection refused'));
      await expect(PROCESSORS.search_index({ action: 'delete', eventId: 'evt-1' })).rejects.toThrow('connection refused');
    });

    it('indexes event when active and public', async () => {
      mockGetEventById.mockResolvedValue({ id: 'evt-1', name: 'Concert', status: 'active', visibility: 'public' });
      mockBuildElasticData.mockResolvedValue({ name: 'Concert Enhanced' });
      await PROCESSORS.search_index({ action: 'index', eventId: 'evt-1' });
      expect(mockEsIndex).toHaveBeenCalledWith({ index: 'events', id: 'evt-1', body: { name: 'Concert Enhanced' } });
      expect(mockInvalidateEvent).toHaveBeenCalledWith('evt-1');
    });

    it('removes from index when event not found in DB', async () => {
      mockGetEventById.mockResolvedValue(null);
      await PROCESSORS.search_index({ action: 'index', eventId: 'evt-1' });
      expect(mockEsDelete).toHaveBeenCalledWith({ index: 'events', id: 'evt-1' });
      expect(mockEsIndex).not.toHaveBeenCalled();
    });

    it('removes from index when event is not active', async () => {
      mockGetEventById.mockResolvedValue({ id: 'evt-1', status: 'inactive', visibility: 'public' });
      await PROCESSORS.search_index({ action: 'index', eventId: 'evt-1' });
      expect(mockEsDelete).toHaveBeenCalledWith({ index: 'events', id: 'evt-1' });
      expect(mockEsIndex).not.toHaveBeenCalled();
    });

    it('removes from index when event is not public', async () => {
      mockGetEventById.mockResolvedValue({ id: 'evt-1', status: 'active', visibility: 'private' });
      await PROCESSORS.search_index({ action: 'index', eventId: 'evt-1' });
      expect(mockEsDelete).toHaveBeenCalledWith({ index: 'events', id: 'evt-1' });
      expect(mockEsIndex).not.toHaveBeenCalled();
    });

    it('handles esClient not configured by logging warning', async () => {
      let P;
      jest.isolateModules(() => {
        jest.resetModules();
        jest.mock('@/shared/config/elasticsearch.config', () => null);
        P = require('@/shared/events/outbox-processor').PROCESSORS;
      });
      await P.search_index({ action: 'index', eventId: 'evt-1' });
      expect(mockLogger.warn).toHaveBeenCalledWith('[Elastic Search Index Projector] esClient is not configured. Skipping.');
    });
  });

  describe('processPending', () => {
    it('processes a row and marks completed', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [makeRow()] })
        .mockResolvedValueOnce({ rows: [] });
      await processPending();
      expect(mockFcmSendToTopic).toHaveBeenCalled();
      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockQuery.mock.calls[1][0]).toContain("status = 'completed'");
    });

    it('logs warning for unknown event type and still marks completed', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [makeRow({ event_type: 'unknown_type' })] })
        .mockResolvedValueOnce({ rows: [] });
      await processPending();
      expect(mockLogger.warn).toHaveBeenCalledWith('[Outbox Processor] No handler for event type: unknown_type');
      expect(mockQuery.mock.calls[1][0]).toContain("status = 'completed'");
    });

    it('schedules retry when error and retries remain', async () => {
      const processorError = new Error('temporary failure');
      mockFcmSendToTopic.mockRejectedValue(processorError);
      mockQuery
        .mockResolvedValueOnce({ rows: [makeRow({ retry_count: 2 })] })
        .mockResolvedValueOnce({ rows: [] });
      await processPending();
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('temporary failure'));
      expect(mockQuery.mock.calls[1][0]).toContain("status = 'pending'");
      expect(mockQuery.mock.calls[1][0]).toContain('retry_count = $1');
    });

    it('moves to DLQ and marks failed when retries exhausted', async () => {
      mockFcmSendToTopic.mockRejectedValue(new Error('permanent failure'));
      mockQuery
        .mockResolvedValueOnce({ rows: [makeRow({ retry_count: 4 })] })
        .mockResolvedValueOnce({ rows: [{ id: 'dlq_row-1' }] })
        .mockResolvedValueOnce({ rows: [] });
      await processPending();
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('permanent failure'));
      expect(mockQuery.mock.calls[1][0]).toContain('INSERT INTO outbox_dlq');
      expect(mockQuery.mock.calls[2][0]).toContain("status = 'failed'");
    });

    it('marks failed even when DLQ insert conflicts', async () => {
      mockFcmSendToTopic.mockRejectedValue(new Error('permanent failure'));
      mockQuery
        .mockResolvedValueOnce({ rows: [makeRow({ retry_count: 4 })] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });
      await processPending();
      expect(mockLogger.info).not.toHaveBeenCalledWith(expect.stringContaining('Moved'));
      expect(mockQuery.mock.calls[2][0]).toContain("status = 'failed'");
    });

    it('handles malformed payload (null) through error path', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [makeRow({ payload: null })] })
        .mockResolvedValueOnce({ rows: [] });
      await processPending();
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('row-1'));
    });

    it('returns early when no rows claimed', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await processPending();
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('guards against reentrant calls', async () => {
      let resolveClaim;
      mockQuery.mockImplementation(() => new Promise((r) => { resolveClaim = r; }));
      const p1 = processPending();
      const p2 = processPending();
      await expect(p2).resolves.toBeUndefined();
      resolveClaim({ rows: [] });
      await p1;
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('catches and logs runner error when claimBatch fails', async () => {
      mockQuery.mockRejectedValue(new Error('db connection lost'));
      await processPending();
      expect(mockLogger.error).toHaveBeenCalledWith('[Outbox Processor] Runner error: db connection lost');
    });

    it('processes multiple rows sequentially', async () => {
      mockFcmSendToTopic.mockRejectedValue(new Error('fail'));
      mockQuery
        .mockResolvedValueOnce({ rows: [
          makeRow({ id: 'row-1', retry_count: 0 }),
          makeRow({ id: 'row-2', retry_count: 4 }),
        ]})
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'dlq_row-2' }] })
        .mockResolvedValueOnce({ rows: [] });
      await processPending();
      expect(mockQuery.mock.calls[1][0]).toContain("status = 'pending'");
      expect(mockQuery.mock.calls[2][0]).toContain('INSERT INTO outbox_dlq');
      expect(mockQuery.mock.calls[3][0]).toContain("status = 'failed'");
    });
  });
});
