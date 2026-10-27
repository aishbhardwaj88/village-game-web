#!/bin/sh
# Usage: tools/blender/make_haystacks.sh   - builds the three haystack models into public/assets/models/haystack_<type>_v2.glb
set -e
cd "$(dirname "$0")/../.."
for t in cone heap half; do
  ~/Applications/Blender.app/Contents/MacOS/Blender -b --python tools/blender/build_haystack.py -- $t 2>&1 | grep -E "Error|Traceback|File \"|tri count|Exported" || true
  node tools/shrink.js tmp/haystack_${t}_v2_raw.glb public/assets/models/haystack_${t}_v2.glb 999999 2>&1 | grep -E "after|Wrote"
  node tools/strip-textures.mjs public/assets/models/haystack_${t}_v2.glb public/assets/models/haystack_${t}_v2.glb
done
