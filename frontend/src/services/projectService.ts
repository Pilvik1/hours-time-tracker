import type { Project } from "@/lib/types";
import { apiRequest } from "./apiClient";

export const projectService = {
  list(): Promise<Project[]> {
    return apiRequest<Project[]>("/projects");
  },

  create(input: Omit<Project, "id">): Promise<Project> {
    return apiRequest<Project>("/projects", { method: "POST", body: JSON.stringify(input) });
  },

  update(id: string, patch: Partial<Omit<Project, "id">>): Promise<Project> {
    return apiRequest<Project>(`/projects/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },
};
