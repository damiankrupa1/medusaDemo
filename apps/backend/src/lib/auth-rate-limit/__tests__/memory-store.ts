import type { RateLimitStore } from "../limiter"

/**
 * In-memory RateLimitStore with an injected clock, mirroring the Lua scripts
 * of ../redis-store.ts (the scripts themselves run against a real Redis in
 * integration-tests/http/auth-rate-limit.spec.ts). Every call yields to the
 * event loop first, so concurrent calls interleave like requests do.
 */
export class MemoryRateLimitStore implements RateLimitStore {
  readonly entries = new Map<string, { count: number; expiresAt: number }>()
  calls = 0
  failWith: Error | null = null

  constructor(private readonly now: () => number) {}

  private live(key: string) {
    const entry = this.entries.get(key)

    if (entry && entry.expiresAt <= this.now()) {
      this.entries.delete(key)
      return undefined
    }

    return entry
  }

  private async tick() {
    this.calls++
    await new Promise((resolve) => setImmediate(resolve))

    if (this.failWith) {
      throw this.failWith
    }
  }

  async consume(key: string, limit: number, windowMs: number) {
    await this.tick()
    let entry = this.live(key)

    if (entry && entry.count >= limit) {
      return { allowed: false, count: entry.count, ttlMs: entry.expiresAt - this.now() }
    }

    if (!entry) {
      entry = { count: 0, expiresAt: this.now() + windowMs }
      this.entries.set(key, entry)
    }

    entry.count++

    return { allowed: true, count: entry.count, ttlMs: entry.expiresAt - this.now() }
  }

  async release(key: string) {
    await this.tick()
    const entry = this.live(key)

    if (!entry) {
      return
    }

    entry.count--

    if (entry.count <= 0) {
      this.entries.delete(key)
    }
  }

  async reset(key: string) {
    await this.tick()
    this.entries.delete(key)
  }
}
