# MONDAY 9 NOV. She tests ONLY when the list below is DONE. Then Tripo, then ship Tuesday.

The two worst lag causes are fixed (standOn settle passes, bazaarLife re-seat, camRig,
the empty shadow pass). Finish the job, in order. When ALL of it is done, write ONE line at
the top of docs/NEEDS_YOU.md: "READY FOR HER TEST: <date time>".

## D1. Load time under 10 s (headless gate currently 16-21 s, FAILS).
Measure what blocks Play: textures, models, shader warm-up, lazy builds. Cut until the
headless 4G + 4x CPU gate passes, or report exactly what remains and why.
## D2. Feet on the ground: 45 of 218 figures still off by more than 3 cm.
Fix all 45 (arm_frontage people sunk on metal, gully_life etc.). feet-check must read 0.
## D3. Old house textures on every remaining flat-coloured row.
flat-wall-audit tool exists: run it, fix every hit. Missed three times; must close now.
## D4. Mandi, gurudwara, panchayat turned to face their roads. (chaupal done.)
## D5. Peacock on a roof.
## D6. Final check, then the ready line:
build passes, collision-test 0 failed, regression 22/22, feet-check 0, draw calls under
150 in every zone, findability 0 stranded, 0 console errors, ride-through capture to
docs/shots/ride-final-<date>/.

---

# STOP ALL NEW CONTENT. THE GAME IS BROKEN FOR HER. Sunday 8 Nov, afternoon.

Her words: "when I click on new game, the button doesn't work. After clicking it like 4
times, it works. When I land in the game, it is very, very, very slow. It is lagging a lot."

Performance work is now REQUIRED. The overnight "no performance work" rule is CANCELLED.
Nothing new is built until both of these are fixed and measured.

## B1. The New game / Continue button. Small, do it first.
Cause, src/ui.js `start()`: `if (!overlay.classList.contains('ready')) return;`. The button
looks pressable at once but silently ignores presses until loading finishes, so she clicks
until one lands after load.
- Until ready: button visibly disabled, label "Loading..." / "लोड हो रहा है..." with progress.
- A press before ready is REMEMBERED, and the game starts the moment it is ready.
- One press always works. Test: press once at t=0.1 s; the game must start by itself.

## P1. The lag. Measure first, then cut. Report MEASURED numbers.
What grew since 6 Nov: screenshot-view draw calls 135 -> 165 (200 in some views, ceiling
150), browser triangles ~750k -> ~850k+, static colliders 8,334 -> 11,149, visibility out to
350 m, many new per-frame systems (feet re-seat every 15 frames, dog follower, cyclist
events, NPC routines, cycle haptics).

1. **Profile.** In headless Chrome AND by frame timing in-game: fps, ms per frame split into
   render / physics+collision / game logic. Spawn view, chauraha, main road, bazaar. Save
   to docs/perf-2026-11-08.md. Find the top 3 costs before changing anything.
2. **Batch every scene added since 6 Nov** (main-road life, gully life, chaurahaEdges,
   cyclist events, oddities, wall writing, nostalgia, roof monkeys, scooters) into the
   shared per-material BatchedMesh, like the older places. Target under 150 calls in EVERY
   view, then lower.
3. **Clutter LOD, not place culling.** Buildings and places stay drawn to 350 m (never
   again "the village is empty"). Small clutter (pots, charpais, crates, washing, kids,
   vendors, props under ~2 m) fades out beyond ~80 m.
4. **Collision broad-phase.** Only colliders in a grid cell near a moving body are tested.
   Not all 11k per frame.
5. **Shadows.** Only objects within ~60 m cast shadows. Check the shadow map size.
6. **Per-frame systems.** Static seated figures snap to the ground ONCE, not every 15
   frames. Anything that runs every frame and does not need to: make it event-driven.
