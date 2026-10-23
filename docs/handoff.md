**2026-10-23 (cycle 38am):** No game-code change this cycle. Took framed screenshots at the side-job spots (docs/shots/jobs-2026-10-23/) as partial A5 proof; weak (kanche camera inside foliage, NPCs capsules). Suspected budget breach at (-46,14.6) checked: 177 calls includes shadow pass, validator metric is 122, so no breach.
Next: kanche camera-in-foliage, in-job screenshots, real game change from A3/A4.

---

**2026-10-23 (cycle 38al):** Game change: the khel maidan at the east edge now has its own distant kids' cheer (fainter, 70 m range) in free roam, src/jobs/gilli.js. Sound radar for chakki, kulfi bell and gilli maidan verified with audio spies (volume fades, silent out of range), proof docs/shots/radar-proof-2026-10-23/radar.txt. No movement code touched. Note: headless render is ~1 fps at 1280x800 so game timers barely advance; use a tiny viewport for time-based tests.
Next: side-job screenshot proof per job, field-side walls.

---

**2026-10-23 (cycle 38ak):** Game change: field track loop gets a sparse tulsi + marigold verge just outside its edge (buildTrackVerge, src/field.js, one garden-plant draw call, no colliders). Build passes, budget 19.4 MB, no movement code touched. Proof docs/shots/trackverge-2026-10-23/walk_d.png, walk_e.png. Banana dropped from the verge: the follow camera ended up inside a clump.
Next: A5 sound radar proof, side-job screenshot proof.

---

**2026-10-23 (cycle 38aj):** Game change: canal banks get sparse greenery (bougainvillea, tulsi, banana) outside the grassy strips, clear of bridge and pulia (src/canal.js, one extra garden-plant draw call). Build 15/15, budget 19.4 MB, console clean. Proof docs/shots/canalgreen-2026-10-23/canal_a.png, canal_b.png. No movement code touched.
Next: A5 sound radar proof, field-track kerbs, side-job screenshot proof.

---

**2026-10-23 (cycle 38ai):** Game change: boundary walls get wall-base greenery (bougainvillea, marigold, creepers, banana) via one garden-plant mesh per wall zone (src/farmSites.js). Build 15/15, console clean. Proof docs/shots/wallgreen-2026-10-23/. No movement code touched.
Next: A5 sound radar proof, field-track kerbs, side-job screenshot proof.

---

**2026-10-23 (cycle 38ah):** Game change: school compound greenery (creepers on south wall, marigold + tulsi at gate, banana corners) via the existing garden-plant batch. Build 15/15, budget 19.4 MB, console clean. Proof docs/shots/school-green-2026-10-23/gate.png.
Next: A5 sound radar proof, field-track kerbs, side-job screenshot proof.

---

**2026-10-23 (cycle 38ag):** Game change: greenery on every abadi house front (creepers on walls, tulsi + marigold pots, banana at row ends; abadiGardenPlants in src/scenery.js, one extra garden-plant mesh, only drawn when abadi in view). Build 15/15, budget 19.4 MB, regression 22/22, console clean. Proof docs/shots/abadi-green-2026-10-23/.
Next: school greenery, A5 sound radar proof, field-track kerbs.

---

**2026-10-23 (cycle 38af2):** Game change: greenery around the post office / ration shop / atta chakki (side-wall creepers, tulsi, marigold pair, banana clumps) via the existing one-draw-call garden-plant batch (src/main.js). Build 15/15, budget 19.4 MB, regression 22/22. Proof docs/shots/newshops-green-2026-10-23/front_b.png, back.png (other angles blocked by a neem).
Next: A5 sound radar proof, field-track kerbs, side-job screenshot proof.

---

**2026-10-23 (cycle 38af):** Game change: notebook map widened to the whole village (landscape 960x640 page, 23 new discoverable places from the streamed MAP.md sites, water icon, label-collision skip, canal line full length; src/freeRoam.js, index.html). Proved free-roam pieces by real walking: notebook map + title 'Continue roaming' (proof docs/shots/roam-proof-2026-10-23/), ticked both FINISH_LINE boxes. Build 15/15, console clean. Hero-cluster labels still crowd a little at that scale. No movement code touched.
Next: A5 sound radar proof, field-track kerbs, side-job screenshot proof.

---

