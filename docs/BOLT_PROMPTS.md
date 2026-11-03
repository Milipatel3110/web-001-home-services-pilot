# bolt.diy prompts, both versions

Both code versions are produced with open-source
[stackblitz-labs/bolt.diy](https://github.com/stackblitz-labs/bolt.diy), run
locally against a Developer-funded model (SOW section 2). bolt.diy's one-click
deploy is **not** used: publishing happens only through GitHub Actions
(SOW section 9).

Record the model and bolt.diy commit you actually used, because the generated
output varies between models:

| | |
|---|---|
| bolt.diy version / commit | `__________` |
| Model used | `__________` |
| Date generated | `__________` |

---

## Running bolt.diy

```bash
git clone https://github.com/stackblitz-labs/bolt.diy
cd bolt.diy
cp .env.example .env.local        # add ONE provider key, e.g. ANTHROPIC_API_KEY
pnpm install
pnpm run dev                      # http://localhost:5173
```

The key goes in bolt.diy's own `.env.local`, which is never committed and has
nothing to do with this repository's `.env.example`.

---

## Version A prompt

> Build a single-page business website called "Sample Home Services — Demo"
> using React, TypeScript, Vite, Tailwind CSS and shadcn/ui.
>
> It must have:
> - A hero section with the business name, a one-paragraph description and two
>   buttons that scroll to the services and contact sections.
> - Three service cards: "Small Repairs", "Furniture Assembly" and
>   "Home Maintenance", each with a short description and three bullet points.
> - A clearly visible notice reading exactly "Demonstration only, no services
>   offered", shown as a banner at the top of the page and repeated above the
>   contact form.
> - A contact form with Name, Email and Message fields and a submit button
>   labelled "Contact Us". Validate on the client: name 2 to 80 characters,
>   email a valid address up to 254 characters, message 10 to 1000 characters.
>   Show a clear error message under each invalid field.
> - An invisible honeypot field named "website" that real visitors never see.
> - A UUID generated per enquiry and held across retries, sent as request_id.
>
> On submit, POST JSON `{request_id, name, email, message, website}` to the URL
> in `import.meta.env.VITE_CONTACT_ENDPOINT`. Show a success message only when
> the response body is `{"status":"received"}` with a matching request_id.
> On any other response or a network error, show a failure message that says
> nothing was saved, and keep the same request_id so a retry is not a duplicate.
> Do not call any database or workflow service directly from the browser.
>
> The page must be responsive on desktop and phone. This is not a chat product,
> so do not add a chatbot or any conversational UI.

Review the generated code before committing it. bolt.diy output is a starting
point, not a release: the version in this repository has had the request chain,
the retry semantics and the honeypot tightened by hand, which is normal and
expected.

---

## Version B prompt

Give bolt.diy exactly this instruction, as fixed by SOW section 4:

> Add a Weekend Appointments callout above the contact form and change the
> submit button to Request a Callback; keep the form operational.

Expected result, and what the pilot was verified against:

- A new `src/components/WeekendCallout.tsx` rendering a "Weekend Appointments"
  heading and a short availability line.
- That component rendered in `src/App.tsx` directly above `<ContactForm />`.
- The submit button label changed from `Contact Us` to `Request a Callback`.
- Everything else untouched. The request chain, validation, honeypot and
  request_id behaviour must still work, which is what "keep the form
  operational" means and what T6 checks.

### If bolt.diy's output drifts

The verified version of this change is committed as
[`docs/version-b.patch`](./version-b.patch). Use it as the reference for what
"correct" looks like. If the generated output is wrong or breaks the form, fix
it, or apply the reference patch instead:

```bash
git apply docs/version-b.patch
npm run build          # must pass before committing
```

Either way, the commit that lands on `main` is release B, and the Actions run
it triggers is the second automated deployment.

### Committing release B

```bash
git add -A
git commit -m "Version B: Weekend Appointments callout, Request a Callback CTA"
git push origin main
git rev-parse HEAD     # record this SHA in docs/TEST_LOG.md as release B
```

Do not edit the published site any other way. No manual upload, no
drag-and-drop, no bolt.diy one-click deploy.
