import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { settingsQuery } from "@/lib/queries";
import { settingsService } from "@/services";
import type { RoundingIncrement, Settings } from "@/lib/types";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Hours" },
      {
        name: "description",
        content: "Your name, employer, week start, duration format and rounding.",
      },
      { property: "og:title", content: "Settings — Hours" },
      {
        property: "og:description",
        content: "Your name, employer, week start, duration format and rounding.",
      },
    ],
  }),
  component: SettingsPage,
});

const intlWithSupportedValues = Intl as typeof Intl & {
  supportedValuesOf?: (key: "timeZone") => string[];
};
const TIMEZONES = Array.from(
  new Set([
    "UTC",
    "Europe/London",
    "Europe/Berlin",
    "Europe/Oslo",
    "America/New_York",
    ...(intlWithSupportedValues.supportedValuesOf?.("timeZone") ?? []),
  ]),
).sort((left, right) => left.localeCompare(right));
const DATE_FORMATS = ["dd.MM.yyyy", "dd/MM/yyyy", "yyyy-MM-dd", "MM/dd/yyyy"];

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 px-4 py-3">
      <Label htmlFor={htmlFor} className="text-[13px] text-foreground">
        {label}
      </Label>
      <div className="w-[220px]">{children}</div>
    </div>
  );
}

function SettingsPage() {
  const queryClient = useQueryClient();
  const { data } = useQuery(settingsQuery());
  const [form, setForm] = useState<Settings | null>(null);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const save = useMutation({
    mutationFn: (value: Settings) => settingsService.update(value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Settings saved");
    },
  });

  if (!form) return null;

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setForm({ ...form, [key]: value });

  const inputClass = "h-9 border-border bg-background text-[13px]";

  return (
    <>
      <PageHeader title="Settings">
        <Button
          size="sm"
          className="h-8 bg-primary text-xs text-primary-foreground hover:bg-primary-hover"
          onClick={() => save.mutate(form)}
          disabled={save.isPending}
        >
          Save changes
        </Button>
      </PageHeader>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin p-4">
        <div className="max-w-2xl rounded-md border border-border bg-surface">
          <Field label="Name" htmlFor="settings-name">
            <Input
              id="settings-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Employer" htmlFor="settings-employer">
            <Input
              id="settings-employer"
              value={form.employer_name}
              onChange={(e) => set("employer_name", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Timezone">
            <Select value={form.timezone} onValueChange={(value) => set("timezone", value)}>
              <SelectTrigger className={inputClass} aria-label="Timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from(new Set([form.timezone, ...TIMEZONES])).map((zone) => (
                  <SelectItem key={zone} value={zone}>
                    {zone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Date format">
            <Select value={form.date_format} onValueChange={(value) => set("date_format", value)}>
              <SelectTrigger className={inputClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_FORMATS.map((format) => (
                  <SelectItem key={format} value={format}>
                    {format}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Week starts on">
            <Select
              value={form.week_starts_on}
              onValueChange={(value) => set("week_starts_on", value as Settings["week_starts_on"])}
            >
              <SelectTrigger className={inputClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monday">Monday</SelectItem>
                <SelectItem value="sunday">Sunday</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Duration format">
            <Select
              value={form.duration_format}
              onValueChange={(value) =>
                set("duration_format", value as Settings["duration_format"])
              }
            >
              <SelectTrigger className={inputClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hh:mm">HH:MM</SelectItem>
                <SelectItem value="decimal">Decimal</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Rounding">
            <Select
              value={String(form.rounding_increment)}
              onValueChange={(value) =>
                set("rounding_increment", Number(value) as RoundingIncrement)
              }
            >
              <SelectTrigger className={inputClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">None</SelectItem>
                <SelectItem value="5">5 min</SelectItem>
                <SelectItem value="15">15 min</SelectItem>
                <SelectItem value="30">30 min</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <Label className="text-[13px] text-foreground">Default billable</Label>
            <Switch
              checked={form.default_billable}
              onCheckedChange={(checked) => set("default_billable", checked)}
            />
          </div>
        </div>

        <p className="mt-3 max-w-2xl text-[11px] leading-relaxed text-muted-foreground">
          Rounding and duration rules are applied by the hours service; this screen records your
          preference so the same rules are used everywhere, including the Excel export.
        </p>
      </div>
    </>
  );
}
