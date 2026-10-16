import type { Tag } from "@/lib/types";
import { apiRequest } from "./apiClient";

export const tagService = {
  list(): Promise<Tag[]> {
    return apiRequest<Tag[]>("/tags");
  },

  create(input: Omit<Tag, "id">): Promise<Tag> {
    return apiRequest<Tag>("/tags", { method: "POST", body: JSON.stringify(input) });
  },

  update(id: string, patch: Omit<Tag, "id">): Promise<Tag> {
    return apiRequest<Tag>(`/tags/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
  },

  delete(id: string): Promise<void> {
    return apiRequest<void>(`/tags/${id}`, { method: "DELETE" });
  },

  async resolveIds(names: string[]): Promise<string[]> {
    if (names.length === 0) return [];
    const tags = await this.list();
    const byName = new Map(tags.map((tag) => [tag.name, tag.id] as const));
    return names.map((name) => byName.get(name)).filter((id): id is string => Boolean(id));
  },
};
