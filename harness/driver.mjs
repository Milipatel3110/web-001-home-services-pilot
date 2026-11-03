/**
 * Drives the real built site in a real browser against the real Edge Function
 * and the real flow step. Covers the behaviour T3, T4 and T7 check for.
 */
import { createRequire } from 'node:module'
import http from 'node:http'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'

// Playwright may be a project devDependency, a global install, or supplied by
// the environment. Try each rather than insisting on one layout.
function loadPlaywright() {
  const candidates = [
    import.meta.url,
    `${process.cwd()}/`,
    `${path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')}/`,
    '/opt/npm-tools/',
  ]
  for (const from of candidates) {
    try {
      return createRequire(from)('playwright')
    } catch {
      /* try the next one */
    }
  }
  throw new Error(
    'playwright not found. Install it with:  npm i -D playwright && npx playwright install chromium',
  )
}

const { chromium } = loadPlaywright()

const HARNESS = process.env.HARNESS_WORK ?? path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(HARNESS, 'dist')
const CONTROL = 'http://127.0.0.1:54322/__control'
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }

const site = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0])
  if (p === '/' || p === '') p = '/index.html'
  const file = path.join(DIST, p)
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' })
  fs.createReadStream(file).pipe(res)
})
await new Promise((r) => site.listen(4173, r))

const state = async () => (await fetch(`${CONTROL}/state`)).json()
const control = async (action) => (await fetch(`${CONTROL}/${action}`)).json()

let passed = 0
let failed = 0
const check = (name, ok, detail = '') => {
  if (ok) { passed += 1; console.log(`  PASS  ${name}`) }
  else { failed += 1; console.log(`  FAIL  ${name}${detail ? `, ${detail}` : ''}`) }
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const consoleErrors = []
page.on('pageerror', (e) => consoleErrors.push(String(e)))

const requests = []
page.on('request', (r) => requests.push({ url: r.url(), headers: r.headers() }))

await control('reset')
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' })

const fill = async (name, email, message) => {
  await page.fill('#name', name)
  await page.fill('#email', email)
  await page.fill('#message', message)
}
const submit = async () => {
  await page.getByRole('button', { name: /Contact Us|Request a Callback/i }).click()
  await page.waitForTimeout(700)
}
const successText = async () => {
  const el = page.locator('text=Enquiry received')
  return (await el.count()) > 0 ? (await page.locator('code').first().textContent()) : null
}
const failureVisible = async () => (await page.locator('text=Not submitted').count()) > 0

// ---------------------------------------------------------------------------
console.log('\nT3, genuine browser submission reaches storage')
// ---------------------------------------------------------------------------
await fill('Demo Tester', 'demo@example.com', 'Recording the end to end walkthrough for handover.')
await submit()
const ref1 = await successText()
check('success panel shown with a reference', Boolean(ref1), 'no reference')
let s = await state()
check('exactly one row stored', s.count === 1, `count=${s.count}`)
check('stored row matches the typed name', s.rows[0]?.name === 'Demo Tester', s.rows[0]?.name)
check('stored request_id matches the displayed reference', s.rows[0]?.request_id === ref1)

// ---------------------------------------------------------------------------
console.log('\nT5, the browser holds no credential and reaches one endpoint only')
// ---------------------------------------------------------------------------
const outbound = requests.filter((r) => !r.url.startsWith('http://localhost:4173') && !r.url.includes('fonts.g'))
check('only the Edge Function is called', outbound.every((r) => r.url.startsWith('http://127.0.0.1:8000')), outbound.map((r) => r.url).join(','))
check('no Authorization header is sent', outbound.every((r) => !r.headers.authorization))
check('no call to the database or Windmill', !outbound.some((r) => r.url.includes('54321') || r.url.includes('54322')))

// ---------------------------------------------------------------------------
console.log('\nT4, invalid input is rejected and stores nothing')
// ---------------------------------------------------------------------------
const before = (await state()).count
const cases = [
  ['all blank', '', '', ''],
  ['name too short', 'A', 'a@example.com', 'A long enough message here.'],
  ['name too long', 'x'.repeat(81), 'a@example.com', 'A long enough message here.'],
  ['malformed email', 'Valid Name', 'not-an-email', 'A long enough message here.'],
  ['message too short', 'Valid Name', 'a@example.com', 'hi'],
  ['message too long', 'Valid Name', 'a@example.com', 'x'.repeat(1001)],
  ['whitespace only', '   ', '   ', '     '],
]
for (const [label, n, e, m] of cases) {
  await page.reload({ waitUntil: 'networkidle' })
  await fill(n, e, m)
  await submit()
  const errs = await page.locator('p.text-destructive').count()
  const stored = await successText()
  check(`${label}: error shown, nothing stored`, errs > 0 && !stored, `errors=${errs} stored=${stored}`)
}
check('row count unchanged by invalid input', (await state()).count === before, `${before} -> ${(await state()).count}`)

// server-side bypass of the client
const bypass = async (body) => {
  const res = await fetch('http://127.0.0.1:8000/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:4173' },
    body: JSON.stringify(body),
  })
  return { status: res.status, body: await res.json().catch(() => null) }
}
const uuid = () => crypto.randomUUID()
const oversize = await bypass({ request_id: uuid(), name: 'Bypass Test', email: 'b@example.com', message: 'x'.repeat(1001), website: '' })
check('server rejects oversize message (400)', oversize.status === 400, `status=${oversize.status}`)
const honeypot = await bypass({ request_id: uuid(), name: 'Bot Test', email: 'b@example.com', message: 'This should be refused.', website: 'http://spam.example' })
check('server rejects honeypot (400)', honeypot.status === 400, `status=${honeypot.status}`)
const badId = await bypass({ request_id: 'not-a-uuid', name: 'Bad Id', email: 'b@example.com', message: 'This should be refused.', website: '' })
check('server rejects malformed request_id (400)', badId.status === 400, `status=${badId.status}`)
const huge = await bypass({ request_id: uuid(), name: 'Big', email: 'b@example.com', message: 'x'.repeat(20000), website: '' })
check('server rejects oversized body (413)', huge.status === 413, `status=${huge.status}`)
check('no rows added by any bypass attempt', (await state()).count === before, `count=${(await state()).count}`)

