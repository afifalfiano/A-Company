interface RateEntry {
  count: number;
  resetAt: number;
}

export class WsRateLimiter {
  private readonly max: number;
  private readonly windowMs: number;
  private readonly store = new Map<string, RateEntry>();
  private readonly cleanupTimer: ReturnType<typeof setInterval>;

  constructor(opts: { max: number; windowMs: number }) {
    this.max = opts.max;
    this.windowMs = opts.windowMs;
    // Purge expired entries every window to prevent unbounded Map growth
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [ip, entry] of this.store) {
        if (now >= entry.resetAt) this.store.delete(ip);
      }
    }, this.windowMs);
    this.cleanupTimer.unref(); // don't keep process alive just for cleanup
  }

  check(ip: string): boolean {
    const now = Date.now();
    const entry = this.store.get(ip);
    if (!entry || now >= entry.resetAt) {
      this.store.set(ip, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    if (entry.count >= this.max) return false;
    entry.count++;
    return true;
  }

  destroy(): void {
    clearInterval(this.cleanupTimer);
  }
}
