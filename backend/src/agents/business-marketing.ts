import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { CompanyStateType, AgentEvent, BusinessMarketingOutput, ProjectItem } from "../state.js";
import { getModel } from "../state.js";
import { parseAgentResponse } from "./utils/utils.js";

const SYSTEM = `You are the Head of Business & Marketing at Happy-Agents — analytical and growth-focused.
Your job: provide market analysis, go-to-market strategy, pricing, and KPIs.

Analysis:
1. Market analysis — target market size, audience segmentation
2. Go-to-market — most effective channels and messaging strategy
3. Pricing strategy — price range and rationale
4. KPIs — 4-6 metrics to track for measuring success

Format response JSON:
{
  "market_analysis": "target market description and sizing",
  "go_to_market": ["step1", "step2", "step3", ...],
  "pricing_strategy": "pricing rationale and range",
  "kpis": ["KPI1: definition", "KPI2: definition", ...]
}`;

const FALLBACK_BM_OUTPUT: BusinessMarketingOutput = {
  market_analysis: "SMB market for meeting room booking — $2B global market, growing 12% YoY",
  go_to_market: ["Content marketing targeting office managers", "SEO and direct sales", "Partner with office suppliers"],
  pricing_strategy: "Freemium model: $0/mo for basic, $29/mo per location for pro features",
  kpis: ["KPI: Booking conversion rate > 15%", "KPI: Monthly active users growth > 10%", "KPI: Customer acquisition cost < $50"],
};

export async function businessMarketingAgent(
  state: CompanyStateType,
  emit: (event: AgentEvent) => void
) {
  const project = state.current_project;
  const title = project.project_title;
  const description = project.project_description;

  emit({
    agent: "business_marketing",
    phase: "planning",
    status: "started",
    message: "Business & Marketing team analyzing market...",
    timestamp: Date.now(),
  });

  emit({
    agent: "business_marketing",
    phase: "planning",
    status: "thinking",
    message: "Developing GTM strategy and pricing...",
    timestamp: Date.now(),
  });

  if (project.complexity === "low") {
    emit({ agent: "business_marketing", phase: "planning", status: "done", message: "Skipped (low complexity)", timestamp: Date.now() });
    return { current_project: { business_marketing_output: FALLBACK_BM_OUTPUT } as ProjectItem, agent_events: [] };
  }

  const ctoContext = project.cto_output?.architecture
    ? `\n\nCTO Architecture: ${project.cto_output.architecture}\nTech Stack: ${project.cto_output.tech_stack.join(", ")}`
    : "";

  const model = getModel(0.5);
  const response = await model.invoke([
    new SystemMessage(SYSTEM),
    new HumanMessage(`Project: ${title}\n\nDescription: ${description}${ctoContext}`),
  ]);

  const usage = response.usage_metadata as { input_tokens?: number; output_tokens?: number } ?? {};
  const inputTokens = usage.input_tokens ?? 0;
  const outputTokens = usage.output_tokens ?? 0;
  emit({
    agent: "business_marketing",
    phase: "planning",
    status: "token_usage",
    message: `Tokens: ${inputTokens} in / ${outputTokens} out`,
    timestamp: Date.now(),
    token_usage: { input_tokens: inputTokens, output_tokens: outputTokens },
  });

  const raw = (response.content as string).trim();
  let data: BusinessMarketingOutput;

  try {
    const rawData = parseAgentResponse(raw) as Partial<BusinessMarketingOutput>;
    data = {
      market_analysis: String(rawData.market_analysis ?? ""),
      go_to_market: Array.isArray(rawData.go_to_market) ? rawData.go_to_market.map(String) : [],
      pricing_strategy: String(rawData.pricing_strategy ?? ""),
      kpis: Array.isArray(rawData.kpis) ? rawData.kpis.map(String) : [],
    };

    const isEmpty = !data.market_analysis && data.go_to_market.length === 0 && !data.pricing_strategy && data.kpis.length === 0;
    if (isEmpty) {
      console.warn("[BM] All fields empty — using fallback defaults");
      data = FALLBACK_BM_OUTPUT;
    }
  } catch (e) {
    console.warn("[BM] Failed to parse, using fallback:", e instanceof Error ? e.message : String(e));
    data = FALLBACK_BM_OUTPUT;
  }

  emit({
    agent: "business_marketing",
    phase: "planning",
    status: "done",
    message: `Market: ${data.market_analysis.slice(0, 50)}... · ${data.go_to_market.length} GTM steps`,
    timestamp: Date.now(),
  });

  return {
    current_project: {
      business_marketing_output: data,
    } as ProjectItem,
    agent_events: [
      {
        agent: "business_marketing" as const,
        phase: "planning" as const,
        status: "done" as const,
        message: `GTM: ${data.go_to_market[0] ?? ""} · KPIs: ${data.kpis[0] ?? ""}`,
        timestamp: Date.now(),
      },
    ],
  };
}