/**
 * Windmill flow step — contact_intake / store_submission
 *
 * The single step of the synchronous `contact_intake` flow (SOW 5.2).
 * Triggered ONLY by the Supabase Edge Function, which authenticates with a
 * scoped bearer token. Nothing else may call it.
 *
 * Responsibilities:
 *   1. Write exactly one row to public.contact_submissions using a server-side
 *      Supabase credential (service_role, which bypasses RLS).
 *   2. On a repeated request_id, return the existing row and add no new row.
 *   3. Return an explicit { stored: true, request_id } so the Edge Function can
 *      confirm storage rather than inferring it from an HTTP 200.
 *
 * The credential is read from a Windmill resource at run time. It is never
 * committed, never logged, and never reaches the browser.
 *
 * This file is the readable source of truth. The deployable export is
 * contact_intake.flow.json in the same folder; if you edit this file, update
 * the embedded copy there too (scripts/sync-windmill-flow.mjs does it for you).
 */
import * as wmill from 'windmill-client'

// Paths to look for the Windmill resource holding the Supabase admin
// credential, tried in order. Windmill puts things under f/<folder>/ or
// u/<user>/ depending on how they were created, and which one you get is a
// detail of the UI rather than a decision anyone makes, so both are accepted.
// Add your own path to the front of this list if it differs.
const RESOURCE_PATHS = [
  'f/web001/supabase_admin',
  'u/mili/supabase_admin',
  'f/web001/supabase',
  'u/mili/supabase',
]

const TABLE = 'contact_submissions'

type SupabaseAdminResource = {
  url?: string
  key?: string
  service_role_key?: string
  serviceRoleKey?: string
}

type StoredRow = {
  request_id: string
  created_at: string
}

export async function main(
  request_id: string,
  name: string,
  email: string,
  message: string,
): Promise<{
  stored: true
  request_id: string
  duplicate: boolean
  created_at: string
}> {
  // ---- Credential ----------------------------------------------------------
  let resource: SupabaseAdminResource | undefined
  let resourcePath = ''
  for (const candidate of RESOURCE_PATHS) {
    try {
      const found = (await wmill.getResource(candidate)) as SupabaseAdminResource
      if (found && (found.url || found.key)) {
        resource = found
        resourcePath = candidate
        break
      }
    } catch {
      // Not at this path. Try the next one.
    }
  }

  const baseUrl = (resource?.url ?? '').replace(/\/+$/, '')
  const serviceKey =
    resource?.service_role_key ?? resource?.serviceRoleKey ?? resource?.key ?? ''

  if (!baseUrl || !serviceKey) {
    // Thrown, not returned. A thrown error fails the Windmill job, the Edge
    // Function sees a non-success result, and the visitor is told truthfully
    // that nothing was saved. The message names the paths tried, because a
    // misplaced resource is the likeliest reason to land here.
    throw new Error(
      resourcePath
        ? `Supabase resource at ${resourcePath} is missing its url or key.`
        : `No Supabase resource found. Looked in: ${RESOURCE_PATHS.join(', ')}. ` +
          `Add your resource's path to RESOURCE_PATHS at the top of this script.`,
    )
  }

  // ---- Re-validate ---------------------------------------------------------
  // The Edge Function already validated. This flow is reachable only by that
  // function, but it refuses to be the component that trusts its caller.
  const trimmedName = String(name ?? '').trim()
  const trimmedEmail = String(email ?? '').trim()
  const trimmedMessage = String(message ?? '').trim()
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

  if (!uuidRe.test(String(request_id ?? ''))) {
    throw new Error('Invalid request_id.')
  }
  if (trimmedName.length < 2 || trimmedName.length > 80) {
    throw new Error('Invalid name length.')
  }
  if (trimmedEmail.length < 3 || trimmedEmail.length > 254) {
    throw new Error('Invalid email length.')
  }
  if (trimmedMessage.length < 10 || trimmedMessage.length > 1000) {
    throw new Error('Invalid message length.')
  }

  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  }

  // ---- Insert, ignoring an existing request_id -----------------------------
  // resolution=ignore-duplicates means a repeat of the same request_id is a
  // no-op at the database: no second row, no error. The response is an empty
  // array in that case, which is how we detect the duplicate.
  const insertResponse = await fetch(
    `${baseUrl}/rest/v1/${TABLE}?on_conflict=request_id`,
    {
      method: 'POST',
      headers: {
        ...headers,
        Prefer: 'resolution=ignore-duplicates,return=representation',
      },
      body: JSON.stringify({
        request_id,
        name: trimmedName,
        email: trimmedEmail,
        message: trimmedMessage,
      }),
    },
  )

  if (!insertResponse.ok) {
    const detail = await insertResponse.text()
    // Log the status and PostgREST error code only. The submitted fields are
    // never written to the job log (SOW 5.2 redaction).
    throw new Error(
      `Supabase insert failed with ${insertResponse.status}: ${summarise(detail)}`,
    )
  }

  const inserted = (await insertResponse.json()) as StoredRow[]

  if (Array.isArray(inserted) && inserted.length === 1) {
    return {
      stored: true,
      request_id: inserted[0].request_id,
      duplicate: false,
      created_at: inserted[0].created_at,
    }
  }

  // ---- Duplicate: return the existing row, add nothing ---------------------
  const existingResponse = await fetch(
    `${baseUrl}/rest/v1/${TABLE}?request_id=eq.${encodeURIComponent(request_id)}&select=request_id,created_at`,
    { method: 'GET', headers },
  )

  if (!existingResponse.ok) {
    const detail = await existingResponse.text()
    throw new Error(
      `Supabase lookup failed with ${existingResponse.status}: ${summarise(detail)}`,
    )
  }

  const existing = (await existingResponse.json()) as StoredRow[]

  if (!Array.isArray(existing) || existing.length !== 1) {
    // Neither inserted nor found: the write did not happen. Fail loudly so the
    // visitor is not told their enquiry was recorded.
    throw new Error('Submission was neither inserted nor found; storage unconfirmed.')
  }

  return {
    stored: true,
    request_id: existing[0].request_id,
    duplicate: true,
    created_at: existing[0].created_at,
  }
}

/** Keep error logs short and free of any echoed submission content. */
function summarise(detail: string): string {
  try {
    const parsed = JSON.parse(detail) as { code?: string; message?: string }
    return parsed.code ? `code=${parsed.code}` : (parsed.message ?? '').slice(0, 120)
  } catch {
    return detail.slice(0, 120)
  }
}
