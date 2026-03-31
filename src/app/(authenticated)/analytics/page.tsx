"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useWorkspace } from "@/lib/workspace-context";
import { Topbar } from "@/components/layout/topbar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  BarChart3,
  Layers,
  GitBranch,
  Clock,
  CheckCircle2,
  TrendingUp,
  Loader2,
  Zap,
  Coins,
  FileCode2,
  Cpu,
} from "lucide-react";

function formatMs(ms: number): string {
  if (ms === 0) return "—";
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatTokens(n: number): string {
  if (n === 0) return "0";
  if (n < 1000) return `${n}`;
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}K`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}

function formatCost(n: number): string {
  if (n === 0) return "$0.00";
  return `$${n.toFixed(2)}`;
}

type Tab = "overview" | "features" | "agents";

export default function AnalyticsPage() {
  const { workspaceId } = useWorkspace();
  const [tab, setTab] = useState<Tab>("overview");

  const dashboard = useQuery(
    api.metrics.globalDashboard,
    workspaceId ? { workspaceId, daysBack: 30 } : "skip"
  );
  const repoStats = useQuery(api.stats.repoStats, workspaceId ? { workspaceId } : "skip");
  const featureData = useQuery(api.tasks.listGroupedByFeature, workspaceId ? { workspaceId } : "skip");
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const featureStats = useQuery(
    api.stats.featureStats,
    selectedFeature ? { featureId: selectedFeature } : "skip"
  );

  const totals = dashboard?.totals;
  const daily = dashboard?.daily ?? [];
  const topAgents = dashboard?.topAgents ?? [];
  const modelDist = dashboard?.modelDistribution ?? [];
  const features = featureData?.features ?? [];
  const maxDailyTasks = daily.length > 0 ? Math.max(...daily.map((d: any) => d.tasks)) : 1;

  const loading = !dashboard && !repoStats;

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "features", label: "Features" },
    { key: "agents", label: "Agents" },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Topbar title="Analytics" subtitle="Execution & cost analytics" />
      <div className="flex-1 overflow-auto p-6 space-y-6 max-w-[1400px] w-full mx-auto">
        {loading ? (
          <div className="flex items-center justify-center h-60 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            {totals && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <SummaryCard label="Tasks" value={totals.tasks} icon={<BarChart3 className="h-4 w-4" />} color="text-accent-light" />
                <SummaryCard label="Tokens" value={formatTokens(totals.tokens)} icon={<Zap className="h-4 w-4" />} color="text-purple-400" />
                <SummaryCard label="Cost" value={formatCost(totals.cost)} icon={<Coins className="h-4 w-4" />} color="text-emerald-400" />
                <SummaryCard label="Exec Time" value={formatMs(totals.timeMs)} icon={<Clock className="h-4 w-4" />} color="text-amber-400" />
                <SummaryCard label="Lines Added" value={totals.lines} icon={<FileCode2 className="h-4 w-4" />} color="text-blue-400" />
              </div>
            )}

            {/* Tab Navigation */}
            <div className="flex gap-1 rounded-lg border border-border p-0.5 bg-surface w-fit">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-150 ${
                    tab === t.key
                      ? "bg-accent-glow text-accent-light"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {tab === "overview" && <OverviewTab daily={daily} maxDailyTasks={maxDailyTasks} repoStats={repoStats} period={dashboard?.period} />}
            {tab === "features" && (
              <FeaturesTab
                features={features}
                featureData={featureData}
                selectedFeature={selectedFeature}
                setSelectedFeature={setSelectedFeature}
                featureStats={featureStats}
              />
            )}
            {tab === "agents" && <AgentsTab topAgents={topAgents} modelDist={modelDist} />}
          </>
        )}
      </div>
    </div>
  );
}

function OverviewTab({ daily, maxDailyTasks, repoStats, period }: any) {
  return (
    <div className="space-y-6">
      {/* Daily Activity Chart */}
      {daily.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-accent-light" />
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Daily Activity ({period})
            </h2>
          </div>
          <Separator />
          <div className="flex items-end gap-1 h-32">
            {daily.map((d: any) => {
              const height = maxDailyTasks > 0 ? (d.tasks / maxDailyTasks) * 100 : 0;
              return (
                <div key={d.date} className="flex-1 group relative flex flex-col items-center justify-end">
                  <div className="absolute -top-6 hidden group-hover:flex flex-col items-center z-10">
                    <div className="bg-popover border border-border rounded-md px-2 py-1 text-[10px] whitespace-nowrap shadow-lg">
                      <p className="font-semibold">{d.date}</p>
                      <p>{d.tasks} tasks</p>
                      <p>{formatTokens(d.tokens)} tokens</p>
                    </div>
                  </div>
                  <div
                    className="w-full rounded-t bg-gradient-to-t from-[#6c63ff] to-[#a78bfa] min-h-[2px] transition-all duration-300 hover:opacity-80"
                    style={{ height: `${Math.max(height, 2)}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{daily[0]?.date}</span>
            <span>{daily[daily.length - 1]?.date}</span>
          </div>
        </div>
      )}

      {/* Repository Breakdown */}
      {repoStats && repoStats.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-accent-light" />
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Repositories
            </h2>
            <span className="flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-accent-glow text-[11px] font-semibold text-accent-light tabular-nums">
              {repoStats.length}
            </span>
          </div>
          <Separator />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {repoStats.map((repo: any) => {
              const percent = repo.total > 0 ? Math.round((repo.completed / repo.total) * 100) : 0;
              return (
                <div key={repo.repo} className="rounded-lg border border-border p-4 space-y-3 hover:border-accent-light/20 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold truncate">{repo.repo}</span>
                    <span className="text-[11px] text-emerald-400 font-medium tabular-nums">{percent}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#6c63ff] to-[#a78bfa] transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold tabular-nums">{repo.total}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold tabular-nums text-emerald-400">{repo.completed}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Done</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold tabular-nums text-amber-400">{formatMs(repo.avgExecutionTimeMs)}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function FeaturesTab({ features, featureData, selectedFeature, setSelectedFeature, featureStats }: any) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-accent-light" />
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Feature Progress
        </h2>
        <span className="flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-accent-glow text-[11px] font-semibold text-accent-light tabular-nums">
          {features.length}
        </span>
      </div>
      <Separator />

      {!featureData ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : features.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No features found</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ScrollArea className="max-h-[500px]">
            <div className="space-y-2">
              {features.map((f: any) => {
                const isSelected = selectedFeature === f.featureId;
                return (
                  <button
                    key={f.featureId}
                    onClick={() => setSelectedFeature(isSelected ? null : f.featureId)}
                    className={`w-full text-left rounded-lg p-3 transition-all duration-150 ${
                      isSelected
                        ? "bg-accent-glow border border-accent-light/30"
                        : "hover:bg-surface-hover border border-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold truncate">{f.featureName}</span>
                      <span className="text-[11px] text-muted-foreground tabular-nums shrink-0 ml-2">
                        {f.completed}/{f.total}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                          style={{ width: `${f.percentComplete}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-medium text-emerald-400 tabular-nums w-10 text-right">
                        {f.percentComplete}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>

          {/* Feature detail panel */}
          {selectedFeature && featureStats ? (
            <div className="rounded-lg border border-border p-4 space-y-3">
              <h3 className="text-sm font-semibold">{featureStats.featureName}</h3>
              <div className="grid grid-cols-2 gap-3">
                <MiniStat label="Total" value={featureStats.total} />
                <MiniStat label="Completed" value={featureStats.completed} />
                <MiniStat label="Avg Time" value={formatMs(featureStats.avgExecutionTimeMs)} />
                <MiniStat label="Total Time" value={formatMs(featureStats.totalExecutionTimeMs)} />
              </div>
              {featureStats.byStatus && Object.keys(featureStats.byStatus).length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">By status</span>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(featureStats.byStatus).map(([status, count]) => (
                      <Badge key={status} variant="secondary" className="text-[10px]">
                        {status.replace("_", " ")}: {count as number}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {featureStats.byRepo && Object.keys(featureStats.byRepo).length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">By repo</span>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(featureStats.byRepo).map(([repo, count]) => (
                      <Badge key={repo} variant="secondary" className="text-[10px]">
                        {repo}: {count as number}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-border p-8 flex items-center justify-center text-muted-foreground text-sm">
              Select a feature to see details
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AgentsTab({ topAgents, modelDist }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Top Agents */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-accent-light" />
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Top Agents
          </h2>
        </div>
        <Separator />
        {topAgents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No data</p>
        ) : (
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-2">
              {topAgents.map((agent: any, i: number) => (
                <div
                  key={agent.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3 hover:border-accent-light/20 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-muted-foreground w-4">#{i + 1}</span>
                    <span className="text-sm font-medium truncate">{agent.id}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span>{agent.count} tasks</span>
                    <Badge className="text-[10px] bg-purple-500/15 text-purple-400">
                      {formatTokens(agent.total)} tok
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Model Distribution */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-accent-light" />
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Model Distribution
          </h2>
        </div>
        <Separator />
        {modelDist.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No data</p>
        ) : (
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-2">
              {modelDist.map((m: any) => {
                const totalTokens = modelDist.reduce((s: number, x: any) => s + x.total, 0);
                const percent = totalTokens > 0 ? Math.round((m.total / totalTokens) * 100) : 0;
                return (
                  <div key={m.id} className="rounded-lg border border-border p-3 space-y-2 hover:border-accent-light/20 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">{m.id || "unknown"}</span>
                      <span className="text-[11px] text-muted-foreground">{m.count} tasks</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#6c63ff] to-[#a78bfa] transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-medium text-accent-light tabular-nums w-8 text-right">{percent}%</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{formatTokens(m.total)} tokens</p>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
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

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-surface p-2.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-bold tabular-nums">{value}</p>
    </div>
  );
}
