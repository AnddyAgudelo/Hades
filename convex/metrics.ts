import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

function sum(records: any[], field: string): number {
  return records.reduce((s, r) => s + (r[field] || 0), 0);
}

function avg(records: any[], field: string): number {
  return records.length > 0 ? sum(records, field) / records.length : 0;
}

function minVal(records: any[], field: string): number {
  const vals = records.map((r) => r[field]).filter((v) => v != null && v !== undefined);
  return vals.length > 0 ? Math.min(...vals) : 0;
}

function maxVal(records: any[], field: string): number {
  const vals = records.map((r) => r[field]).filter((v) => v != null && v !== undefined);
  return vals.length > 0 ? Math.max(...vals) : 0;
}

function groupBy(records: any[], field: string): Record<string, any[]> {
  const result: Record<string, any[]> = {};
  for (const r of records) {
    const key = r[field] || "unknown";
    if (!result[key]) result[key] = [];
    result[key].push(r);
  }
  return result;
}

function groupByDay(records: any[]): { date: string; tasks: number; tokens: number; cost: number }[] {
  const byDay: Record<string, { tasks: number; tokens: number; cost: number }> = {};
  for (const r of records) {
    const date = new Date(r.timestamp).toISOString().split("T")[0];
    if (!byDay[date]) byDay[date] = { tasks: 0, tokens: 0, cost: 0 };
    byDay[date].tasks++;
    byDay[date].tokens += r.tokensTotal || 0;
    byDay[date].cost += r.costTotal || 0;
  }
  return Object.entries(byDay)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function getTopN(records: any[], groupField: string, sumField: string, n: number) {
  const filtered = records.filter((r) => r[groupField] != null);
  const groups = groupBy(filtered, groupField);
  return Object.entries(groups)
    .map(([key, recs]) => ({
      id: key,
      count: recs.length,
      total: sum(recs, sumField),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, n);
}

function groupSum(records: any[], groupField: string, sumField: string) {
  const filtered = records.filter((r) => r[groupField] != null);
  const groups = groupBy(filtered, groupField);
  return Object.entries(groups).map(([key, recs]) => ({
    id: key,
    total: sum(recs, sumField),
    count: recs.length,
  }));
}

export const record = mutation({
  args: {
    type: v.union(
      v.literal("task_execution"),
      v.literal("agent_session"),
      v.literal("feature_summary")
    ),
    taskId: v.optional(v.id("tasks")),
    agentId: v.optional(v.string()),
    featureId: v.optional(v.string()),
    tokensInput: v.optional(v.number()),
    tokensOutput: v.optional(v.number()),
    tokensCacheRead: v.optional(v.number()),
    tokensCacheWrite: v.optional(v.number()),
    tokensTotal: v.optional(v.number()),
    costInput: v.optional(v.number()),
    costOutput: v.optional(v.number()),
    costTotal: v.optional(v.number()),
    executionTimeMs: v.optional(v.number()),
    waitTimeMs: v.optional(v.number()),
    filesCreated: v.optional(v.number()),
    filesModified: v.optional(v.number()),
    linesAdded: v.optional(v.number()),
    linesRemoved: v.optional(v.number()),
    model: v.optional(v.string()),
    retryCount: v.optional(v.number()),
    timestamp: v.number(),
    workspaceId: v.optional(v.id("workspaces")),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("metrics", args);
    return { id };
  },
});

export const agentStats = query({
  args: { agentId: v.string(), daysBack: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, { agentId, daysBack }) => {
    const days = daysBack ?? 7;
    const since = Date.now() - days * 86400000;
    const records = await ctx.db
      .query("metrics")
      .withIndex("by_agent", (q) => q.eq("agentId", agentId).gte("timestamp", since))
      .collect();

    return {
      agentId,
      period: `${days}d`,
      tasksExecuted: records.length,
      tokens: {
        total: sum(records, "tokensTotal"),
        input: sum(records, "tokensInput"),
        output: sum(records, "tokensOutput"),
        cacheRead: sum(records, "tokensCacheRead"),
        avgPerTask: avg(records, "tokensTotal"),
      },
      cost: {
        total: sum(records, "costTotal"),
        avgPerTask: avg(records, "costTotal"),
      },
      time: {
        totalMs: sum(records, "executionTimeMs"),
        avgPerTaskMs: avg(records, "executionTimeMs"),
        fastest: minVal(records, "executionTimeMs"),
        slowest: maxVal(records, "executionTimeMs"),
      },
      code: {
        filesCreated: sum(records, "filesCreated"),
        filesModified: sum(records, "filesModified"),
        linesAdded: sum(records, "linesAdded"),
        linesRemoved: sum(records, "linesRemoved"),
      },
    };
  },
});

export const featureMetrics = query({
  args: { featureId: v.string() },
  returns: v.any(),
  handler: async (ctx, { featureId }) => {
    const records = await ctx.db
      .query("metrics")
      .withIndex("by_feature", (q) => q.eq("featureId", featureId))
      .collect();

    const byAgent = groupBy(records, "agentId");
    const agentBreakdown = Object.entries(byAgent).map(([agent, recs]) => ({
      agentId: agent,
      tasks: recs.length,
      tokensTotal: sum(recs, "tokensTotal"),
      costTotal: sum(recs, "costTotal"),
      timeMs: sum(recs, "executionTimeMs"),
    }));

    const byModel = groupBy(records, "model");
    const modelBreakdown = Object.entries(byModel).map(([model, recs]) => ({
      model,
      tasks: recs.length,
      tokensTotal: sum(recs, "tokensTotal"),
      costTotal: sum(recs, "costTotal"),
    }));

    return {
      featureId,
      totals: {
        tasks: records.length,
        tokensTotal: sum(records, "tokensTotal"),
        costTotal: sum(records, "costTotal"),
        executionTimeMs: sum(records, "executionTimeMs"),
        linesAdded: sum(records, "linesAdded"),
        filesCreated: sum(records, "filesCreated"),
      },
      averages: {
        tokensPerTask: avg(records, "tokensTotal"),
        costPerTask: avg(records, "costTotal"),
        timePerTaskMs: avg(records, "executionTimeMs"),
      },
      byAgent: agentBreakdown,
      byModel: modelBreakdown,
    };
  },
});

export const globalDashboard = query({
  args: {
    daysBack: v.optional(v.number()),
    workspaceId: v.optional(v.id("workspaces")),
  },
  returns: v.any(),
  handler: async (ctx, { daysBack, workspaceId }) => {
    const days = daysBack ?? 30;
    const since = Date.now() - days * 86400000;
    let records;
    if (workspaceId) {
      const all = await ctx.db
        .query("metrics")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
        .collect();
      records = all.filter((r) => r.type === "task_execution" && r.timestamp >= since);
    } else {
      records = await ctx.db
        .query("metrics")
        .withIndex("by_type", (q) => q.eq("type", "task_execution").gte("timestamp", since))
        .collect();
    }

    const daily = groupByDay(records);

    return {
      period: `${days}d`,
      totals: {
        tasks: records.length,
        tokens: sum(records, "tokensTotal"),
        cost: sum(records, "costTotal"),
        timeMs: sum(records, "executionTimeMs"),
        lines: sum(records, "linesAdded"),
      },
      daily,
      topAgents: getTopN(records, "agentId", "tokensTotal", 5),
      topFeatures: getTopN(records, "featureId", "tokensTotal", 5),
      modelDistribution: groupSum(records, "model", "tokensTotal"),
    };
  },
});
