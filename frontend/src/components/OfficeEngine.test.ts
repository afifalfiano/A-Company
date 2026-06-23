import { describe, it, expect } from 'vitest';
import { OfficeEngine, DESK_POS } from './OfficeEngine';
import type { AgentName } from '../models';

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
