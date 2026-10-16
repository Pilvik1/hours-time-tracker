import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { formatDuration } from "@/lib/format";
import { weekLabel, type WeekRange } from "@/lib/week";
import type { DurationFormat } from "@/lib/types";

export function WeekNav({
  week,
  onOffsetChange,
  totalSeconds,
  durationFormat = "hh:mm",
  children,
}: {
  week: WeekRange;
  onOffsetChange: (offset: number) => void;
  totalSeconds: number;
  durationFormat?: DurationFormat;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex h-12 shrink-0 flex-wrap items-center gap-3 border-b border-border px-3">
      <div className="flex items-center rounded-md border border-border">
        <button
          type="button"
          aria-label="Previous week"
          onClick={() => onOffsetChange(week.offset - 1)}
          className="grid size-7 place-items-center text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="flex items-center gap-2 border-x border-border px-3 py-1 text-[13px]">
          <CalendarDays className="size-3.5 text-muted-foreground" />
          {weekLabel(week)}
          <span className="text-muted-foreground">· W{week.isoWeek}</span>
        </span>
        <button
          type="button"
          aria-label="Next week"
          onClick={() => onOffsetChange(week.offset + 1)}
          className="grid size-7 place-items-center text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Week total
        </span>
        <span className="tabular text-[15px] text-primary">
          {formatDuration(totalSeconds, durationFormat)}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2">{children}</div>
    </div>
  );
}
