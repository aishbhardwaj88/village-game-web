# HARD DEADLINE: COMPLETE BEFORE SHE WAKES, 2 Nov MORNING IST.

She is not playing tonight. She checks in the morning and it must be DONE.
Done means: every turn above 2 degrees applied, everything re-pointed, findability audit
clean, regression 22/22, no new console errors, pushed.

Do not stop. Do not wait on her. Do not report a half-finished village.
If one item will not go, leave THAT ONE, note it in docs/NEEDS_YOU.md, finish the rest.

---

# 1 Nov, 21:15. THE TURNS ARE TOO SLOW. TWO CHANGES, APPLY BOTH.

34 turns remain and you are doing roughly ONE per run. That is 12 to 18 hours. Not
acceptable. She is waiting.

## 1. SKIP every turn of 2 degrees or less. Do not apply them at all.
A 1 degree turn is invisible to a player and costs a whole run.
Skip: bus stop, tyre repair shop, truck weighbridge, petrol pump, wholesale grain
market, brick kiln, temple (1.5), overhead water tank (treat <=2 deg as zero
everywhere, these are just the ones in the file today).
Write ONE line in docs/NEEDS_YOU.md saying sub-2-degree turns were skipped as invisible.

## 2. BATCH the rest. Stop doing one turn per run.
`turnSiteGroup` plus an anchor `ry` already works and is proven on bazaar, temple,
school, anganwadi, banta, tea stall, store, gilli, hero house and mela.
Applying it to ten more anchors is ONE code change, not ten runs.

**Do them in these three batches, one batch per run, build and test after each batch:**

- **Batch A, the big turns that actually change the village (10):**
  anganwadi 168.8, south houses 168.8, volleyball court 96, tea stall at the square 95,
  sweet shop (halwai) 95, jalebi stall 95, vegetable carts 95, soda drink stall 95,
  east houses 94.6, west houses 83.

- **Batch B, the 11 and 7 degree group (8):**
  post office 11.2, primary school 11.2, gurukul 11.2, west street corner 11,
  haveli 7.3, north houses 7.3, khalihan 7.3, milk dairy 7.

- **Batch C, everything else above 2 degrees.**

If one place in a batch will not turn cleanly, leave THAT ONE, note it in
docs/NEEDS_YOU.md, and ship the rest of the batch. Never drop a whole batch for one item.

After batch C: re-point markers, NPC routes, door routing, minimap, lane graph, anchors,
then run the findability audit and the regression check.

---

# THE QUEUE. Work it top to bottom. Never skip ahead.

Read `docs/CLAIMED.md` first so you do not build what the cloud machine is building.
Never wait on her. If something needs her eye, ONE line in `docs/NEEDS_YOU.md`, then carry
on. A run that makes no game change is a failed run. No stop rule anywhere outranks this
file.

## Materials
- APPROVED AND FROZEN, never touch: terracotta, painted wood, rusted steel, packed earth.
- WITH HER, awaiting verdict: tin, thatch, mud and dung, jute. Do not rework them.

---

## 1. Place the school props into the school yard
Built and committed by the cloud machine: `public/assets/models/school_props.glb`
(2 slides, swings, see-saw, stapu court, 3 dustbins, water pots). Put them in the
primary school yard per `Places V1/primary_school/LAYOUT.md`: playground front-left,
stapu court on the assembly ground, dustbins by the verandah, pots on their stand.
Instance them, do not duplicate meshes.

## 2. Bus adda cleanup
Her 27 Oct note. Remove the stray tyre, the loose bricks, the khatiya on the chabutra,
and the pyaau pots. She said a hand pump there would be fine instead.

## 3. Primary school, her 27 Oct notes
- Cycles in a mix of adult and child sizes, and more of them.
- Every classroom door closed except the front one.

## 4. Check 5 flagged places against their own LAYOUT.md
ONLY these: primary school, gaushala, bus adda, petrol pump, bazaar row.
Her call, 31 Oct: the other 17 are insurance, not value. Do not touch them.
Report mismatches. Fix what is internal to the place. Move nothing.

---

# 5. THE MAP MOVE. **DO NOT START THIS UNTIL 1 TO 4 ARE DONE.**

Her instruction, 1 Nov. The map freeze is OVER. The 1 Nov plan is FINAL.

**Source of truth, replaces every earlier layout file:**
- `docs/layout/village-plan-2026-11-01.png` (the map)
- `docs/layout/village-plan-positions-2026-11-01.json` (exact positions, metres,
  +x east, +z south)

**This is POSITIONS ONLY. Move what exists. Build nothing new.**

1. For every entry in `places` whose `in_code_today` names something already built, move
   it to `centre` and turn it to `turn_deg`. Take the exact footprint from its `shapes`,
   `house_footprints` or `units_in_order`. Bazaar units follow `bazaar_units_west_to_east`.
2. Move the already-built roads and lanes to match `roads` and `lanes_and_tracks`, so
   each place's front touches its lane exactly as the map shows.
3. **Move only what is already built.** Anything marked "NEW, not built yet" STAYS
   UNBUILT: list it in `docs/NEEDS_YOU.md` under "From the final map, not built yet".
   Same for any lane, farm track or wall that does not exist in the game yet.
4. Keep every place's size, art and behaviour exactly as it is. Do not change vehicle
   speeds, missions, NPCs or anything else.
5. Keep relative positions exact. You may shift the whole layout as one piece so it sits
   in the world.
6. **If anything would overlap or cannot move cleanly, do not guess.** Write it in
   `docs/NEEDS_YOU.md` and carry on with the rest.
7. Re-point everything that uses old coordinates: side-job markers (`src/jobs/data.js`,
   `gate.js`, gilli), NPC routes, door routing, minimap, lane graph, anchors.

**Done when:** in a real playthrough every built place stands where the map shows it and
faces its lane, nothing overlaps, the on-foot findability walk reaches every place, and
there are no new console errors. Then update the docs and commit.

## HER CALL, 1 Nov, before sleeping: THE MOVE SHIPS. DO NOT ROLL BACK.

She said plainly she wants "the village on the new map" when she wakes. So:
- **Never revert the move.** If something breaks, FIX it. Reverting is not an option.
- If ONE place cannot be moved cleanly, leave that ONE place where it is, write it in
  `docs/NEEDS_YOU.md`, and move everything else. Never abandon the whole move for one
  stubborn item.
- Keep going until the playthrough is clean. Do not stop and report a broken village.
- `git tag pre-map-move` marks the pre-move state. It exists only as insurance for HER
  to use if she asks. You do not use it.
