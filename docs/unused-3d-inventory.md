# Unused 3D object inventory (25 Nov 2026)

Scope: downloaded GLBs not loaded by any live code. Vehicles excluded.

- **Why unused:** `src/freeProps.js` review rows are switched off (`FREE_PROPS_ON_ROAD_REMOVED = true`, rows lay across main_road). Nothing else loads `public/assets/props_free/` or `public/assets/props_ph/`. CREDITS.md says props_ph is "Not wired into game code".
- **Already used (not listed):** all 23 in `public/assets/props/`, all 3 in `plants3d/`, vehicles_free, and the `models/` kit (self-built, loaded by pattern; not audited file by file).
- **Skipped duplicates (props_ph copy of a used props/ file, 12):** metal_jug, old_tyre, painted_wooden_bench, painted_wooden_chair_01, painted_wooden_stool, planter_pot_clay, plastic_monobloc_chair_01, potted_plant_01, potted_plant_02, potted_plant_04, round_wooden_table_01, wicker_basket_01. props_ph copies are smaller; consider swapping for load time.
- **Excluded as vehicle:** covered_car.
- **Size column:** props_ph = real bounds from `docs/props_ph_manifest.json` (a few look off, e.g. tool_chest 2x2 m: scale by eye); props_free = target size set in freeProps.js. Villager = 1.7 m.
- **Triangles:** not cheap to read (meshopt compressed); skipped. All are already slimmed.
- **Ready:** under 300 KB = ready to place now. Over 300 KB = run `node tools/shrink.js <in> <out.glb> [triBudget]` first.
- **Rules:** no shrines, no brands, no alcohol/tobacco, era pre-2015 (plastic items fine; skip bench_vice/megaphone only if no scene fits).

## Bazaar row

| file | folder | KB | licence | what | real size | best place | status |
|---|---|---|---|---|---|---|---|
| food_ginger_01.glb | props_ph | 80 | CC0 | food ginger 01 | 0.57 h x 0.24 x 0.15 m | Bazaar row / Flower stall | ready |
| food_lime_01.glb | props_ph | 13 | CC0 | food lime 01 | 0.07 h x 0.06 x 0.06 m | Bazaar row / Flower stall | ready |
| food_lychee_01.glb | props_ph | 20 | CC0 | food lychee 01 | 0.05 h x 0.04 x 0.04 m | Bazaar row / Flower stall | ready |
| food_pears_asian_01.glb | props_ph | 20 | CC0 | food pears asian 01 | 0.11 h x 0.15 x 0.18 m | Bazaar row / Flower stall | ready |

## Chaupal

| file | folder | KB | licence | what | real size | best place | status |
|---|---|---|---|---|---|---|---|
| charpai_a.glb | props_free | 88 | CC BY 4.0 (credit, CREDITS.md) | rope cot (charpai) | 1.9 m long, 0.9 wide | Chaupal / house courtyards | ready |
| charpai_b.glb | props_free | 44 | CC BY 4.0 (credit, CREDITS.md) | charpai low-poly | 1.9 m long | Chaupal / house courtyards | ready |

## Chowk

