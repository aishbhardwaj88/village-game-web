# Village map from the running game

How the zoomable map (claude.ai artifact "Amrai Kheda map") is made, so it can be rebuilt after layout changes.

1. Patch for a headless run: in src/main.js, `preCompile` and the `composer.render()` call skip when `window.__NORENDER` is set (software GL crashes on shader compile; nothing needs drawing). This patch was applied only in the cloud copy, not in the repo.
2. `npx vite build`, then `node dump2.mjs`: boots `?dev=1`, builds all ~330 zones with teardown disabled, then `extract.js` walks every non-skinned mesh (plain, instanced, batched) and writes each connected piece's real top-down outline, height range and material to world-dump2.json. Big flat pieces (roads, ground, water) keep their real triangles.
3. `python3 prep.py`: dedupes place_batches copies, merges leaf cards into canopies and crop plants into patches, unions road triangles, names unlabelled pieces by nearest place, writes map-data.json.
4. viewer.html + map-data.json are the published page.
