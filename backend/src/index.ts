import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createReadStream, existsSync } from "fs";
import path from "path";
import { buildGraph } from "./graph.js";
import {
  CompanyStateType,
  ProjectItem,
  AgentEvent,
  ProjectPhase,
  CodeGenMode,
} from "./state.js";
import { randomUUID } from "crypto";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

// ─── In-memory project store ─────────────────────────────────────────────────
const projects = new Map<string, ProjectItem>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function send(ws: WebSocket, data: object) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function broadcast(event: object, exclude?: WebSocket) {
  wss.clients.forEach((client) => {
    if (client !== exclude && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(event));
    }
  });
}

function emptyProjectExtras() {
  return {
    complexity: "medium" as const,
    planning_approved: false,
    execution_approved: false,
    retry_count: 0,
    failed_agent: null as string | null,
    generated_code: null as null,
    revision_notes: [] as string[],
    token_usage: {} as Record<string, { input_tokens: number; output_tokens: number }>,
    total_input_tokens: 0,
    total_output_tokens: 0,
    total_tokens: 0,
  };
}

function makeEmptyProject(title: string, description: string): ProjectItem {
  return {
    project_id: randomUUID().slice(0, 8),
    project_title: title,
    project_description: description,
    current_phase: "intake",
    status: "pending",
    ...emptyProjectExtras(),
    ceo_decision: { accepted: false, priority: "medium", reasoning: "", resource_allocation: "" },
    cto_output: { architecture: "", tech_stack: [], system_design: "", technical_risks: [] },
    product_owner_output: { user_stories: [], backlog: [], sprint_plan: "" },
    product_manager_output: { strategy: "", roadmap: [], feature_priority: [], competitive_analysis: "" },
    business_marketing_output: { market_analysis: "", go_to_market: [], pricing_strategy: "", kpis: [] },
    engineer_output: { implementation_plan: [], code_structure: "", estimates: {}, dependencies: [] },
    designer_output: { wireframes: [], design_system: "", ux_flows: [], deliverables: [] },
    qa_output: { test_plan: "", test_cases: [], quality_gates: [], bug_risks: [] },
    ceo_review: { approved: false, feedback: "", launch_decision: "" },
    revision_count: 0,
  };
}

// ─── WebSocket ────────────────────────────────────────────────────────────────

