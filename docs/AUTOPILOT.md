# Autopilot run (Dopahar) - you are running unattended, nobody is watching

You are one run of a repeating loop. Do one solid batch of work (about 1 to 2 hours), publish it, then stop. The next run starts fresh, so leave the repo in a clean, committed, pushed state.

## Read first (quickly)
- docs/FEEDBACK.md: the user's and art director's latest feedback. Newest items first. This is your top priority.
- CLAUDE.md (ship-mode rules), docs/STORY.md, docs/MISSIONS_PLAN.md, docs/ART_REVIEW.md (notes, not gates), docs/handoff.md (top entry = where the last run stopped), last 15 commits.


## Tripo models from the user (check EVERY run, before anything else)
- The user makes models by hand in Tripo Studio and drops the .glb files into inbox/ (any file name, often the character's name, e.g. maa.glb, dada.glb, postman.glb, cow.glb, tractor.glb).
- For each new file: match it to its asset slot (docs/asset-slots.md; add a slot if none exists), run tools/shrink.js, apply the material clamp, place it in public/assets/models/<slot>.glb, make sure it stands on the ground, faces forward, is the right size, and that walking/animation still works (use the Tripo rig if present; vehicles keep turning wheels or get separate wheel parts).
- Then render it in the game next to its reference image into docs/shots/compare/tripo-<slot>.png, log it in docs/inbox-log.json as used, push, and add one plain line to docs/NEEDS_YOU.md: "<name> is in the game, have a look."
- If a model looks wrong (broken mesh, wrong proportions), keep the old stand-in, explain in NEEDS_YOU.md in one plain line what to regenerate.

## Rules (ship mode)
- Content: no real brands, logos or village names; no alcohol/tobacco; no tasks at the four faith buildings; nothing scary or sad; English first, Hindi beneath in UI.
- Never break the game: before each push, load it and play 1 minute (walk, drive, one mission step). Run the world validator and regression check once per run, at the end.
- Smooth on a mid-range laptop. No other budgets.
- Never use rm (move files to tmp/trash/). Never ask questions, never wait. Zero Tripo calls unless .env has a real TRIPO_API_KEY.
- Commit small, push to origin main after every visible improvement, and confirm the GitHub Actions deploy for that commit goes green.

## What to work on (pick the most visible next thing)
1. Anything in docs/FEEDBACK.md not yet marked DONE (mark it "DONE <date>: <commit>" when finished).
2. Look and feel: natural (less lime) greens, richer materials and colour variation, life in the lanes (people walking, kids playing, birds, cattle, chulha smoke), buildings matching Places V1 references.
3. Gameplay polish: missions and side jobs feel good, clear objectives, no dead ends.
4. Phone: touch controls and performance.

## Before you stop
- Add a 3-line entry at the TOP of docs/handoff.md: what changed on the live game, what is next.
- Update docs/status.json and docs/NEEDS_YOU.md (plain language, only real blockers).
- Everything committed and pushed.
