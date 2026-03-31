# CLAUDE.md — Development Instructions

## Project: Hades
Open source AI agent orchestration platform.

## Architecture
- **Frontend:** Next.js 16 App Router with React 19
- **Backend:** Convex serverless functions (no API routes in Next.js)
- **UI:** shadcn/ui components + Tailwind CSS 4
- **Auth:** Convex Auth (email/password)
- **Real-time:** Convex WebSocket subscriptions via useQuery/useMutation

## Key Conventions
- Use `useQuery` and `useMutation` from `convex/react` for all data
- NO fetch calls or Next.js API routes — everything goes through Convex
- Dark mode by default, responsive design
- TypeScript strict mode

## Directory Structure
- `convex/` — Backend: schema, queries, mutations, HTTP API
- `src/app/` — Pages (Next.js App Router)
- `src/components/` — React components (dashboard/, layout/, tasks/, ui/)
- `src/lib/` — Utilities (Convex provider, helpers)
- `docs/` — Specs and plans

## Development
```bash
npm install
npx convex dev    # Backend (needs Convex login)
npm run dev       # Frontend
```
