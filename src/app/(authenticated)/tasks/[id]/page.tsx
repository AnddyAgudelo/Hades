"use client";

import { use, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Topbar } from "@/components/layout/topbar";
import {
  ArrowLeft,
  Clock,
  Terminal,
  Activity,
  ListTree,
  Calendar,
  Tag,
  FileText,
  Play,
  CheckCircle2,
  Ban,
  SkipForward,
  Unlock,
  Loader2,
  ExternalLink,
  RotateCcw,
  AlertTriangle,
  Link2,
  GitBranch,
  GitFork,
  Globe,
  Layers,
  Hash,
  ArrowRight,
  Pencil,
  Check,
  X,
} from "lucide-react";
import Link from "next/link";
import type { GenericId } from "convex/values";

const statusStyles: Record<string, string> = {
  queued: "bg-primary/15 text-primary",
  in_progress: "bg-primary/15 text-primary",
  blocked: "bg-red-500/15 text-red-400",
  done: "bg-emerald-500/15 text-emerald-400",
  cancelled: "bg-zinc-500/15 text-zinc-400",
  failed: "bg-red-500/15 text-red-400",
};

const priorityStyles: Record<string, string> = {
  urgent: "bg-red-500/15 text-red-400",
  high: "bg-orange-500/15 text-orange-400",
  medium: "bg-amber-500/15 text-amber-400",
  low: "bg-blue-500/15 text-blue-400",
  backlog: "bg-zinc-500/15 text-zinc-400",
};

const priorityDot: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-amber-500",
  low: "bg-blue-500",
  backlog: "bg-zinc-500",
};

