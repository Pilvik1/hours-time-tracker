import { toDateKey } from "./format";

export interface WeekRange {
  start: Date;
  end: Date;
  days: Date[];
  isoWeek: number;
  offset: number;
}

export function startOfWeek(date: Date, weekStartsOn: "monday" | "sunday" = "monday"): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = weekStartsOn === "monday" ? (day === 0 ? -6 : 1 - day) : -day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function isoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function getWeek(offset: number, weekStartsOn: "monday" | "sunday" = "monday"): WeekRange {
  const start = addDays(startOfWeek(new Date(), weekStartsOn), offset * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return { start, end: days[6]!, days, isoWeek: isoWeekNumber(start), offset };
}

export function weekLabel(week: WeekRange): string {
  if (week.offset === 0) return "This week";
  if (week.offset === -1) return "Last week";
  if (week.offset === 1) return "Next week";
  const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${fmt(week.start)} – ${fmt(week.end)}`;
}

export function rangeLabel(from: Date, to: Date): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return `${fmt(from)} – ${fmt(to)}`;
}

export function isToday(date: Date): boolean {
  return toDateKey(date) === toDateKey(new Date());
}

export function monthRange(date = new Date()): { from: Date; to: Date } {
  return {
    from: new Date(date.getFullYear(), date.getMonth(), 1),
    to: new Date(date.getFullYear(), date.getMonth() + 1, 0),
  };
}
