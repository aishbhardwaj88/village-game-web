# On-foot findability walk, 26 Oct 2026 (BACKLOG A-2c AUDIT)

Method: tmp/onfoot-walk.mjs. Headless game, player starts at the house gate (-47,47), holds W under real keyboard input, steers along the drawn lane graph (Dijkstra from the house), then leaves the last lane node in a straight line to the place, with the collision resolver live. Shot facing the place from 5 m. Screenshots: docs/shots/onfoot-walk-2026-10-25/<id>.png. Raw logs: walk*.log in the same folder (latest line per place used below).

Result: **39 of 39 places reached on foot** (end distance 1.9 to 13.5 m; the 4 above 8 m are large sites reached at the compound edge: school 13.5, gurukul 11.6, haveli 10.5, pond 8.0). Game time at 4.2 m/s walk.

Earlier runs that ended STUCK (gurudwara, health, pond, highway, mandi at lane-graph gaps) passed on the rerun after the lane graph was bridged; no place is unreachable.

id | lane route m | m off nearest lane | walked m | walk s | end dist to place
johad | 38 | 103 | 197 gameSec@4.2 47 | 4.5
manihari | 38 | 105 | 144 gameSec@4.2 34 | 2.3
sabzi | 38 | 107 | 147 gameSec@4.2 35 | 2.4
chemist | 38 | 108 | 190 gameSec@4.2 45 | 2.7
highway | 278 | 11 | 284 gameSec@4.2 68 | 2.1
ration | 39 | 12 | 53 gameSec@4.2 13 | 2.5
halwai | 8 | 12 | 56 gameSec@4.2 13 | 3.3
masjid | 38 | 138 | 270 gameSec@4.2 64 | 4.1
chakki | 10 | 15 | 24 gameSec@4.2 6 | 2.3
gurudwara | 208 | 17 | 303 gameSec@4.2 72 | 4.1
gurukul | 38 | 175 | 273 gameSec@4.2 65 | 11.6
jain | 38 | 177 | 294 gameSec@4.2 70 | 4.2
haveli | 38 | 183 | 299 gameSec@4.2 71 | 10.5
health | 204 | 19 | 269 gameSec@4.2 64 | 3.3
maidan | 38 | 194 | 239 gameSec@4.2 57 | 2.4
westgali | 111 | 2 | 111 gameSec@4.2 26 | 2.4
pond | 126 | 20 | 171 gameSec@4.2 41 | 8.0
anganwadi | 145 | 20 | 195 gameSec@4.2 46 | 4.1
canal | 40 | 22 | 62 gameSec@4.2 15 | 2.3
khalihan | 49 | 24 | 75 gameSec@4.2 18 | 2.4
tubewell | 49 | 24 | 76 gameSec@4.2 18 | 2.5
jalebi | 62 | 26 | 92 gameSec@4.2 22 | 2.2
dairy | 62 | 28 | 143 gameSec@4.2 34 | 2.6
teastall | 8 | 28 | 33 gameSec@4.2 8 | 2.4
banta | 39 | 3 | 39 gameSec@4.2 9 | 2.4
mandi | 278 | 36 | 310 gameSec@4.2 74 | 2.5
eastgali | 40 | 36 | 76 gameSec@4.2 18 | 2.4
baagh | 49 | 43 | 105 gameSec@4.2 25 | 2.5
school | 64 | 5 | 84 gameSec@4.2 20 | 13.5
bazaar | 62 | 6 | 106 gameSec@4.2 25 | 3.0
chaat | 10 | 6 | 15 gameSec@4.2 4 | 2.1
store | 36 | 6 | 41 gameSec@4.2 10 | 2.3
temple | 54 | 6 | 60 gameSec@4.2 14 | 2.4
chowk | 49 | 6 | 61 gameSec@4.2 15 | 2.3
mela | 145 | 69 | 211 gameSec@4.2 50 | 1.9
gaushala | 62 | 69 | 215 gameSec@4.2 51 | 3.6
field | 54 | 73 | 127 gameSec@4.2 30 | 2.3
post | 39 | 9 | 48 gameSec@4.2 11 | 2.5
cane | 45 | 90 | 138 gameSec@4.2 33 | 2.4
tvhouse | 38 | 93 | 186 gameSec@4.2 44 | 4.6

## Places with no drawn lane within 60 m (the walker crossed open ground; a player needs the signpost or the map)
- johad (103 m off lane)
- manihari (105 m off lane)
- sabzi (107 m off lane)
- chemist (108 m off lane)
- masjid (138 m off lane)
- gurukul (175 m off lane)
- jain (177 m off lane)
- haveli (183 m off lane)
- maidan (194 m off lane)
- mela (69 m off lane)
- gaushala (69 m off lane)
- field (73 m off lane)
- cane (90 m off lane)
- tvhouse (93 m off lane)

## Not findable without the map
None by signpost coverage (static audit 0 of 40, tools/findability-audit.mjs). Reachable but with no visible path: the places above, plus the far east cluster (health to mandi), which is 38 m of lane then 100 to 240 m of open ground along the east road spurs. Layout is the art director's call; nothing was moved.

Not done: a real-phone test; the walker follows the lane graph rather than eyeballing the view, so 'visible from the lane' rests on the 25 Oct lane-side shots (docs/findability-walk-2026-10-25.md).
