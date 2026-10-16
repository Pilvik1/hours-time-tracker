import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { EntryEditor } from "@/components/app/EntryEditor";
import { ExportDialog } from "@/components/app/ExportDialog";
import { ProjectSelect } from "@/components/app/ProjectSelect";
import { TimesheetTable } from "@/components/app/TimesheetTable";
import { WeekNav } from "@/components/app/WeekNav";
import { useEntryActions } from "@/components/app/useEntryActions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { clientsQuery, entriesQuery, projectsQuery, settingsQuery } from "@/lib/queries";
import { toDateKey } from "@/lib/format";
import { getWeek, rangeLabel } from "@/lib/week";

export const Route = createFileRoute("/timesheet")({
  head: () => ({
    meta: [
      { title: "Timesheet — Hours" },
      {
        name: "description",
        content: "Review the week's hours row by row before reporting them to your employer.",
      },
      { property: "og:title", content: "Timesheet — Hours" },
      {
        property: "og:description",
        content: "Review the week's hours row by row before reporting them to your employer.",
      },
    ],
  }),
  component: TimesheetPage,
});

const ALL = "__all__";

function TimesheetPage() {
  const [offset, setOffset] = useState(0);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const { data: settings } = useQuery(settingsQuery());
  const week = useMemo(
    () => getWeek(offset, settings?.week_starts_on ?? "monday"),
    [offset, settings],
  );
  const { data: entryResult } = useQuery(
    entriesQuery({
      from: toDateKey(week.start),
      to: toDateKey(week.end),
      project_id: projectId,
      client_id: clientId,
    }),
  );
  const { data: projects = [] } = useQuery(projectsQuery());
  const { data: clients = [] } = useQuery(clientsQuery());
  const actions = useEntryActions();

  const entries = entryResult?.items ?? [];
  const total = entryResult?.aggregates.total_seconds ?? 0;

  return (
    <>
      <WeekNav
        week={week}
        onOffsetChange={setOffset}
        totalSeconds={total}
        durationFormat={settings?.duration_format ?? "hh:mm"}
      >
        <span className="hidden text-[11px] text-muted-foreground lg:inline">
          {rangeLabel(week.start, week.end)}
        </span>
        <ProjectSelect
          value={projectId}
          onChange={setProjectId}
          includeAll
          placeholder="All projects"
          className="w-[150px]"
        />
        <Select
          value={clientId ?? ALL}
          onValueChange={(value) => setClientId(value === ALL ? null : value)}
        >
          <SelectTrigger className="h-8 w-[140px] border-border bg-surface/60 text-xs">
            <SelectValue placeholder="All clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All clients</SelectItem>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ExportDialog />
      </WeekNav>

      <TimesheetTable
        entries={entries}
        projects={projects}
        clients={clients}
        durationFormat={settings?.duration_format ?? "hh:mm"}
        totalSeconds={total}
        onEdit={actions.edit}
      />

      <EntryEditor draft={actions.draft} onClose={actions.close} />
    </>
  );
}
