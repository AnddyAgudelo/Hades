import { query, mutation, internalAction, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

export const register = mutation({
  args: {
    url: v.string(),
    events: v.array(v.string()),
    featureId: v.optional(v.string()),
    workspaceId: v.optional(v.id("workspaces")),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("webhooks", {
      url: args.url,
      events: args.events,
      featureId: args.featureId,
      workspaceId: args.workspaceId,
      isActive: true,
    });
    return { id };
  },
});

export const list = query({
  args: {
    event: v.optional(v.string()),
    featureId: v.optional(v.string()),
    workspaceId: v.optional(v.id("workspaces")),
  },
  returns: v.any(),
  handler: async (ctx, { event, featureId, workspaceId }) => {
    let all;
    if (workspaceId) {
      all = await ctx.db
        .query("webhooks")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
        .collect();
    } else {
      all = await ctx.db.query("webhooks").collect();
    }
    if (!event && !featureId) return all;
    return all.filter((h) => {
      if (event && !h.events.includes(event)) return false;
      if (featureId && h.featureId && h.featureId !== featureId) return false;
      return true;
    });
  },
});

export const remove = mutation({
  args: { id: v.id("webhooks") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

export const listMatching = internalQuery({
  args: { event: v.string(), featureId: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, { event, featureId }) => {
    const all = await ctx.db.query("webhooks").collect();
    return all.filter((h) => {
      if (!h.isActive) return false;
      if (!h.events.includes(event)) return false;
      if (h.featureId && featureId && h.featureId !== featureId) return false;
      return true;
    });
  },
});

export const fire = internalAction({
  args: {
    event: v.string(),
    taskId: v.optional(v.id("tasks")),
    featureId: v.optional(v.string()),
  },
  handler: async (ctx, { event, taskId, featureId }) => {
    const hooks = await ctx.runQuery(internal.webhooks.listMatching, { event, featureId });
    const task = taskId ? await ctx.runQuery(api.tasks.get, { id: taskId }) : null;
    const nextTasks = await ctx.runQuery(api.queue.getNextParallel, { limit: 3 });

    for (const hook of hooks) {
      try {
        const response = await fetch(hook.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event,
            task,
            nextAvailable: nextTasks,
            featureId,
            timestamp: Date.now(),
          }),
        });
        if (!response.ok) {
          console.error(`Webhook failed: ${response.status} for ${hook.url}`);
        }
      } catch (error) {
        console.error(`Webhook error for ${hook.url}:`, error);
      }
    }
  },
});

