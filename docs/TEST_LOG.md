# T1–T8 PASS/FAIL test log

SOW section 7. These are Developer verification obligations. SAFI alone
decides acceptance.

Every test is filled in by hand while actually performing it. A test is PASS
only when it was **observed**, not when the code looks right. If a test fails,
record it as FAIL, fix the cause, and run it again with a new date.

| | |
|---|---|
| Tester | Automated by Claude (deployment only); live-browser tests outstanding |
| Date | 2026-11-03 |
| Live URL | https://milipatel3110.github.io/web-001-home-services-pilot/ |
| Release A SHA | `83f83864f772008968e0609feb914b08ea125d0d` |
| Release A run | https://github.com/Milipatel3110/web-001-home-services-pilot/actions/runs/41580364454 |
| Release B SHA | `d5a516395880c55f89662e2e29c5f4b2f1cf4c59` |
| Release B run | https://github.com/Milipatel3110/web-001-home-services-pilot/actions/runs/41580780291 |

Evidence goes in `evidence/`, named `T1-...`, `T2-...` and so on. Redact
submitted names, emails and message bodies in anything shared, and never
capture a key, token or service_role value in a screenshot.

---

## T1 — Version A is live and operable

**Pass only when observed:** the public HTTPS GitHub Pages URL shows the
required demo content, the mobile view works, and the form is operable.

Check each:

- [ ] Loads over HTTPS at the project-site URL
- [ ] Title "Sample Home Services — Demo"
- [ ] Hero section present
- [ ] Three cards: Small Repairs, Furniture Assembly, Home Maintenance
- [ ] "Demonstration only — no services offered" visible without scrolling
- [ ] Name, Email, Message fields present; submit button reads **Contact Us**
- [ ] On a real phone or at 390px: single column, no sideways scrolling

**Result:** ☐ PASS ☐ FAIL  **Evidence:** `________`

---

## T2 — Release A deployed by GitHub Actions

**Pass only when observed:** the first push to main runs a locked install,
build and check, then deploys release A.

- [ ] Run triggered by a push to `main`, not a manual upload
- [ ] `npm ci` step succeeded (locked install)
- [ ] `npx tsc -b` succeeded
- [ ] `npx vitest run` succeeded, 24 tests passed
- [ ] Secret-scan step succeeded
- [ ] Build succeeded and `dist` was uploaded
- [ ] `deploy` job succeeded and the URL serves that build
- [ ] **Settings → Pages → Source** is **GitHub Actions**

**SHA:** `________`  **Run URL:** `________`
**Result:** ☐ PASS ☐ FAIL  **Evidence:** `________`

---

## T3 — Genuine browser submission reaches PostgreSQL

**Pass only when observed:** a human types harmless test data into the live
form, the Edge Function invokes Windmill, and the matching `request_id` and
fields appear in Supabase. **No seeded SQL or API-only substitute counts.**

Use a real browser on the live URL. Not curl, not the Supabase UI.

- [ ] Typed into the live form by hand
- [ ] Success panel shown, reference recorded below
- [ ] Supabase **Edge Functions → Logs** shows the request
- [ ] Windmill **Runs** shows one succeeded run returning `"stored": true`
- [ ] Row in `contact_submissions` with the same `request_id`
- [ ] `name`, `email`, `message` match what was typed
- [ ] `created_at` is from the moment of submission

**request_id used:** `________`
**Result:** ☐ PASS ☐ FAIL  **Evidence:** `________`
(Screen recording is the strongest evidence here, since it shows the typing.)

---

## T4 — Invalid input is rejected and stores nothing

**Pass only when observed:** blank, malformed or oversized fields are rejected
with clear messages and create **zero** database rows.

Note the row count before starting: `________`

| # | Input | Expected | Observed | Row added? |
|---|---|---|---|---|
| 1 | All three fields blank | Error under each field | | ☐ No |
| 2 | Name `A` | "at least 2 characters" | | ☐ No |
| 3 | Name 81 characters | "80 characters or fewer" | | ☐ No |
| 4 | Email `not-an-email` | "valid email address" | | ☐ No |
| 5 | Message `hi` | "at least 10 characters" | | ☐ No |
| 6 | Message 1001 characters | "1000 characters or fewer" | | ☐ No |
| 7 | All fields whitespace only | Error under each field | | ☐ No |

Then bypass the browser form, to prove the server validates too and does not
merely trust the client:

```bash
# Oversized message straight to the Edge Function. Expect 400, no row.
curl -i -X POST "https://<ref>.supabase.co/functions/v1/contact-submit" \
  -H "Content-Type: application/json" \
  -d "{\"request_id\":\"$(uuidgen | tr 'A-Z' 'a-z')\",\"name\":\"Bypass Test\",
       \"email\":\"bypass@example.com\",\"message\":\"$(printf 'x%.0s' {1..1001})\",
       \"website\":\"\"}"

# Honeypot filled. Expect 400, no row.
curl -i -X POST "https://<ref>.supabase.co/functions/v1/contact-submit" \
  -H "Content-Type: application/json" \
  -d "{\"request_id\":\"$(uuidgen | tr 'A-Z' 'a-z')\",\"name\":\"Bot Test\",
       \"email\":\"bot@example.com\",\"message\":\"This should be refused.\",
       \"website\":\"http://spam.example\"}"
```

- [ ] Server-side oversize refused with 400
- [ ] Honeypot submission refused with 400

Row count after all of the above: `________` (must equal the count before)

**Result:** ☐ PASS ☐ FAIL  **Evidence:** `________`

---

## T5 — RLS denies direct access; no secrets are exposed

