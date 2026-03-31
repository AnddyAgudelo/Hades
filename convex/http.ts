import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { auth } from "./auth";

function hashKey(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(36);
}

async function authenticateRequest(
  ctx: any,
  request: Request
): Promise<{ workspaceId: any } | Response> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Missing or invalid Authorization header" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const rawKey = authHeader.substring(7);
  const keyHash = hashKey(rawKey);
  const result = await ctx.runQuery(internal.apiKeys.validateKey, { keyHash });

  if (!result) {
    return new Response(
      JSON.stringify({ error: "Invalid or revoked API key" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  return { workspaceId: result.workspaceId };
}

async function requireAgent(
  ctx: any,
  agentId: string | undefined,
  workspaceId: any
): Promise<{ agent: any } | Response> {
  if (!agentId) {
    return new Response(
      JSON.stringify({ error: "agentId is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const agent = await ctx.runQuery(api.agents.getByAgentIdAndWorkspace, {
    agentId,
    workspaceId,
  });

  if (!agent) {
    return new Response(
      JSON.stringify({
        error: "Agent not registered. Use /api/agents/register first.",
        agentId,
      }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  return { agent };
}

const http = httpRouter();

auth.addHttpRoutes(http);

// === Queue endpoints ===

http.route({
  path: "/api/queue/current",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticateRequest(ctx, request);
    if (auth instanceof Response) return auth;

    const current = await ctx.runQuery(api.queue.current, { workspaceId: auth.workspaceId });
    return new Response(JSON.stringify(current), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/queue/next",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticateRequest(ctx, request);
    if (auth instanceof Response) return auth;

    const next = await ctx.runQuery(api.queue.next, { workspaceId: auth.workspaceId });
    return new Response(JSON.stringify(next), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/queue/next-parallel",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticateRequest(ctx, request);
    if (auth instanceof Response) return auth;

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "2");
    const tasks = await ctx.runQuery(api.queue.getNextParallel, { limit, workspaceId: auth.workspaceId });
    return new Response(JSON.stringify(tasks), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/queue/unblocked",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticateRequest(ctx, request);
    if (auth instanceof Response) return auth;

    const tasks = await ctx.runQuery(api.queue.unblocked, { workspaceId: auth.workspaceId });
    return new Response(JSON.stringify(tasks), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/queue/start",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticateRequest(ctx, request);
    if (auth instanceof Response) return auth;

    const body = await request.json();
    if (body.agentId) {
      const agentCheck = await requireAgent(ctx, body.agentId, auth.workspaceId);
      if (agentCheck instanceof Response) return agentCheck;
    }

    const { agentId: _agentId, ...startArgs } = body;
    startArgs.workspaceId = auth.workspaceId;
    const task = await ctx.runMutation(api.queue.start, startArgs);
    return new Response(JSON.stringify(task), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/queue/complete",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticateRequest(ctx, request);
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const { agentId, ...completeArgs } = body;
    const agentCheck = await requireAgent(ctx, agentId, auth.workspaceId);
    if (agentCheck instanceof Response) return agentCheck;

    await ctx.runMutation(api.queue.complete, completeArgs);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/queue/block",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticateRequest(ctx, request);
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const { agentId, ...blockArgs } = body;
    const agentCheck = await requireAgent(ctx, agentId, auth.workspaceId);
    if (agentCheck instanceof Response) return agentCheck;

    await ctx.runMutation(api.queue.block, blockArgs);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/queue/retry",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticateRequest(ctx, request);
    if (auth instanceof Response) return auth;

    const body = await request.json();
    await ctx.runMutation(api.queue.retry, body);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/queue/dispatch",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticateRequest(ctx, request);
    if (auth instanceof Response) return auth;

    try {
      const task = await ctx.runMutation(api.queue.start, { workspaceId: auth.workspaceId });
      if (!task) {
        return new Response(null, { status: 204 });
      }

      const knowledge = await ctx.runQuery(api.documents.getContext, {
        workspaceId: auth.workspaceId,
      });

      return new Response(JSON.stringify({
        task: {
          id: task._id,
          title: task.title,
          description: task.description,
          repo: task.repo,
          branch: task.branch,
          agentPrompt: task.agentPrompt,
          agentConfig: task.agentConfig || {},
          featureId: task.featureId,
          dependsOn: task.dependsOn,
        },
        context: knowledge?.context || null,
      }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      return new Response(null, { status: 204 });
    }
  }),
});

// === Task endpoints ===

http.route({
  path: "/api/tasks",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticateRequest(ctx, request);
    if (auth instanceof Response) return auth;

    const body = await request.json();
    body.workspaceId = auth.workspaceId;
    const taskId = await ctx.runMutation(api.tasks.create, body);
    return new Response(JSON.stringify({ taskId }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/tasks/batch",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticateRequest(ctx, request);
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const result = await ctx.runMutation(api.tasks.createBatch, { tasks: body.tasks, workspaceId: auth.workspaceId });
    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/tasks/log",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticateRequest(ctx, request);
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const { agentId, ...logArgs } = body;
    const agentCheck = await requireAgent(ctx, agentId, auth.workspaceId);
    if (agentCheck instanceof Response) return agentCheck;

    await ctx.runMutation(api.queue.appendLog, logArgs);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// === Stats endpoints ===

http.route({
  path: "/api/stats",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticateRequest(ctx, request);
    if (auth instanceof Response) return auth;

    const stats = await ctx.runQuery(api.stats.dashboard, { workspaceId: auth.workspaceId });
    return new Response(JSON.stringify(stats), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/stats/feature",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticateRequest(ctx, request);
    if (auth instanceof Response) return auth;

    const url = new URL(request.url);
    const featureId = url.searchParams.get("featureId");
    if (!featureId) {
      return new Response(JSON.stringify({ error: "featureId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const stats = await ctx.runQuery(api.stats.featureStats, { featureId, workspaceId: auth.workspaceId });
    return new Response(JSON.stringify(stats), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/stats/repos",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticateRequest(ctx, request);
    if (auth instanceof Response) return auth;

    const url = new URL(request.url);
    const repo = url.searchParams.get("repo") || undefined;
    const stats = await ctx.runQuery(api.stats.repoStats, { repo, workspaceId: auth.workspaceId });
    return new Response(JSON.stringify(stats), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// === Agent endpoints ===

http.route({
  path: "/api/agents/register",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticateRequest(ctx, request);
    if (auth instanceof Response) return auth;

    const body = await request.json();
    body.workspaceId = auth.workspaceId;
    const result = await ctx.runMutation(api.agents.register, body);
    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/agents/claim",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticateRequest(ctx, request);
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const agentCheck = await requireAgent(ctx, body.agentId, auth.workspaceId);
    if (agentCheck instanceof Response) return agentCheck;

    body.workspaceId = auth.workspaceId;
    const result = await ctx.runMutation(api.queue.claim, body);

    if (!result.claimed && result.reason === "insufficient_tokens") {
      return new Response(JSON.stringify({
        error: "insufficient_tokens",
        tokensRemaining: result.tokensRemaining,
        threshold: result.threshold,
      }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/agents/heartbeat",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticateRequest(ctx, request);
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const agentCheck = await requireAgent(ctx, body.agentId, auth.workspaceId);
    if (agentCheck instanceof Response) return agentCheck;

    const result = await ctx.runMutation(api.agents.heartbeat, { agentId: body.agentId });
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/agents/release",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticateRequest(ctx, request);
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const agentCheck = await requireAgent(ctx, body.agentId, auth.workspaceId);
    if (agentCheck instanceof Response) return agentCheck;

    const result = await ctx.runMutation(api.agents.updateStatus, {
      agentId: body.agentId,
      status: "idle",
    });
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/agents/status",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticateRequest(ctx, request);
    if (auth instanceof Response) return auth;

    const agents = await ctx.runQuery(api.agents.list, { workspaceId: auth.workspaceId });
    return new Response(JSON.stringify(agents), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// === Metrics endpoints ===

http.route({
  path: "/api/metrics/report",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticateRequest(ctx, request);
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const agentCheck = await requireAgent(ctx, body.agentId, auth.workspaceId);
    if (agentCheck instanceof Response) return agentCheck;

    await ctx.runMutation(api.metrics.record, {
      type: "task_execution",
      taskId: body.taskId,
      agentId: body.agentId,
      featureId: body.featureId,
      tokensInput: body.tokens?.input,
      tokensOutput: body.tokens?.output,
      tokensCacheRead: body.tokens?.cacheRead,
      tokensCacheWrite: body.tokens?.cacheWrite,
      tokensTotal: body.tokens?.total,
      costInput: body.cost?.input,
      costOutput: body.cost?.output,
      costTotal: body.cost?.total,
      executionTimeMs: body.executionTimeMs,
      filesCreated: body.files?.created,
      filesModified: body.files?.modified,
      linesAdded: body.files?.linesAdded,
      linesRemoved: body.files?.linesRemoved,
      model: body.model,
      timestamp: Date.now(),
      workspaceId: auth.workspaceId,
    });
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/metrics/agent",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticateRequest(ctx, request);
    if (auth instanceof Response) return auth;

    const url = new URL(request.url);
    const agentId = url.searchParams.get("agentId");
    if (!agentId) {
      return new Response(JSON.stringify({ error: "agentId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const days = parseInt(url.searchParams.get("days") || "7");
    const stats = await ctx.runQuery(api.metrics.agentStats, { agentId, daysBack: days });
    return new Response(JSON.stringify(stats), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/metrics/feature",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticateRequest(ctx, request);
    if (auth instanceof Response) return auth;

    const url = new URL(request.url);
    const featureId = url.searchParams.get("featureId");
    if (!featureId) {
      return new Response(JSON.stringify({ error: "featureId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const stats = await ctx.runQuery(api.metrics.featureMetrics, { featureId });
    return new Response(JSON.stringify(stats), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/metrics/dashboard",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticateRequest(ctx, request);
    if (auth instanceof Response) return auth;

    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get("days") || "30");
    const stats = await ctx.runQuery(api.metrics.globalDashboard, { daysBack: days, workspaceId: auth.workspaceId });
    return new Response(JSON.stringify(stats), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// === Features endpoints ===

http.route({
  path: "/api/features",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticateRequest(ctx, request);
    if (auth instanceof Response) return auth;

    const features = await ctx.runQuery(api.features.list, { workspaceId: auth.workspaceId });
    return new Response(JSON.stringify(features), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/features",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticateRequest(ctx, request);
    if (auth instanceof Response) return auth;

    const body = await request.json();
    body.workspaceId = auth.workspaceId;
    const result = await ctx.runMutation(api.features.create, body);
    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/features/update",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticateRequest(ctx, request);
    if (auth instanceof Response) return auth;

    const body = await request.json();
    await ctx.runMutation(api.features.update, body);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// === Webhooks endpoints ===

http.route({
  path: "/api/webhooks/register",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticateRequest(ctx, request);
    if (auth instanceof Response) return auth;

    const body = await request.json();
    body.workspaceId = auth.workspaceId;
    const result = await ctx.runMutation(api.webhooks.register, body);
    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/webhooks",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticateRequest(ctx, request);
    if (auth instanceof Response) return auth;

    const url = new URL(request.url);
    const event = url.searchParams.get("event") || undefined;
    const featureId = url.searchParams.get("featureId") || undefined;
    const hooks = await ctx.runQuery(api.webhooks.list, { event, featureId, workspaceId: auth.workspaceId });
    return new Response(JSON.stringify(hooks), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/webhooks/delete",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticateRequest(ctx, request);
    if (auth instanceof Response) return auth;

    const body = await request.json();
    await ctx.runMutation(api.webhooks.remove, body);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// === Knowledge Hub endpoints ===

http.route({
  path: "/api/knowledge",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticateRequest(ctx, request);
    if (auth instanceof Response) return auth;

    const docs = await ctx.runQuery(api.documents.list, {
      workspaceId: auth.workspaceId,
    });
    return new Response(JSON.stringify(docs), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/knowledge/context",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticateRequest(ctx, request);
    if (auth instanceof Response) return auth;

    const context = await ctx.runQuery(api.documents.getContext, {
      workspaceId: auth.workspaceId,
    });
    return new Response(JSON.stringify(context), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
