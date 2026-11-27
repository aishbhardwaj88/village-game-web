# State - rewritten every run, max 40 lines
Last updated: 27 Nov (scheduled run 11). Real code change this run.
LAST_FULL_PASS=3362c4f (unchanged, Tier 1 change only this run).
## This run
- Checked the LOOKS LIST (her 24 Nov playtest notes) against actual code instead of
  repeating the "unchanged" handoff line: items 1 (wall variety), 4 (flower pots/
  climbers) and 5 (street life props) are already built - each has its own code
  comment citing that exact playtest note. Item 6 (cycle feel) already superseded by
  her 25 Nov "felt too slow" order (25/32 km/h). Item 7's "map shipped twice" already
  fixed 25 Nov (vite.config.js landMapPlugin); housesLayout.js's raw-JSON dynamic
  import has no caller anywhere, so it's dead code, not a real second fetch.
- Item 2 (chauraha white/red building blocking the road): re-checked map data, no
  footprint overlaps the road at x 600-615 z 25-60, same finding as the existing
  NEEDS_YOU line. Tried to resolve it myself with a playwright screenshot instead of
  waiting on her - the browser hung on blocked Google network calls (different
  symptom than the documented headless-shell crash, same A7 container limitation).
  Stays GATED-HER, no new data to add to the NEEDS_YOU line.
- Real fix (code change): haystacks looked shiny because they share the live
  'thatch' library material with real thatched roofs (stagingYard.js swapShared) -
  editing it in place would have flattened every roof too. src/haystacks.js now
  makes one haystack-only clone (materials.js cloneTiledMaterial, so the weathering
  onBeforeCompile hook survives - a plain .clone() silently drops it) with
  roughness=1 and envMapIntensity=0. One extra Material object; draw-call count for
  haystacks is unchanged (still grouped/merged by material reference).
- Also pointed tools/shotlib.mjs at the full-chromium binary when present, same
  workaround tools/screenshot.js and regression-check.js already use.
## Current state
- Feature-complete against GAME_COMPLETE.md; LOOKS LIST items 1/4/5/6/7 effectively
  done or superseded; item 2 genuinely needs her (name the two buildings); item 3
  fixed this run; item 8 (missions/side jobs/console/bell/canal) last measured
  399/0/3, not re-tested this run.
- Remaining blockers: material-library taste verdict (GATED-HER), CC0 proxy still
  403 (not retested same-day per A6), M7 NPC needs draw-call headroom, shader-warmup
  and the chauraha building names need a real browser / her eye - this container
  can't reliably drive a headless browser session (two different failure modes seen
  now: Target-crashed on headless-shell, hung on blocked network calls on full chrome).
## Next 5 items
1. Pick 2-4 more unbuilt `new_*` places from BACKLOG.md (ponds first).
2. Diegetic wayfinding / lane continuity against the approved map.
3. loadLandMap() mapData.json reconciliation - unblocked, Tier 2: one commit, full
   build + regression-check.
4. If CC0 proxy ever returns non-403: resume prop sourcing (matka/charpai/cylinder).
5. world-validator.js checks 1-3 pass; 4/5 (heavy geometry sampling) still hangs.
## Known about this container
- node_modules missing on fresh container - `npm ci` first. HEAD can show detached/
  stale - `git fetch` fresh first. No `gh` CLI - use mcp__github__actions_list/get.
- check-material-clone script is check-material-clone.mjs, not .js.
- A real in-browser check (screenshot/regression-check/world-validator step 4-5)
  does not reliably finish here: headless-shell crashes, full chrome hangs on
  blocked outbound network calls (android.clients.google.com/accounts.google.com).
  Don't keep retrying either path same-day; verify by code reading + Tier 1 instead.
