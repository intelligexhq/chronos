/**
 * Demo-stack seeder. Reads JSON files from ./seed/ and POSTs them into a
 * running Chronos so an evaluator sees a working setup on first `docker
 * compose up`. Runs once and exits.
 *
 * Idempotency: a slug or name collision on Chronos's REST surface is
 * treated as "already seeded" and the seeder continues. The seeder never
 * deletes or rewrites existing records — manual edits in the UI survive
 * subsequent seeder runs.
 *
 * Inputs (from compose env):
 *   CHRONOS_BASE_URL          — e.g. http://chronos:3000
 *   CHRONOS_USER_EMAIL        — must match CHRONOS_INITIAL_USER on Chronos
 *   CHRONOS_USER_PASSWORD     — same
 *   OPENROUTER_API_KEY        — substituted into credentials.json plainDataFromEnv slots
 *   OPENROUTER_LLM_MODEL      — informational only; the seeder does not consume it directly
 *                               but it surfaces in the demo flow once one is wired
 *
 * Exit codes:
 *   0  every seed file processed (creates + idempotent skips)
 *   1  unrecoverable error (no Chronos, bad auth, malformed JSON)
 */
import { readFile } from 'fs/promises'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const CHRONOS_BASE_URL = process.env.CHRONOS_BASE_URL ?? 'http://chronos:3000'
const CHRONOS_USER_EMAIL = process.env.CHRONOS_USER_EMAIL ?? 'admin@admin.com'
const CHRONOS_USER_PASSWORD = process.env.CHRONOS_USER_PASSWORD ?? 'test1234'

const HERE = dirname(fileURLToPath(import.meta.url))
const SEED_DIR = resolve(HERE, '..', 'seed')

const log = (msg: string) => console.log(`[seeder] ${msg}`)
const warn = (msg: string) => console.warn(`[seeder] ${msg}`)
const err = (msg: string) => console.error(`[seeder] ${msg}`)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ─────────────────────── chronos helpers ───────────────────────

const waitForChronos = async (maxAttempts = 60): Promise<void> => {
    log(`waiting for chronos at ${CHRONOS_BASE_URL} ...`)
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const r = await fetch(`${CHRONOS_BASE_URL}/api/v1/ping`)
            if (r.ok) {
                log(`chronos is up`)
                return
            }
        } catch {
            /* not yet */
        }
        await sleep(2000)
    }
    throw new Error(`chronos at ${CHRONOS_BASE_URL} did not come up within ${maxAttempts * 2}s`)
}

