import { query } from "./_generated/server";
import { v } from "convex/values";

export const recent = query({
  args: {
    limit: v.optional(v.number()),
    workspaceId: v.optional(v.id("workspaces")),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    if (args.workspaceId) {
      return await ctx.db
        .query("activity")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId!))
        .order("desc")
        .take(args.limit ?? 20);
    }
    return await ctx.db
      .query("activity")
      .order("desc")
      .take(args.limit ?? 20);
  },
});

export const byTask = query({
  args: { taskId: v.id("tasks") },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("activity")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .order("desc")
      .collect();
  },
});
