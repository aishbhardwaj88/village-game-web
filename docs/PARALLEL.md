# THE QUEUE, set by Claude as tech lead, 2 Nov 18:45. She tests at the END, not between.

She has handed over sequencing. She is NOT answering verdicts, so stop asking. Decide,
build, and write what you decided in docs/NEEDS_YOU.md so she can overrule it later.
Work top to bottom. Run `./tools/truth.sh` before any status. Never wait on her.

---

## PHASE 1. Fix what is visibly broken. Nothing else matters until this is clean.

1. **The second culvert stands across the highway like two low walls, with no collision.**
   The map's 2.7 x 9.4 m strip falls on the highway. Either sink it under the road
   surface so it reads as a culvert, or drop it and note it. A wall across the main road
   is the worst defect in the game right now.
2. **The field channel crosses the highway strip.** Same problem. Make the road win:
   the channel passes under it, or stops at both kerbs.

## PHASE 2. Reclaim asset budget. 53.86 of 56 MB is not enough to finish the job.

3. **Haystacks: 10k triangles each, 32k for a site of three.** She flagged this herself.
   Cut to about 3k by replacing interior straw with alpha-cutout cards on the silhouette
   only. The shaggy outline is what reads; the inside is never seen.
4. **Audit the 15 largest files in public/assets.** Anything only ever seen from more
   than 30 m gets its texture halved. Report what you freed.
   **Target: 8 MB free before Phase 3 starts.**

## PHASE 3. Put the materials on the buildings. This is the whole point of the last week.

5. Right now NOT ONE building uses the reworked materials. They exist only as sample
   panels. Wire all eight onto the places that use them:
   - FROZEN, she approved: terracotta, painted wood, rusted steel, packed earth
   - REBUILT as geometry, she has not ruled: tin, thatch, mud and dung, jute
   **Tech lead call: wire all eight.** Claude's own read of the 28 Oct board was that
   the four rebuilt ones are fixed, and she agreed with his read of the previous board.
   Write one line in NEEDS_YOU saying all eight were wired on Claude's judgement and she
   can reject any of them on sight.
   Roofs first (tin, terracotta, thatch), then walls (mud and dung), then gates and
   shutters (rusted steel, painted wood), then ground (packed earth), then sacking (jute).

## PHASE 4. Look at the things nobody has looked at.

6. These were placed but never seen in a screenshot: cattle and tractor yard (gher),
   kirana goods yard, the four haveli house plots, the dung-cake drying yard, the 24
   compound walls, the 8 wayfinding signposts. Take one shot of each, look at it, and fix
   what is obviously wrong. Anything you cannot see, say so.

## PHASE 5. The three places the reviewer failed.

7. Dairy, chaupal and tubewell: flat ground, spotless surfaces, missing props. Use the
   budget freed in Phase 2. Ground variation and dirt first, props second.

## NOT IN SCOPE. Do not start these.
- Bazaar shop units, haveli courtyard, mango trees: she said build nothing new from the
  map. They stay on the NEEDS_YOU list.
- Night view: deferred to version 2.
- Any further map or layout work: the move is done and verified.
