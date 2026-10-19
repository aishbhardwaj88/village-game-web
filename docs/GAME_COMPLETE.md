# Game complete - definition of done

Dopahar is "done" when every box below is ticked. This is the one content/narrative
finish line the project didn't previously have (see `docs/STATUS_REPORT.md` §12). The
dashboard (`tools/dashboard/`) reads this file's checkbox counts live - keep the
checkbox syntax (`- [ ]` / `- [x]`) exact, one item per line, so it parses correctly.

## Core flow

- [ ] Title screen (New Game / Continue, per `src/save.js`)
- [ ] Settings reachable from title and pause: quality, master volume, controls help
- [ ] Pause menu works mid-game (Escape), resumes cleanly
- [ ] Loading screen shown while assets load, no black-frame flash
- [ ] HUD complete: objective panel, waypoint marker, money display, bilingual dialogue panel
- [ ] Ending scene (M8: rooftop birthday) plays and rolls credits
- [ ] Credits screen lists every CREDITS.md entry correctly

## Missions

- [x] M1 - Jalebi for Maa (verified still passes after the 8-mission quest-step rework)
- [x] M2 - Tiffin to school, bring sister home (verified)
- [x] M3 - Wheat sacks to kirana, earn money for Dada's gift (reframed dialogue to the birthday)
- [x] M4 - Find the postman on his cycle route, get the letter from Bua's family
- [x] M5 - Collect Dada's new kurta from the darzi (bazaar tailor shop)
- [x] M6 - Monkey steals the kurta; comedic lane chase, no harm to anyone (ground-level chase
      through the bazaar frontage/chowk, not literally rooftops - see docs/parked.md)
- [x] M7 - Drive tractor+trolley to the mango baagh, knock down mangoes, bring them home
- [x] M8 - Sunset rooftop family scene, Dada's birthday, closing lines, credits (dialogue-only
      staged scene at the stairs' own roof landing - see docs/parked.md for why)

Each mission needs: objective text (English primary / Hindi secondary), at least one
dialogue exchange with a named character, a waypoint, and a clean start-to-finish
playtest with no console errors.

## Characters

- [x] Every mission has its own named character(s) present and interactable
- [x] Each mission character has a distinct silhouette/colour (code-built placeholder
      or real asset-slot model - either is acceptable, per `docs/asset-slots.md`)
- [x] Postman (M4), darzi (M5), monkey (M6) exist as new NPCs/props with simple routines
      (darzi reuses the bazaar's existing ambient shopkeeper instance at the tailor
      unit - see docs/parked.md for why a dedicated new NPC wasn't added there)

## World/look

- [ ] Dayline runs afternoon → sunset smoothly across all 8 missions (not just 3)
- [ ] Zero gameplay at any of the four faith buildings (temple/mandir etc.)
- [ ] Art direction holds (grounded realism, mid-distance camera, Panchayat-ordinary,
      never poverty/decay) - spot-checked via `node tools/screenshot.js`

## Engineering gates (all must pass together)

- [ ] `npm run build` passes (vite build + world-validator + slot-swap-test)
- [ ] `node tools/regression-check.js` passes against a current baseline
- [ ] `npm run check-budget` passes
- [ ] Draw calls under 140 (aim ≤120), triangles under 400k, assets under 40MB
- [ ] Zero console errors across a full 8-mission playthrough
- [ ] Mobile touch controls verified (on-screen joystick, tap-to-interact, legible HUD)

## Final audit

- [ ] A fresh subagent with no prior context has played all 8 missions start to end via
      Playwright and audited the result against every box above, and every finding it
      raised has been fixed (repeat until clean)
