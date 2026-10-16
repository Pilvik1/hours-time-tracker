import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Pencil, Play, Trash2 } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { formatDuration, minutesToTime, timeToMinutes, toDateKey } from "@/lib/format";
import { layoutCalendarIntervals } from "@/lib/calendarLayout";
import { isToday, type WeekRange } from "@/lib/week";
import type { DurationFormat, Project, TimeEntry } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { EntryDraft } from "./EntryEditor";

const HOUR_HEIGHT = 52;
const SNAP = 15;
const DAY_START_HOUR = 0;

interface DragState {
  id: string;
  mode: "move" | "resize";
  startX: number;
  startY: number;
  origStart: number;
  origEnd: number;
  origDate: string;
}

export function WeekCalendar({
  week,
  entries,
  projects,
  durationFormat = "hh:mm",
  defaultBillable = true,
  dailyTotals,
  onEdit,
  onCreate,
  onDuplicate,
  onDelete,
  onStartTimer,
  onCommit,
}: {
  week: WeekRange;
  entries: TimeEntry[];
  projects: Project[];
  durationFormat?: DurationFormat;
  defaultBillable?: boolean;
  dailyTotals: Record<string, number>;
  onEdit: (entry: TimeEntry) => void;
  onCreate: (draft: EntryDraft) => Promise<TimeEntry | null>;
  onDuplicate: (entry: TimeEntry) => void;
  onDelete: (entry: TimeEntry) => void;
  onStartTimer: (entry: TimeEntry) => void;
  onCommit: (id: string, patch: { date: string; start_time: string; end_time: string }) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const creatingRef = useRef(false);
  const dragMovedRef = useRef(false);
  const previewRef = useRef<typeof preview>(null);
  const suppressClickUntilRef = useRef(0);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [preview, setPreview] = useState<{
    id: string;
    date: string;
    start: number;
    end: number;
  } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nowMinutes, setNowMinutes] = useState(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  });

  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p] as const)), [projects]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const n = new Date();
      setNowMinutes(n.getHours() * 60 + n.getMinutes());
    }, 60000);
    return () => window.clearInterval(id);
  }, []);

  // Open the working part of the day on mount.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 7 * HOUR_HEIGHT;
  }, []);

  const dayKeys = useMemo(() => week.days.map(toDateKey), [week.days]);

  useEffect(() => {
    if (!drag) return;

    const move = (event: PointerEvent) => {
      const grid = gridRef.current;
      if (!grid) return;
      if (
        !dragMovedRef.current &&
        Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 4
      ) {
        return;
      }
      dragMovedRef.current = true;
      setSelectedId(drag.id);
      const columnWidth = grid.clientWidth / 7;
      const dyMinutes =
        Math.round((((event.clientY - drag.startY) / HOUR_HEIGHT) * 60) / SNAP) * SNAP;

      if (drag.mode === "resize") {
        const end = Math.min(1440, Math.max(drag.origStart + SNAP, drag.origEnd + dyMinutes));
        const nextPreview = { id: drag.id, date: drag.origDate, start: drag.origStart, end };
        previewRef.current = nextPreview;
        setPreview(nextPreview);
        return;
      }

      const dxDays = Math.round((event.clientX - drag.startX) / columnWidth);
      const originIndex = dayKeys.indexOf(drag.origDate);
      const nextIndex = Math.min(6, Math.max(0, originIndex + dxDays));
      const length = drag.origEnd - drag.origStart;
      const start = Math.min(1440 - length, Math.max(0, drag.origStart + dyMinutes));
      const nextPreview = { id: drag.id, date: dayKeys[nextIndex]!, start, end: start + length };
      previewRef.current = nextPreview;
      setPreview(nextPreview);
    };

    const up = () => {
      const finalPreview = previewRef.current;
      if (dragMovedRef.current && finalPreview) {
        onCommit(finalPreview.id, {
          date: finalPreview.date,
          start_time: minutesToTime(finalPreview.start),
          end_time: minutesToTime(finalPreview.end),
        });
        suppressClickUntilRef.current = performance.now() + 250;
      }
      dragMovedRef.current = false;
      previewRef.current = null;
      setDrag(null);
      setPreview(null);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [drag, dayKeys, onCommit]);

  const handleBackgroundClick = async (dayKey: string, event: React.MouseEvent<HTMLDivElement>) => {
    if (creatingRef.current) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const minutes =
      Math.round((((event.clientY - bounds.top) / HOUR_HEIGHT) * 60) / SNAP) * SNAP +
      DAY_START_HOUR * 60;
    const start = Math.min(1440 - 60, Math.max(0, minutes));
    creatingRef.current = true;
    try {
      const created = await onCreate({
        description: "Untitled work",
        comment: null,
        project_id: null,
        date: dayKey,
        start_time: minutesToTime(start),
        end_time: minutesToTime(start + 60),
        duration_seconds: 3600,
        billable: defaultBillable,
        tags: [],
      });
      if (created) setSelectedId(created.id);
    } finally {
      creatingRef.current = false;
    }
  };

  const dayTotalValues = dayKeys.map((key) => dailyTotals[key] ?? 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Day header */}
      <div className="flex shrink-0 border-b border-border">
        <div className="w-14 shrink-0 border-r border-border" />
        <div className="grid flex-1 grid-cols-7">
          {week.days.map((day, index) => {
            const today = isToday(day);
            return (
              <div
                key={dayKeys[index]}
                className={cn(
                  "flex items-baseline gap-2 border-r border-border px-2 py-2 last:border-r-0",
                  today && "bg-secondary/25",
                )}
              >
                <span
                  className={cn(
                    "tabular text-lg leading-none",
                    today
                      ? "grid size-6 place-items-center rounded-full bg-primary text-[13px] font-semibold text-primary-foreground"
                      : "text-foreground",
                  )}
                >
                  {day.getDate()}
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    {day.toLocaleDateString("en-GB", { weekday: "short" })}
                  </span>
                  <span className="tabular block text-[11px] text-muted-foreground">
                    {formatDuration(dayTotalValues[index] ?? 0, durationFormat)}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scrollable grid */}
      <div
        ref={scrollRef}
        data-testid="calendar-scroll"
        className="min-h-0 flex-1 overflow-y-auto scrollbar-thin"
      >
        <div className="flex">
          <div className="w-14 shrink-0 border-r border-border">
            {Array.from({ length: 24 }, (_, hour) => (
              <div key={hour} className="relative" style={{ height: HOUR_HEIGHT }}>
                <span className="tabular absolute -top-1.5 right-2 text-[10px] text-muted-foreground">
                  {hour === 0 ? "" : `${String(hour).padStart(2, "0")}:00`}
                </span>
              </div>
            ))}
          </div>

          <div ref={gridRef} className="relative grid flex-1 grid-cols-7">
            {week.days.map((day, dayIndex) => {
              const dayKey = dayKeys[dayIndex]!;
              const today = isToday(day);
              const dayEntries = layoutCalendarIntervals(
                entries.flatMap((entry) => {
                  const isPreview = preview?.id === entry.id;
                  const date = isPreview ? preview.date : entry.date;
                  if (date !== dayKey) return [];
                  const start = isPreview ? preview.start : timeToMinutes(entry.start_time);
                  const rawEnd = isPreview ? preview.end : timeToMinutes(entry.end_time);
                  return [
                    {
                      id: entry.id,
                      entry,
                      start,
                      end: rawEnd || start + 30,
                      isPreview,
                    },
                  ];
                }),
              );

              return (
                <div
                  key={dayKey}
                  className={cn(
                    "relative border-r border-border last:border-r-0",
                    today && "bg-secondary/15",
                  )}
                  style={{ height: HOUR_HEIGHT * 24 }}
                  onClick={(event) => {
                    if (event.target === event.currentTarget) {
                      void handleBackgroundClick(dayKey, event);
                    }
                  }}
                  data-testid={`calendar-day-${dayKey}`}
                >
                  {Array.from({ length: 24 }, (_, hour) => (
                    <div
                      key={hour}
                      className="pointer-events-none absolute inset-x-0 border-t"
                      style={{ top: hour * HOUR_HEIGHT, borderColor: "var(--color-grid-line)" }}
                    />
                  ))}

                  {today && (
                    <div
                      className="pointer-events-none absolute inset-x-0 z-20 border-t border-primary/70"
                      style={{ top: (nowMinutes / 60) * HOUR_HEIGHT }}
                    >
                      <span className="absolute -top-1 -left-1 size-2 rounded-full bg-primary" />
                    </div>
                  )}

                  {dayEntries.map(({ item, lane, laneCount }) => {
                    const { entry, isPreview, start: startMinutes, end: endMinutes } = item;
                    const top = (startMinutes / 60) * HOUR_HEIGHT;
                    const height = Math.max(
                      18,
                      ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT - 2,
                    );
                    const project = entry.project_id
                      ? projectById.get(entry.project_id)
                      : undefined;
                    const color = project?.color ?? "#7C8F82";

                    return (
                      <ContextMenu key={entry.id}>
                        <ContextMenuTrigger asChild>
                          <div
                            role="button"
                            tabIndex={0}
                            aria-pressed={selectedId === entry.id}
                            aria-label={`${entry.description || "Untitled work"}, ${entry.start_time} to ${entry.end_time}`}
                            data-entry-id={entry.id}
                            onPointerDown={(event) => {
                              if (event.button !== 0) return;
                              dragMovedRef.current = false;
                              previewRef.current = null;
                              setDrag({
                                id: entry.id,
                                mode: "move",
                                startX: event.clientX,
                                startY: event.clientY,
                                origStart: timeToMinutes(entry.start_time),
                                origEnd: timeToMinutes(entry.end_time),
                                origDate: entry.date,
                              });
                            }}
                            onClick={(event) => {
                              event.stopPropagation();
                              if (performance.now() < suppressClickUntilRef.current) return;
                              if (selectedId === entry.id) onEdit(entry);
                              else setSelectedId(entry.id);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") onEdit(entry);
                            }}
                            className={cn(
                              "group absolute z-10 cursor-grab touch-none overflow-hidden rounded-[4px] border-l-2 bg-surface-raised px-1.5 py-1 text-left transition-[box-shadow,background-color] hover:bg-accent hover:z-30 hover:shadow-[0_2px_10px_rgba(0,0,0,0.35)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                              selectedId === entry.id && "z-30 ring-1 ring-primary/70",
                              isPreview && "z-40 opacity-90 shadow-lg",
                            )}
                            style={{
                              top,
                              height,
                              left: `calc(${(lane / laneCount) * 100}% + 2px)`,
                              width: `calc(${100 / laneCount}% - 4px)`,
                              borderLeftColor: color,
                            }}
                          >
                            <p className="truncate text-[11px] font-medium leading-tight text-foreground">
                              {entry.description || "Untitled work"}
                            </p>
                            {height > 34 && (
                              <p className="truncate text-[10px] leading-tight" style={{ color }}>
                                {project?.name ?? "No project"}
                              </p>
                            )}
                            {height > 64 && entry.comment && (
                              <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
                                {entry.comment}
                              </p>
                            )}
                            <p className="tabular absolute bottom-0.5 left-1.5 text-[10px] text-muted-foreground">
                              {height > 46
                                ? formatDuration((endMinutes - startMinutes) * 60, durationFormat)
                                : ""}
                            </p>
                            <span
                              onPointerDown={(event) => {
                                event.stopPropagation();
                                dragMovedRef.current = false;
                                previewRef.current = null;
                                setDrag({
                                  id: entry.id,
                                  mode: "resize",
                                  startX: event.clientX,
                                  startY: event.clientY,
                                  origStart: timeToMinutes(entry.start_time),
                                  origEnd: timeToMinutes(entry.end_time),
                                  origDate: entry.date,
                                });
                              }}
                              className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize opacity-0 transition-opacity group-hover:opacity-100"
                              style={{ backgroundColor: color }}
                            />
                          </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="w-44">
                          <ContextMenuItem onClick={() => onEdit(entry)}>
                            <Pencil className="mr-2 size-3.5" /> Edit
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => onStartTimer(entry)}>
                            <Play className="mr-2 size-3.5" /> Start timer
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => onDuplicate(entry)}>
                            <Copy className="mr-2 size-3.5" /> Duplicate
                          </ContextMenuItem>
                          <ContextMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => onDelete(entry)}
                          >
                            <Trash2 className="mr-2 size-3.5" /> Delete
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
