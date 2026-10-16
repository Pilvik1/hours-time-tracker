import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/app/PageHeader";
import { ProjectDot } from "@/components/app/ProjectSelect";
import { entriesQuery, projectsQuery, settingsQuery, summaryQuery } from "@/lib/queries";
import { formatDuration, fromDateKey, toDateKey } from "@/lib/format";
import { addDays, getWeek, monthRange } from "@/lib/week";

export const Route = createFileRoute("/overview")({
  head: () => ({
    meta: [
      { title: "Overview — Hours" },
      { name: "description", content: "Today, this week and this month at a glance." },
      { property: "og:title", content: "Overview — Hours" },
      { property: "og:description", content: "Today, this week and this month at a glance." },
    ],
  }),
  component: OverviewPage,
});

function OverviewPage() {
  const { data: settings } = useQuery(settingsQuery());
  const format = settings?.duration_format ?? "hh:mm";
  const today = toDateKey(new Date());
  const week = getWeek(0, settings?.week_starts_on ?? "monday");
  const month = monthRange();

  const { data: todayResult } = useQuery(entriesQuery({ from: today, to: today }));
  const { data: weekSummary } = useQuery(
    summaryQuery({ from: toDateKey(week.start), to: toDateKey(week.end) }),
  );
  const { data: monthSummary } = useQuery(
    summaryQuery({ from: toDateKey(month.from), to: toDateKey(month.to) }),
  );
  const { data: recentResult } = useQuery(
    entriesQuery({ from: toDateKey(addDays(new Date(), -13)), to: today }),
  );
  const { data: projects = [] } = useQuery(projectsQuery());

  const recent = recentResult?.items ?? [];
  const todaySeconds = todayResult?.aggregates.total_seconds ?? 0;
  const byProject = weekSummary?.by_project ?? [];
  const maxProject = Math.max(1, ...byProject.map((p) => p.seconds));

  const stats = [
    { label: "Today", value: todaySeconds },
    { label: "This week", value: weekSummary?.total_seconds ?? 0 },
    { label: "This month", value: monthSummary?.total_seconds ?? 0 },
  ];

  return (
    <>
      <PageHeader
        title="Overview"
        description={settings ? `${settings.name} · ${settings.employer_name}` : undefined}
      />

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-md border border-border bg-surface px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {stat.label}
              </p>
              <p className="tabular mt-1 text-2xl tracking-tight text-foreground">
                {formatDuration(stat.value, format)}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <section className="rounded-md border border-border bg-surface">
            <header className="flex items-center justify-between border-b border-border px-4 py-2">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Recent work
              </h2>
              <Link to="/" className="text-[11px] text-primary hover:underline">
                Open timer
              </Link>
            </header>
            <ul className="divide-y divide-border/60">
              {recent
                .slice()
                .reverse()
                .slice(0, 8)
                .map((entry) => {
                  const project = projects.find((p) => p.id === entry.project_id);
                  return (
                    <li key={entry.id} className="flex items-center gap-3 px-4 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] text-foreground">{entry.description}</p>
                        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <ProjectDot color={project?.color ?? "#7C8F82"} />
                          {project?.name ?? "No project"} ·{" "}
                          {fromDateKey(entry.date).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                          })}
                        </p>
                      </div>
                      <span className="tabular text-[13px] text-muted-foreground">
                        {formatDuration(entry.duration_seconds, format)}
                      </span>
                    </li>
                  );
                })}
              {recent.length === 0 && (
                <li className="px-4 py-6 text-center text-xs text-muted-foreground">
                  Nothing logged yet.
                </li>
              )}
            </ul>
          </section>

          <section className="rounded-md border border-border bg-surface">
            <header className="border-b border-border px-4 py-2">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Hours by project · this week
              </h2>
            </header>
            <ul className="space-y-3 px-4 py-3">
              {byProject.map((project) => (
                <li key={project.project_id ?? "none"}>
                  <div className="flex items-baseline justify-between text-[12px]">
                    <span className="flex items-center gap-1.5 text-foreground">
                      <ProjectDot color={project.color} />
                      {project.name}
                    </span>
                    <span className="tabular text-muted-foreground">
                      {formatDuration(project.seconds, format)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-secondary/50">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(project.seconds / maxProject) * 100}%`,
                        backgroundColor: project.color,
                      }}
                    />
                  </div>
                </li>
              ))}
              {byProject.length === 0 && (
                <li className="py-4 text-center text-xs text-muted-foreground">
                  No hours this week.
                </li>
              )}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
