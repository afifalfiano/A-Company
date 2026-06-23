# Pixel Office — Design Spec
**Date:** 2026-06-24  
**Status:** Approved  
**Feature:** Pixel art office animation panel for Happy-Agents frontend

---

## Overview

Replace the static `AgentActivity` text feed with a toggleable view: a live pixel art office scene where 8 AI agents are represented as pixel characters, walking between desks when communicating and animating at their workstations while active.

---

## Layout

```
┌─────────────────────────────────────────────────┐
│  🪟        🪟        🪟        🪟        🪟      │  ← wall + windows
│                                                  │
│  [CEO] [CTO]         [PM] [PO] [BM]             │
│   leadership cluster    planning cluster         │
│                                                  │
│            [ MEETING ROOM ]                      │
│                                                  │
│          [ENG]  [DES]  [QA]                     │
│              execution cluster                   │
└─────────────────────────────────────────────────┘
```

- **Leadership cluster (left):** CEO, CTO
- **Planning cluster (right):** PM, PO, BM
- **Meeting room (center):** shared space for multi-agent discussion animations
- **Execution cluster (below meeting room):** ENG, DES, QA grouped together

Pipeline flows visually: left → meeting room → bottom.

---

## Toggle UI

Lives inside `AgentActivity.tsx`:

```
[ 🏢 Office ]  [ 📋 Log ]
```

- Default view: **Office**
- Toggle state is local to `AgentActivity` — no prop drilling, no global state
- `OfficeCanvas` and the existing log feed are conditionally rendered

---

## Files

| File | Action | Purpose |
|---|---|---|
| `src/components/AgentActivity.tsx` | Modify | Add toggle header, conditionally render office or log |
| `src/components/OfficeCanvas.tsx` | Create | React canvas component, game loop, renders engine state |
| `src/components/OfficeEngine.ts` | Create | Pure state machine — agents, walkers, no DOM/React |

No backend changes. No new WebSocket messages. No new state in `useWebSocket`.

---

## Agent State Machine

Each agent has one of four states:

```
idle → walking → working → done
```

- `idle`: subtle desk animation (head bob, occasional look left/right, randomised per agent)
- `walking`: agent moves from current position to target desk via linear interpolation
- `working`: bobbing animation + screen glow + blinking cursor on monitor
- `done`: checkmark badge, no animation

---

## Walker System

A walker is:
```ts
interface Walker {
  agentId: AgentName;
  from: { x: number; y: number };
  to:   { x: number; y: number };
  startTime: number;
  duration: number;  // ms
}
```

- Multiple walkers coexist simultaneously — fan-out events spawn N walkers at once
- Each frame: lerp walker position from `from` → `to` based on elapsed time
- On arrival: agent state → `working`
- Speech bubble appears mid-walk (after 60% of travel distance)

---

## Event → Walk Trigger Map

| Agent event received | Walkers spawned |
|---|---|
| `cto` started | CEO walks to CTO desk |
| `pm` started | CTO walks to PM desk |
| `po` started | CTO walks to PO desk |
| `bm` started | CTO walks to BM desk |
| `engineer` started | PM + PO walk to ENG desk simultaneously |
| `designer` started | BM walks to DES desk |
| `qa` started | ENG + DES walk to QA desk simultaneously |
| `execution_approved` gate | ENG + DES walk to meeting room first, then to desks |
| `ceo_review` started | QA walks to CEO desk |

---

## Idle Animations

When no project is running (all agents `idle`):
- Slow head bob: `sin(time / 1200) * 1.5px` offset, phase offset per agent
- Eye shift: every ~3s (randomised ±1s per agent), eyes move left or right for 0.8s
- No walking during idle — agents stay at desks

---

## Draw System (Canvas 2D, procedural)

All graphics drawn with `fillRect` only — no images, no external assets.

**Per agent frame:**
1. Shadow (globalAlpha 0.2, ellipse via rect)
2. Head (8×8 px block in agent color)
3. Eyes (1×2 px black rects, offset by idle/walk state)
4. Mouth (4×1 px)
5. Body (6×7 px in agent color, white collar accent)
6. Arms (2×5 px, animated angle from sin wave)
7. Legs (2×5 px, walk cycle from sin wave)
8. Shoes (4×2 px dark)

**Desk:**
- Surface + legs (brown tones)
- Monitor (dark rect, blue glow when `working`)
- Blinking cursor when `working`
- Screen scanlines (semi-transparent color stripes)
- Name label below

**Office:**
- Dark wall + pixel windows (cross-frame, light ray effect)
- Floor with tile grid (semi-transparent lines)
- Meeting room (bordered rect, table, chairs)
- Agent color glows via `ctx.shadowBlur` when `working`

---

## OfficeEngine API

```ts
class OfficeEngine {
  processEvent(event: AgentEvent): void   // called on each WS agent_event
  tick(timestamp: number): OfficeState    // called each animation frame
  reset(): void                           // called when processing_start fires
}

interface OfficeState {
  agents: Record<AgentName, AgentRenderState>;
  walkers: Walker[];
}

interface AgentRenderState {
  state: 'idle' | 'walking' | 'working' | 'done';
  x: number;
  y: number;
  idlePhase: number;   // unique per agent for varied idle animation
}
```

---

## OfficeCanvas Props

```ts
interface OfficeCanvasProps {
  events: AgentEvent[];
  activeAgent: AgentName | null;
}
```

Reads from existing `useWebSocket` return values — already available as props in `AgentActivity`.

---

## What's Explicitly Out of Scope

- Real sprite sheet art (can be added later as a visual polish pass)
- Isometric / 2.5D perspective
- Pathfinding (walkers use direct straight-line paths between desk positions)
- Sound effects
- Mobile/touch layout
