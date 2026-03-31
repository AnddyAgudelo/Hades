"use client";

import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle } from "lucide-react";
import Link from "next/link";
import type { GenericId } from "convex/values";

const priorityBorder: Record<string, string> = {
  urgent: "border-l-red-500",
  high: "border-l-orange-500",
  medium: "border-l-amber-500",
  low: "border-l-blue-500",
  backlog: "border-l-zinc-500",
};

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

interface TaskCardProps {
  task: {
    _id: GenericId<"tasks">;
    _creationTime: number;
    title: string;
    description?: string;
    status: string;
    priority: string;
    category?: string;
    tags?: string[];
    blockReason?: string;
    startedAt?: number;
    completedAt?: number;
    actualMinutes?: number;
    estimatedMinutes?: number;
    source?: string;
  };
}

export function TaskCard({ task }: TaskCardProps) {
  return (
    <Link href={`/tasks/${task._id}`}>
      <div
        className={`group rounded-xl border border-border bg-card p-4 border-l-[3px] ${priorityBorder[task.priority] ?? "border-l-zinc-500"} transition-all duration-150 cursor-pointer hover:border-accent-light/30 hover:-translate-y-px hover:shadow-md`}
      >
        {/* Header badges */}
        <div className="flex items-center gap-1.5 mb-2">
          <Badge className={`text-[10px] ${statusStyles[task.status] ?? ""}`}>
            {task.status.replace("_", " ")}
          </Badge>
          <Badge className={`text-[10px] ${priorityStyles[task.priority] ?? ""}`}>
            {task.priority}
          </Badge>
          {task.category && (
            <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
              {task.category}
            </Badge>
          )}
        </div>

        {/* Title */}
        <h3 className="text-[15px] font-semibold truncate group-hover:text-accent-light transition-colors">
          {task.title}
        </h3>

        {/* Description */}
        {task.description && (
          <p className="text-[13px] text-muted-foreground line-clamp-2 mt-1">
            {task.description}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
          {task.source && (
            <span className="text-[11px] capitalize">{task.source}</span>
          )}
          {task.actualMinutes != null && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {task.actualMinutes}min
            </span>
          )}
          {task.estimatedMinutes != null && !task.actualMinutes && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              ~{task.estimatedMinutes}min
            </span>
          )}
          {task.blockReason && (
            <span className="flex items-center gap-1 text-red-400">
              <AlertTriangle className="h-3 w-3" />
              {task.blockReason}
            </span>
          )}
          <span className="ml-auto text-[11px] tabular-nums">{formatRelative(task._creationTime)}</span>
        </div>

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <div className="flex gap-1 mt-2">
            {task.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-full bg-accent-glow px-2 py-0.5 text-[10px] font-medium text-accent-light">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