7. **Target: 60 fps at the spawn view and the chauraha, 50+ everywhere, on her MacBook.**
   Add an fps / frame-time check to the build so this cannot creep back.
8. **Load time**: measure Play-ready time again (ceiling 10 s). Report it.

After B1 and P1 are measured and done: back to the content list below.

---

# SUNDAY 8 NOV, AFTER 12:00. "Continue building." Tripo models go in Monday; ship Tuesday.

Overnight landed: cycle speed/steering/collision/feel, feet-on-ground, roundabout with
four arms, chauraha frontage, main-road scenes every 28 m, both gullies, monkeys.
MISSED overnight, do these FIRST:
1. **Old house textures on every remaining flat-coloured row.** Missed twice now. No flat
   wall left anywhere a player can see.
2. **Mandi, gurudwara, panchayat turned** to face their roads (wrong-turn audit).
3. **Peacock** on a roof or a wall.
Then:
4. **The main road beyond the square still opens onto bare field** (ride shot 1_rehri).
   Frontage, not just scenes: house rows and open shops along both sides of every arm,
   out to at least 120 m from the ring. Scenes alone in a field are not a street.
5. Same for the cross road arms.
6. Ride-through capture every 6 hours to docs/shots/ride-2026-11-08-<HHMM>/.

Rules unchanged: visible change only, no performance work unless broken, no half-on
features.

---

# TOP OF TONIGHT: THE CYCLE AND GROUND CONTACT. She rides constantly, she feels these every second.

Her words, 7 Nov 23:45: "cow's legs are inside the ground... All human beings and animals
should stand ... on the ground. They should neither float nor ... be inserted into the
ground. ... reduce the speed of cycles ... cycle is still crossing certain things ... not
following A and D command very well ... work on the haptics. It should look like I'm
actually riding a cycle."

Verified causes:
- `src/main.js:210` MOVE_SPEED = 4.2 m/s (walking), `:211` CYCLE_SPEED_MULT = 3, so the
  cycle does **12.6 m/s = 45 km/h**. Motorbike speed.
- `src/main.js:2992` the cycle moves through the SAME walking movement as the player: any
  direction, turn on the spot, no momentum. That is why A and D feel wrong.
- The cycle collides as a person-sized capsule, so its front wheel enters walls; at 12.6 m/s
  each frame's step is also large.

## C1. Speed. One commit, do it first.
Replace the multiplier with a fixed cycle top speed of **5.5 m/s (about 20 km/h)**. Walking
unchanged. Keep the multiplier gone, so a future motorbike gets its own speed.

## C2. Real cycle steering.
- W pedals (accelerate to top speed over about 1.5 s), S brakes, no input coasts down over
  about 3 s.
- **A and D steer the handlebar**: they change the heading at a rate that falls as speed
  rises. The cycle always moves along its heading, never sideways.
- It cannot turn on the spot: below about 0.5 m/s, steering does nothing.
- Must still work on touch (the on-screen stick: forward component = pedal, sideways = steer).

## C3. Collision.
- A cycle-shaped footprint: about 0.6 m wide by 1.8 m long, oriented along the heading,
  swept every substep. Front wheel never enters a wall.
- Hitting something head-on stops the cycle. A glancing hit slides along the wall.
- **Test: ride at full speed into every building wall, fence, cart, charpai and tree within
  the village, from 8 angles. Zero penetrations. Add it to the build checks.**

## C4. Riding feel ("haptics").
- Rider and cycle lean into turns, proportional to speed x turn rate, max about 12 deg.
- Pedals and wheels rotate at the rate matching ground speed.
- Small pedalling bob of the rider while pedalling; none while coasting.
- Gentle camera sway and a slight camera lag on turns. Nothing nauseating.
- A small bump on kerbs, the speed breaker and rough ground.
- Cycle bell on a key (B), bilingual hint on screen the first time.

