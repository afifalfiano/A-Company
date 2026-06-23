import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { CompanyStateType, AgentEvent, ProductManagerOutput, ProjectItem } from "../state.js";
import { getModel } from "../state.js";
import { parseAgentResponse } from "./utils/utils.js";

const SYSTEM = `You are the Product Manager of A-Company — strategic and market-focused.
Your job: provide product strategy, feature priority, competitive analysis, and roadmap.

Analysis:
1. Product strategy — vision and positioning
2. Feature priority — which features are must-have vs nice-to-have (MoSCoW: Must/Should/Could/Won't)
3. Competitive analysis — compare with competitors and our differentiators
4. Roadmap — milestones in the next 3-6 months

Format response JSON:
{
  "strategy": "product vision and positioning strategy",
  "feature_priority": ["Must have: X", "Should have: Y", "Could have: Z"],
  "competitive_analysis": "competitor comparison and our differentiators",
  "roadmap": ["Q1: milestone1", "Q2: milestone2", ...]
}`;

const FALLBACK_PM_OUTPUT: ProductManagerOutput = {
  strategy: "Build a scalable room booking platform with focus on ease of use and reliability",
  roadmap: ["Q1: MVP launch", "Q2: Multi-location support", "Q3: Analytics dashboard"],
  feature_priority: ["Must have: room search and booking", "Should have: admin panel", "Could have: calendar integrations"],
  competitive_analysis: "Competitors focus on enterprise — opportunity in SMB simplicity",
};

export async function productManagerAgent(
  state: CompanyStateType,
  emit: (event: AgentEvent) => void
) {
  const project = state.current_project;
  const title = project.project_title;
  const description = project.project_description;

  emit({
    agent: "product_manager",
    phase: "planning",
    status: "started",
    message: "Product Manager developing strategy...",
    timestamp: Date.now(),
  });

  emit({
    agent: "product_manager",
    phase: "planning",
    status: "thinking",
    message: "Analyzing market and planning product roadmap...",
    timestamp: Date.now(),
  });

  if (project.complexity === "low") {
    emit({ agent: "product_manager", phase: "planning", status: "done", message: "Skipped (low complexity)", timestamp: Date.now() });
    return { current_project: { product_manager_output: FALLBACK_PM_OUTPUT } as ProjectItem, agent_events: [] };
  }

  const ctoContext = project.cto_output?.architecture
    ? `\n\nCTO Architecture: ${project.cto_output.architecture}\nTech Stack: ${project.cto_output.tech_stack.join(", ")}`
    : "";

  const model = getModel(0.4);
  const response = await model.invoke([
    new SystemMessage(SYSTEM),
    new HumanMessage(`Project: ${title}\n\nDescription: ${description}${ctoContext}`),
  ]);

  const usage = response.usage_metadata as { input_tokens?: number; output_tokens?: number } ?? {};
  const inputTokens = usage.input_tokens ?? 0;
  const outputTokens = usage.output_tokens ?? 0;
  emit({
    agent: "product_manager",
    phase: "planning",
    status: "token_usage",
    message: `Tokens: ${inputTokens} in / ${outputTokens} out`,
    timestamp: Date.now(),
    token_usage: { input_tokens: inputTokens, output_tokens: outputTokens },
  });

  const raw = (response.content as string).trim();
  let data: ProductManagerOutput;

  try {
    const rawData = parseAgentResponse(raw) as Partial<ProductManagerOutput>;
    data = {
      strategy: String(rawData.strategy ?? ""),
      roadmap: Array.isArray(rawData.roadmap) ? rawData.roadmap.map(String) : [],
      feature_priority: Array.isArray(rawData.feature_priority) ? rawData.feature_priority.map(String) : [],
      competitive_analysis: String(rawData.competitive_analysis ?? ""),
    };

    const isEmpty = !data.strategy && data.roadmap.length === 0 && data.feature_priority.length === 0 && !data.competitive_analysis;
    if (isEmpty) {
      console.warn("[PM] All fields empty — using fallback defaults");
      data = FALLBACK_PM_OUTPUT;
    }
  } catch (e) {
    console.warn("[PM] Failed to parse, using fallback:", e instanceof Error ? e.message : String(e));
    data = FALLBACK_PM_OUTPUT;
  }

  emit({
    agent: "product_manager",
    phase: "planning",
    status: "done",
    message: `Strategy: ${data.strategy.slice(0, 60)}...`,
    timestamp: Date.now(),
  });

  return {
    current_project: {
      product_manager_output: data,
    } as ProjectItem,
    agent_events: [
      {
        agent: "product_manager" as const,
        phase: "planning" as const,
        status: "done" as const,
        message: `${data.roadmap.length} roadmap milestones · ${data.feature_priority[0] ?? ""}`,
        timestamp: Date.now(),
      },
    ],
  };
}