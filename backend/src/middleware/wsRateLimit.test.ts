import { describe, it, expect } from "vitest";
import { WsRateLimiter } from "./wsRateLimit.js";

describe("WsRateLimiter", () => {
  it("allows messages under the limit", () => {
    const limiter = new WsRateLimiter({ max: 5, windowMs: 60_000 });
    for (let i = 0; i < 5; i++) {
      expect(limiter.check("1.2.3.4")).toBe(true);
    }
  });

  it("blocks messages over the limit", () => {
    const limiter = new WsRateLimiter({ max: 3, windowMs: 60_000 });
    limiter.check("1.2.3.4");
    limiter.check("1.2.3.4");
    limiter.check("1.2.3.4");
    expect(limiter.check("1.2.3.4")).toBe(false);
  });

  it("tracks different IPs independently", () => {
    const limiter = new WsRateLimiter({ max: 2, windowMs: 60_000 });
    limiter.check("1.1.1.1");
    limiter.check("1.1.1.1");
    expect(limiter.check("2.2.2.2")).toBe(true);
    expect(limiter.check("1.1.1.1")).toBe(false);
  });

  it("resets after window expires", async () => {
    const limiter = new WsRateLimiter({ max: 1, windowMs: 50 });
    limiter.check("1.2.3.4");
    expect(limiter.check("1.2.3.4")).toBe(false);
    await new Promise(r => setTimeout(r, 60));
    expect(limiter.check("1.2.3.4")).toBe(true);
  });
});
