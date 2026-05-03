# A-Company

Real-time todo processing by 7 AI agents via WebSocket.

## Agents

| Agent | Category | Responsibility |
|---|---|---|
| CEO | all | Analyzes priority & delegates to correct agents |
| CTO | technical | Architecture & tech stack decisions |
| Product Owner | product | User stories & backlog |
| Product Manager | product | Strategy & roadmap |
| Business & Marketing | business | Market analysis & KPIs |
| Engineer | technical | Implementation plan & estimates |
| Designer | design | UI/UX wireframes & deliverables |
| QA | quality | Test plan & quality gates |
| Finalize | — | Wrap up all outputs |

## Pipeline Phases

```
intake → planning → execution → quality → review → delivered
```

Human-in-the-loop gates at **planning approval** and **execution approval**.

## Setup

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edit .env and set OPENAI_API_KEY or ANTHROPIC_API_KEY
npm install
npm run dev
```

Backend runs on **port 3001** with WebSocket at `ws://localhost:3001`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on **http://localhost:5173**.

## Usage

1. Ensure backend is running (WebSocket on port 3001)
2. Open frontend in browser
3. Enter a project title or click an example
4. Watch agents work in real-time on the left panel
5. Review full output in the project detail modal
6. Approve/reject at planning and execution gates

## Workflow

1. **Submit project** → CEO decides accept/reject
2. **Review Planning** → View CTO/PO/PM/BM outputs → Approve/Reject
3. **Start Execution** → Engineer → Designer → QA run
4. **Approve Execution** → Final review → Project delivered
5. **Download PRD/TRD** → Export documentation from project detail modal

## Tech Stack

- **Backend**: Node.js + Express + WebSocket (ws) + LangGraph.js
- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **AI**: OpenAI-compatible API (OpenAI, Anthropic, or MiniMax)

## Documentation

- [Backend Changelog](./backend/CHANGELOG.md)
- [Frontend Changelog](./frontend/CHANGELOG.md)
- [PRD/TRD Plan](./docs/superpowers/plans/2026-05-03-prd-trd-document-generator.md)