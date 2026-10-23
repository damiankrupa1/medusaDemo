// Small HTTP helpers shared by the catalog scripts: retries with backoff,
// Retry-After support and a concurrency limiter. Node 22 global fetch only.

// Wikimedia's User-Agent policy (https://w.wiki/4wJS) requires contact
// information; requests without it are answered with HTTP 429.
export const USER_AGENT =
  'medusaDemo-catalog-builder/1.0 (https://github.com/damiankrupa1/medusaDemo; demo store catalog, low request rate) node-fetch/22'

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const RETRYABLE = new Set([408, 425, 429, 500, 502, 503, 504])

/**
 * fetch() with retries on network errors and retryable statuses. Honors
 * Retry-After (seconds) and otherwise backs off exponentially.
 */
export async function fetchWithRetry(url, init = {}, { retries = 5, baseDelayMs = 1500, label = url } = {}) {
  let lastError
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        headers: { 'user-agent': USER_AGENT, ...(init.headers || {}) },
        signal: AbortSignal.timeout(init.timeoutMs ?? 60_000),
      })
      if (!RETRYABLE.has(res.status) || attempt === retries) {
        return res
      }
      const retryAfter = Number(res.headers.get('retry-after'))
      const delay = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : baseDelayMs * 2 ** attempt
      await res.body?.cancel()
      console.warn(`  ${label}: HTTP ${res.status}, retry ${attempt + 1}/${retries} in ${Math.round(delay / 1000)}s`)
      await sleep(delay)
    } catch (error) {
      lastError = error
      if (attempt === retries) break
      const delay = baseDelayMs * 2 ** attempt
      console.warn(`  ${label}: ${error.message}, retry ${attempt + 1}/${retries} in ${Math.round(delay / 1000)}s`)
      await sleep(delay)
    }
  }
  throw lastError ?? new Error(`${label}: request failed`)
}

export async function fetchJson(url, init, options) {
  const res = await fetchWithRetry(url, init, options)
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`${options?.label ?? url}: HTTP ${res.status} ${text.slice(0, 200)}`)
  }
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`${options?.label ?? url}: expected JSON, got ${text.slice(0, 120)}`)
  }
}

/**
 * Runs `worker` over `items` with at most `concurrency` calls in flight.
 * Errors are collected per item instead of aborting the whole run.
 */
export async function mapLimit(items, concurrency, worker, { onProgress } = {}) {
  const results = new Array(items.length)
  let next = 0
  let done = 0
  async function run() {
    while (next < items.length) {
      const index = next++
      try {
        results[index] = { ok: true, value: await worker(items[index], index) }
      } catch (error) {
        results[index] = { ok: false, error }
      }
      done++
      onProgress?.(done, items.length)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run))
  return results
}
