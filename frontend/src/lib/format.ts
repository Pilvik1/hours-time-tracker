import type { DurationFormat, TimeEntry } from "./types";

export function pad(n: number): string {
  return String(Math.floor(Math.abs(n))).padStart(2, "0");
}

/** 1:05:00 style clock used by the running timer. */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 3600)}:${pad((s % 3600) / 60)}:${pad(s % 60)}`;
}

/** 02:30 or 2.50 depending on preference. */
export function formatDuration(seconds: number, format: DurationFormat = "hh:mm"): string {
  const s = Math.max(0, Math.floor(seconds));
  if (format === "decimal") return (s / 3600).toFixed(2);
  return `${pad(s / 3600)}:${pad((s % 3600) / 60)}`;
}

export function minutesToTime(minutes: number): string {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${pad(m / 60)}:${pad(m % 60)}`;
}

export function timeToMinutes(time: string | null): number {
  if (!time) return 0;
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y ?? 1970, (m || 1) - 1, d || 1);
}

export function entryRangeLabel(entry: TimeEntry): string {
  if (!entry.start_time || !entry.end_time) return "—";
  return `${entry.start_time} – ${entry.end_time}`;
}
