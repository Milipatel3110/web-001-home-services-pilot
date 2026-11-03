# Operator quick start

For a SAFI team member who has just been given access and wants to check the
pilot works.

Ten steps, about ten minutes. You should not need the Developer for any of it.

**Before you start**, accept the three invitations you were sent: Supabase,
Windmill, and the GitHub repository.

| | |
|---|---|
| Live site | https://milipatel3110.github.io/web-001-home-services-pilot/ |
| Supabase | https://supabase.com/dashboard/project/ffclvsmctstpibdifjgu |
| Windmill | https://app.windmill.dev/runs |
| Repository | https://github.com/Milipatel3110/web-001-home-services-pilot |

---

### 1. Open the site

Go to the live URL. You should see "Sample Home Services", a yellow banner
reading "Demonstration only — no services offered", three service cards, and
a contact form.

### 2. Check it on a phone

Open the same URL on your phone, or narrow your browser window. Everything
should stack into a single column with no sideways scrolling.

### 3. Fill in the form

Scroll down to Contact us. Use harmless test data. Do not enter anyone's real
details.

```
Name     Test Operator
Email    operator@example.com
Message  Checking the handover works.
```

### 4. Submit it

Press the button at the bottom of the form.

### 5. Copy the reference

A green panel appears with a reference that looks like
`3f2a7c14-9b6d-4e83-9a21-5c7d1e8f40bb`. Copy it. That is how you find your
submission in the next two steps.

A red panel instead means nothing was saved. Skip to Troubleshooting.

### 6. Find the workflow run

Open Windmill and go to Runs. Your run is at the top. Open it and check the
result says `"stored": true` with your reference.

### 7. Find the row

Open Supabase, go to Table Editor, open `contact_submissions` and sort by
`created_at` descending. The top row is yours. The reference, name, email and
message should all match what you typed.

### 8. Check that bad input is refused

Back on the site, clear the form and press the button with every field empty.
Each field shows a red error and nothing is sent. Refresh the Supabase table:
no new row.

This is the step that proves the validation is real rather than decorative.

### 9. Clear up

In the Table Editor, select your test rows and delete them.

### 10. Done

You have followed an enquiry from the browser, through a validating function,
through a workflow, into the database. If all ten steps worked, the pilot is
healthy.

---

## Troubleshooting

| What you see | What it means | What to do |
|---|---|---|
| Red panel saying nothing was saved | Something after the browser is down. The message is accurate: nothing was stored | Look at Windmill Runs for a failed job, then Supabase, Edge Functions, contact-submit, Logs |
| Page loads but looks unstyled or blank | The published build is not the one the workflow produced | In GitHub, Settings, Pages, check Source is "GitHub Actions", then re-run the latest workflow |
| "The intake service is not configured" | The Edge Function is missing its secrets | Follow [SETUP.md](./SETUP.md) section 4 |
| Form submits but no Windmill run appears | The Edge Function cannot reach Windmill | Check `WINDMILL_WEBHOOK_URL` and that the token has not been revoked |

Retrying a failed submission is safe. The page keeps the same reference until
it succeeds, and the database will not store the same reference twice.

---

To rebuild the whole thing from scratch, see [SETUP.md](./SETUP.md). For
ownership, costs and credential rotation, see [HANDOVER.md](./HANDOVER.md).
