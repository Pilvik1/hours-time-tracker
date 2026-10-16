import type { Tag, TimeEntry, TimerState } from "@/lib/types";
import { apiRequest } from "./apiClient";
import { tagService } from "./tagService";
import { toUiEntry, type ApiTimeEntry } from "./timeEntryService";

export interface TimerStartInput {
  description: string;
  comment?: string | null;
  project_id?: string | null;
  billable?: boolean;
  tags?: string[];
}

interface ApiTimerState extends Omit<TimerState, "tags"> {
  tags: Tag[];
}

function toUiTimer(timer: ApiTimerState): TimerState {
  return { ...timer, tags: timer.tags.map((tag) => tag.name) };
}

async function timerPayload(input: Partial<TimerStartInput>): Promise<Record<string, unknown>> {
  const payload: Record<string, unknown> = { ...input };
  if (input.tags !== undefined) payload["tags"] = await tagService.resolveIds(input.tags);
  return payload;
}

export const timerService = {
  async get(): Promise<TimerState> {
    return toUiTimer(await apiRequest<ApiTimerState>("/timer"));
  },

  async start(input: TimerStartInput): Promise<TimerState> {
    return toUiTimer(
      await apiRequest<ApiTimerState>("/timer/start", {
        method: "POST",
        body: JSON.stringify(await timerPayload(input)),
      }),
    );
  },

  async update(input: Partial<TimerStartInput>): Promise<TimerState> {
    return toUiTimer(
      await apiRequest<ApiTimerState>("/timer", {
        method: "PATCH",
        body: JSON.stringify(await timerPayload(input)),
      }),
    );
  },

  async stop(): Promise<TimeEntry> {
    return toUiEntry(
      await apiRequest<ApiTimeEntry>("/timer/stop", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );
  },

  async restart(entryId: string): Promise<TimerState> {
    return toUiTimer(
      await apiRequest<ApiTimerState>(`/timer/restart/${entryId}`, { method: "POST" }),
    );
  },
};
