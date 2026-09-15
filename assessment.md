# assessment.md — ParkSG

**Name:** Shrividhya Srinivasan
**Live:** https://parksg-seven.vercel.app
**Repo:** https://github.com/vidhyasrinivasan65/parksg
**Health:** https://parksg-seven.vercel.app/api/health

**What it does:** shows live available car parking lots across HDB, LTA and URA
carparks in four of Singapore's busiest zones namely Orchard, Marina, HarbourFront and
Jurong Lake District which is sorted as emptiest first, so a driver can decide whether it is
worth driving there.

**Source:** LTA DataMall `CarParkAvailabilityv2`, updated every minute, fetched
server-side through `/api/carparks` so the credential never reaches the browser.



# Part A - Criteria I set for myself

## Front end

**F1. A stranger can tell what this is for within four seconds.**
Matters because a driver opens this while parked badly or at a junction. There is no
time to work out what they are looking at.
*Test:* show someone who has never seen it and ask what it does before they tap.

**F2. The main job needs no instructions and no scrolling.**
The one job is "which carpark near me has space." Four zone buttons sit above the fold.
*Test:* on a 380px phone screen, is a lot count visible without scrolling?

**F3. Every number on screen is one I can trace to a source.**
This product's entire value is that the number is true. A plausible fake is worse than
nothing, because the user drives there.
*Test:* pick any carpark on screen, call `/api/carparks?zone=X` and match it.

**F4. A full carpark reads as FULL, not as 0.**
At 8pm in Orchard most of the list is zero. A column of `0` scans as a broken app.
*Test:* find a zero-lot carpark and read what the card says.

**F5. Each of the four failure states shows a sentence a driver could act on.**
A spinner tells the user nothing about whether to wait, retry, or drive off.
*Test:* enable Airplane Mode and tap a zone.

**F6. It works one-handed on a phone.**
*Test:* open at 380px wide. Any horizontal scroll or tap target under 44px is a fail.

## Back end

**B1. The credential is unreachable from the browser and absent from the repo.**
The only mistake here with consequences outside the classroom.
*Test:* open DevTools Network and reload — the only domain listed should be
`parksg-seven.vercel.app`. Then search the GitHub repo for the key.

**B2. Someone who is not me can tell whether the service is healthy.**
*Test:* open `/api/health` and read `keyConfigured` and `upstreamStatus`.

**B3. `/api/health` reveals nothing about the credential beyond whether it exists.**
Not its length, not its first characters.
*Test:* read the response. It returns three fields and none of them touch the value.

**B4. A refusal from LTA produces their status, not a crash of mine.**
LTA returns 401 with `Content-Length: 0`, and calling `.json()` on an empty body
throws — which would turn their diagnosable 401 into my own opaque 500.
*Test:* code checks `response.ok` before reading the body.

**B5. I ask LTA no more often than the data actually changes.**
LTA updates once a minute; caching is set to `s-maxage=60`.
*Test:* read the Cache-Control header on `/api/carparks`.

**B6. The data shown is correct for the user the product is for.**
The same `CarParkID` appears with `LotType` "C" (car) and "Y" (motorcycle). Showing the
wrong row tells a driver a carpark is full when it has hundreds of car spaces.
*Test:* every `id` in the response ends in `-C`.

---

# Part B — How I did against them

| | Verdict | Evidence |
|---|---|---|
| **F1** | Not Tested | |
| **F2** | Met | Zone buttons and the first lot count are visible above the fold on iPhone. |
| **F3** | Met | HarbourFront showed Resorts World 2481; `/api/carparks?zone=Harbfront` returns the same. |
| **F4** | Met | Zero-lot carparks render the word FULL in red. |
| **F5** | **Partly met** | See below. |
| **F6** | Met | Tested on iPhone Safari, no horizontal scroll. |
| **B1** | Met | Key appears only as `process.env.LTA_ACCOUNT_KEY`. Searched the repo for the first six characters: zero results. `.env.example` holds a placeholder. |
| **B2** | Met | `{"keyConfigured":true,"upstreamStatus":200}`. |
| **B3** | Met | Three fields, none derived from the value. |
| **B4** | Met | `response.ok` checked before reading the body. |
| **B5** | Met | `s-maxage=60, stale-while-revalidate=120`. |
| **B6** | Met | Every returned `id` ends `-C`. Ids are `${CarParkID}-${LotType}` because `CarParkID` alone is not unique. |

## F5 — partly met and why

**Unreachable is genuinely verified.** With Airplane Mode on, tapping a zone produced
the sentence rather than a spinner. Screenshot attached.

One caveat I should state rather than let pass: the demo selector was also set to
`unreachable` in that screenshot, so it does not fully isolate the real code path from
the simulated one. I am confident the real path fired; the timestamp updated to 22:00
when the page re-ran — but the screenshot alone does not prove it.

**Empty has no real-world trigger.** It means the call succeeded and returned zero
carparks. With four fixed zones that always contain carparks, this cannot occur in
production. I verified it by simulation only and I am recording that as an untested
path rather than a passing one.

**Refused is untested against a real refusal.** I have never seen LTA return a non-2xx
to my deployed function. The handling exists in code and has never run.

So two of my four states have been proven and two have only been simulated. Marking
F5 as "met" would have been the easy thing and would not have survived anyone checking.

One more thing I should flag:-

The demo selector is still on the page. I moved it below the carpark list and relabelled
it, and I left it deliberately so the failure states can be inspected without waiting
for LTA to go down. But it is scaffolding visible to a user, and a stricter reading of
F1 says it undercuts "a stranger can tell what this is for."


