# prompts.md — ParkSG

**Name:** Shrividhya Srinivasan
**Live:** https://parksg-seven.vercel.app
**Repo:** https://github.com/vidhyasrinivasan65/parksg



## How I worked, and with what

I used two AI systems this weekend and they did different jobs. Recording only one
would misrepresent how the work actually happened.

- **Google Stitch / AI Studio** wrote the code. Every file in this repo was generated
  by it from prompts I wrote.
- **Claude** was the one I argued with about *what* to build. Which endpoint, how to
  scope the idea down, what the four failure sentences should say, what to check
  before pushing.

The split matters for my own assessment: the code was produced, but a meaningful
share of the *decisions* were also shaped in conversation with a model rather than by
me alone. Section 7 and Q5 are where I try to be honest about that.


## 1. Building the front end against fake data first

Before writing any back end, I had the front end built against a mock file in the
exact shape I intended the API to return, with a `// SWAP POINT` comment marking the
single place the real fetch would later go.

" ROLE: You are a senior front-end developer working in my existing project.
Do not add a back end yet. Do not call any external API. Do not add any npm package.
GOAL: Build the ParkSG screen against a MOCK data file, so that later I can replace
the mock with a single fetch to my own /api/carparks and change nothing else.
1) Create src/mockCarparks.js exporting exactly this object as the default export:
[PASTE THE FULL CONTRACT JSON FROM SECTION 3 HERE]
2) Build one screen that reads from that mock:
   - Header: "ParkSG" and the line "Live lots in Singapore's busiest parking zones".
   - Four zone buttons: Orchard, Marina, HarbourFront, Jurong Lake District.
     IMPORTANT: the labels shown to the user are those four, but the values passed
     in code must be exactly: Orchard, Marina, Harbfront, JurongLakeDistrict.
     Keep that mapping in one object so it is easy to find.
   - A line under the buttons reading "Updated HH:MM · from LTA DataMall", where the
     time comes from fetchedAt formatted in Asia/Singapore time.
   - A list of carparks sorted by lots, highest first. Each row shows name, agency,
     and lot count.
   - Colour the count: green above 50, amber 1 to 50, red at 0. When lots is 0,
     display the word "FULL" instead of the number.
   - A row whose lat or lng is null must still render normally in the list.
   - Footer: "Data from LTA DataMall".
3) Put the component in exactly one of four states, driven by a single state variable
   I can flip by hand for testing. Use these exact sentences:
   loading     -> "Checking live lot counts…"
   empty       -> "No live counts for [ZONE] at the moment. LTA carparks in this zone
                   may not be reporting right now — try another zone."
   refused     -> "LTA turned down our request. This is on our side — we're looking
                   at it. Try again in a minute."
   unreachable -> "We can't reach LTA DataMall right now. Nothing's wrong with your
                   connection — the feed itself is down."
   Each state must be a readable sentence in the main content area, never a bare
   spinner and never a blank space.
4) Write the data-fetching so that it goes through ONE function called loadCarparks(zone).
   For now that function returns the mock after a 600ms delay. Mark it with the comment
   // SWAP POINT — this becomes fetch(`/api/carparks?zone=${zone}`)
   so there is exactly one place to change later.
OUTPUT: Mobile-first. It must look correct at 380px wide before it looks correct on a
  laptop. No horizontal scrolling. Tap targets at least 44px tall.
GUARDRAILS: No external API calls. No npm packages. No map library. No routing library.
  No login, no database. Do not create any file inside an api/ folder yet.
  Do not create any variable whose name begins with VITE_."  
**Came back with:** a working screen, four zone buttons, a TEST STATE dropdown for
flipping between loading / empty / refused / unreachable / success, and mock carparks.


**Why I did it this way:** deciding the JSON contract before either half existed meant
the back end had one job — produce that shape and connecting them was a four-line
change instead of a rebuild. It also meant I could build and test the whole front end
while waiting for my LTA key to arrive by email.



## 2. Calling the endpoint by hand before prompting for the back end

The brief said to call the API by hand before writing any code. I did, and it changed
the back-end prompt in three separate ways. This was the highest-value twenty minutes
of the project.

### Discovery 1 — PowerShell silently truncated my key

First attempt returned:

```
HTTP/1.1 401 Unauthorized
Content-Length: 0
```

The obvious reading of a 401 is "your key is wrong." My key was fine. I had wrapped
the header in double quotes, and PowerShell treats `$` inside double quotes as a
variable, so it deleted part of my key before the request ever left my laptop.
Switching to single quotes returned `200 OK` immediately.

