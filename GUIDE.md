# Hades — Platform Guide

> Open source platform to orchestrate AI agent tasks with dependencies, parallel execution, multi-agent support, and metrics.

---

## 1. Overview

Hades is a task orchestration layer for AI agents. It manages work queues, dependencies, parallelism, agent registration, knowledge context, and execution metrics — all through a simple HTTP API.

```
Orchestrator agent
    ↓ HTTP API (curl / SDK)
Hades Backend (Convex) ← → Next.js Frontend (UI)
    ↓
Worker agents (Claude Code, Codex, etc.)
```

- **Agents** register, claim tasks, execute, and report back via HTTP
- **Convex** persists data and runs serverless logic in real time
- **Frontend** shows live state via Convex subscriptions
- **Workspaces** isolate all data per team or project

---

## 2. Authentication

All API endpoints require an API key passed as a Bearer token:

```
Authorization: Bearer hds_your_api_key_here
```

API keys are generated per workspace from the **Settings** page (`/settings`). Each key is permanently tied to one workspace — the workspace is resolved automatically from the key, so agents do not need to pass a `workspaceId` in every request.

Example:

```bash
curl -sS "$HADES_API_URL/api/queue/dispatch" \
  -H "Authorization: Bearer $HADES_API_KEY" | jq .
```

---

## 3. Quick Start

### Step 1 — Register your agent

```bash
curl -sS -X POST "$HADES_API_URL/api/agents/register" \
  -H "Authorization: Bearer $HADES_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "worker-01",
    "name": "Worker 01",
    "role": "worker",
    "specialization": "full-stack",
    "workspaceId": "ws_abc123",
    "tokenBudget": 200000,
    "tokenThreshold": 10000
  }' | jq .
```

### Step 2 — Create a task

```bash
curl -sS -X POST "$HADES_API_URL/api/tasks" \
  -H "Authorization: Bearer $HADES_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implement login endpoint",
    "description": "Add POST /auth/login with JWT response",
    "priority": "high",
    "repo": "my-backend",
    "branch": "feature/auth",
    "workspaceId": "ws_abc123",
    "agentPrompt": "Implement a secure login endpoint...",
    "agentConfig": { "timeout": 300, "maxRetries": 3 }
  }' | jq .
```

### Step 3 — Claim and dispatch a task

```bash
# Dispatch returns the next task + knowledge hub context
curl -sS "$HADES_API_URL/api/queue/dispatch" \
  -H "Authorization: Bearer $HADES_API_KEY" | jq .
```

Response:
```json
{
  "task": {
    "id": "task_xyz",
    "title": "Implement login endpoint",
    "description": "Add POST /auth/login with JWT response",
    "repo": "my-backend",
    "branch": "feature/auth",
    "agentPrompt": "Implement a secure login endpoint...",
    "agentConfig": {},
    "featureId": "auth-system",
    "dependsOn": []
  },
  "context": "...consolidated knowledge hub content or null..."
}
```

Returns `204 No Content` when no tasks are available.

### Step 4 — Execute and log progress

```bash
curl -sS -X POST "$HADES_API_URL/api/tasks/log" \
  -H "Authorization: Bearer $HADES_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "task_xyz",
    "agentId": "worker-01",
    "message": "Creating auth controller..."
  }' | jq .
```

### Step 5 — Complete the task

```bash
curl -sS -X POST "$HADES_API_URL/api/queue/complete" \
  -H "Authorization: Bearer $HADES_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "commitHash": "abc123def"
  }' | jq .
```

### Heartbeat (keep agent alive)

Send periodically while the agent is running:

```bash
curl -sS -X POST "$HADES_API_URL/api/agents/heartbeat" \
  -H "Authorization: Bearer $HADES_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"agentId": "worker-01"}' | jq .
```

---

## 4. API Reference

### Queue

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/queue/current` | Currently executing task |
| GET | `/api/queue/next` | Next available task (respects dependencies) |
| GET | `/api/queue/next-parallel` | Available parallel tasks (`?limit=N`) |
| GET | `/api/queue/unblocked` | Recently unblocked tasks |
| GET | `/api/queue/dispatch` | Get next task + knowledge hub context, ready for agent |
| POST | `/api/queue/start` | Start next task |
| POST | `/api/queue/complete` | Mark task as completed (`{ commitHash }`) |
| POST | `/api/queue/block` | Block task (`{ reason }`) |
| POST | `/api/queue/retry` | Retry failed task (`{ taskId }`) |

#### `/api/queue/dispatch` response

```json
{
  "task": {
    "id": "...",
    "title": "...",
    "description": "...",
    "repo": "...",
    "branch": "...",
    "agentPrompt": "...",
    "agentConfig": {},
    "featureId": "...",
    "dependsOn": []
  },
  "context": "consolidated knowledge hub content or null"
}
```

Returns `204 No Content` when no tasks are available.

---

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tasks` | Create individual task |
| POST | `/api/tasks/batch` | Create multiple tasks at once |
| POST | `/api/tasks/log` | Append entry to execution log |

