# Feedback - newest first. Autopilot: work these first, mark each "DONE <date>: <commit>".

## 24 Oct 2026 - AISHWARYA'S 10-MINUTE PLAYTEST. THIS IS THE RUN'S ONLY JOB.

She played the live build tonight and wrote the list below herself. Every line is
hers. This block outranks everything else in this file, ART_REVIEW.md, BACKLOG.md and
FINISH_LINE.md until every item is ticked.

### HOW THIS RUN WORKS - read before you pick anything up

- **Do not stop until this whole block is done.** The loop runs for at least 15 hours.
  A run that ends with items here unticked has failed. Last night the loop stopped
  with her morning list unfixed; that must not happen again.
- **Build nothing new until this block is finished.** No new places, no new features,
  no new BACKLOG items. Quality rework of what already exists, only. When every item
  here is ticked, and only then, continue down BACKLOG section A in order.
- **Never stop on a push failure or on waiting for her.** Commit locally, one line in
  NEEDS_YOU.md, keep building.
- **Characters and Tripo stay parked until 29 Oct.** Spend no credits, generate no
  Tripo model, ask nothing about the API key. Capsule NPCs may still be PLACED (a
  capsule sitting in the post office is wanted); they just stay capsules for now.
  **Confirmed by her, 24 Oct: never leave a spot empty because the real model is not
  ready. Put a capsule there now; it gets swapped for the 3D model after 29 Oct.**
  This applies everywhere a person or animal belongs: shop counters, the petrol pump,
  the post office, the chakki, the school, lanes and fields.
- **Asset policy, her exact instruction.** Search for a free asset everywhere first:
  Poly Haven, ambientCG, Poly Pizza, Sketchfab CC0 filter, Quaternius, Kenney,
  OpenGameArt, Free3D, BlenderKit free tier, Wikimedia Commons for photos. Name in
  the report what you searched and what you found. **Only when the free search truly
  comes up empty**, wrap a real free photo texture onto correct simple geometry
  (chips packets, notice boards, lotus, labels) or hand-build it properly in Blender.
  Whatever route you take, **the execution must be clean, realistic and free.** A
  coloured cuboid standing in for a real object is a failure, not a placeholder.
- **Every fix needs a proof shot that passes the screenshot rules** at the bottom of
  ART_REVIEW.md: no fps text, no tutorial overlay, no capsule people in frame, and
  the subject actually visible. Fix tools/screenshot.js first (item 0) so this is
  automatic.
- **Do not tick a box you have not looked at.** Open the image. If you would not show
  it to her, it is not done.

### 0. FIRST: the screenshot tool, then the two engine bugs
These three block everything else. Do them in this order.

**0a. [DONE 24 Oct 2026: tools/shotlib.mjs + tools/screenshot.js; proof docs/shots/2026-10-23T23-24-35-701Z/spawn_behind.png and docs/shots/shotlib-test-2026-10-24/halwai.png; subject check throws on occluded/off-frame, verified] tools/screenshot.js** - hide the fps counter and dev overlays, dismiss the
tutorial and dialogue panel, hide capsule placeholder people and the player capsule,
print the real fps, label headless shots as headless, and fail loudly if the named
subject is not in frame.

**0b. [DONE 24 Oct 2026, see handoff for the one trade-off: zones now BUILD up to buildRadius+170 m ahead (frustum + travel-direction prefetch, time-sliced) and are DRAWN from buildRadius+80 m (big far landmarks 215 m). Proof: docs/shots/streaming-2026-10-24/{mandi,khet}/ and event logs tmp/walk-*.log; build 16/16, regression 22/22] STREAMING IS BROKEN AND SHE CAN SEE IT. Highest priority bug.**
Her words: near the khet she could not see the trees; they only appeared **after she
entered the farm**. At the "Mandi 110 m" milestone the mandi was still empty ground
and the buildings were still being built around her as she walked.
- Trees, buildings and props must be loaded and visible **when they enter the line of
  sight**, not when the player arrives on top of them.
- Raise the streaming radius so anything in the camera frustum within draw distance is
  already built. Prefetch along the direction of travel.
- Nothing may visibly pop in or assemble inside the player's view.
- DONE-WHEN: walking the house-to-mandi route and the house-to-khet route, no object
  appears inside the frame. Record both walks as frame sequences and look at them.