const actionDot: Record<string, string> = {
  task_created: "bg-primary",
  task_started: "bg-blue-500",
  task_completed: "bg-emerald-500",
  task_blocked: "bg-red-500",
  task_skipped: "bg-zinc-400",
  task_deleted: "bg-zinc-500",
  task_retried: "bg-amber-500",
  queue_idle: "bg-zinc-400",
};

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatRelative(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatMs(ms: number): string {
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return formatDuration(Math.round(ms / 60000));
}

export default function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const taskId = id as GenericId<"tasks">;
  const task = useQuery(api.tasks.get, { id: taskId });
  const subtasks = useQuery(api.tasks.getSubtasks, { parentId: taskId });
  const activities = useQuery(api.activity.byTask, { taskId });
  const dependents = useQuery(api.tasks.getDependents, { taskId });

  const startTask = useMutation(api.queue.start);
  const completeTask = useMutation(api.queue.complete);
  const blockTask = useMutation(api.queue.block);
  const skipTask = useMutation(api.queue.skip);
  const unblockTask = useMutation(api.queue.unblock);
  const retryTask = useMutation(api.queue.retry);
  const updateTask = useMutation(api.tasks.update);

  const [blockReason, setBlockReason] = useState("");
  const [showBlockInput, setShowBlockInput] = useState(false);
  const [acting, setActing] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState(false);
  const [webhookDraft, setWebhookDraft] = useState("");

  async function handleAction(action: () => Promise<unknown>) {
    setActing(true);
    try {
      await action();
    } finally {
      setActing(false);
      setShowBlockInput(false);
      setBlockReason("");
    }
  }

  if (task === undefined) {
    return (
      <>
        <Topbar title="Task Detail" />
        <div className="flex-1 p-6 max-w-[1400px] w-full mx-auto">
          <div className="space-y-4">
            <div className="h-10 bg-card rounded-lg w-72 animate-pulse border border-border" />
            <div className="h-64 bg-card rounded-xl animate-pulse border border-border" />
          </div>
        </div>
      </>
    );
  }

  if (!task) {
    return (
      <>
        <Topbar title="Task Not Found" />
        <div className="flex-1 flex flex-col items-center justify-center py-24 text-muted-foreground">
          <p className="text-sm">Task not found.</p>
          <Link href="/tasks" className="text-sm text-accent-light hover:underline mt-2">
            Back to tasks
          </Link>
        </div>
      </>
    );
  }

  const canStart = task.status === "queued";
  const canComplete = task.status === "in_progress";
  const canBlock = task.status === "in_progress" || task.status === "queued";
  const canSkip = task.status === "in_progress";
  const canUnblock = task.status === "blocked";
  const canRetry = task.status === "failed" && (task.retryCount ?? 0) < (task.maxRetries ?? 3);

  return (
    <>
      <Topbar title="Task Detail" />
      <main className="flex-1 p-6 max-w-[1400px] w-full mx-auto">
        {/* Back link */}
        <Link
          href="/tasks"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-5"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to tasks
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Main Content */}
          <div className="space-y-6">
            {/* Hero Header */}
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${priorityDot[task.priority] ?? "bg-zinc-500"}`} />
                <Badge className={`text-[10px] ${statusStyles[task.status] ?? ""}`}>
                  {task.status.replace("_", " ")}
                </Badge>
                <Badge className={`text-[10px] ${priorityStyles[task.priority] ?? ""}`}>
                  {task.priority}
                </Badge>
                {task.category && (
                  <Badge variant="secondary" className="text-[10px]">
                    {task.category}
                  </Badge>
                )}
                {task.source && (
                  <Badge variant="secondary" className="text-[10px] capitalize">
                    {task.source}
                  </Badge>
                )}
                {task.retryCount != null && task.retryCount > 0 && (
                  <Badge className="text-[10px] bg-amber-500/15 text-amber-400">
                    retry {task.retryCount}/{task.maxRetries ?? 3}
                  </Badge>
                )}
              </div>

              <h1 className="text-2xl font-bold tracking-tight">{task.title}</h1>

              {task.tags && task.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {task.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="rounded-full bg-accent-glow px-2.5 py-0.5 text-[10px] font-medium text-accent-light"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Block reason banner */}
              {task.blockReason && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-sm text-red-400">
                  Blocked: {task.blockReason}
                </div>
              )}

              {/* Last error banner */}
              {task.lastError && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 text-sm text-amber-400 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium">Last error:</span> {task.lastError}
                  </div>
                </div>
              )}

              {/* Result banner */}
              {task.result && (
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 text-sm text-emerald-400">
                  {task.result}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {canRetry && (
                  <Button
                    size="sm"
                    disabled={acting}
                    onClick={() => handleAction(() => retryTask({ taskId }))}
                    className="rounded-full bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border-0"
                  >
                    {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                    Retry
                  </Button>
                )}
                {canStart && (
                  <Button
                    size="sm"
                    disabled={acting}
                    onClick={() => handleAction(() => startTask({ taskId }))}
                    className="rounded-full bg-gradient-to-r from-[#6c63ff] to-[#a78bfa] hover:from-[#5b54e6] hover:to-[#9678f0] text-white border-0"
                  >
                    {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                    Start
                  </Button>
                )}
                {canComplete && (
                  <Button
                    size="sm"
                    disabled={acting}
                    onClick={() => handleAction(() => completeTask({ taskId }))}
                    className="rounded-full bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border-0"
                  >
                    {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    Complete
                  </Button>
                )}
                {canBlock && !showBlockInput && (
                  <Button
                    size="sm"
                    onClick={() => setShowBlockInput(true)}
                    className="rounded-full bg-red-500/15 text-red-400 hover:bg-red-500/25 border-0"
                  >
                    <Ban className="h-3.5 w-3.5" />
                    Block
                  </Button>
                )}
                {showBlockInput && (
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Block reason..."
                      value={blockReason}
                      onChange={(e) => setBlockReason(e.target.value)}
                      className="h-8 w-48 text-xs"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      disabled={acting || !blockReason.trim()}
                      onClick={() =>
                        handleAction(() =>
                          blockTask({ taskId, reason: blockReason.trim() })
                        )
                      }
                      className="rounded-full bg-red-600 hover:bg-red-700 text-white border-0"
                    >
                      Confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => {
                        setShowBlockInput(false);
                        setBlockReason("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
                {canSkip && (
                  <Button
                    size="sm"
                    disabled={acting}
                    onClick={() => handleAction(() => skipTask({ taskId }))}
                    className="rounded-full bg-surface text-muted-foreground hover:bg-surface-hover border-0"
                  >
                    <SkipForward className="h-3.5 w-3.5" />
                    Skip
                  </Button>
                )}
                {canUnblock && (
                  <Button
                    size="sm"
                    disabled={acting}
                    onClick={() => handleAction(() => unblockTask({ taskId }))}
                    className="rounded-full bg-primary/15 text-primary hover:bg-primary/25 border-0"
                  >
                    <Unlock className="h-3.5 w-3.5" />
                    Unblock
                  </Button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="description">
              <TabsList variant="line" className="w-full justify-start gap-0 border-b border-border pb-0">
                <TabsTrigger value="description" className="gap-1.5 px-3">
                  <FileText className="h-3.5 w-3.5" />
                  Description
                </TabsTrigger>
                <TabsTrigger value="log" className="gap-1.5 px-3">
                  <Terminal className="h-3.5 w-3.5" />
                  Execution Log
                </TabsTrigger>
                <TabsTrigger value="subtasks" className="gap-1.5 px-3">
                  <ListTree className="h-3.5 w-3.5" />
                  Subtasks
                  {subtasks && subtasks.length > 0 && (
                    <span className="rounded-full bg-accent-glow px-1.5 text-[10px] text-accent-light">
                      {subtasks.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="activity" className="gap-1.5 px-3">
                  <Activity className="h-3.5 w-3.5" />
                  Activity
                  {activities && activities.length > 0 && (
                    <span className="rounded-full bg-accent-glow px-1.5 text-[10px] text-accent-light">
                      {activities.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Description Tab */}
              <TabsContent value="description" className="pt-5">
                {task.description ? (
                  <div className="rounded-xl border border-border bg-card p-6">
                    <div className="prose prose-sm prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
                      {task.description}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
                    <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No description provided</p>
                  </div>
                )}
              </TabsContent>

              {/* Execution Log Tab */}
              <TabsContent value="log" className="pt-5">
                {task.executionLog ? (
                  <div className="terminal-window">
                    <div className="terminal-header">
                      <span className="terminal-dot bg-red-500" />
                      <span className="terminal-dot bg-amber-500" />
                      <span className="terminal-dot bg-emerald-500" />
                      <span className="ml-2 text-[11px] text-muted-foreground font-mono">
                        execution.log
                      </span>
                    </div>
                    <ScrollArea className="h-80 p-4">
                      <pre className="text-xs font-mono whitespace-pre-wrap text-emerald-400/80 leading-[1.8]">
                        {task.executionLog}
                      </pre>
                    </ScrollArea>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
                    <Terminal className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No execution log yet</p>
                  </div>
                )}
              </TabsContent>

              {/* Subtasks Tab */}
              <TabsContent value="subtasks" className="pt-5">
                {subtasks && subtasks.length > 0 ? (
                  <div className="space-y-2">
                    {subtasks.map((sub: any) => (
                      <Link
                        key={sub._id}
                        href={`/tasks/${sub._id}`}
                        className="flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:border-accent-light/30 hover:-translate-y-px hover:shadow-md transition-all duration-150"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                              sub.status === "done"
                                ? "bg-emerald-500"
                                : sub.status === "in_progress"
                                  ? "bg-primary"
                                  : sub.status === "blocked"
                                    ? "bg-red-500"
                                    : "bg-zinc-500"
                            }`}
                          />
                          <span className="text-sm font-medium truncate">
                            {sub.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className={`text-[10px] ${statusStyles[sub.status] ?? ""}`}>
                            {sub.status.replace("_", " ")}
                          </Badge>
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
                    <ListTree className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No subtasks</p>
                  </div>
                )}
              </TabsContent>

              {/* Activity Tab */}
              <TabsContent value="activity" className="pt-5">
                {activities && activities.length > 0 ? (
                  <div className="rounded-xl border border-border bg-card p-6">
                    <div className="relative pl-5">
                      <div className="absolute left-[7px] top-1 bottom-1 w-px bg-border" />
                      <div className="space-y-4">
                        {activities.map((entry: any) => {
                          const dotColor = actionDot[entry.action] ?? "bg-zinc-400";
                          return (
                            <div
                              key={entry._id}
                              className="relative flex items-start gap-3 rounded-md px-2 py-1.5 -ml-2 hover:bg-surface-hover transition-colors"
                            >
                              <span
                                className={`absolute left-[-13px] top-2 h-3 w-3 rounded-full ring-2 ring-card ${dotColor}`}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] text-foreground/80 leading-relaxed">
                                  {entry.details ?? entry.action.replace("_", " ")}
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
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
                    <Activity className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No activity recorded</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar Metadata */}
          <div className="space-y-5">
            {/* Details */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Details
              </h3>
              <Separator />

              <MetaRow label="Status">
                <Badge className={`text-[10px] ${statusStyles[task.status] ?? ""}`}>
                  {task.status.replace("_", " ")}
                </Badge>
              </MetaRow>

              <MetaRow label="Priority">
                <div className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${priorityDot[task.priority] ?? "bg-zinc-500"}`} />
                  <span className="text-sm font-medium capitalize">{task.priority}</span>
                </div>
              </MetaRow>

              {task.category && (
                <MetaRow label="Category">
                  <span className="text-sm font-medium">{task.category}</span>
                </MetaRow>
              )}

              {task.source && (
                <MetaRow label="Source">
                  <span className="text-sm font-medium capitalize">{task.source}</span>
                </MetaRow>
              )}

              {/* Retry info */}
              {(task.retryCount != null && task.retryCount > 0) && (
                <>
                  <Separator />
                  <MetaRow label="Retries" icon={<RotateCcw className="h-3 w-3" />}>
                    <span className="text-sm font-medium tabular-nums">
                      {task.retryCount}/{task.maxRetries ?? 3}
                    </span>
                  </MetaRow>
                </>
              )}

              <Separator />

              <MetaRow label="Created" icon={<Calendar className="h-3 w-3" />}>
                <span className="text-xs tabular-nums">{formatDate(task._creationTime)}</span>
              </MetaRow>

              {task.startedAt && (
                <MetaRow label="Started" icon={<Play className="h-3 w-3" />}>
                  <span className="text-xs tabular-nums">{formatDate(task.startedAt)}</span>
                </MetaRow>
              )}

              {task.completedAt && (
                <MetaRow label="Completed" icon={<CheckCircle2 className="h-3 w-3" />}>
                  <span className="text-xs tabular-nums">{formatDate(task.completedAt)}</span>
                </MetaRow>
              )}

              {task.actualMinutes != null && (
                <>
                  <Separator />
                  <MetaRow label="Duration" icon={<Clock className="h-3 w-3" />}>
                    <span className="text-sm font-semibold">
                      {formatDuration(task.actualMinutes)}
                    </span>
                  </MetaRow>
                </>
              )}

              {task.estimatedMinutes != null && (
                <MetaRow label="Estimated" icon={<Clock className="h-3 w-3" />}>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatDuration(task.estimatedMinutes)}
                  </span>
                </MetaRow>
              )}

              {task.executionTimeMs != null && (
                <MetaRow label="Exec Time">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatMs(task.executionTimeMs)}
                  </span>
                </MetaRow>
              )}
            </div>

            {/* Repo & Feature Info */}
            {(task.repo || task.featureId || task.branch || task.parallelGroup) && (
              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <GitBranch className="h-3 w-3" />
                  Repository & Feature
                </h3>
                <Separator />

                {task.repo && (
                  <MetaRow label="Repo">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono truncate max-w-[140px]">{task.repo}</span>
                    </div>
                  </MetaRow>
                )}

                {task.branch && (
                  <MetaRow label="Branch" icon={<GitFork className="h-3 w-3" />}>
                    <span className="text-xs font-mono truncate max-w-[160px]">{task.branch}</span>
                  </MetaRow>
                )}

                {task.featureId && (
                  <MetaRow label="Feature" icon={<Layers className="h-3 w-3" />}>
                    <div className="text-right">
                      <span className="text-xs font-medium block">{task.featureName ?? task.featureId}</span>
                      {task.featureName && (
                        <span className="text-[10px] text-muted-foreground">{task.featureId}</span>
                      )}
                    </div>
                  </MetaRow>
                )}

                {task.taskNumber != null && (
                  <MetaRow label="Task #" icon={<Hash className="h-3 w-3" />}>
                    <span className="text-sm font-medium tabular-nums">#{task.taskNumber}</span>
                  </MetaRow>
                )}

                {task.parallelGroup && (
                  <MetaRow label="Parallel Group">
                    <span className="text-xs font-mono">{task.parallelGroup}</span>
                  </MetaRow>
                )}
              </div>
            )}

            {/* Dependencies */}
            {((task.dependsOn && task.dependsOn.length > 0) || (dependents && dependents.length > 0)) && (
              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Link2 className="h-3 w-3" />
                  Dependencies
                </h3>
                <Separator />

                {task.dependsOn && task.dependsOn.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Depends on
                    </span>
                    {task.dependsOn.map((depId: any) => (
                      <DependencyLink key={depId} taskId={depId} />
                    ))}
                  </div>
                )}

                {dependents && dependents.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                      <ArrowRight className="h-3 w-3" />
                      Depended on by
                    </span>
                    {dependents.map((dep: any) => (
                      <Link
                        key={dep._id}
                        href={`/tasks/${dep._id}`}
                        className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-surface-hover transition-colors group"
                      >
                        <span className={`h-2 w-2 rounded-full shrink-0 ${
                          dep.status === "done" ? "bg-emerald-500"
                            : dep.status === "in_progress" ? "bg-primary"
                            : dep.status === "blocked" ? "bg-red-500"
                            : dep.status === "failed" ? "bg-red-400"
                            : "bg-zinc-400"
                        }`} />
                        <span className="text-xs truncate flex-1 group-hover:text-accent-light transition-colors">
                          {dep.title}
                        </span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Webhook URL */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Globe className="h-3 w-3" />
                Webhook
              </h3>
              <Separator />

              {editingWebhook ? (
                <div className="space-y-2">
                  <Input
                    placeholder="https://..."
                    value={webhookDraft}
                    onChange={(e) => setWebhookDraft(e.target.value)}
                    className="h-8 text-xs font-mono"
                    autoFocus
                  />
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      className="rounded-full bg-primary/15 text-primary hover:bg-primary/25 border-0 h-7 text-xs"
                      onClick={async () => {
                        await updateTask({ id: taskId, webhookUrl: webhookDraft.trim() || undefined });
                        setEditingWebhook(false);
                      }}
                    >
                      <Check className="h-3 w-3" />
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full h-7 text-xs"
                      onClick={() => setEditingWebhook(false)}
                    >
                      <X className="h-3 w-3" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  {task.webhookUrl ? (
                    <span className="text-xs font-mono truncate text-foreground/80">{task.webhookUrl}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Not configured</span>
                  )}
                  <button
                    onClick={() => {
                      setWebhookDraft(task.webhookUrl ?? "");
                      setEditingWebhook(true);
                    }}
                    className="text-muted-foreground hover:text-accent-light transition-colors shrink-0"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Tags */}
            {task.tags && task.tags.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Tag className="h-3 w-3" />
                  Tags
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {task.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="rounded-full bg-accent-glow px-2.5 py-0.5 text-[10px] font-medium text-accent-light"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

function DependencyLink({ taskId }: { taskId: GenericId<"tasks"> }) {
  const task = useQuery(api.tasks.get, { id: taskId });

  if (!task) {
    return (
      <div className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-zinc-500 shrink-0" />
        <span className="truncate">{taskId}</span>
      </div>
    );
  }

  return (
    <Link
      href={`/tasks/${taskId}`}
      className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-surface-hover transition-colors group"
    >
      <span className={`h-2 w-2 rounded-full shrink-0 ${
        task.status === "done" ? "bg-emerald-500"
          : task.status === "in_progress" ? "bg-primary"
          : task.status === "blocked" ? "bg-red-500"
          : task.status === "failed" ? "bg-red-400"
          : "bg-zinc-400"
      }`} />
      <span className="text-xs truncate flex-1 group-hover:text-accent-light transition-colors">
        {task.title}
      </span>
      <Badge className={`text-[9px] ${statusStyles[task.status] ?? ""}`}>
        {task.status.replace("_", " ")}
      </Badge>
    </Link>
  );
}

function MetaRow({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </span>
      {children}
    </div>
  );
}
