import { request } from "./apiClient";
import type { Review } from "@/types";

export class ReviewService {
  static async listByEvent(eventId: string): Promise<{ reviews: Review[] }> {
    return request<{ reviews: Review[] }>(
      "GET",
      `/api/web/events/${eventId}/reviews`,
    );
  }

  static async create(
    eventId: string,
    data: { rating: number; comment?: string },
  ): Promise<Review> {
    return request<Review>("POST", `/api/web/events/${eventId}/reviews`, {
      body: data,
    });
  }
}
