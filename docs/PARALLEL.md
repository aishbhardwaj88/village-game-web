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
