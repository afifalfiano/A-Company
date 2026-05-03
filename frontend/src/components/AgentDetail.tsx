import { AgentName, AGENT_CONFIG, ProjectItem } from "../models";

interface Props {
  agent: AgentName;
  project: ProjectItem;
  onClose: () => void;
}

interface OutputField {
  label: string;
  value: string | string[] | Record<string, string> | Array<{ name: string; type: string; steps: string[] }>;
}

function Field({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div style={{ marginBottom: "12px" }}>
      <span style={{ fontSize: "10px", color: "#666680", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</span>
      <p style={{ fontSize: "12px", color: "#c2c2d0", marginTop: "3px", lineHeight: "1.6" }}>{value}</p>
    </div>
  );
}

function ListField({ label, items }: { label: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div style={{ marginBottom: "12px" }}>
      <span style={{ fontSize: "10px", color: "#666680", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</span>
      <ul style={{ paddingLeft: "16px", marginTop: "4px", display: "flex", flexDirection: "column", gap: "4px" }}>
        {items.map((item, i) => (
          <li key={i} style={{ fontSize: "12px", color: "#9999b0", lineHeight: "1.5" }}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function CodeBlock({ value }: { value: string }) {
  if (!value) return null;
  return (
    <pre style={{
      background: "#1a1a26", border: "1px solid #2a2a3a",
      borderRadius: "8px", padding: "12px",
      fontSize: "11px", color: "#9999b0",
      overflow: "auto", lineHeight: "1.6",
      whiteSpace: "pre-wrap", wordBreak: "break-word",
    }}>
      {value}
    </pre>
  );
}

export function AgentDetail({ agent, project, onClose }: Props) {
  const config = AGENT_CONFIG[agent];
  const color = config?.color ?? "#666";

  const outputs: Record<AgentName, OutputField[]> = {
    ceo: [],
    cto: [
      { label: "Architecture", value: project.cto_output.architecture },
      { label: "Tech Stack", value: project.cto_output.tech_stack },
      { label: "System Design", value: project.cto_output.system_design },
      { label: "Technical Risks", value: project.cto_output.technical_risks },
    ],
    product_owner: [
      { label: "User Stories", value: project.product_owner_output.user_stories.map(
        (us, i) => `Story ${i + 1}: As a ${us.as}, I want ${us.want} so that ${us.so}`
      ) },
      { label: "Backlog", value: project.product_owner_output.backlog },
      { label: "Sprint Plan", value: project.product_owner_output.sprint_plan },
    ],
    product_manager: [
      { label: "Strategy", value: project.product_manager_output.strategy },
      { label: "Roadmap", value: project.product_manager_output.roadmap },
      { label: "Feature Priority", value: project.product_manager_output.feature_priority },
      { label: "Competitive Analysis", value: project.product_manager_output.competitive_analysis },
    ],
    business_marketing: [
      { label: "Market Analysis", value: project.business_marketing_output.market_analysis },
      { label: "Go-to-Market", value: project.business_marketing_output.go_to_market },
      { label: "Pricing Strategy", value: project.business_marketing_output.pricing_strategy },
      { label: "KPIs", value: project.business_marketing_output.kpis },
    ],
    engineer: [
      { label: "Implementation Plan", value: project.engineer_output.implementation_plan },
      { label: "Code Structure", value: project.engineer_output.code_structure },
      { label: "Estimates", value: Object.entries(project.engineer_output.estimates).map(([k, v]) => `${k}: ${v}`) },
      { label: "Dependencies", value: project.engineer_output.dependencies },
    ],
    designer: [
      { label: "Wireframes", value: project.designer_output.wireframes },
      { label: "Design System", value: project.designer_output.design_system },
      { label: "UX Flows", value: project.designer_output.ux_flows },
      { label: "Deliverables", value: project.designer_output.deliverables },
    ],
    qa: [
      { label: "Test Plan", value: project.qa_output.test_plan },
      { label: "Quality Gates", value: project.qa_output.quality_gates },
      { label: "Bug Risks", value: project.qa_output.bug_risks },
      { label: "Test Cases", value: project.qa_output.test_cases.map(tc => `${tc.name} (${tc.type})`) },
    ],
    finalize: [],
  };

  const fields = outputs[agent] ?? [];
  const agentLabel = config?.label ?? agent;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.8)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px",
    }}>
      <div style={{
        background: "#13131c", border: `1px solid ${color}44`,
        borderRadius: "16px", width: "100%", maxWidth: "680px",
        maxHeight: "80vh", overflow: "auto",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px", borderBottom: "1px solid #2a2a3a",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          position: "sticky", top: 0, background: "#13131c", zIndex: 1,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{
              width: "32px", height: "32px", borderRadius: "8px",
              background: color, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "12px", fontWeight: "700", color: "#fff",
            }}>
              {config?.icon ?? agent[0].toUpperCase()}
            </span>
            <div>
              <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#e2e2e8", marginBottom: "2px" }}>
                {agentLabel}
              </h3>
              <p style={{ fontSize: "11px", color: "#666680" }}>{config?.desc ?? ""}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "#222232", border: "1px solid #2a2a3a",
              color: "#9999b0", borderRadius: "8px",
              padding: "6px 12px", cursor: "pointer", fontSize: "12px",
            }}
          >
            Close
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px" }}>
          {agent === "ceo" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <span style={{ fontSize: "10px", color: "#666680", textTransform: "uppercase" }}>Accepted</span>
                  <p style={{ fontSize: "13px", color: project.ceo_decision.accepted ? "#1D9E75" : "#E24B4A" }}>
                    {project.ceo_decision.accepted ? "✓ Yes" : "✗ No"}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: "10px", color: "#666680", textTransform: "uppercase" }}>Priority</span>
                  <p style={{ fontSize: "13px", color: "#e2e2e8" }}>{project.ceo_decision.priority}</p>
                </div>
              </div>
              <Field label="Reasoning" value={project.ceo_decision.reasoning} />
              <Field label="Resource Allocation" value={project.ceo_decision.resource_allocation} />
            </>
          )}

          {agent === "finalize" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <span style={{ fontSize: "10px", color: "#666680", textTransform: "uppercase" }}>Approved</span>
                  <p style={{ fontSize: "13px", color: project.ceo_review.approved ? "#1D9E75" : "#E24B4A" }}>
                    {project.ceo_review.approved ? "✓ Yes" : "✗ No"}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: "10px", color: "#666680", textTransform: "uppercase" }}>Launch Decision</span>
                  <p style={{ fontSize: "13px", color: "#e2e2e8" }}>{project.ceo_review.launch_decision || "—"}</p>
                </div>
              </div>
              <Field label="Feedback" value={project.ceo_review.feedback} />
            </>
          )}

          {fields.map((f, i) => {
            if (Array.isArray(f.value) && f.value.length > 0 && typeof f.value[0] === "string") {
              return <ListField key={i} label={f.label} items={f.value as string[]} />;
            }
            if (typeof f.value === "string") {
              return <Field key={i} label={f.label} value={f.value} />;
            }
            return null;
          })}

          {fields.length === 0 && (
            <p style={{ fontSize: "12px", color: "#666680", textAlign: "center", padding: "20px" }}>
              No output available yet for this agent.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
