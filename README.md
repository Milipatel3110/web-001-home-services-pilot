# WEB-001 — Sample Home Services, Demo

A one-page demonstration business website, generated with open-source
bolt.diy, published to GitHub Pages by GitHub Actions, with a working contact
form that stores submissions through a Supabase Edge Function and a Windmill
flow into PostgreSQL.

**Demonstration only — no services offered.** No real customer data, ever.

| | |
|---|---|
| Live site | `https://______.github.io/______/` |
| Release A | `________` |
| Release B | `________` |
| SOW | WEB-001, AI-First End-to-End Website Development |

---

## Start here

- **Just want to check it works?** → [docs/OPERATOR_QUICKSTART.md](docs/OPERATOR_QUICKSTART.md), about 10 minutes
- **Setting it up from empty accounts?** → [docs/SETUP.md](docs/SETUP.md)
- **Taking ownership?** → [docs/HANDOVER.md](docs/HANDOVER.md)
- **Verifying the delivery?** → [docs/TEST_LOG.md](docs/TEST_LOG.md)
- **What is done and what is left?** → [docs/DELIVERY_STATUS.md](docs/DELIVERY_STATUS.md)

---

## How a submission travels

```
Browser ──▶ Supabase Edge Function ──▶ Windmill flow ──▶ Supabase PostgreSQL
            contact-submit              contact_intake     contact_submissions
            public, validates           private, sync      RLS, no policies
```

The browser never talks to Windmill or to the database. It holds no
credential and can reach exactly one endpoint. The visitor is told their
enquiry was received only after Windmill confirms the row exists — an HTTP 200
on its own is treated as a failure.

Each enquiry carries a `request_id` the browser generates and keeps across
retries, so a submission retried after an outage is stored exactly once.

## Stack

React 18 · TypeScript · Vite 5 · Tailwind CSS 3 · shadcn/ui components ·
Supabase (PostgreSQL + Edge Functions, Deno) · Windmill · GitHub Actions ·
GitHub Pages

No chatbot and no conversational UI: this is not a chat product (SOW section 2).

## Layout

```
.github/workflows/deploy.yml   build, check and publish — the only way to release
src/                           the site
  components/ContactForm.tsx   the form, request_id handling and retry behaviour
  lib/validation.ts            validation rules (client copy)
  lib/validation.test.ts       24 boundary tests, run on every release
supabase/
  migrations/                  table, constraints, RLS
  functions/contact-submit/    public Edge Function (authoritative validation)
windmill/
  contact_intake.ts            flow step, readable source
  contact_intake.flow.json     importable export
docs/                          setup, handover, test log, recording script
scripts/sync-windmill-flow.mjs regenerates the flow export from the source
```

## Local development

```bash
npm ci
cp .env.example .env.local     # point VITE_CONTACT_ENDPOINT at the deployed function
npm run dev
```

```bash
npm run build       # typecheck + production build
npx vitest run      # validation tests
npx tsc -b          # types only
```

## Deployment

Push to `main`. That is the only path to the live site: no manual upload, no
drag-and-drop, no bolt.diy one-click deploy. The workflow installs from the
lockfile, typechecks, runs the tests, builds, refuses to publish if anything
secret-shaped reached `dist/`, then deploys to Pages.

The Vite base path is derived from the repository name at build time, so
renaming or forking the repository needs no code change.

## Secrets

Nothing privileged is in this repository. `.env.example` lists the names and
shapes only.

| Value | Lives in |
|---|---|
| `VITE_CONTACT_ENDPOINT` | GitHub Actions variable — public URL, no key |
| `ALLOWED_ORIGIN`, `WINDMILL_WEBHOOK_URL`, `WINDMILL_TOKEN` | Supabase Edge Function secrets |
| Supabase `service_role` key | Windmill resource `f/web001/supabase_admin` |

Rotation procedures: [docs/HANDOVER.md](docs/HANDOVER.md#5-credential-rotation-and-transfer).

## Status

GitHub Pages is temporary pilot hosting. The pilot stays available for at
least 72 hours after handover. SAFI retains sole authority for final
acceptance.
