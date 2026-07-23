import { request, requestCached } from "./apiClient";
import type { FeaturedProfile } from "@/types";

export class ProfileService {
  static async list(
    page = 1,
    limit = 10,
  ): Promise<{ profiles: FeaturedProfile[] }> {
    return requestCached<{ profiles: FeaturedProfile[] }>(
      "GET",
      `/api/web/profiles?page=${page}&limit=${limit}`,
    );
  }

  static async getById(id: string): Promise<FeaturedProfile> {
    return request<FeaturedProfile>("GET", `/api/web/profiles/${id}`);
  }
}
