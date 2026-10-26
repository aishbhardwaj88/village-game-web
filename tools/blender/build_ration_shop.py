"""
Ration shop - arch.py Kit, to Places V1/ration_shop/LAYOUT.md + MAIN_ration_shop_front_isometric.png (WITH the taraju).
Run: tools/blender/make.sh ration_shop ration_shop_v2
Frame: site-local metres, +z south = front. Room 6 x 5 m (x[-3,3], z[-5,0]), 4.4 m tall to the parapet, mustard lime-wash, dark brown base band + roof line, black tank.
Front: full-width opening, grey rolling shutter rolled up, waist-high wooden counter with iron grille; stacked sacks, platform scale, steel drums, scoops, cloth bags,
table with ledger + handheld ration machine, bare bulb. Blank cream board above and blank black stock board beside the opening (text painted in-game).
Front platform 6 x 3 m with steps, iron queue rail parallel to the front (most of its length), bench, water pot on a stand; taraju (beam balance on a wooden post, two iron
pans on chains) right of the counter with iron weights + a small sack. One barred window with dark shutters on each side wall; back: one door + one window.
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import wb, limb, cyl, sphere, join_objects, ROOT
from arch import Kit, sack, lathe, STEEL, BRASS
import placekit as pk

OUT = os.path.join(ROOT, 'tmp', 'ration_shop_v2_raw.glb')
kit = Kit(split_props=False, own=('metal',), wood_slot='props')
rnd = random.Random(41)
add = kit.add
MUST = 0xA68C48
BROWN = 0x5A4535
IRON = 0x3A3C3E
T = 0.25
X0, X1, Z0, Z1 = -3.0, 3.0, -5.0, 0.0
H = 3.6

add('paint', wb('ground', -4, 4, -6, 4.2, -0.08, 0.02, 0.0), 0xA38A66)
# platform 6 x 3 m, 0.3 high, with a step
add('trim', wb('platform', X0, X1, Z1, 3.0, 0, 0.3, 0.01), 0xA9A69F)
add('trim', wb('step', -1.0, 1.0, 3.0, 3.45, 0, 0.15, 0.01), 0xA3A097)
# walls: back (door + window), left + right (barred window + dark shutters)
def wall_x(z0, z1, x0, x1, ops, h=H, c=MUST):
    cur = x0
    for a, b, lo, hi in sorted(ops):
        add('plaster', wb('w', cur, a, z0, z1, 0, h, 0.0), c)
        if lo > 0:
            add('plaster', wb('w_sill', a, b, z0, z1, 0, lo, 0.0), c)
        add('plaster', wb('w_lin', a, b, z0, z1, hi, h, 0.0), c)
        cur = b
    add('plaster', wb('w', cur, x1, z0, z1, 0, h, 0.0), c)
def wall_z(x0, x1, z0, z1, ops, h=H, c=MUST):
    cur = z0
    for a, b, lo, hi in sorted(ops):
        add('plaster', wb('w', x0, x1, cur, a, 0, h, 0.0), c)
        if lo > 0:
            add('plaster', wb('w_sill', x0, x1, a, b, 0, lo, 0.0), c)
        add('plaster', wb('w_lin', x0, x1, a, b, hi, h, 0.0), c)
        cur = b
    add('plaster', wb('w', x0, x1, cur, z1, 0, h, 0.0), c)
wall_x(Z0 - 0 - 5 + 0.0, Z0 - 5 + T, X0, X1, [])  if False else None
wall_x(-5.0, -5.0 + T, X0, X1, [(-2.2, -1.2, 0, 2.2), (1.2, 2.2, 1.2, 2.4)])           # back: door left, window right
wall_z(X0, X0 + T, -5.0 + T, Z1, [(-3.0, -2.0, 1.2, 2.4)])                               # left window
wall_z(X1 - T, X1, -5.0 + T, Z1, [(-3.0, -2.0, 1.2, 2.4)])                               # right window
# front: two jambs, lintel, rolled shutter box, opening 5.0 wide
add('plaster', wb('f_jl', X0, X0 + 0.5, Z1 - T, Z1, 0, H, 0.0), MUST)
add('plaster', wb('f_jr', X1 - 0.5, X1, Z1 - T, Z1, 0, H, 0.0), MUST)
add('plaster', wb('f_lin', X0, X1, Z1 - T, Z1, 3.0, H, 0.0), MUST)
add('metal', wb('shutter_box', X0 + 0.45, X1 - 0.45, Z1 - T - 0.05, Z1 + 0.35, 2.55, 3.05, 0.03), 0x7C8186)
for k in range(9):
    add('metal', wb('shutter_rib', X0 + 0.5, X1 - 0.5, Z1 + 0.34, Z1 + 0.37, 2.6 + k * 0.05, 2.63 + k * 0.05, 0.0), 0x8A8F94)
for sx in (X0 + 0.5, X1 - 0.5):
    add('metal', wb('guide', sx - 0.04, sx + 0.04, Z1 - 0.05, Z1 + 0.1, 0, 2.55, 0.0), 0x6C7074)
# dark brown base band + roof line
for (a, b, c, d) in ((X0 - 0.02, X1 + 0.02, Z1 - T - 0.03, Z1 + 0.03), (X0 - 0.03, X1 + 0.03, -5.03, -5.0 + T)):
    add('plinth', wb('band', a, b, c, d, 0, 0.85, 0.0), BROWN)
add('plinth', wb('band_l', X0 - 0.03, X0 + 0.03, -5.0, Z1, 0, 0.85, 0.0), BROWN)
add('plinth', wb('band_r', X1 - 0.03, X1 + 0.03, -5.0, Z1, 0, 0.85, 0.0), BROWN)
# roof slab, brown roof line, parapet to 4.4, black tank
add('trim', wb('slab', X0 - 0.2, X1 + 0.2, -5.2, Z1 + 0.2, H, H + 0.2, 0.01), 0xB4B1A9)
add('plinth', wb('roof_line', X0 - 0.22, X1 + 0.22, -5.22, Z1 + 0.22, H + 0.04, H + 0.12, 0.0), BROWN)
for (a, b, c, d) in ((X0, X1, -5.0, -5.0 + 0.2), (X0, X1, Z1 - 0.2, Z1), (X0, X0 + 0.2, -4.8, Z1 - 0.2), (X1 - 0.2, X1, -4.8, Z1 - 0.2)):
    add('plaster', wb('par', a, b, c, d, H + 0.2, 4.4, 0.0), MUST)
    add('plinth', wb('par_cap', a - 0.04, b + 0.04, c - 0.04, d + 0.04, 4.4, 4.46, 0.0), 0xC9993A)
add('paint', cyl('tank', -1.6, -3.6, 4.0, 5.2, 0.6, 0.6, 18), 0x1C1C1F)
add('paint', sphere('tank_dome', -1.6, -3.6, 5.2, 0.6, 0.6, 0.2, 2), 0x1C1C1F)
for hr in (4.3, 4.8):
    add('paint', cyl('tank_rib', -1.6, -3.6, hr, hr + 0.05, 0.625, 0.625, 18), 0x2A2A2E)
add('metal', limb('tank_pipe', (-1.0, -3.6, 4.1), (-1.0, -3.6, 5.0), 0.05), 0x8A8D90)
# floor
add('trim', wb('floor', X0 + T, X1 - T, -5.0 + T, Z1, 0, 0.05, 0.0), 0x9C988E)
# blank cream board over the opening + blank black stock board beside it
add('plaster', wb('board', -2.3, 1.0, Z1 + 0.0, Z1 + 0.06, 3.65, 4.25, 0.0), 0xEFE3BE)
for nm, a, b, h0, h1 in (('t', -2.35, 1.05, 4.25, 4.3), ('b', -2.35, 1.05, 3.6, 3.65), ('l', -2.35, -2.3, 3.6, 4.3), ('r', 1.0, 1.05, 3.6, 4.3)):
    add('wood', wb('board_edge_' + nm, a, b, Z1 - 0.02, Z1 + 0.08, h0, h1, 0.0))
add('paint', wb('stock_board', 1.55, 2.5, Z1 + 0.08, Z1 + 0.12, 1.35, 2.35, 0.0), 0x1B1D1F)
for nm, a, b, h0, h1 in (('t', 1.5, 2.55, 2.35, 2.4), ('b', 1.5, 2.55, 1.3, 1.35), ('l', 1.5, 1.55, 1.3, 2.4), ('r', 2.5, 2.55, 1.3, 2.4)):
    add('wood', wb('stock_edge_' + nm, a, b, Z1 + 0.06, Z1 + 0.14, h0, h1, 0.0))
# counter (waist-high wooden) + iron grille above on the left part of the opening
add('wood', wb('counter', X0 + 0.5, 0.9, Z1 - 0.7, Z1 - 0.3, 0.05, 0.95, 0.006))
add('wood', wb('counter_top', X0 + 0.45, 0.95, Z1 - 0.75, Z1 - 0.25, 0.95, 1.02, 0.006))
for k in range(1, 9):
    add('wood', wb('counter_plank', X0 + 0.5 + k * 0.4 - 0.01, X0 + 0.5 + k * 0.4 + 0.01, Z1 - 0.31, Z1 - 0.29, 0.05, 0.95, 0.0), 0x3E2A1E)
gx0, gx1 = X0 + 0.5, 0.95
for k in range(0, int((gx1 - gx0) / 0.13) + 1):
    x = gx0 + 0.04 + k * 0.13
    add('metal', wb('grille_bar', x - 0.012, x + 0.012, Z1 - 0.55, Z1 - 0.5, 1.02, 2.55, 0.0), IRON)
for hh in (1.05, 1.8, 2.5):
    add('metal', wb('grille_rail', gx0, gx1, Z1 - 0.57, Z1 - 0.48, hh, hh + 0.05, 0.0), IRON)
# interior: sack stacks at the back, platform scale, drums, scoops, bags, table with ledger + handheld machine, bulb
from arch import sack as sack_fn
for k in range(6):
    sack_fn(kit, -2.1 + (k % 2) * 0.55, -4.3, 0.0 + (k // 2) * 0.3, 0.1 * (k % 3), (0xE5DFCB, 0xC9A97A)[k % 2], w=0.7, d=0.45, hh=0.4)
for k in range(5):
    sack_fn(kit, 1.9 + (k % 2) * 0.5, -4.2, (k // 2) * 0.3, 0.2 * (k % 2), (0xC9A97A, 0xE5DFCB)[k % 2], w=0.7, d=0.45, hh=0.4)
add('metal', cyl('drum_a', 0.4, -4.3, 0, 0.9, 0.3, 0.3, 14), 0x7C8186)
add('metal', cyl('drum_b', -0.3, -4.1, 0, 0.8, 0.28, 0.28, 14), 0x6C7074)
for yy in (0.3, 0.6):
    add('metal', cyl('drum_rib', 0.4, -4.3, yy, yy + 0.03, 0.32, 0.32, 14), 0x5E6266)
add('metal', wb('scale_plate', 0.6, 1.3, -2.8, -2.2, 0.1, 0.2, 0.01), 0x3A3C3E)
add('metal', wb('scale_head', 0.95, 1.15, -3.0, -2.8, 0.2, 1.0, 0.01), 0x4A4D52)
add('metal', cyl('scale_dial', 1.05, -2.8, 0.95, 0.98, 0.12, 0.12, 12), 0xE8E4D8)
add('wood', wb('ration_table', -2.4, -1.3, -3.2, -2.5, 0.72, 0.77, 0.006))
for x in (-2.35, -1.35):
    for z in (-3.15, -2.55):
        add('wood', wb('table_leg', x - 0.03, x + 0.03, z - 0.03, z + 0.03, 0, 0.72, 0.0))
add('paint', wb('ledger', -2.3, -1.9, -3.05, -2.7, 0.77, 0.81, 0.004), 0x7A1F1F)
add('paint', wb('ration_machine', -1.7, -1.5, -3.0, -2.8, 0.77, 0.84, 0.01), 0x3A3C3E)
add('paint', wb('machine_screen', -1.68, -1.52, -2.98, -2.9, 0.84, 0.85, 0.0), 0x9FB3B8)
for k in range(3):
    add('metal', cyl('scoop', -0.9 + k * 0.2, -3.1, 0.0, 0.09, 0.07, 0.09, 8), STEEL)
add('paint', sphere('bulb', 0.0, -2.0, 2.9, 0.07, 0.07, 0.09, 1), 0xF4E9B0)
add('metal', limb('bulb_cord', (0.0, -2.0, 3.55), (0.0, -2.0, 2.97), 0.012), 0x1B1B1D)
for k in range(2):
    sack_fn(kit, -1.0 + k * 0.5, -3.7, 0, 0.4 * k, 0xD9CDAF, w=0.4, d=0.28, hh=0.35)
# wall shelves with tins (left wall), ration card board with pinned cards (right wall), measuring cans on the counter
for hh in (1.3, 1.8, 2.3):
    add('wood', wb('shelf', X0 + T, X0 + T + 0.3, -4.7, -3.3, hh, hh + 0.04, 0.004))
for sz in (-4.7, -3.34):
    add('wood', wb('shelf_side', X0 + T, X0 + T + 0.3, sz, sz + 0.04, 1.3, 2.34, 0.0))
for si, hh in enumerate((1.34, 1.84, 2.34)):
    for k in range(5 + si % 2):
        r = 0.05 + rnd.random() * 0.025
        add('metal', cyl('tin', X0 + T + 0.15 + rnd.uniform(-0.04, 0.04), -4.62 + k * (1.25 / (4 + si % 2)), hh, hh + 0.1 + rnd.random() * 0.1, r, r, 10),
            (0x9A9DA0, 0xB08A50, 0x8A5A3A, 0xC4C0B4)[(k + si) % 4])
add('wood', wb('card_board', X1 - T - 0.05, X1 - T, -4.6, -3.3, 1.4, 2.3, 0.004), 0x6A4A32)
for k in range(10):
    cz = -4.5 + (k % 5) * 0.25
    ch = 1.55 + (k // 5) * 0.4
    add('paint', wb('ration_card', X1 - T - 0.075, X1 - T - 0.05, cz, cz + 0.18, ch, ch + 0.25, 0.0), (0xE8DCB8, 0xC8D4C0, 0xEBCFA0, 0xD9B8A8)[k % 4])
for k, (r, hgt) in enumerate(((0.07, 0.14), (0.06, 0.12), (0.05, 0.1), (0.04, 0.08))):
    add('metal', cyl('measure', -2.0 + k * 0.26, -0.4, 1.02, 1.02 + hgt, r, r, 10), (0xA67C3C, STEEL)[k % 2])
# barred windows with open dark shutters on each side wall
def side_window(x, z0, z1, sg):
    for k in range(1, 9):
        z = z0 + k * (z1 - z0) / 9
        add('metal', wb('bar', x - 0.03, x + 0.03, z - 0.012, z + 0.012, 1.2, 2.4, 0.0), IRON)
    add('wood', wb('frame_t', x - 0.06, x + 0.06, z0, z1, 2.35, 2.42, 0.0), 0x3A2A22)
    add('wood', wb('frame_b', x - 0.08, x + 0.08, z0 - 0.04, z1 + 0.04, 1.14, 1.2, 0.0), 0x3A2A22)
    add('wood', wb('shutter', x + sg * 0.12 - 0.02, x + sg * 0.12 + 0.02, z1, z1 + 0.55, 1.2, 2.4, 0.0), 0x3A2A22)
side_window(X0, -3.0, -2.0, -1)
side_window(X1, -3.0, -2.0, 1)
# back door + window (outside faces)
add('wood', wb('back_door', -2.15, -1.25, -5.02, -4.9, 0.0, 2.15, 0.004), 0x3A2A22)
add('wood', wb('back_door_f', -2.2, -1.2, -5.04, -4.94, 2.15, 2.22, 0.0), 0x2A1E18)
for k in range(1, 8):
    add('metal', wb('back_bar', 1.2 + k * 0.125, 1.2 + k * 0.125 + 0.024, -5.0, -4.95, 1.2, 2.4, 0.0), IRON)
# queue rail: iron, parallel to the front, most of the platform length, two return ends
for (x, z) in ((-2.7, 2.3), (-1.4, 2.3), (-0.1, 2.3), (1.2, 2.3)):
    add('metal', limb('rail_post', (x, z, 0.3), (x, z, 1.15), 0.05), 0x5A3A2A)
for hh in (1.15, 0.7):
    add('metal', limb('rail', (-2.7, 2.3, hh), (1.2, 2.3, hh), 0.05), 0x5A3A2A)
for hh in (1.15, 0.7):
    add('metal', limb('rail_ret', (-2.7, 2.3, hh), (-2.7, 1.2, hh), 0.05), 0x5A3A2A)
add('metal', limb('rail_post', (-2.7, 1.2, 0.3), (-2.7, 1.2, 1.15), 0.05), 0x5A3A2A)
pk.bench(kit, -2.9, -1.7, 0.9, 0.7, 0.4)
add('metal', wb('stand', 0.9, 1.1, 1.0, 1.2, 0.3, 0.8, 0.0), 0x4A4C50) if False else None
pk.pot(kit, 1.9, 1.0, 0.7, 0.9)
for sx in (1.6, 2.2):
    add('metal', limb('stand_leg', (sx, 0.9, 0.3), (sx, 1.1, 0.72), 0.03), 0x4A4C50)
    add('metal', limb('stand_leg2', (sx, 1.3, 0.3), (sx, 1.1, 0.72), 0.03), 0x4A4C50)
# taraju: wooden post + crossbar, two iron pans on chains, iron weights + a small sack beside it
tx, tz = 2.1, 1.9
add('wood', limb('taraju_post', (tx, tz, 0.3), (tx, tz, 2.7), 0.14, 0.12))
add('wood', wb('taraju_foot', tx - 0.4, tx + 0.4, tz - 0.3, tz + 0.3, 0.3, 0.4, 0.01))
add('wood', limb('taraju_beam', (tx - 1.2, tz, 2.45), (tx + 1.2, tz, 2.45), 0.07, 0.07))
for sg in (-1, 1):
    px = tx + sg * 1.1
    for dz in (-0.2, 0.2):
        add('metal', limb('chain', (px, tz + dz * 0.2, 2.42), (px + sg * 0.0, tz + dz, 1.1), 0.014), 0x2A2A2C)
    add('metal', lathe('pan', px, tz, [(0.0, 1.0), (0.3, 1.04), (0.34, 1.1), (0.3, 1.1), (0.0, 1.04)], seg=14), 0x1F1F21)
for k, r in enumerate((0.1, 0.085, 0.07, 0.06, 0.05)):
    add('metal', cyl('weight', 0.5 + k * 0.25, 2.5, 0.3, 0.3 + r * 2.0, r, r * 0.8, 10), 0x1E1E20)
sack_fn(kit, 2.2, 2.7, 0.3, 0.2, 0xC9A97A, w=0.5, d=0.32, hh=0.55)

TINTS = {'hb_plaster': '#FFFFFF', 'hb_plinth': '#FFFFFF', 'hb_trim': '#C9C6BE', 'hb_wood': '#8A6A48', 'hb_metal': '#FFFFFF'}
kit.finalize(OUT, TINTS, drift={'hb_plaster': 0.04})
