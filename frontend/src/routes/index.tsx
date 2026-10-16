import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntryEditor } from "@/components/app/EntryEditor";
import { EntryList } from "@/components/app/EntryList";
import { ExportDialog } from "@/components/app/ExportDialog";
import { WeekCalendar } from "@/components/app/WeekCalendar";
import { WeekNav } from "@/components/app/WeekNav";
import { useEntryActions } from "@/components/app/useEntryActions";
import { entriesQuery, projectsQuery, settingsQuery } from "@/lib/queries";
import { toDateKey } from "@/lib/format";
import { getWeek } from "@/lib/week";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Timer — Hours" },
      {
        name: "description",
        content: "Track work hours in a weekly calendar with a persistent timer.",
      },
      { property: "og:title", content: "Timer — Hours" },
      {
        property: "og:description",
        content: "Track work hours in a weekly calendar with a persistent timer.",
      },
    ],
  }),
  component: TimerPage,
});

type View = "calendar" | "list";

function TimerPage() {
  const [offset, setOffset] = useState(0);
  const [view, setView] = useState<View>("calendar");
  const { data: settings } = useQuery(settingsQuery());
  const week = useMemo(
    () => getWeek(offset, settings?.week_starts_on ?? "monday"),
    [offset, settings],
  );
  const range = { from: toDateKey(week.start), to: toDateKey(week.end) };
  const { data: entryResult } = useQuery(entriesQuery(range));
  const entries = entryResult?.items ?? [];
  const { data: projects = [] } = useQuery(projectsQuery());
  const actions = useEntryActions(toDateKey(week.days[0]!));

  const total = entryResult?.aggregates.total_seconds ?? 0;
  const dailyTotals = Object.fromEntries(
    (entryResult?.aggregates.daily_totals ?? []).map((item) => [item.date, item.seconds]),
  );

  return (
    <>
      <WeekNav
        week={week}
        onOffsetChange={setOffset}
        totalSeconds={total}
        durationFormat={settings?.duration_format ?? "hh:mm"}
      >
        <div className="flex items-center rounded-md border border-border p-0.5">
          {(["calendar", "list"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setView(option)}
              className={cn(
                "rounded-[4px] px-2.5 py-1 text-xs capitalize transition-colors",
                view === option
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option}
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs"
          onClick={() => actions.newEntry()}
          title="New entry (N)"
        >
          <Plus className="mr-1 size-3.5" /> New
        </Button>
        <ExportDialog />
      </WeekNav>

      {view === "calendar" ? (
        <WeekCalendar
          week={week}
          entries={entries}
          projects={projects}
          durationFormat={settings?.duration_format ?? "hh:mm"}
          defaultBillable={settings?.default_billable ?? true}
          dailyTotals={dailyTotals}
          onEdit={actions.edit}
          onCreate={actions.quickCreate}
          onDuplicate={(entry) => void actions.duplicate(entry)}
          onDelete={(entry) => void actions.destroy(entry)}
          onStartTimer={(entry) => void actions.startTimer(entry)}
          onCommit={actions.commitMove}
        />
      ) : (
        <EntryList
          entries={entries}
          projects={projects}
          durationFormat={settings?.duration_format ?? "hh:mm"}
          dailyTotals={dailyTotals}
          onEdit={actions.edit}
          onDuplicate={(entry) => void actions.duplicate(entry)}
          onDelete={(entry) => void actions.destroy(entry)}
          onStartTimer={(entry) => void actions.startTimer(entry)}
        />
      )}

      <EntryEditor draft={actions.draft} onClose={actions.close} />
    </>
  );
}
