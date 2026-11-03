# Screen recording script

SOW section 8 requires **one uninterrupted 2–3 minute screen recording**. Not
edited together from clips: a single continuous take. Cutting it is the one
thing that invalidates it, because continuity is what proves the steps really
followed each other.

Save as `evidence/web-001-walkthrough.mp4`.

---

## Before you press record

Rehearse once without recording. It is a tight three minutes and the awkward
part is always the wait for the Actions run.

- [ ] Close every unrelated tab, notification and messaging app
- [ ] Log out of personal accounts visible in a sidebar
- [ ] Tabs open and pre-loaded, in this order:
      live site · Supabase table editor · Windmill runs · bolt.diy · GitHub Actions
- [ ] Repository is at release A and the live site shows **Contact Us**
- [ ] The Version B change is **not** yet made
- [ ] Test data on a sticky note so you do not pause to invent it
- [ ] Zoom the browser to about 125% so text is readable when compressed
- [ ] **Nothing secret on screen**: no Settings → API page, no `.env`, no
      token field, no Edge secrets page. Check your bookmarks bar too.

Speak or type-annotate as you go. Silent recordings are hard to follow.

---

## The take

**0:00 — 0:20 · Version A is live**

Start on the live site. Show the URL bar clearly. Scroll slowly: hero, three
cards, the "Demonstration only" notice. Narrow the window or open device
emulation to show the mobile layout, then return to full width.

**0:20 — 0:50 · Submit a real enquiry**

Scroll to the form. **Type** the test data by hand, visibly. Do not paste;
pasting looks like seeded data and T3 exists specifically to rule that out.

```
Name     Demo Tester
Email    demo@example.com
Message  Recording the end to end walkthrough for handover.
```

Press **Contact Us**. Wait for the green panel. Zoom in on the reference and
read it aloud or highlight it.

**0:50 — 1:10 · Windmill**

Switch to the Windmill runs tab and refresh. Open the run at the top. Show
the status is succeeded and the result contains `"stored": true` with the
matching reference.

**1:10 — 1:30 · Supabase**

Switch to the table editor and refresh `contact_submissions`. The new row is
at the top. Show the `request_id` matches, and the name, email and message are
what you typed.

**1:30 — 2:00 · The bolt.diy change**

Switch to bolt.diy. Type the instruction in full, visibly:

> Add a Weekend Appointments callout above the contact form and change the
> submit button to Request a Callback; keep the form operational.

Let it generate. Show the diff briefly, then commit and push.

**2:00 — 2:35 · Release B deploys itself**

Switch to the GitHub Actions tab. The new run is already going. Show it
progressing through install, check, build and deploy, and reaching green. Say
the SHA aloud.

If the run is slow, keep narrating what is happening. Do not stop recording.

**2:35 — 3:00 · Same URL, updated, still working**

Return to the live site tab and hard-refresh. **Same URL in the bar** — point
at it. The Weekend Appointments callout is above the form and the button now
reads **Request a Callback**.

Submit once more, typing fresh data. Wait for the green panel. Switch to
Supabase, refresh, and show the second row.

Stop recording.

---

## After

- [ ] Watch it back in full
- [ ] 2–3 minutes, single continuous take
- [ ] No token, key or secret visible in any frame
- [ ] The URL is legible and identical before and after
- [ ] Both rows visible in Supabase
- [ ] Redact anything personal that crept in; if redaction needs cuts,
      re-record instead
- [ ] Delete the two demo rows from the database afterwards

## What makes it fail

Pasting form data instead of typing it. Cutting out the Actions wait. A
different URL before and after. An API keys page visible for even a second.
Any of these and the recording has to be done again.
