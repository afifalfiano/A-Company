import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { CompanyStateType, AgentEvent, DesignerOutput } from "../state.js";
import { getModel } from "../state.js";
import { parseAgentResponse } from "./utils/utils.js";

const SYSTEM = `You are the Senior UI/UX Designer at A-Company — creative and user-centric.
Your job: create design deliverables including wireframes, design system, UX flows, and deliverables list.

Reference the Product Owner user stories when designing. Deliverables must:
1. Wireframes — 4-6 wireframe descriptions for main screens
2. Design system — color palette, typography, spacing system
3. UX flows — user journey descriptions
4. Deliverables list — everything to deliver (mockups, prototypes, etc)

JSON response format:
{
  "wireframes": ["wireframe description 1", "wireframe description 2", ...],
  "design_system": "design system description (colors, fonts, spacing)",
  "ux_flows": ["user flow 1", "user flow 2", ...],
  "deliverables": ["deliverable 1", "deliverable 2", ...]
}`;

export async function designerAgent(
  state: CompanyStateType,
  emit: (event: AgentEvent) => void
) {
  const project = state.current_project;
  const poOutput = project.product_owner_output;

  emit({
    agent: "designer",
    phase: "execution",
    status: "started",
    message: "Designer creating UI/UX deliverables...",
    timestamp: Date.now(),
  });

  emit({
    agent: "designer",
    phase: "execution",
    status: "thinking",
    message: "Designing wireframes and UX flows...",
    timestamp: Date.now(),
  });

  const userStories = poOutput.user_stories
    .map((us, i) => `Story ${i + 1}: As a ${us.as}, I want ${us.want} so that ${us.so}`)
    .join("\n");

  const context = `
Product Owner User Stories:
${userStories}

Project: ${project.project_title}
Description: ${project.project_description}
  `.trim();

  const model = getModel(0.5);
  const response = await model.invoke([
    new SystemMessage(SYSTEM),
    new HumanMessage(context),
  ]);

  const usage = response.usage_metadata ?? {};
  const inputTokens = usage.input_tokens ?? 0;
  const outputTokens = usage.output_tokens ?? 0;
  emit({
    agent: "designer",
    phase: "execution",
    status: "token_usage",
    message: `Tokens: ${inputTokens} in / ${outputTokens} out`,
    timestamp: Date.now(),
    token_usage: { input_tokens: inputTokens, output_tokens: outputTokens },
  });

  const raw = (response.content as string).trim();
  const rawData = parseAgentResponse(raw) as Partial<DesignerOutput>;

  // design_system can be object from LLM — stringify it
  const rawDesignSystem = rawData.design_system;
  const designSystemStr = typeof rawDesignSystem === "string"
    ? rawDesignSystem
    : (rawDesignSystem && typeof rawDesignSystem === "object" ? JSON.stringify(rawDesignSystem) : "");

  const data: DesignerOutput = {
    wireframes: Array.isArray(rawData.wireframes) ? rawData.wireframes.map(String) : [],
    design_system: designSystemStr,
    ux_flows: Array.isArray(rawData.ux_flows) ? rawData.ux_flows.map(String) : [],
    deliverables: Array.isArray(rawData.deliverables) ? rawData.deliverables.map(String) : [],
  };

  emit({
    agent: "designer",
    phase: "execution",
    status: "done",
    message: `${data.wireframes.length} wireframes · ${data.design_system.slice(0, 40)}...`,
    timestamp: Date.now(),
  });

  return {
    current_project: {
      ...state.current_project,
      designer_output: data,
    },
    agent_events: [
      {
        agent: "designer" as const,
        phase: "execution" as const,
        status: "done" as const,
        message: `${data.deliverables.length} design deliverables planned`,
        timestamp: Date.now(),
      },
    ],
  };
}