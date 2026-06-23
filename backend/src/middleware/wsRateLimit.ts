interface RateEntry {
  count: number;
  resetAt: number;
}

export class WsRateLimiter {
  private readonly max: number;
  private readonly windowMs: number;
  private readonly store = new Map<string, RateEntry>();

  constructor(opts: { max: number; windowMs: number }) {
    this.max = opts.max;
    this.windowMs = opts.windowMs;
  }

  check(ip: string): boolean {
    const now = Date.now();
    const entry = this.store.get(ip);
    if (!entry || now >= entry.resetAt) {
      this.store.delete(ip);
      this.store.set(ip, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    if (entry.count >= this.max) return false;
    entry.count++;
    return true;
  }
}
