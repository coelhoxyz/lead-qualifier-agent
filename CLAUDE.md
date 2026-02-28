# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Docker (preferred for full stack)
make ai          # Build & start all containers (postgres + migrate + app)
make down        # Stop all containers
make logs        # Tail app container logs

# Development (local)
pnpm start:dev   # Dev server with auto-reload on :3000
pnpm build       # Compile TypeScript
pnpm lint        # ESLint with auto-fix
pnpm format      # Prettier

# Database
pnpm db:migrate  # Run Prisma migrations
pnpm db:seed     # Seed pgvector knowledge base
pnpm db:generate # Regenerate Prisma client

# Tests
pnpm test        # Run unit tests (Jest)
pnpm test:e2e    # Run e2e tests
pnpm test -- --testPathPattern=<pattern>  # Run single test file
```

## Architecture

**Request flow:** HTTP → `ConversationController` → `ConversationService` (session mgmt) → `AgentService` → LangGraph `StateGraph` → Prisma/pgvector → HTTP response.

**LangGraph funnel:** `START` → `processMessage` (LLM extraction) → conditional route → `qualifyLead` (vector similarity) or `generateResponse` (LLM) → `END`. The qualify node only runs when `funnelStep === collect_weight_loss_reason` AND `weightLossReason` exists.

**DI pattern for LLM:** Symbol tokens (`CHAT_MODEL`, `EMBEDDINGS`) registered via `useFactory` in `AgentModule`. The factory reads `LLM_PROVIDER` from env to instantiate OpenAI, Google, or OpenRouter. Services inject via `@Inject(CHAT_MODEL)` — never reference concrete LLM classes.

**Session lifecycle:** Conversations are keyed by `phoneNumber` (unique). Expiration is lazy — checked on message receipt against 15-min timeout (`SESSION_TIMEOUT_MS`). Terminal states: `qualified` (vector distance ≤ 0.20), `rejected` (> 0.20), `expired` (timeout). Old conversations + messages are deleted on phone reuse.

**Modules:** `AppModule` imports `ConfigModule` (global), `ServeStaticModule` (public/), `PrismaModule`, `HealthModule`, `AgentModule`, `ConversationModule`. `PrismaModule` is global. `AgentModule` exports `AgentService` and `VectorStoreService`.

## Key Conventions

- LLM provider is never hardcoded — always injected via token
- Graph nodes return `Partial<FunnelState>` — LangGraph merges updates
- The `processMessage` node detects corrections to previously collected data (not just current step)
- Frontend is vanilla HTML/CSS/JS in `public/` — served by `ServeStaticModule`
- Prisma uses `postgresqlExtensions = [vector]` for pgvector
- Docker: `migrate` service runs migrations + seed before app starts
- All LLM calls use `temperature: 0.3`
- Prettier: single quotes, trailing commas
- ESLint: `@typescript-eslint/no-explicit-any` is off
