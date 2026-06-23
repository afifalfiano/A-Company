import { StateGraph, END, START } from "@langchain/langgraph";
import { CompanyState, CompanyStateType, AgentEvent, ProjectPhase, ProjectItem } from "./state.js";
import { ceoIntake, deterministicReview } from "./agents/ceo.js";
import { ctoAgent } from "./agents/cto.js";
import { productOwnerAgent } from "./agents/product-owner.js";
import { productManagerAgent } from "./agents/product-manager.js";
import { businessMarketingAgent } from "./agents/business-marketing.js";
import { engineerAgent } from "./agents/engineer.js";
import { designerAgent } from "./agents/designer.js";
import { qaAgent } from "./agents/qa.js";
import { codeGeneratorAgent } from "./agents/code-generator.js";

// ─── Phase barrier / checkpoint nodes ────────────────────────────────────────

const MAX_RETRIES = 2;

async function withRetry(
  agentName: string,
  agentFn: (state: CompanyStateType, emit: (e: AgentEvent) => void) => Promise<Partial<CompanyStateType>>,
  state: CompanyStateType,
  emit: (e: AgentEvent) => void
): Promise<Partial<CompanyStateType>> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await agentFn(state, emit);

      // Accumulate token usage from agent events
      const agentEvents = result.agent_events ?? [];
      const tokenEvents = agentEvents.filter((e: AgentEvent) => e.status === "token_usage" && e.token_usage);
      const currentUsage = state.current_project.token_usage ?? {};

      let totalInput = state.current_project.total_input_tokens ?? 0;
      let totalOutput = state.current_project.total_output_tokens ?? 0;

      for (const te of tokenEvents) {
        const agent = te.agent;
        const tu = te.token_usage!;
        const prev = currentUsage[agent] ?? { input_tokens: 0, output_tokens: 0 };
        currentUsage[agent] = {
          input_tokens: prev.input_tokens + tu.input_tokens,
          output_tokens: prev.output_tokens + tu.output_tokens,
        };
        totalInput += tu.input_tokens;
        totalOutput += tu.output_tokens;
      }

      return {
        ...result,
        current_project: {
          ...(result.current_project ?? {}),
          retry_count: 0,
          failed_agent: null,
          token_usage: currentUsage,
          total_input_tokens: totalInput,
          total_output_tokens: totalOutput,
          total_tokens: totalInput + totalOutput,
        } as ProjectItem,
      };
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) {
        emit({
          agent: agentName as AgentEvent["agent"],
          phase: state.current_project.current_phase,
          status: "error",
          message: `Retry ${attempt + 1}/${MAX_RETRIES} — ${String(err).slice(0, 80)}`,
          timestamp: Date.now(),
        });
      }
    }
  }
  // All retries exhausted
  emit({
    agent: agentName as AgentEvent["agent"],
    phase: state.current_project.current_phase,
    status: "error",
    message: `Failed after ${MAX_RETRIES} retries: ${String(lastError).slice(0, 80)}`,
    timestamp: Date.now(),
  });
  return {
    current_project: {
      retry_count: (state.current_project.retry_count ?? 0) + 1,
      failed_agent: agentName,
      token_usage: state.current_project.token_usage ?? {},
      total_input_tokens: state.current_project.total_input_tokens ?? 0,
      total_output_tokens: state.current_project.total_output_tokens ?? 0,
      total_tokens: state.current_project.total_tokens ?? 0,
    } as ProjectItem,
  };
}

// ─── Phase barrier / checkpoint nodes ────────────────────────────────────────

function planningCheckpointNode(
  state: CompanyStateType,
  emit: (e: AgentEvent) => void
): { agent_events: AgentEvent[] } {
  const project = state.current_project;
  if (!project.planning_approved) {
    emit({
      agent: "finalize",
      phase: "planning",
      status: "thinking",
      message: `[Gate] Waiting for planning approval — complexity: ${project.complexity}`,
      timestamp: Date.now(),
    });
  }
  return { agent_events: [] };
}

function executionCheckpointNode(
  state: CompanyStateType,
  emit: (e: AgentEvent) => void
): { agent_events: AgentEvent[] } {
  const project = state.current_project;
  if (!project.execution_approved) {
    emit({
      agent: "finalize",
      phase: "execution",
      status: "thinking",
      message: `[Gate] Waiting for execution approval`,
      timestamp: Date.now(),
    });
  }
  return { agent_events: [] };
}

// ─── Graph ────────────────────────────────────────────────────────────────────

