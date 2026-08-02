'use strict';

let mockPromotionProvider;
let mockDatabaseProvider;

jest.mock('@/shared/config/env.config', () => ({
    get databaseProvider() { return mockDatabaseProvider; },
    databaseProviders: {
        get promotion() { return mockPromotionProvider; },
    },
}));

jest.mock('@/providers/database/postgres.promotion.repository', () => ({
    __postgres: 'promotion',
}));

describe('promotion.repository provider selection', () => {
    beforeEach(() => {
        mockPromotionProvider = undefined;
        mockDatabaseProvider = 'postgres';
        jest.resetModules();
    });

    it('exports the postgres repository by default', () => {
        const repo = require('@/providers/database/promotion.repository');
        expect(repo).toEqual({ __postgres: 'promotion' });
    });

    it('exports the postgres repository when the override is postgres', () => {
        mockPromotionProvider = 'postgres';
        const repo = require('@/providers/database/promotion.repository');
        expect(repo).toEqual({ __postgres: 'promotion' });
    });

    it('falls back to the database provider when the override is unset', () => {
        mockDatabaseProvider = 'postgres';
        mockPromotionProvider = undefined;
        const repo = require('@/providers/database/promotion.repository');
        expect(repo).toEqual({ __postgres: 'promotion' });
    });

    it('throws when the override is not postgres', () => {
        mockPromotionProvider = 'mysql';
        expect(() => require('@/providers/database/promotion.repository')).toThrow(
            'Database provider "mysql" is not supported for promotions. Only "postgres" is available.'
        );
    });

    it('throws when the fallback database provider is not postgres', () => {
        mockPromotionProvider = undefined;
        mockDatabaseProvider = 'mysql';
        expect(() => require('@/providers/database/promotion.repository')).toThrow(
            'Database provider "mysql" is not supported for promotions.'
        );
    });
});
