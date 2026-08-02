'use strict';

const mockQuery = jest.fn();

jest.mock('@/providers/database/postgres.client', () => ({
    query: mockQuery,
}));

const repo = require('@/providers/database/postgres.notification.repository');

beforeEach(() => {
    jest.clearAllMocks();
});

describe('getNotificationsByUserId', () => {
    it('maps rows to notification objects', async () => {
        mockQuery.mockResolvedValue({
            rows: [
                {
                    id: 'n1', user_id: 'u1', title: 'T', message: 'M', type: 'order',
                    event_id: 'e1', is_read: false, created_at: new Date(1700000000000),
                },
                {
                    id: 'n2', user_id: null, title: 'T2', message: 'M2', type: 'broadcast',
                    event_id: null, is_read: true, created_at: new Date(1690000000000),
                },
            ],
        });

        const result = await repo.getNotificationsByUserId('u1');

        expect(mockQuery).toHaveBeenCalledTimes(1);
        expect(mockQuery.mock.calls[0][0]).toContain("WHERE user_id = $1 OR audience = 'broadcast'");
        expect(mockQuery.mock.calls[0][0]).toContain('ORDER BY created_at DESC');
        expect(mockQuery.mock.calls[0][1]).toEqual(['u1']);
        expect(result).toEqual([
            {
                id: 'n1', userId: 'u1', title: 'T', message: 'M', type: 'order',
                eventId: 'e1', isRead: false, createdAt: 1700000000000,
            },
            {
                id: 'n2', userId: null, title: 'T2', message: 'M2', type: 'broadcast',
                eventId: null, isRead: true, createdAt: 1690000000000,
            },
        ]);
    });

    it('returns an empty list for no rows', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.getNotificationsByUserId('u1')).resolves.toEqual([]);
    });

    it('propagates query failures', async () => {
        mockQuery.mockRejectedValue(new Error('db down'));

        await expect(repo.getNotificationsByUserId('u1')).rejects.toThrow('db down');
    });
});

describe('markNotificationAsRead', () => {
    it('marks a notification read and returns the mapped row', async () => {
        mockQuery.mockResolvedValue({
            rows: [{
                id: 'n1', user_id: 'u1', title: 'T', message: 'M', type: 'order',
                event_id: null, is_read: true, created_at: new Date(1700000000000),
            }],
        });

        const result = await repo.markNotificationAsRead('n1');

        expect(mockQuery).toHaveBeenCalledWith(
            'UPDATE notifications SET is_read = true WHERE id = $1 RETURNING *',
            ['n1']
        );
        expect(result).toEqual({
            id: 'n1', userId: 'u1', title: 'T', message: 'M', type: 'order',
            eventId: null, isRead: true, createdAt: 1700000000000,
        });
    });

    it('throws when the notification does not exist', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.markNotificationAsRead('nope')).rejects.toThrow('Notification not found.');
    });

    it('propagates query failures', async () => {
        mockQuery.mockRejectedValue(new Error('db down'));

        await expect(repo.markNotificationAsRead('n1')).rejects.toThrow('db down');
    });
});

describe('createNotification', () => {
    it('deletes any existing row then inserts a user-scoped notification', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        const data = {
            id: 'n1', userId: 'u1', title: 'T', message: 'M', type: 'order',
            eventId: 'e1', isRead: true, createdAt: 1700000000000,
        };

        const result = await repo.createNotification(data);

        expect(result).toBe(data);
        expect(mockQuery).toHaveBeenCalledTimes(2);
        expect(mockQuery.mock.calls[0]).toEqual(['DELETE FROM notifications WHERE id = $1', ['n1']]);

        const [sql, params] = mockQuery.mock.calls[1];
        expect(sql).toContain('INSERT INTO notifications');
        expect(params).toEqual(['n1', 'u1', 'T', 'M', 'order', 'e1', true, new Date(1700000000000), 'user']);
    });

    it('stores a broadcast notification for userId "all"', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        const data = {
            id: 'n1', userId: 'all', title: 'T', message: 'M', type: 'broadcast',
            createdAt: 1700000000000,
        };

        await repo.createNotification(data);

        expect(mockQuery.mock.calls[1][1]).toEqual([
            'n1', null, 'T', 'M', 'broadcast', null, false, new Date(1700000000000), 'broadcast',
        ]);
    });

    it('treats audience broadcast as broadcast and defaults isRead and createdAt', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.createNotification({ id: 'n1', audience: 'broadcast', title: 'T', message: 'M', type: 'x' });

        const params = mockQuery.mock.calls[1][1];
        expect(params[1]).toBeNull();
        expect(params[6]).toBe(false);
        expect(params[7]).toEqual(expect.any(Date));
        expect(params[8]).toBe('broadcast');
    });

    it('propagates insert failures', async () => {
        mockQuery.mockRejectedValue(new Error('db down'));

        await expect(
            repo.createNotification({ id: 'n1', title: 'T', message: 'M', type: 'x' })
        ).rejects.toThrow('db down');
    });
});
