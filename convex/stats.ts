import { query } from "./_generated/server";
import { v } from "convex/values";

export const featureStats = query({
  args: {
    featureId: v.string(),
    workspaceId: v.optional(v.id("workspaces")),
  },
  returns: v.any(),
  handler: async (ctx, { featureId }) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_feature", (q) => q.eq("featureId", featureId))
      .collect();

    if (tasks.length === 0) return null;

    const byStatus = tasks.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byRepo = tasks.reduce((acc, t) => {
      const repo = t.repo || "unknown";
      acc[repo] = (acc[repo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const completed = tasks.filter((t) => t.status === "done");
    const totalTimeMs = completed.reduce((sum, t) => sum + (t.executionTimeMs || 0), 0);
    const avgTimeMs = completed.length > 0 ? totalTimeMs / completed.length : 0;

    return {
      featureId,
      featureName: tasks[0]?.featureName || featureId,
      total: tasks.length,
      byStatus,
      byRepo,
      completed: completed.length,
      percentComplete: tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0,
      totalExecutionTimeMs: totalTimeMs,
      avgExecutionTimeMs: Math.round(avgTimeMs),
      tasks: tasks.sort((a, b) => (a.taskNumber || 0) - (b.taskNumber || 0)),
    };
  },
});

export const repoStats = query({
  args: {
    repo: v.optional(v.string()),
    workspaceId: v.optional(v.id("workspaces")),
  },
  returns: v.any(),
  handler: async (ctx, { repo, workspaceId }) => {
    let allTasks;
    if (workspaceId) {
      allTasks = await ctx.db
        .query("tasks")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
        .collect();
    } else {
      allTasks = await ctx.db.query("tasks").collect();
    }

    const repoMap: Record<string, typeof allTasks> = {};
    for (const task of allTasks) {
      const r = task.repo || "unassigned";
      if (repo && r !== repo) continue;
      if (!repoMap[r]) repoMap[r] = [];
      repoMap[r].push(task);
    }

    return Object.entries(repoMap).map(([repoName, tasks]) => {
      const completed = tasks.filter((t) => t.status === "done");
      const totalTimeMs = completed.reduce((sum, t) => sum + (t.executionTimeMs || 0), 0);
      return {
        repo: repoName,
        total: tasks.length,
        queued: tasks.filter((t) => t.status === "queued").length,
        inProgress: tasks.filter((t) => t.status === "in_progress").length,
        blocked: tasks.filter((t) => t.status === "blocked").length,
        completed: completed.length,
        totalExecutionTimeMs: totalTimeMs,
        avgExecutionTimeMs: completed.length > 0 ? Math.round(totalTimeMs / completed.length) : 0,
      };
    });
  },
});

export const dashboard = query({
  args: {
    workspaceId: v.optional(v.id("workspaces")),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    let allTasks;
    if (args.workspaceId) {
      allTasks = await ctx.db
        .query("tasks")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId!))
        .collect();
    } else {
      allTasks = await ctx.db.query("tasks").collect();
    }

    const todayStart = new Date().setHours(0, 0, 0, 0);

    const completedToday = allTasks.filter(
      (t) => t.status === "done" && t.completedAt && t.completedAt >= todayStart
    );
    const queued = allTasks.filter((t) => t.status === "queued");
    const inProgress = allTasks.filter((t) => t.status === "in_progress");
    const blocked = allTasks.filter((t) => t.status === "blocked");
    const done = allTasks.filter((t) => t.status === "done");

    const avgMinutes =
      done.length > 0
        ? Math.round(done.reduce((sum, t) => sum + (t.actualMinutes ?? 0), 0) / done.length)
        : 0;

    let streak = 0;
    const dayMs = 86400000;
    let checkDate = todayStart;
    while (true) {
      const dayEnd = checkDate + dayMs;
      const completedThatDay = done.some(
        (t) => t.completedAt && t.completedAt >= checkDate && t.completedAt < dayEnd
      );
      if (!completedThatDay && checkDate < todayStart) break;
      if (completedThatDay) streak++;
      checkDate -= dayMs;
      if (streak > 365) break;
    }

    return {
      completedToday: completedToday.length,
      totalToday: completedToday.length + queued.length + inProgress.length + blocked.length,
      queued: queued.length,
      inProgress: inProgress.length,
      blocked: blocked.length,
      totalDone: done.length,
      avgMinutes,
      streak,
    };
  },
});