**Task fields:**

| Field | Description |
|-------|-------------|
| `title` | Descriptive name |
| `description` | Detail of what to do |
| `priority` | `urgent` / `high` / `medium` / `low` / `backlog` |
| `repo` | Target repository (e.g., `"my-backend"`) |
| `branch` | Working branch |
| `workspaceId` | Workspace this task belongs to |
| `featureId` | Feature/epic grouping |
| `featureName` | Human-readable feature name |
| `taskNumber` | Order within the feature |
| `dependsOn` | IDs of tasks that must complete first |
| `parallelGroup` | Group of tasks that can run in parallel |
| `agentPrompt` | Full prompt for the agent |
| `agentConfig` | Free-form JSON — any agent configuration needed |
| `maxRetries` | Maximum number of automatic retries |

**Batch create:**

```bash
curl -sS -X POST "$HADES_API_URL/api/tasks/batch" \
  -H "Authorization: Bearer $HADES_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tasks": [
      {
        "title": "T01 — Backend models",
        "description": "Create data models",
        "priority": "high",
        "repo": "sirius",
        "workspaceId": "ws_abc123",
        "featureId": "booking",
        "taskNumber": 1,
        "agentPrompt": "..."
      },
      {
        "title": "T02 — API endpoints",
        "dependsOn": ["<id-of-T01>"],
        "parallelGroup": "wave-2",
        "workspaceId": "ws_abc123"
      }
    ]
  }' | jq .
```

---

### Agents

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/agents/register` | Register new agent |
| POST | `/api/agents/claim` | Agent claims a specific task |
| POST | `/api/agents/heartbeat` | Agent liveness ping |
| POST | `/api/agents/release` | Agent releases current task |
| GET | `/api/agents/status` | Status of all agents in the workspace |

**Agent fields:**

| Field | Description |
|-------|-------------|
| `agentId` | Unique identifier |
| `name` | Display name (e.g., `"worker-01"`) |
| `role` | `orchestrator` / `worker` / `reviewer` |
| `specialization` | Type of work the agent performs |
| `workspaceId` | Workspace this agent belongs to |
| `tokenBudget` | Total token budget for the agent session |
| `tokenThreshold` | Minimum tokens required to accept a new task |

---

### Metrics

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/metrics/report` | Report execution metric |
| GET | `/api/metrics/agent` | Metrics by agent |
| GET | `/api/metrics/feature` | Metrics by feature |
| GET | `/api/metrics/dashboard` | Global dashboard |

**Report metrics:**

```bash
curl -sS -X POST "$HADES_API_URL/api/metrics/report" \
  -H "Authorization: Bearer $HADES_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "task_xyz",
    "agentId": "worker-01",
    "type": "execution",
    "tokensUsed": 15000,
    "costUsd": 0.12,
    "executionTimeMs": 180000,
    "linesAdded": 350,
    "linesRemoved": 20,
    "model": "claude-sonnet-4"
  }' | jq .
```

---

### Features

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/features` | List features |
| POST | `/api/features` | Create feature |
| POST | `/api/features/update` | Update feature |

**Feature fields:**

| Field | Description |
|-------|-------------|
| `featureId` | Unique identifier (e.g., `"gamification"`) |
| `name` | Human-readable name |
| `autoAdvance` | If `true`, completing a task automatically starts the next |
| `maxParallel` | Maximum tasks running in parallel within this feature |
| `webhookUrl` | URL to notify when tasks complete |

---

### Knowledge Hub

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/knowledge` | List workspace documents |
| GET | `/api/knowledge/context` | Get consolidated processed content from active documents |

The `/api/knowledge/context` endpoint returns a single string combining all active documents in the workspace. This is automatically included in `/api/queue/dispatch` responses as the `context` field, so agents receive relevant knowledge without a separate request.

---

### Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/webhooks/register` | Register webhook |
| GET | `/api/webhooks` | List webhooks |
| POST | `/api/webhooks/delete` | Delete webhook |

---

