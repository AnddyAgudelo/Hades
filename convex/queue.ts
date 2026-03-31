import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3, backlog: 4 };

function sortByPriority(tasks: any[]) {
  return tasks.sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority as keyof typeof PRIORITY_ORDER] ?? 2;
    const pb = PRIORITY_ORDER[b.priority as keyof typeof PRIORITY_ORDER] ?? 2;
    if (pa !== pb) return pa - pb;
    return a._creationTime - b._creationTime;
  });
}

export const current = query({
  args: {
    workspaceId: v.optional(v.id("workspaces")),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    let tasks;
    if (args.workspaceId) {
      tasks = await ctx.db
        .query("tasks")
        .withIndex("by_workspace_status", (q) =>
          q.eq("workspaceId", args.workspaceId!).eq("status", "in_progress")
        )
        .collect();
    } else {
      tasks = await ctx.db
        .query("tasks")
        .withIndex("by_status", (q) => q.eq("status", "in_progress"))
        .collect();
    }
    return tasks[0] ?? null;
  },
});

export const next = query({
  args: {
    workspaceId: v.optional(v.id("workspaces")),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    let queued;
    if (args.workspaceId) {
      queued = await ctx.db
        .query("tasks")
        .withIndex("by_workspace_status", (q) =>
          q.eq("workspaceId", args.workspaceId!).eq("status", "queued")
        )
        .collect();
    } else {
      queued = await ctx.db
        .query("tasks")
        .withIndex("by_status", (q) => q.eq("status", "queued"))
        .collect();
    }
    if (queued.length === 0) return null;
    sortByPriority(queued);
    return queued[0];
  },
});

export const start = mutation({
  args: {
    taskId: v.optional(v.id("tasks")),
    workspaceId: v.optional(v.id("workspaces")),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    let inProgress;
    if (args.workspaceId) {
      inProgress = await ctx.db
        .query("tasks")
        .withIndex("by_workspace_status", (q) =>
          q.eq("workspaceId", args.workspaceId!).eq("status", "in_progress")
        )
        .collect();
    } else {
      inProgress = await ctx.db
        .query("tasks")
        .withIndex("by_status", (q) => q.eq("status", "in_progress"))
        .collect();
    }
    if (inProgress.length > 0) {
      throw new Error("There is already a task in progress. Complete it first.");
    }

    let task;
    if (args.taskId) {
      task = await ctx.db.get(args.taskId);
      if (task && task.dependsOn && task.dependsOn.length > 0) {
        const deps = await Promise.all(
          task.dependsOn.map((id: any) => ctx.db.get(id))
        );
        const allDone = deps.every((d: any) => d?.status === "done");
        if (!allDone) {
          throw new Error("Task has unresolved dependencies.");
        }
      }
    } else {
      let queued;
      if (args.workspaceId) {
        queued = await ctx.db
          .query("tasks")
          .withIndex("by_workspace_status", (q) =>
            q.eq("workspaceId", args.workspaceId!).eq("status", "queued")
          )
          .collect();
      } else {
        queued = await ctx.db
          .query("tasks")
          .withIndex("by_status", (q) => q.eq("status", "queued"))
          .collect();
      }
      sortByPriority(queued);

      task = null;
      for (const candidate of queued) {
        if (candidate.dependsOn && candidate.dependsOn.length > 0) {
          const deps = await Promise.all(
            candidate.dependsOn.map((id: any) => ctx.db.get(id))
          );
          if (!deps.every((d: any) => d?.status === "done")) continue;
        }
        task = candidate;
        break;
      }
    }

    if (!task) throw new Error("No tasks in queue.");

    await ctx.db.patch(task._id, {
      status: "in_progress",
      startedAt: Date.now(),
    });

    await ctx.db.insert("activity", {
      taskId: task._id,
      action: "task_started",
      details: `Started "${task.title}"`,
    });

    return task;
  },
});

export const getNextParallel = query({
  args: {
    limit: v.optional(v.number()),
    workspaceId: v.optional(v.id("workspaces")),
  },
  returns: v.any(),
  handler: async (ctx, { limit, workspaceId }) => {
    const max = limit ?? 2;
    let queued;
    if (workspaceId) {
      queued = await ctx.db
        .query("tasks")
        .withIndex("by_workspace_status", (q) =>
          q.eq("workspaceId", workspaceId).eq("status", "queued")
        )
        .collect();
    } else {
      queued = await ctx.db
        .query("tasks")
        .withIndex("by_status", (q) => q.eq("status", "queued"))
        .collect();
    }

    sortByPriority(queued);

    const available = [];
    const usedRepos = new Set();

    for (const task of queued) {
      if (task.dependsOn && task.dependsOn.length > 0) {
        const deps = await Promise.all(
          task.dependsOn.map((id: any) => ctx.db.get(id))
        );
        if (!deps.every((d: any) => d?.status === "done")) continue;
      }
      if (task.repo && usedRepos.has(task.repo)) continue;

      available.push(task);
      if (task.repo) usedRepos.add(task.repo);
      if (available.length >= max) break;
    }

    return available;
  },
});

