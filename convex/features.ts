import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    workspaceId: v.optional(v.id("workspaces")),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (args.workspaceId) {
      return await ctx.db
        .query("features")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId!))
        .collect();
    }
    return await ctx.db.query("features").collect();
  },
});

export const get = query({
  args: { featureId: v.string() },
  returns: v.any(),
  handler: async (ctx, { featureId }) => {
    return await ctx.db
      .query("features")
      .withIndex("by_featureId", (q) => q.eq("featureId", featureId))
      .unique();
  },
});

export const create = mutation({
  args: {
    featureId: v.string(),
    name: v.string(),
    autoAdvance: v.optional(v.boolean()),
    maxParallel: v.optional(v.number()),
    webhookUrl: v.optional(v.string()),
    workspaceId: v.optional(v.id("workspaces")),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("features")
      .withIndex("by_featureId", (q) => q.eq("featureId", args.featureId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        autoAdvance: args.autoAdvance ?? false,
        maxParallel: args.maxParallel,
        webhookUrl: args.webhookUrl,
        workspaceId: args.workspaceId,
      });
      return { id: existing._id, updated: true };
    }

    const id = await ctx.db.insert("features", {
      featureId: args.featureId,
      name: args.name,
      autoAdvance: args.autoAdvance ?? false,
      maxParallel: args.maxParallel,
      webhookUrl: args.webhookUrl,
      workspaceId: args.workspaceId,
      createdAt: Date.now(),
    });

    return { id, updated: false };
  },
});

export const update = mutation({
  args: {
    id: v.id("features"),
    name: v.optional(v.string()),
    autoAdvance: v.optional(v.boolean()),
    maxParallel: v.optional(v.number()),
    webhookUrl: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) updates[key] = value;
    }
    await ctx.db.patch(id, updates);
  },
});

export const remove = mutation({
  args: { id: v.id("features") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
