# Hades Agent Skill

Connect any AI agent (Claude Code, Codex, etc.) to the Hades orchestration platform.

## What This Does

This skill gives your AI agent the ability to:
- **Claim and execute tasks** from the Hades queue
- **Report progress** and results back to Hades
- **Create tasks** for other agents (orchestrator mode)
- **Access the Knowledge Hub** for workspace context
- **Upload documents** to the Knowledge Hub

## Prerequisites

- `bash`, `curl`, `jq` (usually pre-installed on most systems)
- A Hades workspace with an API key (generate one from Settings in the Hades UI)

## Installation

### 1. Copy the CLI to your PATH

```bash
cp skills/hades-agent/hades ~/.local/bin/
chmod +x ~/.local/bin/hades
```

Or symlink it:

```bash
ln -s $(pwd)/skills/hades-agent/hades ~/.local/bin/hades
```

### 2. Set environment variables

Add to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.):

```bash
export HADES_API_URL="https://your-deployment.convex.site"
export HADES_API_KEY="hds_your_api_key_here"
export HADES_AGENT_ID="my-agent"  # optional, defaults to agent name
```

### 3. Configure your agent

Add the skill reference to your agent's `CLAUDE.md` or system prompt:

```markdown
## Hades Integration
Follow the instructions in skills/hades-agent/SKILL.md for task orchestration.
```

Or copy the `SKILL.md` content directly into your agent's instructions.

### 4. Register the agent

```bash
hades register --name "my-agent" --role worker
```

## Usage

```bash
# Check queue status
hades status

# Claim next task
hades claim

# Get workspace knowledge context
hades context

# Report progress
hades log <taskId> "Implemented the auth middleware"

# Complete a task
hades complete <taskId> "Auth middleware added with JWT validation"

# Create a task (orchestrator)
hades create --title "Add rate limiting" --priority high --repo "org/api"

# See all commands
hades help
```

## How It Works

1. You generate an API key from the Hades web UI (Settings page)
2. The agent uses the `hades` CLI to interact with the Hades HTTP API
3. All communication is via REST — the CLI wraps `curl` calls
4. The agent checks for tasks at session start and between tasks
5. Tasks include descriptions, prompts, and knowledge hub context
6. The agent executes tasks and reports results back
