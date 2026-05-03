import { describe, it, expect } from "vitest";
import { parseAgentResponse } from "./utils.js";

describe("parseAgentResponse", () => {
  it("parses clean JSON", () => {
    const input = '{"accepted":true,"priority":"high","reasoning":"good fit","resource_allocation":"medium"}';
    const result = parseAgentResponse(input) as Record<string, unknown>;
    expect(result.accepted).toBe(true);
    expect(result.priority).toBe("high");
    expect(result.reasoning).toBe("good fit");
  });

  it("strips LangChain think blocks", () => {
    const input = `<think> some thinking here </think>{"accepted":false,"priority":"low","reasoning":"not feasible","resource_allocation":"none"}`;
    const result = parseAgentResponse(input) as Record<string, unknown>;
    expect(result.accepted).toBe(false);
    expect(result.priority).toBe("low");
  });

  it("strips markdown code fences", () => {
    const input = `\`\`\`json\n{"accepted":true,"priority":"medium","reasoning":"viable","resource_allocation":"small"}\n\`\`\``;
    const result = parseAgentResponse(input) as Record<string, unknown>;
    expect(result.accepted).toBe(true);
  });

  it("strips markdown headers", () => {
    const input = `# Response\n{"accepted":true,"priority":"high","reasoning":"strategic","resource_allocation":"large"}`;
    const result = parseAgentResponse(input) as Record<string, unknown>;
    expect(result.accepted).toBe(true);
  });

  it("extracts JSON from middle of text", () => {
    const input = `Some explanation\n{"accepted":false,"priority":"low","reasoning":"out of scope","resource_allocation":"none"}\nMore text`;
    const result = parseAgentResponse(input) as Record<string, unknown>;
    expect(result.accepted).toBe(false);
  });

  it("extracts JSON array", () => {
    const input = `{"items":[{"id":"1"},{"id":"2"}]}`;
    const result = parseAgentResponse(input) as Record<string, unknown>;
    expect(result.items).toHaveLength(2);
  });

  it("falls back to greedy extraction on malformed JSON", () => {
    const input = `{invalid json but {"accepted":true} more text`;
    const result = parseAgentResponse(input) as Record<string, unknown>;
    // The greedy extractor should still find the inner valid JSON
    expect(result).toBeTruthy();
  });

  it("throws on completely invalid content", () => {
    const input = "this is not JSON at all";
    expect(() => parseAgentResponse(input)).toThrow();
  });

  it("handles nested braces correctly", () => {
    const input = '{"data":{"nested":{"value":true}},"accepted":true}';
    const result = parseAgentResponse(input) as Record<string, unknown>;
    expect((result.data as Record<string, unknown>).nested).toBeTruthy();
    expect(result.accepted).toBe(true);
  });

  it("handles whitespace around JSON", () => {
    const input = `

    {"accepted":true,"priority":"critical","reasoning":"urgent","resource_allocation":"large"}

    `;
    const result = parseAgentResponse(input) as Record<string, unknown>;
    expect(result.accepted).toBe(true);
    expect(result.priority).toBe("critical");
  });
});