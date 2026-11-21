# 7-day sprint (21 to 28 Nov 2026): ship the approved village + full cast

Owner: Aishwarya (product, art calls, 10-minute plays). Lead: Claude (this sprint's integrator). Agents build in parallel on their own branch and worktree.

## Goal
The game matches the approved map (docs/layout/approved-map-2026-11-21.json, pictures beside it), loads fast, looks realistic, and carries 30-40 Tripo characters.

## Hard rules (every agent)
- Work ONLY in your own worktree and branch. Commit there often with clear messages. Never push, never touch main.
- Touch only the files your brief says you own. If you must change a shared file (main.js, package.json, CLAUDE.md, anchors.js you do not own), do NOT edit it: write the exact change in docs/s7/<your-agent>.md under "Wiring needed" and the integrator applies it.
- Exception: main.js may get ONE import line and ONE init call per agent, inside a block you add marked `// S7 WIRING (<agent>)`.
- Never delete existing gameplay. New layout is behind `?layout=new` until the integrator flips the default. `?layout=old` must keep working exactly as today.
- Read first: CLAUDE.md, docs/budgets.md, docs/look-standard.md, docs/material-library.md, docs/collaboration_lessons.md, docs/s7/SPRINT.md.
- Fronts: the export's place.front is the TRUE front (already corrected). The old map tool stored fronts backwards; never use the old stored value.
- Every building faces its road; edges parallel to the road; nothing on a road; nothing floating or sunk; nothing at an odd angle (she spots it instantly).
- No paid tools. No 4K textures in git. Keep public/ shrinking, not growing.
- Use plain words in docs/s7 notes; Aishwarya is not technical.
- Before you finish: `npm run build:unchecked` passes, the game boots headless (tools/load-time-test.mjs or a playwright smoke), zero new red console errors, and your own checks pass. Write results with numbers in docs/s7/<your-agent>.md.

## Budgets (the build will enforce these by day 3)
- Before Play <= 8 MB downloaded; whole public/ <= 90 MB; each character GLB <= 1.5 MB (heroes <= 2.5 MB).
- <= 150 draw calls main pass, <= 250 incl. shadows; <= 450k triangles on screen; <= 400 MB GPU texture memory.
- Frames p95 <= 12 ms, none > 50 ms on the scripted ride. Play ready <= 4 s; village <= 2 s after Play.
- Characters: <= 12 fully animated within 25 m; 25-50 m reduced update rate, no morphs; hidden beyond 50 m.

## Agents and ownership
- characters: character GLB diet tool + character distance tiers. Owns tools/char-*.mjs, src/characterLOD.js (new), public/assets/models/<character>.glb outputs, docs/s7/characters.md.
- layout: layout loader, front/road/ground tests, moving the 117 existing places, new roads/galis, save version. Owns src/layout/* (new), tools/layout-*.mjs, anchors.js, mapPlan.js, stagedPlaces.js, mapRoads.js, roadNetwork.js, save.js, docs/s7/layout.md.
- houses: the house kit and all ~490 new houses (+ removing the old abadi house rows under ?layout=new). Owns src/kit/houses*.js (new), houseKit.js, villageHouses.js, scenery.js, abadiBoxes.json, house textures/atlas, docs/s7/houses.md.
- shops-land: two-storey square shops, kiosks, small shops + sign atlas, trees and orchards, fields, canal + green strips, flag island, kiln green. Owns src/kit/shops*.js, src/kit/land*.js (new), canal.js, field.js, trees.js, signAtlasHub.js, smallShops.js, newShops.js, docs/s7/shops-land.md.
- perf: budget gate in build + deploy, perf ride script, chunked instancing helper for the kits, shadows, world growth east (ground extent, minimap, zones, shadow camera). Owns tools/check-budget.js, tools/perf-*.mjs, .github/workflows/deploy.yml, package.json scripts (only scripts), zoneManager.js, renderer.js, quality.js, minimap.js, src/kit/instancing.js (new, shared helper the kits use), docs/s7/perf.md.

## Coordinates
Map coords are the game's world coords as read from the running game on 9 Nov (x east, z south, metres). Verify against 3 existing places before relying on it, and write what you found in your notes.

## Selling rules (owner's decision, 21 Nov): the game will be SOLD
- Two editions from ONE codebase: a paid downloadable desktop edition (Mac + Windows, "full" quality) and a free web edition ("light" quality). Quality differences come from a preset, never from a separate copy of the game.
- Asset licences allowed: CC0; CC BY (credited in docs/CREDITS.md AND the in-game credits screen); OFL fonts; MIT/BSD/Apache code; assets we build ourselves; Tripo characters made on a paid plan. NOT allowed: NC (non-commercial), "personal use only", unknown or missing licence, CC BY-SA (avoid), anything ripped from games/films/YouTube, real brands or logos. Every new third-party file gets a CREDITS.md row (source URL, author, licence) in the same commit.
- Sound is off until final polish (audio engine only starts with ?sound=1).
- Agents added 21 Nov evening: desktop (s7-desktop), licence (s7-licence).

## Order of editions (owner, 21 Nov late evening)
- FULL quality (desktop edition) first. The LIGHT web edition is built only after she approves the new village in 3D.
- Until then: no time on web-only slimming or web budgets; the budget gate stays in warn mode (the Tue 24 strict flip is postponed).
- Still needed for any machine: characters load after Play, distance tiers, chunked instancing, shadows by distance.

## Licence records (from the licence agent, 21 Nov)
- Every new file under public/ needs a record in tools/licence-records.json (plus a CREDITS.md row if third-party) in the same commit. `npm run licence:check` must pass. New Tripo character GLBs are recognised automatically (owner question: Tripo plan).
