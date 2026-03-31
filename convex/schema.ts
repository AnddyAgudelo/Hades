import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  workspaces: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    ownerId: v.string(),
    createdAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_owner", ["ownerId"]),

  workspaceMembers: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("operator"),
      v.literal("viewer")
    ),
    joinedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_user", ["userId"])
    .index("by_workspace_user", ["workspaceId", "userId"]),

  apiKeys: defineTable({
    workspaceId: v.id("workspaces"),
    name: v.string(),
    keyHash: v.string(),
    keyPrefix: v.string(),
    createdBy: v.string(),
    lastUsedAt: v.optional(v.number()),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_keyHash", ["keyHash"]),

  documents: defineTable({
    workspaceId: v.id("workspaces"),
    name: v.string(),
    description: v.optional(v.string()),
    fileType: v.string(),
    storageId: v.id("_storage"),
    processedContent: v.optional(v.string()),
    isActive: v.boolean(),
    uploadedBy: v.string(),
    createdAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_active", ["workspaceId", "isActive"]),

  tasks: defineTable({
    workspaceId: v.optional(v.id("workspaces")),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("queued"),
      v.literal("in_progress"),
      v.literal("blocked"),
      v.literal("done"),
      v.literal("cancelled"),
      v.literal("failed")
    ),
    priority: v.union(
      v.literal("urgent"),
      v.literal("high"),
      v.literal("medium"),
      v.literal("low"),
      v.literal("backlog")
    ),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),

    executionLog: v.optional(v.string()),
    result: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    blockReason: v.optional(v.string()),

    parentId: v.optional(v.id("tasks")),

    source: v.optional(v.string()),

    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    dueAt: v.optional(v.number()),

    estimatedMinutes: v.optional(v.number()),
    actualMinutes: v.optional(v.number()),

    // Repo metadata
    repo: v.optional(v.string()),
    branch: v.optional(v.string()),

    // Dependencies
    dependsOn: v.optional(v.array(v.id("tasks"))),

    // Parallelism
    parallelGroup: v.optional(v.string()),

    // Agent context
    agentPrompt: v.optional(v.string()),
    agentConfig: v.optional(v.any()),

    // Feature grouping
    featureId: v.optional(v.string()),
    featureName: v.optional(v.string()),
    taskNumber: v.optional(v.number()),

    // Retry
    retryCount: v.optional(v.number()),
    maxRetries: v.optional(v.number()),
    lastError: v.optional(v.string()),

    // Metrics
    executionTimeMs: v.optional(v.number()),
    tokensUsed: v.optional(v.number()),

    // Webhook
    webhookUrl: v.optional(v.string()),

    // Multi-agent
    assignedAgent: v.optional(v.string()),
    claimedAt: v.optional(v.number()),
    createdBy: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_priority", ["priority"])
    .index("by_parent", ["parentId"])
    .index("by_status_priority", ["status", "priority"])
    .index("by_feature", ["featureId", "taskNumber"])
    .index("by_repo", ["repo", "status"])
    .index("by_parallel_group", ["parallelGroup", "status"])
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_status", ["workspaceId", "status"]),

  activity: defineTable({
    workspaceId: v.optional(v.id("workspaces")),
    taskId: v.optional(v.id("tasks")),
    action: v.string(),
    details: v.optional(v.string()),
  })
    .index("by_task", ["taskId"])
    .index("by_workspace", ["workspaceId"]),

  agents: defineTable({
    workspaceId: v.optional(v.id("workspaces")),
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
    status: v.union(
      v.literal("idle"),
      v.literal("busy"),
      v.literal("offline")
    ),
    currentTaskId: v.optional(v.id("tasks")),
    lastHeartbeat: v.optional(v.number()),
    tasksCompleted: v.optional(v.number()),
    totalTokensUsed: v.optional(v.number()),
    totalExecutionTimeMs: v.optional(v.number()),
    avgTaskTimeMs: v.optional(v.number()),
    tokenBudget: v.optional(v.number()),
    tokensUsed: v.optional(v.number()),
    tokenThreshold: v.optional(v.number()),
    registeredBy: v.optional(v.string()),
  })
    .index("by_agentId", ["agentId"])
    .index("by_status", ["status"])
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_agentId", ["workspaceId", "agentId"]),

  features: defineTable({
    workspaceId: v.optional(v.id("workspaces")),
    featureId: v.string(),
    name: v.string(),
    autoAdvance: v.boolean(),
    maxParallel: v.optional(v.number()),
    webhookUrl: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_featureId", ["featureId"])
    .index("by_workspace", ["workspaceId"]),

  webhooks: defineTable({
    workspaceId: v.optional(v.id("workspaces")),
    url: v.string(),
    events: v.array(v.string()),
    featureId: v.optional(v.string()),
    isActive: v.boolean(),
  })
    .index("by_workspace", ["workspaceId"]),

  metrics: defineTable({
    workspaceId: v.optional(v.id("workspaces")),
    taskId: v.optional(v.id("tasks")),
    agentId: v.optional(v.string()),
    featureId: v.optional(v.string()),
    type: v.union(
      v.literal("task_execution"),
      v.literal("agent_session"),
      v.literal("feature_summary")
    ),
    tokensInput: v.optional(v.number()),
    tokensOutput: v.optional(v.number()),
    tokensCacheRead: v.optional(v.number()),
    tokensCacheWrite: v.optional(v.number()),
    tokensTotal: v.optional(v.number()),
    costInput: v.optional(v.number()),
    costOutput: v.optional(v.number()),
    costTotal: v.optional(v.number()),
    executionTimeMs: v.optional(v.number()),
    waitTimeMs: v.optional(v.number()),
    filesCreated: v.optional(v.number()),
    filesModified: v.optional(v.number()),
    linesAdded: v.optional(v.number()),
    linesRemoved: v.optional(v.number()),
    model: v.optional(v.string()),
    retryCount: v.optional(v.number()),
    timestamp: v.number(),
  })
    .index("by_task", ["taskId"])
    .index("by_agent", ["agentId", "timestamp"])
    .index("by_feature", ["featureId", "timestamp"])
    .index("by_type", ["type", "timestamp"])
    .index("by_workspace", ["workspaceId"]),
});