## G1. Every person and animal stands ON the ground.
- Snap every NPC, vendor, villager figure, cow, buffalo, goat, dog, peacock and monkey so
  its lowest point (feet, hooves) sits exactly on the ground height under it, including in
  the dug dips around the pond and johad (src/dips.js).
- Anything on a raised surface (chabutra, charpai, roof, wall) stands on THAT surface.
- **Check: fail the build if any figure's feet float or sink more than 3 cm.**

Then continue with the visible-change list below.

---

# OVERNIGHT 7-8 NOV: VISIBLE CHANGE ONLY. Her words, 23:30: "I don't see lot of developments in game."

She is right. Of 61 commits in the last 24 h, about half were invisible: draw-call cuts,
batching, collision, test harness. Every visible addition tripped the draw-call ceiling and
the next run was spent clawing it back. That loop ends tonight.

## THE RULE FOR TONIGHT
- **Every run must change something a player SEES from the cycle.** If a run would not, do
  not do it.
- **No performance work** (draw calls, batching, culling, harness, validator tuning) unless
  the game is actually broken: crashes, console errors, fps collapse, a failing build.
- If the draw-call ceiling blocks a visible item, **raise that zone's ratchet and ship the
  visible item.** Note the zone and the overage in docs/NEEDS_YOU.md. Performance is
  cleaned up on Monday, before the Tripo models.
- CANCELLED: "batch unbatched meshes in the school and bazaar zones". Do not start it.

## TONIGHT, IN ORDER
1. **Chauraha = a real roundabout where FOUR ROADS meet.** Her words, 7 Nov 23:50: "a
   chauraha has clear four roads ... a roundabout is basically a connection between four
   roads ... when someone looks from top, it is very clear that the ... roundabout where
   Amrai Kheda with the flag is there, it is actually connection between four roads."
   Verified today: main_road (8 m) passes 3.6 m off the milestone and cross_road (7 m)
   passes 7.1 m off. They cross NEAR the square, not AT it, so it does not read as a
   crossroads from above.
   - **Bend both roads so all four arms (main N, main S, cross E, cross W) aim straight at
     the zero milestone** (602.9, 19.9) and meet it.
   - **Roundabout:** a ring carriageway about 7 m wide round a raised central island. The
     milestone and flag stand on the island. Island radius about 6 m, so the outer edge of
     the ring sits at the existing 12 to 13 m clear circle. The four arms join the ring.
   - Vehicles and NPC routes go round the ring, never across the island.
   - **Each arm, for its first 60 m out from the ring, gets frontage on BOTH sides** with
     something happening: open shops, a vendor, people on a charpai, a cycle repair, tea.
     Use src/chaurahaEdges.js, extend it along the four arms.
   - **Proof: a top-down screenshot of the chauraha, docs/shots/chauraha-top-<date>.png.
     It must read at a glance as a circle with four roads.** Then a saddle-height shot
     down each arm.
   Then: **Chauraha edges.** Textured house fronts and OPEN shops ringing the square, people
   sitting at the corners (charpai, tea, carrom). The 12 m circle stays clear.
2. **Old house textures on every remaining flat-coloured row.** No flat wall left.
3. **Mandi, gurudwara, panchayat** turned to face their roads (from the wrong-turn audit).
4. **Peacock on a roof. Monkeys on a water tank.**
5. **The main road, both sides, end to end:** something worth seeing every ~8 s of
   riding. Vendors, charpais with people, a tied buffalo, kids at a game, a parked
   tractor, a cow in the road. Vocabulary sections 4, 5, 3, 8.
6. **The two gullies off the chauraha**, the same treatment.
7. **09:30: ride-through capture**, 8 shots from the saddle, docs/shots/ride-2026-11-08-0930/.

Nothing half-built left switched on at 09:30.

---

# DEADLINE: SUNDAY 8 NOV MORNING. She is asleep. Finish, do not start big new things.

