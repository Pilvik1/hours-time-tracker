import { formatDuration, fromDateKey } from "@/lib/format";
import type { Client, DurationFormat, Project, TimeEntry } from "@/lib/types";

export function TimesheetTable({
  entries,
  projects,
  clients,
  durationFormat = "hh:mm",
  totalSeconds,
  onEdit,
}: {
  entries: TimeEntry[];
  projects: Project[];
  clients: Client[];
  durationFormat?: DurationFormat;
  totalSeconds: number;
  onEdit?: (entry: TimeEntry) => void;
}) {
  const projectById = new Map(projects.map((p) => [p.id, p] as const));
  const clientById = new Map(clients.map((c) => [c.id, c] as const));

  return (
    <div className="min-h-0 flex-1 overflow-auto scrollbar-thin">
      <table className="w-full min-w-[900px] border-collapse text-[12.5px]">
        <thead className="sticky top-0 z-10 bg-surface">
          <tr className="border-b border-border-strong text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
            <th className="px-3 py-2 font-semibold">Date</th>
            <th className="px-3 py-2 font-semibold">Start</th>
            <th className="px-3 py-2 font-semibold">End</th>
            <th className="px-3 py-2 text-right font-semibold">Duration</th>
            <th className="px-3 py-2 font-semibold">Project</th>
            <th className="px-3 py-2 font-semibold">Client</th>
            <th className="px-3 py-2 font-semibold">Title</th>
            <th className="w-[34%] px-3 py-2 font-semibold">Comment</th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 && (
            <tr>
              <td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">
                No hours in this period.
              </td>
            </tr>
          )}
          {entries.map((entry) => {
            const project = entry.project_id ? projectById.get(entry.project_id) : undefined;
            const client = project?.client_id ? clientById.get(project.client_id) : undefined;
            return (
              <tr
                key={entry.id}
                onClick={() => onEdit?.(entry)}
                className="cursor-pointer border-b border-border/60 transition-colors hover:bg-secondary/25"
              >
                <td className="tabular whitespace-nowrap px-3 py-1.5 text-muted-foreground">
                  {fromDateKey(entry.date).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                  })}
                </td>
                <td className="tabular px-3 py-1.5 text-muted-foreground">{entry.start_time}</td>
                <td className="tabular px-3 py-1.5 text-muted-foreground">{entry.end_time}</td>
                <td className="tabular px-3 py-1.5 text-right text-foreground">
                  {formatDuration(entry.duration_seconds, durationFormat)}
                </td>
                <td className="whitespace-nowrap px-3 py-1.5" style={{ color: project?.color }}>
                  {project?.name ?? "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 text-muted-foreground">
                  {client?.name ?? "—"}
                </td>
                <td className="px-3 py-1.5 text-foreground">{entry.description}</td>
                <td className="px-3 py-1.5 text-muted-foreground">{entry.comment ?? ""}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="sticky bottom-0 bg-surface">
          <tr className="border-t border-border-strong">
            <td
              colSpan={3}
              className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
            >
              Total hours
            </td>
            <td className="tabular px-3 py-2 text-right text-[15px] text-primary">
              {formatDuration(totalSeconds, durationFormat)}
            </td>
            <td colSpan={4} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
