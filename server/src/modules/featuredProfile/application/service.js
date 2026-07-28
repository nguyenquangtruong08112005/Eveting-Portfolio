const { randomUUID } = require('crypto');
const featuredProfileRepository = require('@/providers/database/featuredProfile.repository');
const { BadRequestError, NotFoundError } = require('@/shared/errors');
const logger = require('@/shared/logger');

const PROFILE_TYPES = new Set(['artist', 'performer', 'influencer', 'speaker', 'organization']);
const EXTERNAL_LINK_KEYS = new Set([
    'officialWebsite',
    'spotify',
    'youtube',
    'instagram',
    'facebook',
]);

function slugify(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 100);
}

function normalizeExternalLinks(value) {
    if (value == null) return {};
    if (typeof value !== 'object' || Array.isArray(value)) {
        throw new BadRequestError('externalLinks must be an object.');
    }

    const normalized = {};
    for (const [key, rawUrl] of Object.entries(value)) {
        if (!EXTERNAL_LINK_KEYS.has(key)) {
            throw new BadRequestError(`Unsupported external link "${key}".`);
        }
        if (rawUrl == null || rawUrl === '') continue;
        let parsed;
        try {
            parsed = new URL(String(rawUrl));
        } catch (error) {
            throw new BadRequestError(`External link "${key}" must be a valid URL.`);
        }
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            throw new BadRequestError(`External link "${key}" must use http or https.`);
        }
        normalized[key] = parsed.toString();
    }
    return normalized;
}

function buildProfileData(profileData, creatorId, slug) {
    const profileType = profileData.profileType || 'artist';
    if (!PROFILE_TYPES.has(profileType)) {
        throw new BadRequestError('Unsupported featured profile type.');
    }

    const name = String(profileData.name || '').trim();
    if (!name) throw new BadRequestError('Featured profile name is required.');

    const imageUrl = profileData.imageUrl || profileData.avatarUrl || '';
    return {
        name,
        profileType,
        bio: String(profileData.bio || '').trim(),
        imageUrl,
        avatarUrl: profileData.avatarUrl || imageUrl,
        bannerUrl: profileData.bannerUrl || '',
        genres: Array.isArray(profileData.genres)
            ? [...new Set(profileData.genres.map((genre) => String(genre).trim()).filter(Boolean))]
            : [],
        categoryTag: profileData.categoryTag || null,
        externalLinks: normalizeExternalLinks(profileData.externalLinks),
        followerCount: 0,
        ownerUserId: creatorId,
        createdByUserId: creatorId,
        slug,
    };
}

async function allocateSlug(name, requestedSlug, transaction) {
    const base = slugify(requestedSlug || name) || 'artist';
    if (!(await featuredProfileRepository.featuredProfileSlugExists(base, transaction))) {
        return base;
    }
    return `${base.slice(0, 91)}-${randomUUID().slice(0, 8)}`;
}

const getAllFeaturedProfiles = async (page = 1, limit = 10) => {
    return featuredProfileRepository.getFeaturedProfilesPage(page, limit);
};

const getFeaturedProfileById = async (profileId) => {
    return featuredProfileRepository.getFeaturedProfileById(profileId);
};

const getFeaturedProfileBySlug = async (slug) => {
    return featuredProfileRepository.getFeaturedProfileBySlug(slug);
};

const createFeaturedProfile = async (
    profileData,
    { creatorId, transaction = null } = {}
) => {
    if (!creatorId) throw new BadRequestError('Featured profile creator is required.');

    const profileId = `fp_${randomUUID()}`;
    const slug = await allocateSlug(profileData.name, profileData.slug, transaction);
    const newProfile = buildProfileData(profileData, creatorId, slug);
    const created = await featuredProfileRepository.createFeaturedProfile(
        profileId,
        newProfile,
        transaction
    );
    logger.info('Featured profile created', {
        profileId,
        creatorId,
        source: transaction ? 'event_builder' : 'profile_api',
    });
    return created;
};

const updateFeaturedProfile = async (profileId, updateData) => {
    const existing = await featuredProfileRepository.getFeaturedProfileById(profileId);
    if (!existing) throw new NotFoundError('Featured profile not found.');

    const allowed = {
        name: updateData.name,
        profileType: updateData.profileType,
        bio: updateData.bio,
        imageUrl: updateData.imageUrl,
        avatarUrl: updateData.avatarUrl,
        bannerUrl: updateData.bannerUrl,
        genres: updateData.genres,
        categoryTag: updateData.categoryTag,
        externalLinks: updateData.externalLinks,
    };
    Object.keys(allowed).forEach((key) => {
        if (allowed[key] === undefined) delete allowed[key];
    });

    if (allowed.profileType && !PROFILE_TYPES.has(allowed.profileType)) {
        throw new BadRequestError('Unsupported featured profile type.');
    }
    if (allowed.name !== undefined) {
        allowed.name = String(allowed.name).trim();
        if (!allowed.name) throw new BadRequestError('Featured profile name is required.');
    }
    if (allowed.bio !== undefined) allowed.bio = String(allowed.bio).trim();
    if (allowed.genres !== undefined) {
        allowed.genres = [
            ...new Set(allowed.genres.map((genre) => String(genre).trim()).filter(Boolean)),
        ];
    }
    if (allowed.externalLinks !== undefined) {
        allowed.externalLinks = normalizeExternalLinks(allowed.externalLinks);
    }
    if (updateData.slug !== undefined) {
        const requestedSlug = slugify(updateData.slug);
        if (!requestedSlug) throw new BadRequestError('slug is invalid.');
        const matching = await featuredProfileRepository.getFeaturedProfileBySlug(requestedSlug);
        if (matching && matching.id !== profileId) {
            throw new BadRequestError('slug is already in use.');
        }
        allowed.slug = requestedSlug;
    }

    return featuredProfileRepository.updateFeaturedProfile(profileId, allowed);
};

const deleteFeaturedProfile = async (profileId) => {
    const existing = await featuredProfileRepository.getFeaturedProfileById(profileId);
    if (!existing) throw new NotFoundError('Featured profile not found.');
    await featuredProfileRepository.deleteFeaturedProfile(profileId);
};

const hasAdminPrivileges = async (userId) => {
    return featuredProfileRepository.userHasAdminRole(userId);
};

const isFeaturedArtist = async (userId) => {
    return featuredProfileRepository.userIsFeaturedArtist(userId);
};

const grantFeaturedArtist = async (userId) => {
    const granted = await featuredProfileRepository.setUserFeaturedArtistStatus(userId, true);
    if (!granted) throw new NotFoundError('User not found.');
    return { userId: granted.id, isFeaturedArtist: granted.is_featured_artist === true };
};

module.exports = {
    getAllFeaturedProfiles,
    getFeaturedProfileById,
    getFeaturedProfileBySlug,
    createFeaturedProfile,
    updateFeaturedProfile,
    deleteFeaturedProfile,
    hasAdminPrivileges,
    isFeaturedArtist,
    grantFeaturedArtist,
};
