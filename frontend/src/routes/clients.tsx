import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Archive, ArchiveRestore, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clientsQuery, projectsQuery } from "@/lib/queries";
import { clientService } from "@/services";
import type { Client } from "@/lib/types";

export const Route = createFileRoute("/clients")({
  head: () => ({
    meta: [
      { title: "Clients — Hours" },
      { name: "description", content: "Keep the list of clients your projects belong to." },
      { property: "og:title", content: "Clients — Hours" },
      { property: "og:description", content: "Keep the list of clients your projects belong to." },
    ],
  }),
  component: ClientsPage,
});

function ClientsPage() {
  const queryClient = useQueryClient();
  const { data: clients = [] } = useQuery(clientsQuery());
  const { data: projects = [] } = useQuery(projectsQuery());
  const [name, setName] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["clients"] });

  const create = useMutation({
    mutationFn: () => clientService.create({ name: name.trim(), active: true }),
    onSuccess: () => {
      setName("");
      invalidate();
      toast.success("Client added");
    },
  });

  const toggle = useMutation({
    mutationFn: (client: Client) => clientService.update(client.id, { active: !client.active }),
    onSuccess: invalidate,
  });

  return (
    <>
      <PageHeader title="Clients">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) create.mutate();
          }}
          placeholder="New client name"
          className="h-8 w-[200px] border-border bg-surface/60 text-xs"
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
          {clients.map((client) => (
            <li
              key={client.id}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/20"
            >
              <span className="text-[13px] text-foreground">{client.name}</span>
              <span className="text-[11px] text-muted-foreground">
                {projects.filter((project) => project.client_id === client.id).length} projects
              </span>
              {!client.active && (
                <span className="rounded-sm border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground">
                  Archived
                </span>
              )}
              <button
                type="button"
                title={client.active ? "Archive" : "Restore"}
                onClick={() => toggle.mutate(client)}
                className="ml-auto grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                {client.active ? (
                  <Archive className="size-3.5" />
                ) : (
                  <ArchiveRestore className="size-3.5" />
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
