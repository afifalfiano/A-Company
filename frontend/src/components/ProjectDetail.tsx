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
  const priorityColor = PRIORITY_COLORS[project.ceo_decision.priority] ?? "#666";

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px",
    }}>
      <div style={{
        background: "#13131c", border: "1px solid #2a2a3a",
        borderRadius: "16px", width: "100%", maxWidth: "800px",
        maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column",
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
                {project.ceo_decision.priority}
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
                <p style={{ fontSize: "13px", color: project.ceo_decision.accepted ? "#1D9E75" : "#E24B4A" }}>
                  {project.ceo_decision.accepted ? "✓ Yes" : "✗ No"}
                </p>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "#666680" }}>Priority</span>
                <p style={{ fontSize: "13px", color: priorityColor }}>{project.ceo_decision.priority}</p>
              </div>
            </div>
            <Field label="Reasoning" value={project.ceo_decision.reasoning} />
            <Field label="Resource Allocation" value={project.ceo_decision.resource_allocation} />
          </Section>

          {/* CTO Output */}
          <Section title="CTO — Architecture & Tech Stack" color={SECTION_COLORS.cto_output}>
            <Field label="Architecture" value={project.cto_output.architecture} />
            <ListField label="Tech Stack" items={project.cto_output.tech_stack} />
            <Field label="System Design" value={project.cto_output.system_design} />
            <ListField label="Technical Risks" items={project.cto_output.technical_risks} />
          </Section>

          {/* Product Owner Output */}
          <Section title="Product Owner — User Stories & Backlog" color={SECTION_COLORS.product_owner_output}>
            {(project.product_owner_output?.user_stories ?? []).map((us, i) => (
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
            <Field label="Sprint Plan" value={project.product_owner_output.sprint_plan} />
          </Section>

          {/* Product Manager Output */}
          <Section title="Product Manager — Strategy & Roadmap" color={SECTION_COLORS.product_manager_output}>
            <Field label="Strategy" value={project.product_manager_output.strategy} />
            <ListField label="Roadmap" items={project.product_manager_output.roadmap} />
            <ListField label="Feature Priority" items={project.product_manager_output.feature_priority} />
            <Field label="Competitive Analysis" value={project.product_manager_output.competitive_analysis} />
          </Section>

          {/* Business & Marketing Output */}
          <Section title="Business & Marketing" color={SECTION_COLORS.business_marketing_output}>
            <Field label="Market Analysis" value={project.business_marketing_output.market_analysis} />
            <ListField label="Go-to-Market" items={project.business_marketing_output.go_to_market} />
            <Field label="Pricing Strategy" value={project.business_marketing_output.pricing_strategy} />
            <ListField label="KPIs" items={project.business_marketing_output.kpis} />
          </Section>

          {/* Engineer Output */}
          <Section title="Engineer — Implementation Plan" color={SECTION_COLORS.engineer_output}>
            <ListField label="Implementation Plan" items={project.engineer_output.implementation_plan} />
            <Field label="Code Structure" value={project.engineer_output.code_structure} />
            {Object.keys(project.engineer_output.estimates).length > 0 && (
              <div style={{ marginBottom: "10px" }}>
                <span style={{ fontSize: "11px", color: "#666680", textTransform: "uppercase" }}>Estimates</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "4px" }}>
                  {Object.entries(project.engineer_output.estimates).map(([k, v]) => (
                    <span key={k} style={{ fontSize: "11px", background: "#1a1a26", color: "#9999b0", padding: "3px 8px", borderRadius: "6px" }}>
                      {k}: {v}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <ListField label="Dependencies" items={project.engineer_output.dependencies} />
          </Section>

          {/* Designer Output */}
          <Section title="Designer — UI/UX" color={SECTION_COLORS.designer_output}>
            <ListField label="Wireframes" items={project.designer_output.wireframes} />
            <Field label="Design System" value={project.designer_output.design_system} />
            <ListField label="UX Flows" items={project.designer_output.ux_flows} />
            <ListField label="Deliverables" items={project.designer_output.deliverables} />
          </Section>

          {/* QA Output */}
          <Section title="QA — Test Plan" color={SECTION_COLORS.qa_output}>
            <Field label="Test Plan" value={project.qa_output.test_plan} />
            {(project.qa_output?.test_cases ?? []).length > 0 && (
              <div style={{ marginBottom: "10px" }}>
                <span style={{ fontSize: "11px", color: "#666680", textTransform: "uppercase" }}>Test Cases</span>
                {(project.qa_output?.test_cases ?? []).map((tc, i) => (
                  <div key={i} style={{ background: "#1a1a26", borderRadius: "8px", padding: "10px", marginTop: "6px" }}>
                    <div style={{ fontSize: "12px", color: "#E67E22", marginBottom: "4px" }}>{tc.name} <span style={{ color: "#666680", fontSize: "11px" }}>({tc.type})</span></div>
                    {(tc.steps ?? []).map((s, j) => (
                      <div key={j} style={{ fontSize: "11px", color: "#9999b0" }}>{j + 1}. {s}</div>
                    ))}
                  </div>
                ))}
              </div>
            )}
            <ListField label="Quality Gates" items={project.qa_output.quality_gates} />
            <ListField label="Bug Risks" items={project.qa_output.bug_risks} />
          </Section>

          {/* CEO Review */}
          <Section title="CEO Review — Final Approval" color={SECTION_COLORS.ceo_review}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <span style={{ fontSize: "11px", color: "#666680" }}>Approved</span>
                <p style={{ fontSize: "13px", color: project.ceo_review.approved ? "#1D9E75" : "#E24B4A" }}>
                  {project.ceo_review.approved ? "✓ Yes" : "✗ No"}
                </p>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "#666680" }}>Launch Decision</span>
                <p style={{ fontSize: "13px", color: "#e2e2e8" }}>{project.ceo_review.launch_decision || "—"}</p>
              </div>
            </div>
            <Field label="Feedback" value={project.ceo_review.feedback} />
          </Section>
        </div>
      </div>
    </div>
  );
}