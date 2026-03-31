"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useWorkspace } from "@/lib/workspace-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Zap, Clock, CheckCircle2, Ban, SkipForward } from "lucide-react";

const priorityColor: Record<string, string> = {
  urgent: "bg-red-500/15 text-red-400 border-red-500/20",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  low: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  backlog: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
};

function LiveTimer({ startedAt }: { startedAt: number }) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    function update() {
      const mins = Math.floor((Date.now() - startedAt) / 60000);
      if (mins < 60) {
        setElapsed(`${mins}m`);
      } else {
        const hrs = Math.floor(mins / 60);
        setElapsed(`${hrs}h ${mins % 60}m`);
      }
    }
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono tabular-nums">
      <Clock className="h-3.5 w-3.5" />
      {elapsed}
    </span>
  );
}

export function CurrentTask() {
  const { workspaceId } = useWorkspace();
  const current = useQuery(api.queue.current, workspaceId ? { workspaceId } : "skip");
  const completeTask = useMutation(api.queue.complete);
  const blockTask = useMutation(api.queue.block);
  const skipTask = useMutation(api.queue.skip);

  if (current === undefined) {
    return (
      <div className="h-52 bg-card rounded-xl animate-pulse border border-border" />
    );
  }

  if (!current) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-12 w-12 rounded-full bg-surface-hover flex items-center justify-center mb-4">
            <Zap className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Queue is idle</p>
          <p className="text-xs text-muted-foreground/60 mt-1">No task currently running</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-accent-light/20 bg-gradient-to-br from-accent-glow to-transparent p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-accent-light">
            Executing
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <Badge className={priorityColor[current.priority] ?? ""}>
            {current.priority}
          </Badge>
          {current.startedAt && <LiveTimer startedAt={current.startedAt} />}
        </div>
      </div>

      {/* Title + description */}
      <div>
        <h3 className="text-lg font-semibold tracking-tight">{current.title}</h3>
        {current.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{current.description}</p>
        )}
      </div>

      {/* Execution log — terminal style */}
      {current.executionLog && (
        <div className="terminal-window">
          <div className="terminal-header">
            <span className="terminal-dot bg-red-500" />
            <span className="terminal-dot bg-amber-500" />
            <span className="terminal-dot bg-emerald-500" />
            <span className="ml-2 text-[11px] text-muted-foreground font-mono">execution.log</span>
          </div>
          <ScrollArea className="h-44 p-4">
            <pre className="text-xs leading-[1.8] font-mono whitespace-pre-wrap text-emerald-400/80">
              {current.executionLog}
            </pre>
          </ScrollArea>
        </div>
      )}

      {/* Action buttons — pill shaped */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          size="sm"
          className="rounded-full bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border-0"
          onClick={() => completeTask({ taskId: current._id })}
        >
          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
          Complete
        </Button>
        <Button
          size="sm"
          className="rounded-full bg-red-500/15 text-red-400 hover:bg-red-500/25 border-0"
          onClick={() => blockTask({ taskId: current._id, reason: "Blocked from UI" })}
        >
          <Ban className="h-3.5 w-3.5 mr-1.5" />
          Block
        </Button>
        <Button
          size="sm"
          className="rounded-full bg-surface text-muted-foreground hover:bg-surface-hover border-0"
          onClick={() => skipTask({ taskId: current._id })}
        >
          <SkipForward className="h-3.5 w-3.5 mr-1.5" />
          Skip
        </Button>
      </div>
    </div>
  );
}
