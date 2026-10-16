import type { Settings } from "@/lib/types";
import { apiRequest } from "./apiClient";

export const settingsService = {
  get(): Promise<Settings> {
    return apiRequest<Settings>("/settings");
  },

  update(patch: Partial<Settings>): Promise<Settings> {
    return apiRequest<Settings>("/settings", { method: "PATCH", body: JSON.stringify(patch) });
  },
};
