# WEB-001, Sample Home Services demo

A one page demonstration website built with bolt.diy, published to GitHub
Pages by GitHub Actions, with a contact form that stores submissions through
a Supabase Edge Function and a Windmill flow into PostgreSQL.

Demonstration only. No services are offered and no real customer data is
involved.

| | |
|---|---|
| Live site | https://milipatel3110.github.io/web-001-home-services-pilot/ |
| Release A | `e14703c` |
| Release B | `45af5a4` |

## Where to start

| If you want to | Read |
|---|---|
| Check it works | [docs/OPERATOR_QUICKSTART.md](docs/OPERATOR_QUICKSTART.md), ten minutes |
| Present or demo it | [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) |
| Hand it in | [SUBMISSION.md](SUBMISSION.md) |
| Build it from empty accounts | [docs/SETUP.md](docs/SETUP.md) |
| Take ownership of it | [docs/HANDOVER.md](docs/HANDOVER.md) |
| See the test results | [docs/TEST_LOG.md](docs/TEST_LOG.md) |

## How a submission travels

```
Browser ──▶ Supabase Edge Function ──▶ Windmill flow ──▶ Supabase PostgreSQL
            contact-submit              contact_intake     contact_submissions
            public, validates           private, sync      RLS, no policies
```

Two things about this are worth knowing before you read the code.

The browser holds no credential. It can reach exactly one endpoint, and that
endpoint cannot write to the database itself. Compromising the published site
gets you nothing useful.

Success is never assumed. The Edge Function treats an HTTP 200 without an
explicit `{"stored": true}` as a failure, and tells the visitor nothing was
saved. Each enquiry carries a `request_id` the browser generates and keeps
across retries, so a submission retried after an outage is stored once rather
than twice.

## Stack

React 18, TypeScript, Vite 5, Tailwind CSS 3 and shadcn/ui components.
Supabase for PostgreSQL and Edge Functions. Windmill for orchestration.
GitHub Actions and GitHub Pages for build and hosting.

No chatbot and no conversational UI. This is not a chat product, so
assistant-ui is out of scope here.

## Layout

```
.github/workflows/deploy.yml   build, check and publish, the only way to release
src/
  components/ContactForm.tsx   the form, request_id handling, retry behaviour
  lib/validation.ts            validation rules, client copy
  lib/validation.test.ts       24 boundary tests, run on every release
supabase/
  migrations/                  table, constraints, RLS
  functions/contact-submit/    public Edge Function, authoritative validation
windmill/
  contact_intake.ts            flow step, readable source
  contact_intake.flow.yaml     importable export with input bindings
harness/                       local end to end test, 35 checks
scripts/                       setup and verification helpers
docs/                          setup, handover, test log, recording script
```

## Running it locally

```bash
npm ci
cp .env.example .env.local     # point VITE_CONTACT_ENDPOINT at the deployed function
npm run dev
```

```bash
npm run build       # typecheck and production build
npx vitest run      # validation tests
bash harness/run.sh # full chain against local mocks, 35 checks
```

The harness runs the real frontend build, the real Edge Function under Deno
and the real Windmill step, against mocks for PostgREST and the Windmill job
runner. It catches regressions before you get anywhere near the live system.
Passing it is necessary but not sufficient: it proves the code is right, not
that the deployment is configured right.

## Deployment

Push to `main`. That is the only path to the live site. No manual upload, no
drag and drop, no bolt.diy one click deploy.

The workflow installs from the lockfile, typechecks, runs the tests, builds,
refuses to publish if anything secret shaped reached the built output, then
deploys to Pages. The Vite base path comes from the repository name at build
time, so renaming or forking needs no code change.

## Secrets

Nothing privileged is in this repository. `.env.example` lists names and
shapes only.

| Value | Lives in |
|---|---|
| `VITE_CONTACT_ENDPOINT` | GitHub Actions variable, a public URL with no key |
| `ALLOWED_ORIGIN`, `WINDMILL_WEBHOOK_URL`, `WINDMILL_TOKEN` | Supabase Edge Function secrets |
| Supabase service role key | A Windmill resource, and nowhere else |

Rotation procedures are in
[docs/HANDOVER.md](docs/HANDOVER.md#5-credential-rotation-and-transfer).

## Status

GitHub Pages is temporary pilot hosting. The pilot stays up for at least 72
hours after handover. SAFI decides acceptance.
