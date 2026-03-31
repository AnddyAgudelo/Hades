"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useWorkspace } from "@/lib/workspace-context";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Unlock } from "lucide-react";
import Link from "next/link";

export function BlockedList() {
  const { workspaceId } = useWorkspace();
  const tasks = useQuery(api.tasks.list, workspaceId ? { workspaceId, status: "blocked" } : "skip");
  const unblockTask = useMutation(api.queue.unblock);

  if (tasks === undefined) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="h-5 bg-muted rounded w-36 mb-4" />
        <div className="h-14 bg-muted/50 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Blocked
          </span>
        </div>
        <span className="flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-red-500/15 text-[11px] font-semibold text-red-400 tabular-nums">
          {tasks.length}
        </span>
      </div>

      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No blocked tasks</p>
      ) : (
        <div className="space-y-2">
          {tasks.map((task: Record<string, any>) => (
            <div
              key={task._id}
              className="rounded-lg border-l-[3px] border-l-red-500 border border-red-500/15 bg-red-500/[0.03] p-3.5"
            >
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/tasks/${task._id}`}
                  className="text-sm font-medium hover:text-foreground transition-colors flex-1 min-w-0 truncate"
                >
                  {task.title}
                </Link>
                <Button
                  size="xs"
                  variant="outline"
                  className="shrink-0 text-xs rounded-full border-red-500/20 text-red-400 hover:bg-red-500/10"
                  onClick={() => unblockTask({ taskId: task._id })}
                >
                  <Unlock className="h-3 w-3 mr-1" />
                  Unblock
                </Button>
              </div>
              {task.blockReason && (
                <p className="text-xs text-red-400/70 mt-1.5">{task.blockReason}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