**0c. [PARTLY DONE 24 Oct 2026: animals (cattle herds, dog packs) now carry real colliders, validator check 5 extended to count them; real key-walk (hold W, 30 s, straight at target) stopped at a tree (0.75 m from trunk centre), a wall, a cow (1.46 m from its centre) and a building, tmp/collide-walk.mjs, shots docs/shots/collision-2026-10-24/{cow,wall,building}.png; pond and johad now block movement (proof docs/shots/collision-2026-10-24/{pond,johad}.png); cart legs, vehicle-vs-vehicle, followers and check 9 audited 24 Oct, see handoff cycle 39m] COLLISION STILL FAILS. She hit it again tonight.**
Her words: the capsule is still crossing animals, buildings and trees.
- Humans must not pass through walls, buildings, animals or trees. They go around.
- Finish every open A0 item: colliders on cart legs, wells, pond and johad edges, the
  remaining charpais; register animal routines and the follow routine with validator
  check 9; vehicles collide with buildings, walls, trees and each other.
- DONE-WHEN: a real walk, with keys, straight at a tree, a wall, a cow and a building
  stops the player every time. Proof shot of each.

### 1. [PARTLY DONE 24 Oct 2026: code now renders English bold/dominant, Hindi small/light on every board (signboards.js, bazaar.js, newShops.js); 20 new boards incl. the halwai; audit list in handoff.md; proof docs/shots/signage-2026-10-24/. School gate board done 24 Oct (docs/shots/signage-2026-10-24/school_gate.png). Open: Banta shop and Chaat thela are not built] SIGNAGE - the rule is in CLAUDE.md but the CODE still does the opposite
Her words: English in bold, Hindi not bold. Most of her users read English; only some
read Hindi.
- CLAUDE.md lines 111-121 already say English primary, larger and bolder. **The code
  does not do it.** `src/signboards.js`, `src/bazaar.js` and `src/newShops.js` still
  render Devanagari larger and first. Fix the code to match the rule.
- Fix the stale opposite rule still sitting at docs/ART_REVIEW.md lines 7 and 741.
- Then re-render **every board in the game**: shops, direction signs, notice board,
  milestones. English bold and dominant on top, Hindi beneath, lighter weight.
- The halwai stall has no board at all. Audit all 42 places and LIST every missing or
  illegible board, then fix every one.
- DONE-WHEN: a shot of each board at game distance where the English reads first.

### 2. [PARTLY DONE 24 Oct 2026: bougainvillea REMOVED (her option 1), carrom-side plant removed with all card plants, creeper (lime) removed, flower pots = real Poly Haven potted plants in clay pots at doorsteps (code-built Blender pots deleted from every building), grass = real scanned clumps, thinned and distance-limited, marigold beds = real Poly Haven gazania. Proof docs/shots/plants-2026-10-24/{abadi_doorsteps,halwai_grass,flower_stall}.png. Open: clay-pot matkas still faceted (Blender clay_pot), milk cans (the six white cylinders?) not yet reshaped, tulsi/banana have no real model so are not drawn] PLANTS, FLOWERS AND POTS - she has asked three times now
- **Bougainvillea is still random.** Either remove it entirely or replace it with
  good-looking bougainvillea. Her choice of words: those are the only two options.
- **The plant next to the elders playing carrom looks like a poorly cut 2D image.**
  Remove it and put a good quality plant there.
- **Flower pots: not improved.** Replace with real free pot models.
- **Clay pots: she asked for realistic clay pots and did not get them.** The six white
  cylindrical objects outside one house (she could not tell what they were) are part
  of this: make them clearly readable as what they are, or remove them.
- **Standing rule from her: use good quality plants and pots everywhere, or do not use
  them at all.** An unconvincing plant is worse than no plant.
- **Random grass everywhere looks bad.** Grass tufts are scattered at random in places
  that make no sense. Thin them out, place them where grass would actually grow, and
  replace the flat card tufts with better geometry or a better atlas.
- The creeper near the rooftops glows lime at the edges. Palette is dusty olive and
  deep neem green, never lime.

### 3. THE KHET - she asked for variety and did not get it
Her words: she specifically wanted lots of variety in the khet - sugarcane, mustard
flowers - and it is still not there.
- Build real crop variety: sugarcane blocks, flowering yellow mustard (sarson),
  wheat at different growth stages, a vegetable patch, bare ploughed earth.
- Mustard in flower is the signature North Indian field image. It must read as yellow
  flowering fields from a distance.
