# Operational handover

SOW section 8. Everything SAFI needs to run, inspect, move or shut down this
pilot without the Developer.

---

## 1. What was delivered

| Item | Where |
|---|---|
| Git repository | https://github.com/Milipatel3110/web-001-home-services-pilot |
| Live site | https://milipatel3110.github.io/web-001-home-services-pilot/ |
| Release A SHA | `e14703c9a5be53185665119e2aa322a368b891a7` |
| Release A Actions run | `________` |
| Release B SHA | `45af5a4231bd60c55843eb987a195497d76f7e47` |
| Release B Actions run | `________` |
| bolt.diy prompts | [BOLT_PROMPTS.md](./BOLT_PROMPTS.md) |
| Generated frontend | `src/`, `index.html` |
| Deploy workflow | `.github/workflows/deploy.yml` |
| Vite config | `vite.config.ts` |
| Lockfile | `package-lock.json` |
| SQL migration | `supabase/migrations/20261103090000_contact_submissions.sql` |
| Edge Function | `supabase/functions/contact-submit/index.ts` |
| Windmill flow export | `windmill/contact_intake.flow.json` |
| Sanitized env template | `.env.example` |
| Setup and recreation | [SETUP.md](./SETUP.md) |
| Operator quick start | [OPERATOR_QUICKSTART.md](./OPERATOR_QUICKSTART.md) |
| T1–T8 log | [TEST_LOG.md](./TEST_LOG.md) |
| Screen recording | `evidence/web-001-walkthrough.mp4` |

---

## 2. How it fits together

```
Visitor's browser
  │  POST {request_id, name, email, message, website}
  │  no credential attached
  ▼
Supabase Edge Function  contact-submit        public, verify_jwt = false
  │  validates everything server-side
  │  enforces the honeypot and the size cap
  │  POST + Bearer <scoped Windmill token>     ← secret lives only here
  ▼
Windmill flow  f/web001/contact_intake         private, synchronous
  │  reads the Supabase service_role key from a Windmill resource
  │  inserts one row, ignoring a repeated request_id
  │  returns {stored: true, request_id}        ← explicit, not just HTTP 200
  ▼
Supabase PostgreSQL  public.contact_submissions
     RLS enabled, no policies: anon and authenticated are denied everything
```

Two properties are worth stating plainly, because they are what the tests
actually check:

**The browser holds no credential.** It can reach exactly one endpoint, and
that endpoint cannot itself write to the database. Compromising the published
site yields nothing useful.

**Success is never assumed.** The Edge Function treats an HTTP 200 without
`{"stored": true}` as a failure, and the visitor is told nothing was saved.
A retry reuses the same `request_id`, which the database refuses to duplicate.

---

## 3. Environment ownership

Every account is Developer-owned and Developer-funded (SOW section 3). SAFI
supplied no AWS account, no server, no credential and no hosting platform.

| Service | Account | Role |
|---|---|---|
| GitHub | `__________` | Source, CI, temporary hosting |
| Supabase | `__________` | Database and Edge Function |
| Windmill | `__________` | Orchestration |
| LLM provider | `__________` | bolt.diy generation only |

GitHub Pages is **temporary pilot hosting**, not a production platform. The
pilot stays available for at least 72 hours after handover.

**Transferring ownership.** GitHub: Settings → General → Transfer ownership,
or fork into a SAFI organization. Supabase: Settings → General → Transfer
project, which requires a paid organization on the receiving side; otherwise
rebuild with section 6. Windmill: invite a SAFI admin to the workspace, or
import the flow export into a SAFI workspace.

---

## 4. Running cost

| Service | Tier | Cost at pilot volume |
|---|---|---|
| GitHub (public repo, Actions, Pages) | Free | 0 |
| Supabase | Free | 0 |
| Windmill | Free tier or self-hosted | 0 |
| LLM provider | Pay as you go | A few cents in total, one-off |

Nothing recurring. Fill in actual figures before handover.

The free tiers have real edges worth knowing: a Supabase free project pauses
after a week of inactivity and must be resumed from the dashboard, GitHub
Pages has a soft bandwidth limit, and Windmill's free tier caps monthly
executions. None of these bite at pilot volume, and all of them are reasons
this is a pilot rather than production.

---

## 5. Credential rotation and transfer

Four credentials exist. Two are privileged.

