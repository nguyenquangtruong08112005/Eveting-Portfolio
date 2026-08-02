'use strict';

const mockQuery = jest.fn();

jest.mock('@/providers/database/postgres.client', () => ({
    query: mockQuery,
}));

const repo = require('@/providers/database/media.repository');

beforeEach(() => {
    jest.clearAllMocks();
});

afterEach(() => {
    delete process.env.MEDIA_DATABASE_PROVIDER;
    delete process.env.DATABASE_PROVIDER;
});

describe('media.repository facade', () => {
    it('re-exports the postgres implementation by default', () => {
        expect(repo).toBe(require('@/providers/database/postgres.media.repository'));
    });

    it('routes calls to the mocked postgres query boundary', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ count: 1 }] })
            .mockResolvedValueOnce({
                rows: [{
                    id: 'm1', user_id: 'u1', event_id: 'e1', url: 'u', type: 'photo',
                    caption: 'c', created_at: 1000,
                }],
            })
            .mockResolvedValueOnce({ rows: [{ exists: false }] });

        const result = await repo.getEventMediaPage('e1');

        expect(result.media[0]).toEqual({
            id: 'm1', userId: 'u1', eventId: 'e1', url: 'u', type: 'photo',
            caption: 'c', createdAt: 1000, user: { id: null, name: null, profilePicUrl: null },
        });
        expect(mockQuery.mock.calls[1][1]).toEqual(['e1', 20, 0]);
    });

    it('honors an explicit postgres provider override', () => {
        process.env.MEDIA_DATABASE_PROVIDER = 'postgres';

        jest.isolateModules(() => {
            const explicit = require('@/providers/database/media.repository');
            expect(explicit.getEventMediaPage).toBeDefined();
        });
    });

    it('throws when the configured provider is not postgres', () => {
        process.env.MEDIA_DATABASE_PROVIDER = 'memory';

        jest.isolateModules(() => {
            expect(() => require('@/providers/database/media.repository')).toThrow(
                /not supported for media/
            );
        });
    });
});
