import type { AgentEvent, AgentName } from '../models';

export type AgentAnimState = 'idle' | 'working' | 'done';

export interface AgentRenderState {
  state: AgentAnimState;
  idlePhase: number;
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

// Normalized desk positions [0,1] — canvas component scales to px
export const DESK_POS: Record<string, { x: number; y: number }> = {
  ceo:                { x: 0.06, y: 0.38 },
  cto:                { x: 0.20, y: 0.38 },
  product_manager:    { x: 0.66, y: 0.38 },
  product_owner:      { x: 0.79, y: 0.38 },
  business_marketing: { x: 0.92, y: 0.38 },
  engineer:           { x: 0.17, y: 0.85 },
  designer:           { x: 0.50, y: 0.85 },
  qa:                 { x: 0.83, y: 0.85 },
  finalize:           { x: 0.83, y: 0.85 },
  code_generator:     { x: 0.17, y: 0.85 },
  design_generator:   { x: 0.50, y: 0.85 },
};

const ALL_OFFICE_AGENTS: AgentName[] = [
  'ceo', 'cto', 'product_manager', 'product_owner', 'business_marketing',
  'engineer', 'designer', 'qa', 'finalize', 'code_generator', 'design_generator',
];

// When agent X fires "started", these walkers spawn and walk TO X's desk
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