Tonight, in order:
1. Turn mandi, gurudwara and panchayat to face correctly (queued from the wrong-turn audit).
2. Old house textures on the remaining older rows. No flat-coloured wall left.
3. Peacock on a roof.
4. Fill the chauraha's edges: textured house fronts and shops ringing it, people at
   the corners. The circle itself stays clear.
5. Ride-through capture at 09:30 to docs/shots/ride-2026-11-08-0930/ (main road,
   chauraha, two gullies). That is what she sees first.
Anything after that: polish and bug fixes only. No half-finished features left in the
build at 09:30. If a feature cannot finish, leave it switched off, not half on.

---

# SHE PLAYS AT 16:30 IST TODAY. About 3 hours. Only what changes the VIEW lands first.

Order, nothing else until each is committed and visible from the saddle:
1. **Chauraha cleared** (12 m circle, halwai and well to a corner plot). 1 commit.
2. **Old house textures on every kit house**, varied. This is the single biggest visual
   change she will notice. Ship it in parts if you must: walls first, then roofs.
3. **Fill the three largest gaps** with kit house rows and gullies. Not all gaps. The
   three biggest, so the main ride feels dense.
4. **Petrol pump fronting the highway.**
5. **Ride-through capture at 16:00**: 8 shots from the saddle, main road and two gullies,
   to docs/shots/ride-2026-11-07-1600/. She sees these before she plays.

Peacock, the never-touch audit and the rest of the gaps come AFTER 16:30.

---

# 7 Nov 13:00. STOP. READ docs/SPATIAL_SENSE.md BEFORE THE NEXT PLACEMENT.

She found the halwai butted against the zero milestone at the chauraha, with a well next
to it. A crossroads that vehicles turn around had a shop standing in the turning circle.
Her words: "Is this not stupid? You need to use your brain when you're putting things."

**Do this first, before anything else in the queue:**
1. Clear the chauraha: 12 m radius around the milestone with NOTHING in it but the
   milestone and the flag. Move the halwai and the well to a corner plot, facing in.
2. Walk the whole village with docs/SPATIAL_SENSE.md section 5 in hand: find every pair
   of things that touch but do not belong together, and fix them. Report the list.
3. Then every placement from now on passes the section 6 test before it is committed.

Then back to the houses-and-density queue below.

---

# 7 Nov 12:30. SHE LOOKED. THE VIEW HAS NOT CHANGED ENOUGH. DAY 2 IS HOUSES AND DENSITY.

44 commits of correct small things, and from the saddle the streets are still flat boxes
and bare grass. The list is long, the view is not. From now until she checks again:

**ONLY these, in this order. Nothing else until they are visibly done.**
1. **Old house textures onto every kit house.** Walls, roofs, trim from bg_house_a..d and
   the abadi rows. Varied per house. No flat-coloured wall left anywhere.
2. **Fill the gaps.** Run the gap measurement (any ground inside the ring road more than
   35 m from anything built) and put clustered house rows with gullies in every gap, kit
   houses with their outside-every-house set (charpai, cycle, pots, gobar, washing).
3. **Petrol pump fronts the highway.** Still not done.
4. **Peacock** on a roof.

**Every 6 hours: a RIDE-THROUGH capture.** From the saddle at cycle height, along the
main road end to end, then two gullies, 8 shots. Save to docs/shots/ride-<date>/. She
judges the village the way a player sees it, so that is the proof, not a commit list.

---

# 7 Nov 12:00 CHECK. Three things slipped past the queue order. Do them NEXT, before anything else.

1. **PETROL PUMP still fronts a wheat-field track.** Priority 0 said it must front the
   highway with its forecourt open so a vehicle can pull in. Not in any commit. Do it now.
2. **The old house TEXTURES are not back on the kit.** Chajjas and door marks landed,
   good, but she liked the earlier houses for their textures and variety. bg_house_a..d
   and the abadi rows still exist: lift their wall, roof and trim textures and put them on
   the kit houses, varied per house. Flat-coloured kit walls are the thing she called
   "extremely bad".
