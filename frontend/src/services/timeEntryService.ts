import type { Tag, TimeEntry, TimeEntryInput, TimeEntryList } from "@/lib/types";
import { apiRequest, queryString } from "./apiClient";
import { tagService } from "./tagService";

export interface EntryQuery {
  from?: string;
  to?: string;
  day?: string;
  week?: string;
  month?: string;
  project_id?: string | null;
  client_id?: string | null;
  tag_id?: string | null;
  billable?: boolean | null;
}

export interface ApiTimeEntry extends Omit<TimeEntry, "tags"> {
  tags: Tag[];
}

interface ApiTimeEntryList extends Omit<TimeEntryList, "items"> {
  items: ApiTimeEntry[];
}

export function toUiEntry(entry: ApiTimeEntry): TimeEntry {
  return { ...entry, tags: entry.tags.map((tag) => tag.name) };
}

async function entryPayload(input: Partial<TimeEntryInput>): Promise<Record<string, unknown>> {
  const payload: Record<string, unknown> = { ...input };
  if (input.tags !== undefined) payload["tags"] = await tagService.resolveIds(input.tags);
  if (input.start_time && input.end_time) delete payload["duration_seconds"];
  return payload;
}

export const timeEntryService = {
  async getEntries(query: EntryQuery = {}): Promise<TimeEntryList> {
    const result = await apiRequest<ApiTimeEntryList>(
      `/time-entries${queryString({
        start_date: query.from,
        end_date: query.to,
        day: query.day,
        week: query.week,
        month: query.month,
        project_id: query.project_id,
        client_id: query.client_id,
        tag_id: query.tag_id,
        billable: query.billable,
      })}`,
    );
    return { ...result, items: result.items.map(toUiEntry) };
  },

  async create(input: TimeEntryInput): Promise<TimeEntry> {
    const result = await apiRequest<ApiTimeEntry>("/time-entries", {
      method: "POST",
      body: JSON.stringify(await entryPayload(input)),
    });
    return toUiEntry(result);
  },

  async update(id: string, patch: Partial<TimeEntryInput>): Promise<TimeEntry> {
    const result = await apiRequest<ApiTimeEntry>(`/time-entries/${id}`, {
      method: "PATCH",
      body: JSON.stringify(await entryPayload(patch)),
    });
    return toUiEntry(result);
  },

  delete(id: string): Promise<void> {
    return apiRequest<void>(`/time-entries/${id}`, { method: "DELETE" });
  },

  async duplicate(id: string, date?: string): Promise<TimeEntry> {
    const result = await apiRequest<ApiTimeEntry>(`/time-entries/${id}/duplicate`, {
      method: "POST",
      body: JSON.stringify(date ? { date } : {}),
    });
    return toUiEntry(result);
  },
};
