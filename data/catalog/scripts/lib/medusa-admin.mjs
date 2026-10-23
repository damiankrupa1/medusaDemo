// Minimal Medusa 2.x Admin API client for the catalog scripts.
//
// Configuration comes only from the environment, never from files:
//   MEDUSA_BACKEND_URL      e.g. http://localhost:9000
//   MEDUSA_ADMIN_EMAIL      \ admin user (emailpass), or
//   MEDUSA_ADMIN_PASSWORD   /
//   MEDUSA_ADMIN_API_KEY    a secret API key (sk_...), used instead of email/password
//
// Safety: any backend that isn't on localhost requires `--confirm-host <host>`
// on the command line with the exact host name, so a script can't hit a
// remote (e.g. production Railway) backend by accident.

import { fetchWithRetry } from './http.mjs'

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

export const isLocalBackend = (base) => LOCAL_HOSTS.has(new URL(base).hostname)

export function resolveBackend(argv = process.argv.slice(2)) {
  const raw = process.env.MEDUSA_BACKEND_URL
  if (!raw) {
    throw new Error('MEDUSA_BACKEND_URL is not set (e.g. http://localhost:9000)')
  }
  const url = new URL(raw)
  const i = argv.indexOf('--confirm-host')
  const confirmed = i >= 0 ? argv[i + 1] : undefined
  if (!LOCAL_HOSTS.has(url.hostname) && confirmed !== url.hostname) {
    throw new Error(
      `Refusing to talk to remote backend "${url.hostname}". Re-run with --confirm-host ${url.hostname} once you are sure this is the intended environment.`,
    )
  }
  return url.origin
}

export async function createAdminClient(argv) {
  const base = resolveBackend(argv)
  let authHeader
  if (process.env.MEDUSA_ADMIN_API_KEY) {
    authHeader = `Basic ${Buffer.from(`${process.env.MEDUSA_ADMIN_API_KEY}:`).toString('base64')}`
  } else {
    const email = process.env.MEDUSA_ADMIN_EMAIL
    const password = process.env.MEDUSA_ADMIN_PASSWORD
    if (!email || !password) {
      throw new Error('Set MEDUSA_ADMIN_API_KEY, or MEDUSA_ADMIN_EMAIL and MEDUSA_ADMIN_PASSWORD')
    }
    const res = await fetchWithRetry(`${base}/auth/user/emailpass`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }, { retries: 2, label: 'admin login' })
    const body = await res.json().catch(() => ({}))
    if (!res.ok || !body.token) {
      throw new Error(`Admin login failed (HTTP ${res.status})`)
    }
    authHeader = `Bearer ${body.token}`
  }

  async function request(method, path, { query, body, form, headers, retries = 3 } = {}) {
    const url = new URL(path, base)
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value === undefined) continue
      if (Array.isArray(value)) value.forEach((v) => url.searchParams.append(`${key}[]`, v))
      else url.searchParams.set(key, String(value))
    }
    const init = { method, headers: { authorization: authHeader, ...headers }, timeoutMs: 180_000 }
    if (form) {
      init.body = form
    } else if (body !== undefined) {
      init.headers['content-type'] = 'application/json'
      init.body = JSON.stringify(body)
    }
    const res = await fetchWithRetry(url, init, { retries, label: `${method} ${url.pathname}` })
    const text = await res.text()
    let json
    try {
      json = text ? JSON.parse(text) : {}
    } catch {
      json = { raw: text.slice(0, 300) }
    }
    if (!res.ok) {
      const error = new Error(`${method} ${url.pathname}: HTTP ${res.status} ${json.message ?? json.raw ?? ''}`.trim())
      error.status = res.status
      error.body = json
      throw error
    }
    return json
  }

  /** Fetches every page of a list endpoint. */
  async function listAll(path, key, query = {}) {
    const out = []
    for (let offset = 0; ; offset += 200) {
      const page = await request('GET', path, { query: { ...query, limit: 200, offset } })
      out.push(...page[key])
      if (out.length >= (page.count ?? 0) || page[key].length === 0) return out
    }
  }

  return {
    base,
    request,
    listAll,
    get: (path, query) => request('GET', path, { query }),
    post: (path, body) => request('POST', path, { body }),
  }
}
