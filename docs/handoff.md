**2026-10-24 (cycle 39z40, playtest block item 3, mustard density):** Game change: sarson plots now get a flower-head canopy on every grid spot (was every other) with 16 cards per instance (was 12), so mustard reads as a continuous yellow carpet from khet distance, not scattered sprigs (src/field.js buildSarsonBloom / sarsonSpots). Same single InstancedMesh, no new draw call, no asset bytes. Khet variety already in code: sarson, young wheat, ripe wheat, ploughed earth, veg patch, sugarcane blocks; haystacks at tubewell and tea stall exist (docs/shots/khet-2026-10-24/haystacks_tubewell.png). Proof docs/shots/sarson-2026-10-24b/{overview,close}.png (headless, camera shots, no subject check). Item 3 NOT ticked as a whole: haystack-near-tea-stall shot not re-taken; crop blades still flat-card look at close range.
NEXT: draw-call saving in the hero view (unblocks wood), tea glasses/jars, findability walk.

---

**2026-10-24 (cycle 39z39, animals, monkey):** Game change: the M6 monkey (src/animals.js buildMonkeyMesh) rebuilt from capsule/box blobs into a rhesus macaque: deep chest to slim waist, haunch, shoulder hump, pale belly, round skull with brow ridge, pale bare face, muzzle, nostrils, eyes, ears, tapered limbs with elbow/knee joints and dark hands/feet, long tapering tail arcing over the rump, and the shared fur texture/bump from the cattle and dogs (no new asset bytes, still one merged Mesh, one draw call). Build ALL PASSED, budget 29.31 MB. Proof docs/shots/monkey-2026-10-24/{side,three_q,front}.png (isolated test scene tmp/monkeyview.html, not in-game; no in-game subject check, so "animal models" NOT ticked). Gaps: limbs still straight cylinders, no run animation, goats do not exist in code.
NEXT: draw-call saving in the hero view (unblocks wood), tea glasses/jars, findability walk.

---

**2026-10-24 (cycle 39z38, animals, dog):** Game change: street dogs (src/animals.js buildDogGeometry) rebuilt from capsule/box blobs into a lean pariah dog: deep chest tapering to a slim waist, haunch, neck, wedge skull and muzzle with nose, prick ears, eyes, sickle tail, tapered legs with a hock bend and pale paws, and the shared fur texture from the cattle (finer UV scale so it reads as fur, not wood). Same InstancedMesh, no new draw call, no asset bytes. Build ALL PASSED, budget 29.31 MB. Proof docs/shots/dog-2026-10-24/{side,three_q,front}.png (isolated test scene tmp/dogview.html, not in-game; no in-game subject check, so "animal models" NOT ticked). Gaps: legs still stick-thin and torso segments visibly lumpy, no walk animation, monkey and goats untouched.
NEXT: draw-call saving in the hero view (unblocks wood), tea glasses/jars, monkey.

---

**2026-10-24 (cycle 39z37, animals):** Game change: cattle/buffalo (src/animals.js buildBovineGeometry) rebuilt with real anatomy instead of capsule blobs: long barrel and rump, zebu hump, dewlap, udder, wedge head with muzzle, horns, ears, eyes, tapered legs with dark hooves, tail with switch; one shared procedural hide texture (hair grain, soft patches, bump + roughness) on the same InstancedMesh, so no new draw call and no asset bytes. Grazing pitch cut from 0.5 to 0.1 rad (the old sway tipped the whole animal nose-down 28 degrees). Free-asset search: Poly Pizza CC0 cows (Quaternius-style, 3 found) are flat-colour low-poly holsteins, no textures, so they fail rule 2 and were not used; no free realistic zebu exists. Build ALL PASSED. Proof docs/shots/cattle-2026-10-24/{cow,buffalo}.png (headless; no subject check, so "animal models" NOT ticked). Gaps: legs still thin, body still smooth-stylised, dogs and monkey untouched, buffalo reads dark and glossy.
NEXT: dog model, draw-call saving in the hero view (unblocks wood), tea glasses/jars.

---

**2026-10-24 (cycle 39z36, playtest block item 4, tea stall steel):** Game change: the tea stall's pot, kettle, spout, tray, steel tin and bucket are now real PBR metal (kind 'metal' routed into the tin slot in tools/blender/build_tea_stall.py, tea_stall.glb rebuilt) instead of flat-paint faceted cylinders; they ride the roof's existing tin draw call, so hero and bazaar views stay at exactly 150 of 150 (a separate metal/terracotta slot cost +1 and failed check 8a, so was rejected). Build 16/16. Proof docs/shots/teametal-2026-10-24/front.png (headless, subject check passed; steel reads ribbed because it uses the corrugated tin set). Item 4 NOT ticked as a whole: tea glasses and shelf jars still flat paint; wood in bazaar row/tea stall still plaster tan (needs a draw call).
NEXT: draw-call saving in the hero view (unblocks wood and glass), animal models.

---

**2026-10-24 (cycle 39z35, playtest block item 4, tailor/barber/puncture goods):** Game change: the bazaar row's tailor now has folded printed-cloth stacks on the counter, the barber's flat-paint bottles are textured amla-oil and shampoo bottles with towels on a rail (new atlas cells hairOil/shampoo/towel), and the puncture shop's flat black rings are textured tyres and tubes (sidewall print, tread) hung from the beam plus a tyre in the tub (src/shopGoods.js tyre/tube/towel/folded kinds, src/bazaar.js buildBazaarKiranaGoods; build_bazaar_row.py bottles/towel hooks/tyre rings removed, bazaar_row.glb rebuilt). Folded into the existing bazaar goods mesh: no new draw call. Build ALL PASSED, budget 29.31 MB. Proof docs/shots/bazaargoods-2026-10-24/{tailor,barber,puncture}.png (headless, subject check passed; awning hides the barber shelf so bottles/towels read small). Item 4 NOT ticked as a whole: tea glasses/jars/kettle still faceted flat paint; wood in bazaar row still plaster tan; barber chair/tailor machine flat-painted.
NEXT: draw-call saving in the hero view, wood in bazaar row, animal models.

---

**2026-10-24 (cycle 39z34, playtest block item 4, chemist goods):** Game change: the chemist (src/farmSites.js createChemist) now carries textured stock from the shared goods atlas (src/shopGoods.js chemistGoods()): stacked printed medicine cartons, a row of amber cough-syrup bottles and loose cartons on the counter. Zone group only, no hero/bazaar draw-call cost. Build ALL PASSED, budget 29.34 MB. Proof docs/shots/chemistgoods-2026-10-24/{counter,front}.png (headless, subject check passed). Item 4 NOT ticked as a whole: tailor, puncture and barber goods still plain; tea glasses/jars/kettle still faceted flat paint. Gaps: chemist counter is a flat tan box and the glass front is an opaque pale panel (no wall shelves inside).
NEXT: tailor/puncture/barber goods, draw-call saving in the hero view, wood in bazaar row, animal models.

---

**2026-10-24 (cycle 39z33, playtest block item 4, tea stall goods):** Game change: the tea stall's back shelf now carries printed biscuit/tea/chips/namkeen/salt packs in two rows, snack packs and sachet strips hang from the front beam, two biscuit packs lie on the counter (src/shopGoods.js teaStallGoods); the old flat-colour box packets are gone from tools/blender/build_tea_stall.py (tea_stall.glb rebuilt). Folded into the general-store stock mesh via mergeGoodsMeshes, so no new draw call. Build ALL PASSED. Proof docs/shots/teagoods-2026-10-24/{shelf,front}.png (headless, subject check passed). Item 4 NOT ticked as a whole: chemist, tailor, puncture and barber goods still plain; tea glasses/jars/kettle are still faceted flat paint.
NEXT: chemist goods, tailor/puncture/barber goods, draw-call saving in the hero view, wood in bazaar row, animal models.

---

**2026-10-24 (cycle 39z32, playtest block item 4, dairy goods):** Game change: the Dudh dairy (src/farmSites.js createDudhDairy) now carries textured stock from the shared goods atlas (src/shopGoods.js: 3 new skins milk/ghee/dahi, dairyGoods(), kinds 'milkpouch' and 'tub'): stacks of printed milk pouches, curd tubs and ghee tins on the collection bench. One extra draw call but only inside the dairy zone group (drawn within the zone radius, not in the hero or bazaar view). Build ALL PASSED, budget 29.34 MB. Proof docs/shots/dairygoods-2026-10-24/{bench,floor}.png (headless, subject check passed). Item 4 NOT ticked as a whole: tea stall, chemist, tailor, puncture and barber goods still plain. Gap: the pouch stacks sit straight on grass (no crate), dairy walls are still vertex-colour.
NEXT: tea stall goods (zone group, same route), draw-call saving in the hero view, wood in bazaar row, animal models.

---

**2026-10-24 (cycle 39z31, playtest block item 4, halwai goods):** Game change: the halwai's flat-colour mithai (laddoo/gulab jamun spheres, barfi boxes, jalebi coils on the cabinet thalis) and the flat jalebi/samosa in the two kadhais are gone from tools/blender/build_halwai.py (halwai_compound.glb rebuilt) and replaced by textured goods from the shared shop atlas (src/shopGoods.js: 5 new skins laddoo/gulab/barfi/jalebi/samosa, ROWS 8->10, halwaiGoods()), mesh 'halwai_stock' added in src/main.js and excluded from validator check 7 like 'general_store_stock'. Costs +1 draw call: hero view 149 -> 150 of 150 (folding it into the store mesh made it 151, so kept separate). Build 16/16, budget 29.34 MB. Proof docs/shots/halwai-goods-2026-10-24/{cabinet,kadhai}.png (headless, subject check passed; cabinet.png is a doorway angle that mostly shows the wall, kadhai.png shows the thalis and both kadhais). Item 4 NOT ticked as a whole: tea stall, dairy, chemist, tailor, puncture and barber goods still plain. Hero view is now AT the 150 ceiling: next goods work needs a draw-call saving first.
NEXT: draw-call saving in the hero view, then tea stall/dairy goods, wood in bazaar row, animal models.

---

**2026-10-24 (cycle 39z30, playtest block item 3, crop texture):** Game change: mustard (sarson) flower heads in src/field.js are now alpha-cut cards painted with a raceme of tiny four-petal yellow florets on green stems (sarsonBloomTexture, procedural canvas, 2 tris per card), replacing flat yellow triangles; crop tufts and sugarcane stalks/leaves now carry a procedural blade atlas (midrib, veins, cane nodes) instead of pure vertex colour (bladeAtlas). Same InstancedMeshes, no new draw call, no new asset bytes. Build ALL PASSED, budget 29.44 MB. Proof docs/shots/cropleaf-2026-10-24/{close,overview}.png (headless, no subject check, so item 3 NOT ticked). Gaps: wheat tufts still read as plain blades at distance, blade texture is subtle at game distance, ripe-wheat variety of growth stages unchanged, cane close-up not re-shot.
NEXT: wheat/sabzi tuft variety, other shops' interior goods, wood in bazaar row, animal models.

---

**2026-10-24 (cycle 39z29, playtest block item 3, mustard carpet):** Game change: sarson plots now carry a dense canopy of yellow flower-head triangles (new InstancedMesh 'field_sarson', buildSarsonBloom in src/field.js, ~19 tris per instance on every other grid spot of sarson plots, drawn only within 95 m of the khet like the cane in src/main.js). From a distance the plots now read as yellow flowering mustard; before, they were isolated pale sprigs on brown earth. Build ALL PASSED, field view 118 calls, hero 149, bazaar 150, budget 29.44 MB. Proof docs/shots/sarson-2026-10-24/{overview,close}.png (headless, no subject check, so item 3 NOT ticked). Gaps: close up the flower heads are flat-colour faceted triangles (no petal texture); wheat/crop tufts are still the old cards; cane is flat vertex colour.
NEXT: crop tufts and cane leaf texture, other shops' interior goods, wood in bazaar row, animal models.

---

**2026-10-24 (cycle 39z28, playtest block items 1/4, Banta shop + Chaat thela real materials):** Game change: Banta kiosk and Chaat thela (src/farmSites.js, new finishSite opts.sets) now use real PBR wood (planks, posts, crate, stool, lime basket, spokes) and real metal (awning, ice tub, steel pot, rim, umbrella pole) instead of plaster tint; thela got spoked wheels (steel rim, hub, 8 spokes, were black discs) and an open wooden display tray with papdi/chana heaps (was a white box). Two extra local draw calls per stall, zones only drawn within 14 m. Build ALL PASSED, budget 29.44 MB. Proof docs/shots/bantachaat-2026-10-24/{banta,chaat_after2}.png (headless photo camera, has HUD, no subject check, so nothing ticked). Gaps: no see-through glass possible in merged meshes; shopkeeper capsules stay.
NEXT: other shops' interior goods (item 4), wood in bazaar row, animal models.

---

**2026-10-24 (cycle 39z27, playtest block item 4/2, bazaar painted props):** Game change: the bazaar row's painted props (tyres, pump, spanners, bicycle, barber chair, bottles, plastic chairs; ~100 objects in tools/blender/build_bazaar_row.py) were plaster-textured; they now carry the real metal PBR set via Kit(tex_override={'props': ('metal', 1.0)}), same slot so no new draw call (materials still 3). bazaar_row.glb rebuilt. Build ALL PASSED, budget 29.44 MB. Proof docs/shots/bazaarprops-2026-10-24/{puncture,barber}.png (+_hi) are headless and the counter/awning hides the props from player height, so judged only roughly; nothing ticked. Honest gap: plastic chairs and bottles now read as painted metal, not plastic; wood in the bazaar is still plaster-tan.
NEXT: wood in bazaar row (own PBR set, needs a draw-call saving first), other shops' interior goods, animal models.

