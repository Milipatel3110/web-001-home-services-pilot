#!/usr/bin/env bash
#
# Automated T4 / T7 verification against a deployed contact-submit endpoint.
#
#   bash scripts/verify-live.sh https://<ref>.supabase.co/functions/v1/contact-submit
#
# Checks, all server-side and all without any credential:
#   T4  blank, too-short, too-long, malformed, oversized and honeypot
#       submissions are rejected, and a bad request_id is refused
#   T7  one request_id sent three times is accepted three times
#
# What it CANNOT check, because that needs the database:
#   - that the rejected submissions created zero rows
#   - that the repeated request_id left exactly one row
# Confirm both in the Supabase table editor and record them in the test log.
# This script tells you what the endpoint said; the row counts are the proof.
#
# T3 is deliberately NOT covered here: it requires a human typing into the
# live browser form, and an API call is explicitly not a substitute.
#
set -uo pipefail

ENDPOINT="${1:-}"
if [ -z "$ENDPOINT" ]; then
  echo "usage: bash scripts/verify-live.sh <contact-submit-url>" >&2
  exit 1
fi

pass=0
fail=0

uuid() {
  if command -v uuidgen >/dev/null 2>&1; then
    uuidgen | tr 'A-Z' 'a-z'
  else
    python3 -c 'import uuid; print(uuid.uuid4())'
  fi
}

# post <expected-status> <label> <json>
post() {
  local want="$1" label="$2" body="$3"
  local out code
  out="$(curl -s -w $'\n%{http_code}' -X POST "$ENDPOINT" \
          -H 'Content-Type: application/json' \
          --data "$body" 2>/dev/null)"
  code="$(printf '%s' "$out" | tail -n1)"
  if [ "$code" = "$want" ]; then
    pass=$((pass + 1)); printf '  PASS  %-46s (%s)\n' "$label" "$code"
  else
    fail=$((fail + 1)); printf '  FAIL  %-46s (got %s, wanted %s)\n' "$label" "$code" "$want"
    printf '        %s\n' "$(printf '%s' "$out" | head -n-1 | head -c 180)"
  fi
}

big() { printf 'x%.0s' $(seq 1 "$1"); }

echo
echo "Endpoint: $ENDPOINT"
echo
echo "T4 — invalid input is rejected server-side"

post 400 "all fields blank" \
  "{\"request_id\":\"$(uuid)\",\"name\":\"\",\"email\":\"\",\"message\":\"\",\"website\":\"\"}"

post 400 "name too short" \
  "{\"request_id\":\"$(uuid)\",\"name\":\"A\",\"email\":\"a@example.com\",\"message\":\"A long enough message here.\",\"website\":\"\"}"

post 400 "name too long (81)" \
  "{\"request_id\":\"$(uuid)\",\"name\":\"$(big 81)\",\"email\":\"a@example.com\",\"message\":\"A long enough message here.\",\"website\":\"\"}"

post 400 "malformed email" \
  "{\"request_id\":\"$(uuid)\",\"name\":\"Valid Name\",\"email\":\"not-an-email\",\"message\":\"A long enough message here.\",\"website\":\"\"}"

post 400 "message too short" \
  "{\"request_id\":\"$(uuid)\",\"name\":\"Valid Name\",\"email\":\"a@example.com\",\"message\":\"hi\",\"website\":\"\"}"

post 400 "message too long (1001)" \
  "{\"request_id\":\"$(uuid)\",\"name\":\"Valid Name\",\"email\":\"a@example.com\",\"message\":\"$(big 1001)\",\"website\":\"\"}"

post 400 "whitespace-only fields" \
  "{\"request_id\":\"$(uuid)\",\"name\":\"   \",\"email\":\"  \",\"message\":\"     \",\"website\":\"\"}"

post 400 "honeypot filled" \
  "{\"request_id\":\"$(uuid)\",\"name\":\"Bot Test\",\"email\":\"bot@example.com\",\"message\":\"This should be refused.\",\"website\":\"http://spam.example\"}"

post 400 "malformed request_id" \
  "{\"request_id\":\"not-a-uuid\",\"name\":\"Bad Id\",\"email\":\"a@example.com\",\"message\":\"This should be refused.\",\"website\":\"\"}"

post 413 "oversized body" \
  "{\"request_id\":\"$(uuid)\",\"name\":\"Big\",\"email\":\"a@example.com\",\"message\":\"$(big 20000)\",\"website\":\"\"}"

echo
echo "T7 part 1 — one request_id, sent three times"

RID="$(uuid)"
DUP="{\"request_id\":\"$RID\",\"name\":\"Duplicate Test\",\"email\":\"dup@example.com\",\"message\":\"Sent three times with one request_id.\",\"website\":\"\"}"
for i in 1 2 3; do
  post 200 "attempt $i accepted" "$DUP"
done

echo
echo "────────────────────────────────────────────────────────────"
echo "$pass passed, $fail failed"
echo
echo "Now confirm in Supabase (the script cannot see your database):"
echo
echo "  select count(*) from contact_submissions"
echo "   where request_id = '$RID';"
echo "  -- must return exactly 1"
echo
echo "  select count(*) from contact_submissions;"
echo "  -- must be unchanged by the T4 cases above"
echo
echo "Then delete the duplicate-test row and record the results in"
echo "docs/TEST_LOG.md. T3 still needs a human at the live form."
echo "────────────────────────────────────────────────────────────"

[ "$fail" -eq 0 ] || exit 1