const server = createServer(app);
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("[WS] Client connected");
  send(ws, { type: "connected", payload: { message: "A-Company Software House ready!" } });

  ws.on("message", async (raw) => {
    let msg: {
      type: string;
      payload: {
        title?: string;
        description?: string;
        project_id?: string;
        approve?: boolean;
        notes?: string;
      };
    };
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      send(ws, { type: "error", payload: { message: "Invalid JSON" } });
      return;
    }

    try {
      if (msg.type === "process_project") {
        const title = msg.payload?.title?.trim();
        const description = msg.payload?.description?.trim() ?? "";

        if (!title) {
          send(ws, { type: "error", payload: { message: "Title cannot be empty" } });
          return;
        }

        const project = makeEmptyProject(title, description);
        projects.set(project.project_id, project);

        send(ws, { type: "processing_start", payload: { project } });

        const emit = (event: AgentEvent) => {
          broadcast({ type: "agent_event", payload: event });
        };

        const graph = buildGraph(emit);

        try {
          // Only run CEO intake (approve/reject), don't run full pipeline
          const result = await graph.invoke({
            raw_title: title,
            raw_description: description,
            current_project: project,
            agent_events: [],
            next_phase: "intake",
          });

          projects.set(project.project_id, result.current_project);
          send(ws, { type: "processing_done", payload: { project: result.current_project } });
          broadcast({ type: "project_update", payload: { project: result.current_project } }, ws);
        } catch (err) {
          console.error("[Graph Error]", err);
          send(ws, { type: "error", payload: { message: String(err) } });
        }
      }

      if (msg.type === "start_planning") {
        const projectId = msg.payload?.project_id;
        if (!projectId) {
          send(ws, { type: "error", payload: { message: "project_id required" } });
          return;
        }

        const project = projects.get(projectId);
        if (!project) {
          send(ws, { type: "error", payload: { message: "Project not found" } });
          return;
        }
        if (project.status !== "accepted") {
          send(ws, { type: "error", payload: { message: "Project must be accepted by CEO first" } });
          return;
        }
        if (project.current_phase === "planning" && project.planning_approved) {
          send(ws, { type: "error", payload: { message: "Planning already approved — waiting for execution gate" } });
          return;
        }
        if (project.is_running) {
          send(ws, { type: "error", payload: { message: "Planning already in progress" } });
          return;
        }

        // Only reset planning_approved if we're still IN the planning phase
        // If we've moved past planning, preserve the approval so we don't rebuild the graph
        const shouldResetPlanning = project.current_phase === "planning";
        // execution_approved: preserve existing value on replays (when current_phase !== "planning").
        // Set to false ONLY on first planning run so human gate can block execution.
        // After user approves, execution_approved stays true across graph re-runs.
        const executionApproved = project.current_phase !== "planning" ? project.execution_approved : false;
        const updatedProject: ProjectItem = {
          ...project,
          current_phase: "planning",
          status: "in_progress",
          planning_approved: shouldResetPlanning ? false : project.planning_approved,
          execution_approved: executionApproved,
          is_running: true,
        };
        projects.set(projectId, updatedProject);
        send(ws, { type: "phase_start", payload: { project: updatedProject, phase: "planning" } });
        broadcast({ type: "project_update", payload: { project: updatedProject } }, ws);

        const emit = (event: AgentEvent) => {
          broadcast({ type: "agent_event", payload: event });
        };

        const graph = buildGraph(emit);

        try {
          const result = await graph.invoke({
            raw_title: updatedProject.project_title,
            raw_description: updatedProject.project_description,
            current_project: updatedProject,
            agent_events: [],
            next_phase: "planning",
          });

          projects.set(projectId, { ...result.current_project, is_running: false } as ProjectItem);
          send(ws, { type: "processing_done", payload: { project: result.current_project } });
          broadcast({ type: "project_update", payload: { project: result.current_project } }, ws);
        } catch (err) {
          console.error("[Graph Error]", err);
          send(ws, { type: "error", payload: { message: String(err) } });
          const proj = projects.get(projectId);
          if (proj) {
            projects.set(projectId, { ...proj, is_running: false });
          }
        }
      }

    if (msg.type === "approve_planning") {
      const projectId = msg.payload?.project_id;
      const approve = msg.payload?.approve ?? true;
      const notes = msg.payload?.notes ?? "";

      let project = projects.get(projectId!);
      if (!project) {
        send(ws, { type: "error", payload: { message: "Project not found" } });
        return;
      }
      if (project.current_phase !== "planning") {
        send(ws, { type: "error", payload: { message: "Project not in planning phase" } });
        return;
      }

      project = {
        ...project,
        planning_approved: approve,
        revision_notes: notes ? [...project.revision_notes, notes] : project.revision_notes,
      };
      projects.set(projectId!, project);
      send(ws, { type: "project_update", payload: { project } });
      broadcast({ type: "project_update", payload: { project } }, ws);
    }

    if (msg.type === "approve_execution") {
      const projectId = msg.payload?.project_id;
      const approve = msg.payload?.approve ?? true;
      const notes = msg.payload?.notes ?? "";

      let project = projects.get(projectId!);
      if (!project) {
        send(ws, { type: "error", payload: { message: "Project not found" } });
        return;
      }
      if (project.current_phase !== "execution") {
        send(ws, { type: "error", payload: { message: "Project not in execution phase" } });
        return;
      }

      project = {
        ...project,
        execution_approved: approve,
        revision_notes: notes ? [...project.revision_notes, notes] : project.revision_notes,
      };
      projects.set(projectId!, project);
      send(ws, { type: "project_update", payload: { project } });
      broadcast({ type: "project_update", payload: { project } }, ws);
    }

    if (msg.type === "start_execution") {
      const projectId = msg.payload?.project_id;
      if (!projectId) {
        send(ws, { type: "error", payload: { message: "project_id required" } });
        return;
      }
      const project = projects.get(projectId);
      if (!project) {
        send(ws, { type: "error", payload: { message: "Project not found" } });
        return;
      }
      if (project.current_phase !== "planning" || !project.planning_approved) {
        send(ws, { type: "error", payload: { message: "Planning must be approved first" } });
        return;
      }
      if (project.is_running) {
        send(ws, { type: "error", payload: { message: "Execution already in progress" } });
        return;
      }

      const updatedProject: ProjectItem = {
        ...project,
        current_phase: "execution",
        status: "in_progress",
        execution_approved: false,
        is_running: true,
      };
      projects.set(projectId, updatedProject);
      send(ws, { type: "phase_start", payload: { project: updatedProject, phase: "execution" } });
      broadcast({ type: "project_update", payload: { project: updatedProject } }, ws);

      const emit = (event: AgentEvent) => broadcast({ type: "agent_event", payload: event });
      const graph = buildGraph(emit);

      try {
        const result = await graph.invoke({
          raw_title: updatedProject.project_title,
          raw_description: updatedProject.project_description,
          current_project: updatedProject,
          agent_events: [],
          next_phase: "execution",
        });
        projects.set(projectId, { ...result.current_project, is_running: false } as ProjectItem);
        send(ws, { type: "processing_done", payload: { project: result.current_project } });
        broadcast({ type: "project_update", payload: { project: result.current_project } }, ws);
      } catch (err) {
        console.error("[Graph Error]", err);
        send(ws, { type: "error", payload: { message: String(err) } });
        const proj = projects.get(projectId);
        if (proj) projects.set(projectId, { ...proj, is_running: false });
      }
    }

    if (msg.type === "generate_code") {
      const { project_id: projectId, mode } = msg.payload as { project_id?: string; mode?: CodeGenMode };
      if (!projectId) {
        send(ws, { type: "error", payload: { message: "project_id required" } });
        return;
      }
      const project = projects.get(projectId);
      if (!project) {
        send(ws, { type: "error", payload: { message: "Project not found" } });
        return;
      }
      if (project.current_phase !== "delivered") {
        send(ws, { type: "error", payload: { message: "Project must be in delivered phase" } });
        return;
      }

      send(ws, { type: "code_gen_start", payload: { project_id: projectId } });

      const emit = (event: AgentEvent) => broadcast({ type: "agent_event", payload: event });
      const graph = buildGraph(emit);

      try {
        const result = await graph.invoke({
          raw_title: project.project_title,
          raw_description: project.project_description,
          current_project: { ...project, generated_code: { generated_at: Date.now(), mode, file_count: 0, zip_path: "" } },
          agent_events: [],
          next_phase: "execution",
        });
        const updated = result.current_project;
        projects.set(projectId, updated);
        send(ws, { type: "code_gen_done", payload: { project_id: projectId, metadata: updated.generated_code! } });
        send(ws, { type: "code_gen_download_ready", payload: { project_id: projectId, zip_url: `/download/${projectId}` } });
        broadcast({ type: "project_update", payload: { project: updated } }, ws);
      } catch (err) {
        console.error("[CodeGen Error]", err);
        send(ws, { type: "code_gen_error", payload: { project_id: projectId, message: String(err) } });
      }
    }
    } catch (err) {
      console.error("[WS Handler Error]", err);
      send(ws, { type: "error", payload: { message: "Internal server error" } });
    }
  });

  ws.on("close", () => console.log("[WS] Client disconnected"));
  ws.on("error", (err) => console.error("[WS Error]", err));
});

