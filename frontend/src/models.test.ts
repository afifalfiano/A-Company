import { describe, it, expect } from "vitest";
import {
  AGENT_CONFIG,
  PHASE_COLORS,
  PRIORITY_COLORS,
  STATUS_LABELS,
  AgentName,
  ProjectPhase,
  ProjectStatus,
} from "./models";

describe("models", () => {
  it("AGENT_CONFIG has all required agents", () => {
    const agents: AgentName[] = ["ceo", "cto", "engineer", "product_owner", "product_manager", "designer", "qa", "business_marketing", "finalize"];
    agents.forEach((agent) => {
      expect(AGENT_CONFIG[agent]).toBeDefined();
      expect(AGENT_CONFIG[agent].label).toBeTruthy();
      expect(AGENT_CONFIG[agent].color).toMatch(/^#/);
      expect(AGENT_CONFIG[agent].bg).toMatch(/^#/);
    });
  });

  it("PHASE_COLORS has all phases", () => {
    const phases: ProjectPhase[] = ["intake", "planning", "execution", "quality", "review", "delivered"];
    phases.forEach((phase) => {
      expect(PHASE_COLORS[phase]).toMatch(/^#/);
    });
  });

  it("PRIORITY_COLORS has all priorities", () => {
    const priorities = ["critical", "high", "medium", "low"];
    priorities.forEach((p) => {
      expect(PRIORITY_COLORS[p]).toBeTruthy();
    });
  });

  it("STATUS_LABELS has all statuses", () => {
    const statuses: ProjectStatus[] = ["pending", "accepted", "rejected", "in_progress", "done"];
    statuses.forEach((s) => {
      expect(STATUS_LABELS[s]).toBeTruthy();
    });
  });
});
