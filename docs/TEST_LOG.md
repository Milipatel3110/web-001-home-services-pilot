# T1 to T8 test log

SOW section 7. These are Developer verification obligations. SAFI decides
acceptance separately.

| | |
|---|---|
| Tester | Mili Patel |
| Date | 2026-11-03 |
| Live URL | https://milipatel3110.github.io/web-001-home-services-pilot/ |
| Release A SHA | `e14703c9a5be53185665119e2aa322a368b891a7` |
| Release A run | https://github.com/Milipatel3110/web-001-home-services-pilot/actions/runs/41603037714 |
| Release B SHA | `45af5a4231bd60c55843eb987a195497d76f7e47` |
| Release B run | https://github.com/Milipatel3110/web-001-home-services-pilot/actions/runs/41603155813 |
| Supabase project | `ffclvsmctstpibdifjgu` |
| Windmill flow | `u/mili/contact_intake`, workspace `web001` |

Evidence goes in `evidence/`, named `T1-...` through `T8-...`. Redact
submitted names, emails and message text before sharing anything. Never
capture a key or token in a screenshot.

Two of the results below were produced by a script rather than by hand, and
say so. Everything else was observed by the tester.

---

## Summary

| ID | Result | Evidence |
|---|---|---|
| T1 | PASS | `________` |
| T2 | PASS | `________` |
| T3 | PASS | `________` |
| T4 | PASS | `________` |
| T5 | PASS | `________` |
| T6 | PASS | `________` |
| T7 | PASS | `________` |
| T8 | PASS | `________` |

All eight demonstrations pass. Evidence filenames are filled in as each
capture is added to `evidence/`.

Signed: `__________`  Date: `__________`

---

## T1. Version A live and operable

Required: the public HTTPS Pages URL shows the demo content, the mobile view
works, the form is operable.

- [x] Loads over HTTPS at the project site URL
- [x] Title "Sample Home Services — Demo"
- [x] Hero section present
- [x] Three cards: Small Repairs, Furniture Assembly, Home Maintenance
- [x] "Demonstration only — no services offered" visible without scrolling
- [x] Name, Email and Message fields present
- [x] Single column at phone width with no sideways scrolling

**PASS.** Content was also verified by fetching the live page and its bundle:
every required string is present, the endpoint URL is compiled in, and no
secret-shaped value appears anywhere in the built output.

---

## T2. Release A deployed by GitHub Actions

Required: the first push to main runs a locked install, build and check, then
deploys release A.

- [x] Triggered by a push to `main`, not a manual upload
- [x] `npm ci` succeeded, locked install
- [x] `npx tsc -b` succeeded
- [x] `npx vitest run` succeeded, 24 tests
- [x] Secret scan step succeeded
- [x] Build succeeded and `dist` was uploaded
- [x] Deploy job succeeded
- [x] Settings, Pages, Source is "GitHub Actions"

SHA `e14703c9a5be53185665119e2aa322a368b891a7`
Run https://github.com/Milipatel3110/web-001-home-services-pilot/actions/runs/41603037714

**PASS.**

Worth recording: the very first attempt failed in 14 seconds with "Get Pages
site failed", because Pages had never been switched on. The workflow now
passes `enablement: true` to `actions/configure-pages` so it turns Pages on
itself. The failure looked like a build error but was a settings one.

---

## T3. Genuine browser submission reaches PostgreSQL

Required: a human types harmless test data into the live form, the Edge
Function invokes Windmill, and the matching `request_id` and fields appear in
Supabase. No seeded SQL or API-only substitute counts.

- [x] Typed into the live form by hand in a real browser
- [x] Success panel shown with a reference
- [x] Windmill Runs shows one succeeded run returning `"stored": true`
- [x] Row in `contact_submissions` with the same `request_id`
- [x] Name, email and message match what was typed

**PASS.**

request_id used: `________`

Screen recording is the strongest evidence here because it shows the typing.

---

## T4. Invalid input rejected, nothing stored

Required: blank, malformed or oversized fields are rejected with clear
messages and create zero database rows.

Through the form:

| Input | Expected | Row added |
|---|---|---|
| All three fields blank | Error under each field | No |
| Name `A` | "at least 2 characters" | No |
| Name 81 characters | "80 characters or fewer" | No |
| Email `not-an-email` | "valid email address" | No |
| Message `hi` | "at least 10 characters" | No |
| Message 1001 characters | "1000 characters or fewer" | No |
| All fields whitespace only | Error under each field | No |

Bypassing the form entirely, to prove the server validates rather than
trusting the client (run by `scripts/verify-live.sh`):

| Case | Status |
|---|---|
| all fields blank | 400 |
| name too short | 400 |
| name too long, 81 | 400 |
| malformed email | 400 |
| message too short | 400 |
| message too long, 1001 | 400 |
| whitespace-only fields | 400 |
| honeypot filled | 400 |
| malformed request_id | 400 |
| oversized body | 413 |

Row count confirmed in the database afterwards: the ten rejected submissions
created zero rows. Total rows accounted for exactly the successful
submissions made during setup.

**PASS.**

---

## T5. RLS denies direct access, no secrets exposed

Required: unauthenticated direct Supabase read and write are denied by RLS,
and no privileged secret appears in Git, the frontend bundle or browser
requests.

Direct table access holding a real publishable key, which is the key a
browser would carry:

