#!/bin/sh
# Rebuild the house compound model: Blender -> tint -> optimise -> public/assets/models/house_compound.glb
set -e
cd "$(dirname "$0")/../.."
~/Applications/Blender.app/Contents/MacOS/Blender -b --python tools/blender/build_house.py 2>&1 | grep -E "Error|Traceback|tri count|Exported" || true
node tools/tint-glb.js tmp/house_compound_raw.glb tmp/house_compound_tints.json tmp/house_compound_tinted.glb
node tools/shrink.js tmp/house_compound_tinted.glb public/assets/models/house_compound.glb 999999 | tail -2
