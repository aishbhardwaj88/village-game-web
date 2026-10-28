#!/bin/sh
# Usage: tools/blender/make_pots.sh   - builds matka, ghada, surahi, kulhad, three variants each, into public/assets/models/:
#   pot_<type>_v2.glb (variant a, the slot src/pots.js loads), pot_<type>_v2_b.glb, pot_<type>_v2_c.glb
set -e
cd "$(dirname "$0")/../.."
~/Applications/Blender.app/Contents/MacOS/Blender -b --python tools/blender/build_pots.py 2>&1 | grep -E "Error|Traceback|File \"|tri count|Exported" || true
for t in matka ghada surahi kulhad; do
  for v in "" _b _c; do
    node tools/shrink.js tmp/pot_${t}_v2${v}_raw.glb public/assets/models/pot_${t}_v2${v}.glb 999999 2>&1 | grep -E "after|Wrote"
    node tools/strip-textures.mjs public/assets/models/pot_${t}_v2${v}.glb public/assets/models/pot_${t}_v2${v}.glb
  done
done
