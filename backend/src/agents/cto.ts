import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { CompanyStateType, AgentEvent, CtoOutput, ProjectItem } from "../state.js";
import { getModel } from "../state.js";
import { parseAgentResponse } from "./utils/utils.js";

const SYSTEM = `You are the CTO of Happy-Agents — an experienced technical architect.
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

const FALLBACK_CTO_OUTPUT: CtoOutput = {
  architecture: "Modular monolith with API layer",
  tech_stack: ["TypeScript", "Node.js", "React", "PostgreSQL"],
  system_design: "Client-server architecture with REST API",
  technical_risks: ["Integration complexity", "Data migration risk"],
};

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

  const usage = response.usage_metadata as { input_tokens?: number; output_tokens?: number } ?? {};
  const inputTokens = usage.input_tokens ?? 0;
  const outputTokens = usage.output_tokens ?? 0;
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
    const parsed = parseAgentResponse(raw);
    const obj = parsed as Partial<CtoOutput>;
    data = {
      architecture: String(obj.architecture ?? ""),
      tech_stack: Array.isArray(obj.tech_stack) ? obj.tech_stack.map(String) : [],
      system_design: String(obj.system_design ?? ""),
      technical_risks: Array.isArray(obj.technical_risks) ? obj.technical_risks.map(String) : [],
    };
    // Fallback: if everything empty after parse, use defaults so pipeline continues
    const isEmpty =
      !data.architecture &&
      data.tech_stack.length === 0 &&
      !data.system_design &&
      data.technical_risks.length === 0;
    if (isEmpty) {
      console.warn("[CTO] All fields empty after parse — using fallback defaults");
      data = FALLBACK_CTO_OUTPUT;
    }
  } catch (e) {
    console.warn("[CTO] Failed to parse, using fallback:", e instanceof Error ? e.message : String(e));
    data = FALLBACK_CTO_OUTPUT;
  }

  const techStack = data.tech_stack;
  emit({
    agent: "cto",
    phase: "planning",
    status: "done",
    message: `Architecture: ${data.architecture.slice(0, 50)} · Stack: ${techStack.slice(0, 3).join(", ")}...`,
    timestamp: Date.now(),
  });

  return {
    current_project: {
      cto_output: data,
    } as ProjectItem,
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