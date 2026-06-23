# A-Company

Real-time project processing by 8 AI agents via WebSocket. Submit a project idea — watch agents plan, architect, design, build, and QA it in real time, then download the generated code as a ZIP.

## Agents

| Agent | Role | Output |
|---|---|---|
| CEO | Intake + Final Review | Accept/reject decision, launch approval |
| CTO | Architecture | Tech stack, system design, risks |
| Product Owner | Product | User stories, backlog, sprint plan |
| Product Manager | Strategy | Roadmap, feature priority, competitive analysis |
| Business & Marketing | Business | Market analysis, GTM, KPIs |
| Engineer | Implementation | Plan, code structure, estimates, dependencies |
| Designer | UX/UI | Wireframes, design system, UX flows |
| QA | Quality | Test plan, test cases, quality gates |
| Code Generator | Output | Source files + ZIP (monolith or monorepo) |

## Pipeline

```
intake → planning → execution → quality → review → delivered
```

Human-in-the-loop gates at **planning** (approve CTO/PO/PM/BM output) and **execution** (approve Engineer+Designer output).

## Quick Start

### Option A — Docker (recommended)

```bash
cp backend/.env.example backend/.env
# Edit backend/.env: set ANTHROPIC_API_KEY
docker-compose up --build
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

### Option B — Local dev

**Backend**
```bash
cd backend
cp .env.example .env
# Edit .env: set ANTHROPIC_API_KEY
npm install
npm run dev       # port 3001
```

**Frontend** (separate terminal)
```bash
cd frontend
npm install
npm run dev       # port 5173
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | **Required.** Anthropic API key |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-6` | Model ID |
| `API_KEY` | — | Optional. If set, all HTTP + WS requests must supply it |
| `CORS_ORIGIN` | `*` | Restrict CORS in production (e.g. `https://yourapp.com`) |
| `DB_PATH` | `./data/projects.json` | JSON project store path |
| `GRAPH_TIMEOUT_MS` | `300000` | Max ms per graph invocation (5 min) |
| `WS_RATE_MAX` | `30` | Max WS messages per window per IP |
| `WS_RATE_WINDOW_MS` | `60000` | Rate limit window in ms |

## Usage

1. Open http://localhost:5173
2. Enter a project title + description (or click an example)
3. Watch agents work in real time on the left panel
4. **Planning gate** — review CTO/PO/PM/BM output, click Approve or Reject
5. Click **Start Execution** — Engineer + Designer + Code Gen + QA run
6. **Execution gate** — review output, click Approve
7. View full output in the project detail modal
8. Download generated code as ZIP (monolith or monorepo)
9. Export PRD/TRD documentation from the project detail modal

## Tech Stack

- **Backend**: Node.js + Express + WebSocket (`ws`) + LangGraph.js + `@langchain/anthropic`
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS
- **AI**: Anthropic Claude (configurable model via `ANTHROPIC_MODEL`)
- **Persistence**: JSON file store (`./data/projects.json`)
- **Containerization**: Docker + docker-compose

## Tests

```bash
cd backend && npm test        # vitest unit tests
cd frontend && npm test       # vitest unit tests
```

## Documentation

- [Architecture](./ARCHITECTURE.md)
- [Backend Changelog](./backend/CHANGELOG.md)
- [Frontend Changelog](./frontend/CHANGELOG.md)
