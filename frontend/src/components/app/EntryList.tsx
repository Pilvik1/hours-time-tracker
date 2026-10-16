import { Copy, Play, Trash2 } from "lucide-react";
import { formatDuration } from "@/lib/format";
import type { DurationFormat, Project, TimeEntry } from "@/lib/types";
import { fromDateKey } from "@/lib/format";
import { ProjectDot } from "./ProjectSelect";

export function EntryList({
  entries,
  projects,
  durationFormat = "hh:mm",
  dailyTotals,
  onEdit,
  onDuplicate,
  onDelete,
  onStartTimer,
}: {
  entries: TimeEntry[];
  projects: Project[];
  durationFormat?: DurationFormat;
  dailyTotals: Record<string, number>;
  onEdit: (entry: TimeEntry) => void;
  onDuplicate: (entry: TimeEntry) => void;
  onDelete: (entry: TimeEntry) => void;
  onStartTimer: (entry: TimeEntry) => void;
}) {
  const days = [...new Set(entries.map((e) => e.date))].sort();
  const projectById = new Map(projects.map((p) => [p.id, p] as const));

  if (entries.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-10 text-center">
        <div>
          <p className="text-sm text-foreground">No hours logged this week</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Start the timer above, or press N to add an entry manually.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
      {days.map((day) => {
        const dayEntries = entries.filter((e) => e.date === day);
        const total = dailyTotals[day] ?? 0;
        return (
          <section key={day}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-y border-border bg-surface px-3 py-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {fromDateKey(day).toLocaleDateString("en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "short",
                })}
              </span>
              <span className="tabular text-[13px] text-foreground">
                {formatDuration(total, durationFormat)}
              </span>
            </div>
            <ul>
              {dayEntries.map((entry) => {
                const project = entry.project_id ? projectById.get(entry.project_id) : undefined;
                return (
                  <li
                    key={entry.id}
                    className="group flex cursor-pointer items-start gap-3 border-b border-border/60 px-3 py-2 transition-colors hover:bg-secondary/25"
                    onClick={() => onEdit(entry)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-foreground">
                        {entry.description || "Untitled work"}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <ProjectDot color={project?.color ?? "#7C8F82"} />
                        <span style={{ color: project?.color }}>
                          {project?.name ?? "No project"}
                        </span>
                        {entry.tags.length > 0 && <span>· {entry.tags.join(", ")}</span>}
                        {!entry.billable && <span>· non-billable</span>}
                      </p>
                      {entry.comment && (
                        <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
                          {entry.comment}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        title="Start timer from entry"
                        onClick={(event) => {
                          event.stopPropagation();
                          onStartTimer(entry);
                        }}
                        className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                      >
                        <Play className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Duplicate"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDuplicate(entry);
                        }}
                        className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                      >
                        <Copy className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Delete"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDelete(entry);
                        }}
                        className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>

                    <div className="w-[150px] shrink-0 text-right">
                      <p className="tabular text-[12px] text-muted-foreground">
                        {entry.start_time} – {entry.end_time}
                      </p>
                      <p className="tabular text-[13px] text-foreground">
                        {formatDuration(entry.duration_seconds, durationFormat)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