**2026-10-23 (cycle 38ae):** Game change: three more village boundary wall runs (east upper z 21..58, east far-south z 135..157, west far-north z 21..34; zones edge_wall_e0/e3/w0 in src/main.js). Build 15/15, budget 19.4 MB, console clean. Proof docs/shots/edgewall3-2026-10-23/. Also audited all 10 side jobs end to end (all pass; notes in BACKLOG A5). No movement code touched.
Next: A5 remaining (sound radar, notebook map, Continue roaming proof), field-track kerbs.

---

**2026-10-23 (cycle 38ad):** Game change: boundary walls extended along the abadi's south-centre, west lower half and east lower half (src/main.js zones edge_wall_s2/w2/e2, createBoundaryWall). Build 15/15, budget 19.4 MB, console clean. Proof docs/shots/edgewall2-2026-10-23/. No movement code touched, no colliders.
Next: A5 side-job real-input audit (no side-job test exists in regression-check.js), field-side walls.

---

**2026-10-23 (cycle 38ac):** No game change kept. Tried a tree distance-billboard impostor (src/trees.js); screenshots showed flat green blobs and an all-green overview, so it was reverted (notes in BACKLOG A3). Build 15/15 and regression 22/22 were green on the attempt but visual fail.
Next: A5 side-job checklist audit against docs/MISSIONS_PLAN.md, field-side boundary walls.

---

**2026-10-23 (cycle 38ab):** Game change: tree canopy leaf cards no longer cast shadows (src/trees.js; trunks still do), cutting the regression-check view from 436k to 391k triangles (shadow pass was double-counting ~92k merged tree tris). Test fix: tools/regression-check.js attached-trolley approach waits 3 s (not 1.2 s) of stalled clearance before giving up, since at ~3 fps a streaming hitch looked like "blocked far away"; the trolley itself was solid and reachable (probe walked to 0.2 m). `node tools/regression-check.js` now 22/22, build 15/15. Screenshots docs/shots/2026-10-23T02-05-49-374Z/ (tree shadow on the ground still present from trunks/buildings; canopy shade lighter). Baseline file docs/regression-baseline.json is stale (108k) and left alone.
Next: field-track kerbs, A5 side-job checklist audit.

---

**2026-10-23 (cycle 38aa):** Game change: player colliders on streamed MAP.md sites (health centre, chemist, masjid + minaret, gurudwara, Jain mandir, TV house, anganwadi, dairy, old haveli ranges, gaushala back wall) via finishSite opts.solids / solidBoxes in src/farmSites.js; zoneManager already rebuilds STATIC_COLLIDERS on zone change. Verified in a live page: masjid zone builds with 2 collider boxes. Build 15/15, budget 19.4 MB. No visual change, so no new screenshots. FOUND: tools/regression-check.js reports 'triangles under 400k' FAIL (436002) and 'trolley blocks the player (attached)' FAIL (2.96 m); both fail identically with my change stashed, so they predate it (an ad-hoc count at the same camera gave 186k, so the 436k probably depends on state/zones loaded earlier in the check; not yet diagnosed).
Next: diagnose the 436k triangle count and the attached-trolley check, field-track kerbs, A5 side-job audit.

---

**2026-10-23 (cycle 38z):** Game change: nali drains with cover slabs on the temple lane and the three bazaar approach legs (src/temple.js, src/bazaar.js via buildDrainSegments, merged into each lane mesh, no new draw calls). Build 15/15, budget 19.4 MB. Proof docs/shots/drains2-2026-10-23T01-26-41-845Z/temple_lane.png (bazaar legs not framed).
Next: colliders on new sites, A5 side-job checklist audit, tree billboard impostor.

---

**2026-10-23 (cycle 38y):** Game change: open drains (nali) with cement cover slabs beside the abadi lane kerbs (buildDrainSegments, src/paths.js; used in src/scenery.js), zero new draw calls. Build 15/15, budget 19.4 MB. Proof docs/shots/drains-2026-10-23T01-22-11-711Z/abadi_e1.png, abadi_w1.png.
Next: drains on temple/bazaar lanes, colliders on new sites, A5 side-job checklist audit.

---

**2026-10-23 (cycle 38x):** Game change: village boundary walls (low lime-plaster compound wall on a brick-red plinth, coping, pilasters every 4 m, a gap where each lane leaves) closing the abadi's west (x -101), south (z 157) and east (x 46) edges, zone-streamed (createBoundaryWall, src/farmSites.js; 3 zones in src/main.js). Build 15/15 (hero 149/150, bazaar 123), console clean. Proof docs/shots/edgewall-2026-10-23b/west_wall.png, south_wall.png (the black sky patch in south_wall is the free photo camera, not the wall). Visual only, no colliders; north edge faces the canal so no wall there.
Next: field-track kerbs, colliders on new sites, A5 side-job checklist audit.

