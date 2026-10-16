import { useEffect, useState } from "react";
import { Copy, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ProjectSelect } from "./ProjectSelect";
import { TagPicker } from "./TagPicker";
import { formatDuration, minutesToTime, timeToMinutes } from "@/lib/format";
import {
  useCreateEntry,
  useDeleteEntry,
  useDuplicateEntry,
  useInvalidateEntries,
  useUpdateEntry,
} from "@/lib/queries";
import { timerService } from "@/services";
import type { TimeEntry, TimeEntryInput } from "@/lib/types";

export type EntryDraft = TimeEntryInput & { id?: string };

export function toDraft(entry: TimeEntry): EntryDraft {
  return {
    id: entry.id,
    description: entry.description,
    comment: entry.comment,
    project_id: entry.project_id,
    date: entry.date,
    start_time: entry.start_time,
    end_time: entry.end_time,
    duration_seconds: entry.duration_seconds,
    billable: entry.billable,
    tags: entry.tags,
  };
}

export function EntryEditor({ draft, onClose }: { draft: EntryDraft | null; onClose: () => void }) {
  const [form, setForm] = useState<EntryDraft | null>(draft);
  const create = useCreateEntry();
  const update = useUpdateEntry();
  const duplicateEntry = useDuplicateEntry();
  const remove = useDeleteEntry();
  const invalidate = useInvalidateEntries();

  useEffect(() => setForm(draft), [draft]);

  if (!form) return null;

  const set = <K extends keyof EntryDraft>(key: K, value: EntryDraft[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const startMinutes = timeToMinutes(form.start_time);
  const rawEndMinutes = timeToMinutes(form.end_time);
  const durationMinutes = Math.max(
    0,
    rawEndMinutes < startMinutes
      ? rawEndMinutes + 1440 - startMinutes
      : rawEndMinutes - startMinutes,
  );

  const setDurationFromText = (text: string) => {
    const [h, m] = text.split(":").map((n) => Number(n) || 0);
    const minutes = Math.max(1, (h || 0) * 60 + (m || 0));
    set("end_time", minutesToTime(timeToMinutes(form.start_time) + minutes));
  };

  const save = async () => {
    const payload: TimeEntryInput = {
      description: form.description.trim() || "Untitled work",
      comment: form.comment?.trim() ? form.comment : null,
      project_id: form.project_id,
      date: form.date,
      start_time: form.start_time,
      end_time: form.end_time,
      duration_seconds: durationMinutes * 60,
      billable: form.billable,
      tags: form.tags,
    };
    if (form.id) await update.mutateAsync({ id: form.id, patch: payload });
    else await create.mutateAsync(payload);
    toast.success(form.id ? "Entry updated" : "Entry created");
    onClose();
  };

  const duplicate = async () => {
    if (form.id) await duplicateEntry.mutateAsync({ id: form.id });
    else {
      const { id: _id, ...rest } = form;
      await create.mutateAsync({ ...rest, duration_seconds: durationMinutes * 60 });
    }
    toast.success("Entry duplicated");
    onClose();
  };

  const destroy = async () => {
    if (!form.id) return onClose();
    await remove.mutateAsync(form.id);
    toast.success("Entry deleted");
    onClose();
  };

  const startFromEntry = async () => {
    if (form.id) await timerService.restart(form.id);
    else {
      await timerService.start({
        description: form.description,
        comment: form.comment,
        project_id: form.project_id,
        billable: form.billable,
        tags: form.tags,
      });
    }
    invalidate();
    toast.success("Timer started");
    onClose();
  };

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 bg-surface p-0 sm:max-w-[400px]"
      >
        <div className="border-b border-border px-4 py-3">
          <SheetTitle className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {form.id ? "Edit entry" : "New entry"}
          </SheetTitle>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto scrollbar-thin px-4 py-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="title"
              className="text-[11px] uppercase tracking-wide text-muted-foreground"
            >
              Title
            </Label>
            <Input
              id="title"
              autoFocus
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Research synthesis"
              className="h-10 border-border bg-background text-[15px] font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="comment"
              className="text-[11px] uppercase tracking-wide text-muted-foreground"
            >
              Comment
            </Label>
            <Textarea
              id="comment"
              value={form.comment ?? ""}
              onChange={(e) => set("comment", e.target.value)}
              rows={4}
              placeholder="Updated management assumptions and revised sensitivity analysis."
              className="resize-none border-border bg-background text-[13px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Project
            </Label>
            <ProjectSelect
              value={form.project_id}
              onChange={(value) => set("project_id", value)}
              className="h-9 w-full text-[13px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="date"
                className="text-[11px] uppercase tracking-wide text-muted-foreground"
              >
                Date
              </Label>
              <Input
                id="date"
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                className="h-9 border-border bg-background text-[13px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Duration
              </Label>
              <Input
                value={formatDuration(durationMinutes * 60)}
                onChange={(e) => setDurationFromText(e.target.value)}
                className="tabular h-9 border-border bg-background text-[13px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="start"
                className="text-[11px] uppercase tracking-wide text-muted-foreground"
              >
                Start
              </Label>
              <Input
                id="start"
                type="time"
                value={form.start_time ?? ""}
                onChange={(e) => set("start_time", e.target.value)}
                className="tabular h-9 border-border bg-background text-[13px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="end"
                className="text-[11px] uppercase tracking-wide text-muted-foreground"
              >
                End
              </Label>
              <Input
                id="end"
                type="time"
                value={form.end_time ?? ""}
                onChange={(e) => set("end_time", e.target.value)}
                className="tabular h-9 border-border bg-background text-[13px]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Tags
            </Label>
            <TagPicker
              value={form.tags}
              onChange={(tags) => set("tags", tags)}
              className="h-9 w-full"
            />
          </div>

          <div className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
            <Label htmlFor="billable" className="text-[13px]">
              Billable
            </Label>
            <Switch
              id="billable"
              checked={form.billable}
              onCheckedChange={(checked) => set("billable", checked)}
            />
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => void duplicate()}
            >
              <Copy className="mr-1.5 size-3.5" /> Duplicate
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => void startFromEntry()}
            >
              <Play className="mr-1.5 size-3.5" /> Start timer
            </Button>
            {form.id && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-destructive hover:text-destructive"
                onClick={() => void destroy()}
              >
                <Trash2 className="mr-1.5 size-3.5" /> Delete
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8 bg-primary text-xs text-primary-foreground hover:bg-primary-hover"
            onClick={() => void save()}
            disabled={create.isPending || update.isPending}
          >
            Save
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
