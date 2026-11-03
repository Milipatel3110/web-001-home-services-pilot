# How to demo this

Written for presenting the pilot to people who may ask hard questions, and
for doing it without needing to be technical.

Read this once before the demo. The language below is the language to use.

---

## The one sentence version

> We built a working business website using an AI builder, and connected its
> contact form to a real database, so that when a visitor sends an enquiry it
> actually gets stored and we can prove it.

That is enough for most people.

---

## The sixty second version

If they want more:

> The site itself is a demonstration for a fictional handyman business. The
> interesting part is not the design, it is what happens when someone presses
> the button.
>
> The enquiry does not go straight into the database. It goes to a small
> gatekeeper program that checks it, then to a workflow tool that does the
> actual saving. The website itself has no access to the database at all.
> That means if someone attacked the website, they would get nothing useful.
>
> The other thing worth showing is that we changed the site by typing a plain
> English instruction into the AI builder, and it rebuilt and republished
> itself automatically. Nobody uploaded a file.

---

## The five tools, in plain words

You will be asked what these are. Short answers:

**bolt.diy**
> An AI website builder. You describe what you want in English and it writes
> the code. It is open source and runs on my own machine.

**GitHub**
> Where the code is stored. It also has a robot that watches for changes,
> rebuilds the site and publishes it automatically.

**Supabase**
> The database, where enquiries are stored. It also runs the small gatekeeper
> program that checks every submission before anything is saved.

**Windmill**
> A workflow tool. It is the only thing allowed to write to the database.

**GitHub Pages**
> Where the website is hosted. It is temporary, for the pilot only.

### Why so many pieces?

This is the most likely question. The answer:

> Security, mainly. The website is public, so anyone can look at its code. If
> the website could write to the database directly, its password would have to
> be inside the website, where anyone could find it. So instead the website
> can only talk to one gatekeeper, and only the gatekeeper and the workflow
> have the keys. Nothing sensitive is ever in the browser.

---

## The demo, step by step

Have these tabs open before you start, in one window:

1. The live site
2. Supabase table view
3. Windmill runs
4. GitHub Actions

Clear the test data first so the table starts empty:
`delete from contact_submissions;` in the Supabase SQL editor.

### 1. Show the site, about 30 seconds

Open https://milipatel3110.github.io/web-001-home-services-pilot/

Say:

> This is the demonstration site. A fictional handyman business, with three
> services and a contact form. The notice at the top says demonstration only,
> because this is a pilot and nothing here is a real offer.

Narrow the window or show it on your phone.

> It works on a phone as well.

### 2. Send an enquiry, about 45 seconds

Scroll to the form. **Type the details by hand.** Do not paste. People notice
pasting and it looks like you prepared the result in advance.

```
Name     Demo Tester
Email    demo@example.com
Message  Checking the system works end to end.
```

Press the button. Wait for the green panel.

Say:

> That reference number is the important part. It was generated in the
> browser, and we can now follow it through the whole system.

Read the first few characters of the reference out loud.

### 3. Show the workflow, about 20 seconds

Switch to Windmill, refresh, open the top run.

Say:

> This is the workflow that did the saving. It finished successfully and it is
> reporting back the same reference number.

Point at `"stored": true`.

> That matters, and I will come back to it.

### 4. Show the database, about 20 seconds

Switch to Supabase, refresh the table.

Say:

> And here is the enquiry itself, stored. Same reference, same name, same
> message, with the time it arrived.

### 5. Show that bad data is refused, about 30 seconds

Go back to the site, clear the form, press the button with everything empty.

Say:

> If I submit nothing, it refuses and tells me why, field by field. Nothing
> was sent.

Refresh the Supabase table.

> And nothing was added. The checking is real, not just a message on the
> screen.

### 6. The AI change, if you have time

This is the part that usually impresses people most. If you have already
recorded it, you can show the recording instead of doing it live.

Say:

> The site was changed by typing this instruction into the AI builder, in
> plain English: "Add a Weekend Appointments callout above the contact form
> and change the submit button to Request a Callback."
>
> It rewrote the code, and publishing happened automatically. The address
> never changed. Nobody uploaded anything by hand.

Show the Weekend Appointments box and the renamed button on the live site.

---

## Questions you might get

**"What happens if the database goes down?"**

> The visitor is told their enquiry was not saved, which is the truth. The
> system never claims success it cannot confirm. And if they press the button
> again afterwards, it does not create a duplicate, because the enquiry keeps
> the same reference number until it succeeds.

This is a strong answer. Give it confidently, it was tested.

**"Is this secure?"**

> The website holds no passwords or keys at all. It can reach exactly one
> address and nothing else. The database refuses any direct access, and we
> tested that by trying it. The build also refuses to publish if anything
> secret-looking ends up in the website files.

**"Can someone spam the form?"**

> There is a hidden field that real people never see and never fill in.
> Anything that fills it in is automated, and gets refused. Full spam
> protection was out of scope for a pilot.

**"How much does it cost to run?"**

> Nothing at the moment. Everything is on free tiers. There was a small
> one-off cost of a few cents for the AI that generated the code.

**"Is this production ready?"**

> No, and it was not meant to be. The hosting is temporary and the free
> accounts have limits, such as the database pausing if it sits unused for a
> week. It is a pilot that proves the approach works. The documentation covers
> what moving it to production would involve.

Say this plainly. Claiming more than you have is what gets picked apart.

**"Who owns it? What if you are unavailable?"**

> Everything needed to rebuild it from scratch is written down in the
> repository, and none of it depends on me. A different person with new
> accounts could recreate the whole thing by following the setup guide.

**"How long did it take?"**

> The build is scoped to six hours. Setting up the accounts sits outside that.

**Anything you do not know**

> Good question, I do not have that off the top of my head. It is in the
> documentation and I will follow up.

Never guess. One confident wrong answer undoes a good demo.

---

## If something breaks live

It probably will not, but assume it might.

**The form shows a red error.** Do not panic, and do not apologise too much.
Say:

> That is actually the behaviour I wanted to show you. It is telling me it
> could not save the enquiry rather than pretending it worked. Let me try
> again.

Press the button again. It will usually succeed, and you have just
demonstrated the retry working without creating a duplicate, which is a
feature.

**The site does not load.** The free database pauses after about a week of
inactivity. Open the Supabase dashboard and resume the project, then carry on.
Mention it as a known free tier limitation, which it is.

**You get asked something technical you cannot answer.** Offer the
documentation and move on. You do not need to know how the code works to show
that the system works.

---

## The three things to get across

If the demo goes sideways and you only land three points, make them these:

1. A real enquiry typed into a real browser reaches a real database, and we
   can trace it by its reference number
2. The website holds no keys and cannot touch the database itself
3. The change was made by typing an English sentence, and publishing happened
   on its own

Everything else is detail.
