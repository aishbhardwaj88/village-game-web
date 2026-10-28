#!/bin/sh
# Usage: tools/blender/make_gobar.sh [render]
#   builds the four gobar models into public/assets/models/: gobar_wall_v2, gobar_wall_v2_b, gobar_stack_v2, gobar_stack_v2_b
#   (textures stripped; the game re-applies the shared plaster and thatch sets). With 'render', also writes docs/shots/assets-gobar/.
set -e
cd "$(dirname "$0")/../.."
B=~/Applications/Blender.app/Contents/MacOS/Blender
for t in wall wall_b stack stack_b; do
  case $t in wall) o=gobar_wall_v2;; wall_b) o=gobar_wall_v2_b;; stack) o=gobar_stack_v2;; stack_b) o=gobar_stack_v2_b;; esac
  $B -b --python tools/blender/build_gobar.py -- $t 2>&1 | grep -E "Error|Traceback|File \"|tri count|Exported" || true
  node tools/shrink.js tmp/${o}_raw.glb public/assets/models/${o}.glb 999999 2>&1 | grep -E "after|Wrote"
  node tools/strip-textures.mjs public/assets/models/${o}.glb public/assets/models/${o}.glb
done
if [ "$1" = render ]; then
  $B -b --python tools/blender/build_gobar.py -- render 2>&1 | grep -E "Error|Traceback|File \"|rendered" || true
fi
