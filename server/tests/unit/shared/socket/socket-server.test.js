const mockSocket = {
  id: 'socket-1',
  handshake: { auth: {}, headers: {} },
  use: jest.fn(),
  on: jest.fn(),
  join: jest.fn(),
  leave: jest.fn(),
  user: null,
};

const mockIo = {
  use: jest.fn(),
  on: jest.fn(),
};

jest.mock('socket.io', () => ({
  Server: jest.fn(() => mockIo),
}));

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

jest.mock('@/shared/config/env.config', () => ({
  get accessTokenSecret() { return 'test-secret'; },
}));

jest.mock('@/shared/logger', () => ({ info: jest.fn() }));

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('@/shared/logger');
const config = require('@/shared/config/env.config');
const { initSocketServer, getIo } = require('@/shared/socket/socket-server');

beforeEach(() => {
  jest.clearAllMocks();
  mockIo.use.mockReset();
  mockIo.on.mockReset();
  mockSocket.on.mockReset();
  mockSocket.join.mockReset();
  mockSocket.leave.mockReset();
  mockSocket.user = null;
  mockSocket.handshake = { auth: {}, headers: {} };
  Server.mockClear();
});

describe('initSocketServer', () => {
  let httpServer;
  let middlewareFn;
  let connectionFn;

  beforeEach(() => {
    httpServer = { on: jest.fn() };

    mockIo.use.mockImplementation((fn) => { middlewareFn = fn; });
    mockIo.on.mockImplementation((event, fn) => {
      if (event === 'connection') connectionFn = fn;
    });

    const result = initSocketServer(httpServer);
    expect(result).toBe(mockIo);
    expect(Server).toHaveBeenCalledWith(httpServer, {
      cors: { origin: '*', methods: ['GET', 'POST'] },
    });
  });

  describe('auth middleware', () => {
    it('calls next with error when no token provided', () => {
      const next = jest.fn();
      middlewareFn(mockSocket, next);
      expect(next).toHaveBeenCalledWith(new Error('Authentication error: Token required.'));
    });

    it('extracts token from handshake.auth.token', () => {
      mockSocket.handshake.auth.token = 'my-token';
      jwt.verify.mockImplementation((token, secret, cb) => cb(null, { uid: 'u1' }));
      const next = jest.fn();
      middlewareFn(mockSocket, next);
      expect(jwt.verify).toHaveBeenCalledWith('my-token', 'test-secret', expect.any(Function));
    });

    it('extracts Bearer token from authorization header', () => {
      mockSocket.handshake.headers.authorization = 'Bearer bearer-token';
      jwt.verify.mockImplementation((token, secret, cb) => cb(null, { uid: 'u1' }));
      const next = jest.fn();
      middlewareFn(mockSocket, next);
      expect(jwt.verify).toHaveBeenCalledWith('bearer-token', 'test-secret', expect.any(Function));
    });

    it('calls next with error when token is invalid', () => {
      mockSocket.handshake.auth.token = 'bad';
      jwt.verify.mockImplementation((token, secret, cb) => cb(new Error('jwt malformed'), null));
      const next = jest.fn();
      middlewareFn(mockSocket, next);
      expect(next).toHaveBeenCalledWith(new Error('Authentication error: Invalid token.'));
    });

    it('sets socket.user and calls next() on valid token', () => {
      mockSocket.handshake.auth.token = 'good';
      jwt.verify.mockImplementation((token, secret, cb) => cb(null, { uid: 'u1', role: 'admin' }));
      const next = jest.fn();
      middlewareFn(mockSocket, next);
      expect(mockSocket.user).toEqual({ uid: 'u1', role: 'admin' });
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('connection handler', () => {
    let socket;

    beforeEach(() => {
      mockSocket.handshake.auth.token = 't';
      jwt.verify.mockImplementation((token, secret, cb) => cb(null, { uid: 'u1' }));
      middlewareFn(mockSocket, jest.fn());
      connectionFn(mockSocket);
    });

    it('logs client connection with socket id and user', () => {
      expect(logger.info).toHaveBeenCalledWith(
        '[Socket.IO] Client connected: socket-1 (User: u1)'
      );
    });

    it('registers join_event handler', () => {
      expect(mockSocket.on).toHaveBeenCalledWith('join_event', expect.any(Function));
    });

    it('registers leave_event handler', () => {
      expect(mockSocket.on).toHaveBeenCalledWith('leave_event', expect.any(Function));
    });

    it('registers disconnect handler', () => {
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });

    it('join_event calls socket.join and logs', () => {
      const joinHandler = mockSocket.on.mock.calls.find(c => c[0] === 'join_event')[1];
      joinHandler('evt-42');
      expect(mockSocket.join).toHaveBeenCalledWith('event_evt-42');
      expect(logger.info).toHaveBeenCalledWith(
        '[Socket.IO] Client socket-1 joined event_evt-42'
      );
    });

    it('leave_event calls socket.leave and logs', () => {
      const leaveHandler = mockSocket.on.mock.calls.find(c => c[0] === 'leave_event')[1];
      leaveHandler('evt-99');
      expect(mockSocket.leave).toHaveBeenCalledWith('event_evt-99');
      expect(logger.info).toHaveBeenCalledWith(
        '[Socket.IO] Client socket-1 left event_evt-99'
      );
    });

    it('disconnect logs', () => {
      const discHandler = mockSocket.on.mock.calls.find(c => c[0] === 'disconnect')[1];
      discHandler();
      expect(logger.info).toHaveBeenCalledWith(
        '[Socket.IO] Client disconnected: socket-1'
      );
    });
  });
});

describe('getIo', () => {
  it('returns the io instance after initialization', () => {
    const httpServer = { on: jest.fn() };
    mockIo.use.mockImplementation(() => {});
    mockIo.on.mockImplementation(() => {});
    initSocketServer(httpServer);
    expect(getIo()).toBe(mockIo);
  });

  it('returns null before initSocketServer is called', () => {
    jest.isolateModules(() => {
      const fresh = require('@/shared/socket/socket-server');
      expect(fresh.getIo()).toBeNull();
    });
  });
});
