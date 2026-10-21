#!/bin/sh
# Builds the 3 abadi row models -> public/assets/models/abadi_row_{a,b,c}.glb + src/abadiBoxes.json
set -e
cd "$(dirname "$0")/../.."
~/Applications/Blender.app/Contents/MacOS/Blender -b --python tools/blender/build_abadi.py 2>&1 | grep -E "Error|Traceback|File \"|tri count|boxes written" || true
for v in a b c; do
  node tools/shrink.js tmp/abadi_row_${v}_raw.glb public/assets/models/abadi_row_${v}.glb 999999 2>&1 | grep -E "after|Wrote"
  node tools/shrink.js tmp/abadi_row_${v}_lod_raw.glb public/assets/models/abadi_row_${v}_lod.glb 999999 2>&1 | grep -E "after|Wrote"
done
