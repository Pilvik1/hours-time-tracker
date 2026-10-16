import type { ReportSummary } from "@/lib/types";
import { apiRequest, queryString } from "./apiClient";
import { projectService } from "./projectService";

export interface SummaryQuery {
  from: string;
  to: string;
  project_id?: string | null;
  client_id?: string | null;
  tag_id?: string | null;
  billable?: boolean | null;
}

interface ApiBucket {
  key: string;
  name: string;
  seconds: number;
  reported_seconds: number;
}

interface ApiReportSummary {
  total_seconds: number;
  reported_total_seconds: number;
  by_day: ApiBucket[];
  by_project: ApiBucket[];
  by_client: ApiBucket[];
}

export const reportService = {
  async getSummary(query: SummaryQuery): Promise<ReportSummary> {
    const [summary, projects] = await Promise.all([
      apiRequest<ApiReportSummary>(
        `/reports/summary${queryString({
          start_date: query.from,
          end_date: query.to,
          project_id: query.project_id,
          client_id: query.client_id,
          tag_id: query.tag_id,
          billable: query.billable,
        })}`,
      ),
      projectService.list(),
    ]);
    const colors = new Map(projects.map((project) => [project.id, project.color] as const));
    return {
      total_seconds: summary.total_seconds,
      reported_total_seconds: summary.reported_total_seconds,
      by_day: summary.by_day.map((bucket) => ({
        date: bucket.key,
        seconds: bucket.seconds,
        reported_seconds: bucket.reported_seconds,
      })),
      by_project: summary.by_project.map((bucket) => ({
        project_id: bucket.key === "unassigned" ? null : bucket.key,
        name: bucket.name,
        color: colors.get(bucket.key) ?? "#7C8F82",
        seconds: bucket.seconds,
        reported_seconds: bucket.reported_seconds,
      })),
      by_client: summary.by_client.map((bucket) => ({
        client_id: bucket.key === "unassigned" ? null : bucket.key,
        name: bucket.name,
        seconds: bucket.seconds,
        reported_seconds: bucket.reported_seconds,
      })),
    };
  },
};
