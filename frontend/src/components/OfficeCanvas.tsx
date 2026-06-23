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

  // Wall accent
  ctx.fillStyle = '#1c1c3c';
  ctx.fillRect(0, floorY - 4, W, 4);

  // Pixel windows (5 evenly spaced)
  for (let i = 0; i < 5; i++) {
    const wx = W * 0.09 + i * (W * 0.195);
    const wy = 20;
    ctx.fillStyle = '#191930';
    ctx.fillRect(wx - 20, wy, 40, 48);
    ctx.fillStyle = '#0e2237';
    ctx.fillRect(wx - 18, wy + 2, 36, 44);
    ctx.fillStyle = '#191930';
    ctx.fillRect(wx - 18, wy + 23, 36, 2);
    ctx.fillRect(wx, wy + 2, 2, 44);
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
  const cx = W * 0.50;
  const cy = H * 0.55;
  const mw = Math.min(W * 0.16, 110);
  const mh = 68;

  // Room panel
  ctx.fillStyle = '#2a2860';
  ctx.fillRect(cx - mw / 2 - 2, cy - 2, mw + 4, mh + 4);
  ctx.fillStyle = '#0d0b20';
  ctx.fillRect(cx - mw / 2, cy, mw, mh);

  // Table surface (70% of room width, leaving edge margin)
  const tw = mw * 0.70;
  ctx.fillStyle = '#181560';
  ctx.fillRect(cx - tw / 2, cy + mh / 2 - 7, tw, 14);
  ctx.fillStyle = '#0f0d30';
  ctx.fillRect(cx - tw / 2 + 2, cy + mh / 2 - 5, tw - 4, 10);

  // Chairs at table edge (3 pairs, flanking the table)
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

  ctx.fillStyle = '#4e3a18';
  ctx.fillRect(cx - 38, cy, 76, 5);
  ctx.fillStyle = '#3d2d12';
  ctx.fillRect(cx - 38, cy + 5, 76, 14);
  ctx.fillStyle = '#2a1f0e';
  ctx.fillRect(cx - 34, cy + 19, 7, 12);
  ctx.fillRect(cx + 27, cy + 19, 7, 12);

  // Monitor
  ctx.fillStyle = '#111';
  ctx.fillRect(cx - 13, cy - 22, 26, 17);
  ctx.fillStyle = active ? '#002244' : '#001122';
  ctx.fillRect(cx - 11, cy - 20, 22, 13);

  if (active) {
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = color + '55';
      ctx.fillRect(cx - 9, cy - 18 + i * 3, 18, 1);
    }
    if (Math.floor(timestamp / 500) % 2 === 0) {
      ctx.fillStyle = color;
      ctx.fillRect(cx + 5, cy - 10, 2, 7);
    }
  }

  ctx.fillStyle = '#222';
  ctx.fillRect(cx - 3, cy - 5, 5, 5);

  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';

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

  let bobY = 0;
  if (state === 'working') bobY = Math.sin(timestamp / 180 + idlePhase) * 2.5;
  else if (state === 'idle') bobY = Math.sin(timestamp / 1200 + idlePhase) * 1.5;

  // Shadow
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = '#000';
  ctx.fillRect(cx - 9, cy + 42, 18, 4);
  ctx.globalAlpha = 1;

  // Head
  ctx.fillStyle = color;
  ctx.fillRect(cx - 4 * S, cy + bobY, 8 * S, 8 * S);

  // Eyes — idle look-around
  const lookCycle = Math.floor((timestamp / 3000 + idlePhase) % 3);
  const eyeOffX = (state === 'idle' && lookCycle === 1) ? S : 0;
  ctx.fillStyle = '#000';
  ctx.fillRect(cx - 2 * S + eyeOffX, cy + 2 * S + bobY, S, 2 * S);
  ctx.fillRect(cx + S + eyeOffX,     cy + 2 * S + bobY, S, 2 * S);

  // Mouth
  ctx.fillRect(cx - 2 * S, cy + 5 * S + bobY, 4 * S, S);

  // Body
  ctx.fillStyle = color;
  ctx.fillRect(cx - 3 * S, cy + 8 * S + bobY, 6 * S, 7 * S);
  ctx.fillStyle = '#ffffffbb';
  ctx.fillRect(cx - S, cy + 8 * S + bobY, 2 * S, 2 * S);

  // Arms
  const armSwing = state === 'working'
    ? Math.sin(timestamp / 180 + idlePhase) * 3.5
    : Math.sin(timestamp / 1200 + idlePhase) * 1;
  ctx.fillStyle = color;
  ctx.fillRect(cx - 5 * S, cy + 8 * S + bobY + armSwing, 2 * S, 5 * S);
  ctx.fillRect(cx + 3 * S, cy + 8 * S + bobY - armSwing, 2 * S, 5 * S);

  // Legs
  ctx.fillStyle = '#1a1a3a';
  ctx.fillRect(cx - 3 * S, cy + 15 * S, 2 * S, 5 * S);
  ctx.fillRect(cx,          cy + 15 * S, 2 * S, 5 * S);

  // Shoes
  ctx.fillStyle = '#111';
  ctx.fillRect(cx - 4 * S, cy + 20 * S, 4 * S, S + 1);
  ctx.fillRect(cx,          cy + 20 * S, 4 * S, S + 1);

  // Done badge
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
  const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

  const px = (walker.fromX + (walker.toX - walker.fromX) * eased) * W;
  const py = (walker.fromY + (walker.toY - walker.fromY) * eased) * H - 50;

  const color = AGENT_CONFIG[walker.agentId]?.color ?? '#888';
  const movingRight = walker.toX >= walker.fromX;
  const legSwing = Math.sin(timestamp / 110) * 5;
  const armSwing = Math.sin(timestamp / 110) * 5;

  // Shadow
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = '#000';
  ctx.fillRect(px - 9, py + 42, 18, 4);
  ctx.globalAlpha = 1;

  // Head
  ctx.fillStyle = color;
  ctx.fillRect(px - 4 * S, py, 8 * S, 8 * S);

  // Eyes facing direction of travel
  ctx.fillStyle = '#000';
  ctx.fillRect(px + (movingRight ? 1 : -2) * S, py + 2 * S, S, 2 * S);
  ctx.fillRect(px + (movingRight ? 3 : 0) * S,  py + 2 * S, S, 2 * S);
  ctx.fillRect(px - 2 * S, py + 5 * S, 4 * S, S);

  // Body
  ctx.fillStyle = color;
  ctx.fillRect(px - 3 * S, py + 8 * S, 6 * S, 7 * S);
  ctx.fillStyle = '#ffffffbb';
  ctx.fillRect(px - S, py + 8 * S, 2 * S, 2 * S);

  // Arms swinging
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

  // Speech bubble when near destination
  if (t > 0.6 && walker.label) {
    const bw = walker.label.length * 6 + 16;
    const bx = px - bw / 2;
    const by = py - 24;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, 18, 4);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(px - 5, by + 18);
    ctx.lineTo(px,     by + 26);
    ctx.lineTo(px + 5, by + 18);
    ctx.fill();
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

  // Desks + seated agents (skip ghost agents that share positions)
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

// ─── React Component ──────────────────────────────────────────────────────────

export function OfficeCanvas({ events, activeAgent: _ }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef(new OfficeEngine());
  const frameRef = useRef(0);
  const lastEventCountRef = useRef(0);

  // Process new events
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

  // Canvas setup + animation loop
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
