import type { UserProfile } from '@/types';

/**
 * Server profile shape (mobile mapper) differs from web form fields.
 * Normalize both directions so UI always uses UserProfile.
 *
 * API returns:  userName, aboutMe, profilePictureUrl, followedProfileIds, interests
 * Form uses:    name, bio, profilePicUrl, interests, ageRange
 * API accepts:  name, aboutMe, interests, profilePicUrl, address  (not bio/ageRange)
 */

type ApiProfile = Record<string, unknown>;

export function normalizeUserProfile(raw: unknown): UserProfile {
  const p = (raw && typeof raw === 'object' ? raw : {}) as ApiProfile;
  const interests = Array.isArray(p.interests)
    ? (p.interests as string[])
    : Array.isArray((p.matchingPreferences as { interests?: string[] } | undefined)?.interests)
      ? ((p.matchingPreferences as { interests: string[] }).interests)
      : [];

  const ageRange =
    (typeof p.ageRange === 'string' && p.ageRange) ||
    (typeof (p.matchingPreferences as { ageRange?: string } | undefined)?.ageRange === 'string'
      ? (p.matchingPreferences as { ageRange: string }).ageRange
      : undefined);

  return {
    id: String(p.id ?? ''),
    email: typeof p.email === 'string' ? p.email : undefined,
    name:
      (typeof p.name === 'string' && p.name) ||
      (typeof p.userName === 'string' && p.userName) ||
      undefined,
    bio:
      (typeof p.bio === 'string' && p.bio) ||
      (typeof p.aboutMe === 'string' && p.aboutMe) ||
      undefined,
    profilePicUrl:
      (typeof p.profilePicUrl === 'string' && p.profilePicUrl) ||
      (typeof p.profilePictureUrl === 'string' && p.profilePictureUrl) ||
      undefined,
    interests,
    ageRange,
    roles: Array.isArray(p.roles) ? (p.roles as string[]) : undefined,
    createdAt: typeof p.createdAt === 'string' || typeof p.createdAt === 'number'
      ? String(p.createdAt)
      : undefined,
  };
}

/** Body fields the server update validator / helper actually accepts. */
export function toProfileUpdateBody(data: Partial<UserProfile>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (data.name !== undefined) body.name = data.name;
  // Server maps aboutMe → bio in buildProfileUpdateData
  if (data.bio !== undefined) body.aboutMe = data.bio;
  if (data.interests !== undefined) body.interests = data.interests;
  if (data.profilePicUrl !== undefined && data.profilePicUrl) {
    body.profilePicUrl = data.profilePicUrl;
  }
  // ageRange intentionally not sent — not changeable from web (server does not update it)
  return body;
}