Nothing in the error pointed at quoting — LTA sent a zero-length body, so there was no
message at all. Had I trusted the status code at face value I would have re-requested
a perfectly good key and waited on an email for no reason.

**Lesson:** the error told me the truth about what LTA saw, and nothing about why. The
failure was on my machine, one layer before the request.

### Discovery 2 CarParkID is not unique and the duplicate is dangerous

In the real response, A0007 appears twice:

```
A0007  ANGULLIA PARK  LotType:"Y"  AvailableLots:0     (motorcycle)
A0007  ANGULLIA PARK  LotType:"C"  AvailableLots:224   (car)
```

My app is for drivers. Without filtering to `LotType === "C"`, it would have displayed
**"ANGULLIA PARK — FULL"** to someone who could have parked in one of 224 free spaces.

The screen would have looked completely correct while being wrong in the one way that
matters for the product's only job. Nothing would have errored. Nothing would have
looked odd. I only caught it because the raw response was in front of me — a prompt
written from my assumptions about the API would not have mentioned it.

It also meant `CarParkID` alone was unusable as a React list key, so I changed the id
to `` `${CarParkID}-${LotType}` ``.

### Discovery 3 — the Area field is empty for URA carparks

Every URA record came back with `Area: ""`. My four zone buttons were designed to
filter on `Area`, which would have silently emptied Orchard and Marina of everything
except the handful of LTA-operated carparks.

**Action:** switched to filtering by distance from a zone centre using the `Location`
coordinates, with a haversine calculation written inline.

**All three findings went into the back-end prompt as explicit instructions** rather
than being left for the model to infer.

---

## 3. The back-end prompt


**Came back with:** `api/carparks.js` and `api/health.js` at the project root,
pagination via `$skip`, the LotType filter, distance-based zone matching, and the
`loadCarparks` swap wired to `fetch('/api/carparks?zone=...')`.

**Action:** kept it, essentially unedited.

**Why it worked first time:** the prompt contained a real response body and three
named traps. The model was not guessing at field names or at how the data behaves.
Most of the value came from the twenty minutes in section 2, not from the prompt
itself.


---

## 4. Where I stopped prompting and used my hands

Setting the environment variable. I set `LTA_ACCOUNT_KEY` in the Vercel dashboard
directly rather than trying to get any model to do it, because it is four clicks and
describing it would have taken longer than doing it.

I also renamed `prompt.tsx` to `prompts.md` by hand, and moved on rather than
prompting for it.

**The pattern:** prompting was faster for anything involving structure or logic. It was
slower for anything involving a form, a toggle, or a file name.


## 5. Things I was told that were wrong, and how I found out

**The deadline.** Claude asserted twice that my deadline had already passed and that I
should email my professor about late submission. It was 9pm. It had no access to the
time and was inferring from the date. I corrected it and it backed off both times.

I am recording this because it is the cleanest example in my whole weekend of a model
being confidently wrong about something outside its own evidence, in a way that
sounded exactly like everything else it said. Nothing in the tone marked it as a guess.
If I had acted on it I would have sent an unnecessary and slightly alarming email to my
professor. The correction required knowing something the model could not know — which
is precisely the kind of check that stops being possible as you hand over more.


---

## 6. Debugging the deployment

`/api/health` returned:

```json
{"keyConfigured":false,"upstreamStatus":"missing_key"}
```

I had saved the environment variable in Vercel but not redeployed, so the running
build had never seen it.

**Why this endpoint earned its place:** without it, the symptom would have been a 401
from LTA — because JavaScript turns a missing variable into the literal string
`undefined` and sends *that* as the key. A missing variable and a wrong key are
indistinguishable from the outside. `/api/health` separated them in about four
seconds, and I had already spent twenty minutes on an unrelated 401 earlier that day,
so I know what the alternative would have cost.

After redeploying: `{"keyConfigured":true,"upstreamStatus":200}`.



## 7. What I notice reading this back

The prompts that worked were the ones where I had already decided the answer. The
back-end prompt succeeded because it contained a real response body and three named
traps — all of which came from twenty minutes in a terminal, not from anything a model
produced.

But I want to be accurate about where those three traps came from. I ran the command
and read the output. The significance of what I was looking at — that `LotType` "Y"
would make my app lie to drivers — was pointed out to me in conversation. I was the
one holding the evidence. I was not reliably the one interpreting it.

That is the honest shape of this weekend's collaboration, and it is not the flattering
version.
