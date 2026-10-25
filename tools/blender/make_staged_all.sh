#!/bin/sh
# Rebuilds every staged place (Places V1 -> staging yard). Usage: tools/blender/make_staged_all.sh [name ...]  (no args = all)
cd "$(dirname "$0")/../.."
LIST="primary_school:primary_school gurukul:gurukul_v2 dudh_dairy:dudh_dairy_v2 bus_adda:bus_adda_v2 chaupal:chaupal_v2 volleyball:volleyball_v2 puncture:puncture_v2 tubewell:tubewell_v2 paani_tanki:paani_tanki_v2 ration_shop:ration_shop_v2 post_office:post_office_v2 atta_chakki:atta_chakki_v2 petrol_pump_v2:petrol_pump_v2 panchayat:panchayat_v2 tv_house:tv_house_v2 bhatta:bhatta_v2 khel_maidan:khel_maidan_v2 khalihan:khalihan_v2 dharam_kanta_v2:dharam_kanta_v2 akhada:akhada_v2"
for pair in $LIST; do
  src="${pair%%:*}"; slot="${pair##*:}"
  if [ $# -gt 0 ]; then case " $* " in *" $slot "*|*" $src "*) ;; *) continue ;; esac; fi
  echo "== $slot"; tools/blender/make.sh "$src" "$slot" 2>&1 | tail -1
done
