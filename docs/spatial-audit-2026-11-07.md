# Spatial adjacency audit, 7 Nov 2026

Tool: `tmp/adjacency-audit.mjs` (run `node tmp/adjacency-audit.mjs` from the repo root; gitignored). It reads
ANCHORS, MAP_PLAN shifts, the 1 Nov map footprints (building shapes only), map roads and lanes, and the point
props (oddities, long-walk sites, ride nooks, ice-cream carts, small shops, zero milestone). Rules are from
SPATIAL_SENSE section 5: shop vs well/pump/milestone, chauraha 12 m circle, props in a carriageway, buildings on
or blocking roads and lane mouths, faith/dirty/home neighbours, props inside buildings, unlike props within 3 m.
Limits: the kit houses (gully rows) and lamps are not in the data it reads; footprints are the map's drawn
shapes, not the built models (the hero school and v2 yards differ from the map).

## Halwai and well (asked)
- Halwai (637.4, 21.4), turned 95 deg so its front faces west INTO the village square. It is 34.5 m from the zero
  milestone (602.9, 19.9): outside the 12 m circle. It stands on the square's east edge (the map's village square
  runs x 580.5..636.3), next to the jalebi stall (3 m, same trade, fine). It is on the east side, not a literal
  corner plot. Not changed.
- Well (oddity) at (630.0, 1.0): 33 m from the milestone, 21.7 m from the halwai, 12.6 m from the haveli, 6.3 m
  clear of the cross road. Not beside any shop. Not changed.

## Findings (after removing false positives from the first pass)
Fixed:
1. Ice-cream cart at the school sat INSIDE the school yard (world 564.5, 115.5). Moved to the street side of the
   south wall, 7.5 m east of the gate, 2 m clear of the outer lane edge: world (564.0, 93.8). `src/iceCreamCarts.js`.

Left alone (layout-bound, the map is being uprooted, so not worth a cycle; noted for the next layout):
2. Ration shop (bazaar unit 8) footprint overlaps the main_road carriageway at about (581.4, -17.2).
3. Jalebi stall (637.0, 24.4) sits 2.2 m from the mouth of the "Lane east of the square" (633.3, 30.4).
4. School north building edge 1.3 m from the Outer lane south centreline at (559.8, 93.7) (map footprint, hero school differs).
5. Footprints touching in the map itself: school/yard_school (alias duplicates), bazaar unit 8 / ration,
   tea stall / matboard yard, tvhouse / matboard yard. Aliases, not real overlaps.

False positives found and discarded: chaupal (open ground by design, halwai and jalebi stand in its front),
gurukul pump (outside the compound outline), chakki pump (matching bug in the first pass).
No prop was found inside a carriageway, no well/pump/milestone within 3 m of a shop, no haystack or buffalo
against a shop or faith building, and nothing but the zero milestone inside the 12 m chauraha circle.
