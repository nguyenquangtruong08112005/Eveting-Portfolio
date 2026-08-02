const cronCallbacks = {};
const mockCron = {
  schedule: jest.fn((schedule, cb) => {
    cronCallbacks[schedule] = cb;
    return { start: jest.fn(), stop: jest.fn() };
  }),
};

const mockMomentInstance = {
  add: jest.fn().mockReturnThis(),
  toDate: jest.fn().mockReturnValue(new Date('2026-08-01T00:00:00Z')),
  format: jest.fn().mockReturnValue('08:00'),
};
const mockMoment = jest.fn(() => mockMomentInstance);

const mockGetActiveEventsInDateRange = jest.fn();
const mockGetPaidTicketsByEventId = jest.fn();
const mockCollectTokens = jest.fn();
const mockBuildPayloadData = jest.fn();
const mockSendMulticast = jest.fn();

jest.mock('node-cron', () => mockCron);
jest.mock('moment', () => mockMoment);
jest.mock('@/modules/notifications', () => ({
  fcmService: { sendMulticast: mockSendMulticast },
  helper: { collectTokens: mockCollectTokens, buildPayloadData: mockBuildPayloadData },
}));
jest.mock('@/providers/database/event.repository', () => ({
  getActiveEventsInDateRange: mockGetActiveEventsInDateRange,
}));
jest.mock('@/providers/database/ticket.repository', () => ({
  getPaidTicketsByEventId: mockGetPaidTicketsByEventId,
}));