export const claim = mutation({
  args: {
    agentId: v.string(),
    workspaceId: v.optional(v.id("workspaces")),
  },
  returns: v.any(),
  handler: async (ctx, { agentId, workspaceId }) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_agentId", (q) => q.eq("agentId", agentId))
      .unique();
    if (!agent) throw new Error("Agent not registered");

    // Token budget validation
    if (agent.tokenBudget && agent.tokenThreshold) {
      const remaining = agent.tokenBudget - (agent.tokensUsed || 0);
      if (remaining < agent.tokenThreshold) {
        return {
          claimed: false,
          reason: "insufficient_tokens",
          tokensRemaining: remaining,
          threshold: agent.tokenThreshold,
        };
      }
    }

    // Get repos currently being worked on
    let inProgressTasks;
    if (workspaceId) {
      inProgressTasks = await ctx.db
        .query("tasks")
        .withIndex("by_workspace_status", (q) =>
          q.eq("workspaceId", workspaceId).eq("status", "in_progress")
        )
        .collect();
    } else {
      inProgressTasks = await ctx.db
        .query("tasks")
        .withIndex("by_status", (q) => q.eq("status", "in_progress"))
        .collect();
    }
    const busyRepos = new Set(inProgressTasks.map((t) => t.repo).filter(Boolean));

    let queued;
    if (workspaceId) {
      queued = await ctx.db
        .query("tasks")
        .withIndex("by_workspace_status", (q) =>
          q.eq("workspaceId", workspaceId).eq("status", "queued")
        )
        .collect();
    } else {
      queued = await ctx.db
        .query("tasks")
        .withIndex("by_status", (q) => q.eq("status", "queued"))
        .collect();
    }
    sortByPriority(queued);

    let bestTask = null;
    for (const task of queued) {
      // Check repo not locked
      if (task.repo && busyRepos.has(task.repo)) continue;

      // Check agent can work this repo
      if (agent.repos && agent.repos.length > 0 && task.repo && !agent.repos.includes(task.repo)) continue;

      // Check dependencies resolved
      if (task.dependsOn && task.dependsOn.length > 0) {
        const deps = await Promise.all(
          task.dependsOn.map((id: any) => ctx.db.get(id))
        );
        if (!deps.every((d: any) => d?.status === "done")) continue;
      }

      bestTask = task;
      break;
    }

    if (!bestTask) return { claimed: false, reason: "No available tasks" };

    // Atomic claim
    await ctx.db.patch(bestTask._id, {
      status: "in_progress",
      assignedAgent: agentId,
      claimedAt: Date.now(),
      startedAt: Date.now(),
    });

    await ctx.db.patch(agent._id, {
      status: "busy",
      currentTaskId: bestTask._id,
      lastHeartbeat: Date.now(),
    });

    await ctx.db.insert("activity", {
      taskId: bestTask._id,
      action: "task_claimed",
      details: `Agent ${agent.name} claimed task`,
    });

    return {
      claimed: true,
      task: bestTask,
      agentPrompt: bestTask.agentPrompt,
      agentConfig: bestTask.agentConfig,
    };
  },
});

