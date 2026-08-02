'use strict';

const mockQuery = jest.fn();
const mockGetEventById = jest.fn();

jest.mock('@/providers/database/postgres.client', () => ({
    query: mockQuery,
}));

jest.mock('@/providers/database/postgres.event.repository', () => ({
    getEventById: mockGetEventById,
}));

const repo = require('@/providers/database/postgres.admin.repository');

beforeEach(() => {
    jest.clearAllMocks();
});

describe('getPendingEvents', () => {
    it('lists pending submitted event ids with default pagination and hydrates each', async () => {
        mockQuery.mockResolvedValue({ rows: [{ id: 'e1' }, { id: 'e2' }] });
        mockGetEventById.mockImplementation(async (id) => ({ id, name: `Event ${id}` }));

        const result = await repo.getPendingEvents();

        expect(mockQuery).toHaveBeenCalledWith(
            'SELECT id FROM events WHERE status = $1 AND (lifecycle_status IS NULL OR lifecycle_status = $4) ORDER BY created_at DESC LIMIT $2 OFFSET $3',
            ['pending', 20, 0, 'submitted']
        );
        expect(mockGetEventById).toHaveBeenNthCalledWith(1, 'e1');
        expect(mockGetEventById).toHaveBeenNthCalledWith(2, 'e2');
        expect(result).toEqual([
            { id: 'e1', name: 'Event e1' },
            { id: 'e2', name: 'Event e2' },
        ]);
    });

    it('applies page and limit to the offset', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.getPendingEvents(3, 10);

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('LIMIT $2 OFFSET $3'),
            ['pending', 10, 20, 'submitted']
        );
    });

    it('skips event ids that no longer resolve to a full event', async () => {
        mockQuery.mockResolvedValue({ rows: [{ id: 'e1' }, { id: 'e2' }] });
        mockGetEventById.mockResolvedValueOnce({ id: 'e1' }).mockResolvedValueOnce(null);

        const result = await repo.getPendingEvents();

        expect(result).toEqual([{ id: 'e1' }]);
    });

    it('returns an empty list when there are no pending rows', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.getPendingEvents()).resolves.toEqual([]);
        expect(mockGetEventById).not.toHaveBeenCalled();
    });

    it('propagates the list query failure', async () => {
        mockQuery.mockRejectedValue(new Error('db down'));

        await expect(repo.getPendingEvents()).rejects.toThrow('db down');
    });

    it('propagates hydration failures', async () => {
        mockQuery.mockResolvedValue({ rows: [{ id: 'e1' }] });
        mockGetEventById.mockRejectedValue(new Error('hydration failed'));

        await expect(repo.getPendingEvents()).rejects.toThrow('hydration failed');
    });
});
