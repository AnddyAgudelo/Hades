import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const backfillWorkspaceId = internalMutation({
  args: {
    workspaceId: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const targetWorkspaceId = (args.workspaceId ?? "m57dryr2f1x6hd27p1gj697ta983xky9") as any;

    const tables = ["tasks", "agents", "activity", "features", "webhooks", "metrics"] as const;
    const results: Record<string, number> = {};

    for (const table of tables) {
      let updated = 0;
      const records = await ctx.db.query(table).collect();

      for (const record of records) {
        if ((record as any).workspaceId === undefined || (record as any).workspaceId === null) {
          await ctx.db.patch(record._id, { workspaceId: targetWorkspaceId } as any);
          updated++;
        }
      }

      results[table] = updated;
    }

    return {
      migrated: results,
      targetWorkspaceId,
      timestamp: new Date().toISOString(),
    };
  },
});
