import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/app/PageHeader";
import { ProjectDot } from "@/components/app/ProjectSelect";
import { ExportDialog } from "@/components/app/ExportDialog";
import { Input } from "@/components/ui/input";
import { settingsQuery, summaryQuery } from "@/lib/queries";
import { formatDuration, fromDateKey, toDateKey } from "@/lib/format";
import { addDays, getWeek } from "@/lib/week";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Hours" },
      { name: "description", content: "Hours by day, project and client for any date range." },
      { property: "og:title", content: "Reports — Hours" },
      {
        property: "og:description",
        content: "Hours by day, project and client for any date range.",
      },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const initial = getWeek(0);
  const [from, setFrom] = useState(toDateKey(addDays(initial.start, -21)));
  const [to, setTo] = useState(toDateKey(initial.end));
  const { data: settings } = useQuery(settingsQuery());
  const format = settings?.duration_format ?? "hh:mm";
  const { data: summary } = useQuery(summaryQuery({ from, to }));

  const chartData = (summary?.by_day ?? []).map((day) => ({
    label: fromDateKey(day.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    hours: Number((day.seconds / 3600).toFixed(2)),
  }));

  return (
    <>
      <PageHeader title="Reports">
        <Input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="h-8 w-[140px] border-border bg-surface/60 text-xs"
        />
        <Input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="h-8 w-[140px] border-border bg-surface/60 text-xs"
        />
        <ExportDialog />
      </PageHeader>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin p-4">
        <div className="rounded-md border border-border bg-surface px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Total hours
          </p>
          <p className="tabular mt-1 text-2xl tracking-tight text-primary">
            {formatDuration(summary?.total_seconds ?? 0, format)}
          </p>
        </div>

        <section className="mt-3 rounded-md border border-border bg-surface">
          <header className="border-b border-border px-4 py-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Hours by day
            </h2>
          </header>
          <div className="h-56 px-2 py-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid stroke="var(--color-grid-line)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
                  stroke="var(--color-border)"
                />
                <YAxis
                  tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
                  stroke="var(--color-border)"
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border-strong)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "var(--color-muted-foreground)" }}
                />
                <Bar dataKey="hours" fill="var(--color-chart-2)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <section className="rounded-md border border-border bg-surface">
            <header className="border-b border-border px-4 py-2">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Hours by project
              </h2>
            </header>
            <ul className="divide-y divide-border/60">
              {(summary?.by_project ?? []).map((project) => (
                <li
                  key={project.project_id ?? "none"}
                  className="flex items-center justify-between px-4 py-2 text-[13px]"
                >
                  <span className="flex items-center gap-2 text-foreground">
                    <ProjectDot color={project.color} />
                    {project.name}
                  </span>
                  <span className="tabular text-muted-foreground">
                    {formatDuration(project.seconds, format)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-md border border-border bg-surface">
            <header className="border-b border-border px-4 py-2">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Hours by client
              </h2>
            </header>
            <ul className="divide-y divide-border/60">
              {(summary?.by_client ?? []).map((client) => (
                <li
                  key={client.client_id ?? "none"}
                  className="flex items-center justify-between px-4 py-2 text-[13px]"
                >
                  <span className="text-foreground">{client.name}</span>
                  <span className="tabular text-muted-foreground">
                    {formatDuration(client.seconds, format)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
