# Operator quick start

**For:** a newly authorized SAFI team member who has just been given access.
**Goal:** open the site, submit a test enquiry, confirm it was stored.
**Time:** about 10 minutes. The SOW allows 30.
**You will not need the Developer.**

Fill these in before handing this page over:

| | |
|---|---|
| Live site | `https://__________.github.io/__________/` |
| Supabase project | `https://supabase.com/dashboard/project/__________` |
| Windmill workspace | `https://__________/runs` |
| Repository | `https://github.com/__________/__________` |

You should have received: a Supabase dashboard invitation, a Windmill
workspace invitation, and GitHub repository access. Accept all three before
starting.

---

### 1. Open the site

Go to the live URL. You should see **Sample Home Services — Demo**, a yellow
banner reading "Demonstration only — no services offered", three service
cards, and a contact form.

### 2. Check it on a phone

Open the same URL on your phone, or narrow the browser window. Everything
should stack into one column with no sideways scrolling.

### 3. Fill in the form

Scroll to **Contact us**. Use harmless test data only, never real personal
details:

- **Name:** `Test Operator`
- **Email:** `operator@example.com`
- **Message:** `Checking the handover works.`

### 4. Submit

Press the submit button. Version A says **Contact Us**; version B says
**Request a Callback**.

### 5. Note the reference

A green **Enquiry received** panel appears with a reference like
`3f2a7c14-9b6d-4e83-9a21-5c7d1e8f40bb`. Copy it. That is the `request_id` and
it is how you find your submission.

If you get a red panel instead, nothing was saved. Skip to
**If something goes wrong** below.

### 6. Find the workflow run

Open the Windmill workspace link and go to **Runs**. Your run is at the top,
succeeded, with a result containing `"stored": true` and your reference.

### 7. Find the stored row

Open the Supabase dashboard link, go to **Table Editor →
`contact_submissions`**, and sort by `created_at` descending. The top row is
yours: same reference, same name, email and message, with a timestamp from a
moment ago.

### 8. Confirm bad input is refused

Back on the site, clear the form and press submit with everything empty. Each
field shows a red error message and nothing is sent. Refresh the Supabase
table: **no new row**. This is the check that proves validation is real.

### 9. Tidy up

Delete your test rows in the Table Editor: select the row, then **Delete**.

### 10. You are done

You have confirmed the full chain: browser → Edge Function → Windmill →
PostgreSQL. If all ten steps worked, the pilot is operating correctly.

---

## If something goes wrong

| What you see | What it means | What to do |
|---|---|---|
| Red panel, "could not record your enquiry" | The chain broke somewhere after the browser. Nothing was saved — the message is accurate. | Check Windmill **Runs** for a failed job, and Supabase **Edge Functions → contact-submit → Logs**. |
| Page loads but is unstyled or blank | The published build is not the one the workflow produced. | GitHub **Settings → Pages → Source** must be **GitHub Actions**. Re-run the latest workflow. |
| "The intake service is not configured" | The Edge Function is missing its secrets. | Re-run step 4 of [SETUP.md](./SETUP.md). |
| Form submits but no Windmill run appears | The Edge Function cannot reach Windmill. | Check `WINDMILL_WEBHOOK_URL` and that the token has not been revoked. |

Retrying a failed submission is safe. The reference is held until it succeeds,
and a repeated reference can never create a second row.

**Full detail:** [SETUP.md](./SETUP.md) to rebuild from scratch,
[HANDOVER.md](./HANDOVER.md) for ownership, costs and credential rotation.
