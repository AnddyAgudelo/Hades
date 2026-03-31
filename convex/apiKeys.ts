import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

function hashKey(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(36);
}

function generateKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "hds_";
  for (let i = 0; i < 40; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.string(),
    createdBy: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const rawKey = generateKey();
    const keyHash = hashKey(rawKey);
    const keyPrefix = rawKey.substring(0, 12);

    const id = await ctx.db.insert("apiKeys", {
      workspaceId: args.workspaceId,
      name: args.name,
      keyHash,
      keyPrefix,
      createdBy: args.createdBy,
      isActive: true,
      createdAt: Date.now(),
    });

    return { id, key: rawKey, prefix: keyPrefix };
  },
});

export const list = query({
  args: { workspaceId: v.id("workspaces") },
  returns: v.any(),
  handler: async (ctx, { workspaceId }) => {
    return await ctx.db
      .query("apiKeys")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .collect();
  },
});

export const revoke = mutation({
  args: { id: v.id("apiKeys") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { isActive: false });
  },
});

export const remove = mutation({
  args: { id: v.id("apiKeys") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

export const validateKey = internalQuery({
  args: { keyHash: v.string() },
  returns: v.any(),
  handler: async (ctx, { keyHash }) => {
    const apiKey = await ctx.db
      .query("apiKeys")
      .withIndex("by_keyHash", (q) => q.eq("keyHash", keyHash))
      .unique();

    if (!apiKey || !apiKey.isActive) return null;

    return {
      workspaceId: apiKey.workspaceId,
      keyId: apiKey._id,
    };
  },
});
