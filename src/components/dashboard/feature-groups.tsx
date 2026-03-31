"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useWorkspace } from "@/lib/workspace-context";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import {
  Layers,
  GitBranch,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Filter,
  Clock,
} from "lucide-react";

const statusDot: Record<string, string> = {
  queued: "bg-primary",
  in_progress: "bg-primary animate-pulse",
  blocked: "bg-red-400",
  done: "bg-emerald-400",
  cancelled: "bg-zinc-400",
  failed: "bg-red-400",
};

const statusStyles: Record<string, string> = {
  queued: "bg-primary/15 text-primary",
  in_progress: "bg-primary/15 text-primary",
  blocked: "bg-red-500/15 text-red-400",
  done: "bg-emerald-500/15 text-emerald-400",
  cancelled: "bg-zinc-500/15 text-zinc-400",
  failed: "bg-red-500/15 text-red-400",
};

function formatMs(ms: number): string {
  if (ms === 0) return "—";
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function FeatureGroups() {
  const { workspaceId } = useWorkspace();
  const data = useQuery(api.tasks.listGroupedByFeature, workspaceId ? { workspaceId } : "skip");
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set());
  const [featureFilter, setFeatureFilter] = useState("all");
  const [repoFilter, setRepoFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const allRepos = useMemo(() => {
    if (!data) return [];
    const repos = new Set<string>();
    for (const f of data.features) {
      for (const t of f.tasks) {
        if (t.repo) repos.add(t.repo);
      }
    }
    for (const t of data.ungrouped) {
      if (t.repo) repos.add(t.repo);
    }
    return Array.from(repos).sort();
  }, [data]);

  if (!data) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="h-5 bg-muted rounded w-48 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const toggleFeature = (id: string) => {
    setExpandedFeatures((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredFeatures = data.features
    .filter((f) => featureFilter === "all" || f.featureId === featureFilter)
    .map((f) => ({
      ...f,
      tasks: f.tasks.filter((t: any) => {
        if (repoFilter !== "all" && t.repo !== repoFilter) return false;
        if (statusFilter !== "all" && t.status !== statusFilter) return false;
        return true;
      }),
    }))
    .filter((f) => f.tasks.length > 0);

  const filteredUngrouped = data.ungrouped.filter((t: any) => {
    if (repoFilter !== "all" && t.repo !== repoFilter) return false;
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="rounded-xl border border-border bg-card p-5 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-accent-light" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Features
          </span>
        </div>
        <span className="flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-accent-glow text-[11px] font-semibold text-accent-light tabular-nums">
          {data.features.length}
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex items-center gap-1">
          <Filter className="h-3 w-3 text-muted-foreground" />
        </div>
        <select
          value={featureFilter}
          onChange={(e) => setFeatureFilter(e.target.value)}
          className="h-7 rounded-md border border-border bg-surface px-2 text-xs text-foreground"
        >
          <option value="all">All features</option>
          {data.features.map((f) => (
            <option key={f.featureId} value={f.featureId}>
              {f.featureName}
            </option>
          ))}
        </select>
        <select
          value={repoFilter}
          onChange={(e) => setRepoFilter(e.target.value)}
          className="h-7 rounded-md border border-border bg-surface px-2 text-xs text-foreground"
        >
          <option value="all">All repos</option>
          {allRepos.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-7 rounded-md border border-border bg-surface px-2 text-xs text-foreground"
        >
          <option value="all">All statuses</option>
          <option value="queued">Queued</option>
          <option value="in_progress">In Progress</option>
          <option value="blocked">Blocked</option>
          <option value="done">Done</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <ScrollArea className="max-h-[600px]">
        <div className="space-y-3">
          {filteredFeatures.map((feature) => {
            const isExpanded = expandedFeatures.has(feature.featureId);

            const completedTasks = feature.tasks.filter((t: any) => t.status === "done");
            const totalTimeMs = completedTasks.reduce((s: number, t: any) => s + (t.executionTimeMs || 0), 0);
            const avgTimeMs = completedTasks.length > 0 ? totalTimeMs / completedTasks.length : 0;

            const repoBreakdown: Record<string, number> = {};
            for (const t of feature.tasks) {
              const repo = (t as any).repo || "unassigned";
              repoBreakdown[repo] = (repoBreakdown[repo] || 0) + 1;
            }

            return (
              <div
                key={feature.featureId}
                className="rounded-lg border border-border overflow-hidden"
              >
                {/* Feature header */}
                <button
                  onClick={() => toggleFeature(feature.featureId)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-surface-hover transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="flex-1 text-left">
                    <span className="text-sm font-semibold">{feature.featureName}</span>
                    <span className="text-[11px] text-muted-foreground ml-2">
                      {feature.featureId}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {feature.completed}/{feature.total}
                    </span>
                    <div className="w-16 h-1.5 rounded-full bg-border overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${feature.percentComplete}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-medium text-emerald-400 tabular-nums w-8 text-right">
                      {feature.percentComplete}%
                    </span>
                  </div>
                </button>

                {/* Expanded: inline stats + task list */}
                {isExpanded && (
                  <div className="border-t border-border">
                    {/* Inline stats bar */}
                    <div className="flex flex-wrap items-center gap-3 px-4 py-2 bg-surface/50 border-b border-border">
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>Total: <span className="text-foreground font-medium">{formatMs(totalTimeMs)}</span></span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Avg: <span className="text-foreground font-medium">{formatMs(avgTimeMs)}</span>
                      </div>
                      <div className="h-3 w-px bg-border" />
                      {Object.entries(repoBreakdown).map(([repo, count]) => (
                        <span key={repo} className="text-[10px] text-muted-foreground">
                          {repo}: <span className="text-foreground font-medium">{count}</span>
                        </span>
                      ))}
                    </div>

                    {feature.tasks.map((task: any) => (
                      <TaskRow key={task._id} task={task} allTasks={feature.tasks} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Ungrouped tasks */}
          {filteredUngrouped.length > 0 && (
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="flex items-center gap-3 p-3">
                <span className="text-sm font-semibold text-muted-foreground">
                  Ungrouped tasks
                </span>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {filteredUngrouped.length}
                </span>
              </div>
              <div className="border-t border-border">
                {filteredUngrouped.map((task: any) => (
                  <TaskRow key={task._id} task={task} />
                ))}
              </div>
            </div>
          )}

          {filteredFeatures.length === 0 && filteredUngrouped.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              No tasks match the current filters
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function TaskRow({ task, allTasks }: { task: any; allTasks?: any[] }) {
  const hasDeps = task.dependsOn && task.dependsOn.length > 0;
  const isDependedOn = allTasks?.some(
    (t: any) => t.dependsOn?.includes(task._id)
  );

  return (
    <Link
      href={`/tasks/${task._id}`}
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-hover transition-colors group overflow-hidden"
    >
      {/* Status dot */}
      <span className={`h-2 w-2 rounded-full shrink-0 ${statusDot[task.status] || "bg-zinc-400"}`} />

      {/* Task number */}
      {task.taskNumber != null && (
        <span className="text-[11px] text-muted-foreground tabular-nums w-6 shrink-0">
          #{task.taskNumber}
        </span>
      )}

      {/* Dependency indicator */}
      {hasDeps && (
        <span className="flex items-center gap-0.5 text-[10px] text-amber-400 shrink-0" title={`Depends on ${task.dependsOn.length} task(s)`}>
          <ArrowRight className="h-3 w-3" />
          {task.dependsOn.length}
        </span>
      )}

      {/* Title */}
      <span className="text-sm truncate flex-1 min-w-0 group-hover:text-accent-light transition-colors">
        {task.title}
      </span>

      {/* Right side badges */}
      <div className="flex items-center gap-1.5 shrink-0">
        {isDependedOn && (
          <span className="text-[10px] text-accent-light" title="Other tasks depend on this">
            <GitBranch className="h-3 w-3" />
          </span>
        )}
        {task.repo && (
          <Badge className="text-[10px] bg-zinc-500/15 text-zinc-400">
            {task.repo}
          </Badge>
        )}
        <Badge className={`text-[10px] ${statusStyles[task.status] || ""}`}>
          {task.status.replace("_", " ")}
        </Badge>
      </div>
    </Link>
  );
}