---

**2026-10-23 (cycle 38w):** Game change: kachcha bank road on the north (village) side of the canal at z 38.8, x -50..34 (createCanalBankRoad got a name param, zone 'canal_bank_road_n' in src/main.js); MAP.md says both banks. Build 15/15, validator passes. Proof docs/shots/northbank-2026-10-23T01-10-01-020Z/both_banks.png, north_bank_a.png. Visual only, no colliders. A4 MAP.md comparison: every named place now built; box left unticked pending art director.
Next: field-track kerbs, tree billboard impostor, colliders on new sites.

---

**2026-10-23 (cycle 38v):** Game change: cement kerbs on all 5 abadi lanes (E1,E2,W1,W2,S1; src/scenery.js via buildKerbSegments, shared lane material). Build 15/15, budget 19.4 MB. Proof docs/shots/kerbs3-2026-10-23T01-05-01-534Z/abadi_e1.png, abadi_w1.png.
Next: tree billboard impostor, kerbs on field tracks, verify A4 list vs MAP.md.

---

**2026-10-23 (cycle 38u):** Game change: raised cement kerbs on the temple lane and the three bazaar approach legs (src/temple.js, src/bazaar.js via buildKerbSegments, merged into each lane's one mesh, no new draw calls). Build 15/15 (hero 148/150, bazaar 123), budget 19.4 MB, console clean. Proof docs/shots/kerbs2-2026-10-23T00-53-05-942Z/temple_lane.png.
Next: tree billboard impostor, kerbs on abadi lanes/field tracks, verify A4 list vs MAP.md.

---

**2026-10-23 (cycle 38t):** Game change: old haveli (150,-30; two-storey courtyard mansion, arched gate, jharokhas, corner chhatris) and gaushala (-125,-35; open cattle shed, trough, hay, 5 resting cows) added, zone-streamed (src/farmSites.js, src/main.js). MAP.md gives no coordinates. Build 15/15. Proof docs/shots/sites-2026-10-23T00-35-19-491Z/. No colliders. Every named MAP.md place now has a build, but A4's unticked box still needs a final MAP.md comparison. Tree billboard impostor skipped: the 120 m LOD is already one draw call.
Next: verify A4 list vs MAP.md, kerbs on other lanes, colliders on new sites.

---

**2026-10-23 (cycle 38s):** Game change: trees now have 3 distance LODs (src/trees.js, THREE.LOD: full / 55 m thinned leaves, no shadow / 120 m leaves only, trunk dropped), fewer draw calls and triangles for far trees. Build 15/15 (hero 148/150), budget 19.4 MB, console clean. Proof docs/shots/2026-10-23T00-25-32-752Z/spawn_behind.png (near LOD; far LOD not framed). Not done: billboard impostor, old haveli/gaushala.
Next: billboard impostor, kerbs on other lanes, old haveli/gaushala.

---

**2026-10-23 (cycle 38r):** Game change: grass patches on the ground now carry real photoscan normal + roughness (grass_normal/roughness.webp, 1K, src/materials.js shader hook), no new draw call. Build 15/15 (hero 149/150), budget 19.4 MB, console clean. Proof docs/shots/2026-10-23T00-17-47-214Z/high_overview.png. Not done: tree LODs/billboards, old haveli/gaushala.
Next: tree LODs + billboard, kerbs on other lanes.

---

**2026-10-23 (cycle 38q):** Game change: wall creepers (money-plant curtains) on the bazaar row's back wall and east end, a 5th atlas cell in buildGardenPlants (src/vegetation.js, placed in src/main.js), no new draw call. Build 15/15, budget OK. Proof docs/shots/creepers-2026-10-23/back4.png. Creepers only on the bazaar, not on abadi houses or the hero house. Not done: tree LODs/billboards, old haveli/gaushala.
Next: tree LODs + billboard, old haveli/gaushala (V2), close pulia shot.

---

**2026-10-23 (cycle 38p):** Game change: patli pulia, a narrow plank-and-handrail foot crossing over the nahar at x=-3 (src/canal.js, PULIA_X), with a 1.6 m gap in the bank colliders so the player can walk across but vehicles cannot. Build 15/15 (hero zone 149/150), regression 22/22. Proof docs/shots/pulia-2026-10-22T23-57-02-796Z/ (pulia is small in these shots and not clearly visible; I did not walk across it with real input). Not done: tree LODs/billboards, wall creepers, old haveli/gaushala.
Next: tree LODs + billboard, wall creepers, a close pulia shot.

---

**2026-10-23 (cycle 38o):** Game change: gentle wind sway on every tree's leaf cards (vertex shader on the shared leaf material, src/trees.js, no extra draw calls; 108 calls, build 15/15, no console errors). Proof docs/shots/2026-10-22T23-49-51-311Z/low_angle.png (still frame, motion not visible). Not done: tree LODs/billboards, patli pulia, old haveli/gaushala.
Next: patli pulia, tree LODs + billboard, wall creepers.

---

**2026-10-23 (cycle 38n):** Game change: kachcha canal bank road (packed-earth track with twin ruts, dung patches, whitewashed marker pegs) along the south bank of the nahar, zone-streamed (createCanalBankRoad, src/farmSites.js, radius 28 m so hero zone stays 148/150). Proof docs/shots/sites-2026-10-22T23-46-03-436Z/. Build 15/15. Chaupal: chabutras already exist (temple peepal, chowk). MAP.md gives no coordinates. No colliders; north bank road and patli pulia not built.
Next: patli pulia, wall creepers, old haveli/gaushala (V2).

---

**2026-10-23 (cycle 38m):** Game change: mandi (town market east of the highway, (226,60): paved yard, grain godown with sacks, vegetable yard shed with crates, weighing station, dhaba with charpais, 3 plain parked trucks) added, zone-streamed (createMandi, src/farmSites.js). Also fixed the hero-zone 151/150 failure: khalihan stream radius 38 -> 28 (src/main.js); `npm run build` now 15/15. MAP.md gives no coordinates for the mandi. Proof docs/shots/sites-2026-10-22T23-25-16-952Z/. No colliders on the mandi; trucks do not move.
Hero zone then flickered 150/151 between builds; the far kachcha homestead is now only drawn within 80 m (src/scenery.js), hero reads 148, build 15/15 twice, regression 22/22.
Next: chaupal platform check, kachcha canal bank roads, wall creepers, old haveli/gaushala (V2).

---

**2026-10-23 (cycle 38l):** Game change: jalebi + samosa stall (-104,4), mela + wedding ground with shamiana, swing and stalls (-135,150), gurukul inter college (160,85) and khel maidan with cricket strip, badminton net, pavilion (165,135) added, all zone-streamed (src/farmSites.js, src/main.js). MAP.md gives no coordinates. Proof docs/shots/sites-2026-10-22T23-02-38-573Z/ and sites-2026-10-22T23-00-16-314Z/. Build passes except pre-existing hero-zone 151/150; none of these add to it. Gurukul has no windows on its yard face view yet; no colliders on any of these.
Next: hero-zone 151 fix, mandi area, chaupal check, kachcha canal bank roads, wall creepers.

---

**2026-10-23 (cycle 38k):** Game change: TV house (70,12), manihari stall (90,78), sabzi rehris (88,92), Jain mandir (130,160) and an east highway cluster at (205,40) (paved road, petrol pump, bus adda, dharam kanta) added as zone-streamed scenery (src/farmSites.js, src/main.js). MAP.md gives no coordinates. Proof docs/shots/sites-2026-10-23d/. Build passes except pre-existing hero-zone 151/150; budget OK (18.9 MB). Highway has no colliders and no trucks yet; mandi past the highway still unbuilt.
Next: hero-zone 151 fix, jalebi + samosa stall, chaupal platform, mela ground, mandi, gurukul, khel maidan.

---

**2026-10-23 (cycle 38j):** Game change: health sub-centre (96,30), chemist (96,60), masjid (100,135) and gurudwara (-60,175) added as zone-streamed scenery (src/farmSites.js, src/main.js); faith buildings have no gameplay. MAP.md gives no coordinates. Proof docs/shots/sites-2026-10-23c/. Build passes except pre-existing hero-zone 151/150. Note: photo-camera shots at the far east/south edge show 169 calls and a clipped sky dome, a free-camera artifact (normal-play view reads 72-82 calls).
Next: hero-zone 151 fix, TV house, manihari, sabzi rehris, Jain mandir, highway cluster.

---

**2026-10-23 (cycle 38i):** Game change: anganwadi (pink one-room centre with yard wall and slide, (-104,106)), dudh dairy (cream collection room, steel milk cans, tin awning, (-112,18)) and the neighbour's 2-mango orchard ((12,127),(27,129)) added, all zone-streamed (src/farmSites.js, src/main.js). MAP.md gives no coordinates. Proof docs/shots/sites-2026-10-23b/ (anganwadi_b.png, dairy.png). Build + regression 22/22 pass; hero zone still 151/150 (pre-existing). Note: school compound is 85x75 m (-92..-8, 68..143), earlier spot guesses fell inside it.
Next: hero-zone 151 fix, chemist, sabzi rehris, health sub-centre, TV house, masjid/gurudwara scenery.

---

**2026-10-23 (cycle 38h):** Game change: johad (small SE pond with reeds, (78,105)) and khalihan threshing floor with four bhoosa straw stacks ((-78,-5), west of the stubble) added, both zone-streamed (createJohad, createKhalihan in src/farmSites.js). MAP.md gives no coordinates. Proof docs/shots/sites-2026-10-22T22-25-31-728Z/. Note: validator check 8a hero zone reads 151/150, and it already did at HEAD before this change (not caused by these zones) - needs a look.
Next: hero-zone 151 draw call fix, neighbour's orchard, anganwadi, dudh dairy, chemist, sabzi rehris.

---

**2026-10-23 (cycle 38g):** Game change: village pond with lotus and bathing ghat (-132,70), tubewell + kothri with cistern (-40,-8), and a ~42x34 m sugarcane belt (0..42, 135..169) with lanes, all streamed (src/farmSites.js, registered in src/main.js). MAP.md gives no coordinates for any. Proof docs/shots/sites-2026-10-22T22-09-49-386Z/. Build, regression (22/22) pass. Cane has no colliders yet; pond has no buffalo.
Next: johad, neighbour's orchard, bhoosa stacks, khalihan, anganwadi.

---

**2026-10-23 (cycle 38f):** Game change: paani ki tanki + pole transformer landmark built (createWaterTankProp, src/props.js; ~12 m tank on four braced legs with ladder, streamed via zoneManager at (-22,122), radius 90 m because the hero zone is at exactly 150 draw calls). Proof docs/shots/water-tank-2026-10-23/tank_far.png. A4 missing-location list is in docs/BACKLOG.md A4. MAP.md gives no coordinate for the tank.
Next: pond, tubewell + kothri, sugarcane belt (A4 list).

---

**2026-10-23 (cycle 38e):** Game change: ground grass patches now carry a real photoscanned CC0 grass texture (Poly Haven aerial_grass_rock, 1K WebP, shader blend in src/materials.js; assets 18.9 MB, 109 draw calls, no console errors). Proof docs/shots/2026-10-22T21-52-23-402Z/high_overview.png.
Next: wall creepers, then A4 MAP.md comparison list.

---

**2026-10-23 (cycle 38d):** Game change: marigold beds, banana clumps, tulsi and bougainvillea are now painted alpha-cut cards (buildGardenPlants in src/vegetation.js, one atlas, one draw call, replaces the old flat blade flowers); banana clumps and tulsi added near house, temple and chowk. Proof docs/shots/garden-plants-2026-10-23/. Build passes. A3 low-vegetation not ticked (wall creepers and a CC0 ground-cover texture remain).
Next: ground-cover texture, then A4 MAP.md comparison list.

---

**2026-10-23 (cycle 38c):** Game change: grass tufts and scrub bushes are now crossed alpha-cut blade cards (src/vegetation.js) instead of boxes, no extra draw calls. Proof docs/shots/trees-2026-10-22T21-42-52-648Z/neem_close.png. A3 low-vegetation not ticked (tulsi, marigold beds, creepers, banana, CC0 ground cover remain).
Next: finish A3 low vegetation, then A4 MAP.md comparison list.

---

**2026-10-23 (cycle 38b):** Game change: all five tree species rebuilt (src/trees.js) - curved root-flared trunks, forking branches, thousands of alpha-cut leaf-sprig cards from a species atlas (neem pinnate, peepal heart, mango lance, babool feathery, eucalyptus hanging), outward-pointing shading normals; still 2 draw calls for all trees (109 total, 354k tris). Proof docs/shots/trees-2026-10-22T21-34-16-180Z/ and trees-2026-10-22T21-35-27-570Z/. A3 tree item NOT ticked (code-built, not Blender; question in NEEDS_YOU).
Next: A3 low vegetation and ground cover, then tree LODs/wind sway; A4 map comparison.

---

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

