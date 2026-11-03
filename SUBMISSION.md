# What to submit

Everything SOW section 8 asks for, and where it is.

Work through the "Still to attach" list at the bottom before sending anything.

---

## The links

| | |
|---|---|
| Repository | https://github.com/Milipatel3110/web-001-home-services-pilot |
| Live site | https://milipatel3110.github.io/web-001-home-services-pilot/ |
| Release A SHA | `e14703c9a5be53185665119e2aa322a368b891a7` |
| Release A run | https://github.com/Milipatel3110/web-001-home-services-pilot/actions/runs/41603037714 |
| Release B SHA | `45af5a4231bd60c55843eb987a195497d76f7e47` |
| Release B run | https://github.com/Milipatel3110/web-001-home-services-pilot/actions/runs/41603155813 |
| Supabase project | `ffclvsmctstpibdifjgu` |
| Windmill flow | `u/mili/contact_intake` in workspace `web001` |

Release A is the first version, with the "Contact Us" button. Release B adds
the Weekend Appointments callout and renames the button to "Request a
Callback". Both were published by GitHub Actions to the same URL. Nothing was
uploaded by hand at any point.

---

## Section 8, item by item

| SOW asks for | Where it is | Done |
|---|---|---|
| Git repository URL and access-transfer method | Above, plus [docs/HANDOVER.md](docs/HANDOVER.md) section 3 | Yes |
| Both release SHAs and Actions run URLs | Above, and in the test log | Yes |
| Exact live HTTPS page URL | Above | Yes |
| bolt.diy prompts | [docs/BOLT_PROMPTS.md](docs/BOLT_PROMPTS.md) | Yes |
| Generated frontend | `src/`, `index.html` | Yes |
| deploy.yml | [.github/workflows/deploy.yml](.github/workflows/deploy.yml) | Yes |
| Vite config | [vite.config.ts](vite.config.ts) | Yes |
| Package lockfile | [package-lock.json](package-lock.json) | Yes |
| Supabase migration | [supabase/migrations/](supabase/migrations/) | Yes |
| RLS checks | In the migration, and T5 in the test log | Yes |
| Edge Function | [supabase/functions/contact-submit/](supabase/functions/contact-submit/) | Yes |
| Windmill flow export | [windmill/contact_intake.flow.json](windmill/contact_intake.flow.json) and `.yaml` | Yes |
| Scoped credential setup | [docs/SETUP.md](docs/SETUP.md) sections 3 and 4 | Yes |
| Sanitized .env.example | [.env.example](.env.example) | Yes |
| Setup and recreation instructions | [docs/SETUP.md](docs/SETUP.md) | Yes |
| Environment ownership | [docs/HANDOVER.md](docs/HANDOVER.md) section 3 | Yes |
| Cost | [docs/HANDOVER.md](docs/HANDOVER.md) section 4 | Yes |
| Recovery | [docs/HANDOVER.md](docs/HANDOVER.md) section 7 | Yes |
| Credential rotation | [docs/HANDOVER.md](docs/HANDOVER.md) section 5 | Yes |
| How SAFI can rebuild without the Developer | [docs/HANDOVER.md](docs/HANDOVER.md) section 6 | Yes |
| Operator quick start, 10 steps or fewer | [docs/OPERATOR_QUICKSTART.md](docs/OPERATOR_QUICKSTART.md), 10 steps | Yes |
| T1 to T8 log | [docs/TEST_LOG.md](docs/TEST_LOG.md) | Yes |
| Evidence | `evidence/` | **See below** |
| 2 to 3 minute screen recording | `evidence/web-001-walkthrough.mp4` | **See below** |
| Pilot available 72 hours after handover | Leave all three accounts running | **Your job** |

---

## Still to attach

All eight demonstrations pass. What is still missing is the captured
evidence, and the delivery is incomplete without it under SOW section 10.

### 1. The screen recording

One unbroken take, 2 to 3 minutes, saved as
`evidence/web-001-walkthrough.mp4`.

It has to show, in this order and without a cut: version A live, a real form
submission typed by hand, the Windmill run, the Supabase row, the bolt.diy
natural language edit, the successful version B Actions run, and the same URL
updated with the form still working.

[docs/RECORDING_SCRIPT.md](docs/RECORDING_SCRIPT.md) has the shot list, the
timings, and the five things that force a re-record. Rehearse once first. The
awkward part is the wait for the Actions run, and you cannot cut it out.

### 2. The evidence screenshots

Named `T1-...` through `T8-...` in `evidence/`. See
[evidence/README.md](evidence/README.md) for naming and the redaction
checklist.

Redact submitted names, emails and message text. Never capture an API key,
a token, or the Supabase API Keys page.

### 3. T8 supporting screenshots

T8 itself is done: a non-technical operator completed the onboarding in 20
minutes with no help, recorded in the test log. What is still missing is the
pair of screenshots taken on their screen, the success panel and the matching
Supabase row.

---

## Before you send it

- [ ] Recording attached and watched back in full
- [ ] Evidence screenshots in `evidence/`, all redacted
- [x] T8 completed and timed, with the operator named in the log
- [ ] Every PASS or FAIL in [docs/TEST_LOG.md](docs/TEST_LOG.md) filled in, no blanks left
- [ ] Test rows cleared: `delete from contact_submissions;`
- [ ] Live URL opens and the form still works
- [ ] All three accounts left running for at least 72 hours
- [ ] No key, token or secret anywhere in the repository, the bundle or the evidence

That last one is checked automatically on every deployment, and the build
refuses to publish if anything secret-shaped reaches the built site. Check the
evidence folder by eye as well, because screenshots are not scanned.

---

## Worth saying plainly in the handover

GitHub Pages is temporary pilot hosting, not production. The free tiers have
edges that matter if this runs longer than a pilot: a Supabase free project
pauses after about a week of inactivity, and Windmill's free tier caps monthly
executions. Neither bites at this volume, and both are reasons the pilot is a
pilot. [docs/HANDOVER.md](docs/HANDOVER.md) sections 4 and 7 cover it.

SAFI decides acceptance. This checklist covers what the SOW requires, not what
SAFI will conclude.
