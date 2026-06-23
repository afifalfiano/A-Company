import { WebSocket, WebSocketServer } from "ws";
import { randomUUID } from "crypto";
import { buildGraph } from "../graph.js";
import { codeGeneratorAgent } from "../agents/code-generator.js";
import { designGeneratorAgent } from "../agents/design-generator.js";
import { saveProject, loadProject } from "../db.js";
import { validateProjectInput } from "../validation.js";
import type { ProjectItem, AgentEvent, CodeGenMode, CompanyStateType } from "../state.js";

// ─── Shared helpers ───────────────────────────────────────────────────────────

export function send(ws: WebSocket, data: object): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

export function broadcast(event: object, wss: WebSocketServer, exclude?: WebSocket): void {
  wss.clients.forEach((client) => {
    if (client !== exclude && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(event));
    }
  });
}

export function makeEmptyProject(title: string, description: string): ProjectItem {
  return {
    project_id: randomUUID(),
    project_title: title.trim(),
    project_description: description.trim(),
    current_phase: "intake",
    status: "pending",
    complexity: "medium",
    planning_approved: false,
    execution_approved: false,
    retry_count: 0,
    failed_agent: null,
    generated_code: null,
    design_gen: null,
    revision_notes: [],
    token_usage: {},
    total_input_tokens: 0,
    total_output_tokens: 0,
    total_tokens: 0,
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

// ─── Graph timeout wrapper ────────────────────────────────────────────────────

const GRAPH_TIMEOUT_MS = parseInt(process.env.GRAPH_TIMEOUT_MS ?? "300000", 10);

function invokeWithTimeout(
  graph: ReturnType<typeof buildGraph>,
  input: CompanyStateType,
): Promise<CompanyStateType> {
  return Promise.race([
    graph.invoke(input),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("Graph execution timed out")),
        GRAPH_TIMEOUT_MS,
      ),
    ),
  ]);
}

// ─── Handler: process_project ─────────────────────────────────────────────────

export async function handleProcessProject(
  ws: WebSocket,
  wss: WebSocketServer,
  payload: { title?: string; description?: string },
): Promise<void> {
  const title = payload?.title?.trim() ?? "";
  const description = payload?.description?.trim() ?? "";

  const validationError = validateProjectInput(title, description);
  if (validationError) {
    send(ws, { type: "error", payload: { message: validationError } });
    return;
  }

  const project = makeEmptyProject(title, description);
  saveProject(project);

  send(ws, { type: "processing_start", payload: { project } });

  const emit = (event: AgentEvent) => broadcast({ type: "agent_event", payload: event }, wss);
  const graph = buildGraph(emit);

  try {
    const result = await invokeWithTimeout(graph, {
      raw_title: title,
      raw_description: description,
      current_project: project,
      agent_events: [],
      next_phase: "intake",
    });

    saveProject(result.current_project);
    send(ws, { type: "processing_done", payload: { project: result.current_project } });
    broadcast({ type: "project_update", payload: { project: result.current_project } }, wss, ws);
  } catch (err) {
    console.error("[Graph Error]", err);
    const failed = { ...project, status: "pending" as const };
    saveProject(failed);
    send(ws, { type: "error", payload: { message: String(err) } });
  }
}

// ─── Handler: start_planning ──────────────────────────────────────────────────

export async function handleStartPlanning(
  ws: WebSocket,
  wss: WebSocketServer,
  payload: { project_id?: string },
): Promise<void> {
  const projectId = payload?.project_id;
  if (!projectId) {
    send(ws, { type: "error", payload: { message: "project_id required" } });
    return;
  }

  const project = loadProject(projectId);
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

  const shouldResetPlanning = project.current_phase === "planning";
  const executionApproved = project.current_phase !== "planning" ? project.execution_approved : false;

  const updatedProject: ProjectItem = {
    ...project,
    current_phase: "planning",
    status: "in_progress",
    planning_approved: shouldResetPlanning ? false : project.planning_approved,
    execution_approved: executionApproved,
    is_running: true,
  };
  saveProject(updatedProject);
  send(ws, { type: "phase_start", payload: { project: updatedProject, phase: "planning" } });
  broadcast({ type: "project_update", payload: { project: updatedProject } }, wss, ws);

  const emit = (event: AgentEvent) => broadcast({ type: "agent_event", payload: event }, wss);
  const graph = buildGraph(emit);

  try {
    const result = await invokeWithTimeout(graph, {
      raw_title: updatedProject.project_title,
      raw_description: updatedProject.project_description,
      current_project: updatedProject,
      agent_events: [],
      next_phase: "planning",
    });

    const saved = { ...result.current_project, is_running: false } as ProjectItem;
    saveProject(saved);
    send(ws, { type: "processing_done", payload: { project: result.current_project } });
    broadcast({ type: "project_update", payload: { project: result.current_project } }, wss, ws);
  } catch (err) {
    console.error("[Graph Error]", err);
    send(ws, { type: "error", payload: { message: String(err) } });
    const proj = loadProject(projectId);
    if (proj) {
      saveProject({ ...proj, is_running: false });
    }
  }
}