export const complete = mutation({
  args: {
    taskId: v.id("tasks"),
    result: v.optional(v.string()),
    executionLog: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    const now = Date.now();
    const startedAt = task.startedAt ?? task._creationTime;
    const executionTimeMs = now - startedAt;
    const actualMinutes = Math.round(executionTimeMs / 60000);

    await ctx.db.patch(args.taskId, {
      status: "done",
      completedAt: now,
      actualMinutes,
      executionTimeMs,
      result: args.result,
      executionLog: args.executionLog ?? task.executionLog,
    });

    await ctx.db.insert("activity", {
      taskId: args.taskId,
      action: "task_completed",
      details: `"${task.title}" completed in ${actualMinutes}min`,
    });

    // Update agent metrics if assigned
    if (task.assignedAgent) {
      const agent = await ctx.db
        .query("agents")
        .withIndex("by_agentId", (q) => q.eq("agentId", task.assignedAgent!))
        .unique();

      if (agent) {
        const completed = (agent.tasksCompleted || 0) + 1;
        const totalTime = (agent.totalExecutionTimeMs || 0) + executionTimeMs;
        const tokensUsed = (agent.tokensUsed || 0) + (task.tokensUsed || 0);
        await ctx.db.patch(agent._id, {
          status: "idle",
          currentTaskId: undefined,
          tasksCompleted: completed,
          totalExecutionTimeMs: totalTime,
          avgTaskTimeMs: Math.round(totalTime / completed),
          tokensUsed,
        });
      }
    }

    // Auto-record task execution metric
    await ctx.db.insert("metrics", {
      type: "task_execution",
      taskId: args.taskId,
      agentId: task.assignedAgent,
      featureId: task.featureId,
      executionTimeMs,
      timestamp: now,
      workspaceId: task.workspaceId,
    });

    // Auto-unblock tasks whose dependencies are now all done
    const blockedTasks = await ctx.db
      .query("tasks")
      .withIndex("by_status", (q) => q.eq("status", "blocked"))
      .collect();

    const queuedTasks = await ctx.db
      .query("tasks")
      .withIndex("by_status", (q) => q.eq("status", "queued"))
      .collect();

    const candidates = [...blockedTasks, ...queuedTasks.filter((t) => t.dependsOn && t.dependsOn.length > 0)];

    for (const candidate of candidates) {
      if (!candidate.dependsOn || candidate.dependsOn.length === 0) continue;
      const deps = await Promise.all(
        candidate.dependsOn.map((id: any) => ctx.db.get(id))
      );
      const allDone = deps.every((d: any) => d?.status === "done");
      if (allDone && candidate.status === "blocked") {
        await ctx.db.patch(candidate._id, {
          status: "queued",
          blockReason: undefined,
        });
        await ctx.db.insert("activity", {
          taskId: candidate._id,
          action: "task_unblocked",
          details: `"${candidate.title}" auto-unblocked — all dependencies done`,
        });
      }
    }

    // Auto-advance: if feature has autoAdvance enabled
    if (task.featureId) {
      const feature = await ctx.db
        .query("features")
        .withIndex("by_featureId", (q) => q.eq("featureId", task.featureId!))
        .unique();

      if (feature?.autoAdvance) {
        const inProgress = await ctx.db
          .query("tasks")
          .withIndex("by_feature", (q) => q.eq("featureId", task.featureId!))
          .collect();
        const activeCount = inProgress.filter((t) => t.status === "in_progress").length;
        const maxParallel = feature.maxParallel || 2;

        if (activeCount < maxParallel) {
          const featureQueued = await ctx.db
            .query("tasks")
            .withIndex("by_feature", (q) => q.eq("featureId", task.featureId!))
            .collect();

          const toStart = featureQueued.filter((t) => t.status === "queued");
          sortByPriority(toStart);

          let started = 0;
          for (const next of toStart) {
            if (activeCount + started >= maxParallel) break;
            // Check deps
            if (next.dependsOn && next.dependsOn.length > 0) {
              const deps = await Promise.all(
                next.dependsOn.map((id: any) => ctx.db.get(id))
              );
              if (!deps.every((d: any) => d?.status === "done")) continue;
            }
            await ctx.db.patch(next._id, {
              status: "in_progress",
              startedAt: Date.now(),
            });
            await ctx.db.insert("activity", {
              taskId: next._id,
              action: "task_auto_started",
              details: `Auto-advanced "${next.title}" (feature autoAdvance)`,
            });
            started++;
          }
        }
      }

      // Check if all tasks in feature are done → fire feature_completed webhook
      const remaining = await ctx.db
        .query("tasks")
        .withIndex("by_feature", (q) => q.eq("featureId", task.featureId!))
        .collect();
      const allFeatureDone = remaining.every((t) => t.status === "done" || t._id === args.taskId);

      if (allFeatureDone) {
        await ctx.scheduler.runAfter(0, internal.webhooks.fire, {
          event: "feature_completed",
          featureId: task.featureId,
        });
      }
    }

    // Fire task_completed webhook (registered webhooks)
    await ctx.scheduler.runAfter(0, internal.webhooks.fire, {
      event: "task_completed",
      taskId: args.taskId,
      featureId: task.featureId,
    });

  },
});

