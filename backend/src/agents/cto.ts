import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { CompanyStateType, AgentEvent, CtoOutput } from "../state.js";
import { getModel } from "../state.js";
import { parseAgentResponse } from "./utils/utils.js";

const SYSTEM = `You are the CTO of A-Company — an experienced technical architect.
Your job: after CEO accepts a project, define the architecture, tech stack, system design, and technical risks.

Analysis:
1. Suitable architecture pattern (monolith, microservices, modular, etc)
2. Optimal tech stack — specific tools and versions
3. System design — high-level component diagram in text
4. Technical risks — at least 3 major risks and mitigations

Format response JSON:
{
  "architecture": "architecture pattern description",
  "tech_stack": ["tool1 version", "tool2 version", ...],
  "system_design": "high-level system design description",
  "technical_risks": ["risk1 and mitigation", "risk2 and mitigation", ...]
}`;

export async function ctoAgent(
  state: CompanyStateType,
  emit: (event: AgentEvent) => void
) {
  const project = state.current_project;
  const title = project.project_title;
  const description = project.project_description;

  emit({
    agent: "cto",
    phase: "planning",
    status: "started",
    message: `CTO reviewing technical feasibility: "${title}"`,
    timestamp: Date.now(),
  });

  emit({
    agent: "cto",
    phase: "planning",
    status: "thinking",
    message: "Designing architecture and selecting tech stack...",
    timestamp: Date.now(),
  });

  const model = getModel(0.3);
  const response = await model.invoke([
    new SystemMessage(SYSTEM),
    new HumanMessage(`Project: ${title}\n\nDescription: ${description}`),
  ]);

  // Extract token usage
  const usage = response.usage_metadata ?? {};
  const inputTokens = usage.input_tokens ?? 0;
  const outputTokens = usage.output_tokens ?? 0;

  // Emit token usage event
  emit({
    agent: "cto",
    phase: "planning",
    status: "token_usage",
    message: `Tokens: ${inputTokens} in / ${outputTokens} out`,
    timestamp: Date.now(),
    token_usage: { input_tokens: inputTokens, output_tokens: outputTokens },
  });

  const raw = (response.content as string).trim();
  let data: CtoOutput;
  try {
    data = parseAgentResponse(raw) as CtoOutput;
  } catch (e) {
    emit({
      agent: "cto",
      phase: "planning",
      status: "error",
      message: `Failed to parse CTO response: ${e instanceof Error ? e.message : String(e)}`,
      timestamp: Date.now(),
    });
    throw e;
  }

  const techStack = Array.isArray(data.tech_stack) ? data.tech_stack : [];
  const arch = String(data.architecture ?? "");
  emit({
    agent: "cto",
    phase: "planning",
    status: "done",
    message: `Architecture: ${arch.slice(0, 50)} · Stack: ${techStack.slice(0, 3).join(", ")}...`,
    timestamp: Date.now(),
  });

  return {
    current_project: {
      ...state.current_project,
      cto_output: {
        architecture: arch,
        tech_stack: techStack,
        system_design: String(data.system_design ?? ""),
        technical_risks: Array.isArray(data.technical_risks) ? data.technical_risks : [],
      },
    },
    agent_events: [
      {
        agent: "cto" as const,
        phase: "planning" as const,
        status: "done" as const,
        message: `Tech stack selected: ${techStack.slice(0, 5).join(", ")}`,
        timestamp: Date.now(),
      },
    ],
  };
}