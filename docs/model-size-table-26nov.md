# Model size table, 26 Nov (props_new)

Source: staged Sketchfab downloads, all licence CC BY 4.0 (read from each GLB's asset metadata). Script: `tools/slim-new-props.mjs` (re-runnable, `node tools/slim-new-props.mjs [name]`). Output: `public/assets/props_new/<name>.glb`. Units: metres, Y up, base at ground centre (min Y = 0), textures 512 WebP (wheat_clump 256), meshopt.

Facing +z: no model has a clear front except scarecrow (arms along x, thin in z, so front is +z or -z, unverified by eye) and fence/gate (run along x). Plants are near radially symmetric. No visual check was run.

| Model (out) | Source file | Original size (units) | Final size (m) | Scale | Tris before > after | KB | Status | Author |
|---|---|---|---|---|---|---|---|---|
| scarecrow | scarecrow | 78.863 x 104.559 x 18.183 | 1.4 x 1.85 x 0.32 | 0.01769 | 1680 > 1680 | 64 | ready | Baardus |
| fence_section | fence_pack_-_low_poly_game_ready | 15.189 x 1.327 x 5.96 | 1.8 x 1 x 0.04 | 0.9 | 13384 > 216 | 62 | ready, 1.8 m x 1.0 m, one panel only (fence pack's 8 styles not shipped) | TampaJoey |
| fence_gate | fence_pack_-_low_poly_game_ready | 15.189 x 1.327 x 5.96 | 0.82 x 0.91 x 0.04 | 0.9 | 13384 > 116 | 60 | ready, 0.82 m gate | TampaJoey |
| flower_pot | flower_pot | 0.591 x 1.001 x 0.591 | 0.3 x 0.5 x 0.3 | 0.49959 | 2174 > 1938 | 203 | ready | Ryoce |
| money_plant_pot | free_pothos_potted_plant_-_money_plant | 0.827 x 0.792 x 0.974 | 0.63 x 0.6 x 0.74 | 0.75792 | 15744 > 2677 | 123 | ready | AllQuad |
| jasmine_climber | jasmine | 1.443 x 2.936 x 1.445 | 1.08 x 2.19 x 1.08 | 0.7494 | 27126 > 2712 | 29 | ready, 27k to 2.7k, no textures (material colours only) | SCADL & Co |
| pot_plant_a | optimized_potted_plants | 12.239 x 2.066 x 5.211 | 0.53 x 0.7 x 0.51 | 0.4795 | 1770 > 158 | 99 | ready | Nicholas-3D |
| pot_plant_b | optimized_potted_plants | 12.239 x 2.066 x 5.211 | 0.37 x 0.8 x 0.37 | 0.40904 | 1770 > 148 | 99 | ready | Nicholas-3D |
| planter_long | optimized_potted_plants | 12.239 x 2.066 x 5.211 | 0.77 x 0.45 x 0.47 | 0.30951 | 1770 > 178 | 102 | ready | Nicholas-3D |
| pot_plant_c | optimized_potted_plants | 12.239 x 2.066 x 5.211 | 0.46 x 0.6 x 0.45 | 0.34695 | 1770 > 58 | 99 | ready | Nicholas-3D |
| pot_plant_d | optimized_potted_plants | 12.239 x 2.066 x 5.211 | 0.31 x 0.7 x 0.3 | 0.33885 | 1770 > 48 | 98 | ready | Nicholas-3D |
| plant_in_pot | plant_in_pot | 174.479 x 119.709 x 168.641 | 1.17 x 0.8 x 1.13 | 0.00668 | 1954 > 1842 | 275 | ready | OverLord |
| potted_plant_1 | potted_plant-1 | 72.17 x 63.86 x 73.944 | 0.68 x 0.6 x 0.69 | 0.0094 | 767 > 767 | 115 | ready | attben |
| potted_plant_2 | potted_plant | 17.508 x 15.1 x 16.605 | 0.7 x 0.6 x 0.66 | 0.03974 | 9336 > 2714 | 144 | ready | laanita |
| potted_plant_med | potted_plant_mediterranean_med_leaf_low_poly | 0.62 x 1.268 x 0.591 | 0.44 x 0.9 x 0.42 | 0.70965 | 533 > 533 | 36 | ready | dudecon |
| snail_vine_climber | snail_vine_-_free_download | 7.367 x 4.88 x 7.116 | 3.02 x 2 x 2.92 | 0.40983 | 1930 > 1842 | 71 | ready | Laurie Annis |
| banana_plant | banana_plant | 2.892 x 2.886 x 2.736 | 3.01 x 3 x 2.74 | 1.03963 | 4342 > 2879 | 294 | ready | evolveduk |
| banana_tree | banana_tree_low_poly | 3.674 x 3.453 x 3.674 | 2.54 x 3.18 x 2.55 | 0.92665 | 9300 > 2836 | 62 | ready | EmiyaSyahriel |
| cabbage | cabbage | 16.882 x 12.207 x 17.487 | 0.29 x 0.21 x 0.3 | 0.01716 | 3072 > 1358 | 123 | ready | Meerschaum Digital |
| corn_a | corn_corn_corn | 1.171 x 2.413 x 1.122 | 1.07 x 2.2 x 1.02 | 0.91175 | 2570 > 1355 | 35 | ready, base floats about 0.17 m after decimation | Tiia Tuulia |
| corn_b | maize_corn_plant | 0.975 x 2.649 x 1.113 | 0.84 x 2.3 x 0.96 | 0.8684 | 3108 > 1327 | 338 | ready | gilles.schaeck |
| eggplant | eggplant_game_ready__2k_pbr | 0.053 x 0.056 x 0.236 | 0.04 x 0.05 x 0.2 | 0.85 | 2432 > 1358 | 41 | ready, single fruit, not a plant | Meerschaum Digital |
| mango_tree | mango_tree | 6.69 x 6.858 x 6.761 | 5.34 x 6.6 x 5.32 | 1.02076 | 130451 > 1730 | 120 | ready, LOW CONFIDENCE: leaves decimated by vertex clustering from 130k to 1.7k, crown will look blobby; review by eye | stealth86 |
| mango_fruit | mango | 14.946 x 8.81 x 11.215 | 0.11 x 0.06 x 0.08 | 0.00736 | 1856 > 872 | 49 | ready, single fruit | Meerschaum Digital |
| radish_leaf | radish_leaf_01 | 17.859 x 5.82 x 13.546 | 0.35 x 0.11 x 0.27 | 0.0196 | 700 > 700 | 44 | ready | Digital screen official |
| tomato_plant | tomato_plant | 207.556 x 312.099 x 176.405 | 0.66 x 1 x 0.57 | 0.0032 | 3079 > 1358 | 107 | ready | zvanstone |
| watermelon_bush | watermelon_bush | 1.904 x 0.745 x 1.814 | 1.5 x 0.59 x 1.43 | 0.78788 | 9136 > 1350 | 133 | ready | FixIK* |
| wheat_row | wheat__free | 63.744 x 211.559 x 647.245 | 0.24 x 0.75 x 2.69 | 0.00425 | 217100 > 1398 | 83 | ready, LOW CONFIDENCE: 217k to 1.4k, thin blades, a 0.24 x 2.7 m strip (reads as one crop row) | Yaroslav Karas |
| wheat_clump | yard_wheat_clump | 2.448 x 3.629 x 2.628 | 0.61 x 0.9 x 0.65 | 0.248 | 720 > 720 | 529 | ready, wind-sway morph targets stripped (was 35 MB) | ebmclachlan |
| barn | barn | 13.59 x 6.92 x 7.11 | n/a | n/a | n/a | n/a | SKIPPED: American red-barn look, 2.3 MB of 1K textures; would need full re-texture to read as a cattle shed. Not slimmed. | |
| american_old_barn | american_old_barn | 243.5 x 134.9 x 183.5 (cm-like units) | n/a | n/a | n/a | n/a | SKIPPED: Weathered US timber barn, foreign look. Not slimmed. | |
| house_farm_wooden_-_28mb | house_farm_wooden_-_28mb | 5.94 x 5.01 x 10.67 | n/a | n/a | n/a | n/a | SKIPPED: Wooden clapboard farmhouse, American/European look; footprint 5.9 x 10.7 m is near our house scale but the style is wrong. Not slimmed. | |

Notes:
- optimized_potted_plants split into 5 singles (pot_plant_a/b/c/d, planter_long); fence_pack split into fence_section and fence_gate.
- All materials double-sided; BLEND turned into alpha test (leaf) or OPAQUE (non-leaf).
- Morph targets and animations stripped from every output (static props).
- Barn sizing check: house scale is 6 to 9 m wide; none of the barns was scaled or slimmed.