| Operation | Result |
|---|---|
| `SELECT` | 401, `42501 permission denied for table contact_submissions` |
| `INSERT` | 401, `42501 permission denied` |
| `UPDATE` | 401 |
| `DELETE` | 401 |

PostgREST's own error hint confirms the cause. It suggests granting
privileges to `anon`, which is exactly what the migration revokes.

Database state:

```
policy_count = 0      rls_enabled = true
```

RLS is enabled with no policies and the role has no table grants, so all four
verbs are refused before any row is touched.

Secrets:

- [x] Built bundle clean, checked on every deployment by the workflow
- [x] Git history clean
- [x] Browser Network tab during a submission shows one request, to
      `/functions/v1/contact-submit`, with no Authorization header
- [x] No browser request to Windmill or to `/rest/v1/`
- [x] `.env.example` contains placeholders only

**PASS.**

---

## T6. Version B, second automated deployment, same URL

Required: the natural language change produces release B, a second successful
Actions deployment updates the same public URL, and the form still stores a
new submission.

- [x] bolt.diy given exactly: *"Add a Weekend Appointments callout above the
      contact form and change the submit button to Request a Callback; keep
      the form operational."*
- [x] Change committed and pushed to `main`
- [x] Second Actions run succeeded
- [x] Same URL as release A, unchanged
- [x] "Weekend Appointments" callout visible above the form
- [x] Button reads "Request a Callback"
- [x] A new submission through the updated form stores a new row

SHA `45af5a4231bd60c55843eb987a195497d76f7e47`
Run https://github.com/Milipatel3110/web-001-home-services-pilot/actions/runs/41603155813

**PASS.**

---

## T7. Duplicate safety and truthful failure

Required: repeating the same `request_id` leaves exactly one row; with
Windmill unavailable the error is truthful; after recovery the retry succeeds
without duplicate storage.

### Part 1, repeated request_id

The same `request_id` was sent three times. All three returned
`{"status":"received"}`, and the database confirmed a single row:

```sql
select count(*) from contact_submissions
 where request_id = 'f66a2b3f-712a-43d8-bca3-b6cf78377423';
-- 1
```

The flow reported `"duplicate": true` on the second and third attempts,
meaning it returned the existing row rather than inserting.

**PASS.**

### Part 2, Windmill unavailable then restored

Method used: edited the `WINDMILL_WEBHOOK_URL` Edge Function secret to point
at a flow path that does not exist, so Windmill answered 404. Restored by
setting the secret back.

- [x] Submitted through the live browser form
- [x] No success message; the failure said nothing was saved
- [x] No new row created
- [x] The page kept the same `request_id`, no refresh
- [x] After restoring, the retry succeeded
- [x] Exactly one row exists for that `request_id`

The visitor saw the truthful failure the Edge Function returns when Windmill
cannot confirm storage:

> We could not record your enquiry right now. Nothing has been saved. Please
> try again in a moment.

Confirmed across the whole table, not just this enquiry:

```sql
select request_id, count(*) from contact_submissions
group by request_id having count(*) > 1;
-- no rows
```

No `request_id` appears more than once anywhere in the table.

**PASS.**

**Note on method.** Archiving the flow in Windmill does not work as a break.
An archived flow is hidden from the UI but its webhook still runs and still
stores. This was confirmed by probing the endpoint while archived and getting
a genuine `{"status":"received"}` with a row written.

Use a broken webhook URL instead. Edit the `WINDMILL_WEBHOOK_URL` Edge
Function secret and append `_broken` to the flow path, so Windmill answers
404. Restore it by changing it back. One value, edited twice.

---

## T8. Independent operator onboarding in 30 minutes

Required: a new authorized operator follows the handover guide and, within 30
minutes and without Developer help, opens the site, submits a test enquiry
and verifies it in Supabase or Windmill.

Needs a second person. The Developer may be present but must not speak, type
or point. Any assistance makes this a FAIL and means the guide needs fixing.

| | |
|---|---|
| Operator | Utkarsh, friend of the Developer, non-technical |
| Started at | 12:00 |
| Finished at | 12:20 |
| Elapsed | 20 minutes |
| Developer assistance | None |

- [x] Opened the live site unaided
- [x] Submitted a test enquiry
- [x] Found the run in Windmill
- [x] Found the row in Supabase
- [x] Completed within 30 minutes

**PASS.** Twenty minutes against a thirty minute allowance, with a
non-technical operator and no Developer involvement.

Anything the operator found unclear, in their words:

```
Nothing reported. The operator followed the quick start start to finish
without asking a question.
```

No changes were made to the guide as a result.

### Evidence to capture

The operator produces this, not the Developer:

- `T8-operator-submission.png`, the green panel on their screen with the
  reference visible
- `T8-supabase-row.png`, the matching row they found in the table editor
- `T8-timing.png` or a written note of start and finish times

A screen recording of their 30 minutes is stronger than screenshots if they
are willing, because it shows nobody intervened. Not required.

The table above is the deliverable. The screenshots support it.

---

## Reproducing the scripted checks

```bash
bash scripts/verify-live.sh https://ffclvsmctstpibdifjgu.supabase.co/functions/v1/contact-submit
```

Thirteen checks covering the server-side half of T4 and T7 part 1. No
credentials needed. It cannot see the database, so the row counts have to be
confirmed in Supabase separately.

```bash
bash harness/run.sh
```

Thirty-five checks against the real Edge Function and real flow step, with
mocks standing in for PostgREST and the Windmill job runner. Catches code
regressions. Passing it proves the code is right, not that the deployment is
configured right.
