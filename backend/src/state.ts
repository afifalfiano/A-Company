import "dotenv/config";
import { Annotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
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
  | "finalize";

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

// ─── LLM Provider Config ───────────────────────────────────────────────────────

type LLMProvider = "openai" | "anthropic";

function getLLMProvider(): LLMProvider {
  return (process.env.LLM_PROVIDER as LLMProvider) ?? "openai";
}

export function getModel(temperature = 0.3) {
  const provider = getLLMProvider();
  if (provider === "anthropic") {
    return new ChatAnthropic({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514",
      temperature,
      maxTokens: 4096,
    });
  }
  return new ChatOpenAI({
    configuration: { baseURL: process.env.OPENAI_BASE_URL },
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    temperature,
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
  current_project: Annotation<ProjectItem>(),
  agent_events: Annotation<AgentEvent[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),
  next_phase: Annotation<ProjectPhase>(),
});

export type CompanyStateType = typeof CompanyState.State;