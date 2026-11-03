#!/usr/bin/env bash
#
# Local end-to-end harness.
#
# Boots the whole request chain on this machine and drives it with a real
# browser, so the behaviour T3, T4, T5 and T7 check can be verified without
# touching the live Supabase project or Windmill workspace.
#
# What is real: the frontend build, the Edge Function (run under Deno exactly
# as deployed) and the Windmill flow step (the same file that is embedded in
# the flow export).
#
# What is substituted: PostgREST and the Windmill job runner, by small mocks
# in servers.ts. The PostgREST mock enforces the request_id primary key and
# implements Prefer: resolution=ignore-duplicates the way PostgREST does.
#
# Passing here is necessary, not sufficient. It does not replace T1-T8 against
# the deployed system; it catches regressions before you get there.
#
# Requires: node 20+, bun, deno, and playwright with chromium.
#   npm i -g bun deno
#   npx playwright install chromium
#
# Usage, from the repository root:
#   bash harness/run.sh
#
set -euo pipefail

HARNESS="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT="$(cd "$HARNESS/.." && pwd)"
WORK="$HARNESS/.work"

for cmd in node bun deno; do
  command -v "$cmd" >/dev/null 2>&1 || { echo "missing required command: $cmd" >&2; exit 1; }
done

cleanup() {
  for p in "${PIDS[@]:-}"; do kill "$p" 2>/dev/null || true; done
}
trap cleanup EXIT
PIDS=()

rm -rf "$WORK"
mkdir -p "$WORK/node_modules/windmill-client"

# Stub windmill-client so the real flow step can run outside Windmill. It
# hands back a resource pointing at the mock PostgREST.
cat > "$WORK/node_modules/windmill-client/package.json" <<'JSON'
{ "name": "windmill-client", "version": "0.0.0-harness", "type": "module", "main": "index.js" }
JSON
cat > "$WORK/node_modules/windmill-client/index.js" <<'JS'
export async function getResource(path) {
  if (path !== 'f/web001/supabase_admin') {
    throw new Error(`unexpected resource path: ${path}`)
  }
  return { url: process.env.MOCK_SUPABASE_URL, key: 'mock-service-role-key' }
}
JS

# The flow step, copied byte for byte from what ships.
cp "$PROJECT/windmill/contact_intake.ts" "$WORK/contact_intake.ts"
cp "$HARNESS/servers.ts" "$WORK/servers.ts"
cp "$HARNESS/driver.mjs" "$WORK/driver.mjs"

export MOCK_SUPABASE_URL=http://127.0.0.1:54321
export HARNESS_WORK="$WORK"

cd "$WORK"
bun run servers.ts > "$WORK/servers.log" 2>&1 &
PIDS+=($!)

# The real Edge Function, unmodified, under Deno. Deno.serve listens on 8000.
cd "$PROJECT/supabase/functions/contact-submit"
WINDMILL_WEBHOOK_URL="http://127.0.0.1:54322/api/w/demo/jobs/run_wait_result/f/web001/contact_intake" \
WINDMILL_TOKEN="mock-windmill-token" \
ALLOWED_ORIGIN="http://localhost:4173" \
WINDMILL_TIMEOUT_MS="8000" \
deno run --allow-net --allow-env index.ts > "$WORK/edge.log" 2>&1 &
PIDS+=($!)

# Build the site pointing at the local Edge Function.
cd "$PROJECT"
VITE_BASE_PATH=/ \
VITE_CONTACT_ENDPOINT=http://127.0.0.1:8000/ \
npx vite build --outDir "$WORK/dist" --emptyOutDir > "$WORK/build.log" 2>&1

for _ in $(seq 1 40); do
  if curl -fsS http://127.0.0.1:54322/__control/state >/dev/null 2>&1 \
     && [ "$(curl -fsS -o /dev/null -w '%{http_code}' -X OPTIONS http://127.0.0.1:8000/ || true)" = "204" ]; then
    break
  fi
  sleep 0.5
done

cd "$WORK"
node driver.mjs