| file | folder | KB | licence | what | real size | best place | status |
|---|---|---|---|---|---|---|---|
| barrel_01.glb | props_ph | 121 | CC0 | barrel 01 | 0.88 h x 0.56 x 0.56 m | Chowk / main lanes (not on roads) | ready |
| barrel_02.glb | props_ph | 66 | CC0 | barrel 02 | 0.88 h x 0.49 x 0.48 m | Chowk / main lanes (not on roads) | ready |
| barrel_03.glb | props_ph | 88 | CC0 | barrel 03 | 0.93 h x 0.63 x 0.64 m | Chowk / main lanes (not on roads) | ready |
| concrete_road_barrier.glb | props_ph | 92 | CC0 | concrete road barrier | 0.83 h x 1.54 x 0.64 m | Chowk / main lanes (not on roads) | ready |
| concrete_road_barrier_02.glb | props_ph | 90 | CC0 | concrete road barrier 02 | 1.11 h x 1.56 x 0.44 m | Chowk / main lanes (not on roads) | ready |
| folding_wooden_stool.glb | props_ph | 47 | CC0 | folding wooden stool | 0.44 h x 0.53 x 0.55 m | Chowk / main lanes (not on roads) | ready |
| football.glb | props_ph | 43 | CC0 | football | 0.22 h x 0.51 x 0.22 m | Chowk / main lanes (not on roads) | ready |
| hand_truck.glb | props_ph | 145 | CC0 | hand truck | 1.40 h x 0.58 x 0.69 m | Chowk / main lanes (not on roads) | ready |
| industrial_wall_lamp.glb | props_ph | 73 | CC0 | industrial wall lamp | 0.43 h x 0.27 x 0.14 m | Chowk / main lanes (not on roads) | ready |
| lantern_01.glb | props_ph | 47 | CC0 | lantern 01 | 0.23 h x 0.12 x 0.10 m | Chowk / main lanes (not on roads) | ready |
| large_iron_gate.glb | props_ph | 140 | CC0 | large iron gate | 2.93 h x 2.95 x 0.10 m | Chowk / main lanes (not on roads) | ready |
| metal_jerrycan.glb | props_ph | 35 | CC0 | metal jerrycan | 0.45 h x 0.35 x 0.17 m | Chowk / main lanes (not on roads) | ready |
| metal_trash_can.glb | props_ph | 260 | CC0 | metal trash can | 0.91 h x 1.78 x 0.55 m | Chowk / main lanes (not on roads) | ready |
| modular_chainlink_fence.glb | props_ph | 334 | CC0 | modular chainlink fence | 2.50 h x 8.11 x 2.15 m | Chowk / main lanes (not on roads) | needs slimming |
| periwinkle_plant.glb | props_ph | 63 | CC0 | periwinkle plant | 0.35 h x 1.24 x 0.32 m | Chowk / main lanes (not on roads) | ready |
| planter_box_01.glb | props_ph | 52 | CC0 | planter box 01 | 0.42 h x 0.91 x 0.41 m | Chowk / main lanes (not on roads) | ready |
| plastic_jerrycan.glb | props_ph | 39 | CC0 | plastic jerrycan | 0.32 h x 0.27 x 0.34 m | Chowk / main lanes (not on roads) | ready |
| power_box_01.glb | props_ph | 83 | CC0 | power box 01 | 0.50 h x 0.34 x 0.11 m | Chowk / main lanes (not on roads) | ready |
| rusted_spade_01.glb | props_ph | 91 | CC0 | rusted spade 01 | 1.10 h x 0.17 x 0.05 m | Chowk / main lanes (not on roads) | ready |
| rusted_wheel_rim_01.glb | props_ph | 51 | CC0 | rusted wheel rim 01 | 0.44 h x 0.43 x 0.15 m | Chowk / main lanes (not on roads) | ready |
| stone_fire_pit.glb | props_ph | 72 | CC0 | stone fire pit | 0.38 h x 1.45 x 1.43 m | Chowk / main lanes (not on roads) | ready |
| tire_pump.glb | props_ph | 69 | CC0 | tire pump | 0.58 h x 0.26 x 0.10 m | Chowk / main lanes (not on roads) | ready |
| utility_box_01.glb | props_ph | 80 | CC0 | utility box 01 | 1.12 h x 0.52 x 0.43 m | Chowk / main lanes (not on roads) | ready |
| utility_box_02.glb | props_ph | 94 | CC0 | utility box 02 | 1.12 h x 0.92 x 0.43 m | Chowk / main lanes (not on roads) | ready |
| water_manhole_cover.glb | props_ph | 106 | CC0 | water manhole cover | 0.07 h x 0.69 x 0.69 m | Chowk / main lanes (not on roads) | ready |
| watering_can_metal_01.glb | props_ph | 41 | CC0 | watering can metal 01 | 0.19 h x 0.19 x 0.45 m | Chowk / main lanes (not on roads) | ready |
| well_a.glb | props_free | 171 | CC BY 4.0 (credit, CREDITS.md) | village well | 1.1 m h parapet | Chowk / Chaupal | ready |
| wooden_broom.glb | props_ph | 94 | CC0 | wooden broom | 1.44 h x 0.49 x 0.11 m | Chowk / main lanes (not on roads) | ready |
| wooden_ladder.glb | props_ph | 109 | CC0 | wooden ladder | 1.33 h x 0.96 x 0.50 m | Chowk / main lanes (not on roads) | ready |

