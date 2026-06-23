# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Happy-Agents — real-time project processing via 8 AI agents using LangGraph.js + WebSocket. Pipeline produces planning docs, code, and a downloadable ZIP.

## Commands

### Backend
```bash
cd backend
cp .env.example .env   # Set ANTHROPIC_API_KEY and ANTHROPIC_MODEL
npm install
npm run dev            # Starts on port 3001
npm test               # vitest unit tests
```

### Frontend
```bash
cd frontend
npm install
npm run dev            # Starts on port 5173
```

### Docker (full stack)
```bash
docker-compose up --build
```

## Architecture

### Backend (LangGraph State Machine)

**Pipeline phases**: intake → planning → execution → quality → review → delivered

**Agent execution order** (actual graph edges in `src/graph.ts`):
1. `ceo_intake` — accept/reject project
2. `cto` → fans out to `product_owner`, `product_manager`, `business_marketing` in **parallel**
3. All three fan-in to `execution_checkpoint`
4. `execution_router` fans out to `engineer` + `designer` in **parallel**
5. Both `engineer` and `designer` fan-in to `code_gen`
6. `code_gen` → `qa` → `ceo_review` → `finalize`

**Human-in-the-loop gates** (separate graph invocations, not blocking nodes):
- `planning_approved` — client calls `start_planning`; graph runs CTO+PO+PM+BM
- `execution_approved` — client calls `start_execution`; graph runs Engineer+Designer+CodeGen+QA

**Key files**:
- `src/index.ts` — entry point, boots server
- `src/server.ts` — Express app + WebSocketServer, rate limiting, auth middleware
- `src/graph.ts` — LangGraph state machine with `withRetry` and phase routing
- `src/state.ts` — CompanyState annotations + ProjectItem type + `getModel()` factory
- `src/db.ts` — JSON file store at `./data/projects.json` (no locking — avoid concurrent writes)
- `src/handlers/ws-handlers.ts` — all WebSocket message handlers
- `src/handlers/rest-handlers.ts` — REST endpoints (GET/POST /projects, GET /download/:id)
- `src/middleware/auth.ts` — API key auth (HTTP header + WS query param)
- `src/middleware/wsRateLimit.ts` — in-memory per-IP WS rate limiter
- `src/agents/` — one file per agent + `utils/` (parseAgentResponse, agent-factory)
- `src/generators/` — file-writer, zip-handler, security-validator (used by code-generator)

**LLM config** via env vars:
- `ANTHROPIC_API_KEY` — required
- `ANTHROPIC_MODEL` — default `claude-sonnet-4-6`
- `API_KEY` — optional; if set, required on all HTTP + WS connections
- `CORS_ORIGIN` — default `*` (set explicitly in production)
- `DB_PATH` — default `./data/projects.json`
- `GRAPH_TIMEOUT_MS` — default `300000` (5 min per graph invocation)
- `WS_RATE_MAX` / `WS_RATE_WINDOW_MS` — WS rate limit defaults: 30 msgs / 60s

### Frontend (React + Vite)

**WebSocket connection** to `ws://localhost:3001` with exponential backoff reconnect (max 5 attempts).
Projects persisted to `localStorage` key `happy_agents_projects`.

**Component hierarchy**:
- `App.tsx` — main layout, passes hook values to components
- `hooks/useWebSocket.ts` — all WS logic, project state, gate state
- `components/AgentActivity.tsx` — real-time event feed
- `components/ProjectBoard.tsx` — kanban columns (intake → delivered)
- `components/ProjectDetail.tsx` — full phase output per project
- `components/CodeGenModal.tsx` — triggers code gen (monolith/monorepo)
- `components/ErrorBoundary.tsx` — top-level error boundary
- `utils/documentGenerator.ts` — PRD/TRD export logic

## WebSocket Messages

Client → Server:
- `process_project` `{title, description}` — start new project (CEO intake)
- `start_planning` `{project_id}` — run planning phase
- `approve_planning` `{project_id, approve, notes?}` — human gate
- `start_execution` `{project_id}` — run execution phase
- `approve_execution` `{project_id, approve, notes?}` — human gate
- `generate_code` `{project_id, mode}` — manual code gen (mode: `monolith`|`monorepo`)
- `generate_design` `{project_id}` — generate design files

Server → Client:
- `connected`, `processing_start`, `phase_start`, `agent_event`, `processing_done`
- `project_update`, `error`
- `code_gen_start`, `code_gen_done`, `code_gen_download_ready`, `code_gen_error`
- `design_gen_start`, `design_gen_done`, `design_gen_download_ready`, `design_gen_error`

## Known Production Gaps

1. **DB race condition** — `db.ts` load→modify→write has no locking; concurrent saves can corrupt the JSON file
2. **WsRateLimiter memory leak** — IP map grows unbounded; add `setInterval` cleanup
3. **No graceful shutdown** — add SIGTERM handler to flush db before exit
4. **Frontend Docker** — runs Vite dev server; production needs nginx + `npm run build`
5. **Generated ZIPs not purged** — `./generated/*.zip` accumulate; add TTL cleanup
6. **CORS default `*`** — set `CORS_ORIGIN` explicitly in production env
