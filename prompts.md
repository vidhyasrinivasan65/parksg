## Calling the LTA endpoint by hand before writing any code

I ran the endpoint from PowerShell before prompting, because the brief said to.

**Discovery 1 — PowerShell silently truncated my key.**
First attempt returned 401 Unauthorized with Content-Length 0. The obvious reading is
"your key is wrong." The key was fine. I had wrapped the header in double quotes, and
PowerShell treats `$` inside double quotes as a variable, so it deleted part of my key
before the request ever left my laptop. Switching to single quotes returned 200 OK.
Nothing in the error pointed at quoting. Had I trusted the status code, I would have
re-requested a perfectly good key and waited on an email for no reason.

**Discovery 2 — CarParkID is not unique, and the duplicate is dangerous.**
In the real response, A0007 (Angullia Park) appears twice:
  LotType "Y" -> AvailableLots 0      (motorcycle)
  LotType "C" -> AvailableLots 224    (car)
My app is for drivers. Without filtering to LotType "C", it would have shown
"ANGULLIA PARK — FULL" to someone who could have parked in one of 224 free spaces.
The screen would have looked completely correct while being wrong in the one way
that matters for the product's only job. I only saw this because the raw response
was in front of me; a prompt describing the API from memory would not have caught it.
I also had to change my row id to `${CarParkID}-${LotType}` for the same reason.

**Discovery 3 — the Area field is empty for URA carparks.**
Every URA record came back with Area: "". My four zone buttons were designed to filter
on Area, which would have silently emptied Orchard and Marina. I switched to filtering
by distance from a zone centre using the Location coordinates instead.

**What I changed as a result:** all three findings went into the back-end prompt as
explicit instructions rather than being left for the model to infer.
