/// <reference types="jest" />

import {
  CONSUME_SCRIPT,
  RELEASE_SCRIPT,
  RESET_SCRIPT,
  RedisRateLimitStore,
  type RedisScriptClient,
} from "../redis-store"

const fakeClient = (reply: unknown, status = "ready") => {
  const client = {
    status,
    eval: jest.fn<Promise<unknown>, [string, number, ...(string | number)[]]>(
      async () => reply
    ),
  }

  return client satisfies RedisScriptClient
}

describe("RedisRateLimitStore", () => {
  it("runs the consume script on one key with the limit and the window", async () => {
    const client = fakeClient([1, 3, 899_000])
    const store = new RedisRateLimitStore(client)

    await expect(store.consume("k", 10, 900_000)).resolves.toEqual({
      allowed: true,
      count: 3,
      ttlMs: 899_000,
    })
    expect(client.eval).toHaveBeenCalledWith(CONSUME_SCRIPT, 1, "k", 10, 900_000)
  })

  it("reads a blocked reply", async () => {
    const store = new RedisRateLimitStore(fakeClient([0, 10, 12_345]))

    await expect(store.consume("k", 10, 900_000)).resolves.toEqual({
      allowed: false,
      count: 10,
      ttlMs: 12_345,
    })
  })

  it("rejects an unexpected reply", async () => {
    const store = new RedisRateLimitStore(fakeClient("OK"))

    await expect(store.consume("k", 10, 900_000)).rejects.toThrow(/Unexpected reply/)
  })

  it("runs the release and reset scripts", async () => {
    const client = fakeClient(0)
    const store = new RedisRateLimitStore(client)

    await store.release("k")
    await store.reset("k")

    expect(client.eval).toHaveBeenNthCalledWith(1, RELEASE_SCRIPT, 1, "k")
    expect(client.eval).toHaveBeenNthCalledWith(2, RESET_SCRIPT, 1, "k")
  })

  it.each(["reconnecting", "close", "end"])(
    "fails at once while the connection is %p",
    async (status) => {
      const client = fakeClient([1, 1, 1], status)
      const store = new RedisRateLimitStore(client)

      await expect(store.consume("k", 10, 900_000)).rejects.toThrow(status)
      expect(client.eval).not.toHaveBeenCalled()
    }
  )

  it.each(["wait", "connecting", "connect", "ready"])(
    "sends the command while the connection is %p",
    async (status) => {
      const client = fakeClient([1, 1, 1], status)

      await new RedisRateLimitStore(client).consume("k", 10, 900_000)
      expect(client.eval).toHaveBeenCalled()
    }
  )

  it("keeps the window on the first attempt and on a key without expiry", () => {
    // The script, not the client, guarantees that no key lives forever.
    expect(CONSUME_SCRIPT).toMatch(/if ttl < 0 then\s+redis.call\('PEXPIRE'/)
    expect(RELEASE_SCRIPT).toMatch(/DECR/)
    expect(RELEASE_SCRIPT).not.toMatch(/EXPIRE/)
  })
})
