- 25 Nov hourly loop: trolley floor slab clipped through both wheels (TR.track puts wheels inboard of the bed;
  old full-width floor slab passed through each wheel disc). Fixed with a wheel-well notch (centre strip + 4
  outer pieces, outer width == TR.wheelW so the bed's outer edge/spec is unchanged); collision untouched.
  src/vehicles.js only. Verified: build:unchecked + licence-audit/check-dup-models/check-material-clone/
  place-visibility-check all clean. Real Tier 2 check (trolley-drive-test.js) crashed with this container's
  known "Target crashed" signature after Play+2M sample points; verified by code reading instead (A7).
- 26 Nov HONEST GATE (70 m) + SHOW CAP 265 m + shader warm-up in-gate. Pre-Play ~10.7 MB (ring-model weight
  inside the gate: see Next-5 item 2). 25 Nov PRE-PLAY JS: dynamic imports + KTX2 chunk split, gz 853->815 KB.
- 25 Nov HIGHWAY START (her order): new game spawns on the highway village-side lane (608.0,-121.5) yaw 2.793, mounted, facing the Welcome gate; saved games/?at= unchanged. Road chunk under spawn is in the Play gate; ice-cream carts, scooters, jeep load after Play. Gate 29/15 s (cpu4/net5) vs 60/22 before. Tier 2 browser checks not run (container limit).
- 25 Nov WALL VARIETY (materials only): shops draw plaster as plaster/_j/_m/_p by shop id (BatchKit remap, +-6% tint jitter); house seeds re-rolled so pakka neighbours differ in plaster surface (181 -> 4 clashes of 421). No new texture requests before Play.
- 25 Nov PRE-PLAY BYTES: plant models (flower_gazania 396 KB, shrub_01 246 KB) have no copy within 70 m of the spawn, so
  they now load after Play (realPlants.js setPlantGate, wired in main.js). Measured before Play 13.44 -> 12.81 MB. gurukul/bazaar/school were already after Play.
- 26 Nov HONEST GATE, start area only: GATE_RADIUS 160 -> 70 m. GATE3/GATE4 defer normal/roughness/ao maps
  until after Play. Before Play ~10.7 MB. Left: ring models swept into forceBuild inside the 70m gate radius
  regardless of their own smaller buildRadius (zoneManager.js setGate()). Already meshopt+WebP+quantized, no
  easy further shrink; shrinking the gate risks visible pop-in - real regression risk, not attempted blind.
- 26 Nov SHOW CAP 265 m, shader warm-up inside the gate, wall murals sliced. 25 Nov WALL REPEAT+VARIETY and
- CLAUDE.md 5b sweep clean village-wide, Item 5 done. licence-audit: 490 files, 0 UNKNOWN, 2 pre-existing OWNER warnings.

- 25 Nov PRE-PLAY JS: storyBeats+sideJobs now dynamic imports (start at gate end), zstddec/ktx-parse moved from vendor to the KTX2 chunk, KTX2 starts after gateEnd. JS before Play gz 853 -> 815 KB, raw ~3.03 -> 2.92 MB. data chunk (mapData 656 KB raw/115 gz) stays: layout needs it to build the world.

