# Hades

Open source platform to orchestrate AI agent tasks with dependencies, parallel execution, and real-time monitoring.

## What is Hades?

Hades is a control panel where teams configure, monitor, and manage tasks executed by AI agents. Orchestrator agents create tasks via API, worker agents consume and execute them, and humans supervise and intervene from the UI.

## Features

- **Task orchestration** — Queue tasks with priorities, dependencies, and parallel groups
- **Multi-agent support** — Register agents with specializations, track heartbeats and metrics
- **Real-time monitoring** — Live dashboard with Convex WebSocket subscriptions
- **Feature grouping** — Organize tasks by feature with auto-advance and completion tracking
- **HTTP API** — RESTful API for agent integration (claim tasks, report progress, complete)
- **Metrics & analytics** — Token usage, cost tracking, execution time per agent/feature
- **Webhook integrations** — Notify external systems on task events

## Tech Stack

- **Frontend:** Next.js 16 + React 19
- **Backend:** Convex (serverless, real-time)
- **UI:** shadcn/ui + Tailwind CSS 4
- **Auth:** Convex Auth (email/password)

## Getting Started

### Prerequisites

- Node.js 18+
- A [Convex](https://convex.dev) account (free tier works)
- A [Vercel](https://vercel.com) account (for deployment, optional)

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/AnddyAgudelo/Hades.git
   cd hades
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up Convex:
   ```bash
   npx convex dev
   ```
   This will prompt you to log in and create a project. It will generate `.env.local` with your Convex URL.

4. Start the dev server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) and create an account.

### Deploy to Production

1. Deploy Convex backend:
   ```bash
   npx convex deploy
   ```

2. Deploy to Vercel:
   ```bash
   npx vercel
   ```

   Set environment variables in Vercel:
   - `NEXT_PUBLIC_CONVEX_URL` — Your Convex deployment URL
   - `CONVEX_DEPLOYMENT` — Your deployment identifier

## Connect Your AI Agent

Hades includes a skill and CLI so any AI agent (Claude Code, etc.) can connect to the platform and execute tasks.

### 1. Install the CLI

```bash
cp skills/hades-agent/hades ~/.local/bin/
chmod +x ~/.local/bin/hades
```

### 2. Configure environment

```bash
export HADES_API_URL="https://your-deployment.convex.site"
export HADES_API_KEY="hds_your_api_key_here"
```

Generate an API key from the Hades UI: **Settings > API Keys > Generate Key**.

### 3. Register your agent

```bash
hades register --name "my-agent" --role worker
```

### 4. Add instructions to your agent

Add to your agent's `CLAUDE.md`:

```markdown
## Hades Integration
Follow the instructions in skills/hades-agent/SKILL.md for task orchestration.
```

### 5. Your agent is ready

The agent will check Hades for tasks at session start, execute them, and report results. See [skills/hades-agent/README.md](skills/hades-agent/README.md) for the full guide.

```bash
hades status     # Check queue
hades claim      # Claim a task
hades context    # Get knowledge hub
hades complete <taskId> "Done"  # Complete task
hades help       # All commands
```

## API Reference

See [GUIDE.md](GUIDE.md) for the complete HTTP API documentation.

## License

MIT
