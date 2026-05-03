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
  const rawData = parseAgentResponse(raw) as Partial<QaOutput>;

  const data: QaOutput = {
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