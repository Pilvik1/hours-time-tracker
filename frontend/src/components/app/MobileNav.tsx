import { Link } from "@tanstack/react-router";
import { LogOut, Menu } from "lucide-react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { authService } from "@/services";

const links = [
  { to: "/overview", label: "Overview" },
  { to: "/", label: "Timer" },
  { to: "/reports", label: "Reports" },
  { to: "/timesheet", label: "Timesheet" },
  { to: "/projects", label: "Projects" },
  { to: "/clients", label: "Clients" },
  { to: "/tags", label: "Tags" },
  { to: "/settings", label: "Settings" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const logout = useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      queryClient.clear();
      window.location.assign("/login");
    },
  });
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="grid size-8 shrink-0 place-items-center rounded-md border border-border text-muted-foreground md:hidden"
        aria-label="Open navigation"
      >
        <Menu className="size-4" />
      </SheetTrigger>
      <SheetContent side="left" className="w-56 bg-sidebar p-3">
        <SheetTitle className="px-2 pb-2 text-sm">Hours</SheetTitle>
        <nav className="space-y-0.5">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className="block rounded-md px-2 py-1.5 text-[13px] text-sidebar-foreground hover:bg-secondary/60 hover:text-foreground"
              activeProps={{ className: "bg-selected text-primary" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <button
          type="button"
          onClick={() => logout.mutate()}
          className="mt-3 flex w-full items-center gap-2 rounded-md border-t border-border px-2 py-2 text-[13px] text-sidebar-foreground hover:bg-secondary/60 hover:text-foreground"
        >
          <LogOut className="size-4" /> Sign out
        </button>
      </SheetContent>
    </Sheet>
  );
}
