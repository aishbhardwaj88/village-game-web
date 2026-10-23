"""
The bazaar row — ONE continuous terrace of 8 shops, hand-modelled in Blender from Places V1/bazaar_row/
(LAYOUT.md = counts/names/dimensions, MAIN_bazaar_row_views.png / _orthos.png = look). Checklist: docs/bazaar-row-checklist.md.
Run: tools/blender/make.sh bazaar_row bazaar_row

Authored in world offsets from the row centre ROW = (-82, 15) (src/bazaar.js: BAZAAR_WEST_X=-100, BAZAAR_ROW_CZ=15).
Units are 4.5 m wide x 5 m deep, x = -18 .. +18; the shops OPEN toward -z (the lane/chowk side), back wall at +z.
Exact asset slot at ROW; the code row/shopfronts/interiors stay hidden (collision + validator backing). Shutters are
modelled rolled UP (the shops are open for business), in each trade's LAYOUT.md colour; the bilingual signboards are the
existing code signboards (src/bazaar.js buildBazaarSignboards), unchanged.
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import wb, limb, cyl, sphere, prism_x, prism_z, quad, boolean_cut, ROOT
from arch import Kit, ring, pot, plastic_chair, dabba, sack, clay_pot, STEEL, BRASS, LEAF, MARI, TERRA, SOIL

OUT = os.path.join(ROOT, 'tmp', 'bazaar_row_raw.glb')
kit = Kit()
rnd = random.Random(8)

UW, UD = 4.5, 5.0
FRONT, BACK = -2.5, 2.5             # open front plane, back wall outer plane
WT = 0.22
HEIGHTS = [3.9, 4.15, 3.95, 4.2, 4.0, 3.85, 4.1, 3.95]
PARTY_H = max(HEIGHTS) + 0.05
SHUTTER = [0x3D7D82, 0x3F6B45, 0x7A2F35, 0xC9A227, 0x9FC0D4, 0x6B6F3A, 0x8A8A86, 0x5A5A52]
TRADES = ['kirana', 'sabzi', 'medical', 'tailor', 'barber', 'mobile', 'bangle', 'puncture']
# A1 wall variation (2026-10-23): limewash pink / mint units between the cream and the one soft-blue unit.
WALL_COLOR = {1: 0xF2D4CC, 3: 0xD2E6D8, 6: 0xD2E6D8, 7: 0xF2D4CC}
BLUE_UNITS = (4,)                   # unit 5 (barber) is soft blue in the reference; the rest cream
OPEN_H = 2.35                       # shutter opening height
COUNTER_Z0, COUNTER_Z1 = -2.15, -1.65
CZ = -1.9                           # counterZ in src/bazaar.js (frontZ + 0.6)
BZ = 2.1                            # backInnerZ


def cx(i):
    return -15.75 + 4.5 * i


def bx(i):
    return -18 + 4.5 * i


# ----------------------------------------------------------------------------- shell
def shell():
    for i in range(8):
        h = HEIGHTS[i]
        c = cx(i)
        wall_kind = 'trim' if i in BLUE_UNITS else 'plaster'
        kit.add(wall_kind, wb('back', c - UW / 2, c + UW / 2, BACK - WT, BACK, 0, h, 0.01), WALL_COLOR.get(i))
        band_h = 0.5 + (i % 3) * 0.08
        kit.add('plinth', wb('back_band', c - UW / 2, c + UW / 2, BACK, BACK + 0.025, 0, band_h, 0.005))
        # front header wall above the shutter opening + a flat lintel stripe
        kit.add(wall_kind, wb('header', c - UW / 2 + WT / 2, c + UW / 2 - WT / 2, FRONT, FRONT + WT, OPEN_H, h, 0.01), WALL_COLOR.get(i))
        kit.add('trim', wb('lintel', c - UW / 2 + WT / 2, c + UW / 2 - WT / 2, FRONT - 0.04, FRONT + WT + 0.02, OPEN_H - 0.12, OPEN_H + 0.02, 0.008))
        # roof slab for this unit (stepped skyline) + parapet lip
        kit.add('trim', wb('roof', c - UW / 2 - 0.1, c + UW / 2 + 0.1, FRONT - 0.3, BACK + 0.3, h, h + 0.14, 0.012))
        # front parapet lip kept BEHIND the code signboard plane (z = FRONT - 0.05) and low, so the bilingual boards stay legible
        kit.add(wall_kind, wb('parapet_front', c - UW / 2 + 0.1, c + UW / 2 - 0.1, FRONT + 0.05, FRONT + WT + 0.02, h + 0.14, h + 0.5, 0.01))
        kit.add(wall_kind, wb('parapet_back', c - UW / 2 + 0.1, c + UW / 2 - 0.1, BACK - WT, BACK + 0.1, h + 0.14, h + 0.6, 0.01))
        kit.add('trim', wb('parapet_cap_f', c - UW / 2 + 0.06, c + UW / 2 - 0.06, FRONT + 0.03, FRONT + WT + 0.04, h + 0.5, h + 0.56, 0.01))
        kit.add('trim', wb('parapet_cap_b', c - UW / 2 + 0.06, c + UW / 2 - 0.06, BACK - WT - 0.04, BACK + 0.14, h + 0.6, h + 0.68, 0.01))
        # interior floor, slightly proud, polished-concrete grey
        kit.add('floor', wb('floor', c - UW / 2 + 0.03, c + UW / 2 - 0.03, FRONT, BACK - WT, 0.0, 0.06, 0))
    # nine party walls, full height, with an ochre skirt on the front faces
    for k in range(9):
        x = bx(k)
        kit.add('plaster', wb('party', x - WT / 2, x + WT / 2, FRONT, BACK, 0, PARTY_H, 0.01))
        kit.add('plinth', wb('party_band', x - WT / 2 - 0.03, x + WT / 2 + 0.03, FRONT - 0.03, FRONT + 0.4, 0, 1.05, 0.008))
        kit.add('plaster', wb('pier', x - 0.2, x + 0.2, FRONT - 0.1, FRONT + 0.3, 0, OPEN_H, 0.01))
        kit.add('plaster', wb('party_pilaster', x - 0.15, x + 0.15, FRONT - 0.2, FRONT + 0.1, h_roof(k), h_roof(k) + 0.5 + abs(HEIGHTS[max(0, k - 1)] - HEIGHTS[min(7, k)]), 0.01))
    # end caps: outer side faces (units 1 and 8) get a plinth band too
    kit.add('plinth', wb('end_band_w', bx(0) - 0.14, bx(0) - 0.1, FRONT, BACK, 0, 0.7, 0.005))
    kit.add('plinth', wb('end_band_e', bx(8) + 0.1, bx(8) + 0.14, FRONT, BACK, 0, 0.7, 0.005))
    # the blue stepped pediment over unit 5 (reference: a small stepped block on the parapet)
    c = cx(4)
    kit.add('trim', wb('pediment_a', c - 1.6, c + 1.6, FRONT - 0.15, FRONT + 0.3, HEIGHTS[4] + 0.68, HEIGHTS[4] + 1.0, 0.01))
    kit.add('trim', wb('pediment_b', c - 0.9, c + 0.9, FRONT - 0.15, FRONT + 0.3, HEIGHTS[4] + 1.0, HEIGHTS[4] + 1.3, 0.01))
    # continuous front step + a small block step per unit
    kit.add('apron', wb('step', -18.3, 18.3, FRONT - 0.6, FRONT, 0, 0.2, 0.012))
    for i in range(8):
        kit.add('apron', wb('unit_step', cx(i) - 0.9, cx(i) + 0.9, FRONT - 0.95, FRONT - 0.6, 0, 0.12, 0.01))
    # four barred windows high on the back wall: recess, painted frame, iron bars + rail, projecting sill
    for k in (0, 2, 4, 6):
        back_window_z(cx(k) + 1.1, BACK, 0.8, 2.4, 2.95)
    # a panelled staff door in every unit's back wall (hinges, brass handle, recess, step)
    for i in range(8):
        back_door_z(cx(i) - 0.9, BACK, 0.9, 2.0, [0x3F5B6A, 0x5A3A24, 0x2F5A3C, 0x6A2E2A][i % 4])
    # drainpipes + switchboards here and there on the back wall
    for k in (2, 6):
        kit.add('paint', limb('drain', (bx(k), BACK + 0.08, 0.15), (bx(k), BACK + 0.08, HEIGHTS[k] if k < 8 else 4), 0.09, 0.09), 0x9A9EA3)
    for i in (3, 6):
        kit.add('paint', wb('switchboard', cx(i) + 1.5 - 0.15, cx(i) + 1.5 + 0.15, BACK + 0.025, BACK + 0.08, 1.15, 1.45, 0.004), 0xE9E7DD)


def back_window_z(xc, zface, w, y0, y1):
    """Barred window on the back wall (face at constant z, facing +z)."""
    x0, x1 = xc - w / 2, xc + w / 2
    kit.add('paint', wb('recess', x0, x1, zface, zface + 0.02, y0, y1, 0), 0x1D1A17)
    for xx0, xx1, h0, h1 in ((x0 - 0.07, x1 + 0.07, y1, y1 + 0.07), (x0 - 0.07, x1 + 0.07, y0 - 0.07, y0), (x0 - 0.07, x0, y0 - 0.07, y1 + 0.07), (x1, x1 + 0.07, y0 - 0.07, y1 + 0.07)):
        kit.add('paint', wb('wframe', xx0, xx1, zface, zface + 0.07, h0, h1, 0.004), 0x4A4640)
    n = max(3, int(w / 0.14))
    for j in range(n):
        xx = x0 + (j + 0.5) * w / n
        kit.add('paint', wb('bar', xx - 0.012, xx + 0.012, zface + 0.03, zface + 0.05, y0, y1, 0), 0x26262A)
    kit.add('paint', wb('rail', x0, x1, zface + 0.03, zface + 0.05, (y0 + y1) / 2 - 0.012, (y0 + y1) / 2 + 0.012, 0), 0x26262A)
    kit.add('trim', wb('sill', x0 - 0.08, x1 + 0.08, zface, zface + 0.16, y0 - 0.1, y0 - 0.03, 0.005))


def back_door_z(xc, zface, w, h, leaf):
    """Staff door in the back wall facing +z: recess, frame, leaf with raised panels and a rail, hinges, brass handle, step."""
    x0, x1 = xc - w / 2, xc + w / 2
    kit.add('paint', wb('drecess', x0 - 0.08, x1 + 0.08, zface, zface + 0.03, 0.0, h, 0), 0x14110E)
    kit.add('paint', wb('dframe', x0 - 0.09, x1 + 0.09, zface, zface + 0.09, h, h + 0.09, 0.004), 0x2F2016)
    for xx0, xx1 in ((x0 - 0.09, x0), (x1, x1 + 0.09)):
        kit.add('paint', wb('dframe', xx0, xx1, zface, zface + 0.09, 0.0, h + 0.09, 0.004), 0x2F2016)
    kit.add('paint', wb('leaf', x0, x1, zface + 0.02, zface + 0.07, 0.02, h, 0.004), leaf)
    for h0, h1 in ((0.2, h * 0.45), (h * 0.55, h - 0.2)):
        kit.add('paint', wb('dpanel', x0 + 0.1, x1 - 0.1, zface + 0.07, zface + 0.1, h0, h1, 0.004), 0x3D2818)
    kit.add('paint', wb('drail', x0, x1, zface + 0.07, zface + 0.1, h * 0.47, h * 0.53, 0.004), 0x2F2016)
    for hy in (0.3, h - 0.3):
        kit.add('paint', wb('hinge', x0, x0 + 0.16, zface + 0.07, zface + 0.1, hy, hy + 0.05, 0), 0x26262A)
    kit.add('paint', cyl('handle', x1 - 0.12, zface + 0.12, h * 0.5 - 0.02, h * 0.5 + 0.02, 0.025, 0.025, 8), BRASS)
    kit.add('apron', wb('dstep', x0 - 0.25, x1 + 0.25, zface, zface + 0.4, 0.0, 0.12, 0.01))


def h_roof(k):
    hs = [HEIGHTS[max(0, k - 1)], HEIGHTS[min(7, k)]]
    return max(hs) + 0.14


def awning():
    # one continuous sloped corrugated-tin awning over the whole frontage, on diagonal metal brackets
    kit.add('tin', prism_x('awning', -18.3, 18.3, [(FRONT + 0.02, 3.45), (FRONT - 1.82, 2.84), (FRONT - 1.82, 2.9), (FRONT + 0.02, 3.51)]))
    kit.add('trim', wb('awning_fascia', -18.3, 18.3, FRONT - 1.86, FRONT - 1.78, 2.74, 2.92, 0.005))
    for k in range(9):
        x = bx(k)
        kit.add('paint', limb('bracket_d', (x, FRONT - 0.02, 3.2), (x, FRONT - 1.7, 2.8), 0.045, 0.045), 0x30343A)
        kit.add('paint', limb('bracket_h', (x, FRONT - 0.02, 2.85), (x, FRONT - 1.0, 2.82), 0.04, 0.04), 0x30343A)
        kit.add('paint', limb('post', (x, FRONT - 1.76, 0.2), (x, FRONT - 1.76, 2.8), 0.08, 0.08), 0x30343A)


def shutters_and_counters():
    for i in range(8):
        c = cx(i)
        col = SHUTTER[i]
        ow = UW - WT - 0.2
        # roller housing + rolled-up slats (in the trade colour) just under the header, guide rails down both jambs
        kit.add('paint', wb('housing', c - ow / 2 - 0.05, c + ow / 2 + 0.05, FRONT - 0.12, FRONT + 0.22, OPEN_H - 0.38, OPEN_H - 0.02, 0.01), 0x4A4640)
        # bold trade-coloured shutter box across the full opening (reference: a coloured header band above each shutter)
        kit.add('paint', wb('shutter_box', c - ow / 2 - 0.05, c + ow / 2 + 0.05, FRONT - 0.2, FRONT + 0.2, OPEN_H - 0.5, OPEN_H - 0.02, 0.012), col)
        kit.add('paint', limb('coil', (c - ow / 2, FRONT - 0.02, OPEN_H - 0.2), (c + ow / 2, FRONT - 0.02, OPEN_H - 0.2), 0.3, 0.3, 0.02), col)
        # the shutter curtain pulled down about half-way (so the trade colour reads from the lane, as in the reference)
        # while the counter and the shop behind stay visible underneath
        kit.add('paint', wb('curtain', c - ow / 2 + 0.03, c + ow / 2 - 0.03, FRONT - 0.03, FRONT + 0.03, 1.02, OPEN_H - 0.36, 0.004), col)
        n_slat = int((OPEN_H - 0.36 - 1.02) / 0.09)
        for k in range(1, n_slat):
            kit.add('paint', wb('slat', c - ow / 2 + 0.03, c + ow / 2 - 0.03, FRONT - 0.045, FRONT - 0.03, 1.02 + k * 0.09, 1.02 + k * 0.09 + 0.018, 0), (col >> 1) & 0x7F7F7F)
        kit.add('paint', wb('curtain_bar', c - ow / 2 + 0.03, c + ow / 2 - 0.03, FRONT - 0.06, FRONT + 0.04, 0.96, 1.04, 0.006), 0x3A3733)
        kit.add('paint', wb('curtain_lock', c - 0.08, c + 0.08, FRONT - 0.08, FRONT - 0.05, 0.98, 1.02, 0), 0xB0B4B8)
        for sgn in (-1, 1):
            kit.add('paint', wb('rail', c + sgn * (ow / 2) - 0.03, c + sgn * (ow / 2) + 0.03, FRONT - 0.04, FRONT + 0.12, 0.06, OPEN_H - 0.38, 0.004), 0x3A3733)
        # counter (0.9 high, 0.5 deep, 3.8 wide): planked front painted in the trade colour, wooden top
        cw = UW - 0.7
        kit.add('wood', wb('counter_top', c - cw / 2 - 0.04, c + cw / 2 + 0.04, COUNTER_Z0 - 0.04, COUNTER_Z1 + 0.04, 0.88, 0.95, 0.008))
        kit.add('paint', wb('counter_body', c - cw / 2, c + cw / 2, COUNTER_Z0, COUNTER_Z1, 0.0, 0.88, 0.008), 0xB19468)
        for h in (0.2, 0.42, 0.64):
            kit.add('paint', wb('plank_line', c - cw / 2 + 0.02, c + cw / 2 - 0.02, COUNTER_Z0 - 0.012, COUNTER_Z0, h, h + 0.014, 0), 0x4F3E2E)
        kit.add('paint', wb('counter_trim', c - cw / 2 - 0.02, c + cw / 2 + 0.02, COUNTER_Z0 - 0.02, COUNTER_Z0 + 0.04, 0.0, 0.12, 0.004), col)


# ----------------------------------------------------------------------------- interiors
def shelves(i, levels=(1.2, 2.05), full=True, w=None):
    c = cx(i)
    w = w or UW - 0.7
    for h in levels:
        kit.add('wood', wb('shelf', c - w / 2, c + w / 2, BZ - 0.16, BZ + 0.16, h, h + 0.05, 0.005))
    for sgn in (-1, 1):
        kit.add('wood', wb('shelf_side', c + sgn * w / 2 - 0.03, c + sgn * w / 2 + 0.03, BZ - 0.16, BZ + 0.16, 0.05, levels[-1] + 0.4, 0.004))


def kirana(i):
    c = cx(i)
    shelves(i)
    for k, h in enumerate((1.25, 2.1)):
        for j in range(9):
            x = c - 1.75 + j * 0.44
            kit.add('paint', wb('packet', x - 0.09, x + 0.09, BZ - 0.1, BZ - 0.04, h, h + 0.22 + 0.04 * (j % 3), 0.004), (0xF2C21E, 0xD9382B, 0x2E9E5B, 0xF08A24, 0x2E86C1, 0xE0509A)[(j + k) % 6])
    for j in range(5):
        dabba(kit, c - 1.5 + j * 0.62, BZ - 0.02, 2.1 + 0.05, 0.1, 0.24, (STEEL, 0x9AA0A6)[j % 2])
    for j, col in enumerate((0xC9A86A, 0xB99456)):  # open sacks of grain/dal on the floor
        sack(kit, c - 1.7 + j * 0.55, CZ + 1.3, 0.0, 0.0, col, 0.5, 0.35, 0.5)
        kit.add('paint', cyl('grain', c - 1.7 + j * 0.55, CZ + 1.3, 0.48, 0.52, 0.2, 0.2, 10), (0xD8B25A, 0xA9362B)[j])
    for j in range(4):
        kit.add('paint', cyl('jar', c + 0.3 + j * 0.3, CZ - 0.0, 0.95, 1.2, 0.09, 0.09, 12), (0xE6C27A, 0xD9A45A, 0xE8D8B0, 0xD7B070)[j])
        kit.add('paint', cyl('jar_lid', c + 0.3 + j * 0.3, CZ - 0.0, 1.2, 1.24, 0.095, 0.095, 12), 0xC0392B)
    kit.add('paint', cyl('scale_base', c - 0.9, CZ + 0.05, 0.95, 0.99, 0.13, 0.13, 12), 0x30343A)
    kit.add('paint', sphere('scale_dial', c - 0.9, CZ + 0.05, 1.3, 0.1, 0.03, 0.1, 1), 0xE9E7DD)
    kit.add('paint', limb('scale_post', (c - 0.9, CZ + 0.05, 0.99), (c - 0.9, CZ + 0.05, 1.3), 0.03, 0.03), 0x30343A)
    # strings of hanging snack packets on the front jambs
    for sgn in (-1, 1):
        x = c + sgn * 1.85
        for k in range(7):
            kit.add('paint', wb('hang_packet', x - 0.07, x + 0.07, FRONT + 0.3, FRONT + 0.35, 1.9 - k * 0.2, 2.05 - k * 0.2, 0.004), (0xF2C21E, 0xD9382B, 0x2E9E5B, 0xF08A24)[(k + (sgn > 0)) % 4])


def sabzi(i):
    c = cx(i)
    # low produce platform + crates of vegetables, the pan balance
    kit.add('wood', wb('platform', c - 2.0, c + 2.0, CZ + 0.75, CZ + 1.75, 0.0, 0.3, 0.01))
    produce = [(0xC0392B, 'tomato'), (0x7A4A9A, 'brinjal'), (0xD9A24A, 'onion'), (0x4F8F3A, 'greens'), (0xA9362B, 'chilli'), (0xB88B5A, 'potato')]
    for j, (col, nm) in enumerate(produce):
        x = c - 1.7 + j * 0.68
        kit.add('wood', wb('crate', x - 0.3, x + 0.3, CZ + 0.85, CZ + 1.4, 0.3, 0.52, 0.008))
        for _ in range(10):
            kit.add('paint', sphere('veg', x + rnd.uniform(-0.2, 0.2), CZ + 1.12 + rnd.uniform(-0.18, 0.18), 0.58 + rnd.uniform(0, 0.08), 0.07, 0.07, 0.06, 1), col)
    for j in range(5):  # hanging bunches of greens / bananas on a rail
        kit.add('paint', limb('hang', (c - 1.6 + j * 0.8, BZ - 0.2, 2.35), (c - 1.6 + j * 0.8, BZ - 0.2, 1.7), 0.05, 0.05), (0x4F8F3A, 0xE8C84A, 0x4F8F3A, 0xE8C84A, 0x4F8F3A)[j])
    kit.add('wood', wb('hang_rail', c - 2.0, c + 2.0, BZ - 0.25, BZ - 0.15, 2.35, 2.4, 0.005))
    # hanging pan balance — post, beam, chains, two pans with brass weights
    bxp = c
    kit.add('paint', limb('bal_post', (bxp, BZ - 0.3, 1.0), (bxp, BZ - 0.3, 2.3), 0.04, 0.04), 0x2A2A2A)
    kit.add('paint', limb('bal_beam', (bxp - 0.5, BZ - 0.3, 2.25), (bxp + 0.5, BZ - 0.3, 2.25), 0.04, 0.04), 0x2A2A2A)
    for s in (-1, 1):
        px = bxp + s * 0.5
        for dz in (-0.12, 0.12):
            kit.add('paint', limb('chain', (px, BZ - 0.3 + dz, 2.25), (px, BZ - 0.3, 1.85), 0.01, 0.01), 0x555555)
        kit.add('paint', cyl('pan', px, BZ - 0.3, 1.82, 1.86, 0.17, 0.15, 14), BRASS)
    for k in range(3):
        kit.add('paint', cyl('weight', bxp - 0.5 + k * 0.08, BZ - 0.3, 1.86, 1.92 + k * 0.02, 0.03, 0.035, 8), 0x7A6A3A)


def medical(i):
    c = cx(i)
    shelves(i, (1.2, 2.05, 2.6))
    tones = [0xB8CCD8, 0xD8C8A8, 0xC8D8B8, 0xD8B8B8, 0xB8C8D8, 0xF0F0E8]
    for k, h in enumerate((1.25, 2.1, 2.65)):
        for j in range(12):
            x = c - 1.9 + j * 0.34
            kit.add('paint', wb('med_box', x - 0.09, x + 0.09, BZ - 0.12, BZ - 0.03, h, h + 0.12 + 0.03 * (j % 3), 0.004), tones[(j + k) % 6])
    # glass-fronted display counter top + a fridge + a weighing machine + a green-cross-free sign stand
    kit.add('paint', wb('fridge', c + 1.4, c + 2.0, BZ - 0.55, BZ - 0.1, 0.0, 1.6, 0.02), 0xE8E6DD)
    kit.add('paint', wb('fridge_door', c + 1.4, c + 2.0, BZ - 0.57, BZ - 0.55, 0.05, 1.55, 0.006), 0xD5D8D8)
    kit.add('paint', wb('fridge_handle', c + 1.45, c + 1.49, BZ - 0.6, BZ - 0.57, 0.7, 1.1, 0), 0x666A6E)
    kit.add('paint', wb('case', c - 1.4, c - 0.3, CZ - 0.05, CZ + 0.3, 0.95, 1.2, 0.01), 0xCFE3E0)
    kit.add('paint', wb('case_frame', c - 1.42, c - 0.28, CZ - 0.07, CZ + 0.32, 1.2, 1.24, 0.006), 0x4A4640)
    kit.add('paint', wb('scale', c + 0.4, c + 0.9, CZ + 0.35, CZ + 0.85, 0.0, 0.1, 0.01), 0x30343A)
    kit.add('paint', sphere('scale_dial', c + 0.65, CZ + 0.6, 0.15, 0.12, 0.12, 0.03, 1), 0xE9E7DD)


def tailor(i):
    c = cx(i)
    shelves(i)
    cloth = [0xA83A4A, 0x3A5A8A, 0xC9A227, 0x4A7A5A, 0x8A4A8A, 0xE8D8B8]
    for j in range(6):
        kit.add('paint', limb('bolt', (c - 1.9 + j * 0.76, BZ - 0.05, 2.12), (c - 1.9 + j * 0.76, BZ - 0.05, 2.62), 0.28, 0.28, 0.06), cloth[j])
    for j in range(5):
        kit.add('paint', limb('bolt', (c - 1.6 + j * 0.76, BZ - 0.05, 1.25), (c - 1.6 + j * 0.76, BZ - 0.05, 1.7), 0.26, 0.26, 0.06), cloth[(j + 2) % 6])
    # treadle sewing machine on the counter + a kurta on a hanger (the one the quest collects) + measuring tape
    kit.add('paint', wb('machine_base', c - 0.3, c + 0.3, CZ - 0.05, CZ + 0.25, 0.95, 1.02, 0.008), 0x1A1A1A)
    kit.add('paint', wb('machine_arm', c - 0.28, c + 0.2, CZ + 0.1, CZ + 0.22, 1.02, 1.3, 0.02), 0x1A1A1A)
    kit.add('paint', wb('machine_head', c - 0.1, c + 0.2, CZ + 0.02, CZ + 0.22, 1.28, 1.36, 0.02), 0x2A2A2A)
    kit.add('paint', ring('hand_wheel', c + 0.28, CZ + 0.14, 1.2, 0.09, 0.012, axis='x'), 0x888888)
    kit.add('paint', limb('hanger', (c - 1.4, BZ - 0.5, 2.3), (c - 0.9, BZ - 0.5, 2.3), 0.02, 0.02), 0x8A6A4A)
    kit.add('paint', limb('kurta', (c - 1.15, BZ - 0.5, 2.3), (c - 1.15, BZ - 0.5, 1.3), 0.5, 0.05, 0.02), 0xE8DCC0)
    for sgn in (-1, 1):
        kit.add('paint', limb('sleeve', (c - 1.15 + sgn * 0.25, BZ - 0.5, 2.2), (c - 1.15 + sgn * 0.5, BZ - 0.5, 1.8), 0.14, 0.04), 0xE8DCC0)
    kit.add('paint', ring('tape', c - 0.8, CZ + 0.1, 0.99, 0.06, 0.012, axis='y'), 0xE8C84A)
    # mannequin torso with a half-stitched shirt
    kit.add('paint', limb('mannequin', (c + 1.6, CZ + 1.4, 0.0), (c + 1.6, CZ + 1.4, 1.1), 0.04, 0.04), 0x3A3A3A)
    kit.add('paint', sphere('torso', c + 1.6, CZ + 1.4, 1.4, 0.2, 0.14, 0.32, 2), 0xC9A227)
    kit.add('paint', sphere('mhead', c + 1.6, CZ + 1.4, 1.85, 0.08, 0.08, 0.1, 1), 0xCFA77B)


def barber(i):
    c = cx(i)
    # wall mirror with a shelf of combs/bottles, the swivel chair (red), towel hooks
    kit.add('wood', wb('mirror_frame', c - 0.6, c + 0.6, BZ - 0.05, BZ + 0.02, 1.15, 2.25, 0.01))
    kit.add('paint', wb('mirror', c - 0.54, c + 0.54, BZ - 0.06, BZ - 0.04, 1.2, 2.2, 0), 0xBFD0D8)
    kit.add('wood', wb('mirror_shelf', c - 1.0, c + 1.0, BZ - 0.3, BZ - 0.02, 0.95, 1.0, 0.006))
    for j in range(6):
        kit.add('paint', cyl('bottle', c - 0.8 + j * 0.3, BZ - 0.15, 1.0, 1.2 + 0.03 * (j % 3), 0.04, 0.035, 8), (0x3E8E54, 0xC9A227, 0x2E86C1, 0xD9382B, 0xE0E0E0, 0x7B4FB0)[j])
    cxs = c
    cz = CZ + 1.5
    kit.add('paint', cyl('chair_base', cxs, cz, 0.0, 0.05, 0.28, 0.3, 14), 0x30343A)
    kit.add('paint', cyl('chair_post', cxs, cz, 0.05, 0.45, 0.06, 0.06, 10), 0x6B6F72)
    kit.add('paint', wb('chair_seat', cxs - 0.25, cxs + 0.25, cz - 0.25, cz + 0.25, 0.45, 0.58, 0.04), 0x8A2E2E)
    kit.add('paint', wb('chair_back', cxs - 0.24, cxs + 0.24, cz + 0.2, cz + 0.3, 0.58, 1.25, 0.04), 0x8A2E2E)
    for sgn in (-1, 1):
        kit.add('paint', wb('chair_arm', cxs + sgn * 0.27 - 0.03, cxs + sgn * 0.27 + 0.03, cz - 0.2, cz + 0.22, 0.6, 0.66, 0.01), 0x30343A)
    kit.add('paint', limb('chair_foot', (cxs, cz - 0.3, 0.12), (cxs, cz - 0.55, 0.12), 0.3, 0.04), 0x6B6F72)
    for j in range(4):
        kit.add('paint', limb('towel_hook', (c + 1.4 + j * 0.15, BZ - 0.05, 1.7), (c + 1.4 + j * 0.15, BZ - 0.05, 1.3), 0.12, 0.02), (0xE8E6DD, 0x3A5A8A, 0xE8E6DD, 0xC0392B)[j])
    kit.add('wood', wb('bench', c - 1.9, c - 0.9, CZ + 0.9, CZ + 1.3, 0.0, 0.45, 0.01))
    kit.add('paint', wb('clippers', c + 0.6, c + 0.75, CZ - 0.0, CZ + 0.1, 0.95, 1.05, 0.01), 0x1A1A1A)


def mobile(i):
    c = cx(i)
    shelves(i)
    tones = [0x2A2A2A, 0x3A3A3A, 0x8A2E2E, 0x2A5A2A, 0x2E6BD0, 0xE8E6DD]
    for k, h in enumerate((1.25, 2.1)):
        for j in range(13):
            x = c - 1.95 + j * 0.325
            kit.add('paint', wb('phone_box', x - 0.08, x + 0.08, BZ - 0.1, BZ - 0.02, h, h + 0.18, 0.004), tones[(j + k) % 6])
    # desk with a monitor, keyboard, CPU tower; a rack of charging cables and generic recharge cards
    kit.add('wood', wb('desk', c - 0.9, c + 0.9, CZ - 0.0, CZ + 0.5, 0.0, 0.05, 0.005))
    kit.add('paint', wb('monitor', c - 0.25, c + 0.25, CZ + 0.15, CZ + 0.22, 1.0, 1.34, 0.01), 0x1A1A1A)
    kit.add('paint', wb('screen', c - 0.22, c + 0.22, CZ + 0.13, CZ + 0.15, 1.03, 1.31, 0), 0x3A5A6A)
    kit.add('paint', wb('stand', c - 0.06, c + 0.06, CZ + 0.15, CZ + 0.22, 0.95, 1.0, 0.004), 0x1A1A1A)
    kit.add('paint', wb('keyboard', c - 0.25, c + 0.25, CZ - 0.1, CZ + 0.05, 0.95, 0.975, 0.004), 0x2A2A2A)
    kit.add('paint', wb('tower', c + 0.6, c + 0.8, CZ + 0.1, CZ + 0.45, 0.95, 1.4, 0.01), 0xD8D6CE)
    for j in range(6):
        kit.add('paint', wb('card', c + 1.3 + (j % 3) * 0.2 - 0.07, c + 1.3 + (j % 3) * 0.2 + 0.07, BZ - 0.1, BZ - 0.06, 1.5 + (j // 3) * 0.25, 1.7 + (j // 3) * 0.25, 0), (0xE0509A, 0x2E86C1, 0xF2C21E, 0x2E9E5B, 0xF08A24, 0xD9382B)[j])
    kit.add('paint', limb('cable_rack', (c - 1.9, BZ - 0.1, 2.6), (c - 0.9, BZ - 0.1, 2.6), 0.03, 0.03), 0x30343A)
    for j in range(7):
        kit.add('paint', limb('cable', (c - 1.85 + j * 0.15, BZ - 0.1, 2.6), (c - 1.85 + j * 0.15, BZ - 0.1, 2.15), 0.012, 0.012), (0xF0F0F0, 0x1A1A1A, 0xE0509A)[j % 3])


def bangle(i):
    c = cx(i)
    tints = [0xC94F6A, 0x4F9FC9, 0xC9A227, 0x4FC98A, 0xA04FC9, 0xE88A3A]
    # rods stacked with glass bangles; boards of hanging bangles; a mirror; the try-on counter stool
    for rod in range(4):
        rx = c - 1.7 + rod * 1.15
        kit.add('paint', limb('rod', (rx, BZ - 0.1, 1.0), (rx, BZ - 0.1, 2.3), 0.03, 0.03), 0x8A6A4A)
        for k in range(14):
            kit.add('paint', ring('bangle', rx, BZ - 0.1, 1.05 + k * 0.09, 0.1, 0.014, axis='y'), tints[(rod + k) % 6])
    kit.add('wood', wb('board', c - 2.0, c + 2.0, BZ - 0.06, BZ - 0.02, 2.4, 2.9, 0.006))
    for k in range(18):
        kit.add('paint', ring('bangle_board', c - 1.8 + (k % 9) * 0.45, BZ - 0.1, 2.55 + (k // 9) * 0.22, 0.1, 0.012, axis='z'), tints[k % 6])
    kit.add('wood', wb('mirror_frame', c + 1.2, c + 1.95, CZ - 0.0, CZ + 0.04, 1.0, 1.7, 0.008))
    kit.add('paint', wb('mirror', c + 1.25, c + 1.9, CZ - 0.0, CZ - 0.02, 1.05, 1.65, 0), 0xBFD0D8)
    kit.add('paint', cyl('stool', c - 0.3, CZ + 0.75, 0.0, 0.45, 0.2, 0.2, 12), 0xA14A3A)
    kit.add('paint', cyl('stool_top', c - 0.3, CZ + 0.75, 0.45, 0.5, 0.24, 0.24, 12), 0xC0392B)
    kit.add('paint', wb('tray', c - 0.7, c + 0.7, CZ - 0.0, CZ + 0.38, 0.95, 0.99, 0.008), 0x6B2A3A)
    for j in range(10):
        kit.add('paint', ring('tray_bangle', c - 0.6 + j * 0.12, CZ + 0.19, 1.01, 0.04, 0.01, axis='y'), tints[j % 6])


def puncture(i):
    c = cx(i)
    # puncture tub with a tyre in it, hand pump, an upside-down cycle on a bench, hanging tubes/tyres, a spanner board
    kit.add('paint', cyl('tub', c - 1.1, CZ + 1.0, 0.0, 0.3, 0.34, 0.38, 14), 0x6A6A62)
    kit.add('paint', cyl('tub_water', c - 1.1, CZ + 1.0, 0.27, 0.285, 0.31, 0.31, 14), 0x3A5A66)
    kit.add('paint', ring('tyre_in_tub', c - 1.1, CZ + 1.0, 0.31, 0.26, 0.055, axis='y'), 0x1C1C1C)
    kit.add('paint', cyl('pump_barrel', c + 1.1, BZ - 0.3, 0.0, 0.75, 0.05, 0.05, 10), 0x8A1F1F)
    kit.add('paint', limb('pump_handle', (c + 0.98, BZ - 0.3, 0.8), (c + 1.22, BZ - 0.3, 0.8), 0.03, 0.03), 0x2A2A2A)
    kit.add('paint', limb('pump_hose', (c + 1.1, BZ - 0.3, 0.6), (c + 0.8, BZ - 0.1, 0.1), 0.02, 0.02), 0x1C1C1C)
    kit.add('wood', wb('bench', c - 0.9, c + 0.9, BZ - 0.45, BZ - 0.05, 0.0, 0.85, 0.01))
    kit.add('wood', wb('bench_top', c - 0.95, c + 0.95, BZ - 0.5, BZ - 0.0, 0.85, 0.92, 0.008))
    for sgn in (-1, 1):  # cycle flipped: wheels up, resting on saddle + handlebars
        kit.add('paint', ring('wheel', c + sgn * 0.5, BZ - 0.25, 1.28, 0.3, 0.025, axis='x'), 0x1C1C1C)
        kit.add('paint', limb('spoke_a', (c + sgn * 0.5, BZ - 0.25, 0.98), (c + sgn * 0.5, BZ - 0.25, 1.58), 0.01, 0.01), 0x9A9EA3)
        kit.add('paint', limb('spoke_b', (c + sgn * 0.5, BZ - 0.5, 1.28), (c + sgn * 0.5, BZ - 0.0, 1.28), 0.01, 0.01), 0x9A9EA3)
    kit.add('paint', limb('frame_bar', (c - 0.5, BZ - 0.25, 1.0), (c + 0.5, BZ - 0.25, 1.0), 0.05, 0.05), 0x2A3A42)
    kit.add('paint', limb('frame_up', (c - 0.5, BZ - 0.25, 1.0), (c - 0.1, BZ - 0.25, 1.2), 0.04, 0.04), 0x2A3A42)
    kit.add('paint', wb('saddle', c - 0.05, c + 0.15, BZ - 0.32, BZ - 0.18, 0.93, 1.0, 0.02), 0x1A1A1A)
    kit.add('wood', wb('tool_board', c - 1.9, c - 0.2, BZ - 0.06, BZ - 0.02, 1.6, 2.4, 0.006))
    for j in range(6):  # spanners hung on the board
        kit.add('paint', limb('spanner', (c - 1.7 + j * 0.28, BZ - 0.1, 2.3), (c - 1.7 + j * 0.28, BZ - 0.1, 1.8 - 0.04 * (j % 3)), 0.04, 0.02), 0x9A9EA3)
    for j in range(5):  # tubes and tyres hanging from the front beam
        kit.add('paint', ring('hang_tube', c - 1.8 + j * 0.9, FRONT + 0.55, 1.75, 0.22, 0.04, axis='x') if j % 2 else ring('hang_tyre', c - 1.8 + j * 0.9, FRONT + 0.55, 1.75, 0.3, 0.05, axis='x'), 0x1C1C1C)
    kit.add('paint', limb('hang_beam', (c - 2.0, FRONT + 0.55, 2.2), (c + 2.0, FRONT + 0.55, 2.2), 0.05, 0.05), 0x4A4640)


def frontage_dressing():
    # (from the reference) a cycle leaning at units 2-3, plastic chairs, a wooden bench, potted plants on the step
    bx0, bz = cx(2) - 1.2, FRONT - 0.78
    kit.add('paint', ring('cyc_wheel_f', bx0, bz, 0.35, 0.34, 0.025, axis='x'), 0x1C1C1C)
    kit.add('paint', ring('cyc_wheel_r', bx0 + 1.05, bz, 0.35, 0.34, 0.025, axis='x'), 0x1C1C1C)
    kit.add('paint', limb('cyc_f1', (bx0, bz, 0.35), (bx0 + 0.5, bz, 0.7), 0.03, 0.03), 0x2A3A42)
    kit.add('paint', limb('cyc_f2', (bx0 + 0.5, bz, 0.7), (bx0 + 1.05, bz, 0.35), 0.03, 0.03), 0x2A3A42)
    kit.add('paint', limb('cyc_f3', (bx0 + 0.5, bz, 0.7), (bx0 + 1.0, bz, 0.75), 0.03, 0.03), 0x2A3A42)
    kit.add('paint', limb('cyc_bar', (bx0 + 0.05, bz - 0.22, 0.8), (bx0 + 0.05, bz + 0.22, 0.8), 0.025, 0.025), 0x333333)
    kit.add('paint', limb('cyc_fork', (bx0, bz, 0.35), (bx0 + 0.05, bz, 0.8), 0.03, 0.03), 0x333333)
    kit.add('paint', wb('cyc_seat', bx0 + 0.9, bx0 + 1.12, bz - 0.06, bz + 0.06, 0.75, 0.8, 0.01), 0x222222)
    plastic_chair(kit, cx(4) - 1.7, FRONT - 0.9, 0.0, 0x9FA3BA)
    plastic_chair(kit, cx(5) - 1.3, FRONT - 0.9, 0.0, 0x4FA8A8, arms=True)
    kit.add('wood', wb('b_seat', cx(5) - 0.4, cx(5) + 1.1, FRONT - 1.05, FRONT - 0.7, 0.42, 0.48, 0.01))
    for x in (cx(5) - 0.3, cx(5) + 1.0):
        kit.add('wood', wb('b_leg', x - 0.04, x + 0.04, FRONT - 1.0, FRONT - 0.75, 0.2, 0.42, 0.004))
    plastic_chair(kit, cx(7) - 1.0, FRONT - 0.9, 0.0, 0xC9A57A)
    plastic_chair(kit, cx(7) - 1.6, FRONT - 0.85, 0.0, 0x4FA8A8, arms=True)
    for x in (cx(5) + 1.7, cx(7) + 1.7, cx(7) + 2.0):
        pot(kit, x, FRONT - 0.78, 0.0, 0.2, 0.28)


shell()
awning()
shutters_and_counters()
for idx, fn in enumerate((kirana, sabzi, medical, tailor, barber, mobile, bangle, puncture)):
    fn(idx)
frontage_dressing()

TINTS = {'hb_plaster': '#FFF4D4', 'hb_trim': '#C5CFDC', 'hb_plinth': '#E0A83F', 'hb_apron': '#A59A88', 'hb_floor': '#A6A196',
         'hb_wood': '#B89A74', 'hb_tin': '#C8D0D4'}
kit.finalize(OUT, TINTS, drift_amp=0.06, ao_strength=0.35)
