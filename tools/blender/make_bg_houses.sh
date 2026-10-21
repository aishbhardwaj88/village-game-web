#!/bin/sh
# Builds the 4 background-house variants -> public/assets/models/bg_house_{a,b,c,d}.glb
set -e
cd "$(dirname "$0")/../.."
~/Applications/Blender.app/Contents/MacOS/Blender -b --python tools/blender/build_bg_houses.py 2>&1 | grep -E "Error|Traceback|File \"|tri count" || true
for v in a b c d; do
  node tools/shrink.js tmp/bg_house_${v}_raw.glb public/assets/models/bg_house_${v}.glb 999999 2>&1 | grep -E "after|Wrote"
done