// ─── Handler: approve_planning ────────────────────────────────────────────────

export async function handleApprovePlanning(
  ws: WebSocket,
  wss: WebSocketServer,
  payload: { project_id?: string; approve?: boolean; notes?: string },
): Promise<void> {
  const projectId = payload?.project_id;
  const approve = payload?.approve ?? true;
  const notes = payload?.notes ?? "";

  const project = loadProject(projectId!);
  if (!project) {
    send(ws, { type: "error", payload: { message: "Project not found" } });
    return;
  }
  if (project.current_phase !== "planning") {
    send(ws, { type: "error", payload: { message: "Project not in planning phase" } });
    return;
  }

  const updated: ProjectItem = {
    ...project,
    planning_approved: approve,
    revision_notes: notes ? [...project.revision_notes, notes] : project.revision_notes,
  };
  saveProject(updated);
  send(ws, { type: "project_update", payload: { project: updated } });
  broadcast({ type: "project_update", payload: { project: updated } }, wss, ws);
}

// ─── Handler: approve_execution ───────────────────────────────────────────────

export async function handleApproveExecution(
  ws: WebSocket,
  wss: WebSocketServer,
  payload: { project_id?: string; approve?: boolean; notes?: string },
): Promise<void> {
  const projectId = payload?.project_id;
  const approve = payload?.approve ?? true;
  const notes = payload?.notes ?? "";

  const project = loadProject(projectId!);
  if (!project) {
    send(ws, { type: "error", payload: { message: "Project not found" } });
    return;
  }
  if (project.current_phase !== "execution") {
    send(ws, { type: "error", payload: { message: "Project not in execution phase" } });
    return;
  }

  const updated: ProjectItem = {
    ...project,
    execution_approved: approve,
    revision_notes: notes ? [...project.revision_notes, notes] : project.revision_notes,
  };
  saveProject(updated);
  send(ws, { type: "project_update", payload: { project: updated } });
  broadcast({ type: "project_update", payload: { project: updated } }, wss, ws);
}

// ─── Handler: start_execution ─────────────────────────────────────────────────

export async function handleStartExecution(
  ws: WebSocket,
  wss: WebSocketServer,
  payload: { project_id?: string },
): Promise<void> {
  const projectId = payload?.project_id;
  if (!projectId) {
    send(ws, { type: "error", payload: { message: "project_id required" } });
    return;
  }

  const project = loadProject(projectId);
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
  saveProject(updatedProject);
  send(ws, { type: "phase_start", payload: { project: updatedProject, phase: "execution" } });
  broadcast({ type: "project_update", payload: { project: updatedProject } }, wss, ws);

  const emit = (event: AgentEvent) => broadcast({ type: "agent_event", payload: event }, wss);
  const graph = buildGraph(emit);

  try {
    const result = await invokeWithTimeout(graph, {
      raw_title: updatedProject.project_title,
      raw_description: updatedProject.project_description,
      current_project: updatedProject,
      agent_events: [],
      next_phase: "execution",
    });

    const saved = { ...result.current_project, is_running: false } as ProjectItem;
    saveProject(saved);
    send(ws, { type: "processing_done", payload: { project: result.current_project } });
    broadcast({ type: "project_update", payload: { project: result.current_project } }, wss, ws);
  } catch (err) {
    console.error("[Graph Error]", err);
    send(ws, { type: "error", payload: { message: String(err) } });
    const proj = loadProject(projectId);
    if (proj) saveProject({ ...proj, is_running: false });
  }
}

// ─── Handler: generate_code ───────────────────────────────────────────────────

