const { query } = require('./postgres.client');

function getClient(transaction) {
    return transaction && typeof transaction.query === 'function'
        ? transaction
        : { query };
}

function rowToFeaturedProfile(row) {
    if (!row) return null;
    let data;
    if (row.raw_data && Object.keys(row.raw_data).length > 0) {
        data = { ...row.raw_data };
    } else {
        data = {
            name: row.name,
            profileType: row.profile_type || 'artist',
            bio: row.bio || '',
            imageUrl: row.image_url || '',
            genres: row.genres || [],
            followerCount: row.follower_count != null ? Number(row.follower_count) : 0,
            ownerUserId: row.owner_user_id || null,
        };
        // ensure both followerCount and followersCount exist for complete safety only when raw_data does not exist
        if (data.followerCount === undefined && data.followersCount !== undefined) {
            data.followerCount = data.followersCount;
        } else if (data.followersCount === undefined && data.followerCount !== undefined) {
            data.followersCount = data.followerCount;
        }
    }
    data.id = row.id;
    data.name = row.name;
    data.profileType = row.profile_type || 'artist';
    data.bio = row.bio || '';
    data.imageUrl = row.image_url || '';
    data.genres = row.genres || [];
    data.followerCount = row.follower_count != null ? Number(row.follower_count) : 0;
    data.followersCount = data.followerCount;
    data.ownerUserId = row.owner_user_id || null;
    data.slug = row.slug || data.slug || null;
    data.bannerUrl = row.banner_url || data.bannerUrl || '';
    data.avatarUrl = row.avatar_url || data.avatarUrl || data.imageUrl || '';
    data.categoryTag = row.category_tag || data.categoryTag || null;
    data.externalLinks = row.external_links || data.externalLinks || {};
    data.createdByUserId = row.created_by_user_id || data.createdByUserId || null;
    return data;
}

const getFeaturedProfilesPage = async (page = 1, limit = 10) => {
    const offset = (page - 1) * limit;

    const countResult = await query('SELECT COUNT(*)::int AS count FROM featured_profiles');
    const totalProfiles = countResult.rows[0].count;

    const result = await query(
        `SELECT id, name, profile_type, bio, image_url, genres, follower_count,
                owner_user_id, slug, banner_url, avatar_url, category_tag,
                external_links, created_by_user_id, raw_data
         FROM featured_profiles
         ORDER BY name
         LIMIT $1 OFFSET $2`,
        [limit, offset]
    );

    const profiles = result.rows.map(rowToFeaturedProfile);

    return {
        profiles,
        pagination: {
            currentPage: page,
            limit: limit,
            totalPages: Math.ceil(totalProfiles / limit),
            totalItems: totalProfiles
        }
    };
};

const getFeaturedProfileById = async (profileId, transaction = null) => {
    const client = getClient(transaction);
    const result = await client.query(
        `SELECT id, name, profile_type, bio, image_url, genres, follower_count,
                owner_user_id, slug, banner_url, avatar_url, category_tag,
                external_links, created_by_user_id, raw_data
         FROM featured_profiles
         WHERE id = $1`,
        [profileId]
    );
    if (result.rows.length === 0) {
        return null;
    }
    return rowToFeaturedProfile(result.rows[0]);
};

const getFeaturedProfileBySlug = async (slug) => {
    const result = await query(
        `SELECT id, name, profile_type, bio, image_url, genres, follower_count,
                owner_user_id, slug, banner_url, avatar_url, category_tag,
                external_links, created_by_user_id, raw_data
         FROM featured_profiles
         WHERE LOWER(slug) = LOWER($1)`,
        [slug]
    );
    return result.rows.length > 0 ? rowToFeaturedProfile(result.rows[0]) : null;
};

const featuredProfileSlugExists = async (slug, transaction = null) => {
    const client = getClient(transaction);
    const result = await client.query(
        'SELECT 1 FROM featured_profiles WHERE LOWER(slug) = LOWER($1)',
        [slug]
    );
    return result.rows.length > 0;
};

