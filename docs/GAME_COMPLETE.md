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

- [ ] M1 - Jalebi for Maa (exists, verify still passes after dayline/story changes)
- [ ] M2 - Tiffin to school, bring sister home (exists, verify)
- [ ] M3 - Wheat sacks to kirana, earn money for Dada's gift (exists, reframe dialogue to birthday)
- [ ] M4 - Find the postman on his cycle route, get the letter from Bua's family
- [ ] M5 - Collect Dada's new kurta from the darzi (bazaar tailor shop)
- [ ] M6 - Monkey steals the kurta; comedic rooftop/lane chase, no harm to anyone
- [ ] M7 - Drive tractor+trolley to the mango baagh, knock down mangoes, bring them home
- [ ] M8 - Sunset rooftop family scene, Dada's birthday, mithai, closing lines, credits

Each mission needs: objective text (English primary / Hindi secondary), at least one
dialogue exchange with a named character, a waypoint, and a clean start-to-finish
playtest with no console errors.

## Characters

- [ ] Every mission has its own named character(s) present and interactable
- [ ] Each mission character has a distinct silhouette/colour (code-built placeholder
      or real asset-slot model - either is acceptable, per `docs/asset-slots.md`)
- [ ] Postman (M4), darzi (M5), monkey (M6) exist as new NPCs/props with simple routines

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