export const block = mutation({
  args: {
    taskId: v.id("tasks"),
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    await ctx.db.patch(args.taskId, {
      status: "blocked",
      blockReason: args.reason,
    });

    // Release agent if assigned
    if (task.assignedAgent) {
      const agent = await ctx.db
        .query("agents")
        .withIndex("by_agentId", (q) => q.eq("agentId", task.assignedAgent!))
        .unique();
      if (agent) {
        await ctx.db.patch(agent._id, {
          status: "idle",
          currentTaskId: undefined,
        });
      }
    }

    await ctx.db.insert("activity", {
      taskId: args.taskId,
      action: "task_blocked",
      details: `"${task.title}" blocked: ${args.reason}`,
    });

    await ctx.scheduler.runAfter(0, internal.webhooks.fire, {
      event: "task_blocked",
      taskId: args.taskId,
      featureId: task.featureId,
    });
  },
});

export const skip = mutation({
  args: { taskId: v.id("tasks") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    await ctx.db.patch(args.taskId, {
      status: "queued",
      startedAt: undefined,
      assignedAgent: undefined,
      claimedAt: undefined,
    });

    // Release agent if assigned
    if (task.assignedAgent) {
      const agent = await ctx.db
        .query("agents")
        .withIndex("by_agentId", (q) => q.eq("agentId", task.assignedAgent!))
        .unique();
      if (agent) {
        await ctx.db.patch(agent._id, {
          status: "idle",
          currentTaskId: undefined,
        });
      }
    }

    await ctx.db.insert("activity", {
      taskId: args.taskId,
      action: "task_skipped",
      details: `"${task.title}" returned to queue`,
    });
  },
});

export const unblock = mutation({
  args: { taskId: v.id("tasks") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.taskId, {
      status: "queued",
      blockReason: undefined,
    });
  },
});

export const appendLog = mutation({
  args: {
    taskId: v.id("tasks"),
    entry: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");
    const timestamp = new Date().toISOString().substring(11, 19) + "Z";
    const newLog = (task.executionLog ?? "") + `\n[${timestamp}] ${args.entry}`;
    await ctx.db.patch(args.taskId, { executionLog: newLog.trim() });
  },
});

export const unblocked = query({
  args: {
    workspaceId: v.optional(v.id("workspaces")),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    let queued;
    if (args.workspaceId) {
      queued = await ctx.db
        .query("tasks")
        .withIndex("by_workspace_status", (q) =>
          q.eq("workspaceId", args.workspaceId!).eq("status", "queued")
        )
        .collect();
    } else {
      queued = await ctx.db
        .query("tasks")
        .withIndex("by_status", (q) => q.eq("status", "queued"))
        .collect();
    }

    const result = [];
    for (const task of queued) {
      if (!task.dependsOn || task.dependsOn.length === 0) {
        result.push(task);
        continue;
      }
      const deps = await Promise.all(
        task.dependsOn.map((id: any) => ctx.db.get(id))
      );
      if (deps.every((d: any) => d?.status === "done")) {
        result.push(task);
      }
    }

    sortByPriority(result);
    return result;
  },
});

export const retry = mutation({
  args: {
    taskId: v.id("tasks"),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    const currentRetries = task.retryCount ?? 0;
    const maxRetries = task.maxRetries ?? 3;

    if (currentRetries >= maxRetries) {
      throw new Error(`Max retries (${maxRetries}) reached for task "${task.title}"`);
    }

    // Release agent if assigned
    if (task.assignedAgent) {
      const agent = await ctx.db
        .query("agents")
        .withIndex("by_agentId", (q) => q.eq("agentId", task.assignedAgent!))
        .unique();
      if (agent) {
        await ctx.db.patch(agent._id, {
          status: "idle",
          currentTaskId: undefined,
        });
      }
    }

    await ctx.db.patch(args.taskId, {
      status: "queued",
      retryCount: currentRetries + 1,
      lastError: args.error ?? task.lastError,
      startedAt: undefined,
      result: undefined,
      assignedAgent: undefined,
      claimedAt: undefined,
    });

    await ctx.db.insert("activity", {
      taskId: args.taskId,
      action: "task_retried",
      details: `"${task.title}" retried (attempt ${currentRetries + 1}/${maxRetries})${args.error ? ` — error: ${args.error}` : ""}`,
    });
  },
});

export const checkAndNotify = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const inProgress = await ctx.db
      .query("tasks")
      .withIndex("by_status", (q) => q.eq("status", "in_progress"))
      .collect();

    if (inProgress.length === 0) {
      const queued = await ctx.db
        .query("tasks")
        .withIndex("by_status", (q) => q.eq("status", "queued"))
        .collect();

      if (queued.length > 0) {
        await ctx.db.insert("activity", {
          action: "queue_idle",
          details: `No active task. ${queued.length} task(s) waiting in queue.`,
        });
      }
    }
  },
});
