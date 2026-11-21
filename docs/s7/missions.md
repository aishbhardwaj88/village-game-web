# S7 missions agent (21-22 Nov)

Plain words: under `?layout=new` every mission, side job, minigame and talking person now stands on the approved map.
Under `?layout=old` nothing changed (every new value goes through `spot(name, old)` in `src/missionsLayout.js`, which returns the old value untouched).

## Inventory (what uses a position)
- Story M1-M8: Maa, Dada, halwai, Pitaji, sack pile, kirana, general store, teacher, bell, sister, child's school run, postman round, darzi, monkey chase, baagh + mango knocks, roof stairs, vehicles (tractor, trolley, cart, cycle).
- Side jobs: Dadi, pump, ration, banta + chaat stalls, kulfi route, kanche, gilli, milk (doodhwala + 5 doorsteps), chakki, khet gate, patang (kid, rivals, landing spots), mango varieties, postman postcards, peepal posters, notebook markers.
- Talking interactions: everything in INTERACTION_POINTS (interactions.js, interactionsExtra/Village, discoveries, wall stories, road events, villageFurniture3).
The checker collects all of these from the game's own modules, so this list is always current: `node tools/missions-check.mjs --verbose`.

## Checker results (`node tools/missions-check.mjs`)
- Before (code at 187ea4a): 345 tests, 42 FAIL.
- After: 365 tests, 0 FAIL, 4 WARN (3 milk-round aunties on a gali doorstep, the temple bell kept as an ambient sound).

## What changed (all behind `?layout=new`)
- Side jobs, vehicles, Dadi, posters, chaat stall, kanche, kulfi, patang, khet gate were 600 m west of the village (since the 1 Nov shift): moved onto the village.
- Dada and the roof scene now turn with the house; child's school run and postman round use the new roads.
- M7 baagh = the map's empty 'Mango baagh' ground (the old spot is inside new houses).
- Doodhwala out of a kiosk; milk stops skip doors that open straight onto a lane; notice board -> the map's notice board.
- Discoveries whose old object now sits inside a new house/shop, and the wall stories (walls not built), are not registered.

## Smoke
- Headless `?layout=old`: boots, vehicles and jobs exactly at the old numbers, 0 new errors.
- Headless `?layout=new`: first run found the trolley blocked at its first spot; spawn moved (tractor 643.7, 31.0, facing south). Not re-run (one-browser-run limit).

## Wiring for the integrator
- main.js: one import + `spot(...)` calls, marked `// S7 WIRING (missions)` (Dada, house facings, child walk, postman walk).
- Also touched: vehicles.js (spawns), baagh.js, sideJobs.js, discoveryLog.js, wallStories.js, interactionsExtra.js, jobs/*.js.
- Re-run the new-layout boot once to confirm the trolley attaches at the new spawn.
