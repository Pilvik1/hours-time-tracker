import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Clock,
  FolderKanban,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Settings as SettingsIcon,
  Table2,
  Tag,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { authService } from "@/services";
import { BrandMark } from "./BrandMark";

const groups = [
  {
    label: "Track",
    items: [
      { to: "/overview", label: "Overview", icon: LayoutDashboard },
      { to: "/", label: "Timer", icon: Clock },
    ],
  },
  {
    label: "Analyze",
    items: [
      { to: "/reports", label: "Reports", icon: BarChart3 },
      { to: "/timesheet", label: "Timesheet", icon: Table2 },
    ],
  },
  {
    label: "Manage",
    items: [
      { to: "/projects", label: "Projects", icon: FolderKanban },
      { to: "/clients", label: "Clients", icon: Users },
      { to: "/tags", label: "Tags", icon: Tag },
    ],
  },
] as const;

export function AppSidebar() {
  const desktopMode = import.meta.env["VITE_DESKTOP_MODE"] === "true";
  const [collapsed, setCollapsed] = useState(false);
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const logout = useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      queryClient.clear();
      window.location.assign("/login");
    },
  });

  const navLink = (to: string, label: string, Icon: typeof Clock) => {
    const active = pathname === to;
    return (
      <Link
        key={to}
        to={to}
        title={collapsed ? label : undefined}
        className={cn(
          "flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] transition-colors",
          active
            ? "bg-selected text-primary"
            : "text-sidebar-foreground hover:bg-accent hover:text-foreground",
          collapsed && "justify-center px-0",
        )}
      >
        <Icon
          className={cn("size-4 shrink-0", active ? "text-primary" : "text-muted-foreground")}
          strokeWidth={1.75}
        />
        {!collapsed && <span className="truncate">{label}</span>}
      </Link>
    );
  };

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r border-border bg-sidebar md:flex",
        collapsed ? "w-14" : "w-52",
      )}
    >
      <div
        className={cn(
          "flex h-12 items-center gap-2 border-b border-border px-3",
          collapsed && "justify-center px-0",
        )}
      >
        <BrandMark />
        {!collapsed && (
          <span className="truncate text-[13px] font-semibold tracking-tight">Hours</span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 py-3">
        {groups.map((group) => (
          <div key={group.label} className="mb-4">
            {!collapsed && (
              <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => navLink(item.to, item.label, item.icon))}
            </div>
          </div>
        ))}
      </nav>

      <div className="space-y-0.5 border-t border-border px-2 py-2">
        {navLink("/settings", "Settings", SettingsIcon)}
        {!desktopMode && (
          <button
            type="button"
            onClick={() => logout.mutate()}
            title={collapsed ? "Sign out" : undefined}
            className={cn(
              "flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-[13px] text-sidebar-foreground transition-colors hover:bg-secondary/50 hover:text-foreground",
              collapsed && "justify-center px-0",
            )}
          >
            <LogOut className="size-4" strokeWidth={1.75} />
            {!collapsed && <span>Sign out</span>}
          </button>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className={cn(
            "flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-[13px] text-sidebar-foreground transition-colors hover:bg-secondary/50 hover:text-foreground",
            collapsed && "justify-center px-0",
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" strokeWidth={1.75} />
          ) : (
            <PanelLeftClose className="size-4" strokeWidth={1.75} />
          )}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
