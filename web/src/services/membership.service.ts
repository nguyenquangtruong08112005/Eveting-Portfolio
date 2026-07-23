import { request } from "./apiClient";
import type { Membership } from "@/types";

export class MembershipService {
  static async getMine(): Promise<Membership> {
    return request<Membership>("GET", "/api/web/memberships/me");
  }
}
