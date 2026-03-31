"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useWorkspace } from "@/lib/workspace-context";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import Link from "next/link";

const priorityColor: Record<string, string> = {
  urgent: "bg-red-500/15 text-red-400",
  high: "bg-orange-500/15 text-orange-400",
  medium: "bg-amber-500/15 text-amber-400",
  low: "bg-blue-500/15 text-blue-400",
  backlog: "bg-zinc-500/15 text-zinc-400",
};

const priorityBorder: Record<string, string> = {
  urgent: "border-l-red-500",
  high: "border-l-orange-500",
  medium: "border-l-amber-500",
  low: "border-l-blue-500",
  backlog: "border-l-zinc-500",
};

export function QueueList() {
  const { workspaceId } = useWorkspace();
  const tasks = useQuery(api.tasks.list, workspaceId ? { workspaceId, status: "queued" } : "skip");

  if (tasks === undefined) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="h-5 bg-muted rounded w-40 mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const sorted = [...tasks].sort((a, b) => {
    const order: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3, backlog: 4 };
    const pa = order[a.priority] ?? 2;
    const pb = order[b.priority] ?? 2;
    if (pa !== pb) return pa - pb;
    return a._creationTime - b._creationTime;
  });

  return (
    <div className="rounded-xl border border-border bg-card p-5 overflow-hidden relative z-0">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Queue
        </span>
        {sorted.length > 0 && (
          <span className="flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-accent-glow text-[11px] font-semibold text-accent-light tabular-nums">
            {sorted.length}
          </span>
        )}
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Queue is empty</p>
      ) : (
        <div className="space-y-1.5">
          {sorted.map((task, i) => (
            <Link
              key={task._id}
              href={`/tasks/${task._id}`}
              className={`group flex items-center gap-3 rounded-lg border-l-[3px] ${priorityBorder[task.priority] ?? "border-l-zinc-500"} hover:bg-surface-hover p-3 transition-all duration-150 cursor-pointer`}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-sm font-bold text-accent-light tabular-nums">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium truncate block group-hover:text-foreground transition-colors">
                  {task.title}
                </span>
                {task.category && (
                  <span className="text-[11px] text-muted-foreground">{task.category}</span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {task.estimatedMinutes && (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    ~{task.estimatedMinutes}m
                  </span>
                )}
                <Badge className={`text-[10px] ${priorityColor[task.priority] ?? ""}`}>
                  {task.priority}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
