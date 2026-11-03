#!/usr/bin/env bash
#
# Wires the deployed pieces together once Supabase and Windmill exist.
#
# Fill in the four values below, then:
#   bash scripts/finish-setup.sh
#
# It deploys the Edge Function with its secrets, sets the GitHub Actions
# variable, re-runs the deployment, and finishes by running the automated
# T4/T7 checks against the live endpoint.
#
# Nothing here is committed. The values you paste stay on your machine and in
# the two services' own secret stores.
#
set -euo pipefail

# ───────────────────────────────────────────────────────────────────────────
# FILL THESE IN
# ───────────────────────────────────────────────────────────────────────────

# Supabase project ref — the subdomain in https://<ref>.supabase.co
SUPABASE_PROJECT_REF="ffclvsmctstpibdifjgu"

# Windmill synchronous flow webhook. run_wait_result is what makes it
# synchronous: it returns the flow's RESULT, not a job id. An async endpoint
# would let the function claim success before anything was stored.
#   https://<host>/api/w/<workspace>/jobs/run_wait_result/f/web001/contact_intake
WINDMILL_WEBHOOK_URL="https://app.windmill.dev/api/w/web001/jobs/run_wait_result/f/u/mili/contact_intake"

# Windmill token, scoped to running that flow. Shown once when you create it.
WINDMILL_TOKEN="REPLACE_ME"

# The published origin — scheme and host only. No path, no trailing slash.
ALLOWED_ORIGIN="https://milipatel3110.github.io"

# GitHub repository
GH_REPO="Milipatel3110/web-001-home-services-pilot"

# ───────────────────────────────────────────────────────────────────────────

ENDPOINT="https://${SUPABASE_PROJECT_REF}.supabase.co/functions/v1/contact-submit"

for v in WINDMILL_WEBHOOK_URL WINDMILL_TOKEN; do
  if [[ "${!v}" == *REPLACE* ]]; then
    echo "error: $v still has a placeholder in it. Edit this file first." >&2
    exit 1
  fi
done

command -v supabase >/dev/null 2>&1 || {
  echo "The Supabase CLI is not installed. Install it with one of:" >&2
  echo "  npm install -g supabase" >&2
  echo "  brew install supabase/tap/supabase" >&2
  exit 1
}

echo "==> Linking the Supabase project"
supabase link --project-ref "$SUPABASE_PROJECT_REF"

echo "==> Setting Edge Function secrets"
# These live in Supabase's secret store, never in Git and never in the bundle.
supabase secrets set \
  WINDMILL_WEBHOOK_URL="$WINDMILL_WEBHOOK_URL" \
  WINDMILL_TOKEN="$WINDMILL_TOKEN" \
  ALLOWED_ORIGIN="$ALLOWED_ORIGIN" \
  WINDMILL_TIMEOUT_MS="20000"

echo "==> Deploying the Edge Function (public, no JWT)"
# Public on purpose: anonymous visitors must be able to submit. It compensates
# with full server-side validation and by holding no database credential.
supabase functions deploy contact-submit --no-verify-jwt

echo "==> Smoke-testing the deployed function"
RID="$(uuidgen 2>/dev/null | tr 'A-Z' 'a-z' || python3 -c 'import uuid;print(uuid.uuid4())')"
SMOKE="$(curl -s -w $'\n%{http_code}' -X POST "$ENDPOINT" \
  -H 'Content-Type: application/json' \
  -d "{\"request_id\":\"$RID\",\"name\":\"Setup Smoke\",\"email\":\"smoke@example.com\",\"message\":\"Confirming the chain end to end.\",\"website\":\"\"}")"
CODE="$(printf '%s' "$SMOKE" | tail -n1)"

if [ "$CODE" != "200" ]; then
  echo
  echo "The function is deployed but the chain did not confirm storage (HTTP $CODE)."
  printf '%s\n' "$(printf '%s' "$SMOKE" | head -n-1)"
  echo
  echo "This is the function telling the truth, not a bug. Check, in order:"
  echo "  1. Windmill > Runs — did a run appear? did it fail?"
  echo "  2. The flow's Supabase resource — right url and service_role key?"
  echo "  3. WINDMILL_WEBHOOK_URL — must contain run_wait_result"
  echo "  4. Supabase > Edge Functions > contact-submit > Logs"
  exit 1
fi

echo "    stored — request_id $RID"
echo "    delete that row in Supabase once you have seen it"

echo "==> Setting the GitHub Actions variable"
if command -v gh >/dev/null 2>&1; then
  gh variable set VITE_CONTACT_ENDPOINT --repo "$GH_REPO" --body "$ENDPOINT"
  echo "==> Re-running the deployment so the site picks it up"
  WID="$(gh api "repos/$GH_REPO/actions/workflows" --jq '.workflows[0].id')"
  gh api -X POST "repos/$GH_REPO/actions/workflows/$WID/dispatches" -f ref=main
  echo "    dispatched — watch it with:  gh run watch --repo $GH_REPO"
else
  echo "    gh not installed. Set it by hand instead:"
  echo "      https://github.com/$GH_REPO/settings/variables/actions"
  echo "      Name:  VITE_CONTACT_ENDPOINT"
  echo "      Value: $ENDPOINT"
  echo "    then re-run the deploy workflow from the Actions tab."
fi

cat <<EOF

────────────────────────────────────────────────────────────
Wired up.

  Live site   https://milipatel3110.github.io/web-001-home-services-pilot/
  Endpoint    $ENDPOINT

Next:
  bash scripts/verify-live.sh "$ENDPOINT"     # automated T4 and T7
  then T3 by hand in the browser, and T6, T8 and the recording.
────────────────────────────────────────────────────────────
EOF
