import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { workspaceId: v.id("workspaces") },
  returns: v.any(),
  handler: async (ctx, { workspaceId }) => {
    return await ctx.db
      .query("documents")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .collect();
  },
});

export const getActive = query({
  args: { workspaceId: v.id("workspaces") },
  returns: v.any(),
  handler: async (ctx, { workspaceId }) => {
    return await ctx.db
      .query("documents")
      .withIndex("by_workspace_active", (q) =>
        q.eq("workspaceId", workspaceId).eq("isActive", true)
      )
      .collect();
  },
});

export const getContext = query({
  args: { workspaceId: v.id("workspaces") },
  returns: v.any(),
  handler: async (ctx, { workspaceId }) => {
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_workspace_active", (q) =>
        q.eq("workspaceId", workspaceId).eq("isActive", true)
      )
      .collect();

    const sections = docs
      .filter((d) => d.processedContent)
      .map((d) => `## ${d.name}\n\n${d.processedContent}`)
      .join("\n\n---\n\n");

    return {
      documentCount: docs.length,
      context: sections || null,
    };
  },
});

export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.string(),
    description: v.optional(v.string()),
    fileType: v.string(),
    storageId: v.id("_storage"),
    uploadedBy: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (args.fileType !== "md") {
      throw new Error("Only .md files are accepted");
    }
    const id = await ctx.db.insert("documents", {
      workspaceId: args.workspaceId,
      name: args.name,
      description: args.description,
      fileType: args.fileType,
      storageId: args.storageId,
      isActive: true,
      uploadedBy: args.uploadedBy,
      createdAt: Date.now(),
    });

    return { id };
  },
});

export const updateProcessedContent = mutation({
  args: {
    id: v.id("documents"),
    processedContent: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      processedContent: args.processedContent,
    });
  },
});

export const toggleActive = mutation({
  args: { id: v.id("documents") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const doc = await ctx.db.get(id);
    if (doc) {
      await ctx.db.patch(id, { isActive: !doc.isActive });
    }
  },
});

export const remove = mutation({
  args: { id: v.id("documents") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const doc = await ctx.db.get(id);
    if (doc) {
      await ctx.storage.delete(doc.storageId);
      await ctx.db.delete(id);
    }
  },
});

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
