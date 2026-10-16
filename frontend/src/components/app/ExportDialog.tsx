import { useState } from "react";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ProjectSelect } from "./ProjectSelect";
import { exportService } from "@/services";
import { toDateKey } from "@/lib/format";
import type { ExportRequest } from "@/lib/types";
import { addDays, monthRange, startOfWeek } from "@/lib/week";

const options = [
  { value: "current_week", label: "Current week" },
  { value: "previous_week", label: "Previous week" },
  { value: "current_month", label: "Current month" },
  { value: "custom", label: "Custom range" },
] as const;

export function ExportDialog() {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<ExportRequest["range"]>("current_week");
  const [from, setFrom] = useState(toDateKey(startOfWeek(new Date())));
  const [to, setTo] = useState(toDateKey(addDays(startOfWeek(new Date()), 6)));
  const [projectId, setProjectId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const resolveRange = (): { from: string; to: string } => {
    if (range === "custom") return { from, to };
    if (range === "current_month") {
      const { from: f, to: t } = monthRange();
      return { from: toDateKey(f), to: toDateKey(t) };
    }
    const base = startOfWeek(new Date());
    const start = range === "previous_week" ? addDays(base, -7) : base;
    return { from: toDateKey(start), to: toDateKey(addDays(start, 6)) };
  };

  const submit = async () => {
    setPending(true);
    try {
      const resolved = resolveRange();
      const result = await exportService.exportXlsx({ range, ...resolved, project_id: projectId });
      const anchor = document.createElement("a");
      anchor.href = result.url;
      anchor.download = result.filename;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(result.url), 60_000);
      toast.success("Download started", { description: result.filename });
      setOpen(false);
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="h-8 border border-border bg-secondary text-xs text-foreground hover:bg-accent"
        >
          <FileSpreadsheet className="mr-1.5 size-3.5" /> Export Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm bg-surface">
        <DialogHeader>
          <DialogTitle className="text-sm">Export hours to Excel</DialogTitle>
          <DialogDescription className="text-xs">
            Date, Start, End, Duration, Decimal Hours, Project, Client, Title, Comment, Tags and
            Billable are included in the workbook.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup
          value={range}
          onValueChange={(value) => setRange(value as ExportRequest["range"])}
          className="gap-1.5"
        >
          {options.map((option) => (
            <Label
              key={option.value}
              className="flex cursor-pointer items-center gap-2.5 rounded-md border border-border px-3 py-2 text-[13px] font-normal transition-colors hover:border-border-strong"
            >
              <RadioGroupItem value={option.value} />
              {option.label}
            </Label>
          ))}
        </RadioGroup>

        {range === "custom" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                From
              </Label>
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-9 border-border bg-background text-[13px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                To
              </Label>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-9 border-border bg-background text-[13px]"
              />
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Project (optional)
          </Label>
          <ProjectSelect
            value={projectId}
            onChange={setProjectId}
            includeAll
            placeholder="All projects"
            className="h-9 w-full text-[13px]"
          />
        </div>

        <DialogFooter>
          <Button
            size="sm"
            className="h-8 bg-primary text-xs text-primary-foreground hover:bg-primary-hover"
            onClick={() => void submit()}
            disabled={pending}
          >
            {pending && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
