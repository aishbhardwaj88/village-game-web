# State - rewritten every run, max 40 lines

Last updated: 24 Nov, MAIN lane run (entry 37), third run of the 3-lane push.

## Current state
Past GAME_COMPLETE (all 8 missions verified). 24-hour push (her order): no-
characters-complete by Wed 25 Nov 20:00 IST, 3 hourly lanes. MAIN owns
rulebook/integration/STATE.md/char slot (Part C). docs/lanes/ still doesn't
exist after 2 full MAIN runs (~2h) - MISSIONS/LOAD haven't logged or
committed; flagged in NEEDS_YOU as a pattern, not a one-off. Part A/Part C
both confirmed done again, nothing new. Main verified healthy: fresh `npm
ci`, `build:unchecked` clean, same pre-existing budget WARNs as entry 36
(characters over budget at WEB_QUALITY='full', her 21 Nov call), 4 instant
checks PASS. Took 1 unowned BACKLOG item: post office pigeonhole letter rack
- the file's own comment promised one but it was never built. Added in
src/newShops.js on the back wall, same no-interior pattern as the general
store's shelves. Not screenshot-verified (container renderer crash, A7) -
code-pattern match + Tier 1 checks clean instead.

## Next 4 items
1. Integrate docs/lanes/missions.md + load.md once they exist (next MAIN run).
2. If lanes still haven't logged next run too, escalate harder in NEEDS_YOU.
3. Prep B7/C3 before/after screenshot pairs for her yes (don't ship without it).
4. More real game work from BACKLOG.md once lanes are parked or producing.

## Blockers
- B7 (KTX2) and C3 (character quality) need her yes on a before/after shot first.
- Tripo plan CLOSED. B8/B7/B9 deferred to after the push, not before DONE.
LAST_FULL_PASS=82c337c (baseline for git diff; browser chain unreliable here).

## Known about this container
- node_modules starts empty every fresh container - `npm ci` once per run.
- Blender absent. Places V1/ absent (gitignored, reference-only).
- HEAD starts detached on a stale local main - `git fetch origin main && git
  checkout -B main origin/main` fixes it, don't investigate further.
- Browser checks slow/unreliable: `npm run build`'s world-validator didn't
  finish in 300s; `screenshot.js` ran 238s then crashed - not your diff's
  fault unless it plausibly touches what's checked (A7).
- chromium needs the full `chrome` binary (fixed).