describe('startReminderJob', () => {
  let consoleSpy;

  beforeAll(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterAll(() => {
    consoleSpy.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    Object.keys(cronCallbacks).forEach(k => delete cronCallbacks[k]);
  });

  it('schedules cron with pattern */30 * * * *', () => {
    const { startReminderJob } = require('../../../src/jobs/reminder.job');
    startReminderJob();

    expect(mockCron.schedule).toHaveBeenCalledTimes(1);
    expect(mockCron.schedule).toHaveBeenCalledWith('*/30 * * * *', expect.any(Function));
  });

  it('returns early when getActiveEventsInDateRange returns null', async () => {
    mockGetActiveEventsInDateRange.mockResolvedValue(null);
    const { startReminderJob } = require('../../../src/jobs/reminder.job');
    startReminderJob();
    await cronCallbacks['*/30 * * * *']();

    expect(mockGetActiveEventsInDateRange).toHaveBeenCalledTimes(1);
    expect(mockGetActiveEventsInDateRange).toHaveBeenCalledWith(
      expect.any(Date), expect.any(Date)
    );
    expect(mockGetPaidTicketsByEventId).not.toHaveBeenCalled();
    expect(mockCollectTokens).not.toHaveBeenCalled();
    expect(mockSendMulticast).not.toHaveBeenCalled();
  });

  it('returns early when events array is empty', async () => {
    mockGetActiveEventsInDateRange.mockResolvedValue([]);
    const { startReminderJob } = require('../../../src/jobs/reminder.job');
    startReminderJob();
    await cronCallbacks['*/30 * * * *']();

    expect(mockGetActiveEventsInDateRange).toHaveBeenCalledTimes(1);
    expect(mockGetPaidTicketsByEventId).not.toHaveBeenCalled();
  });

  it('skips event when no paid tickets', async () => {
    mockGetActiveEventsInDateRange.mockResolvedValue([{ _id: 'evt-1', name: 'Concert' }]);
    mockGetPaidTicketsByEventId.mockResolvedValue([]);
    const { startReminderJob } = require('../../../src/jobs/reminder.job');
    startReminderJob();
    await cronCallbacks['*/30 * * * *']();

    expect(mockGetPaidTicketsByEventId).toHaveBeenCalledWith('evt-1');
    expect(mockCollectTokens).not.toHaveBeenCalled();
    expect(mockSendMulticast).not.toHaveBeenCalled();
  });

  it('deduplicates user IDs passed to collectTokens', async () => {
    mockGetActiveEventsInDateRange.mockResolvedValue([{ _id: 'evt-1', name: 'Concert' }]);
    mockGetPaidTicketsByEventId.mockResolvedValue([
      { userId: 'u1' }, { userId: 'u1' }, { userId: 'u2' },
    ]);
    mockCollectTokens.mockResolvedValue(['tok-1', 'tok-2']);
    mockBuildPayloadData.mockReturnValue({ eventId: 'evt-1', type: 'reminder' });
    mockSendMulticast.mockResolvedValue();
    const { startReminderJob } = require('../../../src/jobs/reminder.job');
    startReminderJob();
    await cronCallbacks['*/30 * * * *']();

    expect(mockCollectTokens).toHaveBeenCalledWith(['u1', 'u2']);
  });

  it('does not send notification when collectTokens returns empty array', async () => {
    mockGetActiveEventsInDateRange.mockResolvedValue([{ _id: 'evt-1', name: 'Concert' }]);
    mockGetPaidTicketsByEventId.mockResolvedValue([{ userId: 'u1' }]);
    mockCollectTokens.mockResolvedValue([]);
    const { startReminderJob } = require('../../../src/jobs/reminder.job');
    startReminderJob();
    await cronCallbacks['*/30 * * * *']();

    expect(mockCollectTokens).toHaveBeenCalledWith(['u1']);
    expect(mockSendMulticast).not.toHaveBeenCalled();
  });

  it('sends multicast with Vietnamese title/body and buildPayloadData', async () => {
    const eventDate = new Date('2026-08-02T08:00:00Z');
    const events = [{ _id: 'evt-1', id: 'evt-1', name: 'Concert ABC', date: eventDate }];
    const tickets = [{ userId: 'u1' }, { userId: 'u2' }];
    const tokens = ['tok-1', 'tok-2'];
    const payloadData = { eventId: 'evt-1', type: 'reminder' };

    mockGetActiveEventsInDateRange.mockResolvedValue(events);
    mockGetPaidTicketsByEventId.mockResolvedValue(tickets);
    mockCollectTokens.mockResolvedValue(tokens);
    mockBuildPayloadData.mockReturnValue(payloadData);
    mockSendMulticast.mockResolvedValue();
    const { startReminderJob } = require('../../../src/jobs/reminder.job');
    startReminderJob();
    await cronCallbacks['*/30 * * * *']();

    expect(mockBuildPayloadData).toHaveBeenCalledWith('reminder', 'evt-1');
    expect(mockSendMulticast).toHaveBeenCalledWith(
      tokens,
      'Sự kiện sắp diễn ra! \u23f0',
      'Concert ABC s\u1ebd b\u1eaft \u0111\u1ea7u v\u00e0o ng\u00e0y mai l\u00fac 08:00.',
      payloadData,
    );
    expect(consoleSpy).toHaveBeenCalledWith('Sent reminders for event Concert ABC to 2 users.');
  });

  it('uses event.id fallback when _id is undefined', async () => {
    mockGetActiveEventsInDateRange.mockResolvedValue([{ id: 'evt-alt', name: 'Alt' }]);
    mockGetPaidTicketsByEventId.mockResolvedValue([{ userId: 'u1' }]);
    mockCollectTokens.mockResolvedValue(['tok-1']);
    mockBuildPayloadData.mockReturnValue({});
    mockSendMulticast.mockResolvedValue();
    const { startReminderJob } = require('../../../src/jobs/reminder.job');
    startReminderJob();
    await cronCallbacks['*/30 * * * *']();

    expect(mockGetPaidTicketsByEventId).toHaveBeenCalledWith('evt-alt');
    expect(mockBuildPayloadData).toHaveBeenCalledWith('reminder', 'evt-alt');
  });

  it('propagates error from event repository', async () => {
    mockGetActiveEventsInDateRange.mockRejectedValue(new Error('repo: events down'));
    const { startReminderJob } = require('../../../src/jobs/reminder.job');
    startReminderJob();
    await expect(cronCallbacks['*/30 * * * *']()).rejects.toThrow('repo: events down');
  });

  it('propagates error from ticket repository', async () => {
    mockGetActiveEventsInDateRange.mockResolvedValue([{ _id: 'evt-1', name: 'Test' }]);
    mockGetPaidTicketsByEventId.mockRejectedValue(new Error('repo: tickets down'));
    const { startReminderJob } = require('../../../src/jobs/reminder.job');
    startReminderJob();
    await expect(cronCallbacks['*/30 * * * *']()).rejects.toThrow('repo: tickets down');
  });

  it('propagates error from sendMulticast', async () => {
    mockGetActiveEventsInDateRange.mockResolvedValue([{ _id: 'evt-1', id: 'evt-1', name: 'C' }]);
    mockGetPaidTicketsByEventId.mockResolvedValue([{ userId: 'u1' }]);
    mockCollectTokens.mockResolvedValue(['tok-1']);
    mockBuildPayloadData.mockReturnValue({});
    mockSendMulticast.mockRejectedValue(new Error('fcm failed'));
    const { startReminderJob } = require('../../../src/jobs/reminder.job');
    startReminderJob();
    await expect(cronCallbacks['*/30 * * * *']()).rejects.toThrow('fcm failed');
  });
});
