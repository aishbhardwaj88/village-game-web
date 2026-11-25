# Shops move log 3, 25 Nov (overlap with places/houses/shops and blocked doors)

Tool: `tools/shop-rects-pack.mjs` new step 4 (FIX3 list): smallest move on a 0.1 m grid, max 5 m from the map spot, turn unchanged, >= 0.1 m clear of every band, 0 overlap with every place footprint / runtime house / shop, front face still not farther from a band than the back, own door point free, and no door of a place, house or shop within 0.5 m. Output: `src/layout/shopRects.json`.

| Shop | Old spot | New spot | Moved m | Why |
|---|---|---|---|---|
| Shopkeeper's home and godown | 587.17,-12.64 | 587.17,-12.24 | 0.40 | overlap with house #433 |
| Dry fruits (2-storey) | 611.17,40.96 | 611.17,41.16 | 0.20 | overlap with Pooja items |
| Newspaper stand | 608.3,1.9 | 608.3,2.2 | 0.30 | overlap with Ice gola cart |
| Sugarcane juice cart | 608.5,-36.9 | 608.5,-36.4 | 0.50 | stood on Footwear's door |
| Fruit cart (near Ice gola) | 617.915,57.143 | 618.12,57.14 | 0.20 | stood on Ice gola cart's door |
| Fruit kiosk | 591.55,30.5 | 593.65,30.4 | 2.10 | stood on place sabzi's door (592.7,32.1) |
| Jaggery making unit | 456,-115.6 | 456.2,-115.6 | 0.20 | overlap with masjid box |

Pooja items vs place chaat (0.75 m2) is gone as a side effect of the chaat place having moved.

## Cannot be fixed under 5 m (listed, not loosened)
- Hardware and paint (645.73,27.8): inside the whole-site box of place `house` (footprints.js has only the site box, 18.5 x 15.2 m, no building-only box). It needs about 5.9 m south or 5.8 m west. Fix belongs to the place: give `house` a building-only footprint, or move it.
- Gift shop (594.5,35.15): the 10 m long `sabzi` strip (turned 40 deg off the road) cuts across its north-west corner. Needs about 5.1 m north plus Kites and toys moving too. Fix: square `sabzi` to its road.
- Milk carts (444.05,-13.1): squeezed between place `dairy`'s site box and the gali band, no gap of 1.5 m. Fix: the dairy box or its anchor.
These three are place-side overlaps; the figures change whenever the places agent moves `sabzi`, `dairy` or `house`, and the pack tool re-reads the live anchors every run.

## Proof
- `node tmp/review/doors.mjs`: shops blocked doors 5 -> 1 real case (Milk carts, because dairy moved; was not blocked before). Fruit kiosk, Ice gola cart, Footwear gone. 3 railway entries are the old walk-to-road items, not mine.
- `python3 tmp/audit/audit5_shops.py`: 166/166 PASS; building overlaps 10 -> 4 (the 3 above + Seeds vs house #7, 0.74 m2, house side).
- `node tools/map-match-shops.mjs` PASS, `node tools/missions-check.mjs` 0 FAIL, `npm run build:unchecked` ok.
