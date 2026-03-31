"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useWorkspace } from "@/lib/workspace-context";
import { TaskCard } from "@/components/tasks/task-card";
import { Topbar } from "@/components/layout/topbar";
import { Input } from "@/components/ui/input";
import { BatchCreate } from "@/components/tasks/batch-create";
import {
  Search,
  LayoutGrid,
  List,
  SlidersHorizontal,
  Inbox,
} from "lucide-react";

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "queued", label: "Queued" },
  { value: "in_progress", label: "In Progress" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
  { value: "cancelled", label: "Cancelled" },
  { value: "failed", label: "Failed" },
];

const PRIORITY_OPTIONS = [
  { value: "all", label: "All" },
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
  { value: "backlog", label: "Backlog" },
];

const statusPillStyles: Record<string, string> = {
  all: "bg-accent-glow text-accent-light border-accent-light/30",
  queued: "bg-primary/15 text-primary border-primary/30",
  in_progress: "bg-primary/15 text-primary border-primary/30",
  blocked: "bg-red-500/15 text-red-400 border-red-500/30",
  done: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  cancelled: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  failed: "bg-red-500/15 text-red-400 border-red-500/30",
};

const priorityPillStyles: Record<string, string> = {
  all: "bg-accent-glow text-accent-light border-accent-light/30",
  urgent: "bg-red-500/15 text-red-400 border-red-500/30",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  low: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  backlog: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

type SortKey = "date" | "priority" | "status";

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
  backlog: 4,
};

const STATUS_ORDER: Record<string, number> = {
  in_progress: 0,
  blocked: 1,
  queued: 2,
  done: 3,
  cancelled: 4,
  failed: 5,
};

export default function TasksPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<SortKey>("date");

  const { workspaceId } = useWorkspace();

  const tasks = useQuery(api.tasks.list, workspaceId ? {
    workspaceId,
    status: statusFilter === "all" ? undefined : statusFilter,
    priority: priorityFilter === "all" ? undefined : priorityFilter,
  } : "skip");

  const filteredTasks = useMemo(() => {
    if (!tasks) return undefined;
    let result = [...tasks];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t: any) =>
          t.title.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.category?.toLowerCase().includes(q) ||
          t.tags?.some((tag: string) => tag.toLowerCase().includes(q))
      );
    }

    result.sort((a: any, b: any) => {
      if (sortBy === "priority") {
        return (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2);
      }
      if (sortBy === "status") {
        return (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3);
      }
      return b._creationTime - a._creationTime;
    });

    return result;
  }, [tasks, search, sortBy]);

  const taskCount = filteredTasks?.length ?? 0;

  return (
    <>
      <Topbar
        title="All Tasks"
        subtitle={tasks ? `${tasks.length} tasks total` : undefined}
      />
      <main className="flex-1 p-6 space-y-6 max-w-[1400px] w-full mx-auto">
        {/* Search + View Toggle + Sort */}
        <div className="flex items-center gap-3">
          <BatchCreate />
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 bg-surface border-border rounded-lg"
            />
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 bg-surface">
            <button
              onClick={() => setViewMode("grid")}
              className={`rounded-md p-2 transition-all duration-150 ${viewMode === "grid" ? "bg-accent-glow text-accent-light" : "text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`rounded-md p-2 transition-all duration-150 ${viewMode === "list" ? "bg-accent-glow text-accent-light" : "text-muted-foreground hover:text-foreground"}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            {(["date", "priority", "status"] as SortKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                className={`pill-filter ${
                  sortBy === key ? "pill-filter-active" : "pill-filter-inactive"
                }`}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Status Filter Pills */}
        <div className="space-y-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Status
          </p>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={`pill-filter ${
                  statusFilter === opt.value
                    ? statusPillStyles[opt.value] ?? "pill-filter-active"
                    : "pill-filter-inactive"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Priority Filter Pills */}
        <div className="space-y-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Priority
          </p>
          <div className="flex flex-wrap gap-1.5">
            {PRIORITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPriorityFilter(opt.value)}
                className={`pill-filter ${
                  priorityFilter === opt.value
                    ? priorityPillStyles[opt.value] ?? "pill-filter-active"
                    : "pill-filter-inactive"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Task List / Grid */}
        {filteredTasks === undefined ? (
          <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" : "space-y-3"}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 bg-card rounded-xl animate-pulse border border-border" />
            ))}
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <Inbox className="h-14 w-14 mb-4 opacity-30" />
            <p className="text-sm font-medium">No tasks found</p>
            <p className="text-xs mt-1 text-muted-foreground/60">
              {search ? "Try a different search term" : "Create a new task to get started"}
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Showing {taskCount} task{taskCount !== 1 ? "s" : ""}
            </p>
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
                  : "space-y-2"
              }
            >
              {filteredTasks.map((task: any) => (
                <TaskCard key={task._id} task={task} />
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}
