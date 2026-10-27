#!/bin/sh
# Usage: tools/blender/make_pots.sh   - builds the four pot models (matka, ghada, surahi, kulhad) into public/assets/models/pot_<type>_v2.glb
set -e
cd "$(dirname "$0")/../.."
~/Applications/Blender.app/Contents/MacOS/Blender -b --python tools/blender/build_pots.py 2>&1 | grep -E "Error|Traceback|File \"|tri count|Exported" || true
for t in matka ghada surahi kulhad; do
  node tools/shrink.js tmp/pot_${t}_v2_raw.glb public/assets/models/pot_${t}_v2.glb 999999 2>&1 | grep -E "after|Wrote"
  node tools/strip-textures.mjs public/assets/models/pot_${t}_v2.glb public/assets/models/pot_${t}_v2.glb
done
