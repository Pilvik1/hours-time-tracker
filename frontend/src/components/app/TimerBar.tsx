import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { CircleDollarSign, MessageSquare, Play, Square } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { MobileNav } from "./MobileNav";
import { ProjectSelect } from "./ProjectSelect";
import { TagPicker } from "./TagPicker";
import { formatClock, formatDuration } from "@/lib/format";
import { settingsQuery, timerQuery, useInvalidateEntries } from "@/lib/queries";
import { timerService } from "@/services";
import { cn } from "@/lib/utils";

export function TimerBar() {
  const { data: timer } = useQuery(timerQuery());
  const { data: settings } = useQuery(settingsQuery());
  const invalidate = useInvalidateEntries();

  const [description, setDescription] = useState("");
  const [comment, setComment] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [billable, setBillable] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const updateTimeout = useRef<number | null>(null);
  const hydratedTimerId = useRef<string | null>(null);

  const running = timer?.running ?? false;

  useEffect(() => {
    if (settings && !running) setBillable(settings.default_billable);
  }, [settings, running]);

  useEffect(() => {
    if (!timer) return;
    if (timer.running) {
      setDescription(timer.description ?? "");
      setComment(timer.comment ?? "");
      setProjectId(timer.project_id);
      setTags(timer.tags);
      setBillable(timer.billable ?? false);
      setElapsed(timer.elapsed_seconds);
      hydratedTimerId.current = timer.entry_id;
    } else {
      hydratedTimerId.current = null;
    }
  }, [timer]);

  useEffect(() => {
    if (!running || !timer?.entry_id || hydratedTimerId.current !== timer.entry_id) return;
    if (updateTimeout.current !== null) window.clearTimeout(updateTimeout.current);
    updateTimeout.current = window.setTimeout(() => {
      void timerService
        .update({
          description: description.trim() || "Untitled work",
          comment: comment.trim() || null,
          project_id: projectId,
          tags,
          billable,
        })
        .catch(() => toast.error("Running timer changes were not saved"));
    }, 400);
    return () => {
      if (updateTimeout.current !== null) window.clearTimeout(updateTimeout.current);
    };
  }, [billable, comment, description, projectId, running, tags, timer?.entry_id]);

  useEffect(() => {
    if (!running || !timer?.started_at) return;
    const startedAt = new Date(timer.started_at).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [running, timer?.started_at]);

  const toggle = async () => {
    if (running) {
      if (updateTimeout.current !== null) window.clearTimeout(updateTimeout.current);
      await timerService.update({
        description: description.trim() || "Untitled work",
        comment: comment.trim() || null,
        project_id: projectId,
        billable,
        tags,
      });
      const entry = await timerService.stop();
      setElapsed(0);
      setDescription("");
      setComment("");
      setTags([]);
      invalidate();
      toast.success("Entry saved", {
        description: `${entry.description} · ${formatDuration(entry.duration_seconds)}`,
      });
    } else {
      await timerService.start({
        description: description.trim() || "Untitled work",
        comment: comment.trim() || null,
        project_id: projectId,
        billable,
        tags,
      });
      invalidate();
    }
  };

  // Space toggles the timer when focus is not inside a field.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.metaKey || event.ctrlKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName))
      )
        return;
      event.preventDefault();
      void toggle();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-surface px-3">
      <MobileNav />
      <input
        ref={inputRef}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void toggle();
        }}
        placeholder="What are you working on?"
        className="min-w-0 flex-1 bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground/80 focus:outline-none"
      />

      <div className="hidden items-center gap-1.5 sm:flex">
        <ProjectSelect value={projectId} onChange={setProjectId} className="w-[150px]" />
        <TagPicker value={tags} onChange={setTags} className="max-w-[160px]" />
        <Popover>
          <PopoverTrigger
            className={cn(
              "grid size-8 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground",
              comment.trim() && "border-border-strong text-primary",
            )}
            title="Comment"
          >
            <MessageSquare className="size-4" strokeWidth={1.75} />
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 p-2">
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Optional longer explanation…"
              className="resize-none border-border bg-surface/60 text-xs"
            />
          </PopoverContent>
        </Popover>
        <button
          type="button"
          onClick={() => setBillable((b) => !b)}
          title={billable ? "Billable" : "Not billable"}
          className={cn(
            "grid size-8 place-items-center rounded-md border border-border transition-colors hover:border-border-strong",
            billable ? "text-primary" : "text-muted-foreground",
          )}
        >
          <CircleDollarSign className="size-4" strokeWidth={1.75} />
        </button>
      </div>

      <span
        className={cn(
          "tabular ml-1 w-[86px] text-right text-[15px] tracking-tight",
          running ? "text-primary" : "text-muted-foreground",
        )}
      >
        {formatClock(running ? elapsed : 0)}
      </span>

      <button
        type="button"
        onClick={() => void toggle()}
        aria-label={running ? "Stop timer" : "Start timer"}
        className={cn(
          "grid size-9 place-items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          running
            ? "bg-destructive text-destructive-foreground hover:bg-primary-hover"
            : "bg-primary text-primary-foreground hover:bg-primary-hover",
        )}
      >
        {running ? (
          <Square className="size-3.5 fill-current" />
        ) : (
          <Play className="size-4 fill-current" />
        )}
      </button>
    </header>
  );
}
