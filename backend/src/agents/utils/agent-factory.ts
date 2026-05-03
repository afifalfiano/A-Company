import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { parseAgentResponse } from "./utils.js";
import type { AgentEvent } from "../../state.js";
import { getModel } from "../../state.js";

export interface AgentConfig {
  name: string;
  systemPrompt: string;
  temperature?: number;
}

export interface AgentOutput {
  [key: string]: unknown;
}

export async function createAgent(
  config: AgentConfig,
  state: {
    current_project: {
      project_title: string;
      project_description: string;
      [key: string]: unknown;
    };
  },
  emit: (event: AgentEvent) => void,
  humanMessageOverride?: string,
  extraContext?: string
) {
  const model = getModel(config.temperature ?? 0.3);

  const title = state.current_project.project_title;
  const description = state.current_project.project_description;

  let humanContent = humanMessageOverride
    ?? `${title}\n\nDescription: ${description}`;
  if (extraContext) {
    humanContent = `${humanContent}\n\nContext:\n${extraContext}`;
  }

  emit({
    agent: config.name as AgentEvent["agent"],
    phase: "intake",
    status: "started",
    message: `Starting ${config.name} analysis...`,
    timestamp: Date.now(),
  });

  emit({
    agent: config.name as AgentEvent["agent"],
    phase: "intake",
    status: "thinking",
    message: `Analyzing project...`,
    timestamp: Date.now(),
  });

  try {
    const response = await model.invoke([
      new SystemMessage(config.systemPrompt),
      new HumanMessage(humanContent),
    ]);

    const data = parseAgentResponse(response.content as string) as AgentOutput;

    const usage = response.usage_metadata ?? {};
    const tokenUsage = {
      input_tokens: usage.input_tokens ?? 0,
      output_tokens: usage.output_tokens ?? 0,
    };

    emit({
      agent: config.name as AgentEvent["agent"],
      phase: "intake",
      status: "token_usage",
      message: `Tokens used`,
      timestamp: Date.now(),
      token_usage: tokenUsage,
    });

    emit({
      agent: config.name as AgentEvent["agent"],
      phase: "intake",
      status: "done",
      message: `${config.name} analysis complete`,
      timestamp: Date.now(),
    });

    return data;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    emit({
      agent: config.name as AgentEvent["agent"],
      phase: "intake",
      status: "error",
      message: `${config.name} failed: ${message}`,
      timestamp: Date.now(),
    });
    throw err;
  }
}