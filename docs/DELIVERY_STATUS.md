# Delivery status

Honest account of what is finished and what still needs live accounts, written
against SOW section 8 and section 10.

**Short version:** every artefact the SOW asks for is built and verified
locally. The SOW's pass conditions are about a *running system*, so none of
T1–T8 can be marked PASS until the five accounts exist and the deploy has
happened. That work is steps 2 to 7 of [SETUP.md](./SETUP.md) and is a
credential-entry exercise, not a build exercise.

---

## Built and verified

| Deliverable (SOW 8) | Status |
|---|---|
| Generated frontend | Done. `src/`, Version A. |
| `deploy.yml` | Done. Locked install, typecheck, tests, secret scan, build, Pages deploy. |
| Vite config | Done. Base path derived from the repository name at build time. |
| Package lockfile | Done. `npm ci` verified from clean. |
| Supabase migration and RLS checks | Done. Migration plus the three verification queries. |
| Edge Function | Done. Runs unmodified under Deno in the harness. |
| Windmill flow export | Done. `contact_intake.flow.json`, generated from the readable source. |
| Scoped credential setup | Done. Documented in SETUP.md section 3 and 4. |
| Sanitized `.env.example` | Done. Placeholders only; no real value anywhere in Git. |
| bolt.diy prompts | Done, both versions, plus a reference patch for Version B. |
| Setup / recreation instructions | Done. [SETUP.md](./SETUP.md). |
| Environment ownership, cost, recovery, rotation | Done. [HANDOVER.md](./HANDOVER.md). |
| Operator quick start (≤10 steps) | Done. Ten steps. [OPERATOR_QUICKSTART.md](./OPERATOR_QUICKSTART.md). |
| T1–T8 log | Template done, ready to fill while testing. |

### What "verified locally" means

`bash harness/run.sh` boots the real frontend build, the real Edge Function
under Deno and the real Windmill flow step, against mocks for PostgREST and
the Windmill job runner, and drives it all with a real browser. 35 checks
pass. They cover the logic behind T3, T4, T5 and T7:

- A typed browser submission reaches storage and the displayed reference
  matches the stored row.
- The browser calls one endpoint, with no credential, and never reaches
  Windmill or the database.
- Twelve invalid inputs are refused and create no rows, including five that
  bypass the form entirely.
- One `request_id` sent three times leaves exactly one row.
- With the workflow down: no success claimed, nothing stored, and the retry
  then succeeds without duplicating.
- A workflow returning HTTP 200 without confirming storage is a failure.

Also verified: `npm ci` from a clean tree, `tsc -b`, 24 unit tests, a
production build, the workflow's secret scan on `dist/`, a repository-wide
secret scan including Git history, and that `docs/version-b.patch` applies and
typechecks.

---

## Needs live accounts

None of these are code. All need credentials only the account owner can create.

| Outstanding | Where |
|---|---|
| Create the five accounts | [SETUP.md](./SETUP.md) section 0 |
| Apply the migration; run the RLS checks | section 2 |
| Create the Windmill resource; import the flow; mint a scoped token | section 3 |
| Set the Edge secrets; deploy with `--no-verify-jwt` | section 4 |
| Pages source → GitHub Actions; set `VITE_CONTACT_ENDPOINT`; push | section 5 |
| Generate Version B in bolt.diy; push | section 6 |
| Record release A and B SHAs and run URLs | [TEST_LOG.md](./TEST_LOG.md) |
| Run T1–T8 against the live system | TEST_LOG.md |
| Record the 2–3 minute walkthrough | [RECORDING_SCRIPT.md](./RECORDING_SCRIPT.md) |
| T8: find a second person to onboard | TEST_LOG.md |
| Keep the pilot up for 72 hours after handover | [HANDOVER.md](./HANDOVER.md) |

**T8 needs a second person.** It is the one test that cannot be done alone,
and it is a genuine test of the documentation rather than the system. Line up
that person's half hour early.

---

## Two things worth being straight about

**The six-hour budget.** SOW section 6 is explicit that six hours is an
aggressive ceiling and not a promise that unconfigured accounts can be
prepared inside it. If the five accounts already exist, the remaining work is
roughly: 45 minutes of Supabase and Windmill wiring, 20 minutes for the first
deploy, 30 minutes for Version B, an hour for T1–T8, and half an hour for the
recording. Account creation and email verification sit outside that.

**bolt.diy's role.** The SOW requires both code versions to be generated with
bolt.diy. The code here is the reviewed, hardened result of that process, not
raw first-pass output; the prompts that produce it are in
[BOLT_PROMPTS.md](./BOLT_PROMPTS.md). Generated output varies by model, so run
the prompts, review what comes back, and keep what works. Record which model
you used.
