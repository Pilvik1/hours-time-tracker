export interface TimeEntry {
  id: string;
  description: string;
  comment: string | null;
  project_id: string | null;
  date: string;
  start_time: string | null;
  end_time: string | null;
  start_at: string | null;
  end_at: string | null;
  duration_seconds: number;
  reported_duration_seconds: number;
  billable: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface TimeEntryInput {
  description: string;
  comment: string | null;
  project_id: string | null;
  date: string;
  start_time: string | null;
  end_time: string | null;
  duration_seconds: number;
  billable: boolean;
  tags: string[];
}

export interface DailyTotal {
  date: string;
  seconds: number;
  reported_seconds: number;
  decimal_hours: number;
  reported_decimal_hours: number;
}

export interface EntryAggregates {
  daily_totals: DailyTotal[];
  weekly_totals: { week_start: string; seconds: number; reported_seconds: number }[];
  total_seconds: number;
  reported_total_seconds: number;
  weekly_total_seconds: number;
}

export interface TimeEntryList {
  items: TimeEntry[];
  aggregates: EntryAggregates;
}

export interface Project {
  id: string;
  name: string;
  client_id: string | null;
  color: string;
  billable_default: boolean;
  active: boolean;
}

export interface Client {
  id: string;
  name: string;
  active: boolean;
}

export interface Tag {
  id: string;
  name: string;
}

export interface TimerState {
  running: boolean;
  entry_id: string | null;
  description: string | null;
  comment: string | null;
  project_id: string | null;
  started_at: string | null;
  elapsed_seconds: number;
  billable: boolean | null;
  tags: string[];
}

export type DurationFormat = "hh:mm" | "decimal";
export type RoundingIncrement = 0 | 5 | 15 | 30;

export interface Settings {
  name: string;
  employer_name: string;
  timezone: string;
  date_format: string;
  week_starts_on: "monday" | "sunday";
  duration_format: DurationFormat;
  rounding_increment: RoundingIncrement;
  default_billable: boolean;
}

export interface ReportSummary {
  total_seconds: number;
  reported_total_seconds: number;
  by_day: { date: string; seconds: number; reported_seconds: number }[];
  by_project: {
    project_id: string | null;
    name: string;
    color: string;
    seconds: number;
    reported_seconds: number;
  }[];
  by_client: {
    client_id: string | null;
    name: string;
    seconds: number;
    reported_seconds: number;
  }[];
}

export interface ExportRequest {
  range: "current_week" | "previous_week" | "current_month" | "custom";
  from?: string;
  to?: string;
  project_id?: string | null;
}

export interface AuthStatus {
  authenticated: boolean;
}
