"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ListTodo,
  Settings,
  BarChart3,
  PanelLeftClose,
  PanelLeft,
  Zap,
  Bot,
  LogOut,
  Layers,
  Plus,
  X,
  Building2,
  ChevronDown,
} from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/lib/workspace-context";
import { BookOpen } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/features", label: "Features", icon: Layers },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

function SidebarContent({
  collapsed,
  onToggle,
  currentTask,
}: {
  collapsed: boolean;
  onToggle?: () => void;
  currentTask: any;
}) {
  const pathname = usePathname();
  const { signOut } = useAuthActions();
  const { workspaceId, workspaces, setWorkspaceId, userId } = useWorkspace();
  const createWorkspace = useMutation(api.workspaces.create);
  const [showCreateWs, setShowCreateWs] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [creatingWs, setCreatingWs] = useState(false);

  async function handleCreateWorkspace() {
    if (!newWsName.trim() || !userId) return;
    setCreatingWs(true);
    try {
      const slug = newWsName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const result = await createWorkspace({ name: newWsName.trim(), slug, ownerId: userId });
      setWorkspaceId(result.id);
      setNewWsName("");
      setShowCreateWs(false);
    } finally {
      setCreatingWs(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-surface-elevated">
      {/* Logo */}
      <div className={cn("flex items-center gap-3 px-5 py-5", collapsed && "justify-center px-3")}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#6c63ff] to-[#a78bfa] text-white font-bold text-sm shadow-md shadow-[#6c63ff]/20">
          H
        </div>
        {!collapsed && (
          <span className="text-base font-bold tracking-tight text-foreground">HADES</span>
        )}
      </div>

      {/* Workspace selector — collapsed */}
      {collapsed && workspaces.length > 0 && (
        <div className="flex justify-center mb-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground"
            title={workspaces.find((ws: any) => ws._id === workspaceId)?.name ?? "Workspace"}
          >
            <Building2 className="h-4 w-4" />
          </div>
        </div>
      )}

      {/* Workspace selector — expanded */}
      {!collapsed && workspaces.length > 0 && (
        <div className="px-3 mb-3 space-y-1.5">
          <span className="px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Workspace
          </span>
          <div className="rounded-lg border border-border bg-surface p-2">
            {workspaces.length === 1 ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground truncate">
                    {workspaces[0].name}
                  </span>
                </div>
                <button
                  onClick={() => setShowCreateWs(!showCreateWs)}
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  title="Create workspace"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <div className="relative flex-1 min-w-0">
                  <Building2 className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                  <select
                    value={workspaceId ?? ""}
                    onChange={(e) => setWorkspaceId(e.target.value as any)}
                    className="h-8 w-full rounded-md border border-border bg-card pl-7 pr-6 text-xs font-medium text-foreground appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {workspaces.map((ws: any) => (
                      <option key={ws._id} value={ws._id}>
                        {ws.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => setShowCreateWs(!showCreateWs)}
                  className="h-8 w-8 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all shrink-0"
                  title="Create workspace"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
          {showCreateWs && (
            <div className="rounded-lg border border-border bg-surface p-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">New workspace</span>
                <button onClick={() => setShowCreateWs(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              </div>
              <Input
                placeholder="Workspace name"
                value={newWsName}
                onChange={(e) => setNewWsName(e.target.value)}
                className="h-7 text-xs bg-card"
                onKeyDown={(e) => e.key === "Enter" && handleCreateWorkspace()}
              />
              <button
                onClick={handleCreateWorkspace}
                disabled={!newWsName.trim() || creatingWs}
                className="w-full h-7 rounded-md bg-gradient-to-r from-[#6c63ff] to-[#a78bfa] text-white text-xs font-medium disabled:opacity-50 transition-opacity"
              >
                {creatingWs ? "Creating..." : "Create"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Navigation label */}
      {!collapsed && (
        <div className="px-5 mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Navigation
          </span>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 h-10 text-sm font-medium transition-all duration-150",
                active
                  ? "bg-accent-glow text-accent-light border-l-2 border-accent-light"
                  : "text-muted-foreground hover:bg-surface-hover hover:text-foreground border-l-2 border-transparent",
                collapsed && "justify-center px-2"
              )}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Current task indicator */}
      {!collapsed && currentTask && (
        <div className="mx-3 mb-3 rounded-lg border border-accent-light/30 bg-accent-glow p-3 animate-pulse-slow">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-accent-light mb-1.5">
            <Zap className="h-3.5 w-3.5" />
            Executing
          </div>
          <p className="text-xs font-medium truncate text-foreground">{currentTask.title}</p>
        </div>
      )}

      {/* Agent info + collapse toggle */}
      <div className={cn(
        "border-t border-border px-3 py-3",
        collapsed && "px-2"
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2.5 mb-3 px-2">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Agent</p>
              <p className="text-[11px] text-muted-foreground">Orchestrator</p>
            </div>
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
          </div>
        )}
        {collapsed && (
          <div className="flex justify-center mb-3">
            <div className="relative">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-surface-elevated" />
            </div>
          </div>
        )}
        <button
          onClick={() => void signOut()}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg p-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all duration-150",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="text-xs font-medium">Sign Out</span>}
        </button>
        {onToggle && (
          <button
            onClick={onToggle}
            className="flex w-full items-center justify-center rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all duration-150"
          >
            {collapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const currentTask = useQuery(api.queue.current, {});

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-border bg-surface-elevated shrink-0 transition-all duration-200 ease-in-out",
          collapsed ? "w-16" : "w-60"
        )}
      >
        <SidebarContent
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
          currentTask={currentTask}
        />
      </aside>

      {/* Mobile sidebar via Sheet */}
      <div className="md:hidden fixed top-3 left-3 z-40">
        <Sheet>
          <SheetTrigger render={<Button variant="outline" size="icon-sm" />}>
            <PanelLeft className="h-4 w-4" />
          </SheetTrigger>
          <SheetContent side="left" className="w-60 p-0 bg-surface-elevated">
            <SidebarContent
              collapsed={false}
              currentTask={currentTask}
            />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
