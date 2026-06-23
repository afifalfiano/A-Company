import "dotenv/config";
import { Annotation } from "@langchain/langgraph";
import { ChatAnthropic } from "@langchain/anthropic";

// ─── Types ───────────────────────────────────────────────────────────────────

export type AgentName =
  | "ceo"
  | "cto"
  | "engineer"
  | "product_owner"
  | "product_manager"
  | "designer"
  | "qa"
  | "business_marketing"
  | "finalize"
  | "code_generator"
  | "design_generator";

export type ProjectPhase =
  | "intake"
  | "planning"
  | "execution"
  | "quality"
  | "review"
  | "delivered";

export type ProjectStatus = "pending" | "accepted" | "rejected" | "in_progress" | "done";

export interface AgentTokenUsage {
  input_tokens: number;
  output_tokens: number;
  model?: string;
  timestamp?: number;
}

// ─── LLM Config ────────────────────────────────────────────────────────────────

export function getModel(temperature = 0.3) {
  return new ChatAnthropic({
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
    temperature,
    maxTokens: 4096,
  });
}

// ─── Project Item ─────────────────────────────────────────────────────────────

export interface AgentEvent {
  agent: AgentName;
  phase: ProjectPhase;
  status: "started" | "thinking" | "done" | "error" | "token_usage";
  message: string;
  timestamp: number;
  token_usage?: AgentTokenUsage;
}

export interface CeoDecision {
  accepted: boolean;
  priority: "critical" | "high" | "medium" | "low";
  reasoning: string;
  resource_allocation: string;
}

export interface CtoOutput {
  architecture: string;
  tech_stack: string[];
  system_design: string;
  technical_risks: string[];
}

export interface ProductOwnerOutput {
  user_stories: Array<{ as: string; want: string; so: string; acceptance: string[] }>;
  backlog: string[];
  sprint_plan: string;
}

export interface ProductManagerOutput {
  strategy: string;
  roadmap: string[];
  feature_priority: string[];
  competitive_analysis: string;
}

export interface BusinessMarketingOutput {
  market_analysis: string;
  go_to_market: string[];
  pricing_strategy: string;
  kpis: string[];
}

export interface EngineerOutput {
  implementation_plan: string[];
  code_structure: string;
  estimates: Record<string, string>;
  dependencies: string[];
}

export interface DesignerOutput {
  wireframes: string[];
  design_system: string;
  ux_flows: string[];
  deliverables: string[];
}

export interface QaOutput {
  test_plan: string;
  test_cases: Array<{ name: string; type: string; steps: string[] }>;
  quality_gates: string[];
  bug_risks: string[];
}

export interface CeoReview {
  approved: boolean;
  feedback: string;
  launch_decision: string;
}

export type CodeGenMode = "monolith" | "monorepo";

export interface CodeGenMetadata {
  generated_at: number;
  mode: CodeGenMode;
  file_count: number;
  zip_path: string;
}

export interface DesignGenMetadata {
  generated_at: number;
  file_count: number;
  output_path: string;
}

export interface ProjectItem {
  project_id: string;
  project_title: string;
  project_description: string;
  current_phase: ProjectPhase;
  status: ProjectStatus;
  complexity: "low" | "medium" | "high";
  ceo_decision: CeoDecision;
  cto_output: CtoOutput;
  product_owner_output: ProductOwnerOutput;
  product_manager_output: ProductManagerOutput;
  business_marketing_output: BusinessMarketingOutput;
  engineer_output: EngineerOutput;
  designer_output: DesignerOutput;
  qa_output: QaOutput;
  ceo_review: CeoReview;
  revision_count: number;
  // Human-in-the-loop gates
  planning_approved: boolean;
  execution_approved: boolean;
  is_running?: boolean;
  // Error recovery
  retry_count: number;
  failed_agent: string | null;
  // Code generation metadata
  generated_code: CodeGenMetadata | null;
  // Design generation metadata
  design_gen: DesignGenMetadata | null;
  // Revision notes from human
  revision_notes: string[];
  // Token usage tracking per agent (accumulated across retries)
  token_usage: Record<string, { input_tokens: number; output_tokens: number }>;
  total_input_tokens: number;
  total_output_tokens: number;
  total_tokens: number;
}

// ─── State Annotations ────────────────────────────────────────────────────────

function emptyCtoOutput(): CtoOutput {
  return { architecture: "", tech_stack: [], system_design: "", technical_risks: [] };
}
function emptyProductOwnerOutput(): ProductOwnerOutput {
  return { user_stories: [], backlog: [], sprint_plan: "" };
}
function emptyProductManagerOutput(): ProductManagerOutput {
  return { strategy: "", roadmap: [], feature_priority: [], competitive_analysis: "" };
}
function emptyBusinessMarketingOutput(): BusinessMarketingOutput {
  return { market_analysis: "", go_to_market: [], pricing_strategy: "", kpis: [] };
}
function emptyEngineerOutput(): EngineerOutput {
  return { implementation_plan: [], code_structure: "", estimates: {}, dependencies: [] };
}
function emptyDesignerOutput(): DesignerOutput {
  return { wireframes: [], design_system: "", ux_flows: [], deliverables: [] };
}
function emptyQaOutput(): QaOutput {
  return { test_plan: "", test_cases: [], quality_gates: [], bug_risks: [] };
}
function emptyCeoDecision(): CeoDecision {
  return { accepted: false, priority: "medium", reasoning: "", resource_allocation: "" };
}
function emptyCeoReview(): CeoReview {
  return { approved: false, feedback: "", launch_decision: "" };
}
function emptyProjectExtras() {
  return {
    complexity: "medium" as const,
    planning_approved: false,
    execution_approved: false,
    retry_count: 0,
    failed_agent: null as string | null,
    generated_code: null as CodeGenMetadata | null,
    revision_notes: [] as string[],
    token_usage: {} as Record<string, { input_tokens: number; output_tokens: number }>,
    total_input_tokens: 0,
    total_output_tokens: 0,
    total_tokens: 0,
  };
}

export const CompanyState = Annotation.Root({
  raw_title: Annotation<string>(),
  raw_description: Annotation<string>(),
  current_project: Annotation<ProjectItem>({
    reducer: (existing, update) => ({ ...existing, ...update }),
    default: () => ({
      project_id: "",
      project_title: "",
      project_description: "",
      current_phase: "intake" as ProjectPhase,
      status: "pending" as ProjectStatus,
      complexity: "medium" as const,
      ceo_decision: { accepted: false, priority: "medium" as const, reasoning: "", resource_allocation: "" },
      cto_output: { architecture: "", tech_stack: [], system_design: "", technical_risks: [] },
      product_owner_output: { user_stories: [], backlog: [], sprint_plan: "" },
      product_manager_output: { strategy: "", roadmap: [], feature_priority: [], competitive_analysis: "" },
      business_marketing_output: { market_analysis: "", go_to_market: [], pricing_strategy: "", kpis: [] },
      engineer_output: { implementation_plan: [], code_structure: "", estimates: {}, dependencies: [] },
      designer_output: { wireframes: [], design_system: "", ux_flows: [], deliverables: [] },
      qa_output: { test_plan: "", test_cases: [], quality_gates: [], bug_risks: [] },
      ceo_review: { approved: false, feedback: "", launch_decision: "" },
      revision_count: 0,
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
    }),
  }),
  agent_events: Annotation<AgentEvent[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),
  next_phase: Annotation<ProjectPhase>(),
});

export type CompanyStateType = typeof CompanyState.State;