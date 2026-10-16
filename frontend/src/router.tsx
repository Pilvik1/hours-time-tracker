import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { routeTree } from "./routeTree.gen";
import { ApiError } from "./services/apiClient";

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (Array.isArray(error.detail)) return "Please check the submitted values.";
    if (typeof error.detail === "string") return error.detail;
  }
  return error instanceof Error ? error.message : "Something went wrong";
}

export const getRouter = () => {
  const queryClient = new QueryClient({
    queryCache: new QueryCache({ onError: (error) => toast.error(errorMessage(error)) }),
    mutationCache: new MutationCache({ onError: (error) => toast.error(errorMessage(error)) }),
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: true } },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
