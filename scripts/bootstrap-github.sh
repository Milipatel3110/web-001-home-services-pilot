#!/usr/bin/env bash
#
# One-shot GitHub setup for WEB-001.
#
# Creates the repository, pushes release A, points Pages at GitHub Actions,
# optionally sets the contact endpoint variable, waits for the first
# deployment and prints the release A SHA and Actions run URL ready for
# docs/TEST_LOG.md.
#
# This is steps 1 and 5 of docs/SETUP.md, automated. It does not touch
# Supabase or Windmill.
#
# Usage, from the repository root:
#
#   bash scripts/bootstrap-github.sh <repo-name> [contact-endpoint-url]
#
# Examples:
#   bash scripts/bootstrap-github.sh web-001-home-services-demo
#   bash scripts/bootstrap-github.sh web-001-home-services-demo \
#       https://abcdefgh.supabase.co/functions/v1/contact-submit
#
# Requires the GitHub CLI, signed in as the account that should own the repo:
#   gh auth login
#   gh auth status        # check WHICH account before running this
#
set -euo pipefail

REPO_NAME="${1:-}"
CONTACT_ENDPOINT="${2:-}"

if [ -z "$REPO_NAME" ]; then
  echo "usage: bash scripts/bootstrap-github.sh <repo-name> [contact-endpoint-url]" >&2
  exit 1
fi

command -v gh  >/dev/null 2>&1 || { echo "the GitHub CLI (gh) is not installed" >&2; exit 1; }
command -v git >/dev/null 2>&1 || { echo "git is not installed" >&2; exit 1; }

# ---------------------------------------------------------------------------
# Confirm the account before creating anything
# ---------------------------------------------------------------------------
if ! gh auth status >/dev/null 2>&1; then
  echo "gh is not signed in. Run:  gh auth login" >&2
  exit 1
fi

OWNER="$(gh api user --jq .login)"
echo
echo "  Account   $OWNER"
echo "  Repo      $OWNER/$REPO_NAME"
echo "  Live URL  https://$OWNER.github.io/$REPO_NAME/"
echo
read -r -p "Create and push to this account? [y/N] " reply
case "$reply" in
  [yY]*) ;;
  *) echo "Stopped. Switch accounts with: gh auth switch"; exit 1 ;;
esac

# ---------------------------------------------------------------------------
# Repository
# ---------------------------------------------------------------------------
if gh repo view "$OWNER/$REPO_NAME" >/dev/null 2>&1; then
  echo "==> Repository already exists, reusing it"
  if ! git remote get-url origin >/dev/null 2>&1; then
    git remote add origin "https://github.com/$OWNER/$REPO_NAME.git"
  fi
else
  echo "==> Creating $OWNER/$REPO_NAME"
  gh repo create "$OWNER/$REPO_NAME" --public --source=. --remote=origin
fi

# Make sure there is something to push.
if ! git rev-parse HEAD >/dev/null 2>&1; then
  echo "no commits in this working tree; commit before running this" >&2
  exit 1
fi

echo "==> Pushing main"
git branch -M main
git push -u origin main

RELEASE_A_SHA="$(git rev-parse HEAD)"

# ---------------------------------------------------------------------------
# Pages: source must be GitHub Actions, not a branch
# ---------------------------------------------------------------------------
echo "==> Setting Pages source to GitHub Actions"
if gh api "repos/$OWNER/$REPO_NAME/pages" >/dev/null 2>&1; then
  gh api -X PUT "repos/$OWNER/$REPO_NAME/pages" \
    -f "build_type=workflow" >/dev/null
else
  gh api -X POST "repos/$OWNER/$REPO_NAME/pages" \
    -f "build_type=workflow" >/dev/null
fi

# ---------------------------------------------------------------------------
# Public endpoint variable (safe to skip until Supabase exists)
# ---------------------------------------------------------------------------
if [ -n "$CONTACT_ENDPOINT" ]; then
  echo "==> Setting VITE_CONTACT_ENDPOINT"
  gh variable set VITE_CONTACT_ENDPOINT \
    --repo "$OWNER/$REPO_NAME" --body "$CONTACT_ENDPOINT"
else
  echo "==> Skipping VITE_CONTACT_ENDPOINT (not supplied)"
  echo "    The site will deploy and look correct, but the form cannot store"
  echo "    anything until Supabase exists. Set it later with:"
  echo "      gh variable set VITE_CONTACT_ENDPOINT --repo $OWNER/$REPO_NAME --body <url>"
  echo "    then re-run the workflow:"
  echo "      gh workflow run deploy.yml --repo $OWNER/$REPO_NAME"
fi

# ---------------------------------------------------------------------------
# Wait for the first run
# ---------------------------------------------------------------------------
echo "==> Waiting for the first Actions run"
RUN_ID=""
for _ in $(seq 1 30); do
  RUN_ID="$(gh run list --repo "$OWNER/$REPO_NAME" --limit 1 --json databaseId --jq '.[0].databaseId' 2>/dev/null || true)"
  [ -n "$RUN_ID" ] && [ "$RUN_ID" != "null" ] && break
  sleep 3
done

if [ -n "$RUN_ID" ] && [ "$RUN_ID" != "null" ]; then
  gh run watch "$RUN_ID" --repo "$OWNER/$REPO_NAME" --exit-status || {
    echo
    echo "The run did not succeed. Inspect it with:"
    echo "  gh run view $RUN_ID --repo $OWNER/$REPO_NAME --log-failed"
    exit 1
  }
  RUN_URL="https://github.com/$OWNER/$REPO_NAME/actions/runs/$RUN_ID"
else
  RUN_URL="(no run detected; check the Actions tab)"
fi

# ---------------------------------------------------------------------------
# Record for the test log
# ---------------------------------------------------------------------------
cat <<EOF

────────────────────────────────────────────────────────────
Release A — copy these into docs/TEST_LOG.md

  Live URL        https://$OWNER.github.io/$REPO_NAME/
  Release A SHA   $RELEASE_A_SHA
  Release A run   $RUN_URL

Next:
  1. Open the live URL and work through T1 and T2.
  2. Set up Supabase and Windmill — docs/SETUP.md sections 2 to 4.
  3. Set VITE_CONTACT_ENDPOINT, re-run the workflow, then T3 to T5.
  4. Generate version B in bolt.diy and push — docs/BOLT_PROMPTS.md.
────────────────────────────────────────────────────────────
EOF