// ---------------------------------------------------------------------------
console.log('\nT7 part 1, repeated request_id stores exactly one row')
// ---------------------------------------------------------------------------
const rid = uuid()
const dupPayload = { request_id: rid, name: 'Duplicate Test', email: 'dup@example.com', message: 'Sent three times with one request_id.', website: '' }
const dupResults = []
for (let i = 0; i < 3; i += 1) dupResults.push(await bypass(dupPayload))
check('all three attempts reported received', dupResults.every((r) => r.status === 200 && r.body?.status === 'received'), dupResults.map((r) => r.status).join(','))
s = await state()
const dupRows = s.rows.filter((r) => r.request_id === rid)
check('exactly one row for the repeated request_id', dupRows.length === 1, `rows=${dupRows.length}`)
check('the database was asked three times', s.insertCalls >= 3, `insertCalls=${s.insertCalls}`)

// ---------------------------------------------------------------------------
console.log('\nT7 part 2, truthful failure, then retry without duplication')
// ---------------------------------------------------------------------------
await page.reload({ waitUntil: 'networkidle' })
await control('down')
await fill('Outage Tester', 'outage@example.com', 'Submitting while the workflow is unavailable.')
await submit()
check('no success claimed while the workflow is down', !(await successText()))
check('a truthful failure is shown', await failureVisible())
const msg = await page.locator('[role="alert"]', { hasText: 'Not submitted' }).first().innerText()
check('the failure says nothing was saved', /nothing has been saved/i.test(msg), msg.replace(/\n/g, ' ').slice(0, 80))
const duringOutage = (await state()).count
check('no row created during the outage', duringOutage === s.count, `${s.count} -> ${duringOutage}`)

// retry in the same page, without refreshing, so the request_id is reused
await control('up')
await submit()
const ref2 = await successText()
check('the retry succeeds', Boolean(ref2))
const after = await state()
check('the retry added exactly one row', after.count === duringOutage + 1, `${duringOutage} -> ${after.count}`)
const retryRows = after.rows.filter((r) => r.request_id === ref2)
check('exactly one row for the retried request_id', retryRows.length === 1)

// a fresh enquiry gets a fresh id
await fill('Second Enquiry', 'second@example.com', 'A different enquiry after a successful one.')
await submit()
const ref3 = await successText()
check('a new enquiry gets a new request_id', Boolean(ref3) && ref3 !== ref2, `${ref2} vs ${ref3}`)

// ---------------------------------------------------------------------------
console.log('\nUnconfirmed success is treated as failure')
// ---------------------------------------------------------------------------
// Windmill answers HTTP 200 but does not confirm storage. The SOW forbids
// inferring success from the status code alone.
await control('lie')
const beforeLie = (await state()).count
const lied = await bypass({ request_id: uuid(), name: 'Liar Test', email: 'liar@example.com', message: 'Workflow returns 200 without confirming.', website: '' })
check('a 200 without confirmation is not success', lied.status !== 200, `status=${lied.status}`)
check('nothing stored when storage is unconfirmed', (await state()).count === beforeLie)

await page.reload({ waitUntil: 'networkidle' })
await fill('Unconfirmed Tester', 'unconfirmed@example.com', 'Checking the browser is told the truth here too.')
await submit()
check('the browser shows a failure, not a success', !(await successText()) && (await failureVisible()))
await control('truth')

console.log('\nConsole errors during the whole run:', consoleErrors.length ? consoleErrors : 'none')
check('no uncaught page errors', consoleErrors.length === 0)

await browser.close()
site.close()

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed === 0 ? 0 : 1)