## Dudh dairy

| file | folder | KB | licence | what | real size | best place | status |
|---|---|---|---|---|---|---|---|
| milk_can.glb | props_free | 90 | CC BY 4.0 (credit, CREDITS.md) | milk can | 0.55 m h | Dudh dairy | ready |

## Farm plots

| file | folder | KB | licence | what | real size | best place | status |
|---|---|---|---|---|---|---|---|
| anthurium_botany_01.glb | props_ph/nature | 100 | CC0 | anthurium botany 01 | 0.50 h x 2.79 x 1.80 m | Farm plots / Khalihan | ready |
| calathea_orbifolia_01.glb | props_ph/nature | 97 | CC0 | calathea orbifolia 01 | 0.42 h x 2.49 x 1.19 m | Farm plots / Khalihan | ready |
| celandine_01.glb | props_ph/nature | 242 | CC0 | celandine 01 | 0.91 h x 3.48 x 0.89 m | Farm plots / Khalihan | ready |
| dandelion_01.glb | props_ph/nature | 136 | CC0 | dandelion 01 | 0.17 h x 4.21 x 0.26 m | Farm plots / Khalihan | ready |
| dry_branches_medium_01.glb | props_ph/nature | 205 | CC0 | dry branches medium 01 | 0.34 h x 1.06 x 1.30 m | Farm plots / Khalihan | ready |
| garden_gloves_01.glb | props_ph | 35 | CC0 | garden gloves 01 | 0.07 h x 0.22 x 0.30 m | Farm plots / Khalihan | ready |
| garden_sprinkler_01.glb | props_ph | 82 | CC0 | garden sprinkler 01 | 0.20 h x 0.35 x 0.25 m | Farm plots / Khalihan | ready |
| nettle_plant.glb | props_ph/nature | 176 | CC0 | nettle plant | 0.22 h x 1.08 x 0.10 m | Farm plots / Khalihan | ready |
| seeding_tray_01.glb | props_ph | 59 | CC0 | seeding tray 01 | 0.06 h x 0.22 x 0.22 m | Farm plots / Khalihan | ready |
| shrub_02.glb | props_ph/nature | 127 | CC0 | shrub 02 | 1.38 h x 4.92 x 1.86 m | Farm plots / Khalihan | ready |
| shrub_03.glb | props_ph/nature | 117 | CC0 | shrub 03 | 0.40 h x 1.37 x 0.15 m | Farm plots / Khalihan | ready |
| shrub_04.glb | props_ph/nature | 115 | CC0 | shrub 04 | 0.28 h x 0.75 x 0.19 m | Farm plots / Khalihan | ready |
| shrub_sorrel_01.glb | props_ph/nature | 73 | CC0 | shrub sorrel 01 | 0.06 h x 0.35 x 0.15 m | Farm plots / Khalihan | ready |
| sickle.glb | props_free | 18 | CC BY 4.0 (credit, CREDITS.md) | sickle | 0.4 m long | Farm plots / Khalihan | ready |
| stone_01.glb | props_ph/nature | 104 | CC0 | stone 01 | 0.07 h x 0.15 x 0.09 m | Farm plots / Khalihan | ready |
| tree_stump_02.glb | props_ph/nature | 128 | CC0 | tree stump 02 | 0.52 h x 1.52 x 1.39 m | Farm plots / Khalihan | ready |
| well_c.glb | props_free | 110 | CC BY 4.0 (credit, CREDITS.md) | old well | 1.1 m h | Farm plots / outskirts | ready |

## General store

