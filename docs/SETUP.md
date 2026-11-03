# Setup and recreation guide

Everything needed to build this pilot from an empty account set, in order.
Follow it top to bottom and the system works; skip a step and the form will
fail truthfully rather than silently.

Nothing here needs a SAFI account, server or credential. All five services are
Developer-owned and Developer-funded (SOW section 3).

**Timing note.** The SOW's six-hour budget assumes the five accounts below
already exist. Creating them from scratch, including email verification and
any payment setup, is not included in that budget.

---

## 0. What you need first

| Service | Plan | Why |
|---|---|---|
| GitHub | Free | Repository, Actions, Pages |
| Supabase | Free | PostgreSQL + Edge Function |
| Windmill | Cloud free tier, or self-hosted | The `contact_intake` flow |
| bolt.diy | Self-hosted, free | Generates both code versions |
| An LLM provider | Pay-as-you-go | bolt.diy needs one model key |

Local tooling: Node 20+, npm, Git, the
[Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started),
and optionally the [Windmill CLI](https://www.windmill.dev/docs/advanced/cli).

The four values you will collect along the way, worth writing down as you go:

```
A  Supabase project ref        ____________________
B  Supabase service_role key   ____________________  (privileged)
C  Windmill webhook URL        ____________________
D  Windmill scoped token       ____________________  (privileged)
```

---

## 1. Repository

```bash
git clone <this repo> web-001-home-services-demo
cd web-001-home-services-demo
npm ci
npm run build          # confirm a clean build before changing anything
```

Push it to a **new** GitHub repository on `main`. The repository name becomes
part of the live URL and is picked up automatically by the build, so nothing
in the code needs editing if you choose a different name.

---

## 2. Supabase — database

1. Create a new Supabase project. Note the **project ref** (value **A**), the
   subdomain in `https://<ref>.supabase.co`.
2. Apply the migration, either way:

   ```bash
   supabase link --project-ref <A>
   supabase db push
   ```

   or paste `supabase/migrations/20261103090000_contact_submissions.sql` into
   **SQL Editor** and run it.

3. Confirm RLS took effect. In the SQL Editor:

   ```sql
   select relrowsecurity, relforcerowsecurity
   from pg_class where oid = 'public.contact_submissions'::regclass;
   -- expect: true, true

   select count(*) from pg_policies
   where schemaname = 'public' and tablename = 'contact_submissions';
   -- expect: 0
   ```

   RLS enabled with zero policies denies the `anon` and `authenticated` roles
   everything. That is the intended state, not an oversight, and it is what
   T5 verifies.

4. Copy the **service_role** key from **Settings → API** (value **B**).
   This key bypasses RLS. It goes into Windmill in step 3 and nowhere else:
   not into this repository, not into Edge Function secrets, not into a
   screenshot.

---

## 3. Windmill — the flow

1. Create a workspace. Note the workspace id.
2. **Resources → + Resource → supabase**, path exactly `f/web001/supabase_admin`:
   - `url` = `https://<A>.supabase.co`
   - `key` = the service_role key (**B**)

   A different path is fine, but then change `RESOURCE_PATH` at the top of
   `windmill/contact_intake.ts` and re-run `node scripts/sync-windmill-flow.mjs`.

3. **Flows → + New flow → ⋯ → Import from JSON**, and paste
   `windmill/contact_intake.flow.json`. Save it at path `f/web001/contact_intake`.

4. Test it from the Windmill UI with a throwaway UUID:

   ```json
   {
     "request_id": "11111111-2222-4333-8444-555555555555",
     "name": "Setup Check",
     "email": "setup@example.com",
     "message": "Verifying the flow writes one row."
   }
   ```

   Expect `{"stored": true, "request_id": "...", "duplicate": false, ...}`.
   Run it a **second** time unchanged: expect `"duplicate": true` and still
   exactly one row in the table. That is the duplicate guard T7 relies on.
   Delete the test row afterwards.

5. Build the synchronous webhook URL (value **C**):

   ```
   https://<your-windmill-host>/api/w/<workspace>/jobs/run_wait_result/f/web001/contact_intake
   ```

   `run_wait_result` is what makes the call synchronous: it returns the flow's
   result rather than a job id. An asynchronous endpoint would let the Edge
   Function claim success before anything was stored, which the SOW forbids.

6. **Settings → Tokens → + Token**, scoped to running this flow only. Copy it
   (value **D**). It is shown once.

---

## 4. Supabase — Edge Function

1. Work out your published origin. For a project site it is the **origin
   only**, no repository path:

   ```
   https://<your-github-user>.github.io
   ```

2. Set the secrets:

   ```bash
   supabase secrets set \
     WINDMILL_WEBHOOK_URL="<C>" \
     WINDMILL_TOKEN="<D>" \
     ALLOWED_ORIGIN="https://<your-github-user>.github.io"
   ```

3. Deploy, with JWT verification off:

   ```bash
   supabase functions deploy contact-submit --no-verify-jwt
   ```

   `supabase/config.toml` already sets `verify_jwt = false`; the flag makes it
   explicit at deploy time. The function must be public because anonymous
   visitors submit the form. It is not unguarded: it validates everything
   server-side, enforces the honeypot, caps the body size, and holds no
   database credential at all.

4. Smoke-test it from a terminal:

   ```bash
   curl -i -X POST \
     "https://<A>.supabase.co/functions/v1/contact-submit" \
     -H "Content-Type: application/json" \
     -d '{"request_id":"22222222-3333-4444-8555-666666666666",
          "name":"Curl Check","email":"curl@example.com",
          "message":"Checking the deployed function end to end.","website":""}'
   ```

   Expect `200` and `{"request_id":"...","status":"received"}`. A `502` means
   the chain reached Windmill but storage was not confirmed; check the function
   logs in the Supabase dashboard. Delete the test row afterwards.

---

## 5. GitHub — Actions and Pages

### The quick way

```bash
gh auth status                                   # check WHICH account first
bash scripts/bootstrap-github.sh web-001-home-services-demo
```

That creates the repository, pushes `main`, sets the Pages source to GitHub
Actions, waits for the first run and prints the release A SHA and run URL
ready for the test log. It asks for confirmation before creating anything, and
shows you the account it is about to use.

Pass the Edge Function URL as a second argument once Supabase exists, or set
it later as shown below.

### The manual way

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
   Not "Deploy from a branch". This is the setting that most often gets missed
   and it is why a workflow can go green while the old site stays live.

2. **Settings → Secrets and variables → Actions → Variables → New variable:**

   | Name | Value |
   |---|---|
   | `VITE_CONTACT_ENDPOINT` | `https://<A>.supabase.co/functions/v1/contact-submit` |

   A variable, not a secret: it is a public URL with no key, and it has to be
   readable in the browser bundle for the form to work at all.

3. Push to `main`, or run the workflow manually from the **Actions** tab. The
   run installs with `npm ci`, typechecks, runs the unit tests, builds, refuses
   to publish if anything secret-shaped is in `dist/`, and deploys.

4. The live URL is `https://<your-github-user>.github.io/<repo>/`.
   Record the commit SHA and the Actions run URL as **release A** in
   [TEST_LOG.md](./TEST_LOG.md).

### If the deployed page is blank

Almost always the Vite base path. Open the browser console: 404s on
`/assets/*.js` mean the base path and the repository name disagree. The
workflow derives the base from the repository name, so this usually means the
site was published some way other than the workflow.

---

## 6. Version B

Follow [BOLT_PROMPTS.md](./BOLT_PROMPTS.md). In short: give bolt.diy the fixed
instruction, review what it generates, commit, push. The push triggers the
second automated deployment to the same URL. Record **release B**.

---

## 7. Verify

Work through [TEST_LOG.md](./TEST_LOG.md), T1 to T8, and capture the evidence
as you go. T8 needs a second person, so plan for their time.

---

## Local development

```bash
cp .env.example .env.local     # set VITE_CONTACT_ENDPOINT to the deployed function
npm run dev
```

The dev server runs at `/`, not under the repository sub-path; that difference
is handled at build time and needs no local change. Submitting from
`localhost` will be refused by CORS unless you temporarily add that origin to
`ALLOWED_ORIGIN` — the validation itself works regardless.