### Stats

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats` | General dashboard stats |
| GET | `/api/stats/feature` | Stats for a specific feature |
| GET | `/api/stats/repos` | Stats by repository |

---

## 5. Workspaces

Hades organizes all data by workspaces. A workspace groups tasks, agents, features, documents, and metrics. Users can belong to multiple workspaces with different roles.

**Roles:**
- `admin` — full access, manage settings and API keys
- `operator` — create and manage tasks, agents, and features
- `viewer` — read-only access

API keys are scoped to a workspace. When an agent uses a key, all operations automatically apply to that workspace. Agents must pass `workspaceId` when registering or creating tasks to associate records correctly.

Workspaces are managed from the **Settings** page (`/settings`), where admins can generate API keys, invite members, and configure integrations.

---

## 6. Knowledge Hub

The Knowledge Hub (`/knowledge`) is a document store per workspace. Documents can be architecture notes, coding guidelines, API specs, or any reference material that agents should consider when executing tasks.

**How it works:**

1. Upload or create documents in `/knowledge`
2. Mark documents as **active** to include them in context
3. When an agent calls `/api/queue/dispatch`, the response includes a `context` field with all active document content consolidated into a single string
4. Agents can also query context directly:

```bash
curl -sS "$HADES_API_URL/api/knowledge/context" \
  -H "Authorization: Bearer $HADES_API_KEY" | jq .
```

If no active documents exist, `context` is `null`.

---

## 7. Token Management

Agents can declare a token budget at registration time. Hades tracks remaining tokens and enforces the threshold before assigning work.

### Registration

```bash
curl -sS -X POST "$HADES_API_URL/api/agents/register" \
  -H "Authorization: Bearer $HADES_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "worker-01",
    "name": "Worker 01",
    "role": "worker",
    "workspaceId": "ws_abc123",
    "tokenBudget": 200000,
    "tokenThreshold": 10000
  }' | jq .
```

- `tokenBudget` — total tokens available for the session
- `tokenThreshold` — minimum tokens required to accept a new task; if remaining tokens fall below this, the agent will not be assigned tasks

### `/api/agents/claim` responses

| Status | Meaning |
|--------|---------|
| `200` | Task claimed successfully. Response includes `tokensRemaining`. |
| `204` | No tasks available. |
| `429` | Insufficient tokens. Response includes `tokensRemaining` and `threshold`. |

**Example 200 response:**
```json
{
  "task": { "id": "task_xyz", "title": "..." },
  "tokensRemaining": 45000
}
```

**Example 429 response:**
```json
{
  "error": "insufficient_tokens",
  "tokensRemaining": 8000,
  "threshold": 10000
}
```

---

## 8. Frontend Pages

### Dashboard (`/`)
Overview: stats cards, current task, feature groups, queue, blocked tasks, and activity feed.

### Tasks (`/tasks`)
Full CRUD with filters by status, priority, and text search. Supports batch creation for sprint planning.

### Task Detail (`/tasks/[id]`)
Tabs: Overview, Execution Log, Subtasks, Activity Timeline. Manual controls: Start, Complete, Block, Skip, Unblock, Retry, Edit.

### Features (`/features`)
Manage features/epics. Configure `autoAdvance`, `maxParallel`, and `webhookUrl` per feature.

### Agents (`/agents`)
Register and monitor agents. Includes dead detection for agents that stop sending heartbeats.

### Knowledge Hub (`/knowledge`)
Upload and manage workspace documents. Mark documents active to include them in agent context.

### Analytics (`/analytics`)
Metrics by repository and feature: task counts, completion rates, execution times.

### Metrics (`/metrics`)
Global dashboard: total tokens consumed, estimated cost, daily activity chart, top agents, top features, model distribution.

### History (`/history`)
Completed, cancelled, and failed tasks with filters by period and priority.

### Settings (`/settings`)
Manage workspace, generate API keys, configure integrations (Slack, Jira, Bitbucket, Confluence), and set queue/execution defaults.

---

## 9. Key Concepts

### Task Lifecycle

```
queued → in_progress → done
                     → blocked → (unblock) → queued
                     → failed  → (retry)   → queued
                     → cancelled
```

### Dependencies
Tasks with `dependsOn` will not execute until all listed dependencies reach `done` status. `/api/queue/next` and `/api/queue/dispatch` verify this automatically.

### Parallelism
Tasks in the same `parallelGroup` can run simultaneously. `maxParallel` on a feature caps concurrency within that feature. Use `/api/queue/next-parallel?limit=N` to claim N parallel tasks at once.

### Auto-Advance
When a feature has `autoAdvance: true`, completing a task automatically queues the next eligible task, reducing manual agent intervention.

### Retry
Tasks with `maxRetries > 0` can be retried on failure. Each retry increments `retryCount` and preserves `lastError` as context for the next attempt.

### Dead Agent Detection
Agents must send heartbeats periodically. If an agent stops reporting within the configured timeout, it is marked `offline` and its tasks become reclaimable by other agents.

### agentConfig
`agentConfig` is free-form JSON. Use it to pass any agent-specific configuration (timeouts, model preferences, flags). Hades stores and forwards it as-is.

---

*Last updated: 2026-03-28*