| file | folder | KB | licence | what | real size | best place | status |
|---|---|---|---|---|---|---|---|
| alarm_clock_01.glb | props_ph | 49 | CC0 | alarm clock 01 | 0.17 h x 0.13 x 0.07 m | General store / Ration shop | ready |
| bananas.glb | props_ph | 36 | CC0 | bananas | 0.18 h x 0.60 x 0.24 m | General store / Ration shop | ready |
| barbershopchair_01.glb | props_ph | 151 | CC0 | barbershopchair 01 | 1.49 h x 0.76 x 1.33 m | General store / Ration shop | ready |
| boombox.glb | props_ph | 108 | CC0 | boombox | 0.41 h x 0.72 x 0.19 m | General store / Ration shop | ready |
| cardboard_box_01.glb | props_ph | 48 | CC0 | cardboard box 01 | 0.34 h x 0.39 x 0.52 m | General store / Ration shop | ready |
| cashregister_01.glb | props_ph | 176 | CC0 | cashregister 01 | 0.62 h x 0.59 x 0.62 m | General store / Ration shop | ready |
| cassette_player.glb | props_ph | 50 | CC0 | cassette player | 0.24 h x 0.13 x 0.05 m | General store / Ration shop | ready |
| food_apple_01.glb | props_ph | 15 | CC0 | food apple 01 | 0.09 h x 0.10 x 0.10 m | General store / Ration shop | ready |
| food_pomegranate_01.glb | props_ph | 16 | CC0 | food pomegranate 01 | 0.12 h x 0.11 x 0.12 m | General store / Ration shop | ready |
| lemon.glb | props_ph | 12 | CC0 | lemon | 0.10 h x 0.07 x 0.07 m | General store / Ration shop | ready |
| lightbulb_01.glb | props_ph | 23 | CC0 | lightbulb 01 | 0.10 h x 0.06 x 0.06 m | General store / Ration shop | ready |
| metal_stool_02.glb | props_ph | 49 | CC0 | metal stool 02 | 0.46 h x 0.45 x 0.47 m | General store / Ration shop | ready |
| ornate_mirror_01.glb | props_ph | 67 | CC0 | ornate mirror 01 | 0.74 h x 0.49 x 0.03 m | General store / Ration shop | ready |
| painted_wooden_shelves.glb | props_ph | 68 | CC0 | painted wooden shelves | 1.12 h x 0.51 x 0.37 m | General store / Ration shop | ready |
| plastic_container.glb | props_ph | 72 | CC0 | plastic container | 0.43 h x 0.90 x 0.63 m | General store / Ration shop | ready |
| plastic_crate_01.glb | props_ph | 154 | CC0 | plastic crate 01 | 0.26 h x 0.30 x 0.41 m | General store / Ration shop | ready |
| plastic_crate_02.glb | props_ph | 55 | CC0 | plastic crate 02 | 0.25 h x 0.51 x 0.41 m | General store / Ration shop | ready |
| plastic_crate_03.glb | props_ph | 160 | CC0 | plastic crate 03 | 0.27 h x 0.48 x 0.27 m | General store / Ration shop | ready |
| pocket_watch.glb | props_ph | 22 | CC0 | pocket watch | 0.08 h x 0.06 x 0.02 m | General store / Ration shop | ready |
| rollershutter_door.glb | props_ph | 43 | CC0 | rollershutter door | 2.40 h x 1.08 x 0.30 m | General store / Ration shop | ready |
| rollershutter_window_01.glb | props_ph | 42 | CC0 | rollershutter window 01 | 1.85 h x 2.10 x 0.30 m | General store / Ration shop | ready |
| rollershutter_window_02.glb | props_ph | 37 | CC0 | rollershutter window 02 | 1.56 h x 1.60 x 0.17 m | General store / Ration shop | ready |
| rollershutter_window_03.glb | props_ph | 42 | CC0 | rollershutter window 03 | 1.55 h x 0.98 x 0.15 m | General store / Ration shop | ready |
| shelf_01.glb | props_ph | 82 | CC0 | shelf 01 | 2.08 h x 1.00 x 0.26 m | General store / Ration shop | ready |
| steel_frame_shelves_01.glb | props_ph | 80 | CC0 | steel frame shelves 01 | 2.14 h x 1.10 x 0.50 m | General store / Ration shop | ready |
| steel_frame_shelves_02.glb | props_ph | 79 | CC0 | steel frame shelves 02 | 2.14 h x 0.59 x 0.50 m | General store / Ration shop | ready |
| sweet_potato.glb | props_ph | 9 | CC0 | sweet potato | 0.10 h x 0.06 x 0.06 m | General store / Ration shop | ready |
| television_02.glb | props_ph | 30 | CC0 | television 02 | 0.41 h x 0.40 x 0.35 m | General store / Ration shop | ready |
| woodentable_01.glb | props_ph | 84 | CC0 | woodentable 01 | 0.55 h x 1.80 x 0.66 m | General store / Ration shop | ready |
| woodentable_02.glb | props_ph | 40 | CC0 | woodentable 02 | 0.42 h x 0.30 x 0.30 m | General store / Ration shop | ready |
| woodentable_03.glb | props_ph | 98 | CC0 | woodentable 03 | 0.83 h x 1.33 x 0.56 m | General store / Ration shop | ready |
| worn_metal_rack.glb | props_ph | 97 | CC0 | worn metal rack | 1.90 h x 0.92 x 0.60 m | General store / Ration shop | ready |
| yellow_onion.glb | props_ph | 15 | CC0 | yellow onion | 0.09 h x 0.07 x 0.07 m | General store / Ration shop | ready |

