import { request } from "./apiClient";
import { Event } from "@/types";

export interface PendingEventsResponse {
  events: Event[];
  page: number;
  limit: number;
  total: number;
}

function normalizePendingPayload(data: unknown): PendingEventsResponse {
  if (Array.isArray(data)) {
    return {
      events: data as Event[],
      page: 1,
      limit: data.length,
      total: data.length,
    };
  }
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const events = Array.isArray(obj.events)
      ? (obj.events as Event[])
      : Array.isArray(obj.data)
        ? (obj.data as Event[])
        : [];
    return {
      events,
      page: typeof obj.page === "number" ? obj.page : 1,
      limit: typeof obj.limit === "number" ? obj.limit : events.length,
      total: typeof obj.total === "number" ? obj.total : events.length,
    };
  }
  return { events: [], page: 1, limit: 20, total: 0 };
}

export class AdminService {
  static async getPendingEvents(
    page = 1,
    limit = 20,
  ): Promise<PendingEventsResponse> {
    const data = await request<unknown>(
      "GET",
      `/api/admin/events/pending?page=${page}&limit=${limit}`,
    );
    return normalizePendingPayload(data);
  }

  static async approveEvent(eventId: string): Promise<{ message: string }> {
    return request<{ message: string }>(
      "POST",
      `/api/admin/events/${eventId}/approve`,
    );
  }

  static async rejectEvent(
    eventId: string,
    reason: string,
  ): Promise<{ message: string }> {
    return request<{ message: string }>(
      "POST",
      `/api/admin/events/${eventId}/reject`,
      {
        body: { reason },
      },
    );
  }
}
