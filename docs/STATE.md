# State - rewritten every run, max 40 lines
Last updated: 27 Nov (scheduled run 10). Real code change this run, flat-run streak
ended. LAST_FULL_PASS=3362c4f (unchanged, Tier 1 change only this run).
## This run
- Map-lock resolved: read the Claude.ai project doc claude/final-map.md directly (this
  session has project access, prior runs didn't use it) - 25 Nov map is "Closed, do
  not change without her". Treated as her yes (can say no in NEEDS_YOU.md). Every
  [PAUSED-MAP] BACKLOG item unparked to [ACTIVE].
- Found the real scope: 319 of 436 approved-map places are `new_*`, unbuilt. Several
  small ones prior runs filed as still-blocked - island+flag, peepal, wells/pumps/
  washing lines/haystacks/dung stacks, canal+bridges - are ALREADY DONE in code
  (landProps.js, landCanal.js). Lesson: check the actual code before trusting an old
  "paused" tag, not just the doc.
- Built the one genuinely missing small item: Bus shelter (545.4,-117.5),
  landProps.js busShelter(). Tier 1 checks pass; screenshot-verified at ?at=545,-117
  (playwright). No new sign - src/wayfinding.js's nameplate already covers it.
- Found, not caused by this change (reproduces on unmodified main): `vite dev` +
  headless SwiftShader throws a shader compile error on `ground` after Play. Filed in
  BACKLOG.md as [!]; needs a production build/real browser to confirm dev-only or real.
## Current state
- Feature-complete against GAME_COMPLETE.md; map-dependent polish (wayfinding,
  far-eastern cluster, NPC paths, crop-plot specifics, MAP.md checklist) is [ACTIVE]
  again, not blocked - real work resumes next run.
- Remaining blockers, unrelated to the map: material-library taste verdict (GATED-HER),
  CC0 proxy still 403 (confirmed 27 Nov, don't re-test same-day), M7 NPC needs draw-
  call headroom, shader-warmup needs a real browser.
- Possible stray, not re-investigated: NEEDS_YOU.md's 24 Nov line claims 20/27 km/h
  cycle cruise/sprint; main.js now has 25/32 km/h.
## Next 5 items
1. Pick 2-4 more unbuilt `new_*` places from BACKLOG.md (ponds first - reuse
   src/water.js blobWaterGeometry/createWaterMaterial, like the johad).
2. Diegetic wayfinding / lane continuity against the approved map - now unblocked.
3. loadLandMap() mapData.json reconciliation - unblocked but Tier 2: one commit,
   full build + regression-check.
4. If CC0 proxy ever returns non-403: resume prop sourcing (matka/charpai/cylinder).
5. world-validator.js checks 1-3 pass; 4/5 (heavy geometry sampling) still hangs.
## Known about this container
- node_modules missing on fresh container - `npm ci` first. HEAD can show detached/
  stale - `git fetch` fresh first. No `gh` CLI - use mcp__github__actions_list/get.
- check-material-clone script is check-material-clone.mjs, not .js.
- This session has Claude.ai Project read access (claude/*.md docs) - use it, not
  secondhand NEEDS_YOU.md notes, when a question points at a doc there.