const createFeaturedProfile = async (profileId, profile, transaction = null) => {
    const client = getClient(transaction);
    const name = profile.name || '';
    const profileType = profile.profileType || 'artist';
    const bio = profile.bio || '';
    const imageUrl = profile.imageUrl || '';
    const genres = profile.genres || [];
    const followerCount = profile.followerCount != null ? Number(profile.followerCount) : 0;
    const ownerUserId = profile.ownerUserId || null;
    const slug = profile.slug || null;
    const bannerUrl = profile.bannerUrl || '';
    const avatarUrl = profile.avatarUrl || imageUrl;
    const categoryTag = profile.categoryTag || null;
    const externalLinks = profile.externalLinks || {};
    const createdByUserId = profile.createdByUserId || ownerUserId;

    await client.query(
        `INSERT INTO featured_profiles (
            id, name, profile_type, bio, image_url, genres, follower_count,
            owner_user_id, slug, banner_url, avatar_url, category_tag,
            external_links, created_by_user_id, raw_data, updated_at
         )
         VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
            $13::jsonb, $14, $15::jsonb, NOW()
         )
         ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            profile_type = EXCLUDED.profile_type,
            bio = EXCLUDED.bio,
            image_url = EXCLUDED.image_url,
            genres = EXCLUDED.genres,
            follower_count = EXCLUDED.follower_count,
            owner_user_id = EXCLUDED.owner_user_id,
            slug = EXCLUDED.slug,
            banner_url = EXCLUDED.banner_url,
            avatar_url = EXCLUDED.avatar_url,
            category_tag = EXCLUDED.category_tag,
            external_links = EXCLUDED.external_links,
            created_by_user_id = EXCLUDED.created_by_user_id,
            raw_data = EXCLUDED.raw_data,
            updated_at = NOW()`,
        [
            profileId,
            name,
            profileType,
            bio,
            imageUrl,
            genres,
            followerCount,
            ownerUserId,
            slug,
            bannerUrl,
            avatarUrl,
            categoryTag,
            JSON.stringify(externalLinks),
            createdByUserId,
            JSON.stringify(profile),
        ]
    );
    return { ...profile, id: profileId };
};

const updateFeaturedProfile = async (profileId, updateData, transaction = null) => {
    const existing = await getFeaturedProfileById(profileId, transaction);
    if (!existing) {
        throw new Error('Featured profile not found');
    }

    const updated = { ...existing, ...updateData };
    await createFeaturedProfile(profileId, updated, transaction);
    return getFeaturedProfileById(profileId, transaction);
};

const deleteFeaturedProfile = async (profileId) => {
    await query('DELETE FROM featured_profiles WHERE id = $1', [profileId]);
};

const userHasOrganizerRole = async (userId) => {
    if (!userId) {
        return false;
    }
    const result = await query('SELECT roles FROM auth_users WHERE id = $1', [userId]);
    if (result.rows.length === 0) return false;
    const roles = result.rows[0].roles || [];
    return roles.includes('organizer');
};

const userHasAdminRole = async (userId) => {
    if (!userId) return false;
    const result = await query('SELECT roles FROM auth_users WHERE id = $1', [userId]);
    if (result.rows.length === 0) return false;
    const roles = result.rows[0].roles || [];
    return roles.includes('admin');
};

const userIsFeaturedArtist = async (userId) => {
    if (!userId) return false;
    const result = await query(
        'SELECT is_featured_artist FROM auth_users WHERE id = $1',
        [userId]
    );
    return result.rows[0]?.is_featured_artist === true;
};

const setUserFeaturedArtistStatus = async (userId, isFeaturedArtist = true) => {
    const result = await query(
        `UPDATE auth_users
         SET is_featured_artist = $2
         WHERE id = $1
         RETURNING id, is_featured_artist`,
        [userId, isFeaturedArtist === true]
    );
    return result.rows[0] || null;
};

const getFeaturedProfilesByIds = async (ids) => {
    if (!ids || ids.length === 0) return [];
    
    const result = await query(
        `SELECT id, name, profile_type, bio, image_url, genres, follower_count,
                owner_user_id, slug, banner_url, avatar_url, category_tag,
                external_links, created_by_user_id, raw_data
         FROM featured_profiles
         WHERE id = ANY($1)`,
        [ids]
    );
    return result.rows.map(rowToFeaturedProfile);
};

const getFeaturedProfileNamesByIds = async (ids) => {
    if (!ids || ids.length === 0) return [];
    const result = await query(
        'SELECT name FROM featured_profiles WHERE id = ANY($1)',
        [ids]
    );
    return result.rows.map(row => row.name);
};

const getFeaturedProfilesDataByIds = async (ids) => {
    return getFeaturedProfilesByIds(ids);
};

const getAllFeaturedProfiles = async () => {
    const result = await query(
        `SELECT id, name, profile_type, bio, image_url, genres, follower_count,
                owner_user_id, slug, banner_url, avatar_url, category_tag,
                external_links, created_by_user_id, raw_data
         FROM featured_profiles
         ORDER BY name`
    );
    return result.rows.map(rowToFeaturedProfile);
};

module.exports = {
    getFeaturedProfilesPage,
    getFeaturedProfileById,
    getFeaturedProfileBySlug,
    featuredProfileSlugExists,
    createFeaturedProfile,
    updateFeaturedProfile,
    deleteFeaturedProfile,
    userHasOrganizerRole,
    userHasAdminRole,
    userIsFeaturedArtist,
    setUserFeaturedArtistStatus,
    getFeaturedProfilesByIds,
    getFeaturedProfileNamesByIds,
    getFeaturedProfilesDataByIds,
    getAllFeaturedProfiles,
};
