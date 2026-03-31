import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    status: v.optional(v.string()),
    priority: v.optional(v.string()),
    category: v.optional(v.string()),
    workspaceId: v.optional(v.id("workspaces")),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    let tasks;
    if (args.workspaceId && args.status) {
      tasks = await ctx.db
        .query("tasks")
        .withIndex("by_workspace_status", (q) =>
          q.eq("workspaceId", args.workspaceId!).eq("status", args.status as any)
        )
        .collect();
    } else if (args.workspaceId) {
      tasks = await ctx.db
        .query("tasks")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId!))
        .collect();
    } else if (args.status) {
      tasks = await ctx.db
        .query("tasks")
        .withIndex("by_status", (q) => q.eq("status", args.status as any))
        .collect();
    } else {
      tasks = await ctx.db.query("tasks").collect();
    }
    if (args.priority) tasks = tasks.filter((t) => t.priority === args.priority);
    if (args.category) tasks = tasks.filter((t) => t.category === args.category);
    return tasks;
  },
});

export const listGroupedByFeature = query({
  args: {
    workspaceId: v.optional(v.id("workspaces")),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    let tasks;
    if (args.workspaceId) {
      tasks = await ctx.db
        .query("tasks")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId!))
        .collect();
    } else {
      tasks = await ctx.db.query("tasks").collect();
    }

    const featureMap: Record<string, typeof tasks> = {};
    const ungrouped: typeof tasks = [];

    for (const task of tasks) {
      if (task.featureId) {
        if (!featureMap[task.featureId]) featureMap[task.featureId] = [];
        featureMap[task.featureId].push(task);
      } else {
        ungrouped.push(task);
      }
    }

    const features = Object.entries(featureMap).map(([featureId, fTasks]) => {
      const sorted = fTasks.sort((a, b) => (a.taskNumber || 0) - (b.taskNumber || 0));
      const completed = fTasks.filter((t) => t.status === "done").length;
      return {
        featureId,
        featureName: fTasks[0]?.featureName || featureId,
        tasks: sorted,
        total: fTasks.length,
        completed,
        percentComplete: fTasks.length > 0 ? Math.round((completed / fTasks.length) * 100) : 0,
      };
    });

    return { features, ungrouped };
  },
});