## Gher yard

| file | folder | KB | licence | what | real size | best place | status |
|---|---|---|---|---|---|---|---|
| garden_hose_wall_mounted_01.glb | props_ph | 105 | CC0 | garden hose wall mounted 01 | 0.55 h x 0.46 x 0.25 m | Gher yard / Farm plots | ready |
| gate.glb | props_free | 55 | CC BY 4.0 (credit, CREDITS.md) | wooden field gate | 1.6 m wide, 1.2 h | Gher yard / farm plots | ready |
| hatchet.glb | props_ph | 42 | CC0 | hatchet | 0.29 h x 0.03 x 0.10 m | Gher yard / Farm plots | ready |
| hay_bale.glb | props_free | 171 | CC BY 4.0 (credit, CREDITS.md) | hay bale | 0.5 m h, 0.8 long | Gher yard / Khalihan | ready |
| pitchfork_a.glb | props_free | 35 | CC BY 4.0 (credit, CREDITS.md) | steel pitchfork | 1.6 m h | Gher yard / Khalihan | ready |
| pitchfork_b.glb | props_free | 37 | CC BY 4.0 (credit, CREDITS.md) | wooden hay fork | 1.5 m h | Gher yard / Khalihan | ready |
| planter_box_02.glb | props_ph | 148 | CC0 | planter box 02 | 0.45 h x 1.25 x 0.47 m | Gher yard / Farm plots | ready |
| wheelbarrow.glb | props_free | 66 | CC BY 4.0 (credit, CREDITS.md) | wheelbarrow | 1.4 m long | Gher yard / Goods yard | ready |

## House courtyards

| file | folder | KB | licence | what | real size | best place | status |
|---|---|---|---|---|---|---|---|
| brass_pan_01.glb | props_ph | 65 | CC0 | brass pan 01 | 0.05 h x 0.19 x 0.45 m | House courtyards / interiors | ready |
| bucket.glb | props_free | 33 | CC BY 4.0 (credit, CREDITS.md) | wooden bucket | 0.30 m h | House courtyards / Gaushala | ready |
| bucket_b.glb | props_free | 33 | CC BY 4.0 (credit, CREDITS.md) | wooden bucket 2 | 0.26 m h | House courtyards / Gaushala | ready |
| ceramic_pot.glb | props_ph | 42 | CC0 | ceramic pot | 0.37 h x 0.66 x 0.50 m | House courtyards / interiors | ready |
| gallinera_chair.glb | props_ph | 104 | CC0 | gallinera chair | 1.03 h x 0.58 x 0.60 m | House courtyards / interiors | ready |
| gallinera_table.glb | props_ph | 95 | CC0 | gallinera table | 0.49 h x 0.83 x 0.52 m | House courtyards / interiors | ready |
| greenchair_01.glb | props_ph | 103 | CC0 | greenchair 01 | 1.06 h x 0.67 x 0.66 m | House courtyards / interiors | ready |
| grind_stone.glb | props_free | 119 | CC BY 4.0 (credit, CREDITS.md) | hand grindstone (chakki) | 1.0 m dia | House courtyards / Atta chakki | ready |
| matka.glb | props_free | 18 | CC BY 4.0 (credit, CREDITS.md) | clay water pot | 0.45 m h | House courtyards / Tea stall | ready |
| painted_wooden_table.glb | props_ph | 47 | CC0 | painted wooden table | 0.96 h x 2.41 x 1.14 m | House courtyards / interiors | ready |
| planter_box_03.glb | props_ph | 161 | CC0 | planter box 03 | 0.85 h x 0.91 x 0.66 m | House courtyards / interiors | ready |
| round_spectacles.glb | props_ph | 49 | CC0 | round spectacles | 0.05 h x 0.16 x 0.15 m | House courtyards / interiors | ready |

