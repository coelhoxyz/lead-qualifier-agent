# Lead Qualifier Agent

NestJS API that processes WhatsApp-style messages using LangGraph, extracts funnel variables, qualifies leads based on RAG (pgvector), and manages session expiration.

## Stack

- NestJS + TypeScript
- PostgreSQL + pgvector (Docker)
- Prisma ORM
- LangGraph (StateGraph)
- OpenAI (GPT-4o-mini + text-embedding-3-small)

## Setup

### 1. Prerequisites

- Node.js 20+
- pnpm
- Docker

### 2. Environment

```bash
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

### 3. Start Database

```bash
docker compose up -d
```

### 4. Install Dependencies

```bash
pnpm install
```

### 5. Run Migrations

```bash
pnpm db:migrate
```

### 6. Seed Vector Store

```bash
pnpm db:seed
```

### 7. Start Server

```bash
pnpm start:dev
```

Open http://localhost:3000 for the chat UI.

## API Endpoints

### `GET /health`

Health check.

### `POST /conversations/:phoneNumber/messages`

Send a message to the lead qualification funnel.

```json
{ "content": "Oi" }
```

### `GET /conversations/:phoneNumber/status`

Get conversation status and extracted variables.

## Funnel Flow

1. **collect_name** - Asks for the lead's name
2. **collect_birth_date** - Asks for birth date
3. **collect_weight_loss_reason** - Asks for the reason they want to lose weight
4. **qualified/rejected** - RAG similarity search determines if the reason is strong enough
