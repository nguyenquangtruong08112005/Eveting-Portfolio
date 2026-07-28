require('../../src/alias-bootstrap');

const assert = require('assert');
const fs = require('fs');
const path = require('path');

async function run() {
    const repository = require('@/providers/database/featuredProfile.repository');
    const original = {
        featuredProfileSlugExists: repository.featuredProfileSlugExists,
        createFeaturedProfile: repository.createFeaturedProfile,
        userIsFeaturedArtist: repository.userIsFeaturedArtist,
        setUserFeaturedArtistStatus: repository.setUserFeaturedArtistStatus,
    };
    const transaction = { query: async () => ({ rows: [] }) };
    let captured = null;

    repository.featuredProfileSlugExists = async () => false;
    repository.createFeaturedProfile = async (id, profile, forwardedTransaction) => {
        captured = { id, profile, forwardedTransaction };
        return { ...profile, id };
    };
    repository.userIsFeaturedArtist = async (userId) => userId === 'artist_1';
    repository.setUserFeaturedArtistStatus = async (userId, granted) => (
        userId === 'missing' ? null : { id: userId, is_featured_artist: granted }
    );

    try {
        delete require.cache[
            require.resolve('@/modules/featuredProfile/application/service')
        ];
        const service = require('@/modules/featuredProfile/application/service');
        const created = await service.createFeaturedProfile({
            name: 'Nghe Si Thu Nghiem',
            followerCount: 999,
            ownerUserId: 'spoofed-owner',
            externalLinks: {
                youtube: 'https://youtube.com/example',
            },
        }, {
            creatorId: 'organizer_1',
            transaction,
        });

        assert.match(created.id, /^fp_/);
        assert.strictEqual(created.slug, 'nghe-si-thu-nghiem');
        assert.strictEqual(created.ownerUserId, 'organizer_1');
        assert.strictEqual(created.createdByUserId, 'organizer_1');
        assert.strictEqual(created.followerCount, 0);
        assert.strictEqual(captured.forwardedTransaction, transaction);
        assert.strictEqual(captured.profile.externalLinks.youtube, 'https://youtube.com/example');
        assert.strictEqual(await service.isFeaturedArtist('artist_1'), true);
        assert.strictEqual(await service.isFeaturedArtist('organizer_1'), false);
        assert.deepStrictEqual(
            await service.grantFeaturedArtist('artist_1'),
            { userId: 'artist_1', isFeaturedArtist: true }
        );

        await assert.rejects(
            () => service.createFeaturedProfile({
                name: 'Unsafe Link',
                externalLinks: { youtube: 'javascript:alert(1)' },
            }, { creatorId: 'organizer_1' }),
            /http or https/
        );

        const migration = fs.readFileSync(
            path.resolve(__dirname, '../../db/migrations/074_featured_artist_profiles.sql'),
            'utf8'
        );
        assert.match(migration, /uq_featured_profiles_slug/);
        assert.match(migration, /created_by_user_id/);
        assert.match(migration, /is_featured_artist BOOLEAN NOT NULL DEFAULT false/);

        const routes = fs.readFileSync(
            path.resolve(__dirname, '../../src/modules/featuredProfile/api/routes.js'),
            'utf8'
        );
        assert.match(routes, /\/slug\/:slug/);
        assert.match(routes, /normalizeProfilePayload/);

        console.log('Phase 07 featured artist smoke passed.');
    } finally {
        repository.featuredProfileSlugExists = original.featuredProfileSlugExists;
        repository.createFeaturedProfile = original.createFeaturedProfile;
        repository.userIsFeaturedArtist = original.userIsFeaturedArtist;
        repository.setUserFeaturedArtistStatus = original.setUserFeaturedArtistStatus;
    }
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
