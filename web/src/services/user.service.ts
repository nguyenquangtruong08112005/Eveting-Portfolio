import { request } from './apiClient';
import type { UserProfile } from '@/types';
import { normalizeUserProfile, toProfileUpdateBody } from '@/lib/user-profile';

export class UserService {
  static async getMe(): Promise<UserProfile> {
    const raw = await request<unknown>('GET', '/users/me');
    return normalizeUserProfile(raw);
  }

  static async updateMe(data: Partial<UserProfile>): Promise<UserProfile> {
    const raw = await request<unknown>('PUT', '/users/me', {
      body: toProfileUpdateBody(data),
    });
    // Prefer normalized response; merge with submitted fields if API omits some
    const normalized = normalizeUserProfile(raw);
    return {
      ...normalized,
      name: normalized.name ?? data.name,
      bio: normalized.bio ?? data.bio,
      interests: normalized.interests?.length ? normalized.interests : data.interests,
      profilePicUrl: normalized.profilePicUrl ?? data.profilePicUrl,
      ageRange: normalized.ageRange ?? data.ageRange,
    };
  }

  static async registerProfile(data: {
    name?: string;
    profilePicUrl?: string;
    bio?: string;
    interests?: string[];
    ageRange?: string;
  }): Promise<{ message: string }> {
    return request<{ message: string }>('POST', '/users/register', {
      body: {
        name: data.name,
        profilePicUrl: data.profilePicUrl,
        // register builder uses bio directly
        bio: data.bio,
        interests: data.interests,
        ageRange: data.ageRange,
      },
    });
  }

  static async follow(profileId: string): Promise<{ message: string }> {
    return request<{ message: string }>('POST', '/users/me/follow', {
      body: { profileId },
    });
  }

  static async unfollow(profileId: string): Promise<{ message: string }> {
    return request<{ message: string }>('DELETE', `/users/me/follow/${profileId}`);
  }

  static async removeDeviceToken(fcmToken: string): Promise<{ message: string }> {
    return request<{ message: string }>('POST', '/users/me/device-token/remove', {
      body: { fcmToken },
    });
  }
}
