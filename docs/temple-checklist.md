# Temple + flower stall checklist

**Temple (mandir):** no Places V1 reference image exists (only MAP.md's rule: "small, peripheral... scenery and ambient sound only", CLAUDE.md:
no deity figures, no religious imagery, no text). Built from `src/temple.js`'s footprint by `tools/blender/build_temple.py`
(`make.sh temple temple`, exact slot at TEMPLE_POS); code temple hidden as `temple_old` (collision backing). The compare image's left panel
says so honestly — **an art-director reference is wanted (see NEEDS_YOU)**.
**Flower stall:** Places V1/flower_stall (LAYOUT.md + orthos) -> `build_flower_stall.py` (`make.sh flower_stall flower_stall`, slot at FLOWER_STALL_POS).

| # | Element | Status | Proof |
|---|---|---|---|
| T1 | Low whitewashed boundary wall 12 x 10 m with ochre skirt + coping, 2.6 m gate gap on the west, two gate pillars with plain domed caps | [x] | compare/temple.png |
| T2 | Raised stone plinth 6 x 5 x 0.4 m with three entrance steps and cheek walls | [x] | compare/temple.png |
| T3 | Shrine block 2.6 m with an OPEN, EMPTY doorway (plain frame, a bare brass lamp only), corner pilasters, bands | [x] | compare/temple/shrine_door.png |
| T4 | Porch with four plain square pillars, base/cap mouldings, lintel beams, bell hung from the porch beam | [x] | compare/temple/front_gate.png |
| T5 | Stepped shikhar (4 tiers with bands/caps) + plain kalash finial; roof slab with cornice | [x] | compare/temple.png |
| T6 | Peepal chabutra: round brick tree platform (0.5 m), deck, soil, step | [x] | compare/temple/chabutra.png |
| T7 | Tree on the chabutra | [~] | code stand-in; real tree = Tripo |
| T8 | Forecourt path, two potted shrubs, stone bench | [x] | compare/temple.png |
| F1 | Four bamboo poles with node rings, bamboo roof frame, sagging dark-green tarp lashed with rope | [x] | compare/flower-stall.png |
| F2 | Low plank table (0.4 m) on stacked bricks, jute mat | [x] | compare/flower-stall/table_flowers.png |
| F3 | Baskets: orange marigold, yellow marigold, rose, jasmine bowl; loose blooms; stool | [x] | compare/flower-stall/table_flowers.png |
| F4 | Garlands hung from the front bamboo rod (marigold + rose strings) | [x] | compare/flower-stall/garlands.png |