export async function handleGenerateCode(
  ws: WebSocket,
  wss: WebSocketServer,
  payload: { project_id?: string; mode?: CodeGenMode },
): Promise<void> {
  const projectId = payload?.project_id;
  const mode = payload?.mode;

  if (!projectId) {
    send(ws, { type: "error", payload: { message: "project_id required" } });
    return;
  }

  const project = loadProject(projectId);
  if (!project) {
    send(ws, { type: "error", payload: { message: "Project not found" } });
    return;
  }
  if (!["review", "delivered"].includes(project.current_phase)) {
    send(ws, { type: "error", payload: { message: "Project must complete review phase first" } });
    return;
  }

  send(ws, { type: "code_gen_start", payload: { project_id: projectId } });

  const emit = (event: AgentEvent) => broadcast({ type: "agent_event", payload: event }, wss);

  const projectWithCodePlaceholder: ProjectItem = {
    ...project,
    generated_code: { generated_at: Date.now(), mode: mode ?? "monolith", file_count: 0, zip_path: "" },
    current_phase: "delivered" as const,
    status: "done" as const,
  };
  saveProject(projectWithCodePlaceholder);

  const state: CompanyStateType = {
    raw_title: project.project_title,
    raw_description: project.project_description,
    current_project: projectWithCodePlaceholder,
    agent_events: [],
    next_phase: "delivered",
  };

  try {
    const result = await codeGeneratorAgent(state, emit, {
      project_id: projectId,
      project_title: project.project_title,
      project_description: project.project_description,
      tech_stack: project.cto_output?.tech_stack ?? [],
      implementation_plan: project.engineer_output?.implementation_plan ?? [],
      code_structure: project.engineer_output?.code_structure ?? "",
      wireframes: project.designer_output?.wireframes ?? [],
      design_system: project.designer_output?.design_system ?? "",
      dependencies: project.engineer_output?.dependencies ?? [],
      mode: mode ?? "monolith",
    });

    const updated = result.current_project;
    saveProject(updated);
    send(ws, { type: "code_gen_done", payload: { project_id: projectId, metadata: updated.generated_code! } });
    send(ws, { type: "code_gen_download_ready", payload: { project_id: projectId, zip_url: `/download/${projectId}` } });
    broadcast({ type: "project_update", payload: { project: updated } }, wss, ws);
  } catch (err) {
    console.error("[CodeGen Error]", err);
    send(ws, { type: "code_gen_error", payload: { project_id: projectId, message: String(err) } });
  }
}

// ─── Handler: generate_design ─────────────────────────────────────────────────

export async function handleGenerateDesign(
  ws: WebSocket,
  wss: WebSocketServer,
  payload: { project_id?: string; mode?: CodeGenMode },
): Promise<void> {
  const projectId = payload?.project_id;

  if (!projectId) {
    send(ws, { type: "error", payload: { message: "project_id required" } });
    return;
  }

  const project = loadProject(projectId);
  if (!project) {
    send(ws, { type: "error", payload: { message: "Project not found" } });
    return;
  }
  if (project.current_phase !== "execution") {
    send(ws, { type: "error", payload: { message: "Project must be in execution phase" } });
    return;
  }
  if (!project.designer_output?.wireframes?.length) {
    send(ws, { type: "error", payload: { message: "No wireframes available — run designer first" } });
    return;
  }

  send(ws, { type: "design_gen_start", payload: { project_id: projectId } });

  const emit = (event: AgentEvent) => broadcast({ type: "agent_event", payload: event }, wss);

  const projectWithPlaceholder: ProjectItem = {
    ...project,
    design_gen: { generated_at: Date.now(), file_count: 0, output_path: "" },
  };
  saveProject(projectWithPlaceholder);

  const state: CompanyStateType = {
    raw_title: project.project_title,
    raw_description: project.project_description,
    current_project: projectWithPlaceholder,
    agent_events: [],
    next_phase: "execution",
  };

  try {
    const result = await designGeneratorAgent(state, emit, {
      project_id: projectId,
      project_title: project.project_title,
      project_description: project.project_description,
      wireframes: project.designer_output.wireframes,
      design_system: project.designer_output.design_system,
    });

    const updated = {
      ...result.current_project,
      design_gen: (result.current_project as ProjectItem).design_gen,
    };
    saveProject(updated);
    send(ws, { type: "design_gen_done", payload: { project_id: projectId, metadata: updated.design_gen! } });
    send(ws, { type: "design_gen_download_ready", payload: { project_id: projectId, output_path: updated.design_gen!.output_path } });
    broadcast({ type: "project_update", payload: { project: updated } }, wss, ws);
  } catch (err) {
    console.error("[DesignGen Error]", err);
    send(ws, { type: "design_gen_error", payload: { project_id: projectId, message: String(err) } });
  }
}
