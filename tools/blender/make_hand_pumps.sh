#!/bin/sh
# Usage: tools/blender/make_hand_pumps.sh   - builds the three hand pump models into public/assets/models/pump_<type>_v2.glb
set -e
cd "$(dirname "$0")/../.."
for t in mark2 old cracked; do
  ~/Applications/Blender.app/Contents/MacOS/Blender -b --python tools/blender/build_hand_pump.py -- $t 2>&1 | grep -E "Error|Traceback|File \"|tri count|Exported" || true
  node tools/shrink.js tmp/pump_${t}_v2_raw.glb public/assets/models/pump_${t}_v2.glb 999999 2>&1 | grep -E "after|Wrote"
  node tools/strip-textures.mjs public/assets/models/pump_${t}_v2.glb public/assets/models/pump_${t}_v2.glb
done
