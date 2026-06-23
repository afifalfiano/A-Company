import type { WebSocketRoute } from "@playwright/test";

// ─── Project factory ──────────────────────────────────────────────────────────

export const TEST_PROJECT_ID = "test-00000000-0000-0000-0000-000000000001";

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

export function makeProject(overrides: DeepPartial<ReturnType<typeof makeProject>> = {}) {
  return {
    project_id: TEST_PROJECT_ID,
    project_title: "Landing Page",
    project_description: "Platform: web. Key features: hero section, pricing.",
    current_phase: "intake",
    status: "pending",
    complexity: "medium",
    is_running: false,
    planning_approved: false,
    execution_approved: false,
    retry_count: 0,
    failed_agent: null,
    generated_code: null as null | { generated_at: number; mode: string; file_count: number; zip_path: string },
    design_gen: null,
    revision_notes: [] as string[],
    token_usage: {},
    total_input_tokens: 0,
    total_output_tokens: 0,
    total_tokens: 0,
    ceo_decision: { accepted: false, priority: "medium", reasoning: "", resource_allocation: "" },
    cto_output: { architecture: "", tech_stack: [] as string[], system_design: "", technical_risks: [] as string[] },
    product_owner_output: { user_stories: [], backlog: [] as string[], sprint_plan: "" },
    product_manager_output: { strategy: "", roadmap: [] as string[], feature_priority: [] as string[], competitive_analysis: "" },
    business_marketing_output: { market_analysis: "", go_to_market: [] as string[], pricing_strategy: "", kpis: [] as string[] },
    engineer_output: { implementation_plan: [] as string[], code_structure: "", estimates: {}, dependencies: [] as string[] },
    designer_output: { wireframes: [] as string[], design_system: "", ux_flows: [] as string[], deliverables: [] as string[] },
    qa_output: { test_plan: "", test_cases: [], quality_gates: [] as string[], bug_risks: [] as string[] },
    ceo_review: { approved: false, feedback: "", launch_decision: "" },
    revision_count: 0,
    ...overrides,
  };
}

// ─── WS mock helper ───────────────────────────────────────────────────────────

type MsgHandlers = Record<string, (payload: unknown, ws: WebSocketRoute) => void>;

export function setupWsMock(ws: WebSocketRoute, handlers: MsgHandlers) {
  ws.onMessage((data) => {
    try {
      const msg = JSON.parse(data.toString()) as { type: string; payload: unknown };
      handlers[msg.type]?.(msg.payload, ws);
    } catch {
      // ignore malformed
    }
  });
}

export function wsSend(ws: WebSocketRoute, type: string, payload: unknown) {
  ws.send(JSON.stringify({ type, payload }));
}
