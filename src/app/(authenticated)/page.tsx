"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useWorkspace } from "@/lib/workspace-context";
import { Topbar } from "@/components/layout/topbar";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { CurrentTask } from "@/components/dashboard/current-task";
import { QueueList } from "@/components/dashboard/queue-list";
import { BlockedList } from "@/components/dashboard/blocked-list";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { FeatureGroups } from "@/components/dashboard/feature-groups";

export default function DashboardPage() {
  const { workspaceId } = useWorkspace();
  const stats = useQuery(api.stats.dashboard, workspaceId ? { workspaceId } : "skip");
  const total = stats ? stats.queued + stats.inProgress + stats.blocked + stats.totalDone : 0;

  return (
    <>
      <Topbar
        title="Dashboard"
        subtitle={stats ? `${total} tasks tracked` : undefined}
      />
      <main className="flex-1 p-6 space-y-6 max-w-[1400px] w-full mx-auto">
        <StatsCards />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <CurrentTask />
            <FeatureGroups />
            <QueueList />
          </div>
          <div className="space-y-6">
            <BlockedList />
            <ActivityFeed />
          </div>
        </div>
      </main>
    </>
  );
}