**Pass only when observed:** unauthenticated direct Supabase table read/write
is denied by RLS, and no privileged secret appears in Git, the frontend bundle
or browser requests.

### Direct table access with the anon key

```bash
# Read. Expect an empty array or a permission error, never the rows.
curl -s "https://<ref>.supabase.co/rest/v1/contact_submissions?select=*" \
  -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>"

# Write. Expect a permission error.
curl -s -X POST "https://<ref>.supabase.co/rest/v1/contact_submissions" \
  -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"request_id":"99999999-8888-4777-8666-555555555555","name":"RLS Probe",
       "email":"rls@example.com","message":"This insert must be refused."}'
```

- [ ] Direct SELECT returns no rows
- [ ] Direct INSERT refused
- [ ] Direct UPDATE refused
- [ ] Direct DELETE refused

### No secrets anywhere they could leak

```bash
# Built bundle
npm run build
grep -rE 'service_role|eyJhbGciOi|WINDMILL_TOKEN' dist/ && echo FOUND || echo CLEAN

# Whole Git history, not just the current tree
git log -p --all | grep -nE 'service_role|eyJhbGciOi' && echo FOUND || echo CLEAN
```

- [ ] `dist/` CLEAN
- [ ] Git history CLEAN
- [ ] Browser **Network** tab during a submission: the only request is to
      `/functions/v1/contact-submit`, carrying no Authorization header
- [ ] No request from the browser to Windmill or to `/rest/v1/`
- [ ] `.env.example` contains placeholders only

**Result:** ☐ PASS ☐ FAIL  **Evidence:** `________`

---

## T6 — Version B via bolt.diy, second automated deployment, same URL

**Pass only when observed:** the natural-language change produces release B,
a second successful Actions deployment updates the **same** public URL, and the
form still stores a new submission.

- [ ] bolt.diy given exactly: *"Add a Weekend Appointments callout above the
      contact form and change the submit button to Request a Callback; keep the
      form operational."*
- [ ] Change committed and pushed to `main`
- [ ] Second Actions run succeeded
- [ ] **Same** URL as release A, unchanged
- [ ] "Weekend Appointments" callout visible above the form
- [ ] Button now reads **Request a Callback**
- [ ] A new submission through the updated form stores a new row

**SHA:** `________`  **Run URL:** `________`  **New request_id:** `________`
**Result:** ☐ PASS ☐ FAIL  **Evidence:** `________`

---

## T7 — Duplicate safety and truthful failure

**Pass only when observed:** repeating the same `request_id` leaves exactly one
row; with Windmill unavailable the error is truthful; after recovery the retry
succeeds without duplicate storage.

### Part 1 — repeated request_id

```bash
RID=$(uuidgen | tr 'A-Z' 'a-z')
for i in 1 2 3; do
  curl -s -X POST "https://<ref>.supabase.co/functions/v1/contact-submit" \
    -H "Content-Type: application/json" \
    -d "{\"request_id\":\"$RID\",\"name\":\"Duplicate Test\",
         \"email\":\"dup@example.com\",
         \"message\":\"Sent three times with one request_id.\",\"website\":\"\"}"
  echo
done
```

- [ ] All three returned `{"status":"received"}`
- [ ] `select count(*) from contact_submissions where request_id = '<RID>';`
      returns **1**
- [ ] Windmill shows `"duplicate": true` on runs 2 and 3

**request_id:** `________`  **Final count:** `________`

### Part 2 — Windmill unavailable, then restored

Break it deliberately, by any one of: archiving the flow in Windmill, revoking
the token, or setting `WINDMILL_WEBHOOK_URL` to an unreachable host.

Method used: `________`

- [ ] Submitted through the live browser form
- [ ] **No** success message; the failure says nothing was saved
- [ ] No new row created
- [ ] The page kept the same `request_id` (do not refresh)

Now restore Windmill and press submit again in the same page.

- [ ] Retry succeeded
- [ ] Exactly **one** row exists for that `request_id`

**request_id:** `________`  **Final count:** `________`
**Result:** ☐ PASS ☐ FAIL  **Evidence:** `________`

---

## T8 — Independent operator onboarding within 30 minutes

**Pass only when observed:** a new authorized operator follows the handover
guide and, within 30 minutes and without Developer help, opens the site,
submits a test form and verifies it in Supabase/Windmill.

This test needs a second person. The Developer may be in the room, but must
not speak, type, or point. If they help, the test is a FAIL and the guide
needs fixing.

| | |
|---|---|
| Operator | `__________` |
| Access granted at | `__________` |
| Started at | `__________` |
| Finished at | `__________` |
| Elapsed | `________` minutes |
| Developer assistance given | ☐ None ☐ Some → **FAIL** |

- [ ] Opened the live site unaided
- [ ] Submitted a test enquiry
- [ ] Found the run in Windmill
- [ ] Found the row in Supabase
- [ ] Completed within 30 minutes

Operator's own words on anything unclear (fix the guide, then re-test):

```
____________________________________________
____________________________________________
```

**Result:** ☐ PASS ☐ FAIL  **Evidence:** `________`

---

## Summary

| ID | Result | Date | Evidence |
|---|---|---|---|
| T1 | ☐ PASS ☐ FAIL | | |
| T2 | ☐ PASS ☐ FAIL | | |
| T3 | ☐ PASS ☐ FAIL | | |
| T4 | ☐ PASS ☐ FAIL | | |
| T5 | ☐ PASS ☐ FAIL | | |
| T6 | ☐ PASS ☐ FAIL | | |
| T7 | ☐ PASS ☐ FAIL | | |
| T8 | ☐ PASS ☐ FAIL | | |

Any FAIL makes the delivery incomplete under SOW section 10.

Signed: `__________`  Date: `__________`
