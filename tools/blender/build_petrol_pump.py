"""
Roadside petrol pump (playtest block item 5) - Blender model, unbranded. Run: tools/blender/make.sh petrol_pump petrol_pump
Searched first: Poly Haven (no fuel pump), Quaternius/Kenney/poly.pizza (none CC0), so hand-built.
LOCAL frame anchored at the old pump site (highway cluster 205,40 + (-19,-35) = world 186,5). Road is at +X.
Forecourt slab 22 x 16, canopy 14 x 9 on four columns (top 5.0), two pump islands with dispensers, price pole by the road,
air/water post, oil-drum stack, small office (-8,-6) with door+window.
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import wb, limb, cyl, sphere, prism_x, boolean_cut, ROOT
from arch import Kit, ring, dabba, STEEL

OUT = os.path.join(ROOT, 'tmp', 'petrol_pump_raw.glb')
kit = Kit(split_props=True)
rnd = random.Random(31)
RED, WHITE, GREY, DARK, YEL = 0xB3322B, 0xE6E1D3, 0x6E6E6A, 0x25231F, 0xE0B53A


def forecourt():
    kit.add('concrete', wb('slab', -11, 11, -8, 8, 0, 0.12, 0.01))
    # expansion joints + oil-stained patches under the pumps
    for x in range(-9, 10, 3):
        kit.add('paint', wb('joint', x - 0.015, x + 0.015, -8, 8, 0.12, 0.125, 0), 0x55534E)
    for z in (-4, 0, 4):
        kit.add('paint', wb('joint', -11, 11, z - 0.015, z + 0.015, 0.12, 0.125, 0), 0x55534E)
    for cx in (-2.5, 2.5):
        kit.add('paint', wb('stain', cx - 1.4, cx + 1.4, -1.6, 1.6, 0.12, 0.128, 0.0), 0x3B3833)
    # kerb along the road edge with a drive-in gap each end
    kit.add('concrete', wb('kerb', 10.7, 11.1, -8, -3.5, 0, 0.2, 0.02))
    kit.add('concrete', wb('kerb', 10.7, 11.1, 3.5, 8, 0, 0.2, 0.02))


def canopy():
    cx, cz, w, d = 0.0, 0.0, 14.0, 9.0
    for sx in (-1, 1):
        for sz in (-1, 1):
            x, z = cx + sx * 5.5, cz + sz * 3.2
            kit.add('concrete', wb('col_base', x - 0.32, x + 0.32, z - 0.32, z + 0.32, 0.12, 0.9, 0.02))
            kit.add('paint', wb('col', x - 0.22, x + 0.22, z - 0.22, z + 0.22, 0.9, 4.65, 0.03), WHITE)
            kit.add('paint', wb('col_stripe', x - 0.23, x + 0.23, z - 0.23, z + 0.23, 1.0, 1.5, 0.02), RED)
            kit.add('paint', wb('col_guard', x - 0.3, x + 0.3, z - 0.3, z + 0.3, 0.12, 0.2, 0.01), YEL)
    # fascia box all round: white body, red band, projecting flat roof slab, dark soffit with light strips
    kit.add('paint', wb('soffit', cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2, 4.62, 4.7, 0), 0x8F8C84)
    kit.add('paint', wb('fascia', cx - w / 2 - 0.1, cx + w / 2 + 0.1, cz - d / 2 - 0.1, cz + d / 2 + 0.1, 4.7, 5.5, 0.04), WHITE)
    kit.add('paint', wb('band', cx - w / 2 - 0.13, cx + w / 2 + 0.13, cz - d / 2 - 0.13, cz + d / 2 + 0.13, 4.78, 5.02, 0.02), RED)
    kit.add('concrete', wb('roof', cx - w / 2 - 0.2, cx + w / 2 + 0.2, cz - d / 2 - 0.2, cz + d / 2 + 0.2, 5.5, 5.62, 0.02))
    for x in (-3.5, 0, 3.5):
        for z in (-1.8, 1.8):
            kit.add('paint', wb('light', x - 0.5, x + 0.5, z - 0.12, z + 0.12, 4.56, 4.62, 0.01), 0xF6F0D8)


def pump(cx, cz, ry_flip=1):
    # island kerb, base, body, display, nozzle holsters, hoses
    kit.add('concrete', wb('island', cx - 0.8, cx + 0.8, cz - 2.0, cz + 2.0, 0.12, 0.32, 0.03))
    kit.add('paint', wb('island_stripe', cx - 0.82, cx + 0.82, cz - 2.02, cz - 1.7, 0.2, 0.28, 0.0), YEL)
    kit.add('paint', wb('island_stripe', cx - 0.82, cx + 0.82, cz + 1.7, cz + 2.02, 0.2, 0.28, 0.0), YEL)
    kit.add('paint', wb('base', cx - 0.42, cx + 0.42, cz - 0.3, cz + 0.3, 0.32, 0.42, 0.01), DARK)
    kit.add('paint', wb('body', cx - 0.36, cx + 0.36, cz - 0.26, cz + 0.26, 0.42, 1.55, 0.04), RED)
    kit.add('paint', wb('body_panel', cx - 0.37, cx + 0.37, cz - 0.27, cz + 0.27, 0.55, 0.9, 0.02), WHITE)
    kit.add('paint', wb('head', cx - 0.4, cx + 0.4, cz - 0.3, cz + 0.3, 1.55, 1.95, 0.05), WHITE)
    kit.add('paint', wb('hood', cx - 0.43, cx + 0.43, cz - 0.33, cz + 0.33, 1.95, 2.02, 0.02), RED)
    for s in (-1, 1):  # display windows on both faces (+/-z) and a dispensing-hose side each
        kit.add('paint', wb('display', cx - 0.3, cx + 0.3, cz + s * 0.3, cz + s * 0.33, 1.62, 1.88, 0.0), 0x1B2A24)
        kit.add('paint', wb('digits', cx - 0.24, cx + 0.24, cz + s * 0.33, cz + s * 0.34, 1.7, 1.8, 0.0), 0x7BE29A)
        kit.add('paint', wb('keypad', cx - 0.2, cx + 0.2, cz + s * 0.27, cz + s * 0.31, 1.25, 1.45, 0.0), 0x2F2F2C)
        # nozzle holster (steel) with nozzle handle, and a hose looping to the base
        hx = cx + 0.46
        kit.add('paint', wb('holster', hx - 0.06, hx + 0.1, cz + s * 0.12 - 0.07, cz + s * 0.12 + 0.07, 1.05, 1.3, 0.01), GREY)
        kit.add('paint', limb('nozzle', (hx, cz + s * 0.12, 1.28), (hx + 0.02, cz + s * 0.12 + s * 0.22, 1.1), 0.035, 0.03), DARK)
        pts = [(hx, cz + s * 0.12, 1.2), (hx + 0.22, cz + s * 0.12, 0.95), (hx + 0.26, cz + s * 0.12, 0.62), (hx + 0.1, cz + s * 0.12, 0.45), (cx + 0.38, cz + s * 0.12, 0.5)]
        for a, b in zip(pts, pts[1:]):
            kit.add('paint', limb('hose', a, b, 0.028, 0.028), 0x1A1A18)
    # base ladder: grade band painted on the body (three coloured stripes, unbranded)
    for i, col in enumerate((0x2F7D4E, 0xE0B53A, 0xC9C6BC)):
        kit.add('paint', wb('grade', cx - 0.37, cx + 0.37, cz - 0.275, cz + 0.275, 1.0 + i * 0.1, 1.07 + i * 0.1, 0.0), col)


def office():
    x0, x1, z0, z1, h = -10.2, -6.0, -7.4, -4.2, 3.0
    wall = wb('office', x0, x1, z0, z1, 0, h, 0.015)
    # door on the road side (+x), window on the front (+z) side
    boolean_cut(wall, wb('c', x1 - 0.3, x1 + 0.1, z0 + 0.3, z0 + 1.3, 0, 2.1, 0), apply_mod=True)
    boolean_cut(wall, wb('c', x0 + 1.0, x0 + 2.8, z1 - 0.3, z1 + 0.1, 1.0, 2.0, 0), apply_mod=True)
    kit.add('plaster', wall)
    kit.add('plinth', wb('plinth', x0 - 0.02, x1 + 0.02, z0 - 0.02, z1 + 0.02, 0, 0.5, 0.008))
    kit.add('trim', wb('slab', x0 - 0.35, x1 + 0.35, z0 - 0.35, z1 + 0.35, h, h + 0.2, 0.015))
    kit.add('trim', wb('parapet', x0 - 0.3, x1 + 0.3, z1 + 0.1, z1 + 0.3, h + 0.2, h + 0.55, 0.01))
    # door: recess, frame, two panels, handle
    kit.add('paint', wb('door_recess', x1 - 0.25, x1 - 0.1, z0 + 0.35, z0 + 1.25, 0, 2.05, 0), 0x1D1A17)
    kit.add('wood', wb('door', x1 - 0.2, x1 - 0.12, z0 + 0.38, z0 + 1.22, 0, 2.02, 0.005))
    for a, b in ((0.08, 0.9), (1.05, 1.9)):
        kit.add('paint', wb('panel', x1 - 0.12, x1 - 0.09, z0 + 0.45, z0 + 1.15, a, b, 0.004), 0x6A4A2E)
    kit.add('paint', wb('handle', x1 - 0.1, x1 - 0.03, z0 + 1.13, z0 + 1.17, 0.95, 1.05, 0.004), STEEL)
    for zz in (z0 + 0.3, z0 + 1.3):
        kit.add('paint', wb('frame', x1 - 0.12, x1 + 0.02, zz - 0.04, zz + 0.04, 0, 2.1, 0.004), 0x4A3524)
    kit.add('paint', wb('frame', x1 - 0.12, x1 + 0.02, z0 + 0.3, z0 + 1.3, 2.06, 2.14, 0.004), 0x4A3524)
    # window: dark recess, frame, iron grille, sill
    wx0, wx1 = x0 + 1.0, x0 + 2.8
    kit.add('paint', wb('win_recess', wx0, wx1, z1 - 0.28, z1 - 0.12, 1.0, 2.0, 0), 0x1D1A17)
    for xx in [wx0 + 0.1 + i * (wx1 - wx0 - 0.2) / 6 for i in range(7)]:
        kit.add('paint', wb('bar', xx - 0.015, xx + 0.015, z1 - 0.05, z1 - 0.02, 1.0, 2.0, 0), 0x2A2A28)
    for yy in (1.3, 1.65):
        kit.add('paint', wb('bar_h', wx0, wx1, z1 - 0.05, z1 - 0.02, yy, yy + 0.03, 0), 0x2A2A28)
    kit.add('paint', wb('sill', wx0 - 0.1, wx1 + 0.1, z1 - 0.1, z1 + 0.12, 0.94, 1.0, 0.006), WHITE)
    for xx, zz in ((wx0 - 0.04, 0), (wx1, 0)):
        kit.add('paint', wb('wframe', xx, xx + 0.04, z1 - 0.12, z1 + 0.02, 1.0, 2.04, 0.003), 0x4A3524)
    kit.add('paint', wb('wframe', wx0 - 0.04, wx1 + 0.04, z1 - 0.12, z1 + 0.02, 2.0, 2.06, 0.003), 0x4A3524)
    # water tank on the office roof, plus a bench and a red tin cash/phone stand beside the door
    kit.add('paint', cyl('tank', x0 + 1.2, (z0 + z1) / 2, h + 0.2, h + 1.25, 0.55, 0.5, 18), 0x24262A)
    kit.add('paint', cyl('tank_lid', x0 + 1.2, (z0 + z1) / 2, h + 1.25, h + 1.32, 0.3, 0.28, 12), 0x24262A)
    kit.add('wood', wb('bench', x1 + 0.15, x1 + 0.55, z0 + 0.1, z0 + 1.5, 0.42, 0.48, 0.01))
    for zz in (z0 + 0.2, z0 + 1.4):
        kit.add('paint', wb('bench_leg', x1 + 0.2, x1 + 0.5, zz - 0.03, zz + 0.03, 0, 0.42, 0.004), 0x4A4A46)
    # open-hours notice board on the wall, to the left of the window
    kit.add('paint', wb('notice', x0 + 3.1, x0 + 3.9, z1, z1 + 0.03, 1.2, 1.8, 0.0), 0xD7CBA8)


def price_pole():
    x, z = 10.2, -2.6
    kit.add('concrete', wb('pole_base', x - 0.25, x + 0.25, z - 0.25, z + 0.25, 0.12, 0.5, 0.02))
    kit.add('paint', wb('pole', x - 0.1, x + 0.1, z - 0.1, z + 0.1, 0.5, 6.4, 0.015), GREY)
    kit.add('paint', wb('board_frame', x - 0.2, x + 0.2, z - 1.0, z + 1.0, 6.4, 8.1, 0.02), RED)
    kit.add('paint', wb('board_face', x - 0.22, x + 0.22, z - 0.9, z + 0.9, 6.5, 8.0, 0.01), WHITE)
    for i, g in enumerate((0x2F7D4E, 0x3A3A36, 0xC9942E)):
        kit.add('paint', wb('price_row', x + 0.22, x + 0.25, z - 0.8, z + 0.8, 6.6 + i * 0.48, 6.92 + i * 0.48, 0.0), g)


def odds_and_ends():
    # air/water post with gauge
    kit.add('paint', wb('air_post', 7.6, 7.82, 6.4, 6.62, 0.12, 1.3, 0.02), 0x2F5A8A)
    kit.add('paint', cyl('gauge', 7.71, 6.51, 1.3, 1.38, 0.1, 0.1, 12), STEEL)
    kit.add('paint', limb('air_hose', (7.71, 6.4, 1.1), (7.3, 5.4, 0.2), 0.02, 0.02), 0x1A1A18)
    # oil-drum stack beside the office and loose lubricant cans on a rack
    for i, (x, z) in enumerate(((-9.3, -2.9), (-8.6, -2.9), (-9.0, -3.5))):
        col = (0x2F5A8A, 0x2F5A8A, 0x8A2A22)[i]
        kit.add('paint', cyl('drum', x, z, 0.12, 0.98, 0.29, 0.29, 14), col)
        for hh in (0.35, 0.75):
            kit.add('paint', cyl('drum_ring', x, z, hh, hh + 0.04, 0.31, 0.31, 14), 0x1F3A5C if col == 0x2F5A8A else 0x5E1A15)
    kit.add('wood', wb('rack', -7.4, -6.2, -3.4, -3.0, 0.5, 0.56, 0.008))
    for lg in (0.5, 1.0):
        pass
    for k in range(4):
        kit.add('paint', wb('oil_can', -7.35 + k * 0.28, -7.15 + k * 0.28, -3.35, -3.1, 0.56, 0.86, 0.02), (0xE0B53A, 0xC9C6BC, 0xE0B53A, 0x2F7D4E)[k])
    for x in (-7.3, -6.3):
        kit.add('paint', wb('rack_leg', x - 0.03, x + 0.03, -3.35, -3.05, 0.12, 0.5, 0.004), 0x4A4A46)
    # red fire-buckets on a stand + a sand bucket (pumps always keep these)
    kit.add('paint', wb('bucket_stand', 8.0, 9.2, -7.0, -6.7, 0.12, 0.9, 0.01), RED)
    for i in range(3):
        kit.add('paint', cyl('fire_bucket', 8.2 + i * 0.35, -6.85, 0.9, 1.1, 0.14, 0.11, 12), RED)
    # tyre stack + a hand trolley
    for k in range(4):
        kit.add('paint', cyl('tyre', 3.6, -7.0, 0.12 + k * 0.2, 0.3 + k * 0.2, 0.36, 0.36, 16), 0x1C1C1A)


forecourt()
canopy()
for cx in (-2.5, 2.5):
    pump(cx, 0.0)
office()
price_pole()
odds_and_ends()
TINTS = {'hb_plaster': '#E2DAC4', 'hb_plinth': '#B8A58A', 'hb_trim': '#CFC8B6', 'hb_concrete': '#9A978E', 'hb_wood': '#B08A5C'}
kit.finalize(OUT, TINTS, drift_amp=0.05, ao_strength=0.45)
