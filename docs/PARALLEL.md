# TONIGHT, 3 Nov. Her playthrough notes are the whole queue. `docs/playtest/2026-11-03-her-notes.md`

She is asleep. Never wait on her. A run with no game change is a failed run.
Run `./tools/truth.sh` before any status. Measured rate is ~2 commits/hour, so about 16
commits fit before morning. The list below is ordered so the most valuable land first.

---

## 1. KILL THE DUPLICATES. Bug, and it confused her. (her item 5)
Two petrol pumps and two dharam kantas exist in the world.
- Stop `createHighwayCluster` (src/farmSites.js) drawing its own pump and weighbridge.
- Delete the two exact slot registrations in src/main.js (~lines 983, 988).
- Keep only the map-placed v2 versions.
- Add a build check: for any `X_v2.glb` that also has `X.glb`, FAIL the build if the old
  one is still referenced in src/. This class of bug must not recur.

## 2. THE CYCLE BECOMES THE DEFAULT. (her item 6)
Her own answer to the village feeling too big, and far cheaper than moving 76 places.
- Player spawns ON the cycle. One clear control to dismount and remount, named on screen
  the first time.
- About 3x walking speed. Must go everywhere the player can walk, no catching on kerbs.
- Dismount cleanly for doors, narrow back lanes and anything needing precision.
- All jobs, missions and NPC interactions still work.
- **Then measure and report the new time to cross the village.** That number decides
  whether the map still needs shrinking at all.

## 3. ORIENTATION: MAKE IT READ AS A COMMUNITY. (her items 7 and 10, her headline note)
The map move copied `turn_deg` mechanically and never asked what each building FACES.
Fix by TURNING only, never moving, so it survives any later map shrink.
- Fronts face fronts across a street. Verandah looks at verandah.
- Every building faces shared space: street, square, chaupal, pond, well. Never a
  neighbour's back, never a blank field.
- Public buildings open onto the square: panchayat, temple, chaupal, school gate, shops.
- Backs press against backs, or hide behind a compound wall.
- **Named case: panchayat and the dark ghar (TV house) face each other's backs. Turn them.**
- Work STREET BY STREET, not building by building. Judge from a walking camera at each
  end and the middle of each street. Start with the square and the main street.
- One shot per street as proof.

## 4. REBUILD THE ROADS AS ROADS. (her items 1 and 3)
- **No road or lane ends in open ground.** Each joins another road or ends at something
  that explains it: field gate, well, shrine, compound gate.
- **Round every edge.** Worn and irregular, never a straight cut. Vary the edge along it.
- **One continuous surface per road.** No notches, no gaps, no overlapping rectangles.
  Real merged junctions where roads meet.
- **Transition band at the edge:** scuffed earth and thinning grass, not a hard line.
- Kerbs follow the road edge round curves, or leave them out.
- Judge from the player camera at standing height, never from above.

## 5. RAISE THE SHOP SHUTTERS. (her item 2)
Shops read as half shut. Raise the tin awning FIRST, then roll the shutters further up,
so the whole shop front from counter to shelf top is visible at standing eye level.
Every shuttered shop in the village, not just the bazaar row.

## 6. ZERO MILESTONE AT THE SQUARE. (her item 8)
Whitewashed plinth-and-pillar marker carrying the village name, with the Indian flag
(reuse the existing flagpole, do not build a second kind).
- Hindi अमराई खेड़ा bold and larger on top, English "Amrai Kheda" below, not bold,
  never under 55 percent of the Hindi cap height. The CLAUDE.md signboard rule.
- Lime washed and weathered: chipped at the base, rain stained. Never clean.
- Place it where the square is most open and visible from the lanes feeding in.

## 7. IF TIME REMAINS: measure the village for her. (her items 4 and 9)
Walking and cycling time between neighbouring places, the worst gaps, and built footprint
against total area. Put it in docs/NEEDS_YOU.md. Do NOT move anything for this.

---

## DO NOT START TONIGHT
- Shrinking the map. It waits for her decision after she tries the cycle.
- Anything new from the map: bazaar units, haveli courtyard, mango trees.
- Load time work. It is a real ceiling but nothing above makes it worse; keep an eye on
  the asset budget and report if any item pushes it.

---

# AFTER THE LIST ABOVE: KEEP GOING. She is away for 24 hours from 3 Nov midnight.

She cannot be reached and cannot approve anything. The queue must NEVER run dry: an idle
loop wastes her 24 hours. When items 1 to 7 are done, work straight down this list.

## 8. LOAD TIME UNDER 10 SECONDS. Her hard ceiling. Aim for 8.
Characters still have to fit under it later, so leave room.
- KTX2 / Basis compressed textures on ground, walls and roofs. NEVER on signboards or
  anything carrying lettering. Install the compressor if missing.
- Load only what is visible at spawn; stream the rest after Play unlocks.
- Finish `sharedTextures.js`: no model carries its own copy of a library texture.
- Report MEASURED seconds after each step, never an estimate.

## 9. THE HOUSE KIT GOES VILLAGE-WIDE.
Her words: "the house kit was built for a reason. You have to use it throughout the
village at appropriate places." All 8 types, varied turn and tint so no two neighbours
read as copies. Instance them. Keep existing mission spots and doorstep props working.
Use it to fill the bald gaps between house rows and the map's footprints.

## 10. EVERY PLACE GETS A PATH.
Her words: "all places need to have path to them. If path doesn't exist in map, you are
supposed to add it yourself. Maybe it could be dirt track."
Family field, gaushala, mango baagh and mandi have none. Then run the findability audit
and lay a track to anything else it reports stranded. Follow the road rules in item 4:
no track ends in open ground.

## 11. DIG THE POND, JOHAD AND CANAL FOR REAL.
Tech lead call she approved: a LOCAL dip around each water body, not a global terrain
system. Banks slope in, water sits below the bank line, edges irregular and never a clean
oval. Geometry not texture, so it barely touches the load budget.

## 12. FILL THE LONG WALKS.
Every walk over 20 seconds gets something on it: a well, a shrine, a cart, a buffalo,
haystacks, a boundary gate. All these props already exist. This is what turns distance
into atmosphere instead of boredom.

## 13. THEN: pick the highest-value unticked item in docs/BACKLOG.md and keep going.
Never idle. Never wait for her. Never end a run with no game change.

---

# WIFI WILL DROP for about 6 to 7 hours on 4 Nov morning.
`wait_for_net` already handles it: the loop waits, then resumes by itself. Commits keep
happening locally while offline; the auto-pusher sends them the moment the net returns.
**Do not stop, do not create tmp/STOP, do not report an outage as a blocker.**
