import { describe, it, expect } from "vitest";
import { CompanyState } from "./state.js";
import type {
  ProjectItem,
  ProjectPhase,
  ProjectStatus,
  CeoDecision,
} from "./state.js";

describe("CompanyState annotations", () => {
  it("CompanyState is defined", () => {
    expect(CompanyState).toBeDefined();
  });
});

describe("Type definitions", () => {
  it("ProjectPhase accepts all valid phases", () => {
    const phases: ProjectPhase[] = ["intake", "planning", "execution", "quality", "review", "delivered"];
    expect(phases).toHaveLength(6);
  });

  it("ProjectStatus accepts all valid statuses", () => {
    const statuses: ProjectStatus[] = ["pending", "accepted", "rejected", "in_progress", "done"];
    expect(statuses).toHaveLength(5);
  });

  it("CeoDecision has correct shape", () => {
    const decision: CeoDecision = {
      accepted: false,
      priority: "medium",
      reasoning: "test",
      resource_allocation: "small",
    };
    expect(decision.accepted).toBe(false);
    expect(decision.priority).toBe("medium");
    expect(decision.resource_allocation).toBe("small");
  });

  it("ProjectItem shape matches expected structure", () => {
    const project: ProjectItem = {
      project_id: "test-123",
      project_title: "Test Project",
      project_description: "A test project",
      current_phase: "intake",
      status: "pending",
      complexity: "medium",
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
      planning_approved: false,
      execution_approved: false,
      retry_count: 0,
      failed_agent: null,
      revision_notes: [],
      token_usage: {},
      total_input_tokens: 0,
      total_output_tokens: 0,
      total_tokens: 0,
      generated_code: null,
    };
    expect(project.project_id).toBe("test-123");
    expect(project.complexity).toBe("medium");
    expect(project.planning_approved).toBe(false);
    expect(project.execution_approved).toBe(false);
    expect(project.retry_count).toBe(0);
    expect(project.failed_agent).toBeNull();
    expect(project.token_usage).toEqual({});
  });
});