# A-Company Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                        │
│                    http://localhost:5173                          │
└───────────────────────────────┬─────────────────────────────────┘
                                │ WebSocket (ws://) + HTTP (REST)
┌───────────────────────────────▼─────────────────────────────────┐
│                    Backend (Express + LangGraph)                   │
│                    http://localhost:3001                          │
│                                                                  │
│  ┌─────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │  Auth +     │  │  LangGraph       │  │  JSON File DB    │   │
│  │  Rate Limit │  │  State Machine   │  │  ./data/projects │   │
│  └─────────────┘  └──────────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Frontend Architecture

```
App.tsx
└── useWebSocket (hooks/useWebSocket.ts)
    ├── State: projects, events, processing, pendingGate
    ├── State: isGenerating, zipUrl, codeGenMode, generatingProjectId
    └── Actions: sendProject, startPlanning, approvePlanning,
                 startExecution, approveExecution,
                 startCodeGeneration, generateDesign, clearZipUrl

Components:
├── AgentActivity.tsx        # Real-time event feed (left panel)
├── ProjectBoard.tsx         # Kanban (intake → delivered)
│   └── ProjectCard → onGenerateCode
├── ProjectDetail.tsx        # Full per-phase output modal
├── CodeGenModal.tsx         # Monolith/monorepo selector
└── ErrorBoundary.tsx        # Top-level error boundary

Utils:
└── documentGenerator.ts    # PRD/TRD export (markdown/PDF)
```

### State Flow
```
User action → App.tsx handler → useWebSocket.send*() → WebSocket → Backend
Backend → WebSocket message → useWebSocket setState → React re-render
Projects synced to localStorage (key: "acompany_projects")
```

---

## Backend Architecture

```
src/index.ts                   ← entry point
└── src/server.ts              ← Express + WebSocketServer
    ├── Middleware: cors, express.json, rateLimit (HTTP)
    ├── Middleware: requireApiKey (HTTP), isValidWsKey (WS)
    ├── Middleware: WsRateLimiter (per-IP WS)
    ├── REST: makeRestRouter()
    │   ├── GET  /health
    │   ├── GET  /projects
    │   ├── GET  /projects/:id
    │   ├── POST /projects
    │   └── GET  /download/:projectId   ← streams ZIP
    └── WebSocket: ws-handlers.ts
        ├── process_project
        ├── start_planning
        ├── approve_planning
        ├── start_execution
        ├── approve_execution
        ├── generate_code
        └── generate_design

src/db.ts                      ← JSON file store (./data/projects.json)
src/graph.ts                   ← buildGraph(emit) — LangGraph state machine
src/state.ts                   ← CompanyState, ProjectItem, getModel()
src/generators/                ← file-writer, zip-handler, security-validator
src/middleware/                ← auth.ts, wsRateLimit.ts
```

---

## LangGraph Pipeline (actual graph edges)

```
                    ┌─────────────┐
                    │  ceo_intake │
                    └──────┬──────┘
                           │ accepted / rejected
                    ┌──────▼──────┐
                    │  planning_  │   ← no-op node; gate logic is
                    │ checkpoint  │     in separate graph invocations
                    └──────┬──────┘
                           │
           ┌───────────────▼───────────────┐
           ▼               ▼               ▼
      ┌─────────┐   ┌────────────┐  ┌──────────────────┐
      │   CTO   │   │   (also    │  │    (also from     │
      └────┬────┘   │   from CTO)│  │     CTO)          │
           │        └────────────┘  └──────────────────┘
           │
     (fans out)
     ┌──────┬──────────┬──────────────┐
     ▼      ▼          ▼              ▼
   (CTO)  product_  product_   business_
          owner     manager    marketing
     └──────┴──────────┴──────────────┘
                    │ (fan-in)
           ┌────────▼────────┐
           │  execution_     │   ← no-op; gate in separate invocation
           │  checkpoint     │
           └────────┬────────┘
                    │
           ┌────────▼────────┐
           │ execution_router│   ← fans out
           └──────┬──────────┘
                  │
         ┌────────┴────────┐
         ▼                 ▼
    ┌──────────┐     ┌──────────┐
    │ engineer │     │ designer │   ← parallel
    └────┬─────┘     └────┬─────┘
         └────────┬────────┘
                  │ (fan-in)
           ┌──────▼──────┐
           │  code_gen   │   ← writes files + ZIP
           └──────┬──────┘
                  │
           ┌──────▼──────┐
           │     qa      │
           └──────┬──────┘
                  │
           ┌──────▼──────┐
           │  ceo_review │   ← deterministic (checks all outputs populated)
           └──────┬──────┘
                  │
           ┌──────▼──────┐
           │   finalize  │──▶ END
           └─────────────┘
```

---

## Phase → Agent Mapping

| Phase       | Agent(s)                              | Human Gate          |
|-------------|---------------------------------------|---------------------|
| `intake`    | CEO (intake)                          | No                  |
| `planning`  | CTO, PO, PM, BM (parallel after CTO)  | `planning_approved` |
| `execution` | Engineer + Designer (parallel)        | `execution_approved`|
| `quality`   | Code Generator → QA                   | No                  |
| `review`    | CEO (review, deterministic)           | No                  |
| `delivered` | —                                     | —                   |

---

## Human-in-the-Loop Design

The gates are **not** blocking nodes inside the graph. The graph runs once per phase:

```
Phase 1 — Intake (process_project):
  CEO → accept or reject → graph ends

Phase 2 — Planning (start_planning):
  CTO → PO/PM/BM (parallel) → graph ends
  Client reviews output, then approves via approve_planning

Phase 3 — Execution (start_execution, requires planning_approved):
  Engineer + Designer (parallel) → code_gen → QA → CEO review → finalize
  Client reviews output, then approves via approve_execution
```

---

## Key Files

```
backend/src/
├── index.ts                  # Entry point
├── server.ts                 # Express + WebSocket setup
├── graph.ts                  # LangGraph state machine
├── state.ts                  # CompanyState, ProjectItem, getModel()
├── db.ts                     # JSON file store
├── validation.ts             # Input validation (title/description)
├── agents/
│   ├── ceo.ts                # ceoIntake + deterministicReview
│   ├── cto.ts
│   ├── product-owner.ts
│   ├── product-manager.ts
│   ├── business-marketing.ts
│   ├── engineer.ts
│   ├── designer.ts
│   ├── qa.ts
│   ├── code-generator.ts     # LLM → file manifest → zip
│   ├── design-generator.ts
│   └── utils/
│       ├── utils.ts          # parseAgentResponse (robust JSON extractor)
│       └── agent-factory.ts
├── generators/
│   ├── index.ts
│   ├── file-writer.ts        # Validates + writes files to disk
│   ├── zip-handler.ts        # archiver wrapper
│   └── security-validator.ts # Path traversal, extension, size checks
├── handlers/
│   ├── ws-handlers.ts        # WS message dispatch
│   └── rest-handlers.ts      # REST route handlers
└── middleware/
    ├── auth.ts               # requireApiKey, isValidWsKey
    └── wsRateLimit.ts        # WsRateLimiter class

frontend/src/
├── App.tsx
├── models.ts                 # Shared types (mirrors backend state)
├── hooks/useWebSocket.ts     # All WS + state logic
├── utils/documentGenerator.ts
└── components/
    ├── AgentActivity.tsx
    ├── AgentActivityDetail.tsx
    ├── AgentDetail.tsx
    ├── ProjectBoard.tsx
    ├── ProjectDetail.tsx
    ├── CodeGenModal.tsx
    ├── TodoBoard.tsx
    └── ErrorBoundary.tsx
```

---

## WebSocket Message Contract

### Client → Server

| Message            | Payload                             | Description                    |
|--------------------|-------------------------------------|--------------------------------|
| `process_project`  | `{title, description}`              | CEO intake (phase 1)           |
| `start_planning`   | `{project_id}`                      | Run planning phase (phase 2)   |
| `approve_planning` | `{project_id, approve, notes?}`     | Human gate: approve/reject     |
| `start_execution`  | `{project_id}`                      | Run execution phase (phase 3)  |
| `approve_execution`| `{project_id, approve, notes?}`     | Human gate: approve/reject     |
| `generate_code`    | `{project_id, mode}`                | Manual code gen (re-trigger)   |
| `generate_design`  | `{project_id}`                      | Generate design files          |

### Server → Client

| Message                   | Payload                             | Description                |
|---------------------------|-------------------------------------|----------------------------|
| `connected`               | `{message}`                         | WS handshake               |
| `processing_start`        | `{project}`                         | Graph started              |
| `phase_start`             | `{project, phase}`                  | New phase began            |
| `agent_event`             | `AgentEvent`                        | Real-time agent update     |
| `project_update`          | `{project}`                         | Full project state sync    |
| `processing_done`         | `{project}`                         | Graph complete             |
| `code_gen_start`          | `{project_id}`                      | Code gen started           |
| `code_gen_done`           | `{project_id, metadata}`            | Code gen complete          |
| `code_gen_download_ready` | `{project_id, zip_url}`             | ZIP ready at `/download/`  |
| `code_gen_error`          | `{project_id, message}`             | Code gen failed            |
| `design_gen_start`        | `{project_id}`                      | Design gen started         |
| `design_gen_done`         | `{project_id, metadata}`            | Design gen complete        |
| `design_gen_download_ready`| `{project_id, output_path}`        | Design files ready         |
| `design_gen_error`        | `{project_id, message}`             | Design gen failed          |
| `error`                   | `{message}`                         | Handler error              |

---

## Security

- **API key auth**: `X-API-Key` header (HTTP) or `?key=` query param (WS). Bypassed when `API_KEY` env unset.
- **CORS**: configurable via `CORS_ORIGIN` env (defaults to `*` — set in production).
- **HTTP rate limit**: 100 req / 15 min per IP (express-rate-limit).
- **WS rate limit**: 30 msg / 60s per IP (custom `WsRateLimiter`).
- **Code gen security**: `security-validator.ts` blocks path traversal, absolute paths, blocked extensions (`.sh`, `.exe`, `.dll`, etc.), files > 1MB, and > 500 files per manifest.
- **Download endpoint**: `projectId` sanitized to `[a-zA-Z0-9-]` before path construction.

---

## Known Production Gaps

| # | Gap | Risk | Fix |
|---|-----|------|-----|
| 1 | `db.ts` no write locking | Concurrent saves corrupt JSON | Add write queue or switch to SQLite |
| 2 | `WsRateLimiter` Map unbounded | Memory leak on long-running server | Add `setInterval` cleanup per window |
| 3 | No graceful shutdown | In-flight writes lost on SIGTERM | Add `process.on('SIGTERM')` handler |
| 4 | Frontend Docker = Vite dev server | Not production-grade | Build with nginx + `npm run build` |
| 5 | Generated ZIPs never purged | Disk bloat | Add TTL cleanup job |
| 6 | `CORS_ORIGIN` defaults `*` | Open to any origin | Set explicitly in production |
| 7 | No TLS | HTTP/WS in plaintext | Terminate at nginx/ALB |
