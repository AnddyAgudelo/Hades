"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useWorkspace } from "@/lib/workspace-context";
import { Topbar } from "@/components/layout/topbar";
import { TaskCard } from "@/components/tasks/task-card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  CheckCircle2,
  Clock,
  Layers,
  ArrowLeft,
  Zap,
  GitBranch,
} from "lucide-react";
import Link from "next/link";

function formatMs(ms: number): string {
  if (ms === 0) return "—";
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function FeatureDetailPage() {
  const { featureId } = useParams<{ featureId: string }>();
  const { workspaceId } = useWorkspace();

  const feature = useQuery(api.features.get, { featureId });
  const stats = useQuery(api.stats.featureStats, { featureId });

  if (!feature && !stats) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <Topbar title="Feature" subtitle={featureId} />
        <div className="flex items-center justify-center h-60 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </div>
    );
  }

  const tasks = stats?.tasks ?? [];
  const total = stats?.total ?? 0;
  const completed = stats?.completed ?? 0;
  const percent = stats?.percentComplete ?? 0;
  const byStatus = stats?.byStatus ?? {};

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Topbar
        title={feature?.name ?? featureId}
        subtitle={`${completed}/${total} tasks completed`}
      />
      <div className="flex-1 overflow-auto p-6 space-y-6 max-w-[1400px] w-full mx-auto">
        {/* Back link */}
        <Link
          href="/features"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          All Features
        </Link>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Progress"
            value={`${percent}%`}
            icon={<CheckCircle2 className="h-4 w-4" />}
            color="text-emerald-400"
          />
          <StatCard
            label="Total Tasks"
            value={total}
            icon={<Layers className="h-4 w-4" />}
            color="text-accent-light"
          />
          <StatCard
            label="Avg Time"
            value={formatMs(stats?.avgExecutionTimeMs ?? 0)}
            icon={<Clock className="h-4 w-4" />}
            color="text-amber-400"
          />
          <StatCard
            label="Total Time"
            value={formatMs(stats?.totalExecutionTimeMs ?? 0)}
            icon={<Zap className="h-4 w-4" />}
            color="text-purple-400"
          />
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="h-2 rounded-full bg-border overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(byStatus).map(([status, count]) => (
              <Badge key={status} variant="secondary" className="text-[10px]">
                {status.replace("_", " ")}: {count as number}
              </Badge>
            ))}
          </div>
        </div>

        {/* Config badges */}
        {feature && (
          <div className="flex flex-wrap gap-2">
            {feature.autoAdvance && (
              <Badge className="text-[10px] bg-emerald-500/15 text-emerald-400">auto-advance</Badge>
            )}
            {feature.maxParallel && (
              <Badge className="text-[10px] bg-blue-500/15 text-blue-400">max parallel: {feature.maxParallel}</Badge>
            )}
            {feature.webhookUrl && (
              <Badge className="text-[10px] bg-amber-500/15 text-amber-400">webhook</Badge>
            )}
          </div>
        )}

        <Separator />

        {/* Task list */}
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Tasks
          </h2>
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No tasks in this feature</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {tasks.map((task: any) => (
                <TaskCard key={task._id} task={task} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className={color}>{icon}</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
      </div>
      <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}
