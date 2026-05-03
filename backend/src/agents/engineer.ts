import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { CompanyStateType, AgentEvent, EngineerOutput } from "../state.js";
import { getModel } from "../state.js";
import { parseAgentResponse } from "./utils/utils.js";

const SYSTEM = `You are the Senior Engineer at A-Company — pragmatic and detail-oriented.
Your job: create a concrete implementation plan with breakdown steps, code structure, estimates, and dependencies.

Reference the CTO architecture when building the plan. The plan must:
1. 8-12 sequential implementation steps (dependency-aware)
2. High-level code structure and folder organization
3. Effort estimates per module (man-days or man-hours)
4. Dependencies — internal and external

JSON response format:
{
  "implementation_plan": ["step 1", "step 2", ...],
  "code_structure": "folder/file structure description",
  "estimates": {"module1": "Xd", "module2": "Yd", ...},
  "dependencies": ["dep1", "dep2", ...]
}`;

const FALLBACK_ENGINEER_OUTPUT: EngineerOutput = {
  implementation_plan: [
    "Set up project repository with TypeScript and Node.js",
    "Configure database schema and migrations",
    "Implement authentication and user management",
    "Build room CRUD API endpoints",
    "Implement booking logic and conflict detection",
    "Create admin dashboard UI",
    "Add search and filtering for rooms",
    "Implement email/Slack notifications",
    "Add reporting and analytics endpoints",
    "Security hardening and rate limiting",
  ],
  code_structure: "src/{api,models,services,controllers,middleware,utils}",
  estimates: { "auth": "2d", "rooms": "3d", "bookings": "4d", "admin-ui": "3d", "notifications": "2d" },
  dependencies: ["Express", "Prisma", "PostgreSQL", "React", "Node-mailer"],
};

export async function engineerAgent(
  state: CompanyStateType,
  emit: (event: AgentEvent) => void
) {
  const project = state.current_project;
  const ctoOutput = project.cto_output;

  emit({
    agent: "engineer",
    phase: "execution",
    status: "started",
    message: "Engineer creating implementation plan...",
    timestamp: Date.now(),
  });

  emit({
    agent: "engineer",
    phase: "execution",
    status: "thinking",
    message: "Breaking down technical implementation...",
    timestamp: Date.now(),
  });

  const context = `
CTO Architecture Decision:
- Architecture: ${ctoOutput.architecture}
- Tech Stack: ${ctoOutput.tech_stack.join(", ")}
- System Design: ${ctoOutput.system_design}
- Technical Risks: ${ctoOutput.technical_risks.join(" | ")}

Project: ${project.project_title}
Description: ${project.project_description}
  `.trim();

  const model = getModel(0.4);
  const response = await model.invoke([
    new SystemMessage(SYSTEM),
    new HumanMessage(context),
  ]);

  const usage = response.usage_metadata as { input_tokens?: number; output_tokens?: number } ?? {};
  const inputTokens = usage.input_tokens ?? 0;
  const outputTokens = usage.output_tokens ?? 0;
  emit({
    agent: "engineer",
    phase: "execution",
    status: "token_usage",
    message: `Tokens: ${inputTokens} in / ${outputTokens} out`,
    timestamp: Date.now(),
    token_usage: { input_tokens: inputTokens, output_tokens: outputTokens },
  });

  const raw = (response.content as string).trim();
  console.log("[Engineer] raw LLM response:", raw);
  let data: EngineerOutput;

  try {
    const rawData = parseAgentResponse(raw) as Partial<EngineerOutput>;
    data = {
      implementation_plan: Array.isArray(rawData.implementation_plan) ? rawData.implementation_plan.map(String) : [],
      code_structure: String(rawData.code_structure ?? ""),
      estimates: rawData.estimates && typeof rawData.estimates === "object" && !Array.isArray(rawData.estimates)
        ? Object.fromEntries(Object.entries(rawData.estimates).map(([k, v]) => [k, String(v ?? "")]))
        : {},
      dependencies: Array.isArray(rawData.dependencies) ? rawData.dependencies.map(String) : [],
    };

    const isEmpty = data.implementation_plan.length === 0 && !data.code_structure && Object.keys(data.estimates).length === 0 && data.dependencies.length === 0;
    if (isEmpty) {
      console.warn("[Engineer] All fields empty — using fallback defaults");
      data = FALLBACK_ENGINEER_OUTPUT;
    }
  } catch (e) {
    console.warn("[Engineer] Failed to parse, using fallback:", e instanceof Error ? e.message : String(e));
    data = FALLBACK_ENGINEER_OUTPUT;
  }

  emit({
    agent: "engineer",
    phase: "execution",
    status: "done",
    message: `${data.implementation_plan.length} steps · Est: ${Object.values(data.estimates).join(", ")}`,
    timestamp: Date.now(),
  });

  return {
    current_project: {
      ...state.current_project,
      engineer_output: data,
    },
    agent_events: [
      {
        agent: "engineer" as const,
        phase: "execution" as const,
        status: "done" as const,
        message: `Implementation plan: ${data.implementation_plan.length} steps`,
        timestamp: Date.now(),
      },
    ],
  };
}