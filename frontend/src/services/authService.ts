import type { AuthStatus } from "@/lib/types";
import { ApiError, apiRequest } from "./apiClient";

export const authService = {
  async status(): Promise<AuthStatus> {
    try {
      return await apiRequest<AuthStatus>("/auth/status");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return { authenticated: false };
      throw error;
    }
  },

  login(password: string): Promise<AuthStatus> {
    return apiRequest<AuthStatus>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ password }),
    });
  },

  logout(): Promise<AuthStatus> {
    return apiRequest<AuthStatus>("/auth/logout", { method: "POST" });
  },
};
