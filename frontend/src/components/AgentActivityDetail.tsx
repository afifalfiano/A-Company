import { AgentEvent, AgentName, ProjectItem, AGENT_CONFIG } from "../models";

interface Props {
  agent: AgentName;
  events: AgentEvent[];
  project: ProjectItem;
  onClose: () => void;
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  started:    { label: "Started",    color: "#EF9F27" },
  thinking:   { label: "Thinking",   color: "#378ADD" },
  done:       { label: "Done",       color: "#1D9E75" },
  error:      { label: "Error",      color: "#E24B4A" },
  token_usage:{ label: "Tokens",     color: "#9B59B6" },
};

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ─── Output renderers per agent ───────────────────────────────────────────────

function CeoOutput({ project }: { project: ProjectItem }) {
  const d = project.ceo_decision;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <span style={{
          padding: "4px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: 700,
          background: d.accepted ? "#1D9E75" : "#E24B4A",
          color: "#fff",
        }}>
          {d.accepted ? "ACCEPTED" : "REJECTED"}
        </span>
        <span style={{ fontSize: "12px", color: "#999", background: "#222232", padding: "3px 10px", borderRadius: "10px" }}>
          {d.priority} priority
        </span>
      </div>
      {d.reasoning && (
        <div>
          <div style={{ fontSize: "10px", color: "#666680", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Reasoning</div>
          <p style={{ fontSize: "12px", color: "#c2c2d0", lineHeight: "1.5", margin: 0 }}>{d.reasoning}</p>
        </div>
      )}
      {d.resource_allocation && (
        <div>
          <div style={{ fontSize: "10px", color: "#666680", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Resource Allocation</div>
          <p style={{ fontSize: "12px", color: "#c2c2d0", margin: 0 }}>{d.resource_allocation}</p>
        </div>
      )}
    </div>
  );
}

function CtoOutput({ project }: { project: ProjectItem }) {
  const o = project.cto_output;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {o.architecture && (
        <div>
          <div style={{ fontSize: "10px", color: "#666680", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Architecture</div>
          <p style={{ fontSize: "12px", color: "#c2c2d0", lineHeight: "1.5", margin: 0 }}>{o.architecture}</p>
        </div>
      )}
      {o.tech_stack.length > 0 && (
        <div>
          <div style={{ fontSize: "10px", color: "#666680", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Tech Stack</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {o.tech_stack.map((t, i) => (
              <span key={i} style={{ fontSize: "11px", padding: "3px 10px", background: "#222232", border: "1px solid #333348", borderRadius: "6px", color: "#a89eff" }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
      {o.system_design && (
        <div>
          <div style={{ fontSize: "10px", color: "#666680", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>System Design</div>
          <p style={{ fontSize: "12px", color: "#c2c2d0", lineHeight: "1.5", margin: 0, whiteSpace: "pre-wrap" }}>{o.system_design}</p>
        </div>
      )}
      {o.technical_risks.length > 0 && (
        <div>
          <div style={{ fontSize: "10px", color: "#666680", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Technical Risks</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {o.technical_risks.map((r, i) => (
              <div key={i} style={{ fontSize: "12px", color: "#f87171", background: "#2a0e0e", border: "1px solid #4a1a1a", borderRadius: "6px", padding: "6px 10px" }}>
                ⚠ {r}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProductOwnerOutput({ project }: { project: ProjectItem }) {
  const o = project.product_owner_output;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {o.user_stories.length > 0 && (
        <div>
          <div style={{ fontSize: "10px", color: "#666680", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>User Stories</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {o.user_stories.map((us, i) => (
              <div key={i} style={{ background: "#1a1a26", border: "1px solid #2a2a3a", borderRadius: "8px", padding: "10px 12px" }}>
                <div style={{ fontSize: "11px", color: "#D4537E", fontWeight: 600, marginBottom: "4px" }}>AS: {us.as}</div>
                <div style={{ fontSize: "12px", color: "#c2c2d0" }}>I want <strong style={{ color: "#e2e2e8" }}>{us.want}</strong></div>
                <div style={{ fontSize: "11px", color: "#888" }}>So that: {us.so}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {o.backlog.length > 0 && (
        <div>
          <div style={{ fontSize: "10px", color: "#666680", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Backlog ({o.backlog.length})</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            {o.backlog.map((b, i) => (
              <div key={i} style={{ fontSize: "11px", color: "#999", padding: "4px 8px", background: "#1a1a26", borderRadius: "4px" }}>
                {i + 1}. {b}
              </div>
            ))}
          </div>
        </div>
      )}
      {o.sprint_plan && (
        <div>
          <div style={{ fontSize: "10px", color: "#666680", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Sprint Plan</div>
          <p style={{ fontSize: "12px", color: "#c2c2d0", lineHeight: "1.5", margin: 0, whiteSpace: "pre-wrap" }}>{o.sprint_plan}</p>
        </div>
      )}
    </div>
  );
}

function ProductManagerOutput({ project }: { project: ProjectItem }) {
  const o = project.product_manager_output;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {o.strategy && (
        <div>
          <div style={{ fontSize: "10px", color: "#666680", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Strategy</div>
          <p style={{ fontSize: "12px", color: "#c2c2d0", lineHeight: "1.5", margin: 0 }}>{o.strategy}</p>
        </div>
      )}
      {o.feature_priority.length > 0 && (
        <div>
          <div style={{ fontSize: "10px", color: "#666680", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Feature Priority</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {o.feature_priority.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#c2c2d0" }}>
                <span style={{ color: "#E24B4A", fontWeight: 700, minWidth: "16px" }}>#{i + 1}</span>
                {f}
              </div>
            ))}
          </div>
        </div>
      )}
      {o.roadmap.length > 0 && (
        <div>
          <div style={{ fontSize: "10px", color: "#666680", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Roadmap</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {o.roadmap.map((r, i) => (
              <div key={i} style={{ fontSize: "12px", color: "#c2c2d0", background: "#1a1a26", padding: "6px 10px", borderRadius: "6px", borderLeft: "3px solid #E24B4A" }}>
                {r}
              </div>
            ))}
          </div>
        </div>
      )}
      {o.competitive_analysis && (
        <div>
          <div style={{ fontSize: "10px", color: "#666680", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Competitive Analysis</div>
          <p style={{ fontSize: "12px", color: "#c2c2d0", lineHeight: "1.5", margin: 0, whiteSpace: "pre-wrap" }}>{o.competitive_analysis}</p>
        </div>
      )}
    </div>
  );
}

function BusinessMarketingOutput({ project }: { project: ProjectItem }) {
  const o = project.business_marketing_output;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {o.market_analysis && (
        <div>
          <div style={{ fontSize: "10px", color: "#666680", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Market Analysis</div>
          <p style={{ fontSize: "12px", color: "#c2c2d0", lineHeight: "1.5", margin: 0, whiteSpace: "pre-wrap" }}>{o.market_analysis}</p>
        </div>
      )}
      {o.go_to_market.length > 0 && (
        <div>
          <div style={{ fontSize: "10px", color: "#666680", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Go-to-Market</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {o.go_to_market.map((g, i) => (
              <div key={i} style={{ fontSize: "12px", color: "#c2c2d0", background: "#1a1a26", padding: "6px 10px", borderRadius: "6px" }}>
                {i + 1}. {g}
              </div>
            ))}
          </div>
        </div>
      )}
      {o.pricing_strategy && (
        <div>
          <div style={{ fontSize: "10px", color: "#666680", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Pricing Strategy</div>
          <p style={{ fontSize: "12px", color: "#c2c2d0", margin: 0 }}>{o.pricing_strategy}</p>
        </div>
      )}
      {o.kpis.length > 0 && (
        <div>
          <div style={{ fontSize: "10px", color: "#666680", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>KPIs</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {o.kpis.map((k, i) => (
              <span key={i} style={{ fontSize: "11px", padding: "3px 10px", background: "#2a1a0e", border: "1px solid #5a3a1a", borderRadius: "6px", color: "#EF9F27" }}>
                📊 {k}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EngineerOutput({ project }: { project: ProjectItem }) {
  const o = project.engineer_output;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {o.implementation_plan.length > 0 && (
        <div>
          <div style={{ fontSize: "10px", color: "#666680", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Implementation Plan</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {o.implementation_plan.map((p, i) => (
              <div key={i} style={{ fontSize: "12px", color: "#c2c2d0", background: "#1a1a26", padding: "6px 10px", borderRadius: "6px", borderLeft: "3px solid #1D9E75" }}>
                {i + 1}. {p}
              </div>
            ))}
          </div>
        </div>
      )}
      {o.code_structure && (
        <div>
          <div style={{ fontSize: "10px", color: "#666680", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Code Structure</div>
          <pre style={{ fontSize: "11px", color: "#7F77DD", background: "#1a1a26", padding: "10px", borderRadius: "8px", border: "1px solid #2a2a3a", margin: 0, overflow: "auto", whiteSpace: "pre-wrap" }}>
            {o.code_structure}
          </pre>
        </div>
      )}
      {o.dependencies.length > 0 && (
        <div>
          <div style={{ fontSize: "10px", color: "#666680", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Dependencies</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {o.dependencies.map((d, i) => (
              <span key={i} style={{ fontSize: "11px", padding: "3px 10px", background: "#1a2a20", border: "1px solid #2a4a35", borderRadius: "6px", color: "#1D9E75" }}>
                {d}
              </span>
            ))}
          </div>
        </div>
      )}
      {Object.keys(o.estimates).length > 0 && (
        <div>
          <div style={{ fontSize: "10px", color: "#666680", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Estimates</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {Object.entries(o.estimates).map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "5px 10px", background: "#1a1a26", borderRadius: "6px" }}>
                <span style={{ color: "#888" }}>{k}</span>
                <span style={{ color: "#c2c2d0" }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DesignerOutput({ project }: { project: ProjectItem }) {
  const o = project.designer_output;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {o.wireframes.length > 0 && (
        <div>
          <div style={{ fontSize: "10px", color: "#666680", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Wireframes ({o.wireframes.length})</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {o.wireframes.map((w, i) => (
              <div key={i} style={{ fontSize: "11px", color: "#9B59B6", background: "#1a0e2a", padding: "6px 10px", borderRadius: "6px", borderLeft: "3px solid #9B59B6" }}>
                {w.slice(0, 80)}{w.length > 80 ? "..." : ""}
              </div>
            ))}
          </div>
        </div>
      )}
      {o.design_system && (
        <div>
          <div style={{ fontSize: "10px", color: "#666680", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Design System</div>
          <p style={{ fontSize: "12px", color: "#c2c2d0", lineHeight: "1.5", margin: 0, whiteSpace: "pre-wrap" }}>{o.design_system.slice(0, 300)}{o.design_system.length > 300 ? "..." : ""}</p>
        </div>
      )}
      {o.ux_flows.length > 0 && (
        <div>
          <div style={{ fontSize: "10px", color: "#666680", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>UX Flows</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {o.ux_flows.map((f, i) => (
              <div key={i} style={{ fontSize: "11px", color: "#c2c2d0", background: "#1a1a26", padding: "6px 10px", borderRadius: "6px" }}>
                → {f}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function QaOutput({ project }: { project: ProjectItem }) {
  const o = project.qa_output;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {o.test_plan && (
        <div>
          <div style={{ fontSize: "10px", color: "#666680", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Test Plan</div>
          <p style={{ fontSize: "12px", color: "#c2c2d0", lineHeight: "1.5", margin: 0, whiteSpace: "pre-wrap" }}>{o.test_plan}</p>
        </div>
      )}
      {o.test_cases.length > 0 && (
        <div>
          <div style={{ fontSize: "10px", color: "#666680", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Test Cases ({o.test_cases.length})</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {o.test_cases.slice(0, 5).map((tc, i) => (
              <div key={i} style={{ background: "#1a1a26", border: "1px solid #2a2a3a", borderRadius: "8px", padding: "8px 12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontSize: "12px", color: "#e2e2e8", fontWeight: 600 }}>{tc.name}</span>
                  <span style={{ fontSize: "10px", color: "#E67E22", background: "#2a1a0e", padding: "2px 8px", borderRadius: "10px" }}>{tc.type}</span>
                </div>
                <div style={{ fontSize: "11px", color: "#888" }}>Steps: {tc.steps.join(" → ")}</div>
              </div>
            ))}
            {o.test_cases.length > 5 && (
              <div style={{ fontSize: "11px", color: "#666680", textAlign: "center" }}>+{o.test_cases.length - 5} more test cases</div>
            )}
          </div>
        </div>
      )}
      {o.quality_gates.length > 0 && (
        <div>
          <div style={{ fontSize: "10px", color: "#666680", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Quality Gates</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {o.quality_gates.map((g, i) => (
              <div key={i} style={{ fontSize: "12px", color: "#1D9E75", background: "#0e2a1a", padding: "5px 10px", borderRadius: "6px", borderLeft: "3px solid #1D9E75" }}>
                ✓ {g}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CodeGenOutput({ project }: { project: ProjectItem }) {
  const o = project.generated_code;
  if (!o) return <div style={{ fontSize: "12px", color: "#666680" }}>No code generated yet.</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "11px", padding: "3px 10px", background: "#2a2645", border: "1px solid #7F77DD44", borderRadius: "6px", color: "#9B8FD9" }}>
          ⚡ {o.mode}
        </span>
        <span style={{ fontSize: "11px", padding: "3px 10px", background: "#1a3028", border: "1px solid #2a5040", borderRadius: "6px", color: "#1D9E75" }}>
          📦 {o.file_count} files
        </span>
        <span style={{ fontSize: "11px", padding: "3px 10px", background: "#1a1a26", border: "1px solid #2a2a3a", borderRadius: "6px", color: "#888" }}>
          {new Date(o.generated_at).toLocaleTimeString("id-ID")}
        </span>
      </div>
      <div style={{ fontSize: "10px", color: "#555570" }}>Zip path: <code style={{ color: "#7F77DD" }}>{o.zip_path}</code></div>
    </div>
  );
}

function DesignGenOutput({ project }: { project: ProjectItem }) {
  const o = project.design_gen;
  if (!o) return <div style={{ fontSize: "12px", color: "#666680" }}>No design generated yet.</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "11px", padding: "3px 10px", background: "#2a1a3d", border: "1px solid #9B59B644", borderRadius: "6px", color: "#BB79D9" }}>
          🎨 {o.file_count} files
        </span>
        <span style={{ fontSize: "11px", padding: "3px 10px", background: "#1a1a26", border: "1px solid #2a2a3a", borderRadius: "6px", color: "#888" }}>
          {new Date(o.generated_at).toLocaleTimeString("id-ID")}
        </span>
      </div>
      <div style={{ fontSize: "10px", color: "#555570" }}>Output: <code style={{ color: "#9B59B6" }}>{o.output_path}</code></div>
    </div>
  );
}

function NoOutput({ agent }: { agent: AgentName }) {
  return <div style={{ fontSize: "12px", color: "#555570", fontStyle: "italic" }}>No output from {agent} yet.</div>;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AgentActivityDetail({ agent, events, project, onClose }: Props) {
  const config = AGENT_CONFIG[agent];
  const color = config?.color ?? "#666";

  const agentEvents = events
    .filter((e) => e.agent === agent)
    .sort((a, b) => a.timestamp - b.timestamp);

  // Step progress — derive from events
  const stepIcons = agentEvents.map((ev) => STATUS_META[ev.status] ?? { label: ev.status, color: "#666" });
  const currentStep = agentEvents.length > 0 ? agentEvents.length - 1 : 0;
  const isActive = agentEvents[currentStep]?.status === "started" || agentEvents[currentStep]?.status === "thinking";

  function renderOutput() {
    switch (agent) {
      case "ceo":        return <CeoOutput project={project} />;
      case "cto":        return <CtoOutput project={project} />;
      case "product_owner":    return <ProductOwnerOutput project={project} />;
      case "product_manager":    return <ProductManagerOutput project={project} />;
      case "business_marketing":return <BusinessMarketingOutput project={project} />;
      case "engineer":   return <EngineerOutput project={project} />;
      case "designer":   return <DesignerOutput project={project} />;
      case "qa":         return <QaOutput project={project} />;
      case "code_generator":    return <CodeGenOutput project={project} />;
      case "design_generator":   return <DesignGenOutput project={project} />;
      default:           return <NoOutput agent={agent} />;
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300,
      background: "rgba(0,0,0,0.85)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px",
    }}>
      <div style={{
        background: "#13131c", border: `1px solid ${color}44`,
        borderRadius: "16px", width: "100%", maxWidth: "680px",
        maxHeight: "85vh", display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px", borderBottom: "1px solid #2a2a3a",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {/* Step dots */}
            {stepIcons.length > 0 && (
              <div style={{ display: "flex", gap: "4px", marginRight: "8px" }}>
                {stepIcons.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      width: "8px", height: "8px", borderRadius: "50%",
                      background: i === currentStep && isActive ? s.color : i < currentStep ? s.color : "#333348",
                      opacity: i === currentStep && isActive ? 1 : i <= currentStep ? 1 : 0.4,
                      transition: "all 0.3s ease",
                    }}
                    title={s.label}
                  />
                ))}
              </div>
            )}
            <span style={{ fontSize: "11px", color: "#666680" }}>
              {agentEvents.length} step{agentEvents.length !== 1 ? "s" : ""}
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

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>

          {/* Step timeline */}
          {agentEvents.length > 0 && (
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e1e2e" }}>
              <div style={{ fontSize: "10px", color: "#555570", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>
                Progress
              </div>
              <div style={{ display: "flex", gap: "0", position: "relative" }}>
                {agentEvents.map((ev, i) => {
                  const meta = STATUS_META[ev.status] ?? { label: ev.status, color: "#666" };
                  const isLast = i === agentEvents.length - 1;
                  return (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                      {/* connector line */}
                      {i > 0 && (
                        <div style={{
                          position: "absolute",
                          top: "14px", left: "-50%", right: "50%",
                          height: "2px",
                          background: i <= currentStep ? meta.color : "#2a2a3a",
                          zIndex: 0,
                        }} />
                      )}
                      {/* dot */}
                      <div style={{
                        width: "28px", height: "28px", borderRadius: "50%",
                        background: i <= currentStep ? `${meta.color}22` : "#1a1a26",
                        border: `2px solid ${i <= currentStep ? meta.color : "#333348"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "11px", zIndex: 1,
                        transition: "all 0.3s ease",
                      }}>
                        {ev.status === "started" && <span style={{ color: meta.color, fontSize: "10px" }}>▶</span>}
                        {ev.status === "thinking" && <span style={{ color: meta.color, fontSize: "12px", animation: "pulse 1s infinite" }}>◌</span>}
                        {ev.status === "done" && <span style={{ color: meta.color, fontSize: "10px" }}>✓</span>}
                        {ev.status === "error" && <span style={{ color: meta.color, fontSize: "10px" }}>✗</span>}
                        {ev.status === "token_usage" && <span style={{ color: meta.color, fontSize: "9px" }}>⚡</span>}
                      </div>
                      {/* label */}
                      <div style={{ fontSize: "10px", color: i <= currentStep ? meta.color : "#555", marginTop: "6px", textAlign: "center", lineHeight: "1.3" }}>
                        {meta.label}
                      </div>
                      {ev.status === "token_usage" && ev.token_usage && (
                        <div style={{ fontSize: "9px", color: "#555", marginTop: "2px" }}>
                          {ev.token_usage.input_tokens.toLocaleString()} / {ev.token_usage.output_tokens.toLocaleString()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Event log */}
          {agentEvents.length > 0 && (
            <div style={{ padding: "12px 20px", borderBottom: "1px solid #1e1e2e" }}>
              <div style={{ fontSize: "10px", color: "#555570", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>
                Event Log
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "120px", overflowY: "auto" }}>
                {agentEvents.map((ev, i) => (
                  <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                    <span style={{ fontSize: "10px", color: "#444", minWidth: "60px", marginTop: "1px" }}>
                      {formatTime(ev.timestamp)}
                    </span>
                    <span style={{
                      fontSize: "10px", padding: "1px 6px", borderRadius: "4px",
                      background: `${(STATUS_META[ev.status]?.color ?? "#666")}22`,
                      color: STATUS_META[ev.status]?.color ?? "#666",
                    }}>
                      {ev.status}
                    </span>
                    <span style={{ fontSize: "11px", color: "#999", flex: 1 }}>{ev.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Structured output */}
          <div style={{ padding: "16px 20px" }}>
            <div style={{ fontSize: "10px", color: "#555570", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>
              Output
            </div>
            {renderOutput()}
          </div>
        </div>
      </div>
    </div>
  );
}