# Pixel Office Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a toggleable pixel art office animation panel to `AgentActivity` where 8 AI agents are represented as animated pixel characters that walk between desks when communicating.

**Architecture:** Pure Canvas 2D procedural pixel art. `OfficeEngine.ts` is a framework-free state machine that processes `AgentEvent` objects and returns renderable state each tick. `OfficeCanvas.tsx` owns the `<canvas>` element, runs the `requestAnimationFrame` loop, and calls draw functions. `AgentActivity.tsx` gains a `🏢 Office / 📋 Log` toggle that conditionally renders either view.

**Tech Stack:** React, Canvas 2D API, TypeScript, Vitest (existing)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `frontend/src/components/OfficeEngine.ts` | Create | Pure state machine — agent states, walker spawning, tick |
| `frontend/src/components/OfficeEngine.test.ts` | Create | Unit tests for engine (no DOM/canvas needed) |
| `frontend/src/components/OfficeCanvas.tsx` | Create | Canvas component — draw loop + all pixel draw functions |
| `frontend/src/components/AgentActivity.tsx` | Modify | Add toggle header, conditionally render Office or Log view |

---

## Task 1: OfficeEngine — types and desk positions

**Files:**
- Create: `frontend/src/components/OfficeEngine.ts`
- Create: `frontend/src/components/OfficeEngine.test.ts`

- [x] **Step 1: Create `OfficeEngine.test.ts` with type-shape test**

```typescript
// frontend/src/components/OfficeEngine.test.ts
import { describe, it, expect } from 'vitest';
import { OfficeEngine, DESK_POS } from './OfficeEngine';

describe('DESK_POS', () => {
  it('has entries for all 8 office agents', () => {
    const officeAgents = ['ceo','cto','product_manager','product_owner',
      'business_marketing','engineer','designer','qa'];
    for (const id of officeAgents) {
      expect(DESK_POS[id]).toBeDefined();
      expect(DESK_POS[id].x).toBeGreaterThan(0);
      expect(DESK_POS[id].x).toBeLessThan(1);
      expect(DESK_POS[id].y).toBeGreaterThan(0);
      expect(DESK_POS[id].y).toBeLessThan(1);
    }
  });

  it('leadership cluster is left of planning cluster', () => {
    expect(DESK_POS['ceo'].x).toBeLessThan(DESK_POS['product_manager'].x);
    expect(DESK_POS['cto'].x).toBeLessThan(DESK_POS['product_manager'].x);
  });

  it('execution cluster is below desk row', () => {
    expect(DESK_POS['engineer'].y).toBeGreaterThan(DESK_POS['ceo'].y);
    expect(DESK_POS['designer'].y).toBeGreaterThan(DESK_POS['ceo'].y);
    expect(DESK_POS['qa'].y).toBeGreaterThan(DESK_POS['ceo'].y);
  });
});
```

- [ ] **Step 2: Run test — expect failure (module not found)**

```bash
cd frontend && npx vitest run src/components/OfficeEngine.test.ts
```
Expected: `Cannot find module './OfficeEngine'`

- [ ] **Step 3: Create `OfficeEngine.ts` with types and positions**

```typescript
// frontend/src/components/OfficeEngine.ts
import type { AgentEvent, AgentName } from '../models';

export type AgentAnimState = 'idle' | 'working' | 'done';

export interface AgentRenderState {
  state: AgentAnimState;
  idlePhase: number;  // per-agent phase offset for varied idle animation
}

export interface Walker {
  id: string;
  agentId: AgentName;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  startTime: number;
  duration: number;
  label: string;
}

export interface OfficeState {
  agents: Record<AgentName, AgentRenderState>;
  walkers: Walker[];
}

// Normalized desk positions [0,1] — canvas component scales to actual px
export const DESK_POS: Record<string, { x: number; y: number }> = {
  ceo:                { x: 0.08, y: 0.38 },
  cto:                { x: 0.22, y: 0.38 },
  product_manager:    { x: 0.60, y: 0.38 },
  product_owner:      { x: 0.76, y: 0.38 },
  business_marketing: { x: 0.92, y: 0.38 },
  engineer:           { x: 0.17, y: 0.85 },
  designer:           { x: 0.50, y: 0.85 },
  qa:                 { x: 0.83, y: 0.85 },
  finalize:           { x: 0.83, y: 0.85 },
  code_generator:     { x: 0.17, y: 0.85 },
  design_generator:   { x: 0.50, y: 0.85 },
};
```

- [ ] **Step 4: Run test — expect pass**

```bash
cd frontend && npx vitest run src/components/OfficeEngine.test.ts
```
Expected: 3 tests pass (will fail at class-not-found until Task 2, so add a stub export):

