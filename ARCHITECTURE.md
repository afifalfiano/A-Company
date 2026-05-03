# A-Company Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React + Vite)                  │
│                         ws://localhost:5173                      │
└───────────────────────────────┬─────────────────────────────────┘
                                │ WebSocket / HTTP
┌───────────────────────────────▼─────────────────────────────────┐
│                         Backend (Express + LangGraph)             │
│                         ws://localhost:3001                      │
│                                                                  │
│  ┌──────────┐   ┌──────────────────┐   ┌──────────────────┐    │
│  │  CE0     │──▶│  State Machine   │◀──│  Human Gates     │    │
│  │  Intake  │   │  (LangGraph)    │   │  planning/exec   │    │
│  └──────────┘   └──────────────────┘   └──────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Frontend Architecture

```
App.tsx
├── useWebSocket (custom hook - all WS logic)
│   ├── projects, events, processing state
│   ├── isGenerating, zipUrl, codeGenMode
│   └── sendProject, startPlanning, approvePlanning, approveExecution, startCodeGeneration
│
├── AgentActivity.tsx          # Real-time event feed
├── ProjectBoard.tsx           # Kanban board (intake → delivered)
│   └── ProjectCard → onGenerateCode
├── ProjectDetail.tsx          # Full phase output view
└── CodeGenModal.tsx          # Monolith/monorepo code gen
```

### State Flow
```
User action → App.tsx handler → useWebSocket.send*() → WebSocket → Backend
Backend → WebSocket message → useWebSocket.setState() → React re-render
```

---

## Backend Architecture

```
index.ts
├── Express (HTTP)
│   ├── GET  /health
│   ├── GET  /download/:projectId  (serve zip)
│   └── WebSocket /ws
│
├── In-memory store (Map<projectId, ProjectItem>)
│
└── LangGraph State Machine
    └── buildGraph(emit)
```

---

## LangGraph Pipeline (7 AI Agents)

```
                    ┌─────────────┐
                    │    CEO      │
                    │  (Intake)   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Planning   │
                    │  Gate       │
                    │  (human)    │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         ┌────────┐  ┌─────────┐  ┌────────────┐
         │  CTO   │─▶│    PO   │─▶│    PM      │
         └────────┘  └─────────┘  └─────┬──────┘
                                        │
                                 ┌──────▼──────┐
                                 │     BM      │
                                 │ (Business)  │
                                 └──────┬──────┘
                                        │
                    ┌───────────────────┴───────────────────┐
                    │        Execution Gate (human)         │
                    └───────────────────┬───────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
               ┌──────────┐      ┌──────────┐      ┌──────────┐
               │ Engineer │ ───▶ │ Designer │ ───▶ │    QA    │
               └──────────┘      └──────────┘      └─────┬────┘
                                                        │
                    ┌───────────────────────────────────┘
                    ▼
               ┌──────────────┐
               │   Code Gen   │
               │ (monolith/   │
               │  monorepo)   │
               └──────┬───────┘
                      │
               ┌──────▼───────┐
               │     CEO      │
               │   Review     │
               └──────┬───────┘
                      │
               ┌──────▼───────┐
               │   Finalize   │──▶ END (delivered)
               └──────────────┘
```

---

## Phase → Agent Mapping

| Phase         | Agent(s)           | Human Gate |
|---------------|--------------------|------------|
| `intake`      | CEO                | No         |
| `planning`    | CTO, PO, PM, BM    | `planning_approved` |
| `execution`  | Engineer, Designer, QA | `execution_approved` |
| `quality`     | Code Generator     | No         |
| `review`      | CEO                | No         |
| `delivered`   | —                  | —          |

---

## Key Files

```
backend/src/
├── index.ts              # Express + WebSocket server
├── graph.ts              # LangGraph state machine
├── state.ts              # CompanyState, ProjectItem type
└── agents/
    ├── ceo.ts            # intake + final review
    ├── cto.ts            # architecture + tech stack
    ├── product-owner.ts  # user stories + backlog
    ├── product-manager.ts # strategy + roadmap
    ├── business-marketing.ts # market analysis + KPIs
    ├── engineer.ts        # implementation plan + estimates
    ├── designer.ts       # wireframes + UX flows
    ├── qa.ts             # test plan + quality gates
    └── code-generator.ts # zip generation (monolith/monorepo)

frontend/src/
├── App.tsx               # main layout + state orchestration
├── hooks/useWebSocket.ts # all WS communication
├── models.ts             # shared types
└── components/
    ├── AgentActivity.tsx  # real-time event feed
    ├── ProjectBoard.tsx    # kanban columns
    ├── ProjectDetail.tsx   # per-phase output
    └── CodeGenModal.tsx    # code gen trigger
```

---

## WebSocket Message Contract

### Client → Server
| Message | Payload | Description |
|---------|---------|-------------|
| `process_project` | `{title, description}` | Start new project |
| `start_planning` | `{project_id}` | Run planning phase |
| `approve_planning` | `{project_id, approved}` | Human gate |
| `start_execution` | `{project_id}` | Run execution phase |
| `approve_execution` | `{project_id, approved}` | Human gate |
| `generate_code` | `{project_id, mode}` | Generate code (mode: `monolith` \| `monorepo`) |

### Server → Client
| Message | Payload | Description |
|---------|---------|-------------|
| `processing_start` | `{project_id}` | Pipeline started |
| `phase_start` | `{phase}` | New phase began |
| `agent_event` | `AgentEvent` | Real-time agent update |
| `project_update` | `{project}` | Full project state sync |
| `processing_done` | `{project_id}` | Pipeline complete |
| `code_gen_start` | `{project_id}` | Code gen started |
| `code_gen_done` | `{project_id, metadata}` | Code gen complete |
| `code_gen_download_ready` | `{project_id, zip_url}` | ZIP ready |
| `error` | `{message}` | Error occurred |

---

## Human-in-the-Loop Gates

```
Planning Gate
────────────────────────────────────
if (!planning_approved) → wait
if (planning_approved === true) → continue
if (planning_approved === false) → CEO rejects, project finalize

Execution Gate
────────────────────────────────────
if (!execution_approved) → wait
if (execution_approved === true) → continue engineer
if (execution_approved === false) → re-run engineer with revision
```