// ─── REST Endpoints ──────────────────────────────────────────────────────────

app.get("/projects", (_req, res) => {
  res.json({ projects: Array.from(projects.values()) });
});

app.get("/projects/:id", (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json({ project });
});

app.post("/projects", express.json(), (req, res) => {
  const { title, description } = req.body;
  if (!title?.trim()) {
    res.status(400).json({ error: "Title required" });
    return;
  }
  const project = makeEmptyProject(title.trim(), description?.trim() ?? "");
  projects.set(project.project_id, project);
  res.status(201).json({ project });
});

app.get("/download/:projectId", (req, res) => {
  const zipPath = path.resolve("./generated", `${req.params.projectId}.zip`);
  if (!existsSync(zipPath)) {
    res.status(404).json({ error: "Zip not found" });
    return;
  }
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${req.params.projectId}.zip"`);
  createReadStream(zipPath).pipe(res);
});

// ─── Start ───────────────────────────────────────────────────────────────────

const PORT = process.env.PORT ?? 3001;
server.listen(PORT, () => {
  console.log(`\n🚀 A-Company backend running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket ready on ws://localhost:${PORT}\n`);
  console.log(`🔧 LLM Provider: ${process.env.LLM_PROVIDER ?? "openai"}`);
  console.log(`📦 Model: ${process.env.OPENAI_MODEL ?? process.env.ANTHROPIC_MODEL ?? "gpt-4o-mini"}\n`);
});