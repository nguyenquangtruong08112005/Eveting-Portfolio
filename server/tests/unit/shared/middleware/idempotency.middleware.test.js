jest.mock('@/providers/database/idempotency.repository', () => ({
  acquireLock: jest.fn(),
  saveResponse: jest.fn(),
  deleteKey: jest.fn(),
}));
jest.mock('@/shared/logger', () => ({ info: jest.fn(), error: jest.fn() }));

const idempotencyRepository = require('@/providers/database/idempotency.repository');
const logger = require('@/shared/logger');
const idempotency = require('@/shared/middleware/idempotency.middleware');

function makeRes() {
  const r = { statusCode: 200 };
  r.status = jest.fn((code) => { r.statusCode = code; return r; });
  r.json = jest.fn().mockReturnValue(r);
  r.send = jest.fn().mockReturnValue(r);
  r.set = jest.fn().mockReturnValue(r);
  return r;
}

describe('idempotency middleware', () => {
  let req, res, next;

  function handler(opts) {
    return idempotency(opts || {});
  }

  beforeEach(() => {
    req = {
      method: 'POST',
      originalUrl: '/api/test',
      headers: {},
      body: { amount: 100, items: ['a'] },
      user: { uid: 'u1' },
    };
    res = makeRes();
    next = jest.fn();
    jest.clearAllMocks();
    delete process.env.IDEMPOTENCY_ENFORCE;
  });

  describe('enforcement and routing', () => {
    it('skips when IDEMPOTENCY_ENFORCE=false', async () => {
      process.env.IDEMPOTENCY_ENFORCE = 'false';
      await handler()(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(idempotencyRepository.acquireLock).not.toHaveBeenCalled();
    });

    it('skips non-mutation methods', async () => {
      req.method = 'GET';
      await handler()(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('authentication', () => {
    it('returns 401 when no user', async () => {
      req.user = null;
      await handler()(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Unauthorized' })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when user has no identifier', async () => {
      req.user = {};
      await handler()(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('idempotency key header', () => {
    it('returns 400 when key missing and required=true', async () => {
      await handler({ required: true })(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'IDEMPOTENCY_KEY_REQUIRED' })
      );
    });

    it('calls next when key missing and required=false', async () => {
      await handler({ required: false })(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('reads x-idempotency-key header', async () => {
      req.headers['x-idempotency-key'] = 'key-123';
      idempotencyRepository.acquireLock.mockResolvedValue({ success: true });
      await handler()(req, res, next);
      expect(idempotencyRepository.acquireLock).toHaveBeenCalledWith(
        'key-123', expect.any(String), expect.any(String), expect.any(String)
      );
    });

    it('reads idempotency-key header as fallback', async () => {
      req.headers['idempotency-key'] = 'key-456';
      idempotencyRepository.acquireLock.mockResolvedValue({ success: true });
      await handler()(req, res, next);
      expect(idempotencyRepository.acquireLock).toHaveBeenCalledWith(
        'key-456', expect.any(String), expect.any(String), expect.any(String)
      );
    });
  });

  describe('lock acquisition results', () => {
    const key = 'k1';

    beforeEach(() => {
      req.headers['x-idempotency-key'] = key;
    });

    it('returns 409 when lock ownedByOther', async () => {
      idempotencyRepository.acquireLock.mockResolvedValue({ success: false, ownedByOther: true });
      await handler()(req, res, next);
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'IDEMPOTENCY_KEY_OWNED_BY_OTHER' })
      );
    });

    it('returns 422 on payload mismatch', async () => {
      idempotencyRepository.acquireLock.mockResolvedValue({ success: false, mismatch: true });
      await handler()(req, res, next);
      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'IDEMPOTENCY_KEY_REUSE_PAYLOAD_MISMATCH' })
      );
    });

    it('returns 409 on concurrent conflict', async () => {
      idempotencyRepository.acquireLock.mockResolvedValue({ success: false, conflict: true });
      await handler()(req, res, next);
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'CONCURRENT_REQUEST_IN_PROGRESS' })
      );
    });

    it('replays cached response when record present', async () => {
      const record = { responseCode: 200, responseBody: { result: 'ok' } };
      idempotencyRepository.acquireLock.mockResolvedValue({ success: false, record });
      await handler()(req, res, next);
      expect(res.set).toHaveBeenCalledWith('X-Idempotency-Cache', 'HIT');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ result: 'ok' });
    });
  });

  describe('successful acquisition and response interception', () => {
    const key = 'k1';

    beforeEach(() => {
      req.headers['x-idempotency-key'] = key;
      idempotencyRepository.acquireLock.mockResolvedValue({ success: true });
      idempotencyRepository.saveResponse.mockResolvedValue();
      idempotencyRepository.deleteKey.mockResolvedValue();
    });

    it('calls next on successful lock', async () => {
      await handler()(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('intercepts res.json and persists response', async () => {
      await handler()(req, res, next);
      const body = { created: true };
      res.statusCode = 201;
      res.json(body);
      await new Promise(resolve => setImmediate(resolve));
      expect(idempotencyRepository.saveResponse).toHaveBeenCalledWith(
        key, 'u1', expect.any(String), 201, body
      );
    });

    it('intercepts res.send with JSON string and persists parsed body', async () => {
      await handler()(req, res, next);
      res.statusCode = 200;
      res.send('{"ok":true}');
      await new Promise(resolve => setImmediate(resolve));
      expect(idempotencyRepository.saveResponse).toHaveBeenCalledWith(
        key, 'u1', expect.any(String), 200, { ok: true }
      );
    });

    it('intercepts res.send with non-parseable text', async () => {
      await handler()(req, res, next);
      res.statusCode = 200;
      res.send('plain text');
      await new Promise(resolve => setImmediate(resolve));
      expect(idempotencyRepository.saveResponse).toHaveBeenCalledWith(
        key, 'u1', expect.any(String), 200, 'plain text'
      );
    });

    it('deletes key on 500 response', async () => {
      await handler()(req, res, next);
      res.statusCode = 500;
      res.json({ error: 'fail' });
      await new Promise(resolve => setImmediate(resolve));
      expect(idempotencyRepository.deleteKey).toHaveBeenCalledWith(key, 'u1', expect.any(String));
      expect(idempotencyRepository.saveResponse).not.toHaveBeenCalled();
    });

    it('deletes key on 500+ error', async () => {
      await handler()(req, res, next);
      res.statusCode = 503;
      res.send('Service Unavailable');
      await new Promise(resolve => setImmediate(resolve));
      expect(idempotencyRepository.deleteKey).toHaveBeenCalled();
      expect(idempotencyRepository.saveResponse).not.toHaveBeenCalled();
    });

    it('logs save error but still returns response', async () => {
      idempotencyRepository.saveResponse.mockRejectedValue(new Error('DB down'));
      await handler()(req, res, next);
      res.json({ ok: true });
      await new Promise(resolve => setImmediate(resolve));
      expect(logger.error).toHaveBeenCalledWith('[Idempotency] Failed to save completed response');
    });

    it('logs delete error but still returns response', async () => {
      idempotencyRepository.deleteKey.mockRejectedValue(new Error('DB down'));
      await handler()(req, res, next);
      res.statusCode = 500;
      res.json({ error: 'fail' });
      await new Promise(resolve => setImmediate(resolve));
      expect(logger.error).toHaveBeenCalledWith('[Idempotency] Failed to delete key on 500 error');
    });

    it('persists only once on double res.json call', async () => {
      await handler()(req, res, next);
      res.json({ ok: true });
      res.json({ ok: true });
      await new Promise(resolve => setImmediate(resolve));
      expect(idempotencyRepository.saveResponse).toHaveBeenCalledTimes(1);
    });
  });

  describe('repository acquire failure', () => {
    it('calls next(err) when acquireLock throws', async () => {
      req.headers['x-idempotency-key'] = 'k1';
      const err = new Error('Connection refused');
      idempotencyRepository.acquireLock.mockRejectedValue(err);
      await handler()(req, res, next);
      expect(logger.error).toHaveBeenCalledWith('[Idempotency] Middleware error');
      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe('computePayloadHash key-order invariance', () => {
    it('produces equal acquireLock hashes for same body with different key order', async () => {
      req.headers['x-idempotency-key'] = 'k1';
      idempotencyRepository.acquireLock.mockResolvedValue({ success: true });

      const h1 = handler();
      req.body = { b: 2, a: 1, c: { z: 9, y: 8 } };
      await h1(req, res, next);
      const hash1 = idempotencyRepository.acquireLock.mock.calls[0][3];

      jest.clearAllMocks();
      req.body = { c: { y: 8, z: 9 }, a: 1, b: 2 };
      const h2 = handler();
      await h2(req, res, next);
      const hash2 = idempotencyRepository.acquireLock.mock.calls[0][3];

      expect(hash1).toBe(hash2);
    });
  });
});
