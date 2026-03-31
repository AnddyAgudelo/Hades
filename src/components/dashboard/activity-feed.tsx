"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useWorkspace } from "@/lib/workspace-context";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity } from "lucide-react";

const actionConfig: Record<string, { dot: string; label: string }> = {
  task_created: { dot: "bg-primary", label: "Created" },
  task_started: { dot: "bg-blue-500", label: "Started" },
  task_completed: { dot: "bg-emerald-500", label: "Completed" },
  task_blocked: { dot: "bg-red-500", label: "Blocked" },
  task_skipped: { dot: "bg-zinc-400", label: "Skipped" },
  task_deleted: { dot: "bg-zinc-500", label: "Deleted" },
};

function formatRelative(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function ActivityFeed() {
  const { workspaceId } = useWorkspace();
  const activities = useQuery(api.activity.recent, workspaceId ? { workspaceId, limit: 15 } : "skip");

  if (activities === undefined) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="h-5 bg-muted rounded w-40 mb-4" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-5 bg-muted/50 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 overflow-hidden">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-4 w-4 text-accent-light" />
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Activity
        </span>
      </div>

      {activities.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No activity yet</p>
      ) : (
        <ScrollArea className="h-72">
          <div className="relative pl-6">
            {/* Continuous vertical line */}
            <div className="absolute left-[9px] top-1 bottom-1 w-px bg-border" />
            <div className="space-y-4">
              {activities.map((entry: Record<string, any>) => {
                const config = actionConfig[entry.action] ?? { dot: "bg-zinc-400", label: entry.action };
                return (
                  <div
                    key={entry._id}
                    className="relative flex items-start gap-3 rounded-md px-2 py-1 hover:bg-surface-hover transition-colors"
                  >
                    <span
                      className={`absolute left-[-15px] top-2 h-3 w-3 rounded-full ring-2 ring-card ${config.dot}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-foreground/90 leading-relaxed">
                        {entry.details ?? config.label}
                      </p>
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">
                      {formatRelative(entry._creationTime)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
