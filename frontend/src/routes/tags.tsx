import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { entriesQuery, tagsQuery } from "@/lib/queries";
import { tagService } from "@/services";

export const Route = createFileRoute("/tags")({
  head: () => ({
    meta: [
      { title: "Tags — Hours" },
      { name: "description", content: "Short labels for the kind of work behind each entry." },
      { property: "og:title", content: "Tags — Hours" },
      {
        property: "og:description",
        content: "Short labels for the kind of work behind each entry.",
      },
    ],
  }),
  component: TagsPage,
});

function TagsPage() {
  const queryClient = useQueryClient();
  const { data: tags = [] } = useQuery(tagsQuery());
  const { data: entryResult } = useQuery(entriesQuery());
  const entries = entryResult?.items ?? [];
  const [name, setName] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["tags"] });

  const create = useMutation({
    mutationFn: () => tagService.create({ name: name.trim() }),
    onSuccess: () => {
      setName("");
      invalidate();
      toast.success("Tag added");
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => tagService.delete(id),
    onSuccess: () => {
      invalidate();
      toast.success("Tag deleted");
    },
  });

  return (
    <>
      <PageHeader title="Tags">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) create.mutate();
          }}
          placeholder="New tag"
          className="h-8 w-[180px] border-border bg-surface/60 text-xs"
        />
        <Button
          size="sm"
          className="h-8 bg-primary text-xs text-primary-foreground hover:bg-primary-hover"
          disabled={!name.trim() || create.isPending}
          onClick={() => create.mutate()}
        >
          <Plus className="mr-1 size-3.5" /> Add
        </Button>
      </PageHeader>

      <div className="min-h-0 flex-1 overflow-auto scrollbar-thin">
        <ul className="divide-y divide-border/60">
          {tags.map((tag) => (
            <li key={tag.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/20">
              <span className="text-[13px] text-foreground">{tag.name}</span>
              <span className="text-[11px] text-muted-foreground">
                used {entries.filter((entry) => entry.tags.includes(tag.name)).length} times
              </span>
              <button
                type="button"
                title="Delete"
                onClick={() => remove.mutate(tag.id)}
                className="ml-auto grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
          {tags.length === 0 && (
            <li className="px-4 py-8 text-center text-xs text-muted-foreground">No tags yet.</li>
          )}
        </ul>
      </div>
    </>
  );
}
