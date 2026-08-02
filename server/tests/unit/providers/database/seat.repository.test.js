'use strict';

const mockQuery = jest.fn();
const mockValidateAdapter = jest.fn();

jest.mock('@/providers/database/postgres.client', () => ({
    query: mockQuery,
}));

jest.mock('@/providers/database/seat.contract', () => ({
    REQUIRED_METHODS: [],
    validateAdapter: mockValidateAdapter,
}));

const repo = require('@/providers/database/seat.repository');

beforeEach(() => {
    jest.clearAllMocks();
});

afterEach(() => {
    delete process.env.DATABASE_PROVIDER;
});

describe('seat.repository facade', () => {
    it('re-exports the postgres implementation and validates it against the contract', () => {
        expect(repo).toBe(require('@/providers/database/postgres.seat.repository'));

        jest.isolateModules(() => {
            const explicit = require('@/providers/database/seat.repository');
            expect(mockValidateAdapter).toHaveBeenCalledWith(explicit);
        });
    });

    it('routes calls to the mocked postgres query boundary', async () => {
        mockQuery.mockResolvedValue({
            rows: [
                { id: 's1', seat_section_id: 'ss1', row_name: 'A', seat_number: '1', status: 'available' },
            ],
        });

        await expect(repo.getSeatsBySection('ss1')).resolves.toEqual([
            {
                id: 's1',
                seatSectionId: 'ss1',
                rowName: 'A',
                seatNumber: '1',
                status: 'available',
                createdAt: null,
            },
        ]);

        expect(mockQuery).toHaveBeenCalledWith(
            'SELECT * FROM seats WHERE seat_section_id = $1 ORDER BY row_name, seat_number',
            ['ss1']
        );
    });

    it('honors an explicit postgres provider override', () => {
        process.env.DATABASE_PROVIDER = 'postgres';

        jest.isolateModules(() => {
            const explicit = require('@/providers/database/seat.repository');
            expect(explicit.createSeatMap).toBeDefined();
        });
    });

    it('throws when the configured provider is not postgres', () => {
        process.env.DATABASE_PROVIDER = 'memory';

        jest.isolateModules(() => {
            expect(() => require('@/providers/database/seat.repository')).toThrow(
                /not supported for seats/
            );
        });
    });
});
