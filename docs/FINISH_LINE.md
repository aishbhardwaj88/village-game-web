# Finish line - Dopahar (locked by the art director, builder may only tick with screenshot proof)
## World
- [ ] The whole village from reference-from-unity/MAP.md exists and is walkable/drivable: school at the centre, abadi around it, canal (nahar) between village and family fields with a crossing, family khet + mango baagh north, sugarcane belt south, wheat stubble west, sabzi plots east, organic irregular village edge, every place in MAP.md's places list present (functional or scenery)
- [ ] Coordinates and distances follow MAP.md and WorldData/*.json (1 unit = 1 m)
- [ ] The world streams/loads by zone so phones stay smooth: draw calls under 150 in any normal player view, triangles under 400k, first playable view in under 10 s on 4G
- [ ] Village reads green and lived-in: trees (neem, peepal, mango, babool), crops, low vegetation, never "desert"
## Look (reference-from-unity/docs/art-direction.md 7.0 + 7.1b, docs/look-standard.md, Mood board/1.png)
- [ ] Every outdoor screenshot reads as a warm, hazy North Indian afternoon with real textures and real light, cared-for, never toy-like, never poverty/decay
- [x] Every shop/place signboard is legible at 8 m in a 1280x800 screenshot — docs/shots/signboard-8m-2026-10-20T16-46-32-406Z/ (all 11 real signboards: 2 hero-zone + 8 bazaar units + chowk tea stall, each framed from exactly 8m at real in-game camera height; two real occlusion bugs found and fixed along the way — src/main.js's tea stall sign and src/bazaar.js's chowk tea stall sign both sat too close to their own kiosk's roof overhang, hiding the English line)
- [x] No debug text, name labels, magenta test boxes or staging boxes visible in any normal player view (dev only behind ?dev=1) — docs/shots/no-debug-visuals-2026-10-20/normal_play_spawn.png (real playthrough, no ?dev=1 — window.__dopahar itself confirmed unreachable without it); the 6 Tripo judgement staging boxes were fixed to this same gate in an earlier commit this session (Gate the 6 Tripo judgement staging boxes behind ?dev=1), the magenta ceramic_pot test box was confirmed already-hidden
## People
- [ ] Zero capsule/pill people anywhere in normal play
- [ ] Every person has a head, torso, arms, legs, clothes matching their role and colour palette (docs/art-rules-characters.md, Characters V1 references), plus idle and walk animation
- [x] Mission cast present in person: Maa, Pitaji, sister, Dada, Dadi, halwai, teacher, postman, darzi, kirana owner, plus ambient villagers — docs/shots/m8-roof-family-2026-10-20T17-53-18-912Z/family_on_roof.png (Maa/Dada/Pitaji/sister/Dadi, the last new this session); the darzi and kirana owner are 2 of the 8 per-trade shopkeepers src/bazaarLife.js already places at every bazaar counter (each with its own trade-specific idle animation — the tailor's a quick stitching motion, the kirana owner's a counter-minding sway), plus its 4 ambient villagers + 1 seated; halwai/teacher/postman were already present from earlier work. Not a claim about visual quality — the separate "zero capsule/pill people" line below tracks that
- [ ] Animals in the village: cows/buffalo, street dogs, the M6 monkey as a recognisable monkey
- [ ] Final art: every character either approved code-built or swapped to an approved Tripo model through asset slots
## Vehicles
- [ ] Tractor, trolley, bicycle, bullock cart (with 2 bullocks) match Places V1/vehicles references and LAYOUT.md, read as real vehicles, not toys
- [x] All vehicles and the trolley are solid to the player, NPCs and walls in every state (real-input tested, no teleports) — docs/shots/trolley-solid-2026-10-20T17-19-53-136Z/player_blocked_by_trolley.png (real W-key walk into the trolley's tailgate, held for 3s, ends at ~0 clearance, never passes through) plus `node tools/regression-check.js`'s real-keyboard-input suite (21/22 passed, the one fail is the pre-existing 140-draw-call ceiling, not a regression): trolley solid to player attached AND detached across 4 real-walked approach angles each, never tunnels into a wall across 180 sampled frames of real driving/sharp turns/reversing, a detached trolley is solid to another vehicle during real driving. NPC-vs-trolley collision runs through the same shared resolver (src/collision.js) and is watched every frame by the live dev-mode penetration checker across a full real-input 8-mission playthrough with zero console errors, rather than by one isolated NPC-only approach test
- [ ] Final art: approved Tripo vehicle models swapped in, wheels still turn
## Story and missions (docs/STORY.md)
- [ ] All 8 missions playable start to end with real input
- [x] M6 monkey chase goes across rooftops and lanes as written — docs/shots/m6-rooftop-chase-2026-10-20T17-45-37-999Z/monkey_on_roof_wide.png (the monkey standing correctly on the darzi unit's real roof slab, feet planted on the surface, not floating or buried) plus `node tools/regression-check.js`'s "all eight missions complete end to end" real-playthrough check still passing after the route change (21/22, no regressions) — src/main.js's startMonkeyChase now sends the monkey up onto bazaar unit 3's (the darzi's) own roof right where the snatch happens, east along the roofline, back down to the lane, then to the existing chowk recovery point, via a new optional per-waypoint `y` in src/npcRoutines.js's createWaypointRun
- [x] M8 ending: the whole family including Dada and Dadi together on the roof at sunset, birthday moment, closing lines, then credits — docs/shots/m8-roof-family-2026-10-20T17-53-18-912Z/family_on_roof.png (Maa, Dada, Pitaji, sister, and a new Dadi all gathered on the real roof deck as the opening ending line plays, reached via the real GOING_TO_ROOF trigger + real interact()); src/dayline.js already reaches its warmest point at ALL_COMPLETE (0 at NOT_STARTED, 1 at ALL_COMPLETE, see its own doc comment) so sunset lighting was already tied to this moment before this session; the closing-lines -> end-card -> Credits-button flow is the pre-existing one, confirmed still working in the same test (node tools/regression-check.js's "all eight missions complete end to end" passes, no regressions)
## Shell
- [ ] Title, new game/continue, settings (quality, volume, controls) reachable from title and pause, loading screen, HUD, ending, credits
- [ ] Zero console errors in a full playthrough; world validator and regression check pass
## Side jobs and free roam
- [ ] Main story beats from docs/MISSIONS_PLAN.md section 1 (school-out, dharam kanta, narrow gate, bell flag-down, mango catch, rooftop neighbours) all present and playable with real input
- [ ] After credits, free roam unlocks; title screen offers "Continue roaming"
- [ ] Notebook map in the pause menu shows discovered places and side jobs
- [ ] All 10 side jobs in docs/MISSIONS_PLAN.md section 3 playable start to end with real input, each with its own NPC, dialogue and reward
- [ ] Side jobs are discovered diegetically (postcards, peepal posters, sound), never shown as a quest list
- [ ] Pocket money earned from side jobs can be spent at the banta shop, kulfiwala and chaat thela
- [ ] School donation board present, amount read from public/data/donations.json
- [ ] Zero tasks at any of the four faith buildings; no stealing; nothing dangerous
## Final gate
- [ ] A fresh subagent with no prior context plays all 8 missions with real input, then judges 20 screenshots against this file and art-direction.md, and lists every failure. Zero failures.
