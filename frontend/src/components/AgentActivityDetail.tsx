import { AgentEvent, AgentName, AGENT_CONFIG } from "../models";

interface Props {
  agent: AgentName;
  events: AgentEvent[];
  onClose: () => void;
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  started:  { label: "Started",  color: "#EF9F27" },
  thinking: { label: "Thinking", color: "#378ADD" },
  done:     { label: "Done",     color: "#1D9E75" },
  error:    { label: "Error",    color: "#E24B4A" },
};

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function AgentActivityDetail({ agent, events, onClose }: Props) {
  const config = AGENT_CONFIG[agent];
  const color = config?.color ?? "#666";

  // Filter + sort events for this agent only
  const agentEvents = events
    .filter((e) => e.agent === agent)
    .sort((a, b) => a.timestamp - b.timestamp);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300,
      background: "rgba(0,0,0,0.85)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px",
    }}>
      <div style={{
        background: "#13131c", border: `1px solid ${color}44`,
        borderRadius: "16px", width: "100%", maxWidth: "640px",
        maxHeight: "80vh", display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px", borderBottom: "1px solid #2a2a3a",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{
              width: "36px", height: "36px", borderRadius: "10px",
              background: color, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "13px", fontWeight: "700", color: "#fff",
            }}>
              {config?.icon ?? agent[0].toUpperCase()}
            </span>
            <div>
              <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#e2e2e8", marginBottom: "2px" }}>
                {config?.label ?? agent}
              </h3>
              <p style={{ fontSize: "11px", color: "#666680" }}>{config?.desc ?? ""}</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <span style={{ fontSize: "11px", color: "#666680", alignSelf: "center" }}>
              {agentEvents.length} event{agentEvents.length !== 1 ? "s" : ""}
            </span>
            <button
              onClick={onClose}
              style={{
                background: "#222232", border: "1px solid #2a2a3a",
                color: "#9999b0", borderRadius: "8px",
                padding: "6px 14px", cursor: "pointer", fontSize: "12px",
              }}
            >
              Close
            </button>
          </div>
        </div>

        {/* Step timeline */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          {agentEvents.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#666680", fontSize: "13px" }}>
              No events recorded yet for this agent.
            </div>
          ) : (
            <div style={{ position: "relative" }}>
              {/* Vertical line */}
              <div style={{
                position: "absolute",
                left: "15px", top: 0, bottom: 0,
                width: "2px",
                background: `linear-gradient(to bottom, ${color}44, transparent)`,
              }} />

              {agentEvents.map((ev, i) => {
                const meta = STATUS_META[ev.status] ?? { label: ev.status, color: "#666" };
                const isLast = i === agentEvents.length - 1;
                return (
                  <div key={i} style={{ display: "flex", gap: "14px", marginBottom: isLast ? 0 : "20px", position: "relative" }}>
                    {/* Node dot */}
                    <div style={{
                      width: "32px", height: "32px", borderRadius: "50%",
                      background: `${meta.color}22`,
                      border: `2px solid ${meta.color}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, zIndex: 1,
                      fontSize: "11px",
                    }}>
                      {ev.status === "started" && <span style={{ color: meta.color, fontSize: "10px" }}>▶</span>}
                      {ev.status === "thinking" && <span style={{ color: meta.color, fontSize: "12px" }}>◌</span>}
                      {ev.status === "done" && <span style={{ color: meta.color, fontSize: "10px" }}>✓</span>}
                      {ev.status === "error" && <span style={{ color: meta.color, fontSize: "10px" }}>✗</span>}
                    </div>

                    {/* Card */}
                    <div style={{
                      flex: 1, background: "#1a1a26",
                      border: `1px solid ${ev.status === "done" ? meta.color + "44" : "#2a2a3a"}`,
                      borderRadius: "10px", padding: "12px 14px",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          <span style={{
                            fontSize: "10px", fontWeight: "600",
                            color: meta.color, background: `${meta.color}22`,
                            padding: "2px 8px", borderRadius: "10px",
                          }}>
                            {meta.label}
                          </span>
                          {ev.phase && ev.phase !== "intake" && (
                            <span style={{ fontSize: "10px", color: "#666680", background: "#222232", padding: "2px 8px", borderRadius: "10px" }}>
                              {ev.phase}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: "10px", color: "#555570" }}>
                          {formatTime(ev.timestamp)}
                        </span>
                      </div>
                      <p style={{ fontSize: "13px", color: "#c2c2d0", lineHeight: "1.5", margin: 0 }}>
                        {ev.message}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