## House interiors

| file | folder | KB | licence | what | real size | best place | status |
|---|---|---|---|---|---|---|---|
| kerosene_lamp.glb | props_free | 52 | CC BY 4.0 (credit, CREDITS.md) | kerosene lamp | 0.36 m h | House interiors / Tea stall | ready |
| sewing_machine.glb | props_free | 94 | CC BY 4.0 (credit, CREDITS.md) | treadle sewing machine | 0.42 m long | House interiors / Parlour | ready |
| trunk.glb | props_free | 21 | CC BY 4.0 (credit, CREDITS.md) | tin trunk | 0.75 m long | House interiors | ready |

## House kitchens

| file | folder | KB | licence | what | real size | best place | status |
|---|---|---|---|---|---|---|---|
| pressure_cooker.glb | props_free | 39 | CC BY 4.0 (credit, CREDITS.md) | pressure cooker | 0.26 m h | House kitchens / Halwai | ready |

## Planter beds

| file | folder | KB | licence | what | real size | best place | status |
|---|---|---|---|---|---|---|---|
| watering_can.glb | props_free | 25 | CC BY 4.0 (credit, CREDITS.md) | watering can | 0.35 m h | Planter beds / Flower stall | ready |

## Post office

| file | folder | KB | licence | what | real size | best place | status |
|---|---|---|---|---|---|---|---|
| vintage_telephone_wall_clock.glb | props_ph | 77 | CC0 | vintage telephone wall clock | 0.50 h x 0.34 x 0.19 m | Post office | ready |

## Primary school

| file | folder | KB | licence | what | real size | best place | status |
|---|---|---|---|---|---|---|---|
| binder_notebook.glb | props_ph | 52 | CC0 | binder notebook | 0.03 h x 0.58 x 0.20 m | Primary school | ready |
| ceiling_fan.glb | props_ph | 93 | CC0 | ceiling fan | 0.52 h x 1.46 x 1.46 m | Primary school | ready |
| dustpan.glb | props_ph | 40 | CC0 | dustpan | 0.10 h x 0.33 x 0.37 m | Primary school | ready |
| megaphone_01.glb | props_ph | 70 | CC0 | megaphone 01 | 0.30 h x 0.37 x 0.23 m | Primary school | ready |
| mounted_fluorescent_lights.glb | props_ph | 72 | CC0 | mounted fluorescent lights | 0.04 h x 0.91 x 0.65 m | Primary school | ready |
| schoolchair_01.glb | props_ph | 75 | CC0 | schoolchair 01 | 1.01 h x 0.57 x 0.68 m | Primary school | ready |
| schooldesk_01.glb | props_ph | 54 | CC0 | schooldesk 01 | 0.88 h x 0.71 x 0.55 m | Primary school | ready |
| standing_chalkboard_01.glb | props_ph | 86 | CC0 | standing chalkboard 01 | 1.51 h x 0.92 x 0.76 m | Primary school | ready |
| stationery_supplies.glb | props_ph | 37 | CC0 | stationery supplies | 0.16 h x 0.30 x 0.08 m | Primary school | ready |
| wall_clock.glb | props_ph | 57 | CC0 | wall clock | 0.32 h x 0.32 x 0.05 m | Primary school | ready |
| water_tank.glb | props_free | 196 | CC BY 4.0 (credit, CREDITS.md) | overhead water tank | 4.0 m h (big, 200 KB ok) | Primary school / Panchayat roof | ready |

## Puncture shop

