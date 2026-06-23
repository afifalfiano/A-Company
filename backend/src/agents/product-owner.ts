import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { CompanyStateType, AgentEvent, ProductOwnerOutput, ProjectItem } from "../state.js";
import { getModel } from "../state.js";
import { parseAgentResponse } from "./utils/utils.js";

const SYSTEM = `You are the Product Owner of Happy-Agents — focused on user stories, backlog, and sprint planning.
Your job: break down the project into user stories (Given/When/Then format), backlog items, and sprint plan.

Analysis:
1. Identify who the users are and what their goals are
2. Create 5-8 user stories with clear acceptance criteria
3. Create backlog with all features to build (sorted by priority)
4. Sprint plan: divide into 2-3 sprints with estimated duration

Format response JSON:
{
  "user_stories": [{"as":"role","want":"need","so":"benefit","acceptance":["criteria1","criteria2"]},...],
  "backlog": ["backlog item 1","backlog item 2",...],
  "sprint_plan": "Sprint 1 (2 weeks): X | Sprint 2 (2 weeks): Y | ..."
}`;

const FALLBACK_PO_OUTPUT: ProductOwnerOutput = {
  user_stories: [
    { as: "user", want: "to book a room", so: "I can reserve a space for my meeting", acceptance: ["Search available rooms", "Select time slot", "Confirm booking"] },
    { as: "admin", want: "to manage rooms", so: "I can add, edit, or remove room details", acceptance: ["Add new room", "Update room info", "Delete room"] },
    { as: "user", want: "to view my bookings", so: "I can see my scheduled meetings", acceptance: ["List my bookings", "Filter by date", "Cancel booking"] },
  ],
  backlog: ["User authentication", "Room management", "Booking system", "Email notifications", "Reporting dashboard"],
  sprint_plan: "Sprint 1 (2 weeks): Core booking · Sprint 2 (2 weeks): Admin features · Sprint 3 (2 weeks): Notifications & polish",
};

export async function productOwnerAgent(
  state: CompanyStateType,
  emit: (event: AgentEvent) => void
) {
  const project = state.current_project;
  const title = project.project_title;
  const description = project.project_description;

  emit({
    agent: "product_owner",
    phase: "planning",
    status: "started",
    message: "Product Owner creating user stories and backlog...",
    timestamp: Date.now(),
  });

  emit({
    agent: "product_owner",
    phase: "planning",
    status: "thinking",
    message: "Analyzing user needs and creating user stories...",
    timestamp: Date.now(),
  });

  const model = getModel(0.4);
  const response = await model.invoke([
    new SystemMessage(SYSTEM),
    new HumanMessage(`Project: ${title}\n\nDescription: ${description}`),
  ]);

  const usage = response.usage_metadata as { input_tokens?: number; output_tokens?: number } ?? {};
  const inputTokens = usage.input_tokens ?? 0;
  const outputTokens = usage.output_tokens ?? 0;
  emit({
    agent: "product_owner",
    phase: "planning",
    status: "token_usage",
    message: `Tokens: ${inputTokens} in / ${outputTokens} out`,
    timestamp: Date.now(),
    token_usage: { input_tokens: inputTokens, output_tokens: outputTokens },
  });

  const raw = (response.content as string).trim();
  let data: ProductOwnerOutput;

  try {
    const rawData = parseAgentResponse(raw) as Partial<ProductOwnerOutput>;
    const userStories = Array.isArray(rawData.user_stories)
      ? rawData.user_stories.map((us) => ({
          as: String(us?.as ?? ""),
          want: String(us?.want ?? ""),
          so: String(us?.so ?? ""),
          acceptance: Array.isArray(us?.acceptance) ? us.acceptance.map(String) : [],
        }))
      : [];

    data = {
      user_stories: userStories,
      backlog: Array.isArray(rawData.backlog) ? rawData.backlog.map(String) : [],
      sprint_plan: String(rawData.sprint_plan ?? ""),
    };

    const isEmpty = userStories.length === 0 && data.backlog.length === 0 && !data.sprint_plan;
    if (isEmpty) {
      console.warn("[PO] All fields empty — using fallback defaults");
      data = FALLBACK_PO_OUTPUT;
    }
  } catch (e) {
    console.warn("[PO] Failed to parse, using fallback:", e instanceof Error ? e.message : String(e));
    data = FALLBACK_PO_OUTPUT;
  }

  emit({
    agent: "product_owner",
    phase: "planning",
    status: "done",
    message: `${data.user_stories.length} user stories · ${data.backlog.length} backlog items`,
    timestamp: Date.now(),
  });

  return {
    current_project: {
      product_owner_output: data,
    } as ProjectItem,
    agent_events: [
      {
        agent: "product_owner" as const,
        phase: "planning" as const,
        status: "done" as const,
        message: `${data.user_stories.length} user stories created · Sprint: ${data.sprint_plan}`,
        timestamp: Date.now(),
      },
    ],
  };
}