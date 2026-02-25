# Lead Qualifier Agent

AI-powered lead qualification chatbot that collects patient data through a conversational funnel, extracts structured variables with LLM, and qualifies leads using RAG-based vector similarity search against a medical knowledge base.

Built with NestJS, LangGraph, Prisma, and pgvector.

## What It Does

The agent simulates a WhatsApp-style conversation to qualify leads for a weight loss clinic. It guides users through a multi-step funnel, extracts structured data from natural language, and makes a qualification decision based on vector similarity matching.

**Qualification flow:**

```
collect_name → collect_birth_date → collect_weight_loss_reason → qualified / rejected
```

Each step uses LLM extraction to parse unstructured user messages into structured fields. The agent also detects corrections to previously collected data mid-conversation (e.g., "actually my name is Carlos").

The final qualification step compares the user's weight loss reason against a pgvector knowledge base using cosine similarity — leads with reasons that match known treatable conditions (distance ≤ 0.20) are qualified; others are rejected.

### Status Lifecycle

| Status | Trigger | Description |
|--------|---------|-------------|
| `active` | New conversation created | Funnel is in progress |
| `qualified` | Vector similarity ≤ 0.20 | Lead matches treatable conditions |
| `rejected` | Vector similarity > 0.20 | Reason doesn't match knowledge base |
| `expired` | 15 min inactivity | Session timed out, new one created on next message |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | NestJS 11 + TypeScript |
| Database | PostgreSQL + pgvector (Docker) |
| ORM | Prisma 6 with vector extension |
| Agent | LangGraph StateGraph |
| LLM | OpenAI, Google Gemini, or OpenRouter (configurable) |
| Embeddings | text-embedding-3-small / gemini-embedding-001 |
| Frontend | Vanilla HTML/CSS/JS with dark theme |

## Architecture

```
src/
├── agent/
│   ├── graph/
│   │   ├── nodes/
│   │   │   ├── process-message.node.ts   # LLM extraction + correction detection
│   │   │   ├── qualify-lead.node.ts      # Vector similarity qualification
│   │   │   └── generate-response.node.ts # Contextual response generation
│   │   ├── graph.ts                      # LangGraph workflow definition
│   │   └── state.ts                      # FunnelState annotation
│   ├── llm/
│   │   ├── llm.factory.ts               # Multi-provider LLM factory
│   │   └── llm.tokens.ts                # DI tokens (CHAT_MODEL, EMBEDDINGS)
│   └── vector/
│       └── vector-store.service.ts       # pgvector similarity search
├── conversation/
│   ├── conversation.service.ts           # Funnel orchestration + session mgmt
│   └── conversation.controller.ts        # REST API endpoints
├── prisma/
│   └── prisma.service.ts                 # Database connection
└── health/
    └── health.controller.ts              # Health check endpoint
```

**Key design decisions:**
- **Dependency Injection via NestJS IoC** — LLM provider is injected via token + factory, swappable through env config without code changes
- **LangGraph StateGraph** — deterministic funnel flow with conditional routing to qualification node
- **Lazy session expiration** — checked on message receipt, no background scheduler needed

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm
- Docker

### Quick Start (Docker)

```bash
cp .env.example .env
# Edit .env — set LLM_PROVIDER and API key

make ai
# Builds and starts all containers (app + postgres + migrations)
```

Open http://localhost:3000 for the chat UI.

### Manual Setup

```bash
# 1. Start database
docker compose up -d postgres

# 2. Install dependencies
pnpm install

# 3. Run migrations and seed vector store
pnpm db:migrate
pnpm db:seed

# 4. Start dev server
pnpm start:dev
```

### LLM Provider Configuration

Set `LLM_PROVIDER` in `.env` to switch between providers:

| Provider | Env Var | Default Model |
|----------|---------|---------------|
| `openai` | `OPENAI_API_KEY` | gpt-4o-mini |
| `google` | `GOOGLE_API_KEY` | gemini-2.5-flash |
| `openrouter` | `OPENROUTER_API_KEY` | openrouter/free |

## API

### `POST /conversations/:phoneNumber/messages`

Send a message to the qualification funnel.

**Request:**
```json
{ "content": "Oi, meu nome é João" }
```

**Response:**
```json
{
  "type": "text",
  "content": "Obrigado, João! Qual é a sua data de nascimento?",
  "conversation": {
    "phoneNumber": "5511999999999",
    "status": "active",
    "funnelStep": "collect_birth_date",
    "variables": {
      "name": "João",
      "birthDate": null,
      "weightLossReason": null
    }
  }
}
```

### `GET /conversations/:phoneNumber/status`

Get current conversation state and extracted variables.

### `GET /health`

Health check endpoint.

## License

UNLICENSED
