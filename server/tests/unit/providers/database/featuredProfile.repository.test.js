'use strict';

let mockFeaturedProfileProvider;
let mockDatabaseProvider;

jest.mock('@/shared/config/env.config', () => ({
    get databaseProvider() { return mockDatabaseProvider; },
    databaseProviders: {
        get featuredProfile() { return mockFeaturedProfileProvider; },
    },
}));

jest.mock('@/providers/database/postgres.featuredProfile.repository', () => ({
    __postgres: 'featured-profile',
}));

describe('featuredProfile.repository provider selection', () => {
    beforeEach(() => {
        mockFeaturedProfileProvider = undefined;
        mockDatabaseProvider = 'postgres';
        jest.resetModules();
    });

    it('exports the postgres repository by default', () => {
        const repo = require('@/providers/database/featuredProfile.repository');
        expect(repo).toEqual({ __postgres: 'featured-profile' });
    });

    it('exports the postgres repository when the override is postgres', () => {
        mockFeaturedProfileProvider = 'postgres';
        const repo = require('@/providers/database/featuredProfile.repository');
        expect(repo).toEqual({ __postgres: 'featured-profile' });
    });

    it('falls back to the database provider when the override is unset', () => {
        mockDatabaseProvider = 'postgres';
        mockFeaturedProfileProvider = undefined;
        const repo = require('@/providers/database/featuredProfile.repository');
        expect(repo).toEqual({ __postgres: 'featured-profile' });
    });

    it('throws when the override is not postgres', () => {
        mockFeaturedProfileProvider = 'mysql';
        expect(() => require('@/providers/database/featuredProfile.repository')).toThrow(
            'Database provider "mysql" is not supported for featured profiles. Only "postgres" is available.'
        );
    });

    it('throws when the fallback database provider is not postgres', () => {
        mockFeaturedProfileProvider = undefined;
        mockDatabaseProvider = 'mysql';
        expect(() => require('@/providers/database/featuredProfile.repository')).toThrow(
            'Database provider "mysql" is not supported for featured profiles.'
        );
    });
});
