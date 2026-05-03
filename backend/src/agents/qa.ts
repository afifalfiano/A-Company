import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { CompanyStateType, AgentEvent, QaOutput } from "../state.js";
import { getModel } from "../state.js";
import { parseAgentResponse } from "./utils/utils.js";

const SYSTEM = `You are the QA Lead at A-Company — thorough and detail-oriented.
Your job: create a test plan, test cases, quality gates, and risk assessment for the project.

Reference the Engineer implementation plan and Designer outputs. QA must:
1. Test plan — overall testing strategy
2. Test cases — 6-10 test cases with name, type, and steps
3. Quality gates — 3-5 checkpoints before launch
4. Bug risks — risk areas that could cause problems

JSON response format:
{
  "test_plan": "overall testing strategy description",
  "test_cases": [{"name":"test case name","type":"unit|integration|e2e|performance","steps":["step1","step2",...]}, ...],
  "quality_gates": ["gate 1", "gate 2", ...],
  "bug_risks": ["risk area 1", "risk area 2", ...]
}`;

const FALLBACK_QA_OUTPUT: QaOutput = {
  test_plan: "Test strategy: unit tests for business logic, integration tests for API endpoints, E2E for critical user flows (booking, search). Automated CI pipeline with regression suite.",
  test_cases: [
    { name: "Book available room", type: "e2e", steps: ["Login", "Navigate to rooms", "Select room", "Pick time slot", "Confirm booking", "Verify confirmation email"] },
    { name: "Reject double booking", type: "integration", steps: ["Create booking A", "Try overlapping booking B", "System rejects with conflict error"] },
    { name: "Admin creates room", type: "e2e", steps: ["Login as admin", "Navigate to admin panel", "Add new room", "Fill details", "Save", "Verify room appears in listing"] },
    { name: "Search filter works", type: "unit", steps: ["Enter search query", "Filter by capacity", "Filter by amenities", "Results match criteria"] },
    { name: "Cancel booking", type: "e2e", steps: ["Go to my bookings", "Select active booking", "Click cancel", "Confirm cancellation", "Email sent to both parties"] },
  ],
  quality_gates: [
    "All unit tests passing (覆盖率 > 80%)",
    "All integration tests passing",
    "E2E smoke tests green",
    "No critical bugs open",
    "Product manager sign-off on feature completeness",
  ],
  bug_risks: [
    "Timezone handling in booking conflicts — high risk",
    "Calendar sync edge cases with recurring bookings",
    "Mobile responsive layout for admin panel",
  ],
};

export async function qaAgent(
  state: CompanyStateType,
  emit: (event: AgentEvent) => void
) {
  const project = state.current_project;
  const engineerOutput = project.engineer_output;
  const designerOutput = project.designer_output;

  emit({
    agent: "qa",
    phase: "quality",
    status: "started",
    message: "QA planning test strategy...",
    timestamp: Date.now(),
  });

  emit({
    agent: "qa",
    phase: "quality",
    status: "thinking",
    message: "Creating test plan and test cases...",
    timestamp: Date.now(),
  });

  const context = `
Engineer Implementation Plan:
${engineerOutput.implementation_plan.map((s, i) => `${i + 1}. ${s}`).join("\n")}

Designer Deliverables:
${designerOutput.deliverables.map(d => `- ${d}`).join("\n")}

Project: ${project.project_title}
  `.trim();

  const model = getModel(0.3);
  const response = await model.invoke([
    new SystemMessage(SYSTEM),
    new HumanMessage(context),
  ]);

  const usage = response.usage_metadata ?? {};
  const inputTokens = usage.input_tokens ?? 0;
  const outputTokens = usage.output_tokens ?? 0;
  emit({
    agent: "qa",
    phase: "quality",
    status: "token_usage",
    message: `Tokens: ${inputTokens} in / ${outputTokens} out`,
    timestamp: Date.now(),
    token_usage: { input_tokens: inputTokens, output_tokens: outputTokens },
  });

  const raw = (response.content as string).trim();
  console.log("[QA] raw LLM response:", raw);
  let data: QaOutput;

  try {
    const rawData = parseAgentResponse(raw) as Partial<QaOutput>;
    data = {
      test_plan: String(rawData.test_plan ?? ""),
      test_cases: Array.isArray(rawData.test_cases)
        ? rawData.test_cases.map((tc) => ({
            name: String(tc?.name ?? ""),
            type: String(tc?.type ?? ""),
            steps: Array.isArray(tc?.steps) ? tc.steps.map(String) : [],
          }))
        : [],
      quality_gates: Array.isArray(rawData.quality_gates) ? rawData.quality_gates.map(String) : [],
      bug_risks: Array.isArray(rawData.bug_risks) ? rawData.bug_risks.map(String) : [],
    };

    const isEmpty = !data.test_plan && data.test_cases.length === 0 && data.quality_gates.length === 0 && data.bug_risks.length === 0;
    if (isEmpty) {
      console.warn("[QA] All fields empty — using fallback defaults");
      data = FALLBACK_QA_OUTPUT;
    }
  } catch (e) {
    console.warn("[QA] Failed to parse, using fallback:", e instanceof Error ? e.message : String(e));
    data = FALLBACK_QA_OUTPUT;
  }

  emit({
    agent: "qa",
    phase: "quality",
    status: "done",
    message: `${data.test_cases.length} test cases · ${data.quality_gates.length} quality gates`,
    timestamp: Date.now(),
  });

  return {
    current_project: {
      ...state.current_project,
      qa_output: data,
    },
    agent_events: [
      {
        agent: "qa" as const,
        phase: "quality" as const,
        status: "done" as const,
        message: `QA Plan: ${data.test_plan.slice(0, 60)}...`,
        timestamp: Date.now(),
      },
    ],
  };
}