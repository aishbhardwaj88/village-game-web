# Roads must be empty, agent B: move log, 25 Nov 2026

Her order: nothing on any road. Test line: the DRAWN road edge = band (width/2) + edge wander (roadNetwork.js ROAD_KINDS amp x 1.4), round caps; every object must stand at least 0.3 m beyond it (street lamp poles 0.5 m to centre). The scuffed apron past the wander is ground colour and is not counted. Helpers: src/mapRoads.js drawnRoadClearance, roadEmptySlide, roadEmptyPush. Reversible constants: ROAD_EMPTY_REMOVE (mapSigns.js, animals.js, mapObjects.js), LAMP_ROAD_REMOVE (props.js). Coordinates are world x, z before -> after.

```
sign new_sign#1 Village bank: (568.26, 42.03) -> (568.01, 42.03) slide -0.25
sign new_sign#15 Tea and biscuits: (628.60, 24.14) -> (628.60, 24.19) slide -0.05
sign new_sign#16 Stationery: (633.10, 24.14) -> (633.10, 24.19) slide -0.05
sign new_sign#17 Mobile accessories: (622.92, -12.49) -> (622.77, -12.50) slide -0.15
sign new_sign#18 Bakery: (622.92, -7.69) -> (622.57, -7.70) slide -0.35
sign new_sign#20 Footwear: (584.22, 13.51) -> (584.08, 13.65) slide -0.20
sign new_sign#23 Book depot: (573.02, 41.02) -> (573.07, 41.02) slide -0.05
sign new_sign#24 Dry fruits: (607.42, 40.96) -> (607.67, 40.96) slide -0.25
sign new_sign#26 Doctor's clinic: (587.37, 71.51) -> (587.40, 71.66) slide -0.15
sign new_sign#33 Grocery: (785.84, 23.32) -> (785.85, 23.22) slide -0.10
sign new_sign#36 Library and reading room: (568.30, 50.55) -> (568.15, 50.55) slide -0.15
sign new_sign#37 Toy shop: (607.58, -27.87) -> (607.88, -27.91) slide -0.30
sign new_sign#38 Sweets and namkeen: (598.10, 45.85) -> (597.76, 45.77) slide -0.35
sign new_sign#39 Kirana: (604.00, 75.30) -> (604.15, 75.34) slide -0.15
sign new_sign#40 Steel utensils: (607.30, 49.88) -> (607.45, 49.90) slide -0.15
sign new_sign#41 Shoe shop: (607.00, 54.88) -> (607.10, 54.89) slide -0.10
sign new_sign#42 Bangles: (605.38, 69.93) -> (605.68, 69.97) slide -0.30
sign new_sign#43 Photo studio: (575.80, 9.32) -> (575.80, 9.77) slide -0.45
sign new_sign#45 Spices: (580.38, 1.85) -> (580.41, 1.65) slide -0.20
sign new_sign#46 Readymade clothes: (623.03, -17.48) -> (622.73, -17.44) slide -0.30
sign new_sign#47 Lassi and milk: (650.63, 15.78) -> (650.58, 15.43) slide -0.35
sign new_sign#48 Mithai: (622.53, -2.95) -> (621.95, -2.79) slide -0.60
sign new_sign#49 Bag shop: (572.63, 21.80) -> (572.78, 21.80) slide -0.15
sign new_sign#50 Watch and clock: (572.73, 26.60) -> (572.83, 26.60) slide -0.10
sign new_sign#51 Mobile covers: (572.78, 31.40) -> (572.93, 31.40) slide -0.15
sign new_sign#52 Cosmetics: (626.40, 33.80) -> (626.50, 33.80) slide -0.10
sign new_sign#53 Pooja items: (607.60, 36.60) -> (607.65, 36.60) slide -0.05
sign new_sign#54 Kites and toys: (598.23, 40.00) -> (598.13, 40.00) slide -0.10
sign new_sign#55 Pickles and papad: (626.40, 38.60) -> (626.50, 38.60) slide -0.10
sign new_sign#56 Gift shop: (598.23, 35.20) -> (598.13, 35.20) slide -0.10
sign new_sign#57 Grocery: (597.83, 50.65) -> (597.45, 50.54) slide -0.40
sign new_sign#58 Cloth shop: (586.08, -74.92) -> (585.51, -75.49) slide -0.80
sign new_sign#59 Tailor: (604.38, -97.77) -> (604.56, -97.69) slide -0.20
sign new_sign#60 Bangles and cosmetics: (598.58, -81.80) -> (598.82, -81.73) slide -0.25
sign new_sign#61 Beauty parlour: (596.50, -76.17) -> (596.81, -76.01) slide -0.35
sign new_sign#62 Footwear: (612.23, -34.92) -> (612.28, -35.17) slide -0.25
sign new_sign#63 Mobile shop: (566.75, -39.95) -> (566.75, -40.30) slide -0.35
sign new_sign#64 Electrical and mobile repair: (618.45, -34.23) -> (618.45, -34.53) slide -0.30
sign new_sign#67 Kirana: (532.75, 0.45) -> (532.75, 0.20) slide -0.25
sign new_sign#68 Dairy booth: (538.75, 0.80) -> (538.75, 0.55) slide -0.25
sign new_sign#69 Stationery and xerox: (544.45, 0.85) -> (544.45, 0.75) slide -0.10
sign new_sign#70 Chemist (health centre): (573.17, 61.85) -> (573.37, 61.85) slide -0.20
sign new_sign#71 Tea stall: (679.90, -117.27) -> (679.90, -117.22) slide -0.05
sign new_sign#73 Milk collection point: (483.60, -5.55) -> (483.60, -6.15) slide -0.60
sign new_sign#74 Animal hospital: (491.15, -4.05) -> (491.28, -4.43) slide -0.40
sign new_sign#75 Wedding and community hall: (751.00, -116.45) -> (751.00, -116.15) slide -0.30
sign new_sign#76 Carpenter's workshop: (709.51, -85.02) -> (710.30, -85.13) slide -0.80
sign new_sign#77 Stationery: (583.73, 84.05) -> (583.67, 83.70) slide -0.35
sign new_sign#78 Books and uniforms: (578.73, 85.03) -> (578.67, 84.63) slide -0.40
sign new_sign#79 Samosa and snacks: (573.85, 86.00) -> (573.85, 85.40) slide -0.60
sign new_sign#80 Mobile recharge and photocopy: (683.95, 64.20) -> (683.78, 63.68) slide -0.55
sign new_sign#81 Cyber cafe: (678.03, 65.38) -> (677.97, 64.93) slide -0.45
sign new_sign#82 Tea stall: (672.08, 66.53) -> (672.02, 66.13) slide -0.40
sign new_sign#83 Tent and wedding lights: (765.95, -116.19) -> (765.83, -115.65) slide -0.55
sign new_sign#84 Jaggery making unit: (456.10, -120.32) -> (456.10, -120.27) slide -0.05
sign new_sign#85 Kirana: (685.47, 15.78) -> (685.53, 15.33) slide -0.45
sign new_sign#86 Tailor: (735.40, 15.83) -> (735.59, 15.37) slide -0.50
sign new_sign#87 Cloth: (750.00, 17.98) -> (750.07, 17.74) slide -0.25
sign new_sign#88 Mobile: (755.93, 18.93) -> (755.95, 18.78) slide -0.15
sign new_sign#89 Seeds: (761.85, 19.80) -> (761.85, 19.45) slide -0.35
sign new_sign#90 Photo studio: (767.78, 20.70) -> (767.80, 20.55) slide -0.15
sign new_sign#91 Utensils: (773.75, 21.65) -> (773.75, 21.25) slide -0.40
sign new_sign#92 Footwear: (779.65, 22.53) -> (779.65, 22.13) slide -0.40
sign new_sign#93 General store: (568.75, -34.90) -> (568.75, -34.70) slide -0.20
sign new_sign#94 General store: (573.92, -34.40) -> (573.90, -34.25) slide -0.15
sign new_sign#95 General store: (709.28, -78.67) -> (710.02, -78.79) slide -0.75
sign new_sign#96 General store: (509.28, 50.30) -> (508.73, 50.30) slide -0.55
sign new_sign#97 Tea stall: (433.25, -4.77) -> (433.20, -4.58) slide -0.20
sign new_sign#98 Tea stall: (679.75, 24.00) -> (679.75, 24.15) slide -0.15
sign new_sign#99 Tea stall: (609.83, -82.90) -> (609.76, -82.46) slide -0.45
sign new_sign#100 Tea stall: (593.13, 80.47) -> (592.88, 80.43) slide -0.25
sign new_sign#101 Tailor: (566.92, -15.35) -> (567.22, -15.35) slide -0.30
sign new_sign#102 Tailor: (509.85, 55.13) -> (509.46, 55.20) slide -0.40
sign new_sign#103 Tailor: (709.16, -73.14) -> (709.61, -73.14) slide -0.45
sign new_sign#104 Kirana: (614.33, -82.35) -> (614.26, -81.91) slide -0.45
sign new_sign#105 Kirana: (663.58, 68.25) -> (663.51, 67.86) slide -0.40
sign new_sign#106 Cycle repair: (440.45, -3.90) -> (440.39, -3.66) slide -0.25
sign new_sign#107 Cycle repair: (658.95, 69.18) -> (658.83, 68.75) slide -0.45
sign new_sign#108 Cloth: (684.55, 24.00) -> (684.55, 24.15) slide -0.15
sign new_sign#109 Dhaba: (619.53, -81.67) -> (619.47, -81.27) slide -0.40
sign new_sign#110 Chemist: (625.48, -80.87) -> (625.42, -80.47) slide -0.40
sign new_sign#111 Electrical repair: (631.42, -80.17) -> (631.36, -79.72) slide -0.45
sign new_sign#112 Cloth shop: (566.65, -20.55) -> (566.85, -20.55) slide -0.20
sign new_sign#113 Hardware and paint: (645.78, 24.10) -> (645.75, 24.35) slide -0.25
sign new_sign#114 Crockery: (620.50, 24.00) -> REMOVED
SIGNS: 84 moved, 1 removed
design plotPillar new_House plot#4p11: (693.30, 65.27) -> (693.48, 65.08) moved 0.25
milestone new_milestone#3: (758.00, 27.50) -> (757.90, 28.16) moved 0.66
milestone new_milestone#4: (451.13, 1.46) -> (451.72, 1.30) moved 0.61
milestone new_milestone#6: (799.00, -115.50) -> (798.99, -115.08) moved 0.42
milestone new_milestone#9: (457.98, -1.84) -> (457.89, -1.18) moved 0.67
buffalo new_cattle#1: (650.49, 50.68) -> (650.43, 50.37) moved 0.31
field cattle field_cattle_4: (611.50, -176.00) -> (612.51, -175.93) moved 1.01
field dog field_dog_1: (607.50, -173.50) -> (604.99, -173.58) moved 2.52
lamp: (602.65, 79.64) -> (603.64, 79.45) slide -1 side 0
lamp: (474.86, 98.94) -> (475.36, 98.91) slide -0.5 side 0
lamp: (431.56, 5.02) -> (431.65, 7.51) slide -2.5 side 0
```

## Not changed, and why
- Welcome gate boards (601.6,-114.2 / 608.3,-111.8): overhead, 5 to 6.5 m up on the beam that spans main_road; pillar bases are 0.35 m clear. Left.
- Street lamp arms and heads overhang the lane by design (that is the audit's 2.0 m); every pole base now clears. Left.
- Crop rows on 26_Wheat field track: src/field.js TRACK_CLEAR 2.15 is inside the drawn edge (2 + 0.63 wander); needs about 2.95. Not my file, left.
- Unnamed Mesh with a vertex at y 17674 under group 'shops': not src/shops.js (all its meshes are named) and not shopsPlace.js (named s7_*). Not found by reading; needs a live traversal (mesh.parent chain + geometry bounding box).
- Cattle and dogs: every createCattleHerd / createDogPack call (all files) now pushes its animals off roads, and the slow roam never picks a spot within 0.3 m + body radius of a road.
