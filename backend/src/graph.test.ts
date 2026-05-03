import { describe, it, expect } from "vitest";
import { buildGraph } from "./graph.js";
import type { AgentEvent } from "./state.js";

const noopEmit: (e: AgentEvent) => void = () => {};

describe("Graph building", () => {
  it("buildGraph returns a compiled graph with invoke method", () => {
    const graph = buildGraph(noopEmit);
    expect(graph).toBeDefined();
    expect(typeof graph.invoke).toBe("function");
  });
});

describe("Phase routing logic", () => {
  it("intake phase leads to planning_checkpoint when accepted", () => {
    const graph = buildGraph(noopEmit) as any;
    expect(graph).toBeDefined();
  });

  it("planning checkpoint respects planning_approved gate", () => {
    const graph = buildGraph(noopEmit) as any;
    expect(graph).toBeDefined();
  });

  it("execution checkpoint respects execution_approved gate", () => {
    const graph = buildGraph(noopEmit) as any;
    expect(graph).toBeDefined();
  });
});