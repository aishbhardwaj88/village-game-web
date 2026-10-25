#!/bin/sh
# Usage: tools/blender/make.sh <script-suffix> <slot-name>   e.g.  tools/blender/make.sh school school_compound
# Blender (build_<suffix>.py -> tmp/<slot>_raw.glb) -> shrink (no simplify) -> public/assets/models/<slot>.glb
# Staged places (slot ends in _v2, or primary_school) then lose their embedded texture copies (tools/strip-textures.mjs): the game re-applies the shared sets.
set -e
cd "$(dirname "$0")/../.."
~/Applications/Blender.app/Contents/MacOS/Blender -b --python tools/blender/build_$1.py 2>&1 | grep -E "Error|Traceback|File \"|tri count|Exported" || true
node tools/shrink.js tmp/$2_raw.glb public/assets/models/$2.glb 999999 2>&1 | grep -E "after|Wrote"
case "$2" in
  *_v2|primary_school) node tools/strip-textures.mjs public/assets/models/$2.glb public/assets/models/$2.glb ;;
esac
