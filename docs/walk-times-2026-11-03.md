# Walk and cycle times between neighbouring places (3 Nov 2026)

Measured, nothing moved. Script: `tmp/walktimes/measure.mjs` (re-run it after any map change).

- **Speeds** (src/main.js): walk `MOVE_SPEED` 4.2 m/s; cycle x3 (`CYCLE_SPEED_MULT`) = 12.6 m/s.
- **Places**: every entry of `src/anchors.js` that stands on the map (48 after merging the old-id / yard-id pairs that share a spot; the gali labels, the merged chemist/manihari points, the staged primary school v2 and the material board are left out).
- **Neighbours**: each place paired with its 2 nearest places by straight line (65 pairs).
- **Along roads**: shortest route over every road, lane, back lane, farm track and front path in `docs/layout/village-plan-positions-2026-11-01.json`, plus the village square as open paving, plus the straight step from each anchor to its nearest road. The player is not actually held to the roads, so the straight column is the cross-country floor.

## Headline

36 of the 65 neighbouring pairs are over 20 s on foot along the roads; none is over 23 s on the cycle. Worst five on foot: gurudwara to the primary school 70 s (296 m round, 52 m straight), temple to the dharam kanta 68 s (285 m, 40 m straight), gurukul to the akhada 67 s, gurukul to the khel maidan 55 s, pond to the post office 51 s. Eighteen pairs are more than 3x longer by road than straight, because the lanes run round places rather than between them (worst: temple to dharam kanta 7.2x, tea stall to TV house 6.5x).

## Built footprint against total area

| What | m2 | Share of map rectangle |
|---|---:|---:|
| Map rectangle (roads + fields), 531 x 472 m | 250,508 | 100% |
| Buildings (all 93 building shapes on the map) | 7,828 | 3.1% |
| Yards, open grounds, compounds | 22,426 | 9.0% |
| Roads, lanes and tracks (centreline x width) | 35,088 | 14.0% |
| Fields (wheat, cane, mustard, paddy outlines) | 56,451 | 22.5% |
| Everything else (open ground between) | ~128,700 | ~51% |

The ring road encloses 19,028 m2 (1.9 ha), the dense core.

## All 65 pairs, longest walk first

| From | To | Straight m | Along roads m | Walk s | Cycle s |
|---|---|---:|---:|---:|---:|
| gurudwara | school | 52 | 296 | 70 | 23 |
| temple | yard_dharam_kanta | 40 | 285 | 68 | 23 |
| gurukul | yard_akhada | 50 | 281 | 67 | 22 |
| gurukul | maidan | 46 | 232 | 55 | 18 |
| pond | post | 69 | 212 | 51 | 17 |
| yard_bus_adda | yard_petrol | 33 | 195 | 46 | 15 |
| yard_puncture | temple | 73 | 191 | 45 | 15 |
| yard_bhatta | yard_dharam_kanta | 134 | 182 | 43 | 14 |
| yard_petrol | yard_paani_tanki | 56 | 174 | 41 | 14 |
| mandi | yard_bhatta | 94 | 171 | 41 | 14 |
| cane | pond | 86 | 154 | 37 | 12 |
| cane | gaushala | 81 | 153 | 36 | 12 |
| khalihan | yard_puncture | 32 | 150 | 36 | 12 |
| haveli | jalebi | 50 | 147 | 35 | 12 |
| jain | johad | 53 | 145 | 35 | 12 |
| maidan | yard_volleyball | 37 | 144 | 34 | 11 |
| haveli | halwai | 44 | 143 | 34 | 11 |
| yard_volleyball | school | 56 | 143 | 34 | 11 |
| school | post | 44 | 143 | 34 | 11 |
| mela | jain | 86 | 127 | 30 | 10 |
| health | johad | 47 | 125 | 30 | 10 |
| field | yard_puncture | 91 | 115 | 27 | 9 |
| post | anganwadi | 41 | 112 | 27 | 9 |
| field | yard_petrol | 71 | 109 | 26 | 9 |
| post | yard_panchayat | 23 | 109 | 26 | 9 |
| yard_akhada | maidan | 42 | 109 | 26 | 9 |
| masjid | yard_paani_tanki | 54 | 105 | 25 | 8 |
| baagh | mela | 52 | 102 | 24 | 8 |
| dairy | gaushala | 28 | 100 | 24 | 8 |
| gaushala | masjid | 57 | 96 | 23 | 8 |
| highway | tubewell | 72 | 91 | 22 | 7 |
| baagh | jain | 41 | 91 | 22 | 7 |
| mandi | yard_dharam_kanta | 58 | 89 | 21 | 7 |
| dairy | masjid | 55 | 87 | 21 | 7 |
| pond | gurudwara | 49 | 85 | 20 | 7 |
| maidan | gilli | 38 | 85 | 20 | 7 |
| health | tubewell | 39 | 84 | 20 | 7 |
| teastall | tvhouse | 13 | 83 | 20 | 7 |
| temple | khalihan | 41 | 73 | 17 | 6 |
| gilli | yard_akhada | 22 | 64 | 15 | 5 |
| tubewell | johad | 18 | 60 | 14 | 5 |
| canal | tubewell | 37 | 55 | 13 | 4 |
| ration | bazaar | 27 | 54 | 13 | 4 |
| chowk | sabzi | 25 | 53 | 13 | 4 |
| canal | highway | 35 | 53 | 13 | 4 |
| chowk | yard_chaupal | 25 | 48 | 11 | 4 |
| school | anganwadi | 24 | 45 | 11 | 4 |
| yard_bus_adda | yard_paani_tanki | 23 | 44 | 11 | 4 |
| ration | chowk | 28 | 41 | 10 | 3 |
| house | halwai | 24 | 40 | 10 | 3 |
| banta | chaat | 10 | 36 | 9 | 3 |
| house | jalebi | 22 | 34 | 8 | 3 |
| chakki | yard_panchayat | 23 | 32 | 8 | 3 |
| store | yard_chaupal | 19 | 32 | 8 | 3 |
| teastall | chaat | 8 | 28 | 7 | 2 |
| chaat | sabzi | 6 | 28 | 7 | 2 |
| bazaar | chaat | 21 | 28 | 7 | 2 |
| store | jalebi | 25 | 27 | 7 | 2 |
| chakki | tvhouse | 15 | 27 | 7 | 2 |
| halwai | yard_chaupal | 16 | 23 | 5 | 2 |
| yard_panchayat | tvhouse | 21 | 22 | 5 | 2 |
| bazaar | teastall | 21 | 21 | 5 | 2 |
| jalebi | yard_chaupal | 12 | 16 | 4 | 1 |
| halwai | jalebi | 5 | 10 | 2 | 1 |
| banta | sabzi | 8 | 10 | 2 | 1 |
