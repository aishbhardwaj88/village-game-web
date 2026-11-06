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
