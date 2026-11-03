/**
 * WEB-001 — public contact intake Edge Function.
 *
 * Request chain (SOW 5.1), and nothing else is permitted:
 *
 *   Browser  ──POST──▶  this function  ──POST──▶  Windmill contact_intake
 *                                                      │
 *                                                      ▼
 *                                          Supabase PostgreSQL (service role)
 *
 * The browser never reaches Windmill or PostgreSQL. This function is
 * intentionally public (verify_jwt = false, see ../../config.toml) because
 * anonymous visitors must be able to submit. Public does not mean unguarded:
 * every request is validated server-side, a honeypot field is enforced, the
 * body size is capped, and the only credential that can write to the database
 * lives inside Windmill, not here and not in the browser.
 *
 * Secrets consumed (set with `supabase secrets set`, never committed):
 *   WINDMILL_WEBHOOK_URL   synchronous flow endpoint (run_wait_result)
 *   WINDMILL_TOKEN         scoped bearer token for that flow only
 *   ALLOWED_ORIGIN         exact published origin, e.g. https://user.github.io
 *   WINDMILL_TIMEOUT_MS    optional, default 20000
 *
 * CORS is set for the published origin so browsers behave predictably. It is a
 * browser convention, not an authentication mechanism, and nothing here relies
 * on it: a request from curl with a forged Origin is still fully validated.
 */

// ---------------------------------------------------------------------------
// Limits — authoritative copy. The browser copy in src/lib/validation.ts is a
// convenience only; these are the numbers that decide what is stored.
// ---------------------------------------------------------------------------
const LIMITS = {
  NAME_MIN: 2,
  NAME_MAX: 80,
  EMAIL_MAX: 254,
  MESSAGE_MIN: 10,
  MESSAGE_MAX: 1000,
  MAX_BODY_BYTES: 8192,
} as const

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[A-Za-z]{2,}$/

type FieldErrors = Record<string, string>

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? ''
const WINDMILL_WEBHOOK_URL = Deno.env.get('WINDMILL_WEBHOOK_URL') ?? ''
const WINDMILL_TOKEN = Deno.env.get('WINDMILL_TOKEN') ?? ''
const WINDMILL_TIMEOUT_MS = Number(Deno.env.get('WINDMILL_TIMEOUT_MS') ?? '20000')

function corsHeaders(_origin: string | null): Record<string, string> {
  // One fixed origin: the published GitHub Pages site. A page on any other
  // origin gets no CORS grant and its browser refuses to read the response.
  // This is a browser convention, not a gate — a request from curl with a
  // forged Origin header still reaches the validation below and is judged
  // purely on its contents.
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN || 'null',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

function json(
  body: unknown,
  status: number,
  origin: string | null,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...corsHeaders(origin),
    },
  })
}

/**
 * Log line with the submitted content removed. request_id is a random opaque
 * value and is safe to log; name, email and message never are (SOW 5.2).
 */
function log(event: string, fields: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ event, ts: new Date().toISOString(), ...fields }))
}

function validate(payload: Record<string, unknown>): FieldErrors {
  const errors: FieldErrors = {}

  const name = typeof payload.name === 'string' ? payload.name.trim() : ''
  const email = typeof payload.email === 'string' ? payload.email.trim() : ''
  const message = typeof payload.message === 'string' ? payload.message.trim() : ''

  if (name.length === 0) errors.name = 'Please enter your name.'
  else if (name.length < LIMITS.NAME_MIN)
    errors.name = `Name must be at least ${LIMITS.NAME_MIN} characters.`
  else if (name.length > LIMITS.NAME_MAX)
    errors.name = `Name must be ${LIMITS.NAME_MAX} characters or fewer.`

  if (email.length === 0) errors.email = 'Please enter your email address.'
  else if (email.length > LIMITS.EMAIL_MAX)
    errors.email = `Email must be ${LIMITS.EMAIL_MAX} characters or fewer.`
  else if (!EMAIL_RE.test(email))
    errors.email = 'Please enter a valid email address, for example name@example.com.'

  if (message.length === 0) errors.message = 'Please enter a message.'
  else if (message.length < LIMITS.MESSAGE_MIN)
    errors.message = `Message must be at least ${LIMITS.MESSAGE_MIN} characters.`
  else if (message.length > LIMITS.MESSAGE_MAX)
    errors.message = `Message must be ${LIMITS.MESSAGE_MAX} characters or fewer.`

  return errors
}

