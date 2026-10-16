import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { toDateKey } from "@/lib/format";
import {
  useCreateEntry,
  useDeleteEntry,
  useDuplicateEntry,
  useInvalidateEntries,
  useUpdateEntry,
} from "@/lib/queries";
import { timerService } from "@/services";
import type { TimeEntry } from "@/lib/types";
import { toDraft, type EntryDraft } from "./EntryEditor";

export function useEntryActions(defaultDate?: string) {
  const [draft, setDraft] = useState<EntryDraft | null>(null);
  const create = useCreateEntry();
  const duplicateEntry = useDuplicateEntry();
  const update = useUpdateEntry();
  const remove = useDeleteEntry();
  const invalidate = useInvalidateEntries();

  const newEntry = useCallback(
    (overrides?: Partial<EntryDraft>) =>
      setDraft({
        description: "",
        comment: null,
        project_id: null,
        date: defaultDate ?? toDateKey(new Date()),
        start_time: "09:00",
        end_time: "10:00",
        duration_seconds: 3600,
        billable: true,
        tags: [],
        ...overrides,
      }),
    [defaultDate],
  );

  const edit = useCallback((entry: TimeEntry) => setDraft(toDraft(entry)), []);

  const quickCreate = useCallback(
    async (entryDraft: EntryDraft): Promise<TimeEntry | null> => {
      try {
        const created = await create.mutateAsync({
          ...entryDraft,
          description: entryDraft.description.trim() || "Untitled work",
        });
        toast.success("1-hour entry added", { duration: 1400 });
        return created;
      } catch {
        toast.error("Could not create the entry");
        return null;
      }
    },
    [create],
  );

  const duplicate = useCallback(
    async (entry: TimeEntry) => {
      await duplicateEntry.mutateAsync({ id: entry.id });
      toast.success("Entry duplicated");
    },
    [duplicateEntry],
  );

  const destroy = useCallback(
    async (entry: TimeEntry) => {
      await remove.mutateAsync(entry.id);
      toast.success("Entry deleted");
    },
    [remove],
  );

  const startTimer = useCallback(
    async (entry: TimeEntry) => {
      await timerService.restart(entry.id);
      invalidate();
      toast.success("Timer started");
    },
    [invalidate],
  );

  const commitMove = useCallback(
    (id: string, patch: { date: string; start_time: string; end_time: string }) => {
      void update.mutateAsync({ id, patch });
    },
    [update],
  );

  // N opens a new entry, Esc closes the editor.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const inField =
        target &&
        (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if (event.key === "Escape") return setDraft(null);
      if (
        (event.key === "n" || event.key === "N") &&
        !inField &&
        !event.metaKey &&
        !event.ctrlKey
      ) {
        event.preventDefault();
        newEntry();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [newEntry]);

  return {
    draft,
    setDraft,
    newEntry,
    quickCreate,
    edit,
    duplicate,
    destroy,
    startTimer,
    commitMove,
    close: () => setDraft(null),
  };
}
