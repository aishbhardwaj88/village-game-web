# Missions plan - Dopahar (locked by the art director, 20 Oct 2026)

Builder rules: same as docs/FINISH_LINE.md. Build from this file, never reword or cut an item. If something is impossible, ask in docs/NEEDS_YOU.md and continue other work. This file ADDS a "Side jobs and free roam" section to FINISH_LINE.md (copy the checklist at the bottom into FINISH_LINE.md verbatim).

## Where this comes from (past decisions, do not contradict)
- 29 Aug 2026 design log (user + Claude chat): "open village first, thin daily anchors, grandfather as emotional centre". Story sells the game, sandbox keeps it alive.
- After the story ends, the village stays open ("Endless Summer" idea): no clock, the player chooses what to do.
- Discovery is diegetic: postman brings news, posters on the peepal, kites in the sky, sound as radar (kulfi bell, splashing, dhol), a kid's-notebook map that fills in. Side jobs are discovered this way, not with a quest list.
- Signature verbs: driving (tractor+trolley, bullock cart, cycle), mango knocking and catching, kites.
- Source list: reference-from-unity/village_game_content_backlog.xlsx (V1 rows), reference-from-unity/CONTEXT.md, reference-from-unity/MAP.md.
- Hard rules: no death, no fire, no danger, no alcohol/tobacco, no real names/brands, ZERO tasks at the four faith buildings, no stealing (child audience), era pre-2015, English primary + Hindi beneath in UI.

## 1. Main story (docs/STORY.md, 8 missions) - keep, strengthen with these beats
- M2: school-out scene, kids pour out of the gate; if the player is on a vehicle, kids react and the player must stop for them.
- M3: before selling, weigh the loaded trolley at the dharam kanta (weighbridge) - a satisfying ritual with a printed slip; then reverse the trolley through a narrow gate at the kirana yard (skill flex, generous tolerance, never fails the mission).
- M4: the postman can be flagged down by ringing the bicycle bell near him (cycle is the natural vehicle for this mission).
- M6: monkey chase across rooftops and lanes, slapstick; kids join in cheering.
- M7: mango knocking = aim a stick/stone throw, mangoes fall, catch before they hit the ground (catch bonus), then trolley them home.
- M8: rooftop at sunset with neighbouring terraces each running a small scene (kites, a radio, kids playing, a family eating), the whole family incl. Dada and Dadi, birthday moment, Dada's short closing lines about the village, credits.

## 2. After credits: free roam unlocks ("Dopahar continues")
- After credits the player wakes back in the village, same afternoon light, no main objective. Title screen offers "Continue roaming" once the story is finished.
- A notebook map (in the pause menu) shows discovered places and side jobs, drawn like a kid's school notebook.
- Pocket money (existing money UI) is earned by side jobs and spent at the banta shop, kulfiwala, chaat thela. Never punishing, never a grind.

## 3. Side jobs (build in this order; each 3 to 8 minutes; each has its own NPC, dialogue, a small reward, replayable)
1. Patang loot (kite chase): a cut kite drifts across the sky; race 3 kids to where it lands (fields or rooftops). Reward: the kite joins your collection.
2. Milk round: help the doodhwala deliver milk to 5 houses by cycle before his round ends. Reward: pocket money.
3. Kulfiwala: hear his bell somewhere in the village (sound radar, gets louder as you near), find him, choose a flavour. Reward: a treat + a line of gossip that reveals another side job.
4. Trolley gate challenge: reverse the tractor+trolley through the narrow khet gate; timed, best time saved. Reward: Pitaji's praise + money.
5. Atta chakki run: take a wheat sack to the chakki on the bullock cart (the bullocks have their own mind, gentle wander), wait your turn, bring the flour home to Dadi.
6. Gilli-danda at the khel maidan: timing power meter, distance score, beat 3 rival kids in turn.
7. Hand pump for Dadi: fill 3 buckets at the hand pump with a rhythm pump, carry them home without spilling.
8. Mango variety collection: 6 mango varieties in the baagh and around the village, each tree marked in the notebook once tasted.
9. Ration run with Maa: walk with Maa to the ration shop, carry the sack home.
10. Kanche (marbles) and stapu (hopscotch) with village kids near the chowk: quick mini-games, win marbles; your pouch shows your count.

## 4. Discovery system (how side jobs appear, no quest list)
- Postman postcard: after the story, each time the player passes the postman he hands over a postcard naming one new side job ("The doodhwala is short of hands today").
- Peepal poster board at the chowk: posters for gilli-danda and kite matches.
- Sound radar: kulfi bell, kids shouting at the khel maidan, chakki motor thump.
- Notebook map marks a side job only after it is discovered.

## 5. School donation board
- A painted board on the school wall: "Every rupee goes to village schools" (English + Hindi beneath) and an amount read from a small JSON file (public/data/donations.json, starts at 0). Scenery only, never a store.

## Checklist to add to FINISH_LINE.md (verbatim)
## Side jobs and free roam
- [ ] Main story beats from docs/MISSIONS_PLAN.md section 1 (school-out, dharam kanta, narrow gate, bell flag-down, mango catch, rooftop neighbours) all present and playable with real input
- [ ] After credits, free roam unlocks; title screen offers "Continue roaming"
- [ ] Notebook map in the pause menu shows discovered places and side jobs
- [ ] All 10 side jobs in docs/MISSIONS_PLAN.md section 3 playable start to end with real input, each with its own NPC, dialogue and reward
- [ ] Side jobs are discovered diegetically (postcards, peepal posters, sound), never shown as a quest list
- [ ] Pocket money earned from side jobs can be spent at the banta shop, kulfiwala and chaat thela
- [ ] School donation board present, amount read from public/data/donations.json
- [ ] Zero tasks at any of the four faith buildings; no stealing; nothing dangerous
