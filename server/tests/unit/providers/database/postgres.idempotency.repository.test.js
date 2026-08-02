'use strict';

const mockQuery = jest.fn();

jest.mock('@/providers/database/postgres.client', () => ({
    query: mockQuery,
}));

const repo = require('@/providers/database/postgres.idempotency.repository');

const ROW = {
    id: 'i1',
    key: 'k1',
    user_id: 'u1',
    endpoint: '/orders',
    request_hash: 'hash-1',
    status: 'IN_PROGRESS',
    response_code: 200,
    response_body: { ok: true },
    created_at: new Date(1000),
    expires_at: new Date(2000),
};

const MAPPED = {
    id: 'i1',
    key: 'k1',
    userId: 'u1',
    endpoint: '/orders',
    requestHash: 'hash-1',
    status: 'IN_PROGRESS',
    responseCode: 200,
    responseBody: { ok: true },
    createdAt: new Date(1000),
    expiresAt: new Date(2000),
};

beforeEach(() => {
    jest.clearAllMocks();
});

describe('getByKey', () => {
    it('returns null when no row matches', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.getByKey('k1')).resolves.toBeNull();
        expect(mockQuery).toHaveBeenCalledWith(
            'SELECT * FROM idempotency_keys WHERE key = $1',
            ['k1']
        );
    });

    it('maps the matched row to camelCase fields', async () => {
        mockQuery.mockResolvedValue({ rows: [ROW] });

        await expect(repo.getByKey('k1')).resolves.toEqual(MAPPED);
    });

    it('propagates query failures', async () => {
        mockQuery.mockRejectedValue(new Error('db down'));

        await expect(repo.getByKey('k1')).rejects.toThrow('db down');
    });
});

describe('getExisting', () => {
    it('returns null when no row matches the key/user/endpoint tuple', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.getExisting('k1', 'u1', '/orders')).resolves.toBeNull();
        expect(mockQuery).toHaveBeenCalledWith(
            'SELECT * FROM idempotency_keys WHERE key = $1 AND user_id = $2 AND endpoint = $3',
            ['k1', 'u1', '/orders']
        );
    });

    it('maps the matched row to camelCase fields', async () => {
        mockQuery.mockResolvedValue({ rows: [ROW] });

        await expect(repo.getExisting('k1', 'u1', '/orders')).resolves.toEqual(MAPPED);
    });
});

