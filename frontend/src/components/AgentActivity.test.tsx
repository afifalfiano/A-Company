import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AgentActivity } from "../components/AgentActivity";
import { AgentEvent, AgentName } from "../models";

const noop = () => {};

const makeEvent = (overrides: Partial<AgentEvent> = {}): AgentEvent => ({
  agent: "ceo",
  phase: "intake",
  status: "done",
  message: "Test message",
  timestamp: Date.now(),
  ...overrides,
});

describe("AgentActivity", () => {
  it("renders empty state", () => {
    render(
      <AgentActivity
        events={[]}
        processing={false}
        activeAgent={null}
        project={null}
        onAgentClick={noop}
      />
    );
    expect(screen.getByText(/no activity yet/i)).toBeInTheDocument();
  });

  it("shows spinner when processing", () => {
    render(
      <AgentActivity
        events={[]}
        processing={true}
        activeAgent={null}
        project={null}
        onAgentClick={noop}
      />
    );
    expect(document.querySelector(".spinner")).toBeInTheDocument();
  });

  it("renders all agent roster items", () => {
    render(
      <AgentActivity
        events={[]}
        processing={false}
        activeAgent={null}
        project={null}
        onAgentClick={noop}
      />
    );
    expect(screen.getByText(/^ceo$/)).toBeInTheDocument();
    expect(screen.getByText(/^product owner$/)).toBeInTheDocument();
    expect(screen.getByText(/^product manager$/)).toBeInTheDocument();
  });

  it("renders event list items", () => {
    const events: AgentEvent[] = [
      makeEvent({ agent: "ceo", status: "done", message: "CEO finished intake" }),
      makeEvent({ agent: "cto", status: "thinking", message: "CTO is thinking" }),
    ];
    render(
      <AgentActivity
        events={events}
        processing={false}
        activeAgent={null}
        project={null}
        onAgentClick={noop}
      />
    );
    expect(screen.getByText("CEO finished intake")).toBeInTheDocument();
    expect(screen.getByText("CTO is thinking")).toBeInTheDocument();
  });

  it("shows token summary when token_usage events present", () => {
    const events: AgentEvent[] = [
      makeEvent({ agent: "engineer", status: "token_usage", message: "", token_usage: { input_tokens: 1000, output_tokens: 500 } }),
    ];
    render(
      <AgentActivity
        events={events}
        processing={false}
        activeAgent={null}
        project={null}
        onAgentClick={noop}
      />
    );
    expect(screen.getByText(/tokens:/i)).toBeInTheDocument();
    expect(screen.getByText(/1,000 in/i)).toBeInTheDocument();
    expect(screen.getByText(/500 out/i)).toBeInTheDocument();
  });

  it("opens AgentActivityDetail on agent click when project exists", () => {
    const events: AgentEvent[] = [
      makeEvent({ agent: "designer", status: "done", message: "Design complete" }),
    ];
    const mockClick = vi.fn();
    const project = {
      project_id: "p1",
      project_title: "Test",
      project_description: "",
      current_phase: "planning" as const,
      status: "in_progress" as const,
      complexity: "medium" as const,
      ceo_decision: { accepted: true, priority: "high" as const, reasoning: "", resource_allocation: "" },
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
    };
    render(
      <AgentActivity
        events={events}
        processing={false}
        activeAgent={null}
        project={project}
        onAgentClick={mockClick}
      />
    );
    const rosterItem = screen.getByTitle("View designer output");
    fireEvent.click(rosterItem);
    expect(mockClick).toHaveBeenCalledWith("designer");
  });
});