- Confirm whether haystacks exist near the tubewell and near the Yadav Chai Nashta
  stall. She could not tell. If they are missing, build them; if they are there,
  they are not reading as haystacks, so rebuild them.

### 4. THE MARKET AND THE SHOPS
- **Every shop in the market is half closed. Open them all.** Shutters up, interiors
  visible, goods on display. [PARTLY DONE 24 Oct: bazaar row shutters fully rolled up (build_bazaar_row.py rebuilt); not yet re-shot; interiors' own box goods still to replace]
- [DONE 24 Oct for Gupta General Store: real-shaped printed chips/namkeen/biscuit/soap/tea packs, toffee jars, sachet strips, soda bottles - src/shopGoods.js, proof docs/shots/shops-2026-10-24/store_front.png + store_close.png; wrapper art is generic (no brands) drawn in code, no free un-branded packet photos exist. Other shops' goods still boxes] **Gupta General Store is the worst offender.** She asked for realistic items and
  got coloured cuboids. Put real Indian village shop goods in it: chips packets,
  biscuit packets, sweets, soap, toffee jars, sachet strips, cold drink bottles.
  Find free 3D models; if none, put real photo textures on correctly shaped
  geometry. Coloured cuboids are not acceptable.
- Improve the textures of every object kept inside every shop.
- **There is something in the market area she could not identify at all.** Walk the
  market, find every object whose purpose is not instantly readable, LIST them in
  handoff.md, and either make each one clearly what it is or remove it.

### 5. POST OFFICE, ATTA CHAKKI, SPECIFIC PLACES
- [PARTLY DONE 24 Oct 2026: capsule postmaster at the counter, 2 notice boards, post box was already there; proof docs/shots/postoffice-2026-10-24/front.png, notices.png; open: post box/counter textures] **Post office**: she asked for a person sitting inside and did not get one. Put a
  capsule NPC at the counter. Add labels and notices outside. Add the red Indian
  post box; a free 3D model of a post box is easy to find.
- **Atta chakki**: random shapes, nothing is clear. Find a real mill/machinery model
  or build a readable chakki: hopper, grinding unit, belt, motor, flour sacks.
- **Petrol pump**: does not look like a petrol pump at all. Free fuel pump models are
  common. Add the canopy, pump units, hoses, price board, a person, and a tractor or
  vehicle standing at it.
- **The godown and large truck area near the highway**: nothing is clear and she could
  not tell what the place is. She guessed dharam kanta. Make it unmistakable: a real
  weighbridge plate, a cabin with a readable board, sacks, a loading platform.
- **Cricket field**: the ground texture is bad and does not read as mud. Replace it.
- **The court beside it**: if it is a badminton court, draw the court lines and use a
  proper net. Free assets exist.
- **School**: no India flag pole and no games. Add the flag pole with a flag, and
  playground games. She has shared 2D reference images of the school that were not
  followed - find them in the repo references and follow them.
- **The yellow swing** is not good or realistic. Rebuild or replace it.

### 6. BUILDINGS AND STRUCTURES
- **The cottage-style houses look bad.** Better quality wood, better textures. Use
  real free PBR wood and thatch sets, not flat colour.
- [DONE 24 Oct: dishes removed from the rooftop pick list, antenna kept] **Dish TV antennas** read as random concave objects. She likes the new TV antenna;
  the dishes must be clearly dishes with a bracket and an arm, or be removed.
- **Water tanks** throughout the village: a free model of a plastic or cement water
  tank is easy to find. Use a real one.
- **The hand pump in the middle of the house streets was asked to be removed and is
  still there.** Remove it. [DONE 24 Oct: lane hand pumps removed (src/farmSites.js createLaneWaterCorner); the courtyard pump of the errand stays]
- Far-LOD background buildings are flat untextured blocks visible in hero shots. Give
  the far LOD painted openings and a plaster tone.

### 7. GROUND, WATER AND ROADS
- **Water texture throughout the game needs improving.** Pond, johad, canal, tubewell
  hauz. Real water: depth tint, movement, reflection, a soft shore line.
- **The pond lotus is pink cones.** Find or build a real lotus with pads and flowers.
- **The mud near the pond looks bad.** Realistic wet-earth texture at the shoreline.
- **The highway is too smooth.** No village highway is that smooth. Patch it: worn
  edges, repairs, cracks, dust at the margins, no crisp kerb line.
- **The road near the godown ends abruptly and turns into grassland.** Roads must
  terminate believably: a junction, a dirt continuation, or a reason to stop.

### REPORTING
Each run's report says: which numbered items you closed, what you searched for each
asset and what you found, and which items remain. Do not claim an item is done
without a proof shot path. Do not reword her items.


## 24 Oct 2026 (art director) - 15-HOUR QUEUE. Work these IN ORDER, above everything else.

Standing: a cycle that changes nothing is a failure. Never stop on a push failure,
never stop waiting on Aishwarya. Characters and Tripo are PARKED until 29 Oct: build
nothing character-related, spend no credits, ask nothing about the Tripo key.

Her four newest proof shots were reviewed on 24 Oct. Two are FAIL. The verdicts and
the new standing screenshot rules are at the bottom of docs/ART_REVIEW.md. Read them
before item 1.

### 1. [DONE 24 Oct 2026, see 0a above] FIX THE SCREENSHOT TOOL FIRST (blocks every tick below)
Proof shots are being filed with debug text, tutorial overlays and capsule people in
frame, and several do not show their own subject. Make this impossible in the tool,
not a thing to remember. In tools/screenshot.js:
- Hide the fps counter and every dev overlay before capture.
- Dismiss or suppress the tutorial and dialogue overlay before capture.
- Hide capsule placeholder people (and the player capsule) for the capture.
- Print the real fps in the run report and label any headless shot as headless.
- Add a subject check: the capture takes a named target and fails loudly if the
  target is not in frame or is fully occluded.
DONE-WHEN: a fresh capture of any place has no overlay, no fps text, no capsule, and
the named subject is visibly in frame.

### 2. RE-TAKE THE BAD PROOF SHOTS
Every box ticked on 23 Oct whose proof shot breaks a rule above gets a new shot. Do
not untick the box; replace the shot and append "reshot 2026-10-24" to the line.
Start with docs/shots/rooftops-2026-10-23/ (no rooftop is in frame in r1 or r5).

### 3. [PARTLY DONE 24 Oct 2026: wisps/embers reworked, lens-blobs fixed, grey panel (QR board) removed; proof docs/shots/halwai-fire-2026-10-24/close.png; flame still needs a fire mouth on the bhatti] HALWAI FIRE REWORK
Smoke and steam currently read as white blobs in front of the lens; flame flecks read
as flat yellow dots. Rework to thin rising wisps that thin out with height, and
embers that read as fire at game distance. Also identify or remove the grey panel
with black rectangles at the right edge of docs/shots/halwai-fire-2026-10-23/close.png.

### 4. SIGNBOARD AUDIT, ALL 42 PLACES
The halwai stall has no signboard. This is the logged regression and it is not fixed.
Audit every one of the 42 places, LIST the ones with no signboard or an illegible
one, then fix them. Devanagari larger than the English, legible at game distance.
DONE-WHEN: the list is in docs/handoff.md and every shop in it has a legible board.

### 5. BACKGROUND BUILDINGS AT DISTANCE
Far-LOD buildings are flat untextured colour blocks with no openings and they appear
in hero shots (right side of halwai wide.png). Give the far LOD painted openings and
a plaster tone so it does not read as a grey box.

### 6. FINISH A0 COLLISION (BACKLOG section A0)
Remaining from the 23 Oct progress notes, in order:
- Colliders: cart legs, wells, pond and johad edges (not yet audited), the remaining
  charpais (hero house, TV house porch). Then write the full no-collider audit LIST.
- Register animal routines and the follow routine with validator check 9.
- Vehicles collide with buildings, walls, trees and each other.
- Followers snag on props between them and the door: add simple avoidance.
DONE-WHEN: every A0 box is ticked with a proof shot that passes item 1's rules.

### 7. THE REAL FINDABILITY WALK (A-2c)
tools/findability-audit.mjs is a static estimate and the box rightly stays open. Do
the real thing: walk on foot from the house to all 42 places using only what a player
can see, screenshot each arrival, report walk time and whether a visible path leads
there. LIST every place not findable without the map.

### 8. LANES THAT CONTINUE (A-2c)
Lanes stop after a few metres. Carry kerbs, drains, lamps and street life all the way
to where each lane leads. The far-east cluster: do NOT move anything; build the road
along roughly z=76 and report, or report that distances should shrink.

### 9. CC0 PROPS STILL HAND-BUILT (A1a2)
Poly Haven has no hand pump, charpai, handcart, sack. Search Poly Pizza and ambientCG
before hand-building, per the standing rule, and say in the report what you searched.
Still to replace: hand pump, charpai frames, handcarts, bicycles, sacks, ladders,
water tanks, lamp poles.

### 10. VEGETATION (A1a2)
- Real CC0 tree MODELS wherever a species exists; cutout cards only where none does.
- Mid and far LODs for the plant atlas (none exist yet).
- Grass tufts and crops are still the old flat cards. Replace them.
- The creeper in rooftops/r1.png glows lime at the edges. That colour is outside the
  palette: natural dusty olive and deep neem green, never lime.

### 11. [DONE 24 Oct 2026: 5 items marked done in NEEDS_YOU.md] CLOSE THE STALE NEEDS_YOU ITEMS
Five items in docs/NEEDS_YOU.md say publishing is stuck because the Mac has no
GitHub login. Push works over SSH now and origin/main and main are level. Mark those
five `- status: done` with a one-line note. Do not touch the others.

### 12. A-2b TASK MENU LEFTOVERS
Free out-of-order story-mission switching (needs per-mission state setup), active-task
waypoint switching, and the shipped-minimap-conventions web research that was skipped.

When all twelve are done, continue down BACKLOG section A in order. Do not stop.


## 21 Oct 2026 (user, via art director) - TEXTURES AND MATERIALS FOR EVERYTHING (top priority with trees)
- The user means EVERY surface, not only grass and plants: houses, kachcha mud houses/jhopdis, shops, school, walls, roofs, lanes, canal, fields, animals, vehicles, props.
- Method for buildings (Blender): real CC0 PBR texture sets (Poly Haven / ambientCG, 1K WebP), proper UVs, a shared trim sheet for frames/plinths/bands, baked AO, per-wall colour variation, soft dirt at the base, sun-faded paint, subtle stains and decals near doors/drains. Cared-for, lived-in, never broken or poor.
- Surface types to cover: lime-washed plaster (blue-grey, cream, pink, mint), cement plaster, painted wood (doors, shutters), corrugated tin, terracotta tiles, exposed-but-neat brick only on boundary walls and planters, mud-and-cow-dung plaster with thatch roofs for kachcha houses and cattle sheds (neat, cared-for), stone/cement floors, packed-earth lanes with tyre ruts, kerbs and drains.
- (PARTLY DONE 2026-10-21: one homestead built, more to come) Add a few kachcha houses/jhopdis at the village edge and near the fields: mud walls, thatch roof, swept courtyard, charpai, chulha, cattle. Dignified, never poverty-porn.
- Animals: replace the blocky code cows/buffalo/dogs/goats with real-looking models. Add them to the Tripo batch from Characters V1/animals references (cow, buffalo, bulls, dog, goat, hen, monkey); until then, smooth shapes with real hide/fur colour and texture.
- Vehicles and props: real paint, rubber, rust-free metal, wood grain, rope, cloth.
- Check: a screenshot of any lane must read like a real North Indian village photo at game distance.

## 21 Oct 2026 (art director) - TREES AND PLANTS PLAN (biggest visual fix, do first)
- Current trees and plants look bad. Rebuild all vegetation in Blender (installed, headless):
  - Species: neem, peepal, mango, babool, eucalyptus, banana clumps, plus shrubs, tulsi, marigold beds, bougainvillea, creepers, grass tufts, crops (wheat, sugarcane, sabzi rows).
  - Method: real branching trunks (Blender Sapling Tree Gen extension or your own curve-based generator), leaves as alpha-cut leaf cards using CC0 leaf textures (e.g. ShareTextures leaf collection; check every licence is CC0, credit in docs/CREDITS.md; never Poliigon/NC). Poly Haven CC0 plant models may be decimated and reused.
  - Game-ready: 3 LODs per tree + a billboard impostor for distance, instanced, gentle wind sway in the shader, soft baked AO.
  - Colours: natural dusty olive and deep neem greens with variation, never lime.
  - Test: a screenshot of the main lane should read like a real North Indian village, not a toy.

## 21 Oct 2026 (art director)
- Greens read lime/cartoon: shift grass and tree greens toward natural dusty olive and deep neem green, with variation. DONE 2026-10-21 (this commit)
- Walls read flat: add soft colour variation, light AO and gentle weathering (cared-for, never broken) on every Blender building.
- Lanes feel empty: add villagers walking, kids playing, cycles, cattle resting, chulha smoke, birds.
- Abadi houses: add balconies with carved wood, potted plants, creepers and roof clutter like Characters V1/buildings/house_1.png.
