import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { CompanyStateType, AgentEvent, CeoDecision, ProjectPhase } from "../state.js";
import { getModel } from "../state.js";
import { parseAgentResponse } from "./utils/utils.js";

const SYSTEM = `You are the CEO of A-Company, a pragmatic and growth-oriented software house.

Your job: analyze project requests and decide whether to ACCEPT or REJECT.

Decision style:
- ACCEPT: project is feasible, client has budget or clear use case, technically doable
- REJECT: only if project is clearly impossible (technically unachievable, fraud, illegal, or not software-related)

Do NOT reject just because:
- the project is simple or basic
- description is short
- uses mainstream technology
- you don't know the full details yet

ACCEPT projects like:
- web app, mobile app, SaaS product
- automation tool, dashboard, API integration
- anything clearly buildable with code

Priority levels:
- critical: urgent, blocking, or revenue-critical
- high: important, tight deadline
- medium: important but manageable
- low: nice to have

Resource allocation hint: none/small/medium/large

Respond ONLY with valid JSON, no markdown:
{"accepted":true|false,"priority":"critical|high|medium|low","reasoning":"brief reason 1-2 sentences","resource_allocation":"none|small|medium|large"}`;

export async function ceoIntake(
  state: CompanyStateType,
  emit: (event: AgentEvent) => void
) {
  // Skip if project already accepted via start_planning
  if (state.current_project.status === "accepted") {
    return {
      current_project: state.current_project,
      agent_events: [],
    };
  }

  const title = state.raw_title;
  const description = state.raw_description;

  emit({
    agent: "ceo",
    phase: "intake",
    status: "started",
    message: `CEO reviewing: "${title}"`,
    timestamp: Date.now(),
  });

  emit({
    agent: "ceo",
    phase: "intake",
    status: "thinking",
    message: "Analyzing project feasibility and strategic fit...",
    timestamp: Date.now(),
  });

  const model = getModel(0.3);
  const response = await model.invoke([
    new SystemMessage(SYSTEM),
    new HumanMessage(`Project Title: ${title}\n\nDescription: ${description}`),
  ]);

  const usage = response.usage_metadata ?? {};
  const inputTokens = usage.input_tokens ?? 0;
  const outputTokens = usage.output_tokens ?? 0;
  emit({
    agent: "ceo",
    phase: "intake",
    status: "token_usage",
    message: `Tokens: ${inputTokens} in / ${outputTokens} out`,
    timestamp: Date.now(),
    token_usage: { input_tokens: inputTokens, output_tokens: outputTokens },
  });

  const raw = (response.content as string).trim();
  console.log("[CEO] raw LLM response:", raw);
  const data = parseAgentResponse(raw) as CeoDecision;
  console.log("[CEO] parsed data:", JSON.stringify(data));

  // Determine complexity based on description length + resource_allocation hint
  const descLen = description.length;
  const complexity: "low" | "medium" | "high" =
    data.resource_allocation === "large" || descLen > 500 ? "high"
    : data.resource_allocation === "small" && descLen < 100 ? "low"
    : "medium";

  emit({
    agent: "ceo",
    phase: "intake",
    status: "done",
    message: data.accepted
      ? `ACCEPTED · Priority: ${data.priority.toUpperCase()} · Resource: ${data.resource_allocation}`
      : `REJECTED · ${data.reasoning}`,
    timestamp: Date.now(),
  });

  return {
    current_project: {
      ...state.current_project,
      status: data.accepted ? "accepted" : "rejected",
      complexity,
      ceo_decision: data,
    },
    agent_events: [
      {
        agent: "ceo" as const,
        phase: "intake" as const,
        status: "done" as const,
        message: data.accepted ? `Accepted - ${data.reasoning}` : `Rejected - ${data.reasoning}`,
        timestamp: Date.now(),
      },
    ],
    next_phase: data.accepted ? "planning" : ("delivered" as ProjectPhase),
  };
}

const SYSTEM_REVIEW = `You are the CEO of A-Company doing final review.
Review all team outputs (CTO, PO, PM, Engineer, Designer, QA) and decide if project is ready to launch.
Decision: approved=true if all phases went well, false if there are critical issues.
Feedback: explain the reasoning and things to watch out for.`;

export async function ceoReview(
  state: CompanyStateType,
  emit: (event: AgentEvent) => void
) {
  emit({
    agent: "ceo",
    phase: "review",
    status: "started",
    message: "CEO conducting final review...",
    timestamp: Date.now(),
  });

  emit({
    agent: "ceo",
    phase: "review",
    status: "thinking",
    message: "Reviewing all agent outputs...",
    timestamp: Date.now(),
  });

  const project = state.current_project;
  const summary = `
Project: ${project.project_title}

CTO Output:
- Architecture: ${project.cto_output.architecture}
- Tech Stack: ${project.cto_output.tech_stack.join(", ")}

Product Owner:
- ${project.product_owner_output.user_stories.length} user stories
- Sprint: ${project.product_owner_output.sprint_plan}

Product Manager:
- Strategy: ${project.product_manager_output.strategy}
- Feature Priority: ${project.product_manager_output.feature_priority.join(", ")}

Engineer:
- ${project.engineer_output.implementation_plan.length} implementation steps

Designer:
- ${project.designer_output.deliverables.length} design deliverables

QA:
- ${project.qa_output.test_cases.length} test cases planned
  `.trim();

  const model = getModel(0.2);
  const response = await model.invoke([
    new SystemMessage(SYSTEM_REVIEW),
    new HumanMessage(summary),
  ]);

  const usage = response.usage_metadata ?? {};
  const inputTokens = usage.input_tokens ?? 0;
  const outputTokens = usage.output_tokens ?? 0;
  emit({
    agent: "ceo",
    phase: "review",
    status: "token_usage",
    message: `Tokens: ${inputTokens} in / ${outputTokens} out`,
    timestamp: Date.now(),
    token_usage: { input_tokens: inputTokens, output_tokens: outputTokens },
  });

  const raw = (response.content as string).trim();
  let data: { approved: boolean; feedback: string; launch_decision: string };
  try {
    data = parseAgentResponse(raw) as typeof data;
  } catch {
    data = {
      approved: true,
      feedback: "Auto-approved - all phases completed",
      launch_decision: "ready_for_deployment",
    };
  }

  emit({
    agent: "ceo",
    phase: "review",
    status: "done",
    message: data.approved ? "APPROVED for launch" : "NEEDS REVISION",
    timestamp: Date.now(),
  });

  return {
    current_project: {
      ...state.current_project,
      ceo_review: { ...data },
    },
    agent_events: [
      {
        agent: "ceo" as const,
        phase: "review" as const,
        status: "done" as const,
        message: data.approved ? `Approved - ${data.feedback}` : `Needs revision - ${data.feedback}`,
        timestamp: Date.now(),
      },
    ],
  };
}