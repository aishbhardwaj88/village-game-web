# Backlog - ordered task list to GAME_COMPLETE.md

One task per checkbox, in priority order. Take the top unticked item. The dashboard
(`tools/dashboard/`) counts ticked vs total here and shows the first unticked item as
"current task" - keep the `- [ ]` / `- [x]` syntax exact, one item per line. Append new
tasks discovered mid-work to the end of the relevant section, don't renumber.

## 0. Setup (do once)

- [x] Fix deploy workflow: install Playwright Chromium before `npm run build`
- [x] Write `docs/GAME_COMPLETE.md`
- [x] Write `docs/STORY.md`
- [x] Write `docs/BACKLOG.md` (this file)
- [x] Create `inbox/` + README, gitignored except README
- [x] Build local monitoring dashboard (`tools/dashboard/`) - ad-hoc request, done
      ahead of queue order per direct instruction

## 1. Headroom and hygiene (must happen before adding more static content)

- [ ] Draw-call headroom pass - currently 139/140 (see `tmp/` build log, 2026-10-19),
      effectively zero margin. Re-apply `mergeGroupByMaterial`/instancing discipline
      (`src/mergeUtils.js`) across any ungrouped geometry; target back under 115 before
      building M4-M7's new geometry (postman, darzi shop, monkey, baagh trees/props)
- [ ] Refresh `docs/regression-baseline.json` - current one is dated 2026-09-20, predates
      all October structural work and the dashboard/story additions. Confirm `npm run
      build`, `npm run check-budget`, and a manual look at the result are all correct,
      THEN `node tools/regression-check.js --save-baseline` (per CLAUDE.md §9 - only
      after visually confirming correctness, never to paper over a real regression)
- [ ] Update stale docs for the October work: `CLAUDE.md` §1 (add M4-M8 once built),
      `docs/handoff.md` (append entries), `docs/parked.md` (close out resolved items,
      migrate open blockers to `docs/NEEDS_YOU.md`)
- [ ] Delete-or-quarantine `src/trees.js` (confirmed dead code per STATUS_REPORT.md §8)

## 2. Dayline across all 8 missions

- [ ] Extend `src/dayline.js`/`src/quest.js` quest-step progress mapping to cover 8
      steps instead of 3, so afternoon → sunset drift is smooth and complete only at
      M8, not compressed into the first 3 missions
- [ ] Verify the drift still reads correctly across a real playthrough (not one frame -
      CLAUDE.md §9 regression-guard rule applies to anything that changes over time)

## 3. Missions 4-8 (build in story order)

- [ ] M4 - postman NPC (cycle waypoint-loop route through lane/bazaar), find-and-catch
      objective/dialogue/waypoint, letter pickup logic, quest-step wiring
- [ ] M5 - darzi (tailor) bazaar shop: new unit, counter interaction, kurta pickup,
      objective/dialogue/waypoint, quest-step wiring
- [ ] M6 - monkey chase: snatch cutscene, 2-3 waypoint chase sequence, drop/recover
      logic, comedic dialogue, quest-step wiring
- [ ] M7 - mango baagh: new zone beyond the field, tractor+trolley drive-out, "knock
      down mangoes" interaction (new verb), trolley cargo count, drive-home, dialogue,
      quest-step wiring
- [ ] M8 - ending: rooftop family scene (reuse house roof space), staged NPC placement,
      fixed dialogue sequence, transition into existing credits screen

## 4. Characters

- [ ] Postman: code-built NPC, distinct silhouette/colour, asset-slot registered
- [ ] Darzi: code-built NPC, distinct silhouette/colour, asset-slot registered
- [ ] Monkey: code-built NPC, distinct silhouette, asset-slot registered
- [ ] Baagh keeper (optional flavour NPC for M7), if draw-call budget allows

## 5. Menus/ending polish

- [ ] Title screen New Game/Continue reflects 8-mission save state
- [ ] Settings: confirm quality, volume, and a controls-help screen are all reachable
      from both title and pause menu
- [ ] Loading screen: confirm no black-frame flash with the added M4-M8 geometry
- [ ] Credits screen: confirm it still generates correctly from `docs/CREDITS.md`
      after any new asset credits are added

## 6. Final verification

- [ ] Full engineering gate sweep: `npm run build`, `npm run check-budget`,
      `node tools/regression-check.js`, `node tools/screenshot.js` (look at every shot)
- [ ] Mobile/touch controls re-verified with the new M4-M8 content in scene
- [ ] Fresh-subagent playthrough audit against `docs/GAME_COMPLETE.md`, repeat until
      clean (see CLAUDE.md pasted-instructions step 8 of THE LOOP)

## Parked / needs-you items

See `docs/NEEDS_YOU.md` for anything blocked on the user, written in plain language.