3. **Peacock.** Section 3. On a roof or a wall. The most UP thing possible. Not built yet.

Then carry on down the vocabulary in the stated order.

---

# 48 HOURS, NON-STOP. Her order, 6 Nov night. NO STOPPING. NO WAITING. NO IDLE RUNS.

Her words: "You cannot stop at all. You will always be connected for the next 48 hours to
the Wi-Fi, and my system will be on. You are not allowed to stop. You are not allowed to
wait on me for permission. If I am not available, you need to start the next task."

She checks every 6 hours. Between checks you do not pause for anything. If an item is
blocked, note it in docs/NEEDS_YOU.md in ONE line and take the next. A run with no game
change is a failed run. Run `./tools/truth.sh` before any status.

Build from `docs/VILLAGE_VOCABULARY.md`, all 13 sections. Order of value:
Priority 0 (road-facing fixes) -> uncull -> section 1 and 2 (houses) -> section 8 (things
that happen to the cyclist, cow in the road FIRST) -> sections 4 and 5 (vendors and
people) -> section 3 (animals) -> section 10 (sound) -> section 11 -> section 12 ->
section 9 (interactions, cheapest first) -> section 13 -> section 7 (afternoon mood,
can be done any time it is cheap).

---

# 24 HOURS. SATURDAY AND SUNDAY ONLY. The game ships Tuesday.

Her words, 6 Nov: "You only have Saturday and Sunday to finish the game." Tripo character
models go in after that, published Tuesday. There is no third day. Decide, build, never
wait on her, never idle. Measured rate is about 2 commits/hour.

## PRIORITY 0. THINGS MUST STAND WHERE THEY MAKE SENSE. "Use your brain."
Her words: "why is a bus adda in middle of the gaon? Shouldn't bus adda be on the main
road? Use your brain and accordingly put things."

She is right, and the data says why: the bus adda is 12 m from the highway but its
NEAREST road is a village lane at 10 m, so it fronts the lane, not the highway.
A bus stop that does not face the road buses drive on is wrong.

**Fix these, and then audit every place the same way:**
- **Bus adda**: move onto the highway edge and FRONT THE HIGHWAY. A bay, a shelter facing
  the carriageway, people waiting looking at the road.
- **Petrol pump**: currently fronts a wheat-field track. It must front the highway, with
  its forecourt open to it so a vehicle can pull in.
- **Dharam kanta (weighbridge)**: trucks use it. Front the highway.
- **Mandi**: currently fronts a footpath. Front the road trucks arrive on.
- **Then audit all 64 places**: does this thing front the road its users actually arrive
  on? Report any that do not, and fix them. A temple fronts the village, a kiln fronts
  its drive, a school gate fronts the lane parents walk.

## THE VOCABULARY IS `docs/VILLAGE_VOCABULARY.md`. Build from it, section by section.
Her name for the game will change, ignore the title. She gave no map: use your own
judgement of how a UP village is laid out, and that file.

## PRIORITY 0b. EVERY NOOK MUST REWARD A CYCLIST.
Her words: "User will be basically riding bicycle and exploring the village. Everything
should look interesting to them... discovering something new or interesting at every nook
and corner."

**The test: ride every road and lane end to end. If any stretch longer than about 8
seconds has nothing worth looking at, put something there.** Not decoration: a scene.
Section D below is the vocabulary. Use it everywhere, not just at the square.

---

# FILL THE VILLAGE. Her 6 Nov brief. Work top to bottom, never wait on her.

Her three faults: no life, too empty, houses look like boxes.
Full notes: `docs/playtest/2026-11-03-her-notes.md` items 12 and 13.
Her mood board is NOT the art direction, it is cartoonish. Take the LIFE and DENSITY
from it, keep the game's existing look.

---