---

**2026-10-24 (cycle 39z26, playtest block item 7, road ends):** Game change: the mandi yard and highway run-outs (src/farmSites.js fadeStrip) are now one continuous tapering flat strip with wobbled edges and fading wheel ruts, replacing the stepped hard-edged rectangle slabs that still read as an abrupt end; same meshes, no new draw call. Build ALL PASSED, budget 29.41 MB. Proof docs/shots/roadend-2026-10-24/{mandi_end_n,mandi_end_n_after,mandi_end_s_after}.png (headless camera shots, no subject check, so item 7 NOT ticked). Gaps: strip colour ramp to earth barely shows under the concrete PBR texture, so the end is organic but still grey; highway end not re-shot (hw_end_after.png framed empty grass).
NEXT: pond shoreline mud, flat-tint barber/puncture props, Banta/Chaat real textures.

---

**2026-10-24 (cycle 39z25, playtest block item 7, pond lotus):** Game change: pond lotus pads are ~1.5x larger (0.6-1.2 m) and sit above the water surface (they were half-sunk and invisible from the bank), flowers ~2x bigger and more frequent (src/farmSites.js createPond). Same single lotus mesh, no new draw call. Build ALL PASSED, budget 29.41 MB. Proof docs/shots/lotus-2026-10-24/{pond_close,pond_wide}.png (headless, photo camera, no subject check, has HUD prompt, so item 7 NOT ticked). Pads and petals now read as lotus; petals are still faceted flat-colour (no petal texture). Buffaloes at the pond are still peg-legged blocks.
NEXT: flat-tint barber/puncture props, Banta/Chaat real textures, animal models.

---

**2026-10-24 (cycle 39z24, playtest block item 7, water sheen):** Game change: the shared water shader (src/water.js, used by pond, johad, canal, hauz) now has a fresnel sky-reflection tint at grazing angles and faint broken glitter on ripple crests, keeping the depth tint; same material, no new draw calls. Build ALL PASSED. Proof docs/shots/water-sky-2026-10-24/pond.png (headless, no subject check, so item 7 NOT ticked). Still open in item 7: the pond lotus still reads as small pink cones (visible in the shot), buffaloes are peg-legged blocks.
NEXT: real lotus pads and flowers, flat-tint barber/puncture props, Banta/Chaat real textures.

---

**2026-10-24 (cycle 39z23, playtest block item 2, milk cans):** Game change: the homestead's lone plain-cylinder milk can (tools/blender/build_kachcha.py) is now two lathed steel cans with shoulder, neck, lid and rolled bands, kachcha_homestead.glb rebuilt; the Dudh dairy cans were already proper dairy cans. Build ALL PASSED, budget 29.41 MB. Proof docs/shots/milkcan-2026-10-24/{before,homestead_after}.png (headless, no subject check, so only noted on item 2, not ticked as whole). Still flat-tint: barber/puncture props. Cattle in homestead shed are peg-legged blocks (animal models).
NEXT: flat-tint barber/puncture props, Banta/Chaat real textures, water texture (item 7).

---

**2026-10-24 (cycle 39z22, playtest block items 4-6 proof pass):** Game change: the tailor's dress form (the unidentified yellow oval, tools/blender/build_bazaar_row.py) is now maroon cloth with wider shoulders, reads clearly as a tailor's dummy beside the sewing machine; bazaar_row.glb rebuilt, no new draw calls. Build ALL PASSED, budget 29.40 MB. Proof docs/shots/dressform-2026-10-24/tailor_maroon.png (headless, subject check passed). Also: proof shots taken and FEEDBACK ticked for rooftop water tanks (docs/shots/tanks-2026-10-24/near1.png, near2.png), petrol pump and dharam kanta (existing shots re-judged); matkas checked smooth (docs/shots/matka-2026-10-24/d.png). tools/shotlib.mjs now hides the dev-only tripo_*_placeholder boxes (coloured cuboids visible in dev shots only, not in the live build). Seen, not fixed: cattle at the halwai are peg-legged blocks (animal models).
NEXT: flat-tint barber/puncture props, outfield pitch edges, Banta/Chaat real textures, milk cans.

---

**2026-10-24 (cycle 39z21, playtest block item 5, cricket outfield ground):** Game change: the khel maidan outfield (src/farmSites.js maidanOutfield) was one flat grass blob with a visible repeating diamond tile; it is now a subdivided disc with vertex-colour drift between green, dry straw and bare dust at 4-9 m scale, metric UVs, and a rim that fades to dirt (same single mesh, no new draw call). Build ALL PASSED, budget 29.40 MB. Proof docs/shots/maidan-2026-10-24/after_wide.png vs before_wide.png (headless, camera shot, no subject check, so item 5 NOT ticked; badminton court and lines already built). Reads as worn dry ground, not mud-brown; the pitch strip is still box geometry.
NEXT: shopkeeper proof shot, flat-tint barber/puncture props, Banta/Chaat real textures.

---

**2026-10-24 (cycle 39z20, playtest block item 1, stall keepers):** Game change: capsule shopkeepers now stand at the Banta shop (behind the counter) and the Chaat thela (behind the cart) in src/farmSites.js, per her rule that no spot stays empty while models are parked. They live inside the zone groups, so they stream with the stalls. Build ALL PASSED. No proof shot taken this cycle (nothing ticked).
NEXT: proof shot of both keepers, flat-tint barber/puncture props, outfield grass checker.

---

