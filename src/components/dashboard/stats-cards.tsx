"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useWorkspace } from "@/lib/workspace-context";
import {
  CheckCircle2,
  Flame,
  ListTodo,
  AlertTriangle,
} from "lucide-react";

export function StatsCards() {
  const { workspaceId } = useWorkspace();
  const stats = useQuery(api.stats.dashboard, workspaceId ? { workspaceId } : "skip");

  if (!stats) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 bg-card rounded-xl animate-pulse border border-border" />
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: "COMPLETED",
      value: stats.completedToday,
      total: stats.totalToday || 1,
      subtitle: `${stats.totalToday} total today`,
      icon: CheckCircle2,
      color: "text-emerald-500",
      barColor: "bg-emerald-500",
    },
    {
      label: "IN QUEUE",
      value: stats.queued,
      total: Math.max(stats.queued + stats.blocked + stats.inProgress, 1),
      subtitle: "waiting to execute",
      icon: ListTodo,
      color: "text-accent-light",
      barColor: "bg-primary",
    },
    {
      label: "BLOCKED",
      value: stats.blocked,
      total: Math.max(stats.queued + stats.blocked, 1),
      subtitle: "need attention",
      icon: AlertTriangle,
      color: "text-red-500",
      barColor: "bg-red-500",
    },
    {
      label: "STREAK",
      value: stats.streak,
      total: Math.max(stats.streak, 7),
      subtitle: `${stats.avgMinutes}min avg`,
      icon: Flame,
      color: "text-accent-light",
      barColor: "bg-primary",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="relative overflow-hidden rounded-xl border border-border bg-card p-5 card-hover group cursor-default"
        >
          <div className="flex items-start justify-between mb-4">
            <span className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
              {card.label}
            </span>
            <card.icon className={`h-5 w-5 ${card.color} opacity-80 group-hover:opacity-100 transition-opacity`} />
          </div>
          <div className={`text-4xl font-extrabold tabular-nums tracking-tight ${card.color}`}>
            {card.value}
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">{card.subtitle}</p>
          <div className="mt-4 h-1 rounded-full bg-border overflow-hidden">
            <div
              className={`h-full rounded-full ${card.barColor} transition-all duration-500`}
              style={{ width: `${Math.min((card.value / card.total) * 100, 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
