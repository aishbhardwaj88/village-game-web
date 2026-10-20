# Finish line - Dopahar (locked by the art director, builder may only tick with screenshot proof)
## World
- [ ] The whole village from reference-from-unity/MAP.md exists and is walkable/drivable: school at the centre, abadi around it, canal (nahar) between village and family fields with a crossing, family khet + mango baagh north, sugarcane belt south, wheat stubble west, sabzi plots east, organic irregular village edge, every place in MAP.md's places list present (functional or scenery)
- [ ] Coordinates and distances follow MAP.md and WorldData/*.json (1 unit = 1 m)
- [ ] The world streams/loads by zone so phones stay smooth: draw calls under 150 in any normal player view, triangles under 400k, first playable view in under 10 s on 4G
- [ ] Village reads green and lived-in: trees (neem, peepal, mango, babool), crops, low vegetation, never "desert"
## Look (reference-from-unity/docs/art-direction.md 7.0 + 7.1b, docs/look-standard.md, Mood board/1.png)
- [ ] Every outdoor screenshot reads as a warm, hazy North Indian afternoon with real textures and real light, cared-for, never toy-like, never poverty/decay
- [ ] Every shop/place signboard is legible at 8 m in a 1280x800 screenshot
- [ ] No debug text, name labels, magenta test boxes or staging boxes visible in any normal player view (dev only behind ?dev=1)
## People
- [ ] Zero capsule/pill people anywhere in normal play
- [ ] Every person has a head, torso, arms, legs, clothes matching their role and colour palette (docs/art-rules-characters.md, Characters V1 references), plus idle and walk animation
- [ ] Mission cast present in person: Maa, Pitaji, sister, Dada, Dadi, halwai, teacher, postman, darzi, kirana owner, plus ambient villagers
- [ ] Animals in the village: cows/buffalo, street dogs, the M6 monkey as a recognisable monkey
- [ ] Final art: every character either approved code-built or swapped to an approved Tripo model through asset slots
## Vehicles
- [ ] Tractor, trolley, bicycle, bullock cart (with 2 bullocks) match Places V1/vehicles references and LAYOUT.md, read as real vehicles, not toys
- [ ] All vehicles and the trolley are solid to the player, NPCs and walls in every state (real-input tested, no teleports)
- [ ] Final art: approved Tripo vehicle models swapped in, wheels still turn
## Story and missions (docs/STORY.md)
- [ ] All 8 missions playable start to end with real input
- [ ] M6 monkey chase goes across rooftops and lanes as written
- [ ] M8 ending: the whole family including Dada and Dadi together on the roof at sunset, birthday moment, closing lines, then credits
## Shell
- [ ] Title, new game/continue, settings (quality, volume, controls) reachable from title and pause, loading screen, HUD, ending, credits
- [ ] Zero console errors in a full playthrough; world validator and regression check pass
## Final gate
- [ ] A fresh subagent with no prior context plays all 8 missions with real input, then judges 20 screenshots against this file and art-direction.md, and lists every failure. Zero failures.
