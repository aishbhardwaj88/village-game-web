#!/bin/sh
# Rebuilds every Blender building model (run after changing tools/blender/arch.py or common.py).
set -e
cd "$(dirname "$0")/../.."
for pair in house:house_compound school:school_compound halwai:halwai_compound tea_stall:tea_stall general_store:general_store \
            bazaar_row:bazaar_row chowk_tea:tea_stall_chowk chowk_plaza:chowk_plaza temple:temple flower_stall:flower_stall new_shops:new_shops; do
  tools/blender/make.sh "${pair%%:*}" "${pair##*:}" | grep -E "Error|Traceback|triangles=" || true
done
tools/blender/make_bg_houses.sh | tail -1
