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

jest.mock('../../../src/alias-bootstrap', () => ({}));
jest.mock('dotenv', () => ({ config: jest.fn() }));

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

const { processPending, startPolling, stopPolling, PROCESSORS } = require('@/jobs/outbox-publisher');

function makeRow(overrides = {}) {
  return {
    id: 'row-1',
    event_type: 'notification',
    payload: { channel: 'push', topic: 'test', title: 'Hi', body: 'Hello', data: {} },
    retry_count: 0,
    ...overrides,
  };
}

function flush() {
  return new Promise(resolve => setImmediate(resolve));
}

describe('outbox-publisher', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockEsDelete.mockResolvedValue();
    mockEsIndex.mockResolvedValue();
    mockBuildElasticData.mockResolvedValue({ name: 'test' });
    mockGetEventById.mockResolvedValue({ status: 'active', visibility: 'public' });
  });

  describe('processPending', () => {
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

    it('returns early when no rows claimed', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await processPending();
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('processes a row and marks completed', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [makeRow()] })
        .mockResolvedValueOnce({ rows: [] });
      await processPending();
      expect(mockFcmSendToTopic).toHaveBeenCalledWith('test', 'Hi', 'Hello', {});
      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockQuery.mock.calls[1][0]).toContain("status = 'completed'");
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Completed outbox row-1'));
    });

    it('processes notification socket channel', async () => {
      const emit = jest.fn();
      const to = jest.fn(() => ({ emit }));
      mockGetIo.mockReturnValue({ to });
      mockQuery
        .mockResolvedValueOnce({ rows: [makeRow({ payload: { channel: 'socket', target: 'room-1', title: 'T', body: 'B', data: { k: 1 } } })] })
        .mockResolvedValueOnce({ rows: [] });
      await processPending();
      expect(to).toHaveBeenCalledWith('room-1');
      expect(emit).toHaveBeenCalledWith('notification', { title: 'T', body: 'B', data: { k: 1 } });
    });

    it('processes search_index row', async () => {
      mockGetEventById.mockResolvedValue({ id: 'evt-1', name: 'Concert', status: 'active', visibility: 'public' });
      mockQuery
        .mockResolvedValueOnce({ rows: [makeRow({ event_type: 'search_index', payload: { action: 'index', eventId: 'evt-1' } })] })
        .mockResolvedValueOnce({ rows: [] });
      await processPending();
      expect(mockInvalidateEvent).toHaveBeenCalledWith('evt-1');
      expect(mockEsIndex).toHaveBeenCalledWith({ index: 'events', id: 'evt-1', body: { name: 'test' } });
    });

    it('logs warning for unknown event type and marks completed', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [makeRow({ event_type: 'unknown_type' })] })
        .mockResolvedValueOnce({ rows: [] });
      await processPending();
      expect(mockLogger.warn).toHaveBeenCalledWith('[OutboxPublisher] No processor for event_type: unknown_type');
      expect(mockQuery.mock.calls[1][0]).toContain("status = 'completed'");
    });

    it('schedules retry when error and retries remain', async () => {
      mockFcmSendToTopic.mockRejectedValue(new Error('temporary failure'));
      mockQuery
        .mockResolvedValueOnce({ rows: [makeRow({ retry_count: 2 })] })
        .mockResolvedValueOnce({ rows: [] });
      await processPending();
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('temporary failure'));
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('retry 3/5'));
      expect(mockQuery.mock.calls[1][0]).toContain("status = 'pending'");
      expect(mockQuery.mock.calls[1][0]).toContain('retry_count = $1');
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Scheduled retry 3/5'));
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
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Moved row-1 to DLQ'));
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

    it('handles malformed payload through error path', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [makeRow({ payload: null })] })
        .mockResolvedValueOnce({ rows: [] });
      await processPending();
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('row-1'));
    });

    it('catches and logs claimBatch error', async () => {
      mockQuery.mockRejectedValue(new Error('db connection lost'));
      await processPending();
      expect(mockLogger.error).toHaveBeenCalledWith('[OutboxPublisher] processPending error: db connection lost');
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

  describe('PROCESSORS.notification', () => {
    it('sends push via topic', async () => {
      await PROCESSORS.notification({ channel: 'push', topic: 'news', title: 'T', body: 'B', data: { k: 1 } });
      expect(mockFcmSendToTopic).toHaveBeenCalledWith('news', 'T', 'B', { k: 1 });
    });

    it('sends push via target', async () => {
      await PROCESSORS.notification({ channel: 'push', target: 'token-1', title: 'T', body: 'B', data: {} });
      expect(mockFcmSendMulticast).toHaveBeenCalledWith(['token-1'], 'T', 'B', {});
    });

    it('logs warning for unknown channel', async () => {
      await PROCESSORS.notification({ channel: 'fax', title: 'T' });
      expect(mockLogger.warn).toHaveBeenCalledWith('[OutboxPublisher] Unknown notification channel: fax');
    });
  });

  describe('PROCESSORS.search_index', () => {
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

    it('indexes event when active and public', async () => {
      mockGetEventById.mockResolvedValue({ id: 'evt-1', name: 'Concert', status: 'active', visibility: 'public' });
      mockBuildElasticData.mockResolvedValue({ name: 'Concert Enhanced' });
      await PROCESSORS.search_index({ action: 'index', eventId: 'evt-1' });
      expect(mockEsIndex).toHaveBeenCalledWith({ index: 'events', id: 'evt-1', body: { name: 'Concert Enhanced' } });
    });

    it('removes from index when event not found in DB', async () => {
      mockGetEventById.mockResolvedValue(null);
      await PROCESSORS.search_index({ action: 'index', eventId: 'evt-1' });
      expect(mockEsDelete).toHaveBeenCalledWith({ index: 'events', id: 'evt-1' });
      expect(mockEsIndex).not.toHaveBeenCalled();
    });
  });

  describe('startPolling / stopPolling', () => {
    it('logs disabled when OUTBOX_WORKER_ENABLED is false', () => {
      jest.isolateModules(() => {
        process.env.OUTBOX_WORKER_ENABLED = 'false';
        require('@/jobs/outbox-publisher').startPolling();
      });
      expect(mockLogger.info).toHaveBeenCalledWith('[OutboxPublisher] Worker disabled via OUTBOX_WORKER_ENABLED=false');
    });

    it('runs once with --once flag and does not set timer', async () => {
      const origArgv = process.argv;
      process.argv = [...origArgv, '--once'];
      mockQuery.mockResolvedValue({ rows: [] });
      jest.isolateModules(() => {
        process.env.OUTBOX_WORKER_ENABLED = 'true';
        require('@/jobs/outbox-publisher').startPolling();
      });
      process.argv = origArgv;
      await flush();
      await flush();
      await flush();
      expect(mockQuery).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('[OutboxPublisher] --once run complete');
    });

    it('processes one batch in --once mode with a row', async () => {
      const origArgv = process.argv;
      process.argv = [...origArgv, '--once'];
      mockQuery
        .mockResolvedValueOnce({ rows: [makeRow()] })
        .mockResolvedValueOnce({ rows: [] });
      jest.isolateModules(() => {
        process.env.OUTBOX_WORKER_ENABLED = 'true';
        require('@/jobs/outbox-publisher').startPolling();
      });
      process.argv = origArgv;
      await flush();
      await flush();
      await flush();
      await flush();
      await flush();
      await flush();
      await flush();
      await flush();
      expect(mockFcmSendToTopic).toHaveBeenCalled();
    });

    it('starts polling loop and calls processPending', async () => {
      jest.useFakeTimers();
      mockQuery.mockResolvedValue({ rows: [] });
      let mod;
      jest.isolateModules(() => {
        process.env.OUTBOX_WORKER_ENABLED = 'true';
        mod = require('@/jobs/outbox-publisher');
        mod.startPolling();
      });
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      expect(mockQuery).toHaveBeenCalled();
      mod.stopPolling();
      jest.useRealTimers();
    });

    it('stopPolling logs shutdown message', () => {
      stopPolling();
      expect(mockLogger.info).toHaveBeenCalledWith('[OutboxPublisher] Polling stopped');
    });

    it('stopPolling clears the timer when polling', async () => {
      jest.useFakeTimers();
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      mockQuery.mockResolvedValue({ rows: [] });
      let mod;
      jest.isolateModules(() => {
        process.env.OUTBOX_WORKER_ENABLED = 'true';
        mod = require('@/jobs/outbox-publisher');
        mod.startPolling();
      });
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      mod.stopPolling();
      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
      jest.useRealTimers();
    });
  });

  describe('notification channel branches', () => {
    it('sends email with the provided html', async () => {
      await PROCESSORS.notification({ channel: 'email', target: 'a@b.c', title: 'S', body: 'B', html: '<b>hi</b>' });
      expect(mockSendEmail).toHaveBeenCalledWith({ to: 'a@b.c', subject: 'S', text: 'B', html: '<b>hi</b>' });
    });

    it('escapes body into html fallback when html is absent', async () => {
      await PROCESSORS.notification({ channel: 'email', target: 'a@b.c', title: 'S', body: 'B <i>!</i>' });
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ html: '<p>B &lt;i&gt;!&lt;/i&gt;</p>' })
      );
    });

    it('omits html when neither html nor body is present', async () => {
      await PROCESSORS.notification({ channel: 'email', target: 'a@b.c', title: 'S' });
      expect(mockSendEmail).toHaveBeenCalledWith({ to: 'a@b.c', subject: 'S', text: undefined, html: undefined });
    });

    it('does nothing for push without a topic or target', async () => {
      await PROCESSORS.notification({ channel: 'push', title: 'T' });
      expect(mockFcmSendToTopic).not.toHaveBeenCalled();
      expect(mockFcmSendMulticast).not.toHaveBeenCalled();
    });

    it('does nothing for socket when io is unavailable', async () => {
      mockGetIo.mockReturnValue(null);
      await PROCESSORS.notification({ channel: 'socket', target: 'room-1', title: 'T' });
      expect(mockGetIo).toHaveBeenCalled();
    });

    it('notifies attendees about an event update', async () => {
      await PROCESSORS.notification({ channel: 'event_update', eventId: 'evt-1', eventName: 'Concert' });
      expect(mockNotifyUpdate).toHaveBeenCalledWith('evt-1', 'Concert');
    });

    it('notifies attendees about an event cancellation', async () => {
      await PROCESSORS.notification({ channel: 'event_cancellation', eventId: 'evt-1', eventName: 'Concert' });
      expect(mockNotifyCancellation).toHaveBeenCalledWith('evt-1', 'Concert');
    });
  });

  describe('search_index branches', () => {
    it('rethrows non-404 delete errors', async () => {
      mockEsDelete.mockRejectedValue(new Error('ES unreachable'));
      await expect(PROCESSORS.search_index({ action: 'delete', eventId: 'evt-1' }))
        .rejects.toThrow('ES unreachable');
    });

    it('no-ops for an unrecognized action', async () => {
      await PROCESSORS.search_index({ action: 'update', eventId: 'evt-1' });
      expect(mockEsDelete).not.toHaveBeenCalled();
      expect(mockEsIndex).not.toHaveBeenCalled();
    });

    it('removes inactive events from the index', async () => {
      mockGetEventById.mockResolvedValue({ id: 'evt-1', status: 'draft', visibility: 'public' });
      await PROCESSORS.search_index({ action: 'index', eventId: 'evt-1' });
      expect(mockEsDelete).toHaveBeenCalledWith({ index: 'events', id: 'evt-1' });
      expect(mockEsIndex).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('status=draft'));
    });

    it('removes private events from the index', async () => {
      mockGetEventById.mockResolvedValue({ id: 'evt-1', status: 'active', visibility: 'public', isPrivate: true });
      await PROCESSORS.search_index({ action: 'index', eventId: 'evt-1' });
      expect(mockEsDelete).toHaveBeenCalledWith({ index: 'events', id: 'evt-1' });
      expect(mockEsIndex).not.toHaveBeenCalled();
    });

    it('skips indexing when esClient is not configured', async () => {
      jest.resetModules();
      jest.doMock('@/shared/config/elasticsearch.config', () => null);
      const mod = require('@/jobs/outbox-publisher');
      await mod.PROCESSORS.search_index({ action: 'index', eventId: 'evt-1' });
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('esClient not configured'));
      expect(mockEsIndex).not.toHaveBeenCalled();
    });
  });
});