const login = async (): Promise<string> => {
    log(`logging in as ${CHRONOS_USER_EMAIL}`)
    const resp = await fetch(`${CHRONOS_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: CHRONOS_USER_EMAIL, password: CHRONOS_USER_PASSWORD })
    })
    if (!resp.ok) {
        throw new Error(`login failed: ${resp.status} ${await resp.text()}`)
    }
    const body = (await resp.json()) as { token?: string }
    if (!body?.token) {
        throw new Error(`login response missing token: ${JSON.stringify(body)}`)
    }
    return body.token
}

const authedJson = async (token: string, path: string, init: RequestInit = {}): Promise<Response> => {
    const headers = new Headers(init.headers ?? {})
    headers.set('Authorization', `Bearer ${token}`)
    // Mirrors the smoke runner: the platform routes /api/v1/* through JWT
    // verification only when the request advertises itself as coming from the
    // UI. External requests need an API key — this header lets us reuse the
    // UI auth path.
    headers.set('x-request-from', 'internal')
    if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json')
    return fetch(`${CHRONOS_BASE_URL}${path}`, { ...init, headers })
}

// ─────────────────────── seed file loading ───────────────────────

const loadJsonArray = async <T>(filename: string): Promise<T[]> => {
    const path = resolve(SEED_DIR, filename)
    try {
        const raw = await readFile(path, 'utf-8')
        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed)) {
            throw new Error(`${filename} must contain a JSON array`)
        }
        return parsed as T[]
    } catch (e: unknown) {
        const code = (e as NodeJS.ErrnoException)?.code
        if (code === 'ENOENT') {
            warn(`${filename} not found — skipping`)
            return []
        }
        throw e
    }
}

// ─────────────────────── seeder primitives ───────────────────────

interface SeedResult {
    created: number
    skipped: number
}

const conflictBody = (text: string): boolean => {
    // Chronos returns various 400/409-style bodies on duplicate slug/name —
    // match generously so we don't depend on a specific error message.
    const lower = text.toLowerCase()
    return lower.includes('already exists') || lower.includes('duplicate') || lower.includes('unique constraint')
}

/**
 * Returns a non-sensitive fingerprint for a secret value so seeder logs can
 * confirm what was read from env without leaking the value itself. Format:
 * `len=N first=ABC last=XYZ`.
 */
const fingerprint = (value: string): string => {
    if (value.length === 0) return 'len=0 (empty)'
    const first = value.slice(0, Math.min(3, value.length))
    const last = value.length > 6 ? value.slice(-3) : ''
    return `len=${value.length} first=${first}${last ? ` last=${last}` : ''}`
}

const seedCredentials = async (token: string): Promise<SeedResult> => {
    interface CredentialSeed {
        name: string
        credentialName: string
        plainDataFromEnv?: Record<string, string>
        plainDataObj?: Record<string, unknown>
    }
    const seeds = await loadJsonArray<CredentialSeed>('credentials.json')
    if (seeds.length === 0) return { created: 0, skipped: 0 }
    log(`processing ${seeds.length} credential(s)`)

    // Pull existing credential names once so we can skip without a POST and
    // its dependent error-body parsing.
    const existingResp = await authedJson(token, '/api/v1/credentials', { method: 'GET' })
    const existingNames = new Set<string>()
    if (existingResp.ok) {
        const body = (await existingResp.json()) as Array<{ name: string }> | { data?: Array<{ name: string }> }
        const list = Array.isArray(body) ? body : body.data ?? []
        for (const c of list) existingNames.add(c.name)
    }

    let created = 0
    let skipped = 0
    for (const seed of seeds) {
        if (existingNames.has(seed.name)) {
            log(`  skip credential "${seed.name}" (already exists)`)
            skipped++
            continue
        }
        const plainDataObj: Record<string, unknown> = { ...(seed.plainDataObj ?? {}) }
        let missingEnv = false
        for (const [field, envName] of Object.entries(seed.plainDataFromEnv ?? {})) {
            const raw = process.env[envName]
            if (!raw) {
                warn(`  skip credential "${seed.name}" — env ${envName} is not set`)
                missingEnv = true
                break
            }
            // Strip whitespace + surrounding quotes — a paste into a shell with
            // quoted values (export X='"sk-..."') leaves literal quotes in the
            // string that would otherwise be stored encrypted as-is and reject
            // at the API call site.
            const trimmed = raw.trim().replace(/^["']|["']$/g, '')
            log(`  credential "${seed.name}" field=${field} env=${envName} ${fingerprint(trimmed)}`)
            plainDataObj[field] = trimmed
        }
        if (missingEnv) {
            skipped++
            continue
        }
        const resp = await authedJson(token, '/api/v1/credentials', {
            method: 'POST',
            body: JSON.stringify({ name: seed.name, credentialName: seed.credentialName, plainDataObj })
        })
        if (resp.ok) {
            log(`  + credential "${seed.name}"`)
            created++
        } else {
            const text = await resp.text()
            if (resp.status === 409 || conflictBody(text)) {
                log(`  skip credential "${seed.name}" (conflict)`)
                skipped++
            } else {
                throw new Error(`credential "${seed.name}" POST failed: ${resp.status} ${text}`)
            }
        }
    }
    return { created, skipped }
}

const seedMCPServers = async (token: string): Promise<SeedResult> => {
    interface MCPServerSeed {
        name: string
        slug: string
        transport: string
        [k: string]: unknown
    }
    const seeds = await loadJsonArray<MCPServerSeed>('mcp-servers.json')
    if (seeds.length === 0) return { created: 0, skipped: 0 }
    log(`processing ${seeds.length} MCP server(s)`)

    const existingResp = await authedJson(token, '/api/v1/mcp-servers', { method: 'GET' })
    const existingSlugs = new Set<string>()
    if (existingResp.ok) {
        const body = (await existingResp.json()) as Array<{ slug: string }> | { data?: Array<{ slug: string }> }
        const list = Array.isArray(body) ? body : body.data ?? []
        for (const s of list) existingSlugs.add(s.slug)
    }

    let created = 0
    let skipped = 0
    for (const seed of seeds) {
        if (existingSlugs.has(seed.slug)) {
            log(`  skip MCP server "${seed.slug}" (already exists)`)
            skipped++
            continue
        }
        const resp = await authedJson(token, '/api/v1/mcp-servers', {
            method: 'POST',
            body: JSON.stringify(seed)
        })
        if (resp.ok) {
            log(`  + MCP server "${seed.slug}"`)
            created++
        } else {
            const text = await resp.text()
            if (resp.status === 409 || conflictBody(text)) {
                log(`  skip MCP server "${seed.slug}" (conflict)`)
                skipped++
            } else {
                throw new Error(`MCP server "${seed.slug}" POST failed: ${resp.status} ${text}`)
            }
        }
    }
    return { created, skipped }
}

/**
 * Resolves `${credential:NAME}` and `${mcp:SLUG}` placeholders in a JSON
 * string by looking up the corresponding UUIDs from a freshly-seeded
 * Chronos. Placeholders are matched anywhere in the string (inside JSON
 * field values) so a canvas-exported flowData that referenced credential
 * `<old-uuid>` survives a `down --volumes` once its UUID has been swapped
 * for `${credential:demo-openrouter}`.
 *
 * Returns the substituted string and throws if any placeholder cannot be
 * resolved — silent fall-through would leave the placeholder text inside
 * stored flowData and surface as a runtime failure much later.
 */
const PLACEHOLDER_RE = /\$\{(credential|mcp):([^}]+)\}/g

const substitutePlaceholders = async (token: string, raw: string): Promise<string> => {
    if (!PLACEHOLDER_RE.test(raw)) return raw

    // Pull current credentials + MCP servers once so the substitution does not
    // hammer the API for each placeholder match.
    const credLookup = new Map<string, string>()
    {
        const resp = await authedJson(token, '/api/v1/credentials', { method: 'GET' })
        if (resp.ok) {
            const body = (await resp.json()) as Array<{ id: string; name: string }> | { data?: Array<{ id: string; name: string }> }
            const list = Array.isArray(body) ? body : body.data ?? []
            for (const c of list) credLookup.set(c.name, c.id)
        }
    }
    const mcpLookup = new Map<string, string>()
    {
        const resp = await authedJson(token, '/api/v1/mcp-servers', { method: 'GET' })
        if (resp.ok) {
            const body = (await resp.json()) as Array<{ id: string; slug: string }> | { data?: Array<{ id: string; slug: string }> }
            const list = Array.isArray(body) ? body : body.data ?? []
            for (const s of list) mcpLookup.set(s.slug, s.id)
        }
    }

    const missing: string[] = []
    const substituted = raw.replace(PLACEHOLDER_RE, (_match, kind: string, key: string) => {
        const table = kind === 'credential' ? credLookup : mcpLookup
        const value = table.get(key)
        if (!value) {
            missing.push(`${kind}:${key}`)
            return _match
        }
        log(`  resolved ${kind}:${key} → ${value}`)
        return value
    })
    if (missing.length > 0) {
        throw new Error(
            `agentflow placeholders did not resolve: ${missing.join(', ')}. ` +
                `Check that the referenced credential names + MCP server slugs were seeded earlier in this run.`
        )
    }
    return substituted
}

const seedAgentflows = async (token: string): Promise<SeedResult> => {
    interface AgentflowSeed {
        name: string
        type?: string
        flowData?: unknown
        [k: string]: unknown
    }
    const seeds = await loadJsonArray<AgentflowSeed>('agentflows.json')
    if (seeds.length === 0) return { created: 0, skipped: 0 }
    log(`processing ${seeds.length} agentflow(s)`)

    const existingResp = await authedJson(token, '/api/v1/agentflows', { method: 'GET' })
    const existingNames = new Set<string>()
    if (existingResp.ok) {
        const body = (await existingResp.json()) as Array<{ name: string }> | { data?: Array<{ name: string }> }
        const list = Array.isArray(body) ? body : body.data ?? []
        for (const f of list) existingNames.add(f.name)
    }

    let created = 0
    let skipped = 0
    for (const seed of seeds) {
        if (existingNames.has(seed.name)) {
            log(`  skip agentflow "${seed.name}" (already exists)`)
            skipped++
            continue
        }
        // The export shape carries flowData as an object; the POST endpoint
        // expects it stringified (matches the UI's save path). Placeholder
        // substitution runs against the stringified body so JSON field values
        // like `"credential": "${credential:demo-openrouter}"` get rewritten.
        const payload = { ...seed, type: seed.type ?? 'AGENTFLOW' } as Record<string, unknown>
        const flowDataString =
            typeof payload.flowData === 'object' && payload.flowData !== null
                ? JSON.stringify(payload.flowData)
                : typeof payload.flowData === 'string'
                  ? payload.flowData
                  : ''
        payload.flowData = await substitutePlaceholders(token, flowDataString)
        const resp = await authedJson(token, '/api/v1/agentflows', {
            method: 'POST',
            body: JSON.stringify(payload)
        })
        if (resp.ok) {
            log(`  + agentflow "${seed.name}"`)
            created++
        } else {
            const text = await resp.text()
            if (resp.status === 409 || conflictBody(text)) {
                log(`  skip agentflow "${seed.name}" (conflict)`)
                skipped++
            } else {
                throw new Error(`agentflow "${seed.name}" POST failed: ${resp.status} ${text}`)
            }
        }
    }
    return { created, skipped }
}

// ─────────────────────────── main ───────────────────────────

const main = async (): Promise<void> => {
    await waitForChronos()
    const token = await login()

    // Credentials first so MCP-server / agentflow seeds can reference them
    // by name (next slice — current seeds don't yet wire credentials into
    // MCP servers because none of the demo presets are credentialed).
    const cred = await seedCredentials(token)
    log(`credentials: +${cred.created} created, ${cred.skipped} skipped`)

    const mcp = await seedMCPServers(token)
    log(`mcp servers: +${mcp.created} created, ${mcp.skipped} skipped`)

    const flow = await seedAgentflows(token)
    log(`agentflows: +${flow.created} created, ${flow.skipped} skipped`)

    log('done')
}

main().catch((e) => {
    err(`fatal: ${(e as Error).message ?? e}`)
    process.exit(1)
})
