# Open Harness on Replit

## Project Overview
This is Vercel Labs' [Open Harness](https://github.com/vercel-labs/open-harness) — an open-source coding agent powered by Vercel Sandboxes. It has been imported into Replit and extended with enterprise-grade secret management.

## Architecture
- **Monorepo** (pnpm workspaces + Turborepo)
- `apps/web` — Next.js 16 app (Turbopack)
- `packages/agent` — AI agent core, tools, system prompt
- `packages/sandbox` — Vercel Sandbox SDK wrapper

**Workflow**: `cd apps/web && bun run dev` → port 5000

## Databases
- **Application DB**: Neon PostgreSQL — connection via `POSTGRES_URL` env var. All sessions, users, chats stored here.
- **Replit DB**: Local PostgreSQL — NOT used by the app (app uses Neon).

## Key Environment Variables
- `POSTGRES_URL` — Neon connection string (required)
- `VERCEL_TOKEN` / `VERCEL_ACCESS_TOKEN` — Vercel API token for sandbox creation
- `VERCEL_TEAM_ID` — Vercel team ID (prefix: `team_nNH2KYpKlb...`)
- `VERCEL_PROJECT_ID` — Vercel project ID (prefix: `prj_QcmaECFRbex...`)
- `ENCRYPTION_KEY` — 64-char hex key for AES-256-GCM secret encryption
- `JWE_SECRET` — Session encryption key
- `NEXT_PUBLIC_VERCEL_APP_CLIENT_ID` / `VERCEL_APP_CLIENT_SECRET` — Vercel OAuth app
- `NEXT_PUBLIC_GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` / `GITHUB_APP_ID` / `GITHUB_APP_PRIVATE_KEY` — GitHub App

## Extended Secret Management Features (All Complete)
All 11 custom secret-management features have been implemented:

1. **Encrypted vault** — AES-256-GCM + HKDF + AAD at rest in Neon
2. **Runtime redaction** — 3-layer console redaction (value registry + 13 structural patterns + URL scrubbing) in `apps/web/lib/security/redact-secrets.ts`
3. **Per-environment scoping** — dev/staging/production env isolation
4. **Lazy injection** — secrets written to `.env.local` + process env on demand
5. **Auto-provisioning** — `check_secrets` / `request_secrets` agent tools
6. **Pre-execution validation** — `validate_env` tool checks presence + format before first use
7. **Frontend-secret-guard** — static analysis tool blocking client-bundle leaks
8. **Encryption at rest** — AES-256-GCM (migrated from legacy AES-256-CBC on startup)
9. **Canonical key registry** — 95 entries, 13 categories in `packages/agent/tools/key-registry.ts`
10. **Log redaction** — patched in `instrumentation.ts` before any other log line
11. **Boundary enforcement** — server/client boundary checks built into agent tool

## Key Files
- `apps/web/lib/security/redact-secrets.ts` — 3-layer redaction (17/17 tests pass)
- `apps/web/instrumentation.ts` — startup redaction patch + Vercel env check
- `apps/web/instrumentation.node.ts` — Node.js-only: CBC→GCM migration on startup
- `packages/agent/tools/key-registry.ts` — canonical key name registry (95 entries)
- `packages/agent/system-prompt.ts` — agent system prompt with all tool descriptions
- `apps/web/app/api/sandbox/route.ts` — sandbox creation API (POST) with logging
- `apps/web/app/api/sandbox/reconnect/route.ts` — sandbox reconnection handler

## Sandbox Initialization Flow
1. Client loads session page → `GET /api/sandbox/reconnect?sessionId=...` is polled
2. If sandbox exists and is alive → `status=connected` → already connected
3. If sandbox expired → `status=expired` → auto-create fires
4. If no sandbox → `status=no_sandbox` → auto-create fires  
5. `POST /api/sandbox` → `connectSandbox()` via `@vercel/sandbox` SDK → 200 OK
6. Lifecycle workflow started (`reason=sandbox-created`)

## BotId
BotId is used server-side only (no middleware). In dev mode, always returns `isBot=false` (HUMAN). The warning "Possible misconfiguration of Vercel BotId" is expected in dev — not a bug.

## System Prompt — Sandbox Runtime Note
The agent system prompt now includes a `### Sandbox runtime constraints` section warning the agent that the Vercel sandbox is a **minimal Linux container** — it has `curl`, `git`, basic shell utilities, but does NOT pre-install `bun`, `tsx`, `ts-node`, `pnpm`, `deno`. The agent must verify tool availability with `which` before use.

## Cost Optimization Notes
- Sandbox timeout: configurable via `DEFAULT_SANDBOX_TIMEOUT_MS`
- `VERCEL_SANDBOX_BASE_SNAPSHOT_ID` (optional) — speeds up cold starts by restoring from snapshot
- Sessions are persistent sandboxes (named `session_<sessionId>`) — resumed instead of recreated when possible
