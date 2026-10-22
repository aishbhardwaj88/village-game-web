**2026-10-23 (cycle 38):** Game change: bazaar and chowk signboards were illegible (square atlas cells squashed onto 8:1 boards); now 4:1 cells and taller 4:1 boards with bold red Devanagari over dark English (src/bazaar.js, no new draw calls), and the Barber board moved forward so the Blender pediment no longer hides it. Proof docs/shots/normal-mode-signboard-8m-2026-10-22T21-23-28-656Z/ (all 11 boards viewed). A2 ticked.
Next: A3 trees (Blender rebuild of peepal/neem/babool/mango).

---

**2026-10-23 (cycle 37):** Game change: street lamps (grey pole, bracket arm, lamp head) now line the temple lane and the bazaar lane's north stretch (createStreetLamps in src/props.js, streamed by zoneManager in src/main.js; one draw call per lane segment, only while near). Proof docs/shots/lamps-2026-10-23/. Build 15/15, hero zone still 150/150. A1 props ticked. Hero-zone lanes deliberately have no lamps (at the draw-call ceiling).
Next: A2 signboards legibility, then A3 trees.

---

**2026-10-23 (cycle 36b):** Game change: every Blender building now has soft dusty dirt at the wall base, sun-faded paint high up, and faint vertical damp streaks (applyWallBaseGrime in src/materials.js, hooked in src/assetSlots.js for exact slots; no draw-call change). Proof docs/shots/grime-2026-10-23/. Build passes. A1 grime item ticked (stains are global noise, not per door).
Next: A1 props (lamps, charpai, handpump, chabutra).

---

**2026-10-23 (cycle 36):** Game change: canal now has a cement lining along both water edges, grassy outer bank strips, and the pukka bridge has parapet coping plus four end posts (src/canal.js, no new draw calls). Proof docs/shots/canal-2026-10-22T20-49-15-988Z/canal_bridge.png. Build passes, budget 18.61 MB. A1 canal item ticked; village boundary walls were not changed.
Next: A1 soft dirt at wall bases / stains, then props (lamps, charpai, handpump).

---

**2026-10-23 (cycle 35):** Game change: abadi village houses now have painted doors and shutters (bottle green, teal, oxblood, indigo, ochre, turquoise, varied per house) instead of all dark brown (tools/blender/build_abadi.py, 6 models rebuilt, layout identical, no new draw calls). Proof docs/shots/compare/painted-wood/south_row.png and lane2.png. Build passes, budget 18.61 MB. A1 #4 ticked for abadi only; hero house/school/bazaar doors are still natural wood.
Next: A1 canal bank, bridge and boundary walls.

---

**2026-10-23 (cycle 34):** Game change: west third of the family field now has a paler straw-coloured ground (src/field.js, second ground plane, +1 draw call in field zone only) so the stubble reads as harvested wheat. Proof docs/shots/compare/field-zones-2/west_stubble.png and overview.png. Build passes. A1 #5 ticked.
Next: A1 #4 painted wood trim (shared trim sheet), then canal bank/bridge/boundary walls.

---

**2026-10-23 (cycle 33):** Game change: the family field is now zoned per MAP.md: west third harvested wheat stubble (short pale straw tufts), east third sabzi beds (bright low green rows with bare walking paths), middle stays wheat (src/field.js buildCropRows, same instanced mesh, no extra draw call). Proof docs/shots/compare/field-zones/east_sabzi.png and west_stubble.png. Build 15/15, budget 18.61 MB. A1 #5 NOT ticked: stubble reads sparse on dark soil; needs a lighter straw ground tint in that zone.
Next: lighten stubble ground, then A1 #4 painted wood trim.

---

**2026-10-23 (cycle 32):** Game change: ration shop and atta chakki now have sloped corrugated-tin roofs (tools/blender/build_new_shops.py; props merged into the main material so the hero zone stays 150/150). Proof: docs/shots/compare/new-shops-roofs/high.png. Build 15/15, budget 18.6 MB. A1 #3 ticked. Post office keeps its flat parapet roof.
Also: field soil now has darker plough furrows between crop rows (src/materials.js `furrows` option, src/field.js; no extra draw call). Proof docs/shots/compare/field-furrows/low.png. A1 #5 NOT ticked (stubble, sabzi beds remain).
Next: A1 #5 stubble + sabzi beds, then #4 painted wood trim.

---

