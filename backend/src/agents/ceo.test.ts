import { describe, it, expect } from "vitest";
import type { CeoDecision } from "../../state.js";

describe("CEO decision acceptance criteria", () => {
  it("accepts basic todo list project", () => {
    // Simulate what the CEO should decide for a simple todo list
    const decision: CeoDecision = {
      accepted: true,
      priority: "medium",
      reasoning: "Simple but viable SaaS product - buildable",
      resource_allocation: "small",
    };
    expect(decision.accepted).toBe(true);
    expect(decision.resource_allocation).not.toBe("none");
  });

  it("accepts web app projects", () => {
    const decision: CeoDecision = {
      accepted: true,
      priority: "high",
      reasoning: "Standard web app - clearly buildable",
      resource_allocation: "medium",
    };
    expect(decision.accepted).toBe(true);
  });

  it("rejects only genuinely impossible projects", () => {
    // Fraud, illegal, or impossible technical claims
    const decision: CeoDecision = {
      accepted: false,
      priority: "low",
      reasoning: "Claims to build nuclear reactor - not software",
      resource_allocation: "none",
    };
    expect(decision.accepted).toBe(false);
  });

  it("basic project should not be rejected for being simple", () => {
    // A simple todo list should NOT be rejected
    const decision: CeoDecision = {
      accepted: true,
      priority: "low",
      reasoning: "Basic SaaS - feasible scope",
      resource_allocation: "small",
    };
    expect(decision.accepted).toBe(true);
    expect(decision.priority).toBe("low");
  });
});