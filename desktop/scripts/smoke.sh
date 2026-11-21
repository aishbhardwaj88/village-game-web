#!/bin/sh
# Smoke test of the PACKAGED Linux build on a machine with no screen and no GPU (cloud box).
# Run 1 presses Play and records errors; run 2 starts the app again with the same save folder to prove saves persist.
# Usage: sh desktop/scripts/smoke.sh   (from the repo root). Reports land in desktop/smoke/.
set -e
HERE=$(cd "$(dirname "$0")/.." && pwd)
APP="$HERE/out/linux-unpacked/dopahar"
OUT="$HERE/smoke"; mkdir -p "$OUT"
UD="$OUT/userdata"
GL="--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader"
SB=""; [ "$(id -u)" = "0" ] && SB="--no-sandbox"
flock /tmp/s7-browser.lock timeout 300 xvfb-run -a -s "-screen 0 1920x1080x24" "$APP" $SB $GL --user-data-dir-override="$UD" --smoke-test="$OUT/run1.json" --smoke-play-ms=6000 || true
flock /tmp/s7-browser.lock timeout 120 xvfb-run -a -s "-screen 0 1920x1080x24" "$APP" $SB $GL --user-data-dir-override="$UD" --smoke-test="$OUT/run2.json" --smoke-no-play=1 || true
node "$HERE/scripts/smoke-summary.mjs" "$OUT/run1.json" "$OUT/run2.json"
