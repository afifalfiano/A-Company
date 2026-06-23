import { useState } from "react";
import { AgentEvent, AgentName, ProjectItem } from "../models";
import { AgentActivityDetail } from "./AgentActivityDetail";
import { OfficeCanvas } from "./OfficeCanvas";

const STATUS_ICON: Record<string, string> = {
  started:    "▶",
  thinking:    "◌",
  done:        "✓",
  error:       "✗",
  token_usage: "⚡",
};

interface Props {
  events: AgentEvent[];
  processing: boolean;
  activeAgent: AgentName | null;
  project: ProjectItem | null;
  onAgentClick?: (agent: AgentName) => void;
}

const AGENT_SHORT: Record<string, string> = {
  ceo:                "C",
  cto:                "T",
  product_owner:      "PO",
  product_manager:    "PM",
  business_marketing: "BM",
  engineer:           "E",
  designer:           "D",
  qa:                 "Q",
  finalize:           "✓",
};

const AGENT_COLOR: Record<string, string> = {
  ceo:                "#7F77DD",
  cto:                "#378ADD",
  product_owner:      "#D4537E",
  product_manager:    "#E24B4A",
  business_marketing: "#EF9F27",
  engineer:           "#1D9E75",
  designer:           "#9B59B6",
  qa:                 "#E67E22",
  finalize:           "#639922",
};

export function AgentActivity({ events, processing, activeAgent, project, onAgentClick }: Props) {
  const [selectedAgent, setSelectedAgent] = useState<AgentName | null>(null);
  const [view, setView] = useState<'office' | 'log'>('office');

  // Derive latest event per agent for progress
  const latestPerAgent = events.reduce<Record<string, AgentEvent>>((acc, ev) => {
    acc[ev.agent] = ev;
    return acc;
  }, {} as Record<string, AgentEvent>);

  // Accumulate tokens from token_usage events
  const tokenSummary = events.reduce<{ input: number; output: number }>((acc, ev) => {
    if (ev.status === "token_usage" && ev.token_usage) {
      acc.input += ev.token_usage.input_tokens;
      acc.output += ev.token_usage.output_tokens;
    }
    return acc;
  }, { input: 0, output: 0 });

  const handleAgentClick = (agent: AgentName) => {
    if (!project) return;
    setSelectedAgent(agent);
    onAgentClick?.(agent);
  };

  const getProgress = (agent: string) => {
    const ev = latestPerAgent[agent];
    if (!ev) return 0;
    switch (ev.status) {
      case "started":  return 25;
      case "thinking":  return 75;
      case "done":     return 100;
      case "error":    return 100;
      default:         return 0;
    }
  };
  return (
    <div className="panel">
      <div className="panel-header" style={{ flexDirection: 'column', gap: 6, alignItems: 'stretch' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 style={{ flex: 1 }}>Agent Activity</h2>
          {processing && <span className="spinner" />}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['office', 'log'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                flex: 1, padding: '4px 0', fontSize: 11,
                fontFamily: 'monospace',
                background: view === v ? '#7F77DD' : '#1a1a2e',
                color: view === v ? '#fff' : '#666',
                border: '1px solid #2a2a4a', borderRadius: 4, cursor: 'pointer',
              }}
            >
              {v === 'office' ? '🏢 Office' : '📋 Log'}
            </button>
          ))}
        </div>
      </div>

      {view === 'office' && (
        <div style={{ height: 500, margin: '8px 0', borderRadius: 6, overflow: 'hidden', border: '1px solid #1a1a3a' }}>
          <OfficeCanvas events={events} activeAgent={activeAgent} />
        </div>
      )}

      {view === 'log' && tokenSummary.input > 0 && (
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

      {view === 'log' && <div className="agent-roster">
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
      </div>}

      {view === 'log' && <div className="divider" />}

      {view === 'log' && events.length === 0 && !processing && (
        <p className="empty">No activity yet. Submit a project to get started!</p>
      )}
      {view === 'log' && <div className="event-list">
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
      </div>}

      {selectedAgent && project && (
        <AgentActivityDetail
          agent={selectedAgent}
          events={events}
          project={project}
          onClose={() => setSelectedAgent(null)}
        />
      )}
    </div>
  );
}