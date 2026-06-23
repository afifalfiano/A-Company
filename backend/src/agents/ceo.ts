import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { CompanyStateType, AgentEvent, CeoDecision, ProjectPhase, ProjectItem } from "../state.js";
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
      current_project: {} as ProjectItem,
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

  const usage = response.usage_metadata as { input_tokens?: number; output_tokens?: number } ?? {};
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
  let data = parseAgentResponse(raw) as CeoDecision;

  // Guard: if CEO rejected but gave no reasoning, the response was likely malformed.
  // Auto-accept with low priority since the system prompt says only reject obviously impossible projects.
  if (data.accepted === false && (!data.reasoning || data.reasoning.trim().length === 0)) {
    console.warn("[CEO] Rejected with empty reasoning — treating as malformed response, auto-accepting.");
    data = {
      accepted: true,
      priority: "low",
      reasoning: "Auto-accepted — CEO response was ambiguous or empty. Defaulting to low priority.",
      resource_allocation: "small",
    };
  }

  // Guard: normalize missing fields
  if (!data.priority || !["critical","high","medium","low"].includes(data.priority)) {
    data.priority = "medium";
  }
  if (!data.resource_allocation || !["none","small","medium","large"].includes(data.resource_allocation)) {
    data.resource_allocation = "medium";
  }

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
      status: data.accepted ? "accepted" : "rejected",
      complexity,
      ceo_decision: data,
    } as ProjectItem,
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

export function deterministicReview(
  state: CompanyStateType,
  emit: (event: AgentEvent) => void
): Partial<CompanyStateType> {
  const p = state.current_project;
  const allDone =
    p.engineer_output.implementation_plan.length > 0 &&
    p.designer_output.wireframes.length > 0 &&
    p.qa_output.test_cases.length > 0;

  const review = allDone
    ? { approved: true, feedback: "All phases completed successfully", launch_decision: "ready_for_deployment" }
    : { approved: false, feedback: "One or more phases produced no output", launch_decision: "needs_revision" };

  emit({
    agent: "ceo",
    phase: "review",
    status: "done",
    message: review.approved ? "APPROVED for launch" : "NEEDS REVISION",
    timestamp: Date.now(),
  });

  return {
    current_project: { ceo_review: review } as ProjectItem,
    agent_events: [
      {
        agent: "ceo" as const,
        phase: "review" as const,
        status: "done" as const,
        message: review.approved ? `Approved - ${review.feedback}` : `Needs revision - ${review.feedback}`,
        timestamp: Date.now(),
      },
    ],
  };
}