Add at the bottom of `OfficeEngine.ts` temporarily:
```typescript
export class OfficeEngine {}
```

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/OfficeEngine.ts src/components/OfficeEngine.test.ts
git commit -m "feat(office): add OfficeEngine types and desk positions"
```

---

## Task 2: OfficeEngine — agent state machine

**Files:**
- Modify: `frontend/src/components/OfficeEngine.ts`
- Modify: `frontend/src/components/OfficeEngine.test.ts`

- [ ] **Step 1: Add state machine tests to `OfficeEngine.test.ts`**

```typescript
// Add to OfficeEngine.test.ts (after existing describe blocks)
describe('OfficeEngine state machine', () => {
  it('initializes all office agents to idle', () => {
    const engine = new OfficeEngine();
    const state = engine.tick(0);
    const officeAgents = ['ceo','cto','product_manager','product_owner',
      'business_marketing','engineer','designer','qa'] as AgentName[];
    for (const id of officeAgents) {
      expect(state.agents[id].state).toBe('idle');
    }
  });

  it('sets agent to working when started event received', () => {
    const engine = new OfficeEngine();
    engine.processEvent({ agent: 'engineer', status: 'started', phase: 'execution', message: '', timestamp: 1 }, 0);
    const state = engine.tick(0);
    expect(state.agents['engineer'].state).toBe('working');
  });

  it('sets agent to done when done event received', () => {
    const engine = new OfficeEngine();
    engine.processEvent({ agent: 'qa', status: 'started', phase: 'quality', message: '', timestamp: 1 }, 0);
    engine.processEvent({ agent: 'qa', status: 'done', phase: 'quality', message: '', timestamp: 2 }, 0);
    const state = engine.tick(0);
    expect(state.agents['qa'].state).toBe('done');
  });

  it('reset returns all agents to idle', () => {
    const engine = new OfficeEngine();
    engine.processEvent({ agent: 'ceo', status: 'started', phase: 'intake', message: '', timestamp: 1 }, 0);
    engine.reset();
    const state = engine.tick(0);
    expect(state.agents['ceo'].state).toBe('idle');
  });

  it('agents have unique idlePhase values', () => {
    const engine = new OfficeEngine();
    const state = engine.tick(0);
    const phases = Object.values(state.agents).map(a => a.idlePhase);
    const unique = new Set(phases);
    expect(unique.size).toBe(phases.length);
  });
});
```

- [ ] **Step 2: Run test — expect failure**

```bash
cd frontend && npx vitest run src/components/OfficeEngine.test.ts
```
Expected: failures on `engine.processEvent is not a function`, `engine.tick is not a function`

- [ ] **Step 3: Implement OfficeEngine class — replace stub**

Replace the stub `export class OfficeEngine {}` at the bottom of `OfficeEngine.ts`:

```typescript
const ALL_OFFICE_AGENTS: AgentName[] = [
  'ceo','cto','product_manager','product_owner','business_marketing',
  'engineer','designer','qa','finalize','code_generator','design_generator',
];

// When agent X fires "started", these walkers spawn and walk to X's desk
const WALK_TRIGGERS: Partial<Record<AgentName, Array<{ walker: AgentName; label: string }>>> = {
  cto:                [{ walker: 'ceo',               label: 'Briefing!' }],
  product_manager:    [{ walker: 'cto',               label: 'Handoff 📋' }],
  product_owner:      [{ walker: 'cto',               label: 'Handoff 📋' }],
  business_marketing: [{ walker: 'cto',               label: 'Handoff 📋' }],
  engineer:           [{ walker: 'product_manager',   label: 'Spec ✓' },
                       { walker: 'product_owner',     label: 'Stories ✓' }],
  designer:           [{ walker: 'business_marketing', label: 'Brief ✓' }],
  qa:                 [{ walker: 'engineer',           label: 'Build done!' },
                       { walker: 'designer',           label: 'Design ✓' }],
  code_generator:     [{ walker: 'qa',                label: 'QA passed!' }],
};

export class OfficeEngine {
  private agentStates: Record<string, AgentRenderState> = {};
  private walkers: Walker[] = [];
  private walkCounter = 0;

  constructor() {
    this.reset();
  }

  reset(): void {
    this.walkers = [];
    this.walkCounter = 0;
    this.agentStates = {};
    ALL_OFFICE_AGENTS.forEach((id, i) => {
      this.agentStates[id] = { state: 'idle', idlePhase: i * 0.9 };
    });
  }

