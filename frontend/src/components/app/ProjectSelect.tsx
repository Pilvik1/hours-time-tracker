import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProjects } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const NO_PROJECT = "__none__";

export function ProjectDot({ color, className }: { color: string; className?: string }) {
  return (
    <span
      className={cn("inline-block size-2 shrink-0 rounded-full", className)}
      style={{ backgroundColor: color }}
    />
  );
}

export function ProjectSelect({
  value,
  onChange,
  className,
  placeholder = "No project",
  includeAll = false,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  className?: string;
  placeholder?: string;
  includeAll?: boolean;
}) {
  const { data: projects = [] } = useProjects();

  return (
    <Select
      value={value ?? NO_PROJECT}
      onValueChange={(next) => onChange(next === NO_PROJECT ? null : next)}
    >
      <SelectTrigger className={cn("h-8 border-border bg-surface/60 text-xs", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_PROJECT}>{includeAll ? "All projects" : placeholder}</SelectItem>
        {projects
          .filter((p) => p.active)
          .map((project) => (
            <SelectItem key={project.id} value={project.id}>
              <span className="flex items-center gap-2">
                <ProjectDot color={project.color} />
                {project.name}
              </span>
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}