| file | folder | KB | licence | what | real size | best place | status |
|---|---|---|---|---|---|---|---|
| adjustable_wrench.glb | props_ph | 46 | CC0 | adjustable wrench | 0.25 h x 0.07 x 0.03 m | Puncture shop / Petrol pump | ready |
| barrel_stove.glb | props_ph | 110 | CC0 | barrel stove | 0.86 h x 0.59 x 0.59 m | Puncture shop / Petrol pump | ready |
| bench_vice_01.glb | props_ph | 38 | CC0 | bench vice 01 | 2.00 h x 1.81 x 2.00 m | Puncture shop / Petrol pump | ready |
| gate_latch_01.glb | props_ph | 38 | CC0 | gate latch 01 | 0.09 h x 0.20 x 0.07 m | Puncture shop / Petrol pump | ready |
| industrial_pipe_lamp.glb | props_ph | 51 | CC0 | industrial pipe lamp | 0.36 h x 0.18 x 0.26 m | Puncture shop / Petrol pump | ready |
| industrial_storage_cart.glb | props_ph | 182 | CC0 | industrial storage cart | 1.38 h x 1.60 x 1.10 m | Puncture shop / Petrol pump | ready |
| metal_stool_03.glb | props_ph | 105 | CC0 | metal stool 03 | 1.02 h x 0.46 x 0.47 m | Puncture shop / Petrol pump | ready |
| metal_tool_chest.glb | props_ph | 125 | CC0 | metal tool chest | 1.02 h x 2.00 x 2.00 m | Puncture shop / Petrol pump | ready |
| metal_toolbox.glb | props_ph | 47 | CC0 | metal toolbox | 0.30 h x 0.40 x 0.27 m | Puncture shop / Petrol pump | ready |
| pastic_torch_6v.glb | props_ph | 56 | CC0 | pastic torch 6v | 0.14 h x 0.14 x 0.22 m | Puncture shop / Petrol pump | ready |
| portable_searchlight.glb | props_ph | 64 | CC0 | portable searchlight | 0.18 h x 0.17 x 0.25 m | Puncture shop / Petrol pump | ready |
| rusted_wheel_rim_02.glb | props_ph | 50 | CC0 | rusted wheel rim 02 | 0.34 h x 0.34 x 0.12 m | Puncture shop / Petrol pump | ready |
| small_plastic_torch.glb | props_ph | 46 | CC0 | small plastic torch | 0.05 h x 0.10 x 0.23 m | Puncture shop / Petrol pump | ready |

## Tea stall

| file | folder | KB | licence | what | real size | best place | status |
|---|---|---|---|---|---|---|---|
| kettle.glb | props_free | 54 | CC BY 4.0 (credit, CREDITS.md) | kettle | 0.26 m h | Tea stall / Halwai | ready |
| outdoor_table_chair_set_01.glb | props_ph | 186 | CC0 | outdoor table chair set 01 | 0.86 h x 0.78 x 1.83 m | Tea stall / Chowk | ready |
| radio.glb | props_free | 70 | CC BY 4.0 (credit, CREDITS.md) | old radio | 0.36 m long | Tea stall / Panchayat | ready |

## Tubewell

| file | folder | KB | licence | what | real size | best place | status |
|---|---|---|---|---|---|---|---|
| handpump.glb | props_free | 81 | CC BY 4.0 (credit, CREDITS.md) | Indian hand pump | 0.9 m h (check vs village pumps) | Tubewell / courtyards | ready |

## On the Mac (read-only listing, nothing staged)

- Connected folders: `inbox/` (wall poster JPG/WebP only, no 3D) and `3d models_downloaded from internet/vehicles/` (vehicles, done).
- `vehicles/trains/` has 4 train GLBs (LHB coach 1.6 MB, passenger compartment 8.0 MB, indian_train 3.6 MB, WAM-4 locomotive 18 MB): vehicles, excluded; see `claude/railway-assets-25nov.md`.
- `vehicles/` also holds duplicate copies "(1)"/"(2)" of trailer, moped, bicycle, jeep (hundreds of MB wasted, safe to delete by her).
- Sibling folders `objects`, `other`, `textures` exist under `3d models_downloaded from internet/` but are NOT connected, so they were not read. Ask her to connect `objects` and `other` for a full count.
- Repo `inbox/` has only README.md; `tmp/` has no 3D files.
