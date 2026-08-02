'use strict';

const mockNotificationService = {
  getNotificationsByUserId: jest.fn(),
  markNotificationAsRead: jest.fn(),
};

jest.mock('@/modules/notifications/application/service', () => mockNotificationService);

const {
  getUserNotifications,
  markAsRead,
} = require('@/modules/notifications/api/controller');

const uid = 'user_001';

function mockReq(overrides = {}) {
  return {
    user: { uid },
    params: {},
    body: {},
    query: {},
    ...overrides,
  };
}

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getUserNotifications', () => {
  it('returns notifications with 200', async () => {
    const notifications = [{ id: 'notif_1', title: 'New event' }];
    mockNotificationService.getNotificationsByUserId.mockResolvedValue(notifications);
    const req = mockReq();
    const res = mockRes();

    await getUserNotifications(req, res);

    expect(mockNotificationService.getNotificationsByUserId).toHaveBeenCalledWith(uid);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(notifications);
  });

  it('returns 500 on service error', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockNotificationService.getNotificationsByUserId.mockRejectedValue(new Error('DB down'));
    const req = mockReq();
    const res = mockRes();

    await getUserNotifications(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: 'Internal Server Error' });
    spy.mockRestore();
  });
});

describe('markAsRead', () => {
  const notificationId = 'notif_001';

  it('marks notification as read and returns 200', async () => {
    const updated = { id: notificationId, read: true };
    mockNotificationService.markNotificationAsRead.mockResolvedValue(updated);
    const req = mockReq({ params: { notificationId } });
    const res = mockRes();

    await markAsRead(req, res);

    expect(mockNotificationService.markNotificationAsRead).toHaveBeenCalledWith(notificationId);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(updated);
  });

  it('returns 400 on service error', async () => {
    mockNotificationService.markNotificationAsRead.mockRejectedValue(new Error('Notification not found'));
    const req = mockReq({ params: { notificationId } });
    const res = mockRes();

    await markAsRead(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ error: 'Notification not found' });
  });
});