**2026-10-23 (cycle 31):** Game change: bazaar row walls now alternate cream, limewash pink, mint and the one blue-grey unit (tools/blender/build_bazaar_row.py, model rebuilt). Proof: docs/shots/bazaar-walls-2026-10-23/bazaar_back.png. Build 15/15, budget 18.45 MB. A1 #2 ticked. Lesson: post office/ration/atta chakki and most buildings are Blender GLBs, the src/ code shells are invisible collision backing, so roof and colour changes go in tools/blender/build_*.py (Blender is at ~/Applications/Blender.app, tools/blender/make.sh <suffix> <slot>).
A1 #3 roofs NOT ticked: tried a terracotta gable on the ration shop + tin gable on the atta chakki (tools/blender/build_new_shops.py, looked right) but each new material cost a draw call and the hero zone went 150 -> 152, so I reverted it. Bg houses C/D already have tin/terracotta roofs and the bazaar awning is real tin, but no clear screenshot proves a hero building roof. Needs draw-call headroom in the hero zone first (merge materials), then retry.
Next: free 2+ hero-zone draw calls, then roofs; else A1 #4 painted wood trim.

---

**2026-10-23 (cycle 30):** Game change: raised pale-cement kerbs along the halwai-to-school lane (src/paths.js buildKerbSegments, merged into the lane's draw call, zero extra); every plaster wall now gets its own brightness, warm/cool lean and soft rain streaks (src/materials.js). Proof: docs/shots/kerbs-2026-10-23/kerb_b2.png. Build + validator pass, hero zone still 150/150. A1 #1 ticked; A1 #2 NOT ticked (per-wall variation is in, but pink/mint palette mix not checked).
Next: A1 #2 palette check, then roofs (terracotta/tin).

---

**2026-10-23 (cycle 29):** Game change: lane/track strips (src/paths.js) now have a rolled grass-blended edge, a shallow damp drain channel + dusty berm along each side, darker polished wheel ruts and patchy brightness. Proof: docs/shots/2026-10-22T20-00-51-846Z/low_angle.png. Push works over SSH again. A1 item 1 NOT ticked: no raised kerbs yet, and a ragged lane patch near the post office (also present before this change) still needs a look.
Next: lane kerbs at the chowk, wall plaster colour variation (A1 #2).

---

**2026-10-23 (cycle 28):** No live-game change. Inbox empty. `git push` still fails (no GitHub login), 17 commits waiting; stopped rather than stack more unpublished work.
Next: once push works, free hero-zone draw calls, real cattle models, Blender tree rebuild.

---

**2026-10-23 (cycle 27):** No live-game change. Inbox empty. `git push` still fails (no GitHub login), 16 commits waiting; stopped rather than stack more unpublished work.
Next: once push works, free hero-zone draw calls, real cattle models, Blender tree rebuild.

---

**2026-10-22 (cycle 26):** No live-game change. Inbox empty. `git push` still fails (no GitHub login), 15 commits waiting; stopped rather than stack more unpublished work.
Next: once push works, free hero-zone draw calls, real cattle models, Blender tree rebuild.

---

**2026-10-22 (cycle 25):** No live-game change. Inbox empty. `git push` still fails (no GitHub login), 14 commits waiting; stopped rather than stack more unpublished work.
Next: once push works, free hero-zone draw calls, real cattle models, Blender tree rebuild.

---

**2026-10-22 (cycle 24):** No live-game change. Inbox empty. `git push` still fails (no GitHub login), 13 commits waiting; stopped rather than stack more unpublished work.
Next: once push works, free hero-zone draw calls, real cattle models, Blender tree rebuild.

---

**2026-10-22 (cycle 23):** No live-game change. Inbox empty. `git push` still fails (no GitHub login), 12 commits waiting; stopped rather than stack more unpublished work.
Next: once push works, free hero-zone draw calls, real cattle models, Blender tree rebuild.

---

**2026-10-22 (cycle 22):** No live-game change. Inbox empty. `git push` still fails (no GitHub login), 11 commits waiting; stopped rather than stack more unpublished work.
Next: once push works, free hero-zone draw calls, real cattle models, Blender tree rebuild.

---

**2026-10-22 (cycle 21):** No live-game change. Inbox empty. `git push` still fails (no GitHub login), 10 commits waiting; stopped rather than stack more unpublished work.
Next: once push works, free hero-zone draw calls, real cattle models, Blender tree rebuild.

---

**2026-10-22 (cycle 20):** No live-game change. Inbox empty. `git push` still fails (no GitHub login), 9 commits waiting; stopped rather than stack more unpublished work.
Next: once push works, free hero-zone draw calls, real cattle models, Blender tree rebuild.

---

**2026-10-22 (cycle 19):** No live-game change. Inbox empty. `git push` still fails (no GitHub login), 8 commits waiting; stopped rather than stack more unpublished work.
Next: once push works, free hero-zone draw calls, real cattle models, Blender tree rebuild.

---

**2026-10-22 (cycle 18):** No live-game change. Inbox empty. `git push` still fails (no GitHub login), 6 commits waiting; stopped rather than stack more unpublished work.
Next: once push works, free hero-zone draw calls, real cattle models, Blender tree rebuild.

---

**2026-10-22 (cycle 17):** No live-game change. Inbox empty. `git push` still fails (no GitHub login), 5 commits waiting; stopped rather than stack more unpublished work.
Next: once push works, free hero-zone draw calls, real cattle models, Blender tree rebuild.

---

