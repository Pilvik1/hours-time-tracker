import type { Client } from "@/lib/types";
import { apiRequest } from "./apiClient";

export const clientService = {
  list(): Promise<Client[]> {
    return apiRequest<Client[]>("/clients");
  },

  create(input: Omit<Client, "id">): Promise<Client> {
    return apiRequest<Client>("/clients", { method: "POST", body: JSON.stringify(input) });
  },

  update(id: string, patch: Partial<Omit<Client, "id">>): Promise<Client> {
    return apiRequest<Client>(`/clients/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },
};