**2026-10-24 (cycle 39z19, playtest block item 1, Banta shop + Chaat thela built):** Game change: the two unbuilt places from signage item 1 now exist at their freeRoam coordinates, Banta shop (-63,22.5: plank kiosk, tin awning, crate of goli-soda bottles, steel ice tub, lime basket, stool) and Chaat thela (-63,50.5: push-cart, glass case, tamarind pot, leaf bowls, umbrella, bulb) in src/farmSites.js, each with an English-dominant bilingual board (src/placeBoards.js), colliders, zone-streamed and drawn only within 14 m so hero 148 / bazaar 150 hold. Build 16/16. Proof docs/shots/banta-chaat-2026-10-24/{banta,chaat}.png (headless, subject check passed; boards read English-first). Gaps: both are flat vertex-colour code geometry (no PBR textures, no Blender model), no goods variety, no shopkeeper capsule placed yet, MAP.md gives no coordinates for either (used freeRoam's). Item 1 still has its other open parts, not ticked.
NEXT: shopkeeper capsules at both stalls, real textures/Blender rebuild of these two, flat-tint barber/puncture props, outfield grass checker.

---

**2026-10-24 (cycle 39z18, queue item 5, far-LOD abadi openings):** Game change: the far-LOD abadi row proxies (tools/blender/build_abadi.py house_lod, make_abadi.sh) now have pale window/door surrounds and sills, three-bar iron grilles, door frame and step, a damp band above the plinth and a floor band on two-storey houses, front and rear. Near models untouched, still 1 material and ~1-1.4k triangles per proxy. Build ALL PASSED (hero 148, bazaar 150), budget 29.40 MB. Proof docs/shots/farlod-2026-10-24/east_far_after.png vs east_far.png (headless, no subject check, so NOT ticked). Still flat colour (no plaster texture) on the far proxy.
NEXT: flat-tint barber/puncture props, outfield grass checker, Banta shop / Chaat thela unbuilt.

---

**2026-10-24 (cycle 39z17, playtest block item 7, pond mud edge):** Game change: the pond (and johad rim) shoreline mud no longer ends in a crisp rim; src/farmSites.js softShoulder() adds five vertex-colour bands outside the dry-mud ring that grade from mud to the grass tone (same blob outline, merged into the existing shore mesh, no new draw call). Build ALL PASSED, budget 29.33 MB. Proof docs/shots/pond-soft-2026-10-24/pond.png (headless, no subject check, so item 7 NOT ticked). Also found: the interior-goods gaps listed in 39z7-39z11 for medical, tailor and mobile are already filled (buildBazaarKiranaGoods carries them); remaining flat-tint props are the barber chair, puncture-shop props, sewing machine and kirana floor sacks. Buffaloes at the pond read as peg-legged blocks (animal models), not touched.
NEXT: flat-tint barber/puncture props, outfield grass checker, pitch patch edges, Banta shop / Chaat thela unbuilt.

---

**2026-10-24 (cycle 39z16, playtest block item 5, chakki mill metal):** Game change: atta chakki (build_new_shops.py, Kit own=('jute','metal')) now carries the real metal PBR set on drum, hopper, motor, pulley, bin (was flat plaster tan); all flour/sugar sacks (arch.sack) are smooth-shaded, no longer faceted. Build ALL PASSED, hero 148, bazaar 150, field 117, budget 29.33 MB. Proof docs/shots/chakki-metal-2026-10-24/close.png (headless, no subject check, so item 5 NOT ticked). Metal still reads painted/matte; chakki wall wood posts still plaster tan.
NEXT: Banta shop / Chaat thela unbuilt (signage item 1), draw-call savings to unlock wood PBR, chakki wood posts.

---

**2026-10-24 (cycle 39z15, playtest block item 4, yellow oval identified):** Game change: the yellow oval at the tailor counter was the mannequin torso (a floating yellow ellipsoid on a stick). Rebuilt in tools/blender/build_bazaar_row.py as a dress form: tripod feet, pole, tapered cream-linen torso with shoulders, wooden neck knob, yellow measuring tape; bazaar_row.glb rebuilt, same material buckets (no new draw calls). Build ALL PASSED, bazaar view 140-146 calls. Proof docs/shots/dressform-2026-10-24/tailor_front.png (headless, capsule tailor visible; dress form reads left of the sewing machine; item 4 NOT ticked, other open gaps remain).
NEXT: chakki mill metal, Banta shop / Chaat thela unbuilt, draw-call savings (flagpole, wayfinding, vehicle paint) to unlock wood PBR on abadi/school/bazaar.

---

**2026-10-24 (cycle 39z14, playtest block item 3 haystacks + draw-call saving):** Game change: two bhoosa haystacks now stand behind the Sharma/Yadav tea stall (createTeaStallHaystacks in src/farmSites.js, zone 'tea_haystacks' at (-58,76), drawn only within 45 m so the hero and bazaar views stay under the ceiling; straw material added to validator check 5's sampled materials, an extension not a loosening). The school bell is now one iron-PBR mesh (was two flat-colour meshes), saving one call. Build 16/16, hero 148, bazaar 149, budget 29.33 MB. Proof docs/shots/haystack-2026-10-24/{tea_haystack,bell_c}.png (headless; tea_haystack shows one stack, second is out of frame). Searched: no free haystack model needed, reused the lathed stack + straw PBR already built for the tubewell. Swing: the yellow part was the anganwadi slide; swing sets are blue A-frames with rubber seats (docs/shots/swing-2026-10-24/anganwadi_play.png), not re-ticked. Road ends at the mandi already fray into dirt ruts in code.
NEXT: chakki mill metal, Banta shop / Chaat thela unbuilt, yellow oval at tailor counter, more draw-call savings (flagpole, wayfinding, vehicle paint meshes).

---

**2026-10-24 (cycle 39z13, playtest block item 4, doorstep slabs):** Game change: removed the eight per-unit grey block steps in front of the bazaar shops (tools/blender/build_bazaar_row.py); the one continuous front step remains, bazaar_row.glb rebuilt. Build ALL PASSED, budget 29.33 MB. Proof docs/shots/doorstep-2026-10-24/front_a.png (headless, no subject check, so item 4 NOT ticked): no stray slabs, continuous step reads. Open: yellow oval at tailor counter still unidentified; chakki mill metal; Banta shop / Chaat thela unbuilt.
NEXT: identify the yellow oval, chakki mill metal, Banta shop / Chaat thela, wood-slot draw-call savings.

---

**2026-10-24 (cycle 39z12, playtest block item 3, khet sugarcane):** Game change: the khet now has sugarcane blocks (one plot kind 'cane' in src/field.js PLOT_KINDS; ~2.6 m jointed-stalk clumps with arching leaves, one InstancedMesh 'field_cane', hidden beyond 95 m of the field centre in src/main.js so the bazaar view stays at 150 draw calls). Build 16/16. Proof docs/shots/cane-2026-10-24/cane_close.png (headless, no subject check, so item 3 NOT ticked). Gaps: cane is flat vertex-colour (no leaf texture), plot edges hard; crop tufts still old flat cards; ploughed/veg/mustard already existed.
NEXT: textured cane/crop cards, grey doorstep slabs -> continuous step, chakki mill metal, Banta shop / Chaat thela unbuilt.

---

**2026-10-24 (cycle 39z11, playtest block item 4, market props):** Game change: src/bazaar.js interior props rebuilt with real shapes in the same merged buckets (zero new draw calls): tailor's cast-iron sewing machine (base, pillar, arm, needle bar, spool, hand wheel, cloth), barber chair (base, chrome pedestal, seat, back, headrest, armrests, footrest, now facing the mirror), desktop computer (CRT, keyboard, CPU tower), puncture tub with water, pump foot plate and hose, cycle top tube and fork. Build ALL PASSED, draw calls 135-148 in shots. Proof docs/shots/market-props-2026-10-24/*.png (headless): sewing machine reads in tailor.png; barber chair, monitor and tub are hidden behind the counter and the shopkeeper capsule from street height, so NOT ticked. Props still use the tinted wood texture (dark rough on black parts), not real PBR metal/plastic.
NEXT: sugarcane blocks inside the field loop; grey doorstep slabs -> continuous step; chakki mill metal; Banta shop / Chaat thela unbuilt.

---

**2026-10-24 (cycle 39z10, playtest block item 6, wood slots):** Game change: temple, petrol pump and dharam kanta now carry the real wood PBR set (Kit(wood_slot=...) in tools/blender/arch.py routes wood into the unused tin/terracotta slot). Build 16/16, hero 148, bazaar 150 (hard ceiling), budget 29.34 MB. FINDING: a routed slot is NOT free - it is still a separate material = +1 draw call per building vs wood in plaster. I tried it on abadi, school, bazaar_row, bg_houses, tea_stall, chowk_tea, general_store: hero went 155, bazaar 157 (fails check 8a), so those seven are reverted (scripts back to plain Kit()). Needs the art director's call or draw-call savings (e.g. wood into a shared trim atlas on the plaster material). Proof shot docs/shots/wood-slot-2026-10-24/temple.png is bad (missed the temple, capsule in frame); not ticked.
NEXT: draw-call savings or a plaster+wood atlas; flat-tint interior props; pond mud edge.

---

**2026-10-24 (cycle 39z9, playtest block item 7, highway decals):** Game change: highway tar patches, cracks, centre dashes and edge lines (src/farmSites.js roadGeos) are now flat quads instead of thin boxes; the boxes' side faces were rendering as dashed black lines at grazing angles. Patch tones closer to asphalt, layers separated in height. Build ALL PASSED, budget 28.64 MB. Proof docs/shots/water-road-2026-10-24/highway3.png (before: highway.png); pond.png shows the water/lotus/mud already built (headless). Gaps: pond mud outer ring still has a crisp edge; lotus flowers small; wood fall-through audit (39z8) and flat-tint shop props still open.
NEXT: pond mud edge blend, flat-tint interior props, own=('wood',) with draw-call savings.

---

**2026-10-24 (cycle 39z8, playtest block item 6, cottage wood):** Game change: kachcha homestead (tools/blender/build_kachcha.py, Kit own=('wood',)) now carries the real wood PBR set on posts, beams, gate, charpai, stand (they had silently fallen into the plaster material = flat tan), veranda lean-to switched paint -> thatch set. Cost: +1 draw call per copy; second copy cull 80 -> 60 m (src/scenery.js) to hold bazaar view at 149. Build 16/16, budget 28.64 MB. Proof docs/shots/cottage-2026-10-24/after_porch.png (headless, no subject check, so item not ticked). Gaps: abadi/house_compound wood not audited for the same fall-through (Kit without own=('wood',) puts every 'wood' kind in plaster); audit list in 39z7 still open.
AUDIT: 11 builders add 'wood' with no own=('wood',) (abadi 36 parts, school 23, bazaar_row 17, bg_houses 14, tea_stall 9, chowk_tea 5, dharam_kanta 4, petrol_pump 3, general_store 2, temple 2, flower_stall 1) so all of it renders as flat plaster tan; fixing costs +1 call per building and the bazaar/hero views sit at 148-149 of 150, so needs the art director's call or draw-call savings first.
NEXT: draw-call savings, then own=('wood',) on abadi/school/bazaar; replace flat-tint interior props (tailor machine, barber chair, monitor, puncture tub); sugarcane blocks.

---

**2026-10-24 (cycle 39z7, playtest block item 4, market audit only):** No game change this cycle (audit + shots only; builder ran short on time). Shots docs/shots/market-audit-2026-10-24/{w1,w3}.png (headless, proof-shot tool, so capsules visible). Verified: bazaar shutters up, English-dominant boards legible, back doors/windows framed. Khet (39i), water, highway, petrol pump, kanta, chakki, post office, school games are already built per earlier entries; their FEEDBACK lines are not ticked because several have open gaps listed there.
AUDIT LIST - market objects whose purpose is not instantly readable (src/bazaar.js interior props, all flat-tint code boxes/cylinders, 'pushBox/pushCyl' ~L580-660): tailor 'treadle machine' (black box + disc + stick on counter); mobile shop 'monitor' (dark box with blue panel); barber chair (red boxes on thin legs, reads as a stool); sabzi hanging pan balance (post + two discs); puncture tub/tyre/red hand-pump/upturned cycle (grey cylinder, torus, red stick); kirana floor sacks (plain cylinders); a yellow oval hanging at the tailor counter (w3.png, centre-right, unidentified - likely a shopGoods cloth bolt or lamp; check); flat grey slabs on the ground in front of shops (doorsteps, read as stray paving). Fix plan: real CC0 sewing machine / barber chair / monitor / tub from Poly Pizza + Sketchfab CC0, or Blender-built with PBR atlas; replace the grey slabs with a continuous step. Not done.
NEXT: replace the flat-tint interior props above (item 4 last bullet); cottage-house wood textures (item 6); sugarcane blocks inside the field loop (item 3); chakki mill drum textured metal.

---

**2026-10-24 (cycle 39z6, playtest block item 5, atta chakki jute):** Game change: jute weave texture scale 0.7 -> 2.6 repeats/m (tools/blender/arch.py), new_shops.glb rebuilt; the checker-pattern read on the sacks is gone, a fine burlap weave remains. Build ALL PASSED, budget 28.43 MB. Proof docs/shots/chakki-2026-10-24/v5_close.png (headless). Item NOT ticked: sacks still faceted (flat shading), mill drum/hopper still flat-painted.
NEXT: smooth-shade sacks, textured metal for mill (needs a draw call saved), roof-level tank shot.

---

**2026-10-24 (cycle 39z5, playtest block item 5, atta chakki sacks):** Game change: sacks (tools/blender/arch.py sack()) are now a subdivided pillowy ellipsoid with flat base, gathered neck and tie, replacing the faceted box; new_shops.glb rebuilt (11k tris after shrink). Build ALL PASSED. Proof docs/shots/chakki-2026-10-24/v4_close.png (headless, no subject check). Item NOT ticked: jute weave still reads as a checker pattern (texture scale), sacks slightly onion-shaped, mill drum/hopper still flat-painted low-poly. halwai/bazaar/dharam kanta models also call sack() but were not rebuilt.
NEXT: jute UV scale/finer weave, textured metal for mill (needs a draw call saved), roof-level tank shot, barber/puncture props.

---

**2026-10-24 (cycle 39z4, playtest block item 4, sabzi produce + bangles):** Game change: sabzi shop now carries textured tomatoes, onions, potatoes, brinjal and leafy bunches (heaps in the three crates and on the counter), manihari has glass-bangle stacks with printed striped/gold-dot atlas cells (src/shopGoods.js produceAndBangleItems, atlas now 4x8, same material = zero extra draw call). Found and fixed: bangle rods (and the original rod cylinders) sat inside the back wall, so they never showed (src/bazaar.js). Build ALL PASSED (bazaar 150, hero 146), budget 28.39 MB. Proof docs/shots/shops-2026-10-24/{sabzi,bangle}_bazaar.png (headless). Free-asset search: no un-branded CC0 vegetable packs found suitable; skins are painted in code (diffuse only).
Gaps: crate heaps hidden behind the counter from eye height; Blender hanging bangle strands still flat-tint tori; barber/puncture props flat; Banta shop, Chaat thela unbuilt; tank roof-level shot still open.
NEXT: roof-level tank shot; barber/puncture props; chakki mill.

---

**2026-10-24 (cycle 39z3, playtest block item 6, water tanks):** Game change: rooftop Sintex tanks (src/rooftops.js) rebuilt: 24-segment barrel, three moulded ribs, shoulder + domed lid, screw hatch, vent, outlet elbow, brass valve, float-feed pipe, plinth lip; same merged metal/concrete meshes, no new draw call. Free-asset search: Poly Pizza "water tank" (Quaternius, Kay Lousberg: stylised low-poly, rejected for the realism target), OpenGameArt node 5550 (.blend only), RenderHub/CGTrader (paid). Build ALL PASSED. Item NOT ticked: proof shots docs/shots/tanks-2026-10-24/c1.png show tanks too small/far to judge; need a close roof-level shot (camera cannot get roof height from the ground rig).
Gaps: hand-built so far; ground-level and halwai/petrol/dharam-kanta tanks (Blender) not touched; sabzi/bangle goods still open.
NEXT: roof-level close shot of a tank; sabzi produce and bangle textures.

---

**2026-10-24 (cycle 39z2, playtest block item 5, swings):** Game change: crude swing/slide boxes replaced by real playground gear (src/farmSites.js swingSetGeos, slideGeos, limbGeo): two-seat swing set with A-frames, top bar, thin chains, rubber seats, footings at the mela ground and the anganwadi yard; anganwadi's yellow box ramp became a laddered, railed steel-chute slide (the likely "yellow swing"). Colliders added. Same merged mesh, no new draw call. Build ALL PASSED, budget 28.39 MB. Proof docs/shots/playground-2026-10-24/{anganwadi,anganwadi_swing,mela_swing}.png (headless). Checked: godown/kanta and highway road ends were already done (run-outs in roadGeos and createMandi).
Gaps: slide is hidden behind the yard wall from the front; swing set is code-built (no free CC0 model searched yet); water tank real model, sabzi/bangle goods still open.
NEXT: water tanks (real model search), sabzi produce and bangle shop textures.

---

**2026-10-24 (cycle 39z, playtest block item 5, cricket field + badminton court):** Game change: khel maidan mud pads (cricket pitch, run-ups, badminton court) used box 0..1 UVs, so the ground scan was stretched into smears; now metric UVs (one tile per 2.5 m) in src/farmSites.js createKhelMaidan. Pitch now reads as packed clay with fine grain; badminton court already had regulation lines and a mesh net (shown). Build ALL PASSED. Proof docs/shots/khel-2026-10-24/{pitch_walk,pitch,badminton}.png (headless).
Gaps: outfield grass shows a faint checker repeat; pitch patch edges are hard-edged rectangles; godown/truck road end, water tanks, yellow swing, sabzi/bangle goods still open.
NEXT: water tanks (real model), yellow swing, godown road end.

---

**2026-10-24 (cycle 39y, playtest block item 4, other shops' goods):** Game change: medical (tablet cartons, amber syrup bottles), tailor (woven stripe / indigo check / block-print cloth bolts) and mobile (keypad-phone and charger cartons) shops now carry printed-atlas goods (src/shopGoods.js atlas 4x6, built in buildBazaarKiranaGoods so same material, zero extra draw call). Flat-colour boxes/bolts removed from src/bazaar.js and tools/blender/build_bazaar_row.py (bazaar_row.glb rebuilt). Build ALL PASSED (bazaar 150, hero 146), budget 28.39 MB. Proof docs/shots/shops-2026-10-24/{medical,tailor,mobile}_bazaar.png (headless).
Gaps: bangle rings still flat-tint tori, sabzi veg spheres flat-colour, barber/puncture props flat; medical fridge/case painted boxes; chakki sacks/mill, yellow swing, Banta shop, Chaat thela still open.
NEXT: sabzi produce and bangle shop textures (item 4); chakki sacks.

---

**2026-10-24 (cycle 39x, playtest block item 5, atta chakki):** Game change: sacks (chakki + ration shop) now carry the real jute weave (new 'jute' kind in tools/blender/arch.py, own material in new_shops.glb), a capsule miller stands at the mill (src/main.js npc_miller). Draw-call cost paid for by turning shadow casting off on jute meshes (src/assetSlots.js), charpai and hand_pump. A 'metal' kind exists in arch.py but is NOT used (one extra draw call put the bazaar view at 153). Build 16/16 (bazaar 150, hero 146), budget 28.5 MB. Proof docs/shots/chakki-2026-10-24/v3_close.png (headless). Item NOT ticked: sacks still read faceted/boxy (checker-like weave scale), mill drum/hopper still flat-painted low-poly.
NEXT: rounder sack mesh (subdivided, slumped), recover a draw call to enable metal on the mill; then dharam kanta.

---

**2026-10-24 (cycle 39w, playtest block item 5, atta chakki):** Honest result: no visible change. Removed the crude code-built mill duplicates (stone, motor, belt, hopper, tray, sacks shelf, scale) from src/newShops.js; they sat inside the Blender mill and the re-shot (docs/shots/chakki-2026-10-24/close.png, headless) is identical to before. Collider kept. Build ALL PASSED. Item NOT ticked.
Real gap: the mill in tools/blender/build_new_shops.py atta_chakki() is flat-coloured faceted shapes (green drum, blue hopper, sacks that read as jars). Needs textured metal/jute materials, rounder sacks, a visible millstone/flour spout, a capsule miller at the machine.
NEXT: rebuild the chakki mill and sacks with textured materials and a capsule operator; then dharam kanta.

---

**2026-10-24 (cycle 39v, playtest block item 5, petrol pump):** Game change: a farm tractor now stands at the east pumps (tools/blender/build_petrol_pump.py tractor(): body, hood, grille, seat, exhaust, big rear and small front wheels, same two meshes so no new draw call; petrol_pump.glb rebuilt; collider added in src/farmSites.js). Pump already had canopy, two dispensers with hoses, price pole, bilingual board, office, attendant capsule: re-shot, reads as a petrol pump. Proof docs/shots/petrol-2026-10-24/{road,road_close}.png (headless).
Gaps: tractor tyres are thin tori, pump dispensers small; atta chakki, godown/dharam kanta, cricket field, badminton court, water tanks, other shops' goods, yellow swing still open.
NEXT: atta chakki readability; dharam kanta.

---

**2026-10-24 (cycle 39u, playtest block item 2, school flower beds):** Game change: faceted icosphere 'flowers' (flat colour polyhedra) removed from arch.flower_bed (school's two verandah beds; all Blender models rebuilt via make_all.sh, school model -5k triangles), real Poly Haven gazania planted on dark-earth beds instead (src/main.js, 16 plants, shared call-site draw call). Proof docs/shots/school-2026-10-24/marbles.png (headless). Build ALL PASSED, budget 28.34 MB.
Gaps: see-saw no collider; petrol pump, atta chakki, godown, cricket field, badminton court, water tanks, other shops' goods, yellow swing still open.
NEXT: petrol pump, atta chakki readability.

---

**2026-10-24 (cycle 39t, playtest block item 5, school games):** Game change: school yard now has numbered chalk hopscotch (2), a marble ring with pit and glass marbles, and a wooden see-saw (tools/blender/build_school.py, school_compound.glb rebuilt, atlas 1024x512, same single decal draw call). Earlier hopscotch decals sat under the verandah (x<-6.9) and were unseen; moved into the open yard. The flagpole already existed and reads well (docs/shots/school-2026-10-24/flag.png): her note was likely about visibility from the gate. Build ALL PASSED, budget 28.51 MB. Proof docs/shots/school-2026-10-24/{flag,hopscotch,marbles,seesaw}.png (headless, ~2-3 fps).
Gaps: see-saw has no collider; marigold flower beds use faceted icosphere blooms (visible in marbles.png, fails realism rule); yellow swing still unidentified; petrol pump, atta chakki, godown, cricket field, badminton court, water tanks, other shops' goods still open.
NEXT: flower_bed blooms (faceted icospheres) across all models; petrol pump; atta chakki.

---

**2026-10-24 (cycle 39s, playtest block item 3, halwai bhatti):** Game change: each halwai bhatti now has a fire mouth on the customer-facing face (sooty arch, black recess, glowing ember bed, half-burnt log) and the kadhai is rounder (sphere subdiv 3, no longer faceted). tools/blender/build_halwai.py, halwai_compound.glb rebuilt (+~500 tris). Proof docs/shots/halwai-fire-2026-10-24/mouth.png (headless). Build ALL PASSED, budget passed.
Gaps: embers are a plain colour (no emissive slot in the kit), no soot on the wall behind, no heat shimmer; other shops' goods, Banta shop, Chaat thela still open.
NEXT: other shops' goods (medical, mobile, bangle); findability walk; lanes.

---

**2026-10-24 (cycle 39r, 15-hour queue item 3, halwai fire rework):** Game change: halwai smoke is now thin tapering wisps (smaller, fading with height), steam finer, flame flecks smaller with a hot-yellow base going dark red, and every fire particle fades out inside ~3 m of the lens so no white blobs sit in front of the camera. The grey panel with black squares was a QR payment board plus a sound box (UPI-era props, after the ~2015 cut-off): removed from tools/blender/build_halwai.py, halwai_compound.glb rebuilt. Build ALL PASSED, budget 28.44 MB. Proof docs/shots/halwai-fire-2026-10-24/{wide,close}.png (headless). Regression not run (no movement code).
Gaps: flame is still hard to see because the bhatti brick block has no fire mouth (needs a cut in build_halwai.py); no soot or heat shimmer; other shops' goods (medical, mobile, bangle) still boxes; Banta shop and Chaat thela unbuilt.
NEXT: bhatti fire mouth + soot; other shops' goods; findability walk; lanes.

---

**2026-10-24 (cycle 39q, playtest block item 4, bazaar kirana goods):** Game change: real printed packets (biscuit, tea, chips, namkeen, toffee jars, soap) now stock the bazaar kirana (unit 1) shelves and counter (src/bazaar.js buildBazaarKiranaGoods, atlas from src/shopGoods.js). Draw call cut: the indoor postmaster capsule no longer casts shadows (its shadow pass counted as a call; per-mesh visibility test showed ~every shadow-casting mesh costs 2 calls), plus the bangle/tyre torus rings ride the cylinder mesh. Bazaar view 150, hero 148, field 115. Build 16/16, budget 28.44 MB, regression 22/22. Proof docs/shots/shops-2026-10-24/kirana_bazaar.png (headless). Tried and rejected: merging kirana goods into the Gupta store mesh (bounding sphere spans both, hero view rose to 150). Tool: tmp/bz-meshes.mjs lists per-mesh call cost at the bazaar camera.
Gaps: medical, mobile, bangle and other shops still box goods (need new atlas cells); Banta shop and Chaat thela unbuilt; zero headroom in bazaar view.
NEXT: other shops' goods (medical, mobile, bangle) using the shadow trick (castShadow=false on small interior meshes) to buy calls.

---

**2026-10-24 (cycle 39p, playtest block item 4, bazaar kirana goods):** No game change kept. Real printed packets on the bazaar kirana (unit 1) shelves and counter were built (patch tmp/kirana-goods.patch, shot docs/shots/shops-2026-10-24/kirana_bazaar.png) but cost +1 draw call: bazaar view 151 > 150 (merging the bangle/tyre torus mesh saved nothing, it is not in that view). Reverted; asked in NEEDS_YOU. NEXT: find one call to cut in the bazaar view (list meshes drawn from the bazaar camera), then re-apply the patch; other shops (medical, mobile, bangle) need new atlas cells.

---

**2026-10-24 (cycle 39o, playtest block items 6 / queue 5, far-LOD abadi):** Game change: the far-LOD abadi row proxies (tools/blender/build_abadi.py house_lod) now carry rear windows (one per floor, dark painted openings) in addition to the front door/window/chajja, so distant houses seen from rooftops and fields no longer read as blank blocks (~80 extra triangles per LOD row model, +3 files in public/assets/models, assets 28.44 MB). Near models and abadiBoxes.json unchanged. Proof docs/shots/farlod-2026-10-24/far_a.png (centre-back blocks now show openings; headless, no subject check - look evidence only). Build ALL PASSED, budget passed. Regression not run (no movement code touched).
Gaps: far blocks are still one plaster set with vertex tint, openings are small flat squares, no sills/frames; water tank model, other shops' goods, yellow swing, Banta shop and Chaat thela still open.

---

**2026-10-24 (cycle 39n, playtest block item 1, school board):** Game change: the primary school now has a bilingual gate board (English "Primary School" bold and dominant, Hindi above, navy on cream) hanging over the south gate, facing the lane. Proof docs/shots/signage-2026-10-24/school_gate.png (script tmp/school-board-shot.mjs). It shares the halwai board mesh (src/main.js) so it costs no extra draw call; a separate mesh took the bazaar view to 151 > 150. Hero and bazaar views are now AT 150: no draw-call headroom either. Build 16/16, regression 22/22. Banta shop and Chaat thela remain unbuilt (new places, BACKLOG after the playtest block).

---

**2026-10-24 (cycle 39m, playtest block item 0c):** Game change: the pond and the johad now block the player, NPCs and vehicles (water-disc colliders, src/farmSites.js discSolids; shore stays walkable). Real key-walk (hold W, 30 s, straight at the water) stops at the edge: pond end z=77.65 (centre 70), johad end z=109.85 (centre 105); proof docs/shots/collision-2026-10-24/{pond,johad}.png, script tmp/collide-walk-water.mjs. Audited and found already fine: sabzi/jalebi cart bodies and poles have solids; vehicle-vs-vehicle and followers already pass extra vehicle boxes (main.js otherVehicleBoxes); collider-audit reports every plaster wall footprint covered; animals are static so there are no animal routines to register for check 9 (check 9 covers every ROUTES entry incl. follow-capable NPCs' waypoint legs). Build 16/16, regression 22/22, assets 28.44 MB.
Still open in the playtest block: school front board, Banta shop and Chaat thela not built (item 1); other shops' goods still boxes (item 4); real water tank models, far-LOD painted openings (items 6, queue 5); findability walk, lanes (queue 7-8). Triangles at ~394k of 400k: no headroom.

---

**2026-10-24 (cycle 39l, proof reshoot):** Rooftop proof re-taken with the clean tool (no overlay/fps/capsule): docs/shots/water-2026-10-24/roofs_a.png (water tank on plinth + antenna on an abadi roof, east gali) and roofs_b.png (west gali rooftops, far-LOD blocks visible in the distance as flat plaster). Replaces the shots in docs/shots/rooftops-2026-10-23 for queue item 2. status.json refreshed (triangles 394,458 / 400k: no headroom).

---

**2026-10-24 (cycle 39k, playtest block item 6, cottage houses):** Game change: the kachcha (cottage-style) homesteads now use the REAL Poly Haven CC0 thatch_roof_angled PBR set (4K downscaled to 1K WebP, public/assets/textures/thatch/, credited) on the gable roofs, straw bundles, ridge and haystack (the haystack is now a lathed bulging stack instead of a cone). Done without a new draw call: Kit(split_props=False, tex_override={'props': thatch}, route={'thatch': 'props'}) in tools/blender/arch.py carries the thatch set in the model's existing second mesh slot; yard props (charpai, pots, chulha...) moved into the main plaster mesh. Validator check 5 now samples hb_main and hb_tin as well (extension: those are the same Blender yard props/haystack that were hb_props/hb_plaster before; not a loosening). Proof docs/shots/water-2026-10-24/kachcha_b.png. Build ALL PASSED, calls 147 (hero<=150, bazaar<=150), regression 22/22, assets 28.44 MB.
WARNING for the next run: triangles are 394,458 of the 400k ceiling. Every new instanced plant/prop must come with a matching cut (e.g. thin sarson tufts, drop abadi near-radius) or a LOD.
Gaps: wooden posts/doors on the kachcha are still the plaster set tinted (a separate 'wood' set costs a draw call; it was tried and exceeded 150 at the bazaar camera); far-LOD abadi blocks still have tiny painted openings; real water-tank model not found (Poly Haven has none; rooftop tanks are textured code geometry).
NEXT: write the full no-collider audit list (queue item 6), cart legs / vehicle-vs-vehicle collisions, halwai fire rework, RE-TAKE bad proof shots (rooftops), bazaar goods for other shops; she must name the 'yellow swing'.

---

**2026-10-24 (cycle 39j, playtest block items 7b, 4, 2):** Game change: (a) HIGHWAY wear: asphalt now on the concrete PBR set with 26 tar patches, 40 hairline cracks, broken/faded centre dashes (some missing), patchy worn edge lines (no ruler kerb line), dust/earth margins creeping onto the shoulder; both highway ends and the mandi yard's ends now run out as narrowing broken-concrete then packed-earth with wheel ruts (roads end believably) - src/farmSites.js roadGeos, createMandi. (b) World edge: the drawn ground plane is 2.4x bigger (playable clamp unchanged) - the hard ground edge was visible from the highway/mandi (x~230). (c) MARKET unidentifiable object FOUND: the bicycles. Their wheels were built in the wrong plane (axis='x' = perpendicular to the frame), so the bazaar cycle (outside units 2-3) read as two floating rings and the 3 school bikes the same. New arch.bicycle(): tyres, rims, 8 spokes per wheel, hubs, diamond frame, fork, bars, grips, bell, lamp, saddle, crank, chain guard, carrier, stand; used in bazaar_row + school; repair-shop flipped cycle wheels fixed too. (d) Milk cans: real dairy cans (lathe body, shoulder, neck, domed lid, knob, bands, lugs), the dairy's solid brown box replaced by a plank bench with two cans. These are the likely 'six white cylinders'. (e) Matkas: lathed smooth profile (arch.lathe) in all 7 clay_pot users (no more faceted icosphere); all Blender models rebuilt via make_all.sh. Build ALL PASSED, calls 147, triangles 381.7k, regression 22/22, assets 27.19 MB. Proofs docs/shots/water-2026-10-24/{highway_south,highway_north_end,dairy_cans,bz_cycle2}.png (folder name is historical; it holds the whole session's shots).
Gaps: school bikes not re-shot (camera inside wall; same helper as the bazaar one); highway dashes/patches are flat boxes, no wheel-path polish; far-LOD plaster/openings, water tanks, cottage woods and other shops' stock still open.
NEXT: far-LOD plaster/openings; water tanks real model; cottage-wood PBR; bazaar goods reuse src/shopGoods.js; yellow swing (needs her to name it).

---

**2026-10-24 (cycle 39i, playtest block items 3 and 7 partly):** Game change: (3 KHET) the field is now a patchwork of ~22x20 m plots with wobbled borders: sarson in yellow flower, young green wheat, ripe golden wheat, bare ploughed earth, veg patch (src/field.js plotKind); the ground itself carries the crop colour via per-vertex tint on a subdivided ground plane (no draw call added), tufts gained four flower/ear spikes so they read as flowering/ripe heads, per-plot height and colour. Haystacks: they existed only at the khalihan; now 3 bhoosa stacks stand behind the tubewell kothri (right beside the Yadav Chai Nashta chowk view) with a canvas-drawn straw-strand material (strawMaterial, shared); khalihan floor+stacks use it too (one call). (7 WATER) new src/water.js: one water material for pond, johad, canal and tubewell hauz - depth tint (shore olive to deep murky green), two drifting ripple layers in the shader (ticked by updateWater in main loop), env-map sheen, alpha-faded soft shoreline; pond/johad are polar-grid meshes with a depth attribute; pond lotus rebuilt as notched veined cupped pads plus real flowers (two petal rings pink-tipped, yellow seed head) in clusters, replacing pink cones; shore = three-band mud (dry cracked, damp, dark wet) with pebbles. Build ALL PASSED, hero/bazaar <=150 (147 worst), triangles 386k (<400k), regression 22/22, assets 27.13 MB. Proof docs/shots/khet-2026-10-24/{overview,close,haystacks_tubewell}.png, docs/shots/water-2026-10-24/{pond,pond_close,johad,canal}.png.
Gaps: sarson from low angles still reads sparse (tuft density capped by the 400k triangle budget: 386k now); sugarcane blocks exist in the south belt (createSugarcaneBelt) but not inside the field loop; no tractor/ploughing animals; johad shore bands are slightly terraced; the water's ripples are a shader, not a flow map; the "yellow swing" is unidentified (see 39h). 
NOT yet done in item 7: highway wear (cracks, patched edges, dust margins, no crisp kerb line) and road ends (the road by the godown ends abruptly) - NEXT.
NEXT: (7b) highway patching + road ends; then playtest items 4 (bazaar interiors reuse src/shopGoods.js; unidentifiable market objects list), 6 (water tanks, far-LOD plaster/openings, cottage woods), milk cans, matka faceting.

---

**2026-10-24 (cycle 39h, playtest block item 5, cricket/badminton/school flag):** Game change: (a) khel maidan split into grass outfield (new 'grass' PBR set in src/materials.js), packed-mud pitch with worn run-ups, chalk creases and stumps with bails, and a badminton court on an earth pad with regulation lines (doubles/singles, service lines, centre lines) and an alpha-mesh net with white tape on base-plated poles (src/farmSites.js createKhelMaidan, +2 draw calls only inside the zone). (b) School flag: real printed tricolour (canvas texture, 24-spoke chakra, cloth grain) on a rippled 1.8x1.2 plane, halyard rope and pulley, metallic pole, merged into ONE mesh with the pole via a grey texture strip so no draw call is added (hero view went 151 with a separate mesh; back to <=150). (c) Removed the pink/green polyhedra bougainvillea over the school west pillar (build_school.py; her rule: remove or do properly). Build ALL PASSED, regression 22/22. Proof docs/shots/maidan-2026-10-24/{pitch,court,school_flag}.png.
School games already existed (hopscotch x2, cricket-pitch decal, tyre swing) in build_school.py. NOT done: "the yellow swing" - could not identify it; the mela ground jhoola is a blue pipe frame (createMelaGround) and the house jhoola is wood (build_house.py). Not rebuilt; if she means a different one she must name its location.
NEXT: (6) khet variety (sarson, sugarcane blocks, wheat stages, veg patch, haystacks); (7) water + lotus + shoreline mud + highway wear + road ends; then (8)-(11) in the list above.

---

**2026-10-24 (cycle 39g, playtest block item 5, atta chakki):** Game change: chakki machine rebuilt readable (tools/blender/build_new_shops.py atta_chakki): green cast-iron drum with bolted lid on a plinth, square blue sheet-metal hopper with grain, flour chute into a sack on a floor scale, blue ribbed motor with pulley, V-belt and yellow guard, switchboard with wire, hanging bulb, sacks stacked at the side posts, flour bin, pan scale, flour dust. Replaces the witch-hat cone hopper. Build ALL PASSED, regression 22/22, assets 27.19 MB. Proof docs/shots/chakki-2026-10-24/close.png (note: shotlib subject check reports the chakki as occluded by the hidden new_shops_old collision shell, so shot has no subject check; and slot models need ~20 s to load before shooting).
Gaps: surfaces are the shared plaster set tinted, no unique metal PBR; no miller capsule yet.
NEXT: (5) cricket mud, badminton lines/net, school flag + games; (6) khet variety; (7) water.

---

**2026-10-24 (cycle 39f, playtest block item 5, dharam kanta):** Game change: weighbridge is now a Blender model (tools/blender/build_dharam_kanta.py, slot dharam_kanta at world 194,92; ~7k tris): steel ribbed deck 4x14 with yellow edge angles and load-cell covers, concrete approach ramps, bollards, red/white stop barrier, weight-limit sign, cabin with panel door, grilled counter window, ledger, roof tank, red LED display post, grain sacks on pallets, raised loading dock with tin canopy. Old code boxes removed (cabin/post solids kept). Build ALL PASSED, regression 22/22, assets 27.17 MB. Proof docs/shots/kanta-2026-10-24/{wide,cabin}.png. No CC0 weighbridge exists (Poly Haven/Quaternius/Kenney/poly.pizza searched).
Gaps: no truck standing on the deck; the road near the godown still ends abruptly (item 7); sack stacks read slightly tower-like.
NEXT: (4) atta chakki readable; (5) cricket mud, badminton, school flag; (6) khet variety; (7) water.

---

**2026-10-24 (cycle 39e, playtest block item 5, petrol pump):** Game change: petrol pump is now a Blender model (tools/blender/build_petrol_pump.py, slot petrol_pump at world 186,5; ~6.4k tris, +0.3 MB): slab with joints and oil stains, 14x9 canopy on four guarded columns with red band and light strips, two pump islands with dispensers (display, keypad, grade stripes, nozzle holsters, hoses), office with panel door, barred window, roof tank and bench, tall price pole, air post, oil drums and rack, fire buckets, tyre stack, capsule attendant (npc_pump_attendant). Old code-box pump removed from src/farmSites.js (collision solids kept); petrol board moved in front of the fascia. Build 16/16, regression 22/22, assets 26.66 MB. Proof docs/shots/petrol-2026-10-24/{wide,pumps,front}.png. Searched: Poly Haven, Quaternius, Kenney, poly.pizza: no CC0 fuel pump.
Gaps: no tractor standing at the pump (vehicle slot not wired); surfaces are the shared plaster set tinted, not unique PBR; pump board text is the existing placeBoards board.
NEXT: (3) dharam kanta; (4) atta chakki readable; (5) cricket mud, badminton, school flag; (6) khet variety; (7) water.

---

**2026-10-24 (cycle 39d, playtest block item 5, post office):** Game change: post office now has a capsule postmaster behind the counter window (src/main.js, npc_postmaster), two bilingual forecourt notice boards on posts (Speed Post / Money Order / Stamps; Open 10 AM to 4 PM; English dominant; folded into the existing signboard atlas mesh, no new draw call, collider on the posts). The red pillar post box already existed (hand-built; no free CC0 model found, see 39c search). Proof docs/shots/postoffice-2026-10-24/{front,notices}.png (clerk.png deliberately shows the capsule).
Gaps: post box and counter are vertex-colour primitives, not PBR-textured; notices are painted boards, not paper notices on a cork board.
NEXT: (2) petrol pump Blender model; (3) dharam kanta; (4) atta chakki; (5) cricket mud, badminton, school flag; (6) khet variety; (7) water.

---

**2026-10-24 (cycle 39c, playtest block item 4/5):** Game change: Gupta General Store stock is now real-shaped printed goods (src/shopGoods.js: pillow packs with crimps, biscuit/soap/tea/salt packs, toffee jars, sachet strips, soda bottles; one draw call); bazaar shutters fully rolled up. Proof docs/shots/shops-2026-10-24/store_front.png, store_close.png. Build 16/16 (hero 149 calls), commit 496c924.
Asset search for post box and petrol pump (item 5): Poly Haven has neither (listed all models: no post box, fuel pump, handcart, weighbridge, mill); web search (Quaternius/Kenney/poly.pizza) found no CC0 post box or fuel pump (only paid RenderHub/CGTrader/TurboSquid). So they must be hand-built in Blender (tools/blender), per the asset policy. Not yet done.
NEXT, in order: (1) post office capsule NPC + red post box + notices; (2) petrol pump Blender model; (3) dharam kanta; (4) atta chakki readable (hopper, grinder, belt, motor, sacks); (5) cricket ground mud texture, badminton court lines, school flag pole + games; (6) khet variety (sarson, sugarcane blocks, wheat stages, veg patch) and haystacks check; (7) water (pond/johad/canal), lotus, shoreline mud, highway wear and road ends; (8) bazaar kirana/medical/etc interiors reuse src/shopGoods.js; (9) milk cans reshape (probable "six white cylinders"), faceted matkas; (10) far-LOD plaster/openings; (11) school front board, Banta shop + Chaat thela are unbuilt places.

---

**2026-10-24 (cycle 39b, playtest block item 2/6):** Game change: real plants. src/realPlants.js instances Poly Haven CC0 scans (gazania flower beds, grass clumps, shrubs; potted plants in clay pots at the abadi doorsteps via src/villageProps.js); every plant set is distance-limited to the player (28-50 m) because plants cost 1-3.5k triangles each and the 400k budget (388k now) cannot carry them all; card bougainvillea/creeper/banana/tulsi gone; all code-built pots removed from the 6 Blender building scripts (arch.pot no-op, models rebuilt); lane hand pumps and rooftop dishes removed. Build 16/16, regression 22/22 (run npm run build FIRST: regression-check tests dist/), assets 27.1 MB. Proof docs/shots/plants-2026-10-24/. Searched: Poly Haven plants category (57 models; potted_plant_01/02/04, flower_gazania, grass_medium_02, shrub_01 used; celandine/shrub_04 downloaded, unused, in tmp/unused-assets). No Poly Haven banana, tulsi, bougainvillea, marigold, lotus. Not searched yet: Poly Pizza / Quaternius / Sketchfab for those.
Gaps: foliage scans simplify badly below ~1k tris (thin disconnected leaves), so grass reads a little dry/sparse; milk cans, matka faceting, lotus, water, khet variety, shops open, Gupta goods, post office, chakki, petrol pump, kanta, cricket, badminton, school flag, highway, roads all still open in the playtest block.

---

**2026-10-24 (cycle 39a, playtest block):** Game change: (0a) clean screenshot tool; (0b) streaming now builds zones ahead of sight (frustum + travel prefetch, time-sliced) and draws them from buildRadius+80 m (landmarks 215 m); (0c) cattle and dogs are solid; (1) signboards rendered English-dominant everywhere (signboards.js, bazaar.js, newShops.js) and 20 new bilingual boards (src/placeBoards.js): halwai, jalebi, dairy, anganwadi, health, chemist, manihari, sabzi, gaushala, gurukul, haveli, mela, khel maidan, petrol pump, dharam kanta, bus adda, mandi gantry, godown, dhaba; (new bug fixed) the sky dome was fixed at the origin and ran past the camera far plane from the east, rendering a BLACK DOME in the sky east of x~100 - it now follows the camera. NEEDS_YOU: 5 stale publishing items closed (queue item 11). Build 16/16, regression 22/22, budget 25.00 MB.
Proofs: docs/shots/signage-2026-10-24/*.png (19 boards, all via tools/shotlib.mjs cleanCapture), docs/shots/collision-2026-10-24/, docs/shots/streaming-2026-10-24/.
TRADE-OFF for the art director (0b): the 150 draw-call ceiling at the hero/bazaar validator cameras (149/150 now) is the binding limit. Small "detail" zones (doorstep props, rooftop clutter, lane vignettes, edge walls, lamps, tubewell, khalihan, milestones, water tank) are still DRAWN only at their old radius (28-90 m), so they can still pop in at 25-60 m. Big buildings/landmarks are drawn from 115-215 m, before fog hides them. To lift the detail radius we must free calls (merge per-material in props_/roof_ cells: 9 calls per cell at 70-100 m).
SIGNAGE AUDIT (42 places, src/freeRoam.js PLACES): board now present and English-dominant: tea stall, general store, bazaar (8 units + chowk tea stall), post office, ration shop, atta chakki, halwai, jalebi, dairy, anganwadi, health centre, chemist, manihari, sabzi rehris, gaushala, gurukul, old haveli, mela, khel maidan, highway petrol pump / dharam kanta / bus adda, mandi (gantry, godown, dhaba). Faith buildings (temple, gurudwara, masjid, jain mandir): no commercial board by rule. STILL MISSING: primary school front board (school has classroom charts only), TV house (a house, none needed), house. NOT BUILT AT ALL (in PLACES and the map but no geometry in the world): Banta shop (-63,22.5) and Chaat thela (-63,50.5). MAP.md/PLACES give coordinates; they need building (BACKLOG, after this block).
Gaps: tubewell/pond/johad have no name board (water/field sites named by direction signs only); sign boards on code-box sites are still flat-colour vertex-colour buildings (texture work later); 0c still open: cart legs, vehicle-vs-vehicle audit, animal routines in check 9.
Next: playtest block item 2 (plants, pots), 3 (khet variety), 4 (shops open + Gupta goods), 5 (post office capsule NPC + post box, chakki, petrol pump, dharam kanta, cricket ground, badminton, school flag), 6, 7.

---

**2026-10-23 (cycle 38ce2):** Game change (small): Maa and the sister now follow the player through doors (house front/back room, school classroom) instead of jamming on the wall; kachcha cattle nudged off the new manger colliders. src/doorRouting.js, createFollowRoutine `buildings` option. Real run in tmp/door-follow.mjs. No screenshot (movement), no box ticked.
Gaps: no prop-avoiding pathfinding; other buildings are not walkable. Next: register animal/follow routines for check 9; far-east road decision (art director).

---

**2026-10-23 (cycle 38ce):** Game change: halwai now has live smoke column, oil steam and flame flecks over both kadhais (src/halwaiFire.js, +1 draw call only within 30 m; close view 119-125 calls). Build ALL PASSED, budget 25.00 MB. Proof docs/shots/halwai-fire-2026-10-23/. Gaps: flame reads as sparks (bhatti has no fire mouth: edit build_halwai.py), no soot, no heat shimmer. Not ticked.
Next: fire mouth + soot in Blender halwai; NPC door-routing (A0); far-east road decision (art director).

---

**2026-10-23 (cycle 38cd):** Game change (small, invisible): both kachcha homesteads now have solid yard props - charpai, chulha, tulsi chabutra, matka stand, manger, haystack (KACHCHA_YARD_SOLIDS + hidden collider mesh in src/scenery.js, follows both copies). Validator check 5 now also samples hb_plaster/hb_wood/hb_props so these colliders are proven backed by real geometry (extension, not a loosening). Build 16/16, regression 22/22. No screenshot (invisible), no box ticked.
COLLIDER AUDIT remaining (A0): hero-house indoor charpai (interactive), sabzi/jalebi cart legs, laundry ropes (overhead), pond/johad edges (walkable by design). No standalone wells exist in the code.
Next: NPC door-routing for building entry (A0); register animal/follow routines for check 9; far-east road decision (art director).

---

**2026-10-23 (cycle 38cc2):** Game change: abadi rooftops now carry water tanks on plinths, TV antennas, dishes, solar panels and brick stacks (src/rooftops.js; sites abadiRoofSites in src/scenery.js; zone-streamed 30 m radius so hero zone stays 150/150). Build 16/16. Proof docs/shots/rooftops-2026-10-23/. Gaps: abadi only; may sit near Blender roof tanks; tanks read dark; no wall pipes/cables.
Next: rooftop fittings on bazaar/haveli/school; halwai flame and steam; far-east road decision (art director).

---

**2026-10-23 (cycle 38cc):** Game change: bazaar row (Blender, build_bazaar_row.py -> bazaar_row.glb) now has a panelled back door (recess, frame, hinges, brass handle, step) on all 8 units and fully framed barred back windows with sills. Build ALL PASSED, budget 25.00 MB, no new draw calls (same mesh). Proof docs/shots/openings4-2026-10-23/. Gaps: back doors are visual only (wall is solid); no regression run (no movement code touched).
Next: lane prop audit (A1f); hero-zone draw-call headroom; far-east road decision (art director).

---

**2026-10-23 (cycle 38cb):** Game change: post office, ration shop and atta chakki (Blender, tools/blender/build_new_shops.py -> public/assets/models/new_shops.glb) now have real openings: grilled side windows with sills, panelled staff door with hinges, handle and step at the back, grilled vent window on the chakki back wall. Build ALL PASSED, budget 24.91 MB. Proof docs/shots/openings3-2026-10-23/. Lesson: src/newShops.js geometry is invisible collision backing; edit the Blender script. Gaps: bazaar units still slab openings; gaushala/mela are open structures.
Next: bazaar row openings (tools/blender/build_bazaar_row.py); far-east road decision (art director).

---

**2026-10-23 (cycle 38ca):** Game change: real doors and windows on 8 more sites. smallBuilding() (src/farmSites.js) now builds recessed framed door (panels, hinges, brass handle, step) and two iron-grilled windows with sills via the shared helpers: anganwadi, dairy, health centre, chemist, masjid, gurudwara, TV house, Jain mandir. Merged into existing meshes (no new draw calls). Build ALL PASSED. Proof docs/shots/openings2-2026-10-23/ (8 shots, script tmp/openings2-shot.mjs). Gaps: gaushala, mela, post office/ration/chakki, bazaar units still slab openings; chemist counter sits in front of its door; sites still vertex-colour flat.
Next: openings on remaining buildings; per-material textures on far-east sites; far-east road decision (art director).

---

**2026-10-23 (cycle 38bz2):** Game change: real doors and windows on far-east sites. New helpers windowOpening/doorOpening in src/farmSites.js (recess, painted frame, iron grille bars + rail, projecting sill; door with raised panels, rail, hinges, brass handle, threshold step), merged into each site's existing mesh (no new draw calls). Applied to gurukul, old haveli, mandi godown/cabin/dhaba. Build all passed. Proof docs/shots/openings-2026-10-23/. Gaps: other sites listed in BACKLOG A1d standing-rule note still have slab openings; headless shots run ~3 fps.
Next: apply the helpers to masjid, gurudwara, health centre, chemist, anganwadi, dairy, TV house, Jain mandir; far-east road decision (art director).

---

**2026-10-23 (cycle 38bz):** Game change (small): Visit-place mid-mission warning path tested with a real tap flow (quest at have_money: tap 1 warns, tap 2 jumps, step unchanged); the warning text was overlapping the first list row and was dark red on dark, now reserved space + light colour (index.html .visit-warn, also used by Tasks note). Box ticked in BACKLOG A-2. Proof docs/shots/visit-warn-2026-10-23/. Build not rerun (CSS only).
Next: hero-zone draw-call headroom; minimap convention research; far-east road decision (art director).

---

**2026-10-23 (cycle 38by2):** Game change (small): TV house porch charpai is now solid (src/farmSites.js createTvHouse; it sat outside the house box). Build passes (validator ALL PASSED). No screenshot (invisible change), no box ticked.
COLLIDER AUDIT (A0, still no collider): hero-house indoor charpai (interactive, inside house shell), sabzi/jalebi cart legs (cart bodies are solid), wells and cattle troughs other than gaushala, pond/johad edges (walkable by design, not audited), laundry-line ropes (overhead).
Next: hero-zone draw-call headroom; NPC door-routing for building entry (A0); far-east road decision (art director).

---

**2026-10-23 (cycle 38by):** Game change: street lamps rebuilt (src/props.js createStreetLamps, type 'rcc' | 'solar'). Temple lanes: tapered RCC poles (CC0 concrete PBR) with tube-light on bracket arm, down-cable, switch box, painted whitewash/black bands, base grime, sagging two-core overhead wire between poles (poles every 14 m). Bazaar lane: panchayat solar LED (steel pole on concrete footing, tilted panel, LED head, battery box). Per-lamp lean/height/tint. Two merged meshes per lane (concrete solid with colliders; tin overhead parts and wires, kept out of the solid-material families), no shadow casting to hold hero zone at 150/150 (was 151 with shadows on). Build 16/16, budget fine. Proof docs/shots/lamps-2026-10-23/ (t2.png, t4.png, b2.png; t1, b1 are poor angles). Gaps: no reference research, no stickers/posters, wires do not cross between lane segments, lamps only on 3 lane segments (abadi lanes and chowk have none), hero zone has zero headroom.
Next: lamps on the other lanes once headroom exists; lane prop audit; far-east road decision (art director).

---

**2026-10-23 (cycle 38bx2):** Game change (small): bazaar villagers (src/bazaarLife.js) now collide with parked and driving vehicles (getExtraBoxes -> otherVehicleBoxes, wired in src/main.js); before, they passed [] and a vehicle could drive through them. Audit: every NPC routine (npcRoutines.js, bazaarLife.js) moves only through resolveMove; animals are stationary. Build 15/15, regression 22/22. No screenshot taken (no visual change), so no A0 box ticked.
Next: hero-zone draw-call headroom; lane prop audit; far-east road decision (art director).

---

**2026-10-23 (cycle 38bx):** Game change: A1g carrom. All 5 lane carrom/ludo mats removed; one carrom scene at the chowk (-46, 5.5): CC0 round table, stools, chairs (public/assets/props, +0.9 MB, total 24.84 MB), printed carrom board texture, coins mid-game, 4 capsule placeholder men, tea glasses, gamcha, slippers, solid colliders. Instanced/merged, no shadows, builds within 22 m. Proof docs/shots/carrom-2026-10-23/. Build 15/15 (hero zone 150/150), budget pass.
Next: hero-zone draw-call headroom (it sits at 150); lane prop audit (charpais, benches out of vehicle routes); far-east road decision (art director).

---

**2026-10-23 (cycle 38bw):** Game change: lane laundry lines rebuilt (src/laundry.js, used by createLaneLaundry): 11 garment silhouettes (sari, dhoti, kurta, salwar, dupatta, shirt, trousers, frock, towel, bedsheet, gamcha) draped over a sagging rope with wrinkles, uneven hems, printed/bordered canvas-weave fabric with normal map, pegs, shader breeze (hem sways more, per-garment phase). +1 draw call per line, no shadows. Proof docs/shots/laundry-2026-10-23/. Build, budget (23.96 MB) pass.
Wind consistency report (A1h last item): trees already sway (trees.js); NOT yet swaying: garden plants/creepers, grass tufts, signboard flags, marigold garlands, sugarcane, smoke, loose paper. Hero house clothesline (village.js) is still box cloth.
Next: carrom scene to chowk (A1g); hero house clothesline once draw-call headroom exists; CC0 fabric photos if the art director wants them over canvas prints.

---

**2026-10-23 (cycle 38bv):** Game change: the 5 abadi lane water corners (hand pump, matkas, ghadas, washing stone; createLaneWaterCorner, src/farmSites.js) moved from the lane middle to the lane edge, on the side opposite the open drain, spout facing the lane (zone table in src/main.js ~1427). Each gains a pebble-ringed soak-away with a dark wet patch; the old damp apron floated 0.18 m above the ground and now lies flat. Build 16/16, budget 23.96 MB. Proof docs/shots/lanewater-edge-2026-10-23/ (e1, s1, e2, w1b_chk, w2b_chk; w1.png and w2.png are bad camera angles, ignore). Laundry corners (charpai, quilt, clothesline) also moved to the lane edge on the non-drain side (proof docs/shots/lanelaundry-edge-2026-10-23/w1.png; e1.png frame misses it behind a signpost). Gaps: carrom/ludo mats (2 m mat plus stools, do not fit an edge) still mid-lane, to move to the chowk under A1g; regression-check not run (no movement code touched).
Next: lane prop audit (carrom, laundry, charpais out of vehicle routes); hero-zone draw-call headroom; far-east road decision (art director).

---

**2026-10-23 (cycle 38bu):** Game change: temple porch is furnished (src/temple.js buildTempleProps): brass lamp stand with five diyas, donation box on a stand, brass kalash + lota, woven mat, marigold/rose offerings on a leaf plate, diyas at the shrine foot, two marigold garlands between the entrance pillars. No idol or imagery. Folded into existing wood/metal/jute/terracotta merges (+1 call). Also headroom: signboard-material merges and switchboards no longer cast shadows (hero zone 150 -> 146-147). Build 16/16, regression 22/22. Validator: 'temple_props' added to the overlap/collider excludes; merged buckets resting at exactly the 0.40 m plinth top are accepted by check 2 (narrow, commented). Proof docs/shots/temple-props-2026-10-23/ (b.png garlands, e.png lamp stand + kalash, f.png/g.png porch). Gaps: offerings and donation box are small and mostly hidden from lane height; shrine interior still empty; temple steps not worn; school other blocks, other shops untouched.
Next: shop stock for remaining shops; school other blocks; far-east road decision (art director).

---

**2026-10-23 (cycle 38bt):** Game change: the walkable school classroom is furnished (src/village.js furnishClassroom): chalk-written blackboard in a frame, teacher table/register/chair, 10 varied desk-benches with books/slates/bags, 3 painted wall charts, water matka + mug, cupboard, brass bell, clock, bulb, fan, broom, mat. Grass tufts no longer grow through its floor (keep-out in src/vegetation.js). One atlas material named 'signboard' (wall-mounted, exempt from the float check) = +1 draw call. Build 16/16 (budget 23.96 MB). WARNING: hero-zone draw calls now sit at 150-151 and flip between runs (scatter is random; baseline was 149); one run read 151 = fail. Needs headroom (distance-hide hero Blender buildings or merge more) before adding anything else in the hero zone. Proof docs/shots/classroom-2026-10-23/ (board.png, charts.png; desks.png is a bad angle, ignore). Gaps: other school blocks have no interiors; furniture is box-built (no CC0 desk model exists); temple interior untouched.
Next: free hero-zone draw-call headroom; temple interior; far-east road decision (art director).

---

**2026-10-23 (cycle 38bs):** Game change: post office, ration shop and atta chakki are furnished (src/newShops.js buildNewShopProps): chakki gets hopper, feed pipe, flour tray, belt guard, grain/flour sacks, platform scale, scoop, flour dust and is solid; ration shop gets jute sacks, crates, beam scale and ledger on the counter; post office gets a red pillar post box, post bags, letter scale, ink pad and stamp. One new jute draw call (sacks, real jute PBR set); build 16/16, budget 24.0 MB, view draw calls 110-118. Proof docs/shots/shop-interiors-2026-10-23/ (chakki.png, ration.png, post.png). Gaps: ration/post shells are solid boxes with a shallow counter recess, so no shelves/pigeonholes inside (stock stands on the flanks); pillar box and sacks use tinted metal/jute (low-poly, 9-sided sacks); school, temple and other shops untouched.

MOVABLE-UNITS AUDIT (A-1, grep-based: for each PLACES entry in src/freeRoam.js, which other files repeat its x,z literal; not a runtime test):
- Streamed sites (create*(position) in src/farmSites.js, built in local coords, geometry + colliders follow `position`): pond, tubewell, johad, khalihan, anganwadi, dairy, health, chemist, masjid, gurudwara, TV house, manihari, sabzi, Jain mandir, highway, jalebi, mela, gurukul, maidan, mandi, haveli, gaushala. To move one you must edit the literal in FOUR places: PLACES (src/freeRoam.js), the zoneManager.register x/z AND the create*({x,z}) call (src/main.js ~1382-1462), plus extras: wayfinding.js (signposts, TV house/manihari/sabzi/cane/bazaar/temple), milestones.js (TV house, health, temple), minimap.js (TV house), vegetation.js VEG_KEEP_OUT (pond, johad, manihari, cane), ambient.js (halwai, teastall, store, temple, tvhouse, manihari, johad), interactions.js (cane). So NOT one-number moves yet.
- Hero/core, coordinates baked in several files or in Blender/GLB: house (village.js, vehicles.js), school (village.js, main.js), halwai (village.js, main.js, ambient.js), tea stall, general store, bazaar row (bazaar.js, main.js, wayfinding.js; chowk coords sit in bazaar.js), post office / ration shop / atta chakki (POST_OFFICE_POS etc. in main.js ~312, the only copy besides PLACES), temple (10 files: ambient, bazaar, characters, farmSites, main, props, temple, trees, vehicles, wayfinding), mango baagh (baagh.js, village.js), canal (baagh.js, canal.js, village.js), our khet (baagh, field, main, scenery), east/west gali (main, scenery, village, waypoint), tubewell (also village.js).
- Banta and chaat thela: coordinates match no other file (offsets from a parent unit, not their own anchor).
- NPC routes (npcRoutines.js, bazaarLife.js) and colliders use raw world numbers; none reference units.
- Recommendation: add one PLACES-style anchor table (id -> x,z,ry) consumed by main.js register calls, wayfinding, milestones, minimap, vegetation keep-outs; then a move is one number. Not done: layout is changing tomorrow, art director to confirm which places move first.
Next: school / temple interiors; shop stock for remaining shops; far-east road decision (art director).

---

**2026-10-23 (cycle 38br):** Game change: colliders added to five far-east/farm sites that had none: gurukul (two blocks, verandah columns, yard wall, gate pillars, mast), khel maidan (pavilion poles + bench, net poles), mela ground (shamiana poles, stage, bench rows, swing legs, stalls), manihari counter + stool, khalihan (threshing post, 4 bhoosa stacks) in src/farmSites.js. Build all passed. Real W/S key walks stop at box + radius for stage, stack, bench, gurukul block (proof docs/shots/site-solids-2026-10-23/, script tmp/site-solid.mjs). Gaps: pond/johad edges and anganwadi props not audited; regression-check not run (no movement code touched); mandi/gurukul/maidan etc. still flat vertex-colour.
Next: per-material textures on far-east props; solid audit list; far-east road decision (art director).

---

**2026-10-23 (cycle 38bq):** Game change: the mandi now has solid colliders: grain godown, dhaba hall, weighbridge cabin, 3 parked trucks (oriented to their heading), vegetable-shed poles and crate rows (src/farmSites.js createMandi). Real W/S key walks into the godown and dhaba stop at wall + radius (godown south 47.55 vs face 47.1; dhaba 95.55 vs face 95.1). Build passed (all checks). Proof docs/shots/mandi-solids-2026-10-23/mandi_godown.png. Gaps: tractor-yard props still no collider; mandi still flat vertex-colour (5b fail); regression-check not run (no movement code touched).
Next: flat-colour far-east structures to textured materials; tractor-yard colliders; far-east road decision (art director).

---

**2026-10-23 (cycle 38bp):** Game change: the far-east/farm site props (pond, tubewell, kothri, johad, sabzi carts, jalebi stall, gaushala, highway, bus adda; src/farmSites.js) no longer flat vertex-colour: box-projected UVs + shared plaster PBR set (normal+roughness) for props, ground set for banks/mud, tinted by the baked colours; water stays glossy. No new files, budget 24.0 MB, build 16/16. Proof docs/shots/farm-textured-2026-10-23/ (pond, sabzi, gaushala, jalebi; jalebi shot is camera-inside-wall close-up of the texture). Gaps: one plaster set for wood/metal/cloth parts alike (no per-material sets yet); lotus/flower geometry still flat; mandi not checked. FINISH_LINE untouched.
Next: per-material sets (wood/tin) on these props; mandi colliders; far-east road decision (art director).

---

**2026-10-23 (cycle 38bo2):** Game change: solid colliders on more props: sabzi rehris carts + poles, jalebi stall, gaushala trough/tub/hay, highway petrol pumps/office/canopy posts, kanta cabin, bus adda posts (src/farmSites.js). Build 16/16, budget 24.0 MB, regression 22/22. Also a 5 min NPC soak (tmp/npc-soak.mjs): 0 guard warnings, 0 errors. Proof docs/shots/prop-solids-2026-10-23/. Note: the sabzi walk slid through the 0.9 m gap between two carts (legit). Finding: highway/sabzi/jalebi/gaushala/mandi still use flat vertex-colour geometry (CLAUDE.md 5b fail), not touched.
Next: mandi colliders; flat-colour far-east structures to textured materials; props for shops; far-east road decision.

---

**2026-10-23 (cycle 38bo):** Game change: trees gain a 4th LOD level past 220 m: two crossed quads from the baked per-species impostor sprites (public/assets/trees, 42 KB, src/trees.js). Also fixed a real waste: static merges folded every LOD level of every tree in (each merged tree drew 3 times); extra levels are now dropped on merge (userData.lodExtra, src/mergeUtils.js). Hero-view triangles 391k -> 267k, draw calls 115. Build passed, budget 24.0 MB. Proof docs/shots/tree-impostor-2026-10-23/far_gaushala.png (tree silhouettes beyond the gaushala; black sky there is the free photo camera's far clip, not the game). Merged trees (hero/temple/field groups) still have no distance LOD.
Next: grass tufts + crops with Foliage atlases; props for shops; far-east road decision.

---

**2026-10-23 (cycle 38bn2):** Game change: 11 unsigned places now have painted direction boards (src/wayfinding.js): temple fork gains Mango baagh + Our khet; two new far-east posts at (35,73.5) and (75,73.5) point to TV house, chemist, manihari, sabzi, johad, masjid, Jain mandir, khel maidan, highway. Still unsigned: maidan..sugarcane belt, mandi-side, johad has no lane. Build 16/16 passed. Proof docs/shots/signposts-far-2026-10-23/ (far_a, temple_fork). Gap: sugarcane belt not given a board (no PLACES id); posts stand on open ground (no road yet, art director's call). A-2c wayfinding box not ticked.
Next: far-east road decision (art director); animal routes; props for shops.

---

**2026-10-23 (cycle 38bn):** Game change: all plants and trees now use real photo leaf cutouts (ambientCG CC0 leaf sets) instead of canvas-drawn leaves: garden plants + 5 tree species (tools/build-plant-atlas.mjs -> public/assets/plants/*.webp, 3x2 cells of 341 to stay under 1K). Build 16/16, budget 24.0 MB. Proof docs/shots/plant-atlas-2026-10-23/. Gaps: flower heads still drawn (no CC0 flower sheet), grass tufts/crop rows still old, close-up leaf shot not taken. Untracked public/assets/trees impostors left alone.
Next: grass tufts + crops with Foliage atlases; props for shops; far-east road decision.

---

**2026-10-23 (cycle 38bm2):** Game change: real CC0 doorstep props (15 Poly Haven models: stools, buckets, baskets, clay pots, jugs, crates, tyre, bench, chair) now stand at the abadi house steps, instanced and streamed per 36 m cell (src/villageProps.js, abadiPropSites in src/scenery.js); sites touching colliders are dropped. Build 16/16, regression 22/22, budget 23.6 MB. Proof docs/shots/village-props-2026-10-23/. Finding: Poly Haven has no Indian tree species (neem/mango/peepal/babool); no pump/charpai/handcart/sack either. Props are not solid (all under 0.5 m, except chair/bench).
Next: tree alpha-cutout rework from ambientCG atlases; props for shops/school interiors; far-east road decision (art director).

---

**2026-10-23 (cycle 38bm):** Game change: dev collision guard now covers animals (herds, dogs; ANIMAL_MESHES in src/animals.js). Sweeping the whole map with it found 3 lane buffalo standing inside walls; lane cattle/dogs now pick the first offset that clears the real colliders and the other lane sites (src/main.js), re-sweep clean. Build 16/16, regression 22/22. Animals are stationary, so no routes to register; follow routine already runs through resolveMove. Sweep script tmp/animal-guard.mjs (88 points). Box not ticked (multi-minute NPC route run still open).
Next: trees/plants CC0 models (A1a2/A3); far-east road decision (art director).

---

**2026-10-23 (cycle 38bl):** Game change: two bazaar-lane villagers no longer walk into walls (their loops clipped colliders by 0.07 m and 0.32 m; shortened). Monkey chase and all 11 bazaarLife villager loops now register with validator check 9 (15 routes, 30 legs, all clear). Build 16/16; no movement code touched.
Next: register animal + follow routines; extend devCheckPenetration to NPCs/animals; far-east road decision (art director); trees/plants CC0 models.

---

**2026-10-23 (cycle 38bk):** Game change: none visible; new tools/findability-audit.mjs (static, heuristic: distance to the map's pencil LANES, signpost/milestone coverage, walk time at 4 m/s x1.25). A-2c audit item NOT ticked: it is a static estimate, not an on-foot walk.
FINDABILITY LIST (40 places checked, house excluded; 11 not findable without the map = no signpost AND over 30 m from any drawn lane): maidan, jain mandir, masjid, our khet, TV house, chemist, manihari, sabzi rehris, johad, mango baagh, sugarcane. Also over 30 m from a lane but at least signposted: mandi, highway, haveli, gurukul, health centre, gaushala, pond, mela, gurudwara. Walks: nearest village-core places 6-20 s; far east cluster 60-130 s with no road (milestones only stand on open ground). Lanes stop short of everything east of x=36 and south of z=140.
Caveat: LANES in src/freeRoam.js are the map outline, not every real track (field tracks and the canal bridge approach are not in it), so khet/baagh/canal may be better connected on the ground than listed.
Recommendation (art director decides, nothing moved): far-east cluster is 140-275 m out with nothing between; either run one real road from the east gali along z~76 to the highway, or pull the cluster in. Add signpost entries for the 11 unsigned places.
Next: register monkey/bazaarLife/animal routes; trees/plants CC0 models (untracked public/assets/trees impostors are someone else's WIP, left alone).

---

**2026-10-23 (cycle 38bj2):** Game change: 4 painted milestone stones (Highway n m / Mandi n m, Hindi above English) on the east approach (src/milestones.js, zone-streamed, labels from PLACES, solid). Build + validator + budget (19.4 MB) passed; no movement code touched. Proof docs/shots/milestones-2026-10-23/ms_i.png. Gap: no real road along the route beyond the gali mouth; no markers at the highway itself.
Next: findability audit list; far-east road decision (needs art director); register monkey/bazaarLife/animal routes.

---

**2026-10-23 (cycle 38bj):** Game change: greenery scatter audit (new tools/greenery-audit.mjs). Fixed: 121 grass tufts standing on kerbs/in lane drains removed via a lane keep-out band (src/vegetation.js), 4 crop rows removed from the tubewell outlet channel (src/field.js). Trees, canal, pond, johad, rooftops were clean. Build + validator passed; no movement code touched. Gap: lane water corners/troughs not auto-detected.
Next: milestone markers on approach road/highway; findability audit; register remaining NPC routes.

---

**2026-10-23 (cycle 38bi):** Game change: none visible; build-time safety. Validator check 9 now fails the build if any NPC waypoint leg (Maa, child, postman) clips a collider (routes register themselves in src/npcRoutines.js ROUTES, exposed as __dopahar.npcRoutes). Validator 16/16, regression 22/22. Gaps: monkey run, bazaarLife and animal routines not registered yet.
Next: register those routes; extend devCheckPenetration to NPCs/animals; milestone markers; findability audit.

---

**2026-10-23 (cycle 38bh):** Game change: corner minimap (src/minimap.js): notebook-paper window top-right, player arrow with facing, landmark glyphs, lanes, objective star; tap opens full notebook map; pause menu toggle hides it (saved). 96 px on phones, clear of joystick. Build passed, zero console errors. Proof docs/shots/minimap-2026-10-23/. Minimap research item not done (box open). No movement code touched.
Next: milestone markers on approach road/highway; findability audit list; far-east road; guarded task switching.

---

**2026-10-23 (cycle 38bg):** Game change: 5 painted direction signposts at lane junctions + a Village Notice Board at the chowk (src/wayfinding.js; Hindi small on top, English large below; names, arrows, compass and distances read from PLACES so they re-label after the layout rework; only the 6 post x,z live in the file). One shared atlas, one merged mesh, wood is a canvas grain (no normal map). Validator check 5 now also samples material 'wayfinding'. Build 15/15, regression 22/22, hero view 149/150 draw calls (signs cost 2). Proof docs/shots/wayfinding-2026-10-23/.
Next: milestone markers on approach road/highway; findability audit list; far-east road; A-2b minimap.

---

**MOVABLE-UNITS AUDIT (A-1, 2026-10-23, for the art director's rearrangement). Read before moving anything.**
- ONE-VALUE-ISH (position passed as a parameter, props + colliders travel with it): the farmSites.js places - pond, tubewell, johad, khalihan, anganwadi, dudh dairy, health sub-centre, chemist, masjid, gurudwara, tv house, manihari, sabzi rehris, jain mandir, highway, jalebi stall, mela, gurukul, khel maidan, mandi, old haveli, gaushala, lane games/laundry/water corners, boundary walls. Their x,z is written TWICE in src/main.js (zoneManager.register x,z AND the create...() argument) and a THIRD time in PLACES (src/freeRoam.js, Visit-place + notebook map). Change all three. Inside a site nothing else is world-baked (local coordinates), with one caveat: NPC/animal routes and interaction points for these are not tied to the unit.
- BAKED INTO MANY FILES (moving needs code edits, not one number): house + courtyard (HOUSE_CENTER, village.js; MAA/HAND_PUMP/TULSI/CHARPAI positions in interactions.js and village.js; mission waypoints), school (SCHOOL_CENTER; bell, teacher, sister positions in interactions.js), halwai (HALWAI_CENTER; NPC, charpai), hero tea stall + general store (TEA_SHOP_POS in main.js, src/shops.js), bazaar row + chowk (bazaar.js absolute coordinates, bazaarLife.js, wheatErrand.js KIRANA/SACK/PITAJI literals), temple + temple lane (temple.js, lane constants in main.js), canal + bridge (canal.js), field/baagh (FIELD_CENTER, BAAGH_CENTER, MANGO_TREE_PLACEMENTS), background houses (abadiBoxes.json, one batch).
- NOT unit-bound anywhere: lamps (laid along lane segments), NPC routines/waypoints (raw world coordinates in npcRoutines.js, paths.js, dayline.js, sideJobs.js), mission waypoints (quest.js), tree placements for the village (lists of absolute x,z).
- Safest to move first: any of the first group. Hardest: the hero cluster (house/school/halwai/tea/store) and bazaar, because story missions reference raw coordinates.

---

**2026-10-23 (cycle 38bf2):** Game change: lamp posts, lane hand pumps and matka stands, lane/dhaba charpais, laundry poles and the tubewell (kothri, hauz, motor, charpai) are now solid (orientedSolids in src/farmSites.js, lampBoxes in src/props.js). Validator check 5 now also samples site_props / street_lamp materials. Build 15/15, regression 22/22. No walk-into screenshot proof (not ticked).
Next: A-1 movable-units audit note; courtyard hand pump + carts + troughs colliders; waypoint validation at build time.

---

**2026-10-23 (cycle 38bf):** Game change: notebook map now shows all places from first load (visited ticked); pause menu gained a guarded Tasks list (8 missions + 10 side jobs, done/current/locked, side jobs walk-to in free roam). Build all passed. Proof docs/shots/tasks-2026-10-23/. No movement code touched.
Next: A-2b corner minimap; then A-2c direction signs / findability audit; A-1 movable-units audit note.

---

**2026-10-23 (cycle 38be2):** Game change: every tree now has a trunk collider (people, animals, vehicles slide round trees; src/trees.js buildTrees, no extra draw calls). Validator check 5 extended to treat tree trunks as real geometry. Build 15/15, regression 22/22. No screenshot proof of a walk into a tree yet (not ticked).
Next: A0 remaining: colliders for lamp posts, hand pumps, charpais; extend devCheckPenetration to animals; build-time waypoint validation.

---

**2026-10-23 (cycle 38be2):** Game change: pause menu "Visit place" list (41 places, bilingual, generated from PLACES in src/freeRoam.js); lands the player on open ground facing the place, dismounts a vehicle first, mid-mission needs a second tap. Build passed. Proof docs/shots/visit-place-2026-10-23/. No movement code touched; regression not run.
Next: A-2b Tasks list + corner minimap (A-2 mission-warning path still needs a screenshot test).

---

**2026-10-23 (cycle 38be):** Game change: woven charpai also on the 4 dhaba cots and the TV house porch (charpaiGeos, src/farmSites.js). Proof docs/shots/charpai2-2026-10-23/dhaba.png, tvhouse.png. Build passed.
Next: doors/windows standing rule on dhaba, TV house and other small buildings (smallBuilding helper); hero-house charpai needs a draw-call saving first.

---

**2026-10-23 (cycle 38bd):** Game change: tubewell hauz now has real water (was green, grass inside); plant scatter keep-out for water bodies; tubewell kothri door/window got frames, plank lines, grille, sill; shared woven charpai (tubewell + lane laundry). Build all passed, budget 19.4 MB. Proof docs/shots/hauz-2026-10-23/after.png, door.png, charpai.png. No movement code touched.
Next: remaining charpais (dhaba, house, halwai), tubewell naali/meter box, doors/windows standing rule on other buildings.

---

**2026-10-23 (cycle 38bc):** Game change: banana clumps and bougainvillea at the four field-track corners (src/field.js, no new draw call; field views 82-90 calls). Build passed. Proof docs/shots/fieldcorner-2026-10-23/sw.png. No movement code touched.
Next: temple/hero neems into streamed zones; kid packs when characters unpark.

---

**2026-10-23 (cycle 38bb):** Game change: W2 lane (x -84..-58, z 24) now has a cow, buffalo and street dog resting (zone lane_cattle_w2, src/main.js), so all five abadi lanes have games, laundry, water and cattle. Build all passed. Proof docs/shots/lane-cattle-w2-2026-10-23/cw_a.png. No movement code touched. Animals are still blocky code models until Tripo.
Next: temple/hero neems into streamed zones (needs draw-call savings first); kid packs when characters unpark.

---

**2026-10-23 (cycle 38bb):** Game change: W2 lane (x -84..-61, z 21) now has street life: carrom/ludo, laundry line, water corner (zones lane_*_w2, src/main.js). Build 15/15 (hero zone 145 calls), regression 22/22. Proof docs/shots/lane-w2-2026-10-23/w2_a.png (games + laundry), w2_c.png (ring toss-like prop from nearby building framed, water corner not cleanly framed). Note: the n0 boundary wall at z=21 runs along the W2 lane line, so the lane reads as the strip just south of it; items placed at z 22.6.
Next: temple/hero neems into streamed zones; kid packs when characters unpark.

---

**2026-10-23 (cycle 38ba):** Game change: every road wheel (tractor x4, trolley x2, bicycle x2) is now one mesh (tyre + rim merged, vertex colours, shared matte paint) instead of two, saving 8 draw calls when all are in view; rim loses its metallic sheen. Build all passed, regression 22/22 (140 calls). Proof docs/shots/2026-10-23T07-47-38-404Z/vehicle_tractor_trolley_side.png (wheels read fine; bike shot is blurred by an existing camera issue, not framed). Wheel spin code untouched.
Next: W2 lane street life with the new headroom; temple/hero neems into streamed zones.

---

**2026-10-23 (cycle 38az):** Game change: lane E2 (x=-6, z 76..130) now has street life (carrom/ludo, laundry, water corner, cattle + dog; zones lane_*_e2, src/main.js). Made headroom first: the bullock cart's 8 legs are now one InstancedMesh (src/vehicles.js, 8 calls -> 1), hero view 150 -> 144 draw calls. Build 15/15, regression 22/22. Proof docs/shots/lane-e2-2026-10-23/e2_b.png, e2_c.png (cart legs not separately framed; regression walk passed). W2 lane (z=21) street life would push the hero zone over 150, skipped.
Next: more hero-zone call savings (tractor 11, trolley 6 meshes) then W2 lane street life; temple/hero neems into streamed zones.

---

**2026-10-23 (cycle 38ay):** Game change: water corners (cast-iron hand pump on a cement platform, clay matkas on a stand, steel ghadas, bucket, washing stone) in three abadi lanes, streamed zones lane_water_e1/w1/s1 (createLaneWaterCorner, src/farmSites.js), visual only, one draw call each. Build all passed, budget 19.4 MB. Proof docs/shots/lanewater-2026-10-23c/w1_d.png (e1 partly framed, s1 not cleanly framed: camera clips walls). No movement code touched.
Next: kid packs when characters unpark; temple/hero neems into streamed zones; field-track edges.

---

**2026-10-23 (cycle 38ax):** Game change: two buffalo at the pond bank (zone pond_buffalo, src/main.js). Build all passed, budget 19.4 MB. Proof docs/shots/pondbuffalo-2026-10-23/pond_a.png. No movement code touched. Tried wiring baked tree impostors (public/assets/trees/impostor_*.webp, untracked, unused) as a 200 m LOD: reverted, because streamed zones mean no tree is in view past ~90 m so the level could not be verified or ever shows.
Next: kid packs when characters unpark; temple/hero neems into streamed zones.

---

**2026-10-23 (cycle 38aw):** Game change: laundry corners (charpai, quilt, drying chillies, tub, clothesline with saris) in three abadi lanes, streamed zones lane_laundry_e1/w1/s1 (createLaneLaundry, src/farmSites.js), visual only. Build all passed. Proof docs/shots/laundry-2026-10-23/e1_a.png. No movement code touched.
Next: kid packs when characters unpark; temple/hero neems into streamed zones; field-track edges.

---

**2026-10-23 (cycle 38av):** Game change: abadi rows get per-row limewash tint (cream, blush pink, mint, blue-grey; ABADI_WASHES in src/scenery.js, instance colour, zero draw calls). Build all passed, budget 19.4 MB. Proof docs/shots/abadiwash-2026-10-23/w1_c.png, s1_d.png. No movement code touched.
Next: temple/hero neems into streamed zones; in-job screenshots; kid packs when characters unpark.

---

**2026-10-23 (cycle 38au):** Game change: cow + buffalo + street dog resting in the lane at three abadi spots (E1, W1, S1; zones lane_cattle_*, src/main.js, reuse createCattleHerd/createDogPack, 2 draw calls each, streamed, visual only). Build all passed. Proof docs/shots/lanecattle-2026-10-23/s1_d.png, w1_d.png (e1 lane framing not clear). No movement code touched. Animals are still the blocky code models until Tripo.
Next: kid packs in lanes; temple peepal/neems into streamed zones for LOD; field-track edges.

---

**2026-10-23 (cycle 38at):** Game change: carrom + ludo boards on jute mats with stools in three abadi lanes (createLaneGames, src/farmSites.js; streamed zones lane_games_e1/w1/s1 in src/main.js). Build all passed, budget 19.4 MB, console clean. Proof docs/shots/lanegames-2026-10-23/e1_a.png. No movement code touched. Note: impostor idea dropped (streamed zones build within ~30 m, far LOD never shows there). Reference CLAUDE.md under reference-from-unity is Unity-era; this repo's CLAUDE.md governs.
Next: roaming cattle in lanes, kid packs, in-job screenshots.

---

**2026-10-23 (cycle 38as):** Game change: flower stall now has ten hanging marigold/rose garland strands (src/temple.js buildFlowerStall; closes the review-1 FIX). Build all passed, budget 19.4 MB, console clean. Proof docs/shots/garland-2026-10-23/stall2.png. No movement code touched.
Next: move hero/temple neems into streamed zones for LOD; impostor; field-track edges.

---

**2026-10-23 (cycle 38ar):** Game change: tree leaf cards within ~3 m of the camera now dissolve (dithered fade, src/trees.js shader, no draw calls), so the follow camera no longer sits in a wall of leaves. Proof docs/shots/2026-10-23T05-54-17-220Z/low_angle.png (before: ...05-51-42-375Z). Tried streaming the temple peepal: hero view 151 calls, reverted. Console clean. No movement code touched.
Next: chowk/hero neems need a draw-call saving before they can stream; field-track edges; in-job screenshots.

---

**2026-10-23 (cycle 38aq):** Game change: mango baagh trees streamed (zone trees_baagh) so tree LODs work there. Build 15/15, budget 19.4 MB. Proof docs/shots/baagh-trees-2026-10-23/. Validator settle wait 5->20 frames (teardown lag). No movement code touched.
Next: temple peepal and hero/bazaar neems into streamed zones, then impostor.

---

**2026-10-23 (cycle 38ap):** Game change: 10 streamed outskirts trees (neem, peepal, babool) around the pond, johad, haveli and gaushala (src/main.js outskirtTrees). Build 15/15, budget 19.4 MB, console clean. Proof docs/shots/outskirts-2026-10-23/. Finding: merged trees defeat the LOD (see BACKLOG A3); impostor reverted. No movement code touched.
Next: move field/temple trees into streamed zones so LOD + impostor can work; field-track edges; in-job screenshots.

---

**2026-10-23 (cycle 38ao):** Game change: north-edge boundary wall run (x -101..-58, z 21, lane gap) as streamed zone edge_wall_n0 in src/main.js. A second run at x 14..46 took the hero zone to 151 draw calls, so it was dropped. Build 15/15, budget 19.4 MB, console clean. Proof docs/shots/northwall-2026-10-23/b_0.png. No movement code touched.
Next: tree impostor (needs baked texture), field-track edges, in-job screenshots.

---

**2026-10-23 (cycle 38an):** Game change: chulha smoke wisps now rise from 7 abadi rooftops (abadiSmokeSources, src/scenery.js -> createAmbientLife extra sources, same smoke draw call). Build 15/15, budget 19.4 MB, console clean. Proof docs/shots/abadi-smoke-2026-10-23/e1.png, w1.png. No movement code touched.
Next: tree distance impostor (baked), per-job screenshot proof.

---

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

