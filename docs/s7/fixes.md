# S7 fixes (agent notes)

Branch `s7-fixes`. Everything here shows only with `?layout=new`; `?layout=old` is unchanged.
Pictures: `docs/s7/fixes/` (remake: `flock /tmp/s7-browser.lock node docs/s7/fixes/shoot.mjs [view ...]`).

## 1. Shopkeeper's home and godown (`new_sqh`) - done

- Built by the shops-land kit (`src/kit/shopsPlace.js` + `shopHouse()` in `src/kit/shopsKit.js`), on the layout's
  corrected footprint `o.rect`: centre (587.2, -12.6), 7 x 4.4 m, 6.5 m tall, front facing south onto gali n41
  (front edge 5.8 m from the gali; nothing on a road).
- Two storeys: the godown below behind a rolling shutter (down), the family's own panelled door beside it (new
  `homeDoor` option of `shopHouse`, off for every other shop, so the 44 shop-houses are unchanged), the home above with
  its balcony door, grilled window, sunshade and balcony parapet. Same 5 library materials, same batches: 0 new draw calls.
- Wall colour and balcony come from their own seed, so no other shop's colour or variant moved.
- On a preview page that reads the raw export (no `o.rect`), it falls back to the drawn plot fronted on the side
  nearest a road (same answer: south).
- Pictures: `shopkeeper_home.jpg` (from the gali), `shopkeeper_home_above.jpg`, `sqh_top.jpg` (straight down).
- Question for her (look): no signboard on it (godowns usually carry none). Should it have one?
