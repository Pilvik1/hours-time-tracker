import { Check, Tag as TagIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { tagsQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function TagPicker({
  value,
  onChange,
  className,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  className?: string;
}) {
  const { data: tags = [] } = useQuery(tagsQuery());

  const toggle = (name: string) =>
    onChange(value.includes(name) ? value.filter((t) => t !== name) : [...value, name]);

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "flex h-8 items-center gap-2 rounded-md border border-border bg-surface/60 px-2.5 text-xs text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          value.length > 0 && "text-foreground",
          className,
        )}
      >
        <TagIcon className="size-3.5" />
        {value.length > 0 ? value.join(", ") : "Tags"}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-48 p-1">
        {tags.map((tag) => {
          const active = value.includes(tag.name);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggle(tag.name)}
              className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-xs transition-colors hover:bg-secondary/60"
            >
              {tag.name}
              {active && <Check className="size-3.5 text-primary" />}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
