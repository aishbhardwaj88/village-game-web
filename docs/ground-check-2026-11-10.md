# Ground check, 2026-11-10

Tool: tools/ground-check.js (docs/PARALLEL.md G1). Run: complete. Rule: fail if lowest point > 2 cm below or > 3 cm above the surface under it.
Raw data: tmp/ground-check.json. Elevated static pieces (shelf, roof, on another prop, or deliberate pit) not counted: 2021. Figures with no surface within 1 m under them: 0. Exempt figures: 7.

## Standing still: 648 objects off the ground

| type | objects measured | samples | sunk > 2 cm | of which into the ground (rest: into a plinth / road / step) | floating > 3 cm |
|---|---:|---:|---:|---:|---:|
| prop | 1601 | 1602 | 182 | 107 | 444 |
| pot | 2 | 2 | 1 | 0 | 1 |
| cart | 13 | 13 | 0 | 0 | 1 |
| vehicle | 42 | 42 | 0 | 0 | 14 |
| animal | 49 | 49 | 0 | 0 | 1 |
| person | 299 | 299 | 1 | 0 | 3 |
| cycle | 0 | 0 | 0 | 0 | 0 |

### 20 worst, standing

| # | cm | verdict | type | name | x, z | on |
|---:|---:|---|---|---|---|---|
| 1 | -53.7 | SUNK | prop (place model part) | dudh_dairy_v2_wrap/dudh_dairy_v2/dudh_dairy_v2_model/hb_jute | 501.96, -39.06 | ground |
| 2 | -50.1 | SUNK | prop (place model part) | khalihan_v2/khalihan_v2_model/hb_main | 644.19, -82.15 | ground |
| 3 | -44.4 | SUNK | prop (place model part) | dudh_dairy_v2_wrap/dudh_dairy_v2/dudh_dairy_v2_model/hb_metal | 508.86, -40.17 | ground |
| 4 | -40.1 | SUNK | prop (place model part) | bhatta_v2/bhatta_v2_model/hb_main | 800.27, -146 | ground |
| 5 | -33.8 | SUNK | prop (lamp) | dudh_dairy_v2_wrap/dudh_dairy_v2/dudh_dairy_v2_lanterns_0 | 508.91, -40.25 | ground |
| 6 | 32.3 | FLOAT | person | ride_nook_78_dung/ride_nook_78_dung_people/ride_nook_78_dung_people_capsules#0 | 571.22, 47.4 | village_kit_houses/kit_houses_gB/kit_houses_gB_hb_main |
| 7 | -30.1 | SUNK | prop (place model part) | gurukul_v2/gurukul_v2_model/hb_metal | 633.41, 88.6 | ground |
| 8 | -30.1 | SUNK | prop (place model part) | gurukul_v2/gurukul_v2_model/hb_metal | 628.61, 89.55 | ground |
| 9 | -30.0 | SUNK | prop (other) | main_road_life/main_road_life_wood | 604.54, 88.27 | arm_frontage_houses/arm_houses_Sb1/arm_houses_Sb1_hb_brick |
| 10 | -29.7 | SUNK | prop (other) | ride_nook_80_rest/ride_nook_80_rest_built/ride_nook_80_rest_metal | 589.49, 46.08 | village_kit_houses/kit_houses_gB/kit_houses_gB_hb_main |
| 11 | -29.7 | SUNK | prop (other) | ride_nook_82_rest/ride_nook_82_rest_built/ride_nook_82_rest_metal | 574.17, 53.99 | village_kit_houses/kit_houses_gB/kit_houses_gB_hb_main |
| 12 | -29.7 | SUNK | prop (other) | ride_nook_85_rest/ride_nook_85_rest_built/ride_nook_85_rest_metal | 649.44, 4.1 | village_kit_houses/kit_houses_gC/kit_houses_gC_hb_main |
| 13 | -29.7 | SUNK | prop (other) | ride_nook_73_rest/ride_nook_73_rest_built/ride_nook_73_rest_metal | 562.17, -27.11 | village_kit_houses/kit_houses_gA/kit_houses_gA_hb_main |
| 14 | -29.7 | SUNK | prop (haystack) | ride_nook_64_hay/ride_nook_64_hay_built/ride_nook_64_hay_metal | 705, -40.36 | village_kit_houses/kit_houses_e/kit_houses_e_hb_main |
| 15 | -29.7 | SUNK | prop (other) | ride_nook_68_rest/ride_nook_68_rest_built/ride_nook_68_rest_metal | 550.94, -34.99 | village_kit_houses/kit_houses_gA/kit_houses_gA_hb_main |
| 16 | -29.4 | SUNK | prop (other) | main_road_life/main_road_life_tarpaulin | 583.2, 106.71 | arm_frontage_houses/arm_houses_Sa2/arm_houses_Sa2_hb_main |
| 17 | -29.4 | SUNK | prop (other) | main_road_life/main_road_life_tarpaulin | 582.9, 106.83 | arm_frontage_houses/arm_houses_Sa2/arm_houses_Sa2_hb_main |
| 18 | -29.4 | SUNK | prop (other) | main_road_life/main_road_life_tarpaulin | 582.99, 106.41 | arm_frontage_houses/arm_houses_Sa2/arm_houses_Sa2_hb_main |
| 19 | -29.3 | SUNK | prop (haystack) | ride_nook_75_dung/Group/ride_nook_75_dung_gobar_0 | 579, -27.57 | village_kit_houses/kit_houses_gA/kit_houses_gA_hb_cmain |
| 20 | -29.0 | SUNK | prop (other) | ride_nook_71_rest/ride_nook_71_rest_built/ride_nook_71_rest_wood | 575.99, -34.23 | village_kit_houses/kit_houses_gA/kit_houses_gA_hb_main |

