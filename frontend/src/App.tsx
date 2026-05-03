import { useState } from "react";
import { useWebSocket } from "./hooks/useWebSocket";
import { AgentActivity } from "./components/AgentActivity";
import { ProjectBoard } from "./components/ProjectBoard";
import { ProjectDetail } from "./components/ProjectDetail";
import { CodeGenModal } from "./components/CodeGenModal";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AgentName } from "./models";

const EXAMPLE_PROJECTS = [
  "Real-time inventory system for warehouse",
  "Mobile app for meeting room booking",
  "Analytics dashboard for e-commerce",
];

export default function App() {
  const { connected, events, projects, processing, activeAgent, codeGenMode, isGenerating, zipUrl, sendProject, startPlanning, startExecution, startCodeGeneration, approvePlanning, approveExecution, clearProjects } =
    useWebSocket("ws://localhost:3001");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState("");
  const [descInput, setDescInput] = useState("");
  const [codeGenProjectId, setCodeGenProjectId] = useState<string | null>(null);

  const selectedProject = projects.find((p) => p.project_id === selectedId) ?? null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleInput.trim() || processing || !connected) return;
    sendProject(titleInput.trim(), descInput.trim());
    setTitleInput("");
    setDescInput("");
  };

  const handleExample = (text: string) => {
    if (processing || !connected) return;
    sendProject(text, "");
  };

  return (
    <ErrorBoundary>
      <div className="app">
      <header className="app-header">
        <div className="header-left">
          <div className="logo">AI</div>
          <div>
            <h1>A-Company</h1>
            <p className="subtitle">7 AI agents — software house simulator</p>
          </div>
        </div>
        <span className={`conn-badge ${connected ? "online" : "offline"}`}>
          <span className="conn-dot" />
          {connected ? "Connected" : "Disconnected"}
        </span>
      </header>

      <div className="input-section">
        <form onSubmit={handleSubmit} className="input-form">
          <input
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            placeholder="Project title..."
            disabled={processing || !connected}
            autoFocus
          />
          <input
            value={descInput}
            onChange={(e) => setDescInput(e.target.value)}
            placeholder="Description (optional)"
            disabled={processing || !connected}
          />
          <button type="submit" disabled={processing || !connected || !titleInput.trim()} className="btn-primary">
            {processing ? (
              <><span className="spinner-sm" /> Processing...</>
            ) : "Process Project"}
          </button>
        </form>

        <div className="examples">
          <span className="examples-label">Examples:</span>
          {EXAMPLE_PROJECTS.map((ex, i) => (
            <button key={i} className="example-chip" onClick={() => handleExample(ex)} disabled={processing || !connected}>
              {ex}
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
          onStartPlanning={startPlanning}
          onStartExecution={startExecution}
          onApprovePlanning={approvePlanning}
          onApproveExecution={approveExecution}
          onClear={clearProjects}
          onGenerateCode={(id) => setCodeGenProjectId(id)}
        />
      </div>

      {selectedProject && (
        <ProjectDetail project={selectedProject} onClose={() => setSelectedId(null)} />
      )}

      {codeGenProjectId && (() => {
        const proj = projects.find((p) => p.project_id === codeGenProjectId);
        if (!proj) return null;
        return (
          <CodeGenModal
            projectId={proj.project_id}
            projectTitle={proj.project_title}
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