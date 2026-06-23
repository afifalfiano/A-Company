import { ProjectItem, PHASE_COLORS, PRIORITY_COLORS, STATUS_LABELS } from "../models";

const PHASE_LABELS: Record<string, string> = {
  intake:    "Intake",
  planning:  "Planning",
  execution: "Execution",
  quality:   "QA",
  review:    "Review",
  delivered: "Done",
};

const COMPLEXITY_COLORS: Record<string, string> = {
  low:    "#639922",
  medium: "#EF9F27",
  high:   "#E24B4A",
};

interface Props {
  projects: ProjectItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onStartPlanning: (id: string) => void;
  onStartExecution: (id: string) => void;
  onApprovePlanning: (id: string, approve: boolean, notes?: string) => void;
  onApproveExecution: (id: string, approve: boolean, notes?: string) => void;
  onClear: () => void;
  onGenerateCode: (id: string) => void;
  onGenerateDesign: (id: string) => void;
  onViewDetail: (id: string) => void;
  generatingProjectId: string | null;
}

export function ProjectBoard({
  projects, selectedId, onSelect,
  onStartPlanning, onStartExecution, onApprovePlanning, onApproveExecution, onClear,
  onGenerateCode, onGenerateDesign, onViewDetail, generatingProjectId,
}: Props) {
  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Projects</h2>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span className="count-badge">{projects.length}</span>
          {projects.length > 0 && (
            <button className="clear-btn" onClick={onClear}>Clear</button>
          )}
        </div>
      </div>

      {projects.length === 0 && (
        <p className="empty">No projects yet. Submit one above!</p>
      )}

      <div className="todo-list">
        {projects.map((project) => {
          const phaseColor = PHASE_COLORS[project.current_phase] ?? "#666";
          const priorityColor = PRIORITY_COLORS[project.ceo_decision.priority] ?? "#666";
          const isSelected = selectedId === project.project_id;

          const isPendingPlanning = project.status === "accepted" && !project.planning_approved;
          const isPendingExecution = project.current_phase === "execution" && !project.execution_approved;

          return (
            <div
              key={project.project_id}
              className="todo-card"
              style={{
                borderColor: isSelected ? phaseColor : undefined,
                cursor: "pointer",
              }}
              onClick={() => onSelect(project.project_id)}
            >
              <div className="todo-top">
                <div className="todo-title-row">
                  <span className="cat-icon">◆</span>
                  <span className="todo-title">{project.project_title}</span>
                </div>
                <div className="todo-badges">
                  <span
                    className="priority-badge"
                    style={{ background: priorityColor }}
                  >
                    {project.ceo_decision.priority}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "6px", marginBottom: "8px", flexWrap: "wrap" }}>
                <span
                  className="category-badge"
                  style={{ color: phaseColor, border: `1px solid ${phaseColor}44` }}
                >
                  {PHASE_LABELS[project.current_phase] ?? project.current_phase}
                </span>
                <span className="category-badge">
                  {STATUS_LABELS[project.status] ?? project.status}
                </span>
                <span
                  className="category-badge"
                  style={{
                    color: COMPLEXITY_COLORS[project.complexity],
                    border: `1px solid ${COMPLEXITY_COLORS[project.complexity]}44`,
                  }}
                >
                  {project.complexity}
                </span>
              </div>

              {project.project_description && (
                <p style={{ fontSize: "11px", color: "#666680", marginBottom: "8px", lineHeight: "1.4" }}>
                  {project.project_description.slice(0, 80)}{project.project_description.length > 80 ? "..." : ""}
                </p>
              )}

              <div className="todo-id">#{project.project_id}</div>

              {/* CEO decision */}
              {project.ceo_decision && (
                <div className="todo-section">
                  <div className="section-title">CEO Decision</div>
                  <ul>
                    <li>
                      {project.ceo_decision.accepted ? (
                        <span style={{ color: "#1D9E75" }}>Accepted</span>
                      ) : (
                        <span style={{ color: "#E24B4A" }}>Rejected</span>
                      )}
                      {project.ceo_decision.reasoning ? `: ${project.ceo_decision.reasoning.slice(0, 100)}${project.ceo_decision.reasoning.length > 100 ? "..." : ""}` : " — no reasoning provided"}
                    </li>
                  </ul>
                </div>
              )}

              {/* Revision notes */}
              {project.revision_notes.length > 0 && (
                <div className="todo-section">
                  <div className="section-title">Revisions ({project.revision_notes.length})</div>
                  <ul>
                    {project.revision_notes.slice(-2).map((n, i) => (
                      <li key={i}>{n.slice(0, 80)}{n.length > 80 ? "..." : ""}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Failed agent warning */}
              {project.failed_agent && (
                <div style={{
                  marginTop: "8px", padding: "6px 10px",
                  background: "#2a0e0e", border: "1px solid #4a1a1a",
                  borderRadius: "6px", fontSize: "11px", color: "#f87171",
                }}>
                  ⚠ Agent "{project.failed_agent}" failed ({project.retry_count} retries)
                </div>
              )}

              {/* Token usage */}
              {(project.total_tokens ?? 0) > 0 && (
                <div style={{
                  marginTop: "8px",
                  padding: "5px 10px",
                  background: "#1a2a3d",
                  border: "1px solid #2a4a6d",
                  borderRadius: "6px",
                  fontSize: "11px",
                  color: "#EF9F27",
                  display: "flex",
                  gap: "12px",
                  flexWrap: "wrap",
                }}>
                  <span>⚡ In: {project.total_input_tokens?.toLocaleString() ?? 0}</span>
                  <span>⚡ Out: {project.total_output_tokens?.toLocaleString() ?? 0}</span>
                  <span>Total: {project.total_tokens?.toLocaleString() ?? 0}</span>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ marginTop: "10px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
                <button
                  className="btn-primary"
                  style={{ flex: 1, justifyContent: "center", background: "#222232", border: "1px solid #333348" }}
                  onClick={(e) => { e.stopPropagation(); onViewDetail(project.project_id); }}
                >
                  View Detail
                </button>
                {project.status === "accepted" && !project.planning_approved && (
                  <button
                    className="btn-primary"
                    style={{ flex: 1, justifyContent: "center" }}
                    onClick={(e) => { e.stopPropagation(); onStartPlanning(project.project_id); }}
                  >
                    Review Planning
                  </button>
                )}
              </div>

              {isPendingPlanning && (
                <div style={{ marginTop: "10px", display: "flex", gap: "6px" }}>
                  <button
                    className="btn-primary"
                    style={{ flex: 1, justifyContent: "center", background: "#1D9E75" }}
                    onClick={(e) => { e.stopPropagation(); onApprovePlanning(project.project_id, true); }}
                  >
                    ✓ Approve
                  </button>
                  <button
                    style={{
                      flex: 1, padding: "10px", borderRadius: "10px", border: "1px solid #4a1a1a",
                      background: "transparent", color: "#f87171", fontSize: "13px", fontWeight: 600,
                      cursor: "pointer",
                    }}
                    onClick={(e) => { e.stopPropagation(); onApprovePlanning(project.project_id, false, "Needs revision"); }}
                  >
                    ✗ Reject
                  </button>
                </div>
              )}

              {project.planning_approved && project.current_phase === "planning" && (
                <div style={{ marginTop: "10px" }}>
                  <button
                    className="btn-primary"
                    style={{ width: "100%", justifyContent: "center", marginBottom: "6px" }}
                    onClick={(e) => { e.stopPropagation(); onStartExecution(project.project_id); }}
                  >
                    ▶ Start Execution
                  </button>
                </div>
              )}

              {project.current_phase === "execution" && project.designer_output && (
                <div style={{ marginTop: "10px" }}>
                  {generatingProjectId === project.project_id ? (
                    <div style={{ padding: "8px 12px", background: "#2a1a3d", border: "1px solid #9B59B644", borderRadius: "8px", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                      <span style={{ animation: "spin 1s linear infinite" }}>⟳</span>
                      <span style={{ color: "#BB79D9", fontSize: "12px", fontWeight: 600 }}>Generating Design...</span>
                    </div>
                  ) : (
                  <button
                    className="btn-primary"
                    style={{ width: "100%", justifyContent: "center", background: "#9B59B6" }}
                    onClick={(e) => { e.stopPropagation(); onGenerateDesign(project.project_id); }}
                  >
                    Generate Design
                  </button>
                  )}
                </div>
              )}

              {(project.current_phase === "review" || project.current_phase === "delivered") && (
                <div style={{ marginTop: "10px" }}>
                  {generatingProjectId === project.project_id ? (
                    <div style={{ padding: "8px 12px", background: "#2a2645", border: "1px solid #7F77DD44", borderRadius: "8px", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                      <span style={{ animation: "spin 1s linear infinite" }}>⟳</span>
                      <span style={{ color: "#9B8FD9", fontSize: "12px", fontWeight: 600 }}>Regenerating...</span>
                    </div>
                  ) : project.generated_code ? (
                    <div style={{ display: "flex", gap: "6px", flexDirection: "column" }}>
                      <div style={{ padding: "8px 12px", background: "#1a3028", border: "1px solid #2a5040", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ color: "#1D9E75", fontWeight: 700, fontSize: "13px" }}>✓ {project.generated_code.file_count} files</span>
                        <a
                          href={`http://localhost:3001/download/${project.project_id}`}
                          download
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "#7F77DD", fontSize: "12px", fontWeight: 600, textDecoration: "none" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          📦 Download
                        </a>
                      </div>
                      <button
                        className="btn-primary"
                        style={{ width: "100%", justifyContent: "center", background: "#444", fontSize: "12px" }}
                        onClick={(e) => { e.stopPropagation(); onGenerateCode(project.project_id); }}
                      >
                        ↺ Regenerate
                      </button>
                    </div>
                  ) : (
                    <div style={{ padding: "8px 12px", background: "#2a2645", border: "1px solid #7F77DD44", borderRadius: "8px", textAlign: "center" }}>
                      <span style={{ color: "#9B8FD9", fontSize: "12px" }}>Code generating in pipeline...</span>
                    </div>
                  )}
                </div>
              )}

              {isPendingExecution && (
                <div style={{ marginTop: "10px", display: "flex", gap: "6px" }}>
                  <button
                    className="btn-primary"
                    style={{ flex: 1, justifyContent: "center", background: "#1D9E75" }}
                    onClick={(e) => { e.stopPropagation(); onApproveExecution(project.project_id, true); }}
                  >
                    ✓ Approve
                  </button>
                  <button
                    style={{
                      flex: 1, padding: "10px", borderRadius: "10px", border: "1px solid #4a1a1a",
                      background: "transparent", color: "#f87171", fontSize: "13px", fontWeight: 600,
                      cursor: "pointer",
                    }}
                    onClick={(e) => { e.stopPropagation(); onApproveExecution(project.project_id, false, "Needs revision"); }}
                  >
                    ✗ Reject
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}