describe('acquireLock', () => {
    it('inserts a fresh key and reports success with IN_PROGRESS', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        const result = await repo.acquireLock('k1', 'u1', '/orders', 'hash-1');

        expect(result).toEqual({ success: true, status: 'IN_PROGRESS' });
        expect(mockQuery).toHaveBeenCalledTimes(2);
        const [sql, params] = mockQuery.mock.calls[1];
        expect(sql).toContain('INSERT INTO idempotency_keys');
        expect(params).toEqual([
            'k1', 'u1', '/orders', 'hash-1', expect.any(Date), expect.any(Date),
        ]);
    });

    it('honors a custom ttl when computing expires_at', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.acquireLock('k1', 'u1', '/orders', 'hash-1', 60);

        const params = mockQuery.mock.calls[1][1];
        expect(params[4].getTime()).toBeGreaterThan(params[5].getTime());
    });

    it('rejects a pre-existing key owned by another principal', async () => {
        const record = { ...MAPPED, userId: 'u2' };
        mockQuery.mockResolvedValueOnce({ rows: [{ ...ROW, user_id: 'u2' }] });

        const result = await repo.acquireLock('k1', 'u1', '/orders', 'hash-1');

        expect(result).toEqual({
            success: false, conflict: true, mismatch: false, ownedByOther: true, record,
        });
    });

    it('rejects a pre-existing key whose request hash differs', async () => {
        const record = { ...MAPPED, requestHash: 'other' };
        mockQuery.mockResolvedValueOnce({ rows: [{ ...ROW, request_hash: 'other' }] });

        const result = await repo.acquireLock('k1', 'u1', '/orders', 'hash-1');

        expect(result).toEqual({
            success: false, conflict: false, mismatch: true, record,
        });
    });

    it('conflicts when an unexpired IN_PROGRESS lock already exists', async () => {
        const record = { ...MAPPED, expiresAt: new Date(4102444800000) };
        mockQuery.mockResolvedValueOnce({
            rows: [{ ...ROW, expires_at: new Date(4102444800000) }],
        });

        const result = await repo.acquireLock('k1', 'u1', '/orders', 'hash-1');

        expect(result).toEqual({
            success: false, conflict: true, mismatch: false, record,
        });
        expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('renews an expired IN_PROGRESS lock and reports success', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ ...ROW, expires_at: new Date(100) }] });

        const result = await repo.acquireLock('k1', 'u1', '/orders', 'hash-1');

        expect(result).toEqual({ success: true, status: 'IN_PROGRESS' });
        const [sql, params] = mockQuery.mock.calls[1];
        expect(sql).toContain('UPDATE idempotency_keys');
        expect(sql).toContain('request_hash = $4');
        expect(params).toEqual([
            'k1', 'u1', '/orders', 'hash-1', expect.any(Date), expect.any(Date),
        ]);
    });

    it('returns the cached completed record without a lock', async () => {
        const record = { ...MAPPED, status: 'COMPLETED' };
        mockQuery.mockResolvedValueOnce({ rows: [{ ...ROW, status: 'COMPLETED' }] });

        const result = await repo.acquireLock('k1', 'u1', '/orders', 'hash-1');

        expect(result).toEqual({
            success: false, conflict: false, mismatch: false, record,
        });
    });

    it('recovers from a unique constraint race owned by another principal', async () => {
        const record = { ...MAPPED, userId: 'u2' };
        mockQuery
            .mockResolvedValueOnce({ rows: [] })
            .mockRejectedValueOnce({ code: '23505' })
            .mockResolvedValueOnce({ rows: [{ ...ROW, user_id: 'u2' }] });

        const result = await repo.acquireLock('k1', 'u1', '/orders', 'hash-1');

        expect(result).toEqual({
            success: false, conflict: true, mismatch: false, ownedByOther: true, record,
        });
    });

    it('recovers from a unique constraint race with a hash mismatch', async () => {
        const record = { ...MAPPED, requestHash: 'other' };
        mockQuery
            .mockResolvedValueOnce({ rows: [] })
            .mockRejectedValueOnce({ code: '23505' })
            .mockResolvedValueOnce({ rows: [{ ...ROW, request_hash: 'other' }] });

        const result = await repo.acquireLock('k1', 'u1', '/orders', 'hash-1');

        expect(result).toEqual({
            success: false, conflict: false, mismatch: true, record,
        });
    });

    it('recovers from a race with an unexpired IN_PROGRESS lock', async () => {
        const record = { ...MAPPED, expiresAt: new Date(4102444800000) };
        mockQuery
            .mockResolvedValueOnce({ rows: [] })
            .mockRejectedValueOnce({ code: '23505' })
            .mockResolvedValueOnce({
                rows: [{ ...ROW, expires_at: new Date(4102444800000) }],
            });

        const result = await repo.acquireLock('k1', 'u1', '/orders', 'hash-1');

        expect(result).toEqual({
            success: false, conflict: true, mismatch: false, record,
        });
    });

    it('renews an expired lock after a unique constraint race', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [] })
            .mockRejectedValueOnce({ code: '23505' })
            .mockResolvedValueOnce({ rows: [{ ...ROW, expires_at: new Date(100) }] });

        const result = await repo.acquireLock('k1', 'u1', '/orders', 'hash-1');

        expect(result).toEqual({ success: true, status: 'IN_PROGRESS' });
        expect(mockQuery.mock.calls[3][0]).toContain('UPDATE idempotency_keys');
    });

    it('rethrows when the racer record vanished after the unique violation', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [] })
            .mockRejectedValueOnce({ code: '23505' })
            .mockResolvedValueOnce({ rows: [] });

        await expect(
            repo.acquireLock('k1', 'u1', '/orders', 'hash-1')
        ).rejects.toEqual({ code: '23505' });
    });

    it('rethrows non-constraint insert errors', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [] })
            .mockRejectedValueOnce(new Error('db down'));

        await expect(
            repo.acquireLock('k1', 'u1', '/orders', 'hash-1')
        ).rejects.toThrow('db down');
    });
});

describe('saveResponse', () => {
    it('stores the completed response with JSON body and expiry', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.saveResponse('k1', 'u1', '/orders', 200, { ok: true });

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('UPDATE idempotency_keys');
        expect(sql).toContain("status = 'COMPLETED'");
        expect(params).toEqual([
            'k1', 'u1', '/orders', 200, JSON.stringify({ ok: true }), expect.any(Date),
        ]);
    });
});

describe('deleteKey', () => {
    it('throws when any required argument is missing', async () => {
        await expect(repo.deleteKey('k1', 'u1')).rejects.toThrow(
            'key, userId, and endpoint are required'
        );
        expect(mockQuery).not.toHaveBeenCalled();
    });

    it('deletes the key tuple', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.deleteKey('k1', 'u1', '/orders');

        expect(mockQuery).toHaveBeenCalledWith(
            'DELETE FROM idempotency_keys WHERE key = $1 AND user_id = $2 AND endpoint = $3',
            ['k1', 'u1', '/orders']
        );
    });
});
