import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Archive, ArchiveRestore, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { ProjectDot } from "@/components/app/ProjectSelect";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { clientsQuery, entriesQuery, projectsQuery, settingsQuery } from "@/lib/queries";
import { formatDuration } from "@/lib/format";
import { projectService } from "@/services";
import type { Project } from "@/lib/types";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Projects — Hours" },
      { name: "description", content: "Manage the projects and clients you track hours against." },
      { property: "og:title", content: "Projects — Hours" },
      {
        property: "og:description",
        content: "Manage the projects and clients you track hours against.",
      },
    ],
  }),
  component: ProjectsPage,
});

const PALETTE = ["#AEF6C7", "#5B8266", "#3E6259", "#9FB3A6", "#E0C097", "#C0A9E0"];
const NO_CLIENT = "__none__";

type Draft = Omit<Project, "id"> & { id?: string };

function ProjectsPage() {
  const queryClient = useQueryClient();
  const { data: projects = [] } = useQuery(projectsQuery());
  const { data: clients = [] } = useQuery(clientsQuery());
  const { data: entryResult } = useQuery(entriesQuery());
  const entries = entryResult?.items ?? [];
  const { data: settings } = useQuery(settingsQuery());
  const [draft, setDraft] = useState<Draft | null>(null);

  const save = useMutation({
    mutationFn: (value: Draft) => {
      const { id, ...rest } = value;
      return id ? projectService.update(id, rest) : projectService.create(rest);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setDraft(null);
      toast.success("Project saved");
    },
  });

  const toggleArchive = useMutation({
    mutationFn: (project: Project) =>
      projectService.update(project.id, { active: !project.active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });

  const hoursFor = (projectId: string) =>
    entries
      .filter((entry) => entry.project_id === projectId)
      .reduce((sum, entry) => sum + entry.duration_seconds, 0);

  return (
    <>
      <PageHeader title="Projects">
        <Button
          size="sm"
          className="h-8 bg-primary text-xs text-primary-foreground hover:bg-primary-hover"
          onClick={() =>
            setDraft({
              name: "",
              client_id: null,
              color: PALETTE[0]!,
              billable_default: true,
              active: true,
            })
          }
        >
          <Plus className="mr-1 size-3.5" /> New project
        </Button>
      </PageHeader>

      <div className="min-h-0 flex-1 overflow-auto scrollbar-thin">
        <table className="w-full min-w-[700px] border-collapse text-[13px]">
          <thead className="sticky top-0 bg-surface">
            <tr className="border-b border-border-strong text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
              <th className="px-4 py-2 font-semibold">Project</th>
              <th className="px-4 py-2 font-semibold">Client</th>
              <th className="px-4 py-2 font-semibold">Color</th>
              <th className="px-4 py-2 text-right font-semibold">Hours</th>
              <th className="px-4 py-2 font-semibold">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id} className="border-b border-border/60 hover:bg-secondary/20">
                <td className="px-4 py-2">
                  <span className="flex items-center gap-2 text-foreground">
                    <ProjectDot color={project.color} />
                    {project.name}
                  </span>
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {clients.find((client) => client.id === project.client_id)?.name ?? "—"}
                </td>
                <td className="px-4 py-2 text-muted-foreground">{project.color}</td>
                <td className="tabular px-4 py-2 text-right">
                  {formatDuration(hoursFor(project.id), settings?.duration_format)}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={
                      project.active
                        ? "rounded-sm bg-secondary px-1.5 py-0.5 text-[11px] text-foreground"
                        : "rounded-sm border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground"
                    }
                  >
                    {project.active ? "Active" : "Archived"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      title="Edit"
                      onClick={() => setDraft({ ...project })}
                      className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      title={project.active ? "Archive" : "Restore"}
                      onClick={() => toggleArchive.mutate(project)}
                      className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                      {project.active ? (
                        <Archive className="size-3.5" />
                      ) : (
                        <ArchiveRestore className="size-3.5" />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="max-w-sm bg-surface">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {draft?.id ? "Edit project" : "New project"}
            </DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="project-name"
                  className="text-[11px] uppercase tracking-wide text-muted-foreground"
                >
                  Name
                </Label>
                <Input
                  id="project-name"
                  autoFocus
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="h-9 border-border bg-background text-[13px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Client
                </Label>
                <Select
                  value={draft.client_id ?? NO_CLIENT}
                  onValueChange={(value) =>
                    setDraft({ ...draft, client_id: value === NO_CLIENT ? null : value })
                  }
                >
                  <SelectTrigger className="h-9 border-border bg-background text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CLIENT}>No client</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Color
                </Label>
                <div className="flex gap-1.5">
                  {PALETTE.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setDraft({ ...draft, color })}
                      className="size-6 rounded-full border-2"
                      style={{
                        backgroundColor: color,
                        borderColor:
                          draft.color === color ? "var(--color-foreground)" : "transparent",
                      }}
                      aria-label={color}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
                <Label className="text-[13px]">Billable by default</Label>
                <Switch
                  checked={draft.billable_default}
                  onCheckedChange={(checked) => setDraft({ ...draft, billable_default: checked })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setDraft(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 bg-primary text-xs text-primary-foreground hover:bg-primary-hover"
              disabled={!draft?.name.trim() || save.isPending}
              onClick={() => draft && save.mutate(draft)}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
