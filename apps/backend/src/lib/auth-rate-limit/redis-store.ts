import type { RateLimitStore } from "./limiter"

/** The part of an ioredis client the store uses. */
export interface RedisScriptClient {
  /** ioredis connection status ("ready", "reconnecting", "end", ...). */
  readonly status?: string
  eval(
    script: string,
    numKeys: number,
    ...args: (string | number)[]
  ): Promise<unknown>
}

/**
 * KEYS[1] = counter, ARGV[1] = limit, ARGV[2] = window in ms.
 * Returns { allowed (1/0), count, ttl in ms }. A counter that somehow has no
 * expiry gets the window again, so a key can never block forever.
 */
export const CONSUME_SCRIPT = `
local current = tonumber(redis.call('GET', KEYS[1]) or '0')
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local allowed = 0
if current < limit then
  current = redis.call('INCR', KEYS[1])
  allowed = 1
end
local ttl = redis.call('PTTL', KEYS[1])
if ttl < 0 then
  redis.call('PEXPIRE', KEYS[1], window)
  ttl = window
end
return { allowed, current, ttl }
`

/** KEYS[1] = counter. Decrements, never below zero, keeping the expiry. */
export const RELEASE_SCRIPT = `
local current = tonumber(redis.call('GET', KEYS[1]) or '0')
if current > 1 then
  return redis.call('DECR', KEYS[1])
end
if current == 1 then
  redis.call('DEL', KEYS[1])
end
return 0
`

/** KEYS[1] = counter. */
export const RESET_SCRIPT = `return redis.call('DEL', KEYS[1])`

/**
 * Statuses in which a command would only wait in ioredis' offline queue until
 * its timeout; failing at once keeps logins fast during an outage.
 */
const UNAVAILABLE_STATUSES = new Set(["reconnecting", "close", "end"])

export class RedisRateLimitStore implements RateLimitStore {
  constructor(private readonly client: RedisScriptClient) {}

  async consume(key: string, limit: number, windowMs: number) {
    const result = await this.run(CONSUME_SCRIPT, key, limit, windowMs)

    if (!Array.isArray(result) || result.length !== 3) {
      throw new Error("Unexpected reply from the rate limit script")
    }

    const [allowed, count, ttlMs] = result.map(Number)

    return { allowed: allowed === 1, count, ttlMs }
  }

  async release(key: string) {
    await this.run(RELEASE_SCRIPT, key)
  }

  async reset(key: string) {
    await this.run(RESET_SCRIPT, key)
  }

  private run(script: string, key: string, ...args: number[]) {
    const status = this.client.status

    if (status && UNAVAILABLE_STATUSES.has(status)) {
      return Promise.reject(new Error(`Redis is unavailable (status: ${status})`))
    }

    return this.client.eval(script, 1, key, ...args)
  }
}
