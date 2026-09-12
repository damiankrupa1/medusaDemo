import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import Redis from "ioredis"

type SqlConnection = {
  raw: (sql: string) => Promise<unknown>
}

type CheckStatus = "ok" | "error" | "skipped"

/**
 * Deep readiness check for Railway (or any orchestrator) to gate traffic on.
 * Medusa's built-in `/health` only proves the Node process is running - it
 * never touches Postgres or Redis, so a backend with a dead DB/Redis
 * connection would still report healthy. This route actually exercises both.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const checks: Record<string, CheckStatus> = {}
  let healthy = true

  try {
    const knex = req.scope.resolve<SqlConnection>(
      ContainerRegistrationKeys.PG_CONNECTION
    )
    await knex.raw("select 1")
    checks.database = "ok"
  } catch {
    checks.database = "error"
    healthy = false
  }

  if (process.env.REDIS_URL) {
    const redis = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
    })

    try {
      await redis.connect()
      await redis.ping()
      checks.redis = "ok"
    } catch {
      checks.redis = "error"
      healthy = false
    } finally {
      redis.disconnect()
    }
  } else {
    checks.redis = "skipped"
  }

  res
    .status(healthy ? 200 : 503)
    .json({ status: healthy ? "ok" : "error", checks })
}
