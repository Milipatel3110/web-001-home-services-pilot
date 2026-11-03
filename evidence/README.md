# Evidence

Captures backing the T1–T8 results in [../docs/TEST_LOG.md](../docs/TEST_LOG.md).

## Naming

`T<n>-<short-description>.<ext>`, for example:

```
T1-live-version-a-desktop.png
T1-live-version-a-mobile.png
T2-actions-run-release-a.png
T3-browser-submission.png
T3-supabase-row.png
T3-windmill-run.png
T4-validation-errors.png
T4-row-count-unchanged.png
T5-rls-denied-anon.png
T5-network-tab-no-credentials.png
T6-actions-run-release-b.png
T6-version-b-same-url.png
T7-duplicate-single-row.png
T7-outage-truthful-error.png
T8-operator-timing.png
web-001-walkthrough.mp4
```

## Before adding anything here

- [ ] Submitted names, emails and message bodies are redacted
- [ ] No API key, token, service_role value or Edge secret is visible
- [ ] No Supabase Settings → API page in any frame
- [ ] No `.env` file contents
- [ ] Browser bookmarks and notifications are not revealing anything

`request_id` values are random and opaque. They are safe to show, and showing
them is what ties the evidence together.

Raw unredacted captures belong in `evidence/raw/`, which is gitignored. Do not
commit them.

## The recording

`web-001-walkthrough.mp4` is required by SOW section 8: one uninterrupted
2–3 minute take. See [../docs/RECORDING_SCRIPT.md](../docs/RECORDING_SCRIPT.md).
