# Local end-to-end harness

Runs the whole request chain on one machine and drives it with a real browser,
so the behaviour T3, T4, T5 and T7 check for can be verified before, and after,
touching the deployed system.

```bash
bash harness/run.sh
```

Expected output ends with `35 passed, 0 failed`.

## What is real and what is not

| Component | In the harness |
|---|---|
| Frontend | **Real.** The actual Vite production build. |
| Edge Function | **Real.** `supabase/functions/contact-submit/index.ts` run under Deno, unmodified. |
| Windmill flow step | **Real.** `windmill/contact_intake.ts`, the same file embedded in the flow export. |
| PostgREST | Mocked in `servers.ts`. Enforces the `request_id` primary key and implements `Prefer: resolution=ignore-duplicates` as PostgREST does. |
| Windmill job runner | Mocked. Authenticates the bearer token and invokes the real step. |
| RLS | Not exercised. It is a database behaviour, so T5's RLS half must be checked against the real project. |

**Passing here is necessary, not sufficient.** It proves the code is correct.
It does not prove the deployment is configured correctly, which is what T1–T8
against the live system are for.

## What it checks

- A submission typed into a browser reaches storage, and the reference shown
  matches the stored row.
- The browser calls exactly one endpoint, with no credential attached, and
  never contacts Windmill or the database directly.
- Twelve invalid inputs are rejected, seven through the form and five
  bypassing it entirely, and none create a row.
- The honeypot, the malformed `request_id` and the oversized body are refused
  server-side.
- The same `request_id` sent three times leaves exactly one row, while the
  database is genuinely asked three times.
- With the workflow unavailable: no success is claimed, the message says
  nothing was saved, and nothing was. Retrying in the same page then succeeds
  and still leaves one row.
- A workflow that answers HTTP 200 without confirming storage is treated as a
  failure, not a success.

## Requirements

```bash
npm i -g bun deno          # the flow step runs on bun, the function on deno
npm i -D playwright
npx playwright install chromium
```

Ports used: 4173 (site), 8000 (Edge Function), 54321 (PostgREST mock),
54322 (Windmill mock). Scratch files go in `harness/.work/`, which is
gitignored; its `*.log` files are where to look when something fails.
