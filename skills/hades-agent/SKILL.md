# Hades Agent Skill

You are connected to **Hades**, a task orchestration platform. Hades is your work queue — it holds tasks created by orchestrators or humans, and you execute them.

## Configuration

Required environment variables:
- `HADES_API_URL` — The Convex HTTP API URL (e.g., `https://your-deployment.convex.site`)
- `HADES_API_KEY` — Your workspace API key (starts with `hds_`)

## Workflow

### At Session Start

1. Run `hades status` to check if there are pending tasks
2. If tasks are available, run `hades claim` to claim the next one
3. Run `hades context` to get the workspace knowledge hub (shared context for all tasks)
4. Read the task description, agent prompt, and knowledge context
5. Execute the task as described
6. Report progress with `hades log <taskId> "what you did"`
7. When done, run `hades complete <taskId> "summary of result"`
8. Check if you have enough tokens to continue, then `hades claim` the next task
9. If no tasks are available, work normally on whatever the human asks

### Repo Switching

Tasks may target different repositories. If `task.repo` is set and differs from your current directory:
1. Clone or navigate to the target repo
2. Checkout the branch in `task.branch` if specified
3. Execute the task in that repo's context
4. Return to the original directory when done

### When NOT to Check Hades

- When the human is giving you direct instructions
- When you are in the middle of a human-requested task
- The human always has priority over queued tasks

### Error Handling

- If a task is unclear or impossible: `hades block <taskId> "reason"`
- If a task fails and can be retried: `hades retry <taskId>`
- If `hades claim` returns "insufficient_tokens": stop claiming, you are low on tokens. Finish current work and let the human know.
- If `hades claim` returns "No available tasks": no work in the queue, proceed with human tasks

### Token Awareness

When you claim a task, the response includes `tokensRemaining`. If this is low, complete the current task and stop claiming new ones. Do not start a task you cannot finish.

## Available Commands

### Task Consumption
```bash
hades status                          # Queue overview: pending, in progress, blocked counts
hades claim                           # Claim the next available task (returns task JSON)
hades task <taskId>                   # Get details of a specific task
hades context                         # Get workspace knowledge hub (consolidated context)
hades log <taskId> "message"          # Report progress on a task
hades complete <taskId> "result"      # Mark task as completed
hades block <taskId> "reason"         # Mark task as blocked
hades retry <taskId>                  # Retry a failed task
```

### Task Creation (for orchestrator agents)
```bash
hades create --title "Task name" --priority high --repo "org/repo" --description "Details"
hades batch < tasks.json              # Batch create from JSON array via stdin
```

### Agent Management
```bash
hades register --name "my-agent" --role worker
hades heartbeat                       # Send alive signal
```

### Knowledge Hub
```bash
hades upload <file> --name "Document name"   # Upload a document
hades docs                                    # List workspace documents
```

### Utility
```bash
hades whoami                          # Show workspace and agent info
hades help                            # List all commands
```

## Output Format

All commands return JSON to stdout. Parse it to extract the data you need. Errors go to stderr.

Example claim response:
```json
{
  "claimed": true,
  "task": {
    "_id": "abc123",
    "title": "Implement auth middleware",
    "description": "Add JWT validation to all API routes",
    "repo": "github.com/org/api",
    "branch": "feature/auth",
    "agentPrompt": "Focus on security best practices",
    "agentConfig": {},
    "priority": "high"
  },
  "tokensRemaining": 45000
}
```