  processEvent(event: AgentEvent, timestamp = performance.now()): void {
    const { agent, status } = event;
    if (!this.agentStates[agent]) return;

    if (status === 'started') {
      this.agentStates[agent] = { ...this.agentStates[agent], state: 'working' };
      const destPos = DESK_POS[agent];
      if (!destPos) return;
      for (const { walker: walkerId, label } of WALK_TRIGGERS[agent] ?? []) {
        const walkerPos = DESK_POS[walkerId];
        if (!walkerPos) continue;
        this.walkers.push({
          id: `w${this.walkCounter++}`,
          agentId: walkerId,
          fromX: walkerPos.x, fromY: walkerPos.y,
          toX: destPos.x,    toY: destPos.y,
          startTime: timestamp,
          duration: 1800,
          label,
        });
      }
    }

    if (status === 'done') {
      this.agentStates[agent] = { ...this.agentStates[agent], state: 'done' };
    }
  }

  tick(timestamp: number): OfficeState {
    const LINGER = 600;
    this.walkers = this.walkers.filter(w => timestamp - w.startTime < w.duration + LINGER);
    return {
      agents: { ...this.agentStates } as Record<AgentName, AgentRenderState>,
      walkers: [...this.walkers],
    };
  }
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
cd frontend && npx vitest run src/components/OfficeEngine.test.ts
```
Expected: 8 tests pass

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/OfficeEngine.ts src/components/OfficeEngine.test.ts
git commit -m "feat(office): implement OfficeEngine state machine"
```

---

## Task 3: OfficeEngine — walker system tests

**Files:**
- Modify: `frontend/src/components/OfficeEngine.test.ts`

- [ ] **Step 1: Add walker tests**

```typescript
// Add to OfficeEngine.test.ts
describe('OfficeEngine walker system', () => {
  it('spawns a walker when cto starts (ceo walks to cto)', () => {
    const engine = new OfficeEngine();
    engine.processEvent({ agent: 'cto', status: 'started', phase: 'planning', message: '', timestamp: 1 }, 0);
    const state = engine.tick(0);
    expect(state.walkers).toHaveLength(1);
    expect(state.walkers[0].agentId).toBe('ceo');
    expect(state.walkers[0].toX).toBeCloseTo(DESK_POS['cto'].x);
    expect(state.walkers[0].toY).toBeCloseTo(DESK_POS['cto'].y);
  });

  it('spawns 2 walkers when engineer starts (pm + po walk)', () => {
    const engine = new OfficeEngine();
    engine.processEvent({ agent: 'engineer', status: 'started', phase: 'execution', message: '', timestamp: 1 }, 0);
    const state = engine.tick(0);
    expect(state.walkers).toHaveLength(2);
    const ids = state.walkers.map(w => w.agentId).sort();
    expect(ids).toEqual(['product_manager', 'product_owner'].sort());
  });

  it('spawns 2 walkers when qa starts (engineer + designer walk)', () => {
    const engine = new OfficeEngine();
    engine.processEvent({ agent: 'qa', status: 'started', phase: 'quality', message: '', timestamp: 1 }, 0);
    const state = engine.tick(1);
    expect(state.walkers).toHaveLength(2);
    const ids = state.walkers.map(w => w.agentId).sort();
    expect(ids).toEqual(['designer', 'engineer'].sort());
  });

  it('removes walkers after duration + linger', () => {
    const engine = new OfficeEngine();
    engine.processEvent({ agent: 'cto', status: 'started', phase: 'planning', message: '', timestamp: 1 }, 0);
    // Walker duration is 1800ms + 600ms linger = 2400ms
    const stateDuring = engine.tick(1000);
    expect(stateDuring.walkers).toHaveLength(1);
    const stateAfter = engine.tick(2401);
    expect(stateAfter.walkers).toHaveLength(0);
  });

  it('reset clears all walkers', () => {
    const engine = new OfficeEngine();
    engine.processEvent({ agent: 'engineer', status: 'started', phase: 'execution', message: '', timestamp: 1 }, 0);
    engine.reset();
    const state = engine.tick(0);
    expect(state.walkers).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests — expect all pass**

```bash
cd frontend && npx vitest run src/components/OfficeEngine.test.ts
```
Expected: 13 tests pass

- [ ] **Step 3: Commit**

```bash
cd frontend && git add src/components/OfficeEngine.test.ts
git commit -m "test(office): add walker system tests"
```

---

## Task 4: OfficeCanvas — background draw functions

**Files:**
- Create: `frontend/src/components/OfficeCanvas.tsx`

- [ ] **Step 1: Create `OfficeCanvas.tsx` with background draw functions**

```typescript
// frontend/src/components/OfficeCanvas.tsx
import { useRef, useEffect } from 'react';
import type { AgentEvent, AgentName } from '../models';
import { AGENT_CONFIG } from '../models';
import { OfficeEngine, DESK_POS } from './OfficeEngine';
import type { OfficeState, Walker, AgentRenderState } from './OfficeEngine';

interface Props {
  events: AgentEvent[];
  activeAgent: AgentName | null;
}

// ─── Draw: Background ────────────────────────────────────────────────────────

function drawBackground(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  const floorY = H * 0.44;

  // Wall
  ctx.fillStyle = '#101020';
  ctx.fillRect(0, 0, W, floorY - 4);

  // Wall accent line
  ctx.fillStyle = '#1c1c3c';
  ctx.fillRect(0, floorY - 4, W, 4);

  // Pixel windows on wall (5 evenly spaced)
  for (let i = 0; i < 5; i++) {
    const wx = W * 0.09 + i * (W * 0.195);
    const wy = 20;
    // Frame
    ctx.fillStyle = '#191930';
    ctx.fillRect(wx - 20, wy, 40, 48);
    // Glass
    ctx.fillStyle = '#0e2237';
    ctx.fillRect(wx - 18, wy + 2, 36, 44);
    // Cross frame
    ctx.fillStyle = '#191930';
    ctx.fillRect(wx - 18, wy + 23, 36, 2);
    ctx.fillRect(wx, wy + 2, 2, 44);
    // Light rays
    ctx.globalAlpha = 0.10;
    ctx.fillStyle = '#99ddff';
    ctx.fillRect(wx - 16, wy + 4, 8, 18);
    ctx.fillRect(wx - 5, wy + 4, 8, 18);
    ctx.globalAlpha = 1;
  }

  // Floor
  ctx.fillStyle = '#131325';
  ctx.fillRect(0, floorY, W, H - floorY);

  // Floor tile grid
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = '#28285a';
  for (let x = 0; x < W; x += 52) ctx.fillRect(x, floorY, 1, H - floorY);
  for (let y = floorY; y < H; y += 26) ctx.fillRect(0, y, W, 1);
  ctx.globalAlpha = 1;
}

function drawMeetingRoom(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  const cx = W * 0.41;
  const cy = H * 0.49;
  const mw = Math.min(W * 0.16, 110);
  const mh = 68;

  // Room panel
  ctx.fillStyle = '#2a2860';
  ctx.fillRect(cx - mw / 2 - 2, cy - 2, mw + 4, mh + 4);
  ctx.fillStyle = '#0d0b20';
  ctx.fillRect(cx - mw / 2, cy, mw, mh);

  // Table surface (70% of room width)
  const tw = mw * 0.70;
  ctx.fillStyle = '#181560';
  ctx.fillRect(cx - tw / 2, cy + mh / 2 - 7, tw, 14);
  ctx.fillStyle = '#0f0d30';
  ctx.fillRect(cx - tw / 2 + 2, cy + mh / 2 - 5, tw - 4, 10);

  // Chairs at table edge (3 pairs)
  ctx.fillStyle = '#22205a';
  [-1, 0, 1].forEach(i => {
    const cx2 = cx + i * tw * 0.32;
    ctx.fillRect(cx2 - 5, cy + mh / 2 - 16, 10, 6);
    ctx.fillRect(cx2 - 5, cy + mh / 2 + 10, 10, 6);
  });

  ctx.font = 'bold 7px monospace';
  ctx.fillStyle = '#3a3090';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('MEETING', cx, cy + 6);
}
```

- [ ] **Step 2: Verify TypeScript compiles (no errors)**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
cd frontend && git add src/components/OfficeCanvas.tsx
git commit -m "feat(office): add OfficeCanvas background draw functions"
```

---

## Task 5: OfficeCanvas — desk and person draw functions

**Files:**
- Modify: `frontend/src/components/OfficeCanvas.tsx`

- [ ] **Step 1: Add desk draw function**

Add after `drawMeetingRoom` in `OfficeCanvas.tsx`:

```typescript
// ─── Draw: Desk ──────────────────────────────────────────────────────────────

function drawDesk(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  color: string, label: string,
  state: AgentRenderState['state'],
  timestamp: number,
): void {
  const active = state === 'working';

  if (active) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
  }

  // Desk surface
  ctx.fillStyle = '#4e3a18';
  ctx.fillRect(cx - 38, cy, 76, 5);
  ctx.fillStyle = '#3d2d12';
  ctx.fillRect(cx - 38, cy + 5, 76, 14);

  // Desk legs
  ctx.fillStyle = '#2a1f0e';
  ctx.fillRect(cx - 34, cy + 19, 7, 12);
  ctx.fillRect(cx + 27, cy + 19, 7, 12);

  // Monitor frame
  ctx.fillStyle = '#111';
  ctx.fillRect(cx - 13, cy - 22, 26, 17);

  // Screen
  ctx.fillStyle = active ? '#002244' : '#001122';
  ctx.fillRect(cx - 11, cy - 20, 22, 13);

  if (active) {
    // Scan lines
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = color + '55';
      ctx.fillRect(cx - 9, cy - 18 + i * 3, 18, 1);
    }
    // Blinking cursor
    if (Math.floor(timestamp / 500) % 2 === 0) {
      ctx.fillStyle = color;
      ctx.fillRect(cx + 5, cy - 10, 2, 7);
    }
  }

  // Monitor stand
  ctx.fillStyle = '#222';
  ctx.fillRect(cx - 3, cy - 5, 5, 5);

  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';

  // Name label
  ctx.font = 'bold 9px monospace';
  ctx.fillStyle = active ? color : '#555';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, cx, cy + 40);
}

// ─── Draw: Pixel Person ───────────────────────────────────────────────────────

function drawPerson(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  color: string,
  state: AgentRenderState['state'],
  timestamp: number,
  idlePhase: number,
): void {
  const S = 3;
  const now = timestamp;

  // Per-state vertical bob
  let bobY = 0;
  if (state === 'working') bobY = Math.sin(now / 180 + idlePhase) * 2.5;
  else if (state === 'idle') bobY = Math.sin(now / 1200 + idlePhase) * 1.5;

  // Shadow
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = '#000';
  ctx.fillRect(cx - 9, cy + 42, 18, 4);
  ctx.globalAlpha = 1;

  // Head (8×8 blocks)
  ctx.fillStyle = color;
  ctx.fillRect(cx - 4 * S, cy + bobY, 8 * S, 8 * S);

  // Eyes — idle look-around every ~3s
  const lookCycle = Math.floor((now / 3000 + idlePhase) % 3);
  const eyeOffX = (state === 'idle' && lookCycle === 1) ? S : 0;
  ctx.fillStyle = '#000';
  ctx.fillRect(cx - 2 * S + eyeOffX, cy + 2 * S + bobY, S, 2 * S);
  ctx.fillRect(cx + S + eyeOffX,     cy + 2 * S + bobY, S, 2 * S);

  // Mouth
  ctx.fillRect(cx - 2 * S, cy + 5 * S + bobY, 4 * S, S);

  // Body
  ctx.fillStyle = color;
  ctx.fillRect(cx - 3 * S, cy + 8 * S + bobY, 6 * S, 7 * S);

  // Collar
  ctx.fillStyle = '#ffffffbb';
  ctx.fillRect(cx - S, cy + 8 * S + bobY, 2 * S, 2 * S);

  // Arm swing
  const armSwing = state === 'working'
    ? Math.sin(now / 180 + idlePhase) * 3.5
    : Math.sin(now / 1200 + idlePhase) * 1;
  ctx.fillStyle = color;
  ctx.fillRect(cx - 5 * S, cy + 8 * S + bobY + armSwing,  2 * S, 5 * S);
  ctx.fillRect(cx + 3 * S, cy + 8 * S + bobY - armSwing,  2 * S, 5 * S);

  // Legs (static for desk agents)
  ctx.fillStyle = '#1a1a3a';
  ctx.fillRect(cx - 3 * S, cy + 15 * S, 2 * S, 5 * S);
  ctx.fillRect(cx,          cy + 15 * S, 2 * S, 5 * S);

  // Shoes
  ctx.fillStyle = '#111';
  ctx.fillRect(cx - 4 * S, cy + 20 * S, 4 * S, S + 1);
  ctx.fillRect(cx,          cy + 20 * S, 4 * S, S + 1);

  // Done checkmark badge
  if (state === 'done') {
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#3d9a3d';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✓', cx, cy - 8);
  }

  // Working glow dot
  if (state === 'working') {
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('●', cx, cy - 8);
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
cd frontend && git add src/components/OfficeCanvas.tsx
git commit -m "feat(office): add desk and person draw functions"
```

---

## Task 6: OfficeCanvas — walker draw function + main draw

**Files:**
- Modify: `frontend/src/components/OfficeCanvas.tsx`

- [ ] **Step 1: Add walker draw function and main draw orchestrator**

Add after `drawPerson` in `OfficeCanvas.tsx`:

```typescript
// ─── Draw: Walker (visiting sprite) ──────────────────────────────────────────

function drawWalker(
  ctx: CanvasRenderingContext2D,
  walker: Walker,
  W: number, H: number,
  timestamp: number,
): void {
  const S = 3;
  const elapsed = timestamp - walker.startTime;
  const t = Math.min(elapsed / walker.duration, 1);
  // Ease in-out
  const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

  const px = (walker.fromX + (walker.toX - walker.fromX) * eased) * W;
  const py = (walker.fromY + (walker.toY - walker.fromY) * eased) * H - 50;

  const color = AGENT_CONFIG[walker.agentId]?.color ?? '#888';

  // Walking legs
  const legSwing = Math.sin(timestamp / 110) * 5;
  // Shadow
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = '#000';
  ctx.fillRect(px - 9, py + 42, 18, 4);
  ctx.globalAlpha = 1;

  // Head
  ctx.fillStyle = color;
  ctx.fillRect(px - 4 * S, py, 8 * S, 8 * S);

  // Eyes (looking forward — direction of travel)
  const movingRight = walker.toX > walker.fromX;
  ctx.fillStyle = '#000';
  ctx.fillRect(px + (movingRight ? 1 : -2) * S, py + 2 * S, S, 2 * S);
  ctx.fillRect(px + (movingRight ? 3 : 0) * S,  py + 2 * S, S, 2 * S);

  // Mouth
  ctx.fillRect(px - 2 * S, py + 5 * S, 4 * S, S);

  // Body
  ctx.fillStyle = color;
  ctx.fillRect(px - 3 * S, py + 8 * S, 6 * S, 7 * S);
  ctx.fillStyle = '#ffffffbb';
  ctx.fillRect(px - S, py + 8 * S, 2 * S, 2 * S);

  // Arms swinging
  const armSwing = Math.sin(timestamp / 110) * 5;
  ctx.fillStyle = color;
  ctx.fillRect(px - 5 * S, py + 8 * S + armSwing,  2 * S, 5 * S);
  ctx.fillRect(px + 3 * S, py + 8 * S - armSwing,  2 * S, 5 * S);

  // Legs walking
  ctx.fillStyle = '#1a1a3a';
  ctx.fillRect(px - 3 * S, py + 15 * S + legSwing, 2 * S, 5 * S);
  ctx.fillRect(px,          py + 15 * S - legSwing, 2 * S, 5 * S);

  // Shoes
  ctx.fillStyle = '#111';
  ctx.fillRect(px - 4 * S, py + 20 * S, 4 * S, S + 1);
  ctx.fillRect(px,          py + 20 * S, 4 * S, S + 1);

  // Speech bubble when close to destination (t > 0.6)
  if (t > 0.6 && walker.label) {
    const bw = walker.label.length * 6 + 12;
    const bx = px - bw / 2;
    const by = py - 22;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, 18, 4);
    ctx.fill();
    // Tail
    ctx.beginPath();
    ctx.moveTo(px - 6, by + 18);
    ctx.lineTo(px,     by + 26);
    ctx.lineTo(px + 6, by + 18);
    ctx.fill();
    // Text
    ctx.font = 'bold 8px monospace';
    ctx.fillStyle = '#111';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(walker.label, px, by + 9);
  }
}

// ─── Draw: Main orchestrator ──────────────────────────────────────────────────

const DISPLAY_AGENTS: AgentName[] = [
  'ceo','cto','product_manager','product_owner','business_marketing',
  'engineer','designer','qa',
];

function draw(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  state: OfficeState,
  timestamp: number,
): void {
  drawBackground(ctx, W, H);
  drawMeetingRoom(ctx, W, H);

  // Desks + seated agents (skip ghost agents sharing positions)
  for (const agentId of DISPLAY_AGENTS) {
    const pos = DESK_POS[agentId];
    const agentState = state.agents[agentId];
    if (!pos || !agentState) continue;
    const ax = pos.x * W;
    const ay = pos.y * H;
    const config = AGENT_CONFIG[agentId];
    const color = config?.color ?? '#888';
    const label = config?.label ?? agentId;
    drawDesk(ctx, ax, ay, color, label, agentState.state, timestamp);
    drawPerson(ctx, ax, ay - 50, color, agentState.state, timestamp, agentState.idlePhase);
  }

  // Walkers on top
  for (const walker of state.walkers) {
    drawWalker(ctx, walker, W, H, timestamp);
  }

  // Title bar
  ctx.fillStyle = '#08081a';
  ctx.fillRect(0, 0, W, 16);
  ctx.font = 'bold 10px monospace';
  ctx.fillStyle = '#7F77DD';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🏢  Happy-Agents Office', W / 2, 8);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
cd frontend && git add src/components/OfficeCanvas.tsx
git commit -m "feat(office): add walker draw + main draw orchestrator"
```

---

## Task 7: OfficeCanvas — React component (canvas setup + game loop)

**Files:**
- Modify: `frontend/src/components/OfficeCanvas.tsx`

- [ ] **Step 1: Add the React component at the bottom of `OfficeCanvas.tsx`**

```typescript
// ─── React Component ──────────────────────────────────────────────────────────

export function OfficeCanvas({ events, activeAgent: _ }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef(new OfficeEngine());
  const frameRef = useRef(0);
  const lastEventCountRef = useRef(0);

  // Process new events (events array grows; process only the new tail)
  useEffect(() => {
    const engine = engineRef.current;
    if (events.length === 0) {
      engine.reset();
      lastEventCountRef.current = 0;
      return;
    }
    const newEvents = events.slice(lastEventCountRef.current);
    for (const ev of newEvents) engine.processEvent(ev);
    lastEventCountRef.current = events.length;
  }, [events]);

  // Canvas resize + animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const loop = (timestamp: number) => {
      const officeState = engineRef.current.tick(timestamp);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      draw(ctx, canvas.width, canvas.height, officeState, timestamp);
      frameRef.current = requestAnimationFrame(loop);
    };
    frameRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frameRef.current);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        imageRendering: 'pixelated',
        background: '#0d0d1a',
      }}
    />
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
cd frontend && git add src/components/OfficeCanvas.tsx
git commit -m "feat(office): add OfficeCanvas React component with game loop"
```

---

## Task 8: AgentActivity — add toggle

**Files:**
- Modify: `frontend/src/components/AgentActivity.tsx`

- [ ] **Step 1: Add import and toggle state**

At the top of `AgentActivity.tsx`, add the import:
```typescript
import { OfficeCanvas } from './OfficeCanvas';
```

Inside `AgentActivity` function, after the existing `useState` for `selectedAgent`, add:
```typescript
const [view, setView] = useState<'office' | 'log'>('office');
```

- [ ] **Step 2: Replace the `panel-header` div with toggle version**

Find:
```tsx
<div className="panel-header">
  <h2>Agent Activity</h2>
  {processing && <span className="spinner" />}
</div>
```

Replace with:
```tsx
<div className="panel-header" style={{ flexDirection: 'column', gap: 6, alignItems: 'stretch' }}>
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <h2 style={{ flex: 1 }}>Agent Activity</h2>
    {processing && <span className="spinner" />}
  </div>
  <div style={{ display: 'flex', gap: 4 }}>
    <button
      onClick={() => setView('office')}
      style={{
        flex: 1,
        padding: '4px 0',
        fontSize: 11,
        fontFamily: 'monospace',
        background: view === 'office' ? '#7F77DD' : '#1a1a2e',
        color: view === 'office' ? '#fff' : '#666',
        border: '1px solid #2a2a4a',
        borderRadius: 4,
        cursor: 'pointer',
      }}
    >
      🏢 Office
    </button>
    <button
      onClick={() => setView('log')}
      style={{
        flex: 1,
        padding: '4px 0',
        fontSize: 11,
        fontFamily: 'monospace',
        background: view === 'log' ? '#7F77DD' : '#1a1a2e',
        color: view === 'log' ? '#fff' : '#666',
        border: '1px solid #2a2a4a',
        borderRadius: 4,
        cursor: 'pointer',
      }}
    >
      📋 Log
    </button>
  </div>
</div>
```

- [ ] **Step 3: Wrap existing content with conditional render**

After the closing `</div>` of the new `panel-header`, add the office canvas (before the token summary div):
```tsx
{view === 'office' && (
  <div style={{ height: 500, margin: '8px 0', borderRadius: 6, overflow: 'hidden', border: '1px solid #1a1a3a' }}>
    <OfficeCanvas events={events} activeAgent={activeAgent} />
  </div>
)}

{view === 'log' && (
  <>
    {/* existing: tokenSummary, agent-roster, divider, event-list — move them here */}
  </>
)}
```

Wrap the existing token summary, agent roster, divider, and event list inside `{view === 'log' && (...)}`:

```tsx
{view === 'log' && (
  <>
    {tokenSummary.input > 0 && (
      <div style={{
        fontSize: "11px",
        color: "#EF9F27",
        padding: "4px 8px",
        background: "#3d2e10",
        borderRadius: "6px",
        marginBottom: "8px",
      }}>
        ⚡ Tokens: {tokenSummary.input.toLocaleString()} in / {tokenSummary.output.toLocaleString()} out
        <span style={{ color: "#666", marginLeft: "8px" }}>
          (total: {(tokenSummary.input + tokenSummary.output).toLocaleString()})
        </span>
      </div>
    )}

    <div className="agent-roster">
      {Object.entries(AGENT_SHORT).map(([key, icon]) => {
        const ev = latestPerAgent[key];
        const isActive = activeAgent === key;
        const isDone = ev?.status === "done";
        const isError = ev?.status === "error";
        const progress = getProgress(key);
        const color = AGENT_COLOR[key] ?? "#666";
        return (
          <div
            key={key}
            className={`roster-item ${isActive ? "active" : ""} ${project ? "clickable" : ""}`}
            style={{
              borderColor: isActive ? color : "transparent",
              background: isActive ? `${color}22` : undefined,
              cursor: project ? "pointer" : undefined,
              opacity: ev && !isActive && !isDone ? 0.5 : 1,
            }}
            onClick={() => project && handleAgentClick(key as AgentName)}
            title={project ? `View ${key} output` : undefined}
          >
            <span className="roster-icon" style={{ background: color }}>{icon}</span>
            <span className="roster-label">{key.replace("_", " ")}</span>
            {ev && (
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "2px", background: "#1a1a26" }}>
                <div style={{
                  height: "100%",
                  width: `${progress}%`,
                  background: isError ? "#E24B4A" : isDone ? color : "#EF9F27",
                  transition: "width 0.4s ease",
                }} />
              </div>
            )}
          </div>
        );
      })}
    </div>

    <div className="divider" />

    {events.length === 0 && !processing && (
      <p className="empty">No activity yet. Submit a project to get started!</p>
    )}
    <div className="event-list">
      {events.map((ev, i) => {
        const color = AGENT_COLOR[ev.agent] ?? "#666";
        return (
          <div
            key={i}
            className={`event-item status-${ev.status} ${project ? "clickable" : ""}`}
            style={{ borderLeftColor: project ? "#7F77DD" : (ev.status === "done" ? color : "transparent"), cursor: project ? "pointer" : undefined }}
            onClick={() => project && handleAgentClick(ev.agent as AgentName)}
          >
            <span className="agent-badge" style={{ background: color }}>
              {AGENT_SHORT[ev.agent] ?? "?"}
            </span>
            <div className="event-body">
              <div className="event-meta">
                <span className="agent-name" style={{ color }}>{ev.agent.replace("_", " ")}</span>
                <span className="status-chip">{STATUS_ICON[ev.status] ?? "•"} {ev.status}</span>
                {ev.phase && ev.phase !== "intake" && (
                  <span className="status-chip" style={{ color: "#999", fontSize: "9px" }}>{ev.phase}</span>
                )}
              </div>
              <p className="event-msg">{ev.message}</p>
            </div>
          </div>
        );
      })}
    </div>
  </>
)}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/AgentActivity.tsx
git commit -m "feat(office): add Office/Log toggle to AgentActivity"
```

---

## Task 9: Run all tests + visual verification

**Files:** none (verification only)

- [ ] **Step 1: Run full test suite**

```bash
cd frontend && npx vitest run
```
Expected: all existing tests pass + 13 new OfficeEngine tests pass

- [ ] **Step 2: Start frontend dev server**

```bash
cd frontend && npm run dev
```

- [ ] **Step 3: Open browser at `http://localhost:5173`**

Verify:
- [ ] `🏢 Office` and `📋 Log` toggle buttons appear in Agent Activity panel
- [ ] Clicking `🏢 Office` shows the pixel art canvas with 8 agents at desks
- [ ] Agents are visible at correct cluster positions (CEO/CTO left, PM/PO/BM right, ENG/DES/QA below)
- [ ] Idle agents have subtle head bob animation
- [ ] Meeting room is visible in the center
- [ ] Clicking `📋 Log` shows the existing activity log feed
- [ ] No console errors

- [ ] **Step 4: Submit a test project and verify pipeline animation**

Submit a project via the UI. Verify:
- [ ] When CEO fires: CEO agent glows (working state)
- [ ] When CTO fires: CEO walker sprite walks to CTO's desk with speech bubble
- [ ] When PM/PO/BM fire: 3 walker sprites appear simultaneously walking from CTO's area
- [ ] When ENG fires: walkers from PM and PO walk to ENG desk
- [ ] Done agents show `✓` badge
- [ ] `📋 Log` still shows all events correctly

- [ ] **Step 5: Final commit**

```bash
cd frontend && git add -A
git commit -m "feat(office): pixel art office animation — complete"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Toggle `🏢 Office / 📋 Log` — Task 8
- ✅ Office clusters: leadership left, planning right, execution below meeting room — `DESK_POS` Task 1
- ✅ Walker system: multiple simultaneous walkers — Task 3 + Task 6
- ✅ Speech bubble at 60% travel progress — Task 6 `drawWalker`
- ✅ Idle animation: head bob + eye shift — Task 5 `drawPerson`
- ✅ Working state: screen glow + blinking cursor — Task 5 `drawDesk`
- ✅ Done state: `✓` badge — Task 5 `drawPerson`
- ✅ Event → walk trigger map — Task 2 `WALK_TRIGGERS`
- ✅ No backend changes, no new WS messages — confirmed
- ✅ Canvas resize handling via `ResizeObserver` — Task 7
- ✅ Meeting room drawn — Task 4

**Type consistency check:**
- `AgentRenderState`, `Walker`, `OfficeState` defined in Task 1, used consistently through Tasks 2-7 ✅
- `DESK_POS` defined in Task 1, imported in Task 6 (`drawWalker`) ✅
- `OfficeEngine.processEvent(event, timestamp?)` signature consistent across Tasks 2, 3, 7 ✅
- `AGENT_CONFIG` imported from `../models` in Task 6 — already exported from `models.ts` ✅