## During the scripted ride (5400 cycle steps of 1/60 s, 15 live mover passes): 9 objects off the ground

| type | objects measured | samples | sunk > 2 cm | of which into the ground (rest: into a plinth / road / step) | floating > 3 cm |
|---|---:|---:|---:|---:|---:|
| prop | 0 | 0 | 0 | 0 | 0 |
| pot | 0 | 0 | 0 | 0 | 0 |
| cart | 1 | 15 | 0 | 0 | 0 |
| vehicle | 2 | 30 | 0 | 0 | 0 |
| animal | 49 | 735 | 1 | 0 | 1 |
| person | 299 | 4485 | 3 | 0 | 2 |
| cycle | 2 | 968 | 1 | 0 | 1 |

### 20 worst, riding

| # | cm | verdict | type | name | x, z | on |
|---:|---:|---|---|---|---|---|
| 1 | -36.7 | SUNK | animal | main_road_life/main_road_life_buffalo#0 | 601.23, -71.54 | arm_frontage_houses/arm_houses_Na2/arm_houses_Na2_hb_main |
| 2 | -34.7 | SUNK | person | ambient_life_gully_life_people#15 | 656.3, 27.19 | village_kit_houses/kit_houses_gC/kit_houses_gC_hb_main |
| 3 | -30.0 | SUNK | person | ambient_life_main_road_life_people#6 | 582.47, 107.36 | arm_frontage_houses/arm_houses_Sa2/arm_houses_Sa2_hb_main |
| 4 | -17.9 | SUNK | cycle (rear wheel) | player cycle rear wheel on 22_Farm loop t=38.7s | 578.34, -212.38 | village_static_merged/ground_24 |
| 5 | 13.9 | FLOAT | cycle (front wheel) | player cycle front wheel on 28_Field edge track t=76.3s | 454.2, 145.23 | ground |
| 6 | -13.0 | SUNK | person | bazaar_life#17 | 631.34, 24.01 | village_static_merged/wood_3 |
| 7 | 6.9 | FLOAT | person | ambient_life_arm_frontage_people#19 | 591.15, -92.9 | long_walk_3_pump/Group/long_walk_3_pump_props_1 |
| 8 | 5.9 | FLOAT | person | ambient_life_main_road_life_people#7 | 582.2, 106.02 | arm_frontage_houses/arm_houses_Sa2/arm_houses_Sa2_hb_main |
| 9 | 3.9 | FLOAT | animal | road_events/road_events_dogs#0 | 557.45, 33.36 | village_static_merged/wood_3 |

## Notes

- Surface = dug ground (src/dips.js) or the highest upward-facing triangle of any non-prop mesh at most 30 cm (props) / 40 cm (figures, vehicles, cycle) above the lowest point.
- The cycle is split into front and rear half of the rig along its heading, so each line is one wheel. The rider capsule is excluded.
- Static props are split into connected pieces, so a name can appear once per piece (one sunk pot in a merged pot mesh).
