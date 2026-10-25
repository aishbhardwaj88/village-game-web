#!/bin/sh
# Builds the 8 house-kit types in ONE Blender run, then shrinks + strips each to public/assets/models/house_kit_<a..h>.glb
set -e
cd "$(dirname "$0")/../.."
~/Applications/Blender.app/Contents/MacOS/Blender -b --python tools/blender/build_houses_kit.py 2>&1 | grep -E "Error|Traceback|File \"|tri count" || true
for t in a b c d e f g h; do
  node tools/shrink.js tmp/house_kit_${t}_raw.glb public/assets/models/house_kit_${t}.glb 999999 2>&1 | grep -E "Wrote"
  node tools/strip-textures.mjs public/assets/models/house_kit_${t}.glb public/assets/models/house_kit_${t}.glb
done
