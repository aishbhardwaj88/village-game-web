# State - rewritten every run, max 40 lines
Last updated: 27 Nov (scheduled run 13). No code change, doc correction only.
LAST_FULL_PASS=3362c4f (unchanged, no Tier 1/2 diff this run).
## This run
- BACKLOG's "319 places not built... still unbuilt: ponds, tempo stand, village
  bank, library" line was stale (detail in docs/archive/backlog-done.md "319
  unbuilt" entry): all 4 are already built (ponds+temple tank in
  mapObjectsGround.js, tempo stand a ground patch, bank/library in shopsPlace.js,
  shops worker's file). A key-by-key scan of every `new_*` label in mapData.json
  found a handler for all of them. Moved the line to archive so a future run
  doesn't re-discover this (2nd run to reach this conclusion, after run 10's
  wells/pumps/haystacks finding).
- No further unblocked, in-scope, safe code task found: BACKLOG's other 5 open
  items are the same ones blocked for several runs (GATED-HER material verdict;
  loadLandMap() needs shopsPlace.js; M7 NPC draw-call headroom; shader-warmup +
  dev-mode shader bug need a real browser; CC0 proxy still 403, not retested/A6).
## Current state
- Feature-complete against GAME_COMPLETE.md. LOOKS LIST items 1-8 all done/
  superseded/parked (confirmed again, see handoff.md); item 2 (chauraha
  buildings) stays GATED-HER, nothing new to add.
- Remaining blockers: material-library taste verdict (GATED-HER), CC0 proxy 403,
  M7 NPC draw-call headroom, shader-warmup + dev-mode shader bug (need a real
  browser - container can't reliably drive one, two failure modes seen), and
  loadLandMap() (file-ownership block, needs the shops worker).
## Next 5 items
1. New gap from a screenshot/playtest: build that (named, not a blanket sweep -
   the sweep came up empty this run).
2. Diegetic wayfinding / lane continuity against the approved map (BACKLOG,
   ACTIVE, not yet attempted - worth a fresh look next run).
3. If CC0 proxy ever returns non-403: resume prop sourcing (matka/charpai/cylinder).
4. If the shops worker can coordinate: loadLandMap() reconciliation (data-side
   ready, consumer swap is their file).
5. world-validator.js checks 1-3 pass; 4/5 (heavy geometry sampling) still hangs.
## Known about this container
- node_modules missing on fresh container - `npm ci` first. HEAD can show detached/
  stale - `git fetch` fresh first. No `gh` CLI - use mcp__github__actions_list/get.
- check-material-clone script is check-material-clone.mjs, not .js.
- A real in-browser check (screenshot/regression-check/world-validator step 4-5)
  does not reliably finish here: headless-shell crashes, full chrome hangs on
  blocked outbound network calls (android.clients.google.com/accounts.google.com).
  Don't keep retrying either path same-day; verify by code reading + Tier 1 instead.
