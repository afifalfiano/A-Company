import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, unlinkSync } from "fs";
import { saveProject, loadProject, getAllProjects } from "./db.js";
import type { ProjectItem } from "./state.js";

const TEST_DB = "./data/test-projects.json";

function mockProject(id: string): ProjectItem {
  return {
    project_id: id,
    project_title: "Test",
    project_description: "Desc",
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
    generated_code: null,
    design_gen: null,
    revision_notes: [],
    token_usage: {},
    total_input_tokens: 0,
    total_output_tokens: 0,
    total_tokens: 0,
    is_running: false,
  };
}

describe("db", () => {
  beforeEach(() => {
    process.env.DB_PATH = TEST_DB;
    if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
  });
  afterEach(() => {
    if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
  });

  it("saves and loads a project", () => {
    const p = mockProject("abc");
    saveProject(p);
    expect(loadProject("abc")).toEqual(p);
  });

  it("getAllProjects returns all saved projects", () => {
    saveProject(mockProject("a"));
    saveProject(mockProject("b"));
    expect(getAllProjects()).toHaveLength(2);
  });

  it("returns undefined for unknown id", () => {
    expect(loadProject("nope")).toBeUndefined();
  });

  it("overwrites existing project on resave", () => {
    const p = mockProject("x");
    saveProject(p);
    const updated = { ...p, status: "accepted" as const };
    saveProject(updated);
    expect(loadProject("x")?.status).toBe("accepted");
  });
});
