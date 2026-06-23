import { describe, it, expect, afterEach } from "vitest";
import { WsRateLimiter } from "./wsRateLimit.js";

describe("WsRateLimiter", () => {
  const limiters: WsRateLimiter[] = [];
  const make = (max: number, windowMs: number) => {
    const l = new WsRateLimiter({ max, windowMs });
    limiters.push(l);
    return l;
  };

  afterEach(() => {
    // Clean up timers so tests don't leak
    while (limiters.length) limiters.pop()!.destroy();
  });

  it("allows messages under the limit", () => {
    const limiter = make(5, 60_000);
    for (let i = 0; i < 5; i++) {
      expect(limiter.check("1.2.3.4")).toBe(true);
    }
  });

  it("blocks the message that exceeds the limit", () => {
    const limiter = make(3, 60_000);
    limiter.check("1.2.3.4");
    limiter.check("1.2.3.4");
    limiter.check("1.2.3.4");
    expect(limiter.check("1.2.3.4")).toBe(false);
  });

  it("tracks different IPs independently", () => {
    const limiter = make(2, 60_000);
    limiter.check("1.1.1.1");
    limiter.check("1.1.1.1");
    expect(limiter.check("2.2.2.2")).toBe(true);
    expect(limiter.check("1.1.1.1")).toBe(false);
  });

  it("resets after the window expires", async () => {
    const limiter = make(1, 50);
    limiter.check("1.2.3.4");
    expect(limiter.check("1.2.3.4")).toBe(false);
    await new Promise((r) => setTimeout(r, 60));
    expect(limiter.check("1.2.3.4")).toBe(true);
  });

  it("destroy stops the cleanup timer without throwing", () => {
    const limiter = make(5, 60_000);
    expect(() => limiter.destroy()).not.toThrow();
  });
});