| Credential | Lives in | Privileged |
|---|---|---|
| `VITE_CONTACT_ENDPOINT` | GitHub Actions **variable** | No, public URL |
| `ALLOWED_ORIGIN` | Supabase Edge secret | No |
| `WINDMILL_TOKEN` | Supabase Edge secret | **Yes** |
| Supabase `service_role` key | Windmill resource `f/web001/supabase_admin` | **Yes** |

None are in Git. The build refuses to publish if anything secret-shaped
reaches `dist/`.

### Rotating the Windmill token

```bash
# 1. New token in Windmill: Settings > Tokens > + Token, scoped to the flow
# 2. Point the function at it
supabase secrets set WINDMILL_TOKEN="<new token>"
# 3. Redeploy so the new value is picked up
supabase functions deploy contact-submit --no-verify-jwt
# 4. Submit a test enquiry and confirm it stores
# 5. Revoke the old token in Windmill
```

### Rotating the Supabase service_role key

Supabase → Settings → API → roll the key. Then update `key` on the
`f/web001/supabase_admin` resource in Windmill and run the flow once from the
UI to confirm. Rolling this key invalidates every other use of it, so check
nothing else depends on it first.

### Handing credentials to SAFI

Do not put them in Git, email or chat. Grant dashboard access to a SAFI
account and let them mint their own, or pass values through a one-time secret
link and rotate afterwards. The procedures above are written so SAFI can rotate
everything the Developer has ever seen.

### If a key is exposed

Rotate it first and investigate second. Then check Supabase `contact_submissions`
for rows that no Windmill run accounts for, and revoke every Windmill token
issued before the rotation.

---

## 6. Rebuilding elsewhere, without the Developer

Nothing here is tied to the Developer's accounts. Everything needed is in the
repository.

1. Fork or clone the repository into a SAFI-owned GitHub account.
2. Create a SAFI Supabase project; apply the migration from
   `supabase/migrations/`.
3. Create a SAFI Windmill workspace; import
   `windmill/contact_intake.flow.json`; create the `supabase_admin` resource
   with the new project's service_role key.
4. Deploy `supabase/functions/contact-submit` with the new secrets.
5. Set the `VITE_CONTACT_ENDPOINT` repository variable; set Pages source to
   GitHub Actions; push.

[SETUP.md](./SETUP.md) is the step-by-step version of this. It assumes nothing
that is not in the repository.

**Moving off GitHub Pages.** The build output in `dist/` is static files.
Any static host serves them: S3 and CloudFront, Netlify, Cloudflare Pages,
nginx. Two things to change: set `VITE_BASE_PATH` to match the new path, or
`/` at a domain root, and update `ALLOWED_ORIGIN` in the Edge Function secrets
to the new origin.

---

## 7. Recovery

| Failure | Effect | Recovery |
|---|---|---|
| Supabase project paused (free tier inactivity) | Submissions fail truthfully | Resume from the dashboard. Data is retained. |
| Windmill down or token revoked | Submissions fail truthfully, nothing stored | Restore the flow or rotate the token. Visitors can retry; no duplicates. |
| Edge Function misconfigured | Form reports it is not configured | Re-set the secrets and redeploy. |
| Pages deploy fails | Previous version stays live | Fix the cause and re-run the workflow. |
| Repository lost | Site stays live but is unchangeable | Restore from a fork or clone; the lockfile makes the rebuild exact. |
| Database data lost | Stored enquiries gone | Free tier has no PITR. This is demonstration data only; no backup policy is in scope. |

The failure mode is consistent on purpose: when any part of the chain is
unavailable, the visitor is told nothing was saved, and nothing was.

---

## 8. Data handling

Demonstration data only. Real customer data was never in scope (SOW section 9)
and the site says so in two places on every page.

- Four fields are stored: `request_id`, `name`, `email`, `message`, plus a
  timestamp. No IP addresses, no cookies, no analytics, no tracking.
- No email is ever sent.
- Logs record `request_id` and outcome only; submitted content is never logged.
- Evidence must be redacted before sharing.

To clear everything after the pilot:

```sql
truncate table public.contact_submissions;
```

---

## 9. Shutting the pilot down

After the 72-hour window and SAFI's acceptance decision:

1. GitHub → Settings → Pages → unpublish, or make the repository private.
2. Revoke the Windmill token; archive or delete the flow.
3. Delete the Supabase Edge Function and project, or truncate the table and
   pause the project.
4. Revoke the LLM provider key used by bolt.diy.
5. Confirm with SAFI before deleting anything they may still want to inspect.
