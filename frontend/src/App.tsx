import { useState } from "react";
import { useWebSocket } from "./hooks/useWebSocket";
import { AgentActivity } from "./components/AgentActivity";
import { ProjectBoard } from "./components/ProjectBoard";
import { ProjectDetail } from "./components/ProjectDetail";
import { CodeGenModal } from "./components/CodeGenModal";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AgentName } from "./models";

type Platform = "web" | "mobile" | "both";
type Budget = "small" | "medium" | "large";

type ExampleProject = {
  title: string;
  platform: Platform;
  targetUsers: string;
  features: string;
  budget: Budget;
};

const EXAMPLE_PROJECTS: ExampleProject[] = [
  { title: "Landing page", platform: "web", targetUsers: "Potential customers", features: "Hero section, features list, pricing table, contact form", budget: "small" },
  { title: "Real-time inventory system", platform: "web", targetUsers: "Warehouse staff and managers", features: "Stock tracking, low-stock alerts, barcode scanning, reporting dashboard", budget: "medium" },
  { title: "Meeting room booking app", platform: "mobile", targetUsers: "Office employees", features: "Room availability calendar, instant booking, conflict detection, push notifications", budget: "medium" },
  { title: "E-commerce analytics dashboard", platform: "web", targetUsers: "Marketing and sales teams", features: "Sales charts, conversion funnel, customer segments, CSV export", budget: "large" },
];

export default function App() {
  const { connected, events, projects, processing, activeAgent, codeGenMode, isGenerating, generatingProjectId, zipUrl, sendProject, startPlanning, startExecution, startCodeGeneration, generateDesign, approvePlanning, approveExecution, clearProjects } =
    useWebSocket("ws://localhost:3001");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailProjectId, setDetailProjectId] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState("");
  const [platform, setPlatform] = useState<Platform>("web");
  const [targetUsers, setTargetUsers] = useState("");
  const [features, setFeatures] = useState("");
  const [budget, setBudget] = useState<Budget>("medium");
  const [codeGenProjectId, setCodeGenProjectId] = useState<string | null>(null);

  const selectedProject = projects.find((p) => p.project_id === selectedId) ?? null;
  const detailProject = projects.find((p) => p.project_id === detailProjectId) ?? null;

  const buildDescription = () =>
    [
      `Platform: ${platform}`,
      targetUsers.trim() ? `Target users: ${targetUsers.trim()}` : null,
      features.trim() ? `Key features: ${features.trim()}` : null,
      `Budget: ${budget}`,
    ]
      .filter(Boolean)
      .join(". ");

  const resetForm = () => {
    setTitleInput("");
    setPlatform("web");
    setTargetUsers("");
    setFeatures("");
    setBudget("medium");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleInput.trim() || !features.trim() || processing || !connected) return;
    sendProject(titleInput.trim(), buildDescription());
    resetForm();
  };

  const handleExample = (ex: ExampleProject) => {
    if (processing || !connected) return;
    setTitleInput(ex.title);
    setPlatform(ex.platform);
    setTargetUsers(ex.targetUsers);
    setFeatures(ex.features);
    setBudget(ex.budget);
  };

  return (
    <ErrorBoundary>
      <div className="app">
      <header className="app-header">
        <div className="header-left">
          <div className="logo">AI</div>
          <div>
            <h1>Happy-Agents</h1>
            <p className="subtitle">7 AI agents — software house simulator</p>
          </div>
        </div>
        <span className={`conn-badge ${connected ? "online" : "offline"}`}>
          <span className="conn-dot" />
          {connected ? "Connected" : "Disconnected"}
        </span>
      </header>

      <div className="input-section">
        <form onSubmit={handleSubmit} className="intake-form">
          <div className="intake-row">
            <input
              className="intake-title"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              placeholder="Project title (required)"
              disabled={processing || !connected}
              autoFocus
            />
          </div>

          <div className="intake-row intake-row--split">
            <div className="intake-field">
              <label className="intake-label">Platform</label>
              <div className="chip-group">
                {(["web", "mobile", "both"] as Platform[]).map((p) => (
                  <button key={p} type="button"
                    className={`chip ${platform === p ? "chip--active" : ""}`}
                    onClick={() => setPlatform(p)}
                    disabled={processing || !connected}
                  >{p}</button>
                ))}
              </div>
            </div>

            <div className="intake-field">
              <label className="intake-label">Budget</label>
              <div className="chip-group">
                {(["small", "medium", "large"] as Budget[]).map((b) => (
                  <button key={b} type="button"
                    className={`chip ${budget === b ? "chip--active" : ""}`}
                    onClick={() => setBudget(b)}
                    disabled={processing || !connected}
                  >{b}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="intake-row">
            <input
              className="intake-input"
              value={targetUsers}
              onChange={(e) => setTargetUsers(e.target.value)}
              placeholder="Who will use this? (e.g. warehouse staff, marketing team)"
              disabled={processing || !connected}
            />
          </div>

          <div className="intake-row intake-row--submit">
            <textarea
              className="intake-textarea"
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              placeholder="Key features — what should it do? (required)"
              rows={3}
              disabled={processing || !connected}
            />
            <button type="submit" disabled={processing || !connected || !titleInput.trim() || !features.trim()} className="btn-primary btn-submit">
              {processing ? (
                <><span className="spinner-sm" /> Processing...</>
              ) : "Process Project"}
            </button>
          </div>
        </form>

        <div className="examples">
          <span className="examples-label">Examples:</span>
          {EXAMPLE_PROJECTS.map((ex, i) => (
            <button key={i} className="example-chip" onClick={() => handleExample(ex)} disabled={processing || !connected}>
              {ex.title}
            </button>
          ))}
        </div>
      </div>

      <div className="layout">
        <AgentActivity
          events={events}
          processing={processing}
          activeAgent={activeAgent as AgentName | null}
          project={selectedProject}
        />
        <ProjectBoard
          projects={projects}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onViewDetail={(id) => setDetailProjectId(id)}
          onStartPlanning={startPlanning}
          onStartExecution={startExecution}
          onApprovePlanning={approvePlanning}
          onApproveExecution={approveExecution}
          onClear={clearProjects}
          onGenerateCode={(id) => setCodeGenProjectId(id)}
          onGenerateDesign={(id) => generateDesign(id, "monolith")}
          generatingProjectId={generatingProjectId}
        />
      </div>

      {detailProject && (
        <ProjectDetail project={detailProject} onClose={() => setDetailProjectId(null)} />
      )}

      {codeGenProjectId && (() => {
        const proj = projects.find((p) => p.project_id === codeGenProjectId);
        if (!proj) return null;
        return (
          <CodeGenModal
            project={proj}
            isGenerating={isGenerating}
            zipUrl={zipUrl}
            codeGenMode={codeGenMode}
            onGenerate={startCodeGeneration}
            onClose={() => setCodeGenProjectId(null)}
          />
        );
      })()}
    </div>
    </ErrorBoundary>
  );
}