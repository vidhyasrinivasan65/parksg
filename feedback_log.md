# feedback_log.md

Problem Set 4 — Step 3, findings posted on groupmates' products
Vidhya Srinivasan · Group 8 · MGMT 6110

| Groupmate | Product address | Where the findings were posted | When posted | Findings posted |
|---|---|---|---|---|
| Mohammed Rizwan Khan | https://evstations.vercel.app | Disqus board on the live site | Evening of 27 September 2025 | 2 |
| Janelle Tan Yan Ting | https://mgmt-problem-set-02.vercel.app/ | Disqus board on the live site | Evening of 27 September 2025 | 3 |
| Wang Beichao | https://mma-deal-hub-w5.vercel.app/ | Disqus board on the live site | Evening of 27 September 2025 | 1 |

## What was posted on each board

**Mohammed Rizwan Khan — EV charging stations (2 findings)**
1. No way to check chargers near a chosen location; the app works only from current position — heuristic 7, severity 3, screen.
 The `/api/health` response carries no timestamp, so a reader cannot tell a current check from a stale one — heuristic 1, severity 1, system.

Also noted as working: on Slow 3G the app showed a clear "trying to find a location" message rather than a blank screen, and with location permission blocked it fell back to a named default (City Hall) and said so, rather than stranding the visitor.

**Janelle Tan Yan Ting — HDB resale forecast (3 findings)**
 The address field offers no suggestions while typing; the accepted format has to be recalled rather than recognised, and nothing confirms a match until submission fails — heuristic 6, severity 2, screen.
Remaining lease is never asked for, but the result states "99 year lease" alongside the inputs that were supplied, with no marking to show the figure was assumed — heuristic 1, severity 4, system.

Also noted as working: the forecast is shown with a range, historical CAGR and a factor attribution breakdown rather than a single confident number, and the phone layout held up.

**Wang Beichao — second-hand MMA gym contracts (1 finding)**
1. There is no way to search for a contract by gym name or area; the page offers only sorting and a duration filter over a fixed set of listings — heuristic 7, severity 3, screen.

Also noted as working: each listing shows months remaining and price side by side, which is the pair needed to judge a takeover, and the phone layout held up.

## Notes on completeness and method

Two boards carry fewer than the three findings the brief asks for. Rizwan's product passed the failure tests that usually produce findings — Slow 3G, blocked location permission, and phone layout all behaved correctly — and on Wang Beichao's product a second candidate finding was still being checked when time ran out on the Sunday deadline. Rather than pad either board with findings I had not actually confirmed, I posted only what I had observed. Any further findings added after the Sunday deadline are recorded below as late.

Exact posting times were not recorded at the time; all three boards were posted on the evening of 27 September 2025, before the deadline.

No comment links are recorded because Disqus permalinks were not captured at the time of posting. Each set of findings sits on the Disqus board of the live address listed in the table above, posted under my eLearn name.

Products were evaluated without opening the groupmates' repositories and without reading other students' comments beforehand, so that each set of findings is my own.

### Findings added after the Sunday deadline

_(none as of the time of writing)_