Deno.serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get('origin')

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405, origin)
  }

  // ---- Configuration guard -------------------------------------------------
  if (!WINDMILL_WEBHOOK_URL || !WINDMILL_TOKEN) {
    log('config_missing', {
      has_url: Boolean(WINDMILL_WEBHOOK_URL),
      has_token: Boolean(WINDMILL_TOKEN),
    })
    return json(
      { error: 'The intake service is not configured. Nothing has been saved.' },
      503,
      origin,
    )
  }

  // ---- Size cap, checked before parsing ------------------------------------
  const declared = Number(req.headers.get('content-length') ?? '0')
  if (declared > LIMITS.MAX_BODY_BYTES) {
    log('rejected_oversized', { declared_bytes: declared })
    return json(
      { error: 'That submission is too large. Please shorten your message.' },
      413,
      origin,
    )
  }

  const raw = await req.text()
  if (new TextEncoder().encode(raw).length > LIMITS.MAX_BODY_BYTES) {
    log('rejected_oversized_body')
    return json(
      { error: 'That submission is too large. Please shorten your message.' },
      413,
      origin,
    )
  }

  // ---- Parse ---------------------------------------------------------------
  let payload: Record<string, unknown>
  try {
    const parsed = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('not an object')
    }
    payload = parsed as Record<string, unknown>
  } catch {
    log('rejected_malformed_json')
    return json({ error: 'Malformed request.' }, 400, origin)
  }

  // ---- Honeypot ------------------------------------------------------------
  // The field is invisible to people. Anything in it is automated, so the
  // request is refused. The response is a plain validation failure that gives
  // the caller nothing to learn from.
  const website = typeof payload.website === 'string' ? payload.website.trim() : ''
  if (website.length > 0) {
    log('rejected_honeypot')
    return json({ error: 'Submission rejected.' }, 400, origin)
  }

  // ---- request_id ----------------------------------------------------------
  const requestId = payload.request_id
  if (typeof requestId !== 'string' || !UUID_RE.test(requestId)) {
    log('rejected_bad_request_id')
    return json(
      { error: 'Malformed request.', fields: { request_id: 'Invalid request identifier.' } },
      400,
      origin,
    )
  }

  // ---- Field validation ----------------------------------------------------
  const errors = validate(payload)
  if (Object.keys(errors).length > 0) {
    // No call to Windmill is made, so a rejected submission can create no row.
    log('rejected_validation', { request_id: requestId, fields: Object.keys(errors) })
    return json({ error: 'Please correct the highlighted fields.', fields: errors }, 400, origin)
  }

  const record = {
    request_id: requestId,
    name: String(payload.name).trim(),
    email: String(payload.email).trim(),
    message: String(payload.message).trim(),
  }

  // ---- Windmill (synchronous) ---------------------------------------------
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), WINDMILL_TIMEOUT_MS)

  let windmillResponse: Response
  try {
    log('windmill_call_start', { request_id: requestId })
    windmillResponse = await fetch(WINDMILL_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${WINDMILL_TOKEN}`,
      },
      body: JSON.stringify(record),
      signal: controller.signal,
    })
  } catch (error) {
    // Timeout or transport failure. We do not know whether the row was
    // written, so we must not report success. The caller retries with the
    // same request_id and the flow's duplicate guard keeps it at one row.
    log('windmill_unreachable', {
      request_id: requestId,
      reason: error instanceof Error ? error.name : 'unknown',
    })
    return json(
      {
        error:
          'We could not record your enquiry right now. Nothing has been saved. Please try again in a moment.',
      },
      502,
      origin,
    )
  } finally {
    clearTimeout(timer)
  }

  const windmillText = await windmillResponse.text()

  if (!windmillResponse.ok) {
    log('windmill_error_status', {
      request_id: requestId,
      status: windmillResponse.status,
    })
    return json(
      {
        error:
          'We could not record your enquiry right now. Nothing has been saved. Please try again in a moment.',
      },
      502,
      origin,
    )
  }

  // HTTP 200 alone proves nothing (SOW 5.1). The flow must say so explicitly.
  let result: { stored?: unknown; request_id?: unknown } | null = null
  try {
    result = JSON.parse(windmillText)
  } catch {
    result = null
  }

  const stored =
    result !== null &&
    typeof result === 'object' &&
    result.stored === true &&
    result.request_id === requestId

  if (!stored) {
    log('windmill_unconfirmed', {
      request_id: requestId,
      status: windmillResponse.status,
      // The flow returns no personal data, so its shape is safe to record.
      shape: result ? Object.keys(result as Record<string, unknown>).join(',') : 'unparseable',
    })
    return json(
      {
        error:
          'We could not confirm your enquiry was recorded. Nothing has been saved. Please try again in a moment.',
      },
      502,
      origin,
    )
  }

  log('stored', { request_id: requestId })
  return json({ request_id: requestId, status: 'received' }, 200, origin)
})
