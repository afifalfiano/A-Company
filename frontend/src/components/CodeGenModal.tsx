import { useState } from "react";
import { CodeGenMode, ProjectItem } from "../models";

interface Props {
  project: ProjectItem;
  isGenerating: boolean;
  zipUrl: string | null;
  codeGenMode: CodeGenMode | null;
  onGenerate: (projectId: string, mode: CodeGenMode) => void;
  onClose: () => void;
}

export function CodeGenModal({
  project,
  isGenerating,
  zipUrl,
  codeGenMode,
  onGenerate,
  onClose,
}: Props) {
  const [mode, setMode] = useState<CodeGenMode>("monolith");

  // Reconstruct download URL from stored zip_path if zipUrl not in memory
  const downloadUrl = zipUrl ?? (project.generated_code?.zip_path
        ? `http://localhost:3001/download/${project.project_id}`
        : null);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#13131c",
          border: "1px solid #2a2a3a",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "480px",
          padding: "28px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: "16px", color: "#e2e2e8", marginBottom: "6px" }}>
          ⚡ Generate Code
        </h2>
        <p style={{ fontSize: "12px", color: "#666680", marginBottom: "20px" }}>
          {project.project_title}
        </p>

        {/* Mode toggle */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
          {(["monolith", "monorepo"] as CodeGenMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              disabled={isGenerating}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "10px",
                border: mode === m ? "2px solid #7F77DD" : "1px solid #2a2a3a",
                background: mode === m ? "#1e1a3a" : "transparent",
                color: mode === m ? "#a89eff" : "#666680",
                fontSize: "13px",
                fontWeight: 600,
                cursor: isGenerating ? "not-allowed" : "pointer",
                textTransform: "capitalize",
              }}
            >
              {m}
            </button>
          ))}
        </div>

        {isGenerating && !downloadUrl && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div className="spinner" style={{ margin: "0 auto 12px" }} />
            <p style={{ fontSize: "13px", color: "#9999b0" }}>
              Generating {codeGenMode ?? mode} project...
            </p>
          </div>
        )}

        {downloadUrl && (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>✓</div>
            <p style={{ fontSize: "13px", color: "#1D9E75", marginBottom: "16px" }}>
              {codeGenMode ?? mode} project ready — {mode} structure
              {project.generated_code && ` (${project.generated_code.file_count} files)`}
            </p>
            <a
              href={downloadUrl}
              style={{
                display: "inline-block",
                background: "#7F77DD",
                color: "#fff",
                padding: "10px 24px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              📦 Download ZIP
            </a>
          </div>
        )}

        {!downloadUrl && (
          <button
            className="btn-primary"
            disabled={isGenerating}
            onClick={() => onGenerate(project.project_id, mode)}
            style={{
              width: "100%",
              justifyContent: "center",
              opacity: isGenerating ? 0.6 : 1,
            }}
          >
            {isGenerating ? "Generating..." : "Generate Code"}
          </button>
        )}

        <button
          onClick={onClose}
          style={{
            marginTop: "10px",
            width: "100%",
            padding: "8px",
            background: "transparent",
            border: "1px solid #2a2a3a",
            borderRadius: "8px",
            color: "#666680",
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          {downloadUrl ? "Close" : "Cancel"}
        </button>
      </div>
    </div>
  );
}