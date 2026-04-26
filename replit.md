# Open Harness (Open Agents)

An open-source reference application for building and running background AI coding agents. Goes from a natural language prompt to actual code changes, PRs, and deployments.

## Architecture

Three-layer system:
- **Web Interface**: Next.js 15 app (App Router) — chat UI, auth, streaming updates
- **Agent Workflow**: Background process using Vercel Workflow SDK for durable multi-step execution
- **Sandbox VM**: Isolated execution environment (filesystem, shell, git)

## Tech Stack

- **Runtime**: Bun (strictly required, not npm/yarn)
- **Monorepo**: Turborepo with `apps/` and `packages/`
- **Frontend**: Next.js 15, React 19, Tailwind CSS v4, Radix UI
- **AI**: Vercel AI SDK (Anthropic + OpenAI)
- **Database**: PostgreSQL via Drizzle ORM
- **Cache**: Redis/Upstash KV (optional)
- **Integrations**: GitHub App, Vercel sandboxes, ElevenLabs (voice)

## Project Structure

```
apps/web/          # Main Next.js application
packages/agent/    # Core agent logic (ToolLoopAgent, tools: bash, grep, read, write)
packages/sandbox/  # Execution environment abstraction (local, Vercel, Daytona)
packages/shared/   # Shared utilities, types, hooks
docs/              # Architecture and style documentation
```

## Running on Replit

- **Dev server**: `cd apps/web && bun run dev` on port 5000
- **Single user mode**: `SINGLE_USER_MODE=true` (set in userenv) — bypasses auth
- **Database**: Replit PostgreSQL (DATABASE_URL auto-configured)
- **Encryption**: JWE_SECRET and ENCRYPTION_KEY auto-generated in userenv

## Environment Variables

Required:
- `DATABASE_URL` — Replit PostgreSQL (auto-provisioned)
- `JWE_SECRET` — Min 32 chars for session encryption (auto-generated)
- `ENCRYPTION_KEY` — 64 hex chars for user secrets encryption (auto-generated)
- `SINGLE_USER_MODE` — Set to "true" for single-admin mode without OAuth

Optional (for full feature set):
- `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` — AI model access
- `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, etc. — GitHub integration
- `VERCEL_TOKEN`, `VERCEL_TEAM_ID`, `VERCEL_PROJECT_ID` — Vercel sandboxes
- `DAYTONA_API_KEY` — Alternative sandbox provider
- `REDIS_URL` / `KV_URL` — Optional session/metadata cache
- `ELEVENLABS_API_KEY` — Voice transcription

## Database Migrations

Run migrations manually:
```bash
cd apps/web && bun run db:migrate:apply
```

## Key Files

- `apps/web/next.config.ts` — Next.js config (has Replit allowedDevOrigins)
- `apps/web/lib/env.ts` — Environment variable validation
- `apps/web/lib/db/schema.ts` — Database schema
- `apps/web/lib/session/` — Session management (supports SINGLE_USER_MODE)
- `apps/web/instrumentation.ts` — Startup env validation (Node.js only)