---

# Part C — The six questions

## Q1. Where did the AI make me faster and by how much?

The front end for sure according to me. A four-zone interface with five distinct states, card layout and colour
logic arrived in minutes from one prompt. By hand that was most of a day and probably
a worse-looking day.

More useful than the speed was what it let me do with the time: because the screen
existed early, I could build it against fake data while my LTA key was still in the
email queue, and test all five states before the back end existed at all.

But some of it was slower. Setting the Vercel environment variable took four clicks by
hand; getting a model to talk me through it took longer than doing it. Anything
involving a form or a toggle was faster by hand.

## Q2. Where did it cost me time and whose fault was it?

The 401 error occupied the most time in my work. Twenty minutes convinced my key was wrong, when PowerShell had eaten part of
it before the request left my machine,`$` inside double quotes is a variable, so my
key arrived truncated and LTA correctly rejected it.

**Whose fault:** mine, but not in the way "user error" usually means. My instruction was
complete and the tool did exactly what I typed. The problem was that the error message
described LTA's view of the request, and the fault was one layer earlier, on my own
machine. No amount of better prompting would have surfaced that. The fix came from
someone suggesting a cause the error had given no evidence for.

The second cost was the Vercel redeploy — the variable was saved but the running build
had never seen it. That one was genuinely a gap in my knowledge, not a tooling problem.

## Q3. Did it hand me something that looked right and wasn't?

Yes,
The same `CarParkID` appears twice in LTA's feed with different `LotType` values —
"C" for cars, "Y" for motorcycles. Angullia Park comes back as both `Y: 0` and
`C: 224`. Without filtering, ParkSG would have displayed **"ANGULLIA PARK — FULL"** to
a driver who could have parked in one of 224 free spaces.

Nothing would have errored. No number would have looked odd. The app would have
rendered beautifully and lied about the one thing it exists to tell you.

**How I found out:** only because I called the endpoint by hand and the raw response
was sitting in front of me. A prompt written from my assumptions about how a carpark
API works would never have mentioned `LotType` and the generated code would have been
clean, readable and wrong.

**The part I am less comfortable with:** I ran the command and I read the output. But
the significance of those two rows — that this was a correctness bug and not a display
quirk — was pointed out to me. I was holding the evidence. I was not the one who
noticed what it meant.

## Q4. What did I need to know in order to supervise it?

Concretely: that a carpark cannot have negative lots. That `AvailableLots` arriving as
`224` and not `"224"` matters, because a string sort puts "9" above "142" silently.
That a 401 means "LTA rejected this" and not "your key is wrong" — those are different
claims. That the same carpark appearing twice is a data-modelling fact, not a bug.

What I would have needed to know to catch what I missed: I did not know LTA splits
carpark records by vehicle type. I did not know `Area` would be blank for URA
carparks. Both were discoverable only by looking at real data, and both would have
produced a confident, working, wrong application.

The honest version: what I needed most was not domain knowledge but the *habit* of
checking — and the brief gave me that habit, I did not bring it.

## Q5. Which decisions did I keep, and should I have kept more or fewer?

**Mine:** what the product is for. Cutting the map to ship a list. The four failure
sentences, written before any code existed. Filtering to `LotType "C"` once I
understood it. Using distance rather than `Area` for zones. The decision to call the
endpoint by hand first.

**Should have handed over sooner:** the Vercel environment variable, where I was
slowing things down for no reason.

**Never reached my list at all** — and this is the one that bothers me. The choice of
LTA `CarParkAvailabilityv2` over the HDB feed was presented to me as a technical
convenience: one endpoint, coordinates included, no SVY21 conversion. It was all true.
But it also silently set the scope of my entire product — which carparks exist, which
agencies are covered, which four zones my app has. I accepted a product decision
because it arrived dressed as a data-format decision.

**The four sentences are the test case the brief points at.** I did write those myself,
before any code. But I wrote them in response to a table that already had a column for
each state and an example filled in. I decided the wording. I did not decide that there
were four states, or which four.

That is the boundary moving. Not dramatically — just one notch at a time, each notch
looking like a technical detail.

## Q6. Scale it to thirty people.

Thirty people each holding their own boundary, none able to see the others', is not
thirty times my weekend, it is a situation where my `LotType` bug ships, because the
person who would have caught it is looking at their own screen.

The specific danger is that the failure is invisible. My app would have passed every
review that asks "does it work" and "does it look right." It worked. It looked right.
It was wrong about the only number it existed to report. Nothing in the code, the tests
or the deployment would have flagged it.

So the review step cannot be a code review. **It has to be a data review, and it has to
happen before the code is written, not after.** One person, once, calling each external
source by hand and writing down what the fields actually mean — including the ones
nobody asked about. Midweek, not Friday, because by Friday the code is written and
everyone is defending a design rather than reading data.

**What I would never let an AI settle:** what the product claims to be true. Not how it
fetches, not how it renders; 
what it *asserts*. "This carpark has 224 spaces" is a
claim my organisation is making to a driver, and a model producing a plausible number
is not the same thing as someone deciding the claim is true.

**How I would know if it had been settled anyway:** I would look for decisions that
arrived as technical conveniences. My endpoint choice came to me as "this one avoids a
coordinate conversion" and quietly determined which agencies my product covers. That is
what it looks like — not an AI overruling anyone, just a choice presented in a frame
where the only visible axis was effort. I would ask, at review: *what did we choose
because it was easier, and what did that decide for us?*