export function buildGraph(emit: (event: AgentEvent) => void) {
  const graph = new StateGraph(CompanyState) as any;

  // ── Nodes ──────────────────────────────────────────────────────────────────
  graph.addNode("ceo_intake",        (state: CompanyStateType) => ceoIntake(state, emit));
  graph.addNode("planning_checkpoint", (state: CompanyStateType) => planningCheckpointNode(state, emit));
  graph.addNode("execution_checkpoint", (state: CompanyStateType) => executionCheckpointNode(state, emit));
  graph.addNode("cto",               (state: CompanyStateType) => withRetry("cto",               ctoAgent,               state, emit));
  graph.addNode("product_owner",     (state: CompanyStateType) => withRetry("product_owner",   productOwnerAgent,      state, emit));
  graph.addNode("product_manager",   (state: CompanyStateType) => withRetry("product_manager",  productManagerAgent,   state, emit));
  graph.addNode("business_marketing",(state: CompanyStateType) => withRetry("business_marketing",businessMarketingAgent, state, emit));
  graph.addNode("engineer",         (state: CompanyStateType) => withRetry("engineer",         engineerAgent,          state, emit));
  graph.addNode("designer",          (state: CompanyStateType) => withRetry("designer",         designerAgent,          state, emit));
  graph.addNode("code_gen",         (state: CompanyStateType) => withRetry("code_generator",
    (s, e) => {
      const p = s.current_project;
      return codeGeneratorAgent(s, e, {
        project_id: p.project_id,
        project_title: p.project_title,
        project_description: p.project_description,
        tech_stack: p.cto_output?.tech_stack ?? [],
        implementation_plan: p.engineer_output?.implementation_plan ?? [],
        code_structure: p.engineer_output?.code_structure ?? "",
        wireframes: p.designer_output?.wireframes ?? [],
        design_system: p.designer_output?.design_system ?? "",
        dependencies: p.engineer_output?.dependencies ?? [],
        mode: "monolith",
      });
    }, state, emit));
  graph.addNode("qa",               (state: CompanyStateType) => withRetry("qa",               qaAgent,                state, emit));
  graph.addNode("execution_router", (_state: CompanyStateType) => ({}));
  graph.addNode("ceo_review",        (state: CompanyStateType) => deterministicReview(state, emit));
  graph.addNode("finalize", (state: CompanyStateType) => {
    const proj = state.current_project;
    emit({
      agent: "finalize",
      phase: proj.current_phase,
      status: "done",
      message:
        proj.status === "rejected"
          ? "Project rejected by CEO"
          : "Project delivered — all phases complete",
      timestamp: Date.now(),
    });
    return {
      current_project: {
        ...proj,
        current_phase: "delivered" as ProjectPhase,
        status: "done" as const,
      },
    };
  });

  // ── Edges ───────────────────────────────────────────────────────────────────

  // START → phase_router: dispatch based on next_phase to avoid re-running phases
  graph.addNode("phase_router", (_state: CompanyStateType) => ({}));
  graph.addEdge(START, "phase_router");
  graph.addConditionalEdges(
    "phase_router",
    (state: CompanyStateType) => {
      if (state.next_phase === "execution") return "execution_router"; // skip planning entirely
      if (state.next_phase === "planning") return "planning_checkpoint"; // CEO already ran inline
      return "ceo_intake"; // fallback (intake-only invocations)
    },
    { execution_router: "execution_router", planning_checkpoint: "planning_checkpoint", ceo_intake: "ceo_intake" }
  );

  // CEO intake → planning checkpoint or finalize
  graph.addConditionalEdges(
    "ceo_intake",
    (state: CompanyStateType) => {
      if (state.current_project.status === "rejected") return "finalize";
      return "planning_checkpoint";
    },
    { finalize: "finalize", planning_checkpoint: "planning_checkpoint" }
  );

  // Planning checkpoint → CTO (or finalize if rejected)
  graph.addConditionalEdges(
    "planning_checkpoint",
    (state: CompanyStateType) => {
      if (state.current_project.status === "rejected") return "finalize";
      return "cto";
    },
    { finalize: "finalize", cto: "cto" }
  );

  // Planning: CTO fans-out to PO + PM + BM in parallel
  graph.addEdge("cto", "product_owner");
  graph.addEdge("cto", "product_manager");
  graph.addEdge("cto", "business_marketing");

  // All three fan-in to execution_checkpoint
  graph.addEdge("product_owner", "execution_checkpoint");
  graph.addEdge("product_manager", "execution_checkpoint");
  graph.addEdge("business_marketing", "execution_checkpoint");

  // execution_checkpoint: stop after planning phase, or continue to execution
  graph.addConditionalEdges(
    "execution_checkpoint",
    (state: CompanyStateType) => state.next_phase === "planning" ? "end" : "execution_router",
    { end: END, execution_router: "execution_router" }
  );
  graph.addEdge("execution_router", "engineer");
  graph.addEdge("execution_router", "designer");

  // Both fan-in to code_gen, then QA reviews actual generated files
  graph.addEdge("engineer", "code_gen");
  graph.addEdge("designer", "code_gen");
  graph.addEdge("code_gen", "qa");

  // QA → CEO Review → Finalize → END
  graph.addEdge("qa", "ceo_review");
  graph.addEdge("ceo_review", "finalize");
  graph.addEdge("finalize", END);

  return graph.compile();
}