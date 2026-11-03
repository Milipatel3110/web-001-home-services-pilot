/**
 * Local stand-ins for Supabase PostgREST and Windmill, so the REAL Edge
 * Function and the REAL flow step can be exercised end to end.
 *
 * - The PostgREST mock enforces the request_id primary key and implements
 *   Prefer: resolution=ignore-duplicates the way PostgREST does.
 * - The Windmill mock imports the real contact_intake step and runs it.
 *
 * Run with bun. Control endpoints let the test driver inspect rows and
 * simulate an outage.
 */
import { main } from './contact_intake.ts'

type Row = {
  request_id: string
  name: string
  email: string
  message: string
  created_at: string
}

const rows = new Map<string, Row>()
let windmillDown = false
let windmillLies = false
let insertCalls = 0

// --------------------------------------------------------------------------
// Mock PostgREST — port 54321
// --------------------------------------------------------------------------
Bun.serve({
  port: 54321,
  async fetch(req) {
    const url = new URL(req.url)

    if (!url.pathname.startsWith('/rest/v1/contact_submissions')) {
      return new Response('not found', { status: 404 })
    }

    // Every call must present the service-role credential.
    const auth = req.headers.get('authorization') ?? ''
    if (auth !== 'Bearer mock-service-role-key') {
      return new Response(JSON.stringify({ code: '401', message: 'unauthorised' }), {
        status: 401,
      })
    }

    if (req.method === 'POST') {
      insertCalls += 1
      const body = (await req.json()) as Omit<Row, 'created_at'>
      const prefer = req.headers.get('prefer') ?? ''

      if (rows.has(body.request_id)) {
        // PostgREST with resolution=ignore-duplicates: no row added, and with
        // return=representation the response is an empty array.
        if (prefer.includes('ignore-duplicates')) {
          return Response.json([], { status: 201 })
        }
        return Response.json({ code: '23505', message: 'duplicate key' }, { status: 409 })
      }

      const row: Row = { ...body, created_at: new Date().toISOString() }
      rows.set(row.request_id, row)
      return Response.json([row], { status: 201 })
    }

    if (req.method === 'GET') {
      const filter = url.searchParams.get('request_id') ?? ''
      const id = filter.startsWith('eq.') ? filter.slice(3) : ''
      const row = rows.get(id)
      return Response.json(row ? [row] : [])
    }

    return new Response('method not allowed', { status: 405 })
  },
})

// --------------------------------------------------------------------------
// Mock Windmill — port 54322. Runs the real flow step.
// --------------------------------------------------------------------------
Bun.serve({
  port: 54322,
  async fetch(req) {
    const url = new URL(req.url)

    // --- control plane for the test driver ---
    if (url.pathname === '/__control/state') {
      return Response.json({
        rows: [...rows.values()].map((r) => ({
          request_id: r.request_id,
          name: r.name,
          email: r.email,
          message: r.message,
        })),
        count: rows.size,
        insertCalls,
        windmillDown,
      })
    }
    if (url.pathname === '/__control/down') {
      windmillDown = true
      return Response.json({ windmillDown })
    }
    if (url.pathname === '/__control/up') {
      windmillDown = false
      return Response.json({ windmillDown })
    }
    if (url.pathname === '/__control/lie') {
      // Answer 200 with a body that does not confirm storage.
      windmillLies = true
      return Response.json({ windmillLies })
    }
    if (url.pathname === '/__control/truth') {
      windmillLies = false
      return Response.json({ windmillLies })
    }
    if (url.pathname === '/__control/reset') {
      rows.clear()
      insertCalls = 0
      windmillDown = false
      windmillLies = false
      return Response.json({ ok: true })
    }

    // --- the synchronous flow webhook ---
    if (!url.pathname.includes('/jobs/run_wait_result/f/web001/contact_intake')) {
      return new Response('not found', { status: 404 })
    }

    if (windmillDown) {
      // What an unreachable or erroring Windmill looks like to the function.
      return new Response('service unavailable', { status: 503 })
    }

    if (windmillLies) {
      // HTTP 200 with no confirmation of storage. Nothing is written. The
      // Edge Function must refuse to call this a success.
      return Response.json({ ok: true })
    }

    const auth = req.headers.get('authorization') ?? ''
    if (auth !== 'Bearer mock-windmill-token') {
      return new Response(JSON.stringify({ error: 'unauthorised' }), { status: 401 })
    }

    const payload = (await req.json()) as {
      request_id: string
      name: string
      email: string
      message: string
    }

    try {
      const result = await main(
        payload.request_id,
        payload.name,
        payload.email,
        payload.message,
      )
      return Response.json(result)
    } catch (error) {
      // A thrown step fails the Windmill job.
      return Response.json(
        { error: error instanceof Error ? error.message : 'flow failed' },
        { status: 500 },
      )
    }
  },
})

console.log('mock postgrest :54321  mock windmill :54322')
