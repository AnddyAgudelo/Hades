import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const register = mutation({
  args: {
    agentId: v.string(),
    name: v.string(),
    role: v.union(
      v.literal("orchestrator"),
      v.literal("worker"),
      v.literal("reviewer")
    ),
    specialization: v.optional(v.string()),
    repos: v.optional(v.array(v.string())),
    model: v.optional(v.string()),
    workspaceId: v.optional(v.id("workspaces")),
    tokenBudget: v.optional(v.number()),
    tokenThreshold: v.optional(v.number()),
    registeredBy: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("agents")
      .withIndex("by_agentId", (q) => q.eq("agentId", args.agentId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        role: args.role,
        specialization: args.specialization,
        repos: args.repos,
        model: args.model,
        status: "idle",
        lastHeartbeat: Date.now(),
        workspaceId: args.workspaceId,
        tokenBudget: args.tokenBudget,
        tokenThreshold: args.tokenThreshold,
        registeredBy: args.registeredBy,
      });
      return { id: existing._id, agentId: args.agentId, updated: true };
    }

    const id = await ctx.db.insert("agents", {
      agentId: args.agentId,
      name: args.name,
      role: args.role,
      specialization: args.specialization,
      repos: args.repos,
      model: args.model,
      status: "idle",
      lastHeartbeat: Date.now(),
      tasksCompleted: 0,
      totalTokensUsed: 0,
      totalExecutionTimeMs: 0,
      avgTaskTimeMs: 0,
      workspaceId: args.workspaceId,
      tokenBudget: args.tokenBudget,
      tokenThreshold: args.tokenThreshold,
      registeredBy: args.registeredBy,
    });

    return { id, agentId: args.agentId, updated: false };
  },
});

export const list = query({
  args: {
    workspaceId: v.optional(v.id("workspaces")),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (args.workspaceId) {
      return await ctx.db
        .query("agents")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId!))
        .collect();
    }
    return await ctx.db.query("agents").collect();
  },
});

export const get = query({
  args: { agentId: v.string() },
  returns: v.any(),
  handler: async (ctx, { agentId }) => {
    return await ctx.db
      .query("agents")
      .withIndex("by_agentId", (q) => q.eq("agentId", agentId))
      .unique();
  },
});

export const getByAgentIdAndWorkspace = query({
  args: {
    agentId: v.string(),
    workspaceId: v.id("workspaces"),
  },
  returns: v.any(),
  handler: async (ctx, { agentId, workspaceId }) => {
    return await ctx.db
      .query("agents")
      .withIndex("by_workspace_agentId", (q) =>
        q.eq("workspaceId", workspaceId).eq("agentId", agentId)
      )
      .unique();
  },
});

export const heartbeat = mutation({
  args: { agentId: v.string() },
  returns: v.any(),
  handler: async (ctx, { agentId }) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_agentId", (q) => q.eq("agentId", agentId))
      .unique();
    if (!agent) return { ok: false, error: "Agent not found" };
    await ctx.db.patch(agent._id, { lastHeartbeat: Date.now() });
    return { ok: true };
  },
});

export const updateStatus = mutation({
  args: {
    agentId: v.string(),
    status: v.union(
      v.literal("idle"),
      v.literal("busy"),
      v.literal("offline")
    ),
  },
  returns: v.any(),
  handler: async (ctx, { agentId, status }) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_agentId", (q) => q.eq("agentId", agentId))
      .unique();
    if (!agent) return { ok: false, error: "Agent not found" };

    const patch: Record<string, unknown> = { status };
    if (status === "idle" || status === "offline") {
      patch.currentTaskId = undefined;
    }

    await ctx.db.patch(agent._id, patch);
    return { ok: true };
  },
});

export const detectDeadAgents = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const threshold = Date.now() - 5 * 60 * 1000;
    const busy = await ctx.db
      .query("agents")
      .withIndex("by_status", (q) => q.eq("status", "busy"))
      .collect();

    for (const agent of busy) {
      if (agent.lastHeartbeat && agent.lastHeartbeat < threshold) {
        if (agent.currentTaskId) {
          const task = await ctx.db.get(agent.currentTaskId);
          if (task && task.status === "in_progress") {
            await ctx.db.patch(agent.currentTaskId, {
              status: "queued",
              assignedAgent: undefined,
              claimedAt: undefined,
              lastError: `Agent ${agent.name} died (no heartbeat)`,
            });
            await ctx.db.insert("activity", {
              taskId: agent.currentTaskId,
              action: "task_released",
              details: `Agent ${agent.name} timed out — task returned to queue`,
            });
          }
        }
        await ctx.db.patch(agent._id, {
          status: "offline",
          currentTaskId: undefined,
        });
      }
    }
  },
});