export const get = query({
  args: { id: v.id("tasks") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getSubtasks = query({
  args: { parentId: v.id("tasks") },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_parent", (q) => q.eq("parentId", args.parentId))
      .collect();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    priority: v.optional(v.string()),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    source: v.optional(v.string()),
    parentId: v.optional(v.id("tasks")),
    dueAt: v.optional(v.number()),
    estimatedMinutes: v.optional(v.number()),
    repo: v.optional(v.string()),
    branch: v.optional(v.string()),
    featureId: v.optional(v.string()),
    featureName: v.optional(v.string()),
    taskNumber: v.optional(v.number()),
    agentPrompt: v.optional(v.string()),
    agentConfig: v.optional(v.any()),
    parallelGroup: v.optional(v.string()),
    maxRetries: v.optional(v.number()),
    webhookUrl: v.optional(v.string()),
    dependsOn: v.optional(v.array(v.id("tasks"))),
    workspaceId: v.optional(v.id("workspaces")),
  },
  returns: v.id("tasks"),
  handler: async (ctx, args) => {
    // Auto-create feature if featureId is provided
    if (args.featureId) {
      const existing = await ctx.db
        .query("features")
        .withIndex("by_featureId", (q) => q.eq("featureId", args.featureId!))
        .unique();
      if (!existing) {
        await ctx.db.insert("features", {
          featureId: args.featureId,
          name: args.featureName || args.featureId,
          autoAdvance: false,
          workspaceId: args.workspaceId,
          createdAt: Date.now(),
        });
      } else if (!existing.workspaceId && args.workspaceId) {
        await ctx.db.patch(existing._id, { workspaceId: args.workspaceId });
      }
    }

    const taskId = await ctx.db.insert("tasks", {
      title: args.title,
      description: args.description,
      status: "queued",
      priority: (args.priority as "urgent" | "high" | "medium" | "low" | "backlog") ?? "medium",
      category: args.category,
      tags: args.tags,
      source: args.source,
      parentId: args.parentId,
      dueAt: args.dueAt,
      estimatedMinutes: args.estimatedMinutes,
      repo: args.repo,
      branch: args.branch,
      featureId: args.featureId,
      featureName: args.featureName,
      taskNumber: args.taskNumber,
      agentPrompt: args.agentPrompt,
      agentConfig: args.agentConfig,
      parallelGroup: args.parallelGroup,
      maxRetries: args.maxRetries,
      webhookUrl: args.webhookUrl,
      dependsOn: args.dependsOn,
      workspaceId: args.workspaceId,
    });

    await ctx.db.insert("activity", {
      taskId,
      action: "task_created",
      details: `Task "${args.title}" created${args.source ? ` from ${args.source}` : ""}`,
    });

    return taskId;
  },
});

export const createBatch = mutation({
  args: {
    workspaceId: v.optional(v.id("workspaces")),
    tasks: v.array(v.object({
      title: v.string(),
      description: v.optional(v.string()),
      priority: v.optional(v.union(
        v.literal("urgent"),
        v.literal("high"),
        v.literal("medium"),
        v.literal("low"),
        v.literal("backlog")
      )),
      repo: v.optional(v.string()),
      branch: v.optional(v.string()),
      featureId: v.optional(v.string()),
      featureName: v.optional(v.string()),
      taskNumber: v.optional(v.number()),
      dependsOnIndex: v.optional(v.array(v.number())),
      agentPrompt: v.optional(v.string()),
      agentConfig: v.optional(v.any()),
      parentId: v.optional(v.id("tasks")),
      category: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
      source: v.optional(v.string()),
      dueAt: v.optional(v.number()),
      estimatedMinutes: v.optional(v.number()),
      parallelGroup: v.optional(v.string()),
    })),
  },
  returns: v.any(),
  handler: async (ctx, { tasks, workspaceId }) => {
    const createdIds: any[] = [];
    const ensuredFeatures = new Set<string>();

    for (const task of tasks) {
      // Auto-create feature if featureId is provided
      if (task.featureId && !ensuredFeatures.has(task.featureId)) {
        const existing = await ctx.db
          .query("features")
          .withIndex("by_featureId", (q) => q.eq("featureId", task.featureId!))
          .unique();
        if (!existing) {
          await ctx.db.insert("features", {
            featureId: task.featureId,
            name: task.featureName || task.featureId,
            autoAdvance: false,
            workspaceId,
            createdAt: Date.now(),
          });
        } else if (!existing.workspaceId && workspaceId) {
          await ctx.db.patch(existing._id, { workspaceId });
        }
        ensuredFeatures.add(task.featureId);
      }

      const dependsOn = task.dependsOnIndex?.map((i) => createdIds[i]) || [];

      const id = await ctx.db.insert("tasks", {
        title: task.title,
        description: task.description,
        status: "queued",
        priority: task.priority ?? "high",
        repo: task.repo,
        branch: task.branch,
        featureId: task.featureId,
        featureName: task.featureName,
        taskNumber: task.taskNumber,
        dependsOn: dependsOn.length > 0 ? dependsOn : undefined,
        agentPrompt: task.agentPrompt,
        agentConfig: task.agentConfig,
        parentId: task.parentId,
        category: task.category,
        tags: task.tags,
        source: task.source,
        dueAt: task.dueAt,
        estimatedMinutes: task.estimatedMinutes,
        parallelGroup: task.parallelGroup,
        workspaceId,
      });

      createdIds.push(id);
    }

    await ctx.db.insert("activity", {
      action: "batch_created",
      details: `Created ${tasks.length} tasks for feature ${tasks[0]?.featureId || "unknown"}`,
    });

    return { created: createdIds.length, ids: createdIds };
  },
});

export const update = mutation({
  args: {
    id: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    priority: v.optional(v.string()),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    executionLog: v.optional(v.string()),
    result: v.optional(v.string()),
    dueAt: v.optional(v.number()),
    estimatedMinutes: v.optional(v.number()),
    webhookUrl: v.optional(v.string()),
    repo: v.optional(v.string()),
    branch: v.optional(v.string()),
    featureId: v.optional(v.string()),
    featureName: v.optional(v.string()),
    taskNumber: v.optional(v.number()),
    agentPrompt: v.optional(v.string()),
    agentConfig: v.optional(v.any()),
    parallelGroup: v.optional(v.string()),
    maxRetries: v.optional(v.number()),
    dependsOn: v.optional(v.array(v.id("tasks"))),
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

export const history = query({
  args: {
    limit: v.optional(v.number()),
    workspaceId: v.optional(v.id("workspaces")),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    let tasks;
    if (args.workspaceId) {
      tasks = await ctx.db
        .query("tasks")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId!))
        .collect();
    } else {
      tasks = await ctx.db.query("tasks").collect();
    }
    const doneStatuses = new Set(["done", "cancelled", "failed"]);
    const completed = tasks.filter((t) => doneStatuses.has(t.status));
    completed.sort(
      (a, b) =>
        (b.completedAt ?? b._creationTime) -
        (a.completedAt ?? a._creationTime)
    );
    return completed.slice(0, args.limit ?? 100);
  },
});

export const remove = mutation({
  args: { id: v.id("tasks") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (task) {
      await ctx.db.delete(args.id);
      await ctx.db.insert("activity", {
        taskId: args.id,
        action: "task_deleted",
        details: `Task "${task.title}" deleted`,
      });
    }
  },
});

export const getDependents = query({
  args: {
    taskId: v.id("tasks"),
    workspaceId: v.optional(v.id("workspaces")),
  },
  returns: v.array(v.any()),
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
    return allTasks.filter(
      (t) => t.dependsOn && t.dependsOn.includes(args.taskId)
    );
  },
});
