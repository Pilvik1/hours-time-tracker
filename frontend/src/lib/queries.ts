import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  authService,
  clientService,
  projectService,
  reportService,
  settingsService,
  tagService,
  timeEntryService,
  timerService,
} from "@/services";
import type { EntryQuery } from "@/services/timeEntryService";
import type { SummaryQuery } from "@/services/reportService";
import type { TimeEntryInput } from "./types";

export const entriesQuery = (query: EntryQuery = {}) =>
  queryOptions({
    queryKey: ["entries", query],
    queryFn: () => timeEntryService.getEntries(query),
  });

export const authQuery = () =>
  queryOptions({
    queryKey: ["auth"],
    queryFn: () => authService.status(),
    staleTime: 30_000,
  });

export const projectsQuery = () =>
  queryOptions({ queryKey: ["projects"], queryFn: () => projectService.list() });

export const clientsQuery = () =>
  queryOptions({ queryKey: ["clients"], queryFn: () => clientService.list() });

export const tagsQuery = () =>
  queryOptions({ queryKey: ["tags"], queryFn: () => tagService.list() });

export const settingsQuery = () =>
  queryOptions({ queryKey: ["settings"], queryFn: () => settingsService.get() });

export const timerQuery = () =>
  queryOptions({
    queryKey: ["timer"],
    queryFn: () => timerService.get(),
    refetchInterval: 30_000,
  });

export const summaryQuery = (query: SummaryQuery) =>
  queryOptions({ queryKey: ["summary", query], queryFn: () => reportService.getSummary(query) });

export function useInvalidateEntries() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["entries"] });
    queryClient.invalidateQueries({ queryKey: ["summary"] });
    queryClient.invalidateQueries({ queryKey: ["timer"] });
  };
}

export function useProjects() {
  return useQuery(projectsQuery());
}

export function useSettings() {
  return useQuery(settingsQuery());
}

export function useCreateEntry() {
  const invalidate = useInvalidateEntries();
  return useMutation({
    mutationFn: (input: TimeEntryInput) => timeEntryService.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateEntry() {
  const invalidate = useInvalidateEntries();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<TimeEntryInput> }) =>
      timeEntryService.update(id, patch),
    onSuccess: invalidate,
  });
}

export function useDeleteEntry() {
  const invalidate = useInvalidateEntries();
  return useMutation({
    mutationFn: (id: string) => timeEntryService.delete(id),
    onSuccess: invalidate,
  });
}

export function useDuplicateEntry() {
  const invalidate = useInvalidateEntries();
  return useMutation({
    mutationFn: ({ id, date }: { id: string; date?: string }) =>
      timeEntryService.duplicate(id, date),
    onSuccess: invalidate,
  });
}
