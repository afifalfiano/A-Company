import { ProjectItem, PHASE_COLORS, PRIORITY_COLORS } from "../models";
import { generatePRD, generateTRD } from "../utils/documentGenerator";

interface Props {
  project: ProjectItem;
  onClose: () => void;
}

const SECTION_COLORS: Record<string, string> = {
  ceo_decision:              "#7F77DD",
  cto_output:                "#378ADD",
  product_owner_output:     "#D4537E",
  product_manager_output:   "#E24B4A",
  business_marketing_output:"#EF9F27",
  engineer_output:          "#1D9E75",
  designer_output:          "#9B59B6",
  qa_output:               "#E67E22",
  ceo_review:              "#639922",
};

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
        <span style={{ width: "3px", height: "16px", background: color, borderRadius: "2px" }} />
        <span style={{ fontSize: "13px", fontWeight: "600", color }}>{title}</span>
      </div>
      <div style={{ paddingLeft: "14px" }}>{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined) return null;
  // stringify objects/arrays so they render as text, not React children
  const display = typeof value === "object" ? JSON.stringify(value) : String(value);
  return (
    <div style={{ marginBottom: "8px" }}>
      <span style={{ fontSize: "11px", color: "#666680", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</span>
      <p style={{ fontSize: "13px", color: "#e2e2e8", marginTop: "2px", lineHeight: "1.5" }}>{display}</p>
    </div>
  );
}

function ListField({ label, items }: { label: string; items: unknown }) {
  if (!items) return null;
  // ensure array
  const arr = Array.isArray(items) ? items : [items];
  if (arr.length === 0) return null;
  return (
    <div style={{ marginBottom: "10px" }}>
      <span style={{ fontSize: "11px", color: "#666680", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</span>
      <ul style={{ paddingLeft: "16px", marginTop: "4px", display: "flex", flexDirection: "column", gap: "3px" }}>
        {arr.map((item, i) => (
          <li key={i} style={{ fontSize: "12px", color: "#9999b0", lineHeight: "1.4" }}>
            {typeof item === "object" && item !== null ? JSON.stringify(item) : String(item ?? "")}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CodeBlock({ value }: { value: unknown }) {
  if (value === null || value === undefined) return null;
  const display = typeof value === "string" ? value : JSON.stringify(value);
  return (
    <pre style={{
      background: "#1a1a26", border: "1px solid #2a2a3a",
      borderRadius: "8px", padding: "12px",
      fontSize: "11px", color: "#9999b0",
      overflow: "auto", lineHeight: "1.6",
      whiteSpace: "pre-wrap", wordBreak: "break-word",
    }}>
      {display}
    </pre>
  );
}

export function ProjectDetail({ project, onClose }: Props) {
  const phaseColor = PHASE_COLORS[project.current_phase] ?? "#666";
  const priorityColor = PRIORITY_COLORS[project.ceo_decision?.priority] ?? "#666";

  // Normalize missing agent outputs — projects may be partial if loaded from stale state
  const ceoDec   = project.ceo_decision             ?? { accepted: false, priority: "—", reasoning: "", resource_allocation: "" };
  const cto      = project.cto_output               ?? { architecture: "", tech_stack: [], system_design: "", technical_risks: [] };
  const po       = project.product_owner_output     ?? { user_stories: [], backlog: [], sprint_plan: "" };
  const pm       = project.product_manager_output   ?? { strategy: "", roadmap: [], feature_priority: [], competitive_analysis: "" };
  const bm       = project.business_marketing_output ?? { market_analysis: "", go_to_market: [], pricing_strategy: "", kpis: [] };
  const eng      = project.engineer_output          ?? { implementation_plan: [], code_structure: "", estimates: {}, dependencies: [] };
  const des      = project.designer_output          ?? { wireframes: [], design_system: "", ux_flows: [], deliverables: [] };
  const qa       = project.qa_output                ?? { test_plan: "", test_cases: [], quality_gates: [], bug_risks: [] };
  const ceoRev   = project.ceo_review               ?? { approved: false, feedback: "", launch_decision: "" };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px",
      pointerEvents: "none",
    }}>
      <div style={{
        background: "#13131c", border: "1px solid #2a2a3a",
        borderRadius: "16px", width: "100%", maxWidth: "800px",
        maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column",
        pointerEvents: "auto",
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 24px", borderBottom: "1px solid #2a2a3a",
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          background: "#13131c", zIndex: 1, flexShrink: 0,
        }}>
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#e2e2e8", marginBottom: "4px" }}>
              {project.project_title}
            </h2>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "11px", color: phaseColor, border: `1px solid ${phaseColor}44`, padding: "2px 8px", borderRadius: "10px" }}>
                {project.current_phase}
              </span>
              <span style={{ fontSize: "11px", color: priorityColor, background: `${priorityColor}22`, padding: "2px 8px", borderRadius: "10px" }}>
                {ceoDec.priority}
              </span>
              <span style={{ fontSize: "11px", color: "#666680", padding: "2px 8px", borderRadius: "10px" }}>
                #{project.project_id}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <button
              onClick={() => {
                const blob = new Blob([generatePRD(project)], { type: "text/markdown" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${project.project_title.replace(/\s+/g, "-").toLowerCase()}-PRD.md`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              style={{
                background: "#222232", border: "1px solid #2a2a3a",
                color: "#EF9F27", borderRadius: "8px",
                padding: "6px 12px", cursor: "pointer", fontSize: "12px",
                display: "flex", alignItems: "center", gap: "4px",
              }}
              title="Download PRD"
            >
              📥 PRD
            </button>
            <button
              onClick={() => {
                const blob = new Blob([generateTRD(project)], { type: "text/markdown" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${project.project_title.replace(/\s+/g, "-").toLowerCase()}-TRD.md`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              style={{
                background: "#222232", border: "1px solid #2a2a3a",
                color: "#378ADD", borderRadius: "8px",
                padding: "6px 12px", cursor: "pointer", fontSize: "12px",
                display: "flex", alignItems: "center", gap: "4px",
              }}
              title="Download TRD"
            >
              📥 TRD
            </button>
            {project.generated_code && (
              <a
                href={`/download/${project.project_id}`}
                style={{
                  background: "#222232", border: "1px solid #2a2a3a",
                  color: "#7F77DD", borderRadius: "8px",
                  padding: "6px 12px", cursor: "pointer", fontSize: "12px",
                  display: "flex", alignItems: "center", gap: "4px",
                  textDecoration: "none",
                }}
                title="Download Generated Code"
              >
                📦 Download Code
              </a>
            )}
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
        </div>

        {/* Body */}
        <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
          {project.project_description && (
            <Field label="Description" value={project.project_description} />
          )}

          {/* CEO Decision */}
          <Section title="CEO Decision" color={SECTION_COLORS.ceo_decision}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <span style={{ fontSize: "11px", color: "#666680" }}>Accepted</span>
                <p style={{ fontSize: "13px", color: ceoDec.accepted ? "#1D9E75" : "#E24B4A" }}>
                  {ceoDec.accepted ? "✓ Yes" : "✗ No"}
                </p>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "#666680" }}>Priority</span>
                <p style={{ fontSize: "13px", color: priorityColor }}>{ceoDec.priority}</p>
              </div>
            </div>
            <Field label="Reasoning" value={ceoDec.reasoning} />
            <Field label="Resource Allocation" value={ceoDec.resource_allocation} />
          </Section>

          {/* CTO Output */}
          <Section title="CTO — Architecture & Tech Stack" color={SECTION_COLORS.cto_output}>
            <Field label="Architecture" value={cto.architecture} />
            <ListField label="Tech Stack" items={cto.tech_stack} />
            <Field label="System Design" value={cto.system_design} />
            <ListField label="Technical Risks" items={cto.technical_risks} />
          </Section>

          {/* Product Owner Output */}
          <Section title="Product Owner — User Stories & Backlog" color={SECTION_COLORS.product_owner_output}>
            {po.user_stories.map((us, i) => (
              <div key={i} style={{ marginBottom: "12px", background: "#1a1a26", borderRadius: "8px", padding: "10px" }}>
                <div style={{ fontSize: "12px", color: "#D4537E", marginBottom: "4px" }}>Story #{i + 1}</div>
                <p style={{ fontSize: "12px", color: "#e2e2e8", marginBottom: "4px" }}>
                  <strong>As a</strong> {us.as} <strong>want</strong> {us.want} <strong>so that</strong> {us.so}
                </p>
                {(us.acceptance ?? []).length > 0 && (
                  <ul style={{ paddingLeft: "14px" }}>
                    {(us.acceptance ?? []).map((a, j) => (
                      <li key={j} style={{ fontSize: "11px", color: "#9999b0" }}>{a}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            <Field label="Sprint Plan" value={po.sprint_plan} />
          </Section>

          {/* Product Manager Output */}
          <Section title="Product Manager — Strategy & Roadmap" color={SECTION_COLORS.product_manager_output}>
            <Field label="Strategy" value={pm.strategy} />
            <ListField label="Roadmap" items={pm.roadmap} />
            <ListField label="Feature Priority" items={pm.feature_priority} />
            <Field label="Competitive Analysis" value={pm.competitive_analysis} />
          </Section>

          {/* Business & Marketing Output */}
          <Section title="Business & Marketing" color={SECTION_COLORS.business_marketing_output}>
            <Field label="Market Analysis" value={bm.market_analysis} />
            <ListField label="Go-to-Market" items={bm.go_to_market} />
            <Field label="Pricing Strategy" value={bm.pricing_strategy} />
            <ListField label="KPIs" items={bm.kpis} />
          </Section>

          {/* Engineer Output */}
          <Section title="Engineer — Implementation Plan" color={SECTION_COLORS.engineer_output}>
            <ListField label="Implementation Plan" items={eng.implementation_plan} />
            <Field label="Code Structure" value={eng.code_structure} />
            {Object.keys(eng.estimates ?? {}).length > 0 && (
              <div style={{ marginBottom: "10px" }}>
                <span style={{ fontSize: "11px", color: "#666680", textTransform: "uppercase" }}>Estimates</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "4px" }}>
                  {Object.entries(eng.estimates).map(([k, v]) => (
                    <span key={k} style={{ fontSize: "11px", background: "#1a1a26", color: "#9999b0", padding: "3px 8px", borderRadius: "6px" }}>
                      {k}: {v}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <ListField label="Dependencies" items={eng.dependencies} />
          </Section>

          {/* Designer Output */}
          <Section title="Designer — UI/UX" color={SECTION_COLORS.designer_output}>
            <ListField label="Wireframes" items={des.wireframes} />
            <Field label="Design System" value={des.design_system} />
            <ListField label="UX Flows" items={des.ux_flows} />
            <ListField label="Deliverables" items={des.deliverables} />
          </Section>

          {/* QA Output */}
          <Section title="QA — Test Plan" color={SECTION_COLORS.qa_output}>
            <Field label="Test Plan" value={qa.test_plan} />
            {qa.test_cases.length > 0 && (
              <div style={{ marginBottom: "10px" }}>
                <span style={{ fontSize: "11px", color: "#666680", textTransform: "uppercase" }}>Test Cases</span>
                {qa.test_cases.map((tc, i) => (
                  <div key={i} style={{ background: "#1a1a26", borderRadius: "8px", padding: "10px", marginTop: "6px" }}>
                    <div style={{ fontSize: "12px", color: "#E67E22", marginBottom: "4px" }}>{tc.name} <span style={{ color: "#666680", fontSize: "11px" }}>({tc.type})</span></div>
                    {(tc.steps ?? []).map((s, j) => (
                      <div key={j} style={{ fontSize: "11px", color: "#9999b0" }}>{j + 1}. {s}</div>
                    ))}
                  </div>
                ))}
              </div>
            )}
            <ListField label="Quality Gates" items={qa.quality_gates} />
            <ListField label="Bug Risks" items={qa.bug_risks} />
          </Section>

          {/* CEO Review */}
          <Section title="CEO Review — Final Approval" color={SECTION_COLORS.ceo_review}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <span style={{ fontSize: "11px", color: "#666680" }}>Approved</span>
                <p style={{ fontSize: "13px", color: ceoRev.approved ? "#1D9E75" : "#E24B4A" }}>
                  {ceoRev.approved ? "✓ Yes" : "✗ No"}
                </p>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "#666680" }}>Launch Decision</span>
                <p style={{ fontSize: "13px", color: "#e2e2e8" }}>{ceoRev.launch_decision || "—"}</p>
              </div>
            </div>
            <Field label="Feedback" value={ceoRev.feedback} />
          </Section>

          {/* Generated Code */}
          {project.generated_code && (
            <Section title="Generated Code" color="#7F77DD">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                <div>
                  <span style={{ fontSize: "11px", color: "#666680" }}>Mode</span>
                  <p style={{ fontSize: "13px", color: "#a89eff", textTransform: "capitalize" }}>
                    {project.generated_code.mode}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "#666680" }}>Files</span>
                  <p style={{ fontSize: "13px", color: "#e2e2e8" }}>
                    {project.generated_code.file_count}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "#666680" }}>Generated</span>
                  <p style={{ fontSize: "11px", color: "#9999b0" }}>
                    {new Date(project.generated_code.generated_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <a
                href={`/download/${project.project_id}`}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "6px",
                  marginTop: "12px", background: "#7F77DD", color: "#fff",
                  padding: "8px 16px", borderRadius: "8px", fontSize: "12px",
                  fontWeight: 600, textDecoration: "none",
                }}
              >
                📦 Download ZIP
              </a>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}