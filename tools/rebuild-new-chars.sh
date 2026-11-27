#!/bin/bash
# 27 Nov (eyes): strip-morphs.mjs runs last, no blink/smile keys ship (they dragged Tripo's lids half shut). # 27 Nov: rebuild the 10 Smart Mesh characters from Tripo's RAW files WITHOUT tools/eye_patch.py (owner rule 22 Nov: never paint,
# patch or project our own eyes onto a Tripo model). Per character: face_keys.py (blink + smile shape keys on Tripo's own eyelids / lips,
# no texture change) then finish-<name>.mjs (clip names, standing wave, cloth weights, 4K WebP, meshopt).
#   [ONLY="nai kirana"] bash tools/rebuild-new-chars.sh <raw-dir> [work-dir]      raw-dir holds <name>_v2/<name>_sm_raw.glb
set -e
RAW="${1:?raw dir}"; WORK="${2:-/tmp/rebuild-chars}"; HERE="$(cd "$(dirname "$0")/.." && pwd)"; mkdir -p "$WORK"; cd "$WORK"
# name prefix cam(x z size) eyes(x1,y1,x2,y2) mouth(x1,y1,x2,y2)
while read -r n p cx cz cs eyes mouth; do
  [ -z "$n" ] && continue
  [ -n "$ONLY" ] && [[ " $ONLY " != *" $n "* ]] && continue
  echo "$cx $cz $cs" > ${p}_cam.txt
  ( python3 "$HERE/tools/face_keys.py" "$RAW/${n}_v2/${n}_sm_raw.glb" $p $eyes $mouth > $n.fk.log 2>&1 && node "$HERE/tools/zero-morph-weights.mjs" ${p}_keys.glb ${p}_keys0.glb > $n.zero.log 2>&1 && node "$HERE/tools/finish-$n.mjs" ${p}_keys0.glb "$HERE/public/assets/models/$n.glb" > $n.finish.log 2>&1 && node "$HERE/tools/strip-morphs.mjs" "$HERE/public/assets/models/$n.glb" "$HERE/public/assets/models/$n.glb" > $n.strip.log 2>&1 && echo "$n ok" ) &
  while [ "$(jobs -r | wc -l)" -ge 3 ]; do sleep 2; done
done <<'LIST'
milkman mk 0.0 0.9 0.30 247,312,345,312 252,399,337,399
cyberboy cb 0.002 0.915 0.30 250,330,326,330 251,402,324,402
darzi dz 0.002 0.915 0.30 243,306,337,306 240,396,346,396
halwai hw 0.002 0.90 0.30 242,247,336,247 250,333,334,333
kirana kr 0.0 0.915 0.20 215,277,350,277 228,405,338,405
pehelwan ph 0.0 0.935 0.20 232,320,358,320 245,455,345,455
kulfiwala kw 0.0 0.93 0.20 240,325,356,325 258,462,345,462
sabziwala sw 0.0 0.93 0.20 225,339,352,336 243,477,352,477
nai nai 0.0 0.865 0.20 243,303,375,303 262,420,378,417
thief th 0.0 0.875 0.20 232,243,368,248 238,382,352,380
bystander by 0.0 0.91 0.30 257,275,340,275 252,360,333,353
chowkidar chk 0.0 0.90 0.30 250,292,355,292 237,390,347,390
LIST
wait
