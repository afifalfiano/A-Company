import { describe, it, expect } from "vitest";
import { validateProjectInput } from "./validation.js";

describe("validateProjectInput", () => {
  it("accepts valid input", () => {
    expect(validateProjectInput("My App", "Build me something")).toBeNull();
  });

  it("rejects empty title", () => {
    expect(validateProjectInput("", "desc")).toMatch(/title/i);
  });

  it("rejects whitespace-only title", () => {
    expect(validateProjectInput("   ", "desc")).toMatch(/title/i);
  });

  it("rejects title over 200 chars", () => {
    expect(validateProjectInput("a".repeat(201), "desc")).toMatch(/title/i);
  });

  it("accepts title of exactly 200 chars", () => {
    expect(validateProjectInput("a".repeat(200), "desc")).toBeNull();
  });

  it("rejects description over 2000 chars", () => {
    expect(validateProjectInput("title", "a".repeat(2001))).toMatch(/description/i);
  });

  it("accepts description of exactly 2000 chars", () => {
    expect(validateProjectInput("title", "a".repeat(2000))).toBeNull();
  });

  it("trims whitespace before validation", () => {
    expect(validateProjectInput("  My App  ", "  desc  ")).toBeNull();
  });
});
