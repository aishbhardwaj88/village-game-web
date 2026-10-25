# Findability walk, 25 Oct 2026 (FEEDBACK item 7)

Method: headless game, player placed on the nearest lane point to each of the 39 non-house places (tmp/find-walk.mjs), camera facing the place from a standing distance, shot with the subject-in-frame check; 13 hard cases re-done with real W-key walking toward the place (tmp/find-walk2.mjs). Teleported start, NOT a continuous walk from the house, so walk times are the static estimates in tools/findability-audit.mjs. Shots: docs/shots/findwalk-2026-10-25/, docs/shots/findwalk-keys-2026-10-25/ (headless, layout evidence only).

Result: 36 of 39 places visible from a lane with the subject check passing. Three failed the automatic check, all checked by eye:
- post office and atta chakki (post.png, chakki.png): the lane-side camera lands against the small building walls; the shared painted signpost board (Post Office / Ration Shop / Atta Chakki) and red post box are in frame beside them, so the cluster is findable by its sign, not by the buildings' own boards.
- gurukul (gurukul.png): the long side wall with its bilingual board is in frame; the check fails only because the wall fills the view.
- haveli passed visually (haveli.png) from the lane.

Not findable without the map: none (static audit 0 of 40; this walk agrees).
Not done: a continuous on-foot walk from the house to each place with a stopwatch; a real-phone test.
