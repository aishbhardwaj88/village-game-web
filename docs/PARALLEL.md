# THE QUEUE, her answers of 3 Nov. Work top to bottom. `./tools/truth.sh` before any status.

She answered the open list. Decisions below are FINAL. Never wait on her.

---

## 1. LOAD TIME UNDER 10 SECONDS. HARD REQUIREMENT. START HERE.

Her words: "Load time 15.2 seconds is too much. It should not cross 10. You have to
optimize it without compromising on the quality. Also remember, once the characters come
in, this load time will increase even more."

So 10 s is not the target, it is the ceiling, and characters still have to fit under it.
Aim for **8 s**, to leave the characters room.

Quality is NOT negotiable. Do these in order, measure after each, stop when under 8 s:
- **KTX2 / Basis compressed textures** on ground, walls and roofs. NEVER on signboards or
  anything with lettering. This is the big one: textures are most of the 12.5 MB.
  Install the compressor if it is missing (`toktx` or `@gltf-transform/cli`).
- **Load Play-critical models first, stream the rest.** The player cannot see the brick
  kiln at spawn. Anything beyond the first zone loads after Play unlocks.
- **One shared texture set, already started in `sharedTextures.js`.** Finish it: no model
  carries its own copy of a library texture.
- **Drop duplicate geometry** between LOD and full models where the LOD is never seen.
Report the measured seconds after each step, not an estimate.

## 2. USE THE HOUSE KIT THROUGHOUT THE VILLAGE.

Her words: "the house kit was built for a reason. You have to use it throughout the
village at appropriate places."
The 8 house types exist and are unused. Put them through the village wherever a house
belongs. Vary type, turn and tint per instance so no two neighbours read as copies.
Instance them, do not duplicate meshes. Keep the mission spots and doorstep props that
are tied to the existing rows working.

## 3. EVERY PLACE GETS A PATH TO IT.

Her words: "all places need to have path to them. If path doesn't exist in map, you are
supposed to add it yourself. Maybe it could be dirt track."
Four have none today: family field, gaushala, mango baagh, mandi (36 to 69 m of open
ground). Lay a dirt track to each. Then run the findability audit and lay a track to
anything else it reports as stranded. Dirt tracks are cheap, do not blow the load budget.

## 4. HOUSE ROWS VERSUS THE MAP FOOTPRINTS. Her call: whatever looks natural in play.

Her words: "whatever looks good, whatever looks natural while someone is playing."
The map's footprints are smaller than the existing rows. Do NOT force the rows to match
the drawing. Make the street read like a real village street from eye level: no row
straddling three footprints, no footprint left as a bald gap. Use the house kit (item 2)
to fill gaps. Judge it from a walking camera, not from above.

## 5. CANAL AND POND. Tech lead call: dig them for real, locally.

She left this to Claude. Decision: **(a), real ground heights, but ONLY in a local dip
around the pond, the johad and the canal.** Not a global terrain system.
Reason: sunken water is what makes water read as water, and a local dip is geometry, not
texture, so it costs almost nothing against the load budget that item 1 is fighting for.
Banks slope in, water sits below the bank line, edges are irregular, never a clean oval.

## 6. POND LOTUS: leave the pads bare. Her call, a lotus comes later.

---

## WAITING ON HER, do not block on any of these
- Tripo credits (no 3D characters until topped up)
- Primary school: which of the two models the village keeps
- Whether her map moves the culvert and field channel off the highway
- Her eye on: the 15 rebuilt buildings, dairy/chaupal/tubewell, the trees