## A. UNCULL THE VILLAGE FIRST. Nothing else can be judged until this is done.
Half the "emptiness" is that the village is not being drawn.
- `src/stagingYard.js`: `SMALL_PLACE_VIS` hides 16 places beyond **130 m**. On a cycle
  across a 530 m village that is most of the village. Raise to **350 m**.
- `src/mergeUtils.js:158`: merged clusters hidden beyond 170 m. Raise to **350 m**.
- Claw the draw calls back by BATCHING, never by hiding. The place BatchedMesh work from
  4 Nov is the tool: extend it, do not re-cull.
- **New rule, add it to the validator: no place in `PLACES` may be invisible from the
  nearest road to it.** Fail the build if one is.
- Then take a screenshot from the square and from each road, and report what is visible.

## B. MEASURE WHAT IS ACTUALLY EMPTY.
Once A is done, find the real holes: any ground inside the ring road more than 35 m from
anything built. Output a list of gaps with centre and size. That list drives C and D.

## C. MORE HOUSES, AND HOUSES WITH PERSONALITY.
Her words: "houses which looks like boxes and lack complete personality... in our earlier
versions there were so many variety of houses."
1. **Find what the earlier houses had that the kit lacks.** `bg_house_a..d`,
   `abadi_row_a..c`, `kachcha_homestead`, `house_compound` are all still in the repo.
   Compare them with `house_kit_a..h` and write down the difference.
2. **Give the kit its personality back**, at least: varied heights including real double
   storey beside single, outside stairs to the roof, chajja over windows, parapets with
   openings, painted skirting bands, a name plate, an electric meter box, a washing line,
   plants in tins, a cycle leaning, rooftop water tank. Vary which house gets which.
3. **Mix pukka and kachcha next to each other.** A village street is never one type.
4. **Fill the four empty haveli plots** (her 6 Nov note) with kit houses, front to the
   gate gap.
5. **Then add houses into the gaps from B**, in clustered rows with a gully between, not
   scattered singly. Fronts face fronts (her item 10).

## D. PUT LIFE IN IT. This is what she is most missing, and it is the cheapest.
Build these as small SCENES, not single props. Everything below is either already built
or is a handful of triangles. Instance and batch them.
Already in the repo to reuse: charpai/cots, pots (12 variants), hand pumps (3), taps (3),
haystacks (3), gobar stacks, laundry line, lanterns, cycles, school props.
Needs building, all tiny:
- **Carrom board under a tree**, with 3 or 4 men around it. She named this twice.
- **Radio on a charpai under a tree**, one man listening.
- **Barber under a tree**: chair, mirror hung on the trunk, a strop, a customer.
- **Jalebi seller's stall pushed OUT in front of his own shop**, kadhai and tray.
- **TV watched outside**: set in a doorway, people on the ground in front.
- **Mosquito net over a charpai in an angan.**
- **Rangoli at doorways**: flat decals, almost free.
- **Children at a game**: hopscotch, marbles, rolling a tyre. The stapu court exists.
- **Kids at a hand pump**, one pumping, others waiting.
Place them where people actually gather: the square, the chaupal, under the peepal, at
the pond, at the well, outside shops, in the gullies.

## E. MORE SMALL SHOPS.
She named: bookstall, CD shop, mithai shop. Add them to the bazaar row and as single
shopfronts let into house frontages along the main street, the way a real village has a
shop in somebody's front room.

---

## RULES THAT APPLY TO ALL OF THE ABOVE
- **Never cull to save draw calls. Batch instead.** That is what caused this.
- Fronts face fronts and shared space; backs press together (her item 10).
- Every new thing is instanced and varied: turn, tint, scale. Two identical neighbours is
  a failure.
- Watch the asset budget (currently about 40 of 56 MB) and the 10 s load ceiling. Report
  if any item threatens either.
- She is unavailable. Decide, build, and write what you decided in docs/NEEDS_YOU.md.
