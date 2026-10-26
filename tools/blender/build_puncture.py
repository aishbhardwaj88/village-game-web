"""
Puncture shop - arch.py Kit, to Places V1/puncture/LAYOUT.md (lean-to ~7.5 m wide x 3 m deep, single-slope rusty tin roof 2.8 front / 2.3 back).
Run:  tools/blender/make.sh puncture puncture_v2
Frame: site-local metres, +z south = front = the road. Oil-stained bare earth patch 8 x 6 m: x[-4,4] z[-3,3].
Lean-to at the back (z[-3,0]): bamboo posts, back + both short sides = mismatched rusty tin sheets on battens. Inside: tubes/tyres on nails, spanner row,
hand pump, workbench with patch box, red compressor on wheels, blue cut drum of water, foot pump, tyre stack. In front: upside-down bicycle (front wheel
off, lying beside it), bench, bucket, nut tin. Front-left by the road: 4 white-painted tyres + 1 upright on top = the shop sign (+ a small name board).
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import wb, limb, cyl, sphere, prism_x, join_objects, ROOT
from arch import Kit, ring, bicycle, lathe, STEEL

OUT = os.path.join(ROOT, 'tmp', 'puncture_v2_raw.glb')
kit = Kit(split_props=False, own=('metal',), wood_slot='props')
rnd = random.Random(9)
RUST = (0xD07A52, 0xBE6A44, 0xB4C0C6, 0x94A2B0, 0xDC8A5C, 0xA8B6BE)


def add(k, o, c=None):
    kit.add(k, o, c)
    return o


add('paint', wb('patch', -4, 4, -3, 3, -0.08, 0.04, 0.0), 0xA38A66)
for (x, z, r, c) in ((-0.5, 1.2, 1.1, 0x9C8662), (1.8, 0.6, 0.6, 0x98835F), (-2.3, 1.8, 0.7, 0x9C8662), (2.6, 2.1, 0.5, 0x96805E)):
    add('paint', cyl('oil_stain', x, z, 0.04, 0.047, r, r * 0.8, 12), c)
X0, X1, Z0, Z1 = -3.75, 3.75, -3.0, 0.0
HF, HB = 2.8, 2.3
# bamboo posts: front row 5, back row 5, joined by a ridge beam + purlins
for i in range(6):
    x = X0 + 0.1 + i * (X1 - X0 - 0.2) / 5
    add('wood', limb('post_f', (x, Z1 - 0.1, 0), (x, Z1 - 0.1, HF), 0.1, 0.09))
    add('wood', limb('post_b', (x, Z0 + 0.1, 0), (x, Z0 + 0.1, HB), 0.1, 0.09))
add('wood', limb('beam_f', (X0 - 0.2, Z1 - 0.1, HF - 0.05), (X1 + 0.2, Z1 - 0.1, HF - 0.05), 0.12, 0.1))
add('wood', limb('beam_b', (X0 - 0.2, Z0 + 0.1, HB - 0.05), (X1 + 0.2, Z0 + 0.1, HB - 0.05), 0.12, 0.1))
for i in range(8):
    x = X0 - 0.1 + i * (X1 - X0 + 0.2) / 7
    add('wood', limb('rafter', (x, Z0 - 0.05, HB), (x, Z1 + 0.35, HF - 0.03), 0.06, 0.06))
# roof: 6 mismatched rusty sheets side by side, slightly different heights/tints (single slope)
nsheet = 6
sw = (X1 - X0 + 0.5) / nsheet
for k in range(nsheet):
    xa = X0 - 0.25 + k * sw
    lift = rnd.uniform(0, 0.025)
    add('tin', prism_x('sheet', xa, xa + sw - 0.01, [(Z0 - 0.15, HB + 0.04 + lift), (Z1 + 0.4, HF + 0.02 + lift), (Z1 + 0.4, HF + 0.06 + lift), (Z0 - 0.15, HB + 0.08 + lift)]), RUST[k % 6])
# walls: back + both sides = mismatched tin sheets on battens
def sheets_back(z, x0, x1, hmax):
    n = int((x1 - x0) / 0.8)
    for k in range(n):
        xa = x0 + k * (x1 - x0) / n
        h = hmax - rnd.uniform(0, 0.15)
        add('tin', wb('wall_sheet', xa, xa + (x1 - x0) / n - 0.015, z, z + 0.04, 0.0, h, 0.0), RUST[(k + 2) % 6])
sheets_back(Z0, X0, X1, HB)
for sx, d in ((X0, 0), (X1 - 0.04, 0)):
    n = 4
    for k in range(n):
        za = Z0 + k * (Z1 - Z0) / n
        h = (HB + (HF - HB) * ((za - Z0 + (Z1 - Z0) / n / 2) / (Z1 - Z0))) - 0.1 - rnd.uniform(0, 0.15)
        add('tin', wb('side_sheet', sx, sx + 0.04, za, za + (Z1 - Z0) / n - 0.015, 0.0, h, 0.0), RUST[(k + 4) % 6])
for z in (Z0 + 0.05, ):
    for h in (0.5, 1.2, 1.9):
        add('wood', limb('batten', (X0, z, h), (X1, z, h), 0.06, 0.04))
# inside: tubes + tyres hung on nails (back wall), spanner board, tools
for k, x in enumerate((-3.3, -2.5, 1.3, 2.2, 3.1)):
    add('paint', ring('tube', x, Z0 + 0.14, 1.7 - (k % 2) * 0.3, 0.3 + 0.03 * (k % 3), 0.055, axis='z'), 0x151515)
    add('metal', limb('nail', (x, Z0 + 0.06, 2.05 - (k % 2) * 0.3), (x, Z0 + 0.2, 2.05 - (k % 2) * 0.3), 0.025), 0x3A3C3E)
add('wood', wb('tool_board', -1.1, 0.3, Z0 + 0.05, Z0 + 0.1, 1.5, 2.1, 0.0))
for k in range(8):
    x = -1.0 + k * 0.16
    add('metal', limb('spanner', (x, Z0 + 0.1, 1.55), (x, Z0 + 0.12, 2.0), 0.035, 0.012), STEEL)
    add('metal', cyl('spanner_head', x, Z0 + 0.12, 1.98, 2.05, 0.03, 0.03, 6), STEEL)
# workbench with a patch box, glue tin, tools
add('wood', wb('bench_top', -1.2, 0.5, Z0 + 0.35, Z0 + 0.95, 0.86, 0.92, 0.008))
for x in (-1.15, 0.45):
    for z in (Z0 + 0.4, Z0 + 0.9):
        add('wood', wb('bench_leg', x - 0.04, x + 0.04, z - 0.04, z + 0.04, 0, 0.86, 0.0))
add('paint', wb('patch_box', -0.9, -0.55, Z0 + 0.5, Z0 + 0.8, 0.92, 0.98, 0.004), 0xC9A83A)
add('metal', cyl('glue_tin', -0.2, Z0 + 0.65, 0.92, 1.0, 0.06, 0.06, 10), 0xB8472E)
add('metal', limb('plier', (0.1, Z0 + 0.6, 0.93), (0.35, Z0 + 0.7, 0.93), 0.03, 0.01), STEEL)
# red compressor on wheels (upright tank + motor + two wheels), blue cut drum of water, hand pump, foot pump
cx, cz = 1.1, Z0 + 0.8
add('paint', cyl('comp_tank', cx, cz, 0.28, 0.9, 0.2, 0.2, 14), 0xC62828)
add('paint', wb('comp_motor', cx - 0.22, cx + 0.22, cz - 0.17, cz + 0.17, 0.9, 1.12, 0.01), 0xB71C1C)
add('metal', cyl('comp_gauge', cx, cz - 0.2, 1.0, 1.04, 0.06, 0.06, 10), 0xE0DED6)
for dx in (-0.28, 0.28):
    add('paint', ring('comp_wheel', cx + dx, cz, 0.14, 0.12, 0.04, axis='x'), 0x1B1B1D)
add('metal', limb('comp_handle', (cx - 0.2, cz, 1.0), (cx - 0.2, cz + 0.5, 1.05), 0.03), 0x3A3C3E)
bx, bz = 2.9, Z0 + 0.8
add('paint', cyl('drum', bx, bz, 0.0, 0.62, 0.26, 0.26, 16), 0x1F5FA8)
add('paint', cyl('drum_water', bx, bz, 0.5, 0.52, 0.23, 0.23, 16), 0x4F6E75)
for hh in (0.15, 0.4):
    add('paint', cyl('drum_rib', bx, bz, hh, hh + 0.04, 0.27, 0.27, 16), 0x174C86)
add('metal', limb('hand_pump', (-2.6, Z0 + 0.6, 0.0), (-2.6, Z0 + 0.6, 0.9), 0.05), 0x3A3C3E)
add('metal', limb('hand_pump_handle', (-2.7, Z0 + 0.6, 0.95), (-2.5, Z0 + 0.6, 0.95), 0.03), 0x8A1F1F)
add('metal', limb('foot_pump', (2.2, Z0 + 0.5, 0.0), (2.2, Z0 + 0.5, 0.85), 0.05, 0.05), 0x3A3C3E)
add('metal', limb('foot_pump_pedal', (2.1, Z0 + 0.35, 0.05), (2.3, Z0 + 0.35, 0.05), 0.07, 0.12), 0x1B1B1D)
# tyre stack inside at the left
for k in range(3):
    add('paint', ring('stack_tyre', -3.2, Z0 + 1.0, 0.08 + k * 0.17, 0.3, 0.11, axis='y'), 0x1B1B1D)
# upside-down bicycle in front, front wheel off
start = len(kit.records)
bicycle(kit, -0.4, 1.7, 0x2A3A42)
new = kit.records[start:]
for kind, obj, c in list(new):
    me = obj.data
    xs = [v.co.x for v in me.vertices]
    nm = obj.name
    is_front_wheel = nm.startswith(('tyre', 'rim', 'hub', 'spoke')) and (sum(xs) / len(xs)) < -0.4 + 0.5
    if is_front_wheel:
        kit.records.remove((kind, obj, c))
        bpy.data.objects.remove(obj, do_unlink=True)
        continue
    pivot = 0.55
    for v in me.vertices:
        v.co.y = -3.4 - v.co.y
        v.co.z = 2 * pivot - v.co.z
# the removed front wheel lies on the ground beside it
add('paint', ring('wheel_tyre', -1.6, 2.2, 0.04, 0.34, 0.034, axis='y'), 0x1B1B1D)
add('metal', ring('wheel_rim', -1.6, 2.2, 0.04, 0.29, 0.01, axis='y'), 0xB6BABD)
# bench, bucket, nut tin
add('wood', wb('seat', -3.7, -2.6, 1.4, 1.8, 0.42, 0.48, 0.008))
for x in (-3.6, -2.7):
    add('wood', wb('seat_leg', x - 0.04, x + 0.04, 1.45, 1.75, 0, 0.42, 0.0))
add('metal', cyl('bucket', -2.3, 2.1, 0, 0.3, 0.14, 0.18, 12), 0x9FA3A7)
add('metal', cyl('nut_tin', 0.3, 1.5, 0, 0.1, 0.06, 0.06, 10), 0xC9A83A)
# sign: 4 white-painted tyres stacked + 1 upright on top, front-left by the road
sx, sz = -3.2, 2.5
for k in range(4):
    add('paint', ring('sign_tyre', sx, sz, 0.1 + k * 0.2, 0.32, 0.1, axis='y'), 0xEDEBE4)
add('paint', ring('sign_tyre_top', sx, sz, 1.15, 0.33, 0.1, axis='x'), 0xF4F2EC)
# small name board hung from the front beam (text painted in-game)
add('wood', wb('name_board', -1.6, 1.6, Z1 - 0.15, Z1 - 0.1, 2.0, 2.55, 0.0), 0xE9DEBC)
for nm, a, b, h0, h1 in (('t', -1.64, 1.64, 2.55, 2.6), ('b', -1.64, 1.64, 1.96, 2.0), ('l', -1.64, -1.6, 1.96, 2.6), ('r', 1.6, 1.64, 1.96, 2.6)):
    add('wood', wb('nb_edge_' + nm, a, b, Z1 - 0.17, Z1 - 0.08, h0, h1, 0.0))

TINTS = {'hb_plaster': '#FFF2D0', 'hb_tin': '#FFFFFF', 'hb_wood': '#8A6A48', 'hb_metal': '#FFFFFF', 'hb_trim': '#C9C6BE'}
kit.finalize(OUT, TINTS, drift={'hb_plaster': 0.04})
