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
  | "code_generator";

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
  planning_approved: boolean;
  execution_approved: boolean;
  retry_count: number;
  failed_agent: string | null;
  generated_code: CodeGenMetadata | null;
  revision_notes: string[];
  token_usage: Record<string, { input_tokens: number; output_tokens: number }>;
  total_input_tokens: number;
  total_output_tokens: number;
  total_tokens: number;
}

export type WsMessage =
  | { type: "connected"; payload: { message: string } }
  | { type: "agent_event"; payload: AgentEvent }
  | { type: "processing_start"; payload: { project: ProjectItem } }
  | { type: "phase_start"; payload: { project: ProjectItem; phase: ProjectPhase } }
  | { type: "processing_done"; payload: { project: ProjectItem } }
  | { type: "project_update"; payload: { project: ProjectItem } }
  | { type: "error"; payload: { message: string } }
  | { type: "gate_pending"; payload: { project: ProjectItem; gate: "planning" | "execution" } }
  | { type: "gate_approved"; payload: { project: ProjectItem; gate: "planning" | "execution" } }
  | { type: "gate_rejected"; payload: { project: ProjectItem; reason: string } }
  | { type: "code_gen_start"; payload: { project_id: string } }
  | { type: "code_gen_done"; payload: { project_id: string; metadata: CodeGenMetadata } }
  | { type: "code_gen_error"; payload: { project_id: string; message: string } }
  | { type: "code_gen_download_ready"; payload: { project_id: string; zip_url: string } };

export type PhaseConfig = {
  label: string;
  color: string;
  bg: string;
  icon: string;
  desc: string;
};

export const AGENT_CONFIG: Record<AgentName, PhaseConfig> = {
  ceo:             { label: "CEO",              color: "#7F77DD", bg: "#2a2645", icon: "C",  desc: "Analisa & keputusan" },
  cto:             { label: "CTO",              color: "#378ADD", bg: "#1a2a3d", icon: "T",  desc: "Arsitektur & tech stack" },
  product_owner:   { label: "Product Owner",    color: "#D4537E", bg: "#3d1a28", icon: "PO", desc: "User stories & backlog" },
  product_manager:{ label: "Product Manager",  color: "#E24B4A", bg: "#3d1a1a", icon: "PM", desc: "Strategi & roadmap" },
  business_marketing: { label: "Biz & Marketing", color: "#EF9F27", bg: "#3d2e10", icon: "BM", desc: "Market & go-to-market" },
  engineer:        { label: "Engineer",         color: "#1D9E75", bg: "#1a3028", icon: "E",  desc: "Implementation plan" },
  designer:        { label: "Designer",         color: "#9B59B6", bg: "#2a1a3d", icon: "D",  desc: "UI/UX deliverables" },
  qa:              { label: "QA",               color: "#E67E22", bg: "#3d2a10", icon: "Q",  desc: "Test plan & quality gates" },
  code_generator: { label: "Code Generator",  color: "#7F77DD", bg: "#2a2645", icon: "⚡", desc: "Code generation" },
  finalize:        { label: "Selesai",           color: "#639922", bg: "#1e2e10", icon: "✓", desc: "Project delivered" },
};

export const PHASE_COLORS: Record<ProjectPhase, string> = {
  intake:    "#7F77DD",
  planning:  "#378ADD",
  execution: "#1D9E75",
  quality:   "#E67E22",
  review:    "#EF9F27",
  delivered: "#639922",
};

export const PRIORITY_COLORS: Record<string, string> = {
  critical: "#E24B4A",
  high:     "#E67E22",
  medium:   "#EF9F27",
  low:      "#639922",
};

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  pending:    "Pending",
  accepted:   "Accepted",
  rejected:   "Rejected",
  in_progress: "In Progress",
  done:       "Done",
};