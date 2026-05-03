# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A-Company — real-time todo processing via 7 AI agents using LangGraph.js + WebSocket.

## Commands

### Backend
```bash
cd backend
cp .env.example .env   # Set MINIMAX_API_KEY or OPENAI_API_KEY
npm install
npm run dev            # Starts on port 3001
```

### Frontend
```bash
cd frontend
npm install
npm run dev            # Starts on port 5173
```

## Architecture

### Backend (LangGraph State Machine)

**Pipeline phases**: intake → planning → execution → quality → review → delivered

**Agents** (in `backend/src/agents/`):
- `ceo.ts` — intake decision + final review
- `cto.ts` — architecture + tech stack
- `product-owner.ts` — user stories + backlog
- `product-manager.ts` — strategy + roadmap
- `business-marketing.ts` — market analysis + KPIs
- `engineer.ts` — implementation plan + estimates
- `designer.ts` — wireframes + UX flows
- `qa.ts` — test plan + quality gates

**Human-in-the-loop gates**:
- `planning_approved` — gates execution after planning phase
- `execution_approved` — gates QA after execution phase

**Key files**:
- `src/graph.ts` — LangGraph state machine with retry logic and phase routing
- `src/state.ts` — CompanyState annotations + ProjectItem type (all agent outputs)
- `src/index.ts` — Express + WebSocket server, in-memory project store

**LLM config** via env vars:
- `LLM_PROVIDER=openai|anthropic`
- `OPENAI_API_KEY` / `ANTHROPIC_MODEL`

### Frontend (React + Vite)

**WebSocket connection** to `ws://localhost:3001` for real-time agent events.

**Component hierarchy**:
- `App.tsx` — main layout + WebSocket provider
- `components/AgentActivity.tsx` — real-time agent event feed
- `components/TodoBoard.tsx` — project board with status
- `components/ProjectDetail.tsx` — full project output per phase

## WebSocket Messages

Client → Server:
- `process_project` — start new project (title + description)
- `start_planning` — run planning phase for accepted project
- `approve_planning` — approve/reject planning output
- `approve_execution` — approve/reject execution output

Server → Client:
- `processing_start`, `agent_event`, `processing_done`, `phase_start`, `project_update`, `error`