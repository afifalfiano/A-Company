import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { CompanyStateType, AgentEvent, BusinessMarketingOutput } from "../state.js";
import { getModel } from "../state.js";
import { parseAgentResponse } from "./utils/utils.js";

const SYSTEM = `You are the Head of Business & Marketing at A-Company — analytical and growth-focused.
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

  const model = getModel(0.5);
  const response = await model.invoke([
    new SystemMessage(SYSTEM),
    new HumanMessage(`Project: ${title}\n\nDescription: ${description}`),
  ]);

  const usage = response.usage_metadata ?? {};
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
  const rawData = parseAgentResponse(raw) as Partial<BusinessMarketingOutput>;

  const data: BusinessMarketingOutput = {
    market_analysis: String(rawData.market_analysis ?? ""),
    go_to_market: Array.isArray(rawData.go_to_market) ? rawData.go_to_market.map(String) : [],
    pricing_strategy: String(rawData.pricing_strategy ?? ""),
    kpis: Array.isArray(rawData.kpis) ? rawData.kpis.map(String) : [],
  };

  emit({
    agent: "business_marketing",
    phase: "planning",
    status: "done",
    message: `Market: ${data.market_analysis.slice(0, 50)}... · ${data.go_to_market.length} GTM steps`,
    timestamp: Date.now(),
  });

  return {
    current_project: {
      ...state.current_project,
      business_marketing_output: data,
    },
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