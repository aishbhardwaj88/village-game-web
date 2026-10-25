"""
Bus adda - built with arch.py's Kit to Places V1/bus_adda/LAYOUT.md (incl. her 25 Oct changes) and MAIN_bus_adda_front_isometric.png (v3).
Run:  tools/blender/make.sh bus_adda bus_adda_v2

Frame: site-local metres, +x east, +z south = the ROAD side (front). Patch 20 x 10 m: x[-10,10] z[-5,5].
  centre-back  shelter 6 x 2.5 m, 3 m tall: 3 exposed brick pillars, brick half walls at the ends, cream back wall with faded maroon bands,
               sloping tin roof, 2 concrete benches, faded picture-only posters + a blank plaque on the back wall
  left         chai tapri (wooden cabin on legs, faded turquoise), back in line with the shelter's back wall, front no further forward than the
               shelter's front pillars; its 2 benches stand BESIDE it facing the road. Ground between shelter/tapri and road stays open.
  far right    round brick chabutra with a charpai (peepal is hers), pyaau: 4 clay pots on a brick platform under a thatch roof, dustbin, bricks, a tyre
  front-left   green bus-stop board on two steel poles, turned perpendicular to the road, double-sided (text painted in-game)
  front-right  milestone: white concrete, rounded yellow top, faces along the road
  front edge   strip of broken brick paving
"""
import sys
import os
import math
import random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import wb, limb, cyl, sphere, prism_x, prism_z, quad, join_objects, ROOT
from arch import Kit, clay_pot, ring, decal_material, lathe, STEEL, BRASS

OUT = os.path.join(ROOT, 'tmp', 'bus_adda_v2_raw.glb')
kit = Kit(split_props=False, own=('metal', 'thatch'), wood_slot='props')
rnd = random.Random(7)
CEMENT = 0xA9A69F


def add(kind, o, c=None):
    kit.add(kind, o, c)
    return o


# faded picture-only posters on the back wall: one atlas, 4 cells
def poster_px(u, v):
    i = min(3, int(u * 4))
    x, y = u * 4 - i, v
    if x < 0.05 or x > 0.95 or y < 0.04 or y > 0.96:
        return None
    def L(h, a=0.75):
        return tuple(((c / 255.0) ** 2.2) for c in ((h >> 16) & 255, (h >> 8) & 255, h & 255)) + (a,)
    bgs = (0xD9A441, 0xC9D6DD, 0xD97A8C, 0xE8E0C8)
    if i == 0 and (x - 0.5) ** 2 + (y - 0.6) ** 2 < 0.06:
        return L(0xB3231C)
    if i == 1 and abs(x - 0.5) < 0.12 and 0.2 < y < 0.8:
        return L(0x2E5E8B)
    if i == 2 and (x - 0.5) ** 2 / 0.09 + (y - 0.5) ** 2 / 0.12 < 1:
        return L(0xF2D04A)
    if i == 3 and 0.25 < y < 0.75 and 0.2 < x < 0.8 and int(y * 20) % 2 == 0:
        return L(0x7A6A55)
    return L(bgs[i], 0.8)


pmat = decal_material('hb_decal', (256, 128), poster_px)


def wall_decal_S(z, x0, x1, h0, h1, i):
    o = quad('poster', [(x0, z, h0), (x1, z, h0), (x1, z, h1), (x0, z, h1)])
    uvl = o.data.uv_layers.new(name='UVMap')
    for loop, uv in zip(o.data.loops, [(i / 4, 0), ((i + 1) / 4, 0), ((i + 1) / 4, 1), (i / 4, 1)]):
        uvl.data[loop.index].uv = uv
    o.data.materials.append(pmat)
    kit.extra.append(o)


POT = [(0.0, 0.0), (0.12, 0.0), (0.17, 0.03), (0.23, 0.13), (0.27, 0.27), (0.26, 0.38), (0.21, 0.49), (0.14, 0.57), (0.115, 0.61), (0.13, 0.65), (0.16, 0.675), (0.165, 0.69), (0.14, 0.695), (0.0, 0.69)]


def pot_at(x, z, h0, sc):
    add('paint', lathe('matka', x, z, [(r * sc, h0 + h * sc) for r, h in POT], seg=18), 0xB5693F)


def build_ground():
    add('paint', wb('patch', -10, 10, -5, 5, -0.08, 0.04, 0.0), 0xB69568)
    add('paint', wb('patch_worn', -9, 9, 0.5, 4.0, 0.04, 0.046, 0.0), 0xA38358)      # packed where the buses stop
    # strip of broken brick paving along the road edge: random half-bricks, uneven
    for i in range(70):
        x = -9.6 + i * 0.275 + rnd.uniform(-0.05, 0.05)
        z = 4.45 + rnd.uniform(-0.18, 0.18)
        if rnd.random() < 0.18:
            continue
        a = rnd.uniform(-0.5, 0.5)
        w, d = rnd.uniform(0.12, 0.23), rnd.uniform(0.08, 0.11)
        add('brick', limb('paver', (x - w / 2 * math.cos(a), z - w / 2 * math.sin(a), 0.045 + rnd.uniform(0, 0.02)), (x + w / 2 * math.cos(a), z + w / 2 * math.sin(a), 0.045 + rnd.uniform(0, 0.02)), d, 0.05))


def build_shelter():
    x0, x1, z0, z1 = -3.0, 3.0, -4.0, -1.5
    # cement floor slab 0.1 high
    add('trim', wb('floor', x0 - 0.2, x1 + 0.2, z0, z1 + 0.5, 0, 0.1, 0.01), CEMENT)
    # back wall 0.25 thick, cream lime-wash with two faded maroon bands, up to the roof
    add('plaster', wb('back', x0, x1, z0, z0 + 0.25, 0.1, 3.3, 0.0), 0xE6D9A8)
    add('plinth', wb('band_a', x0, x1, z0 + 0.25, z0 + 0.28, 0.4, 0.75, 0.0), 0x7E2F3A)
    add('plinth', wb('band_b', x0, x1, z0 + 0.25, z0 + 0.28, 0.85, 0.9, 0.0), 0x7E2F3A)
    # three exposed brick pillars on the front line, brick half walls at both ends
    for x in (x0 + 0.22, 0.0, x1 - 0.22):
        add('brick', wb('pillar', x - 0.25, x + 0.25, z1 - 0.5, z1, 0.1, 3.0, 0.01))
        add('trim', wb('pillar_cap', x - 0.29, x + 0.29, z1 - 0.54, z1 + 0.04, 2.9, 3.0, 0.008), CEMENT)
    for sx in (x0 + 0.22, x1 - 0.22):
        add('brick', wb('halfwall', sx - 0.2, sx + 0.2, z0 + 0.25, z1 - 0.5, 0.1, 1.05, 0.008))
        add('trim', wb('halfwall_cap', sx - 0.25, sx + 0.25, z0 + 0.25, z1 - 0.5, 1.05, 1.12, 0.006), CEMENT)
    # tie beams + rafters, sloping corrugated-tin roof (3.3 at the back wall, 2.9 at the front: drains to the road)
    add('wood', limb('beam_b', (x0 - 0.3, z0 + 0.1, 3.3), (x1 + 0.3, z0 + 0.1, 3.3), 0.14, 0.12))
    add('wood', limb('beam_f', (x0 - 0.3, z1 - 0.25, 3.02), (x1 + 0.3, z1 - 0.25, 3.02), 0.14, 0.12))
    for x in [x0 - 0.2 + k * 0.8 for k in range(9)]:
        add('wood', limb('rafter', (x, z0 + 0.05, 3.32), (x, z1 + 0.35, 2.95), 0.07, 0.07))
    add('tin', prism_x('roof', x0 - 0.4, x1 + 0.4, [(z0 - 0.1, 3.4), (z1 + 0.5, 3.0), (z1 + 0.5, 3.05), (z0 - 0.1, 3.45)]))
    # two concrete benches against the back wall
    for bx in (-1.6, 1.6):
        add('trim', wb('bench_seat', bx - 1.0, bx + 1.0, z0 + 0.45, z0 + 0.95, 0.4, 0.5, 0.01), 0xB5B1A7)
        for lx in (bx - 0.85, bx + 0.85):
            add('trim', wb('bench_leg', lx - 0.1, lx + 0.1, z0 + 0.5, z0 + 0.9, 0.1, 0.4, 0.008), 0xAEAAA0)
    # posters (picture only, faded) + a blank plaque
    zf = z0 + 0.25 + 0.012
    for i, (a, b) in enumerate(((-2.6, -1.9), (-1.7, -1.0), (-0.6, 0.1), (0.3, 1.0))):
        wall_decal_S(zf, a, b, 1.45, 2.3, i)
    add('paint', wb('plaque', 1.7, 2.6, z0 + 0.25, z0 + 0.29, 1.7, 2.2, 0.004), 0x7A7D7F)
    add('paint', wb('plaque_in', 1.76, 2.54, z0 + 0.29, z0 + 0.3, 1.76, 2.14, 0.0), 0x93979A)


def build_tapri():
    x0, x1, z0, z1 = -8.6, -6.4, -4.0, -2.2
    TURQ = 0xA6E0D8
    # four wooden legs, floor platform 0.8 high
    for x in (x0 + 0.1, x1 - 0.1):
        for z in (z0 + 0.1, z1 - 0.1):
            add('wood', limb('tapri_leg', (x, z, 0), (x, z, 0.85), 0.12))
    add('wood', wb('tapri_floor', x0, x1, z0, z1, 0.8, 0.88, 0.0), TURQ)
    # planked cabin: back + side walls (plain planks), front open with a counter and a lifted shutter awning
    for k in range(7):
        add('wood', wb('plank_b', x0 + k * 0.3143, x0 + (k + 1) * 0.3143 - 0.012, z0, z0 + 0.06, 0.88, 2.5, 0.0), TURQ)
    for sx in (x0, x1 - 0.06):
        for k in range(6):
            add('wood', wb('plank_s', sx, sx + 0.06, z0 + 0.06 + k * 0.29, z0 + 0.06 + (k + 1) * 0.29 - 0.012, 0.88, 2.5, 0.0), TURQ)
    add('wood', wb('counter', x0, x1, z1 - 0.5, z1, 0.88, 1.8 - 0.8, 0.0), TURQ)
    add('wood', wb('counter_top', x0 - 0.04, x1 + 0.04, z1 - 0.55, z1 + 0.15, 1.3, 1.36, 0.0), 0x8A6A48)
    add('wood', wb('front_lintel', x0, x1, z1 - 0.06, z1, 2.1, 2.5, 0.0), TURQ)
    add('tin', prism_x('tapri_roof', x0 - 0.15, x1 + 0.15, [(z0 - 0.1, 2.7), (z1 + 0.25, 2.5), (z1 + 0.25, 2.55), (z0 - 0.1, 2.75)]))
    # awning prop stick + a hinged wooden shutter held up
    add('wood', wb('shutter', x0 + 0.1, x1 - 0.1, z1 + 0.02, z1 + 0.5, 2.1, 2.15, 0.0), TURQ)
    for x in (x0 + 0.15, x1 - 0.15):
        add('wood', limb('prop', (x, z1 + 0.5, 0.88 + 0.5), (x, z1 + 0.5, 2.12), 0.04))
    # stock: a kettle, tea glasses, jars of biscuits, a stove
    add('metal', lathe('kettle', x0 + 0.5, z1 - 0.9, [(0.0, 0.88), (0.17, 0.88), (0.2, 0.95), (0.18, 1.1), (0.1, 1.15), (0.0, 1.15)], seg=12), STEEL)
    add('paint', cyl('stove', x0 + 0.5, z1 - 0.9, 0.0, 0.0001, 0.001, 0.001, 4), 0x2A2A2C) if False else None
    for k in range(5):
        add('paint', cyl('jar', x0 + 0.5 + k * 0.28 + 0.4, z1 - 0.3, 1.36, 1.56, 0.07, 0.07, 10), (0xE8C25A, 0xB8472E, 0xE6E0D0)[k % 3])
    for k in range(5):
        add('paint', cyl('glass', x0 + 0.35 + k * 0.17, z1 - 0.2, 1.36, 1.43, 0.035, 0.04, 8), 0xD7E4E4)
    add('wood', wb('shelf', x0 + 0.1, x1 - 0.1, z0 + 0.06, z0 + 0.35, 1.9, 1.94, 0.0), TURQ)
    # two benches beside it, facing the road
    for bx0, bx1 in ((-6.2, -4.7), (-4.5, -3.7 - 0.0)):
        pass
    for bx0, bx1 in ((-6.1, -4.6), (-4.4, -3.5)):
        add('wood', wb('bench_seat', bx0, bx1, -2.45, -2.05, 0.42, 0.48, 0.006))
        for x in (bx0 + 0.15, bx1 - 0.15):
            add('wood', wb('bench_leg', x - 0.04, x + 0.04, -2.4, -2.1, 0, 0.42, 0.0))


def build_right():
    # round brick chabutra (peepal is hers: empty) with a charpai on it
    cx, cz, R = 6.6, -2.9, 1.7
    n = 24
    for i in range(n):
        a0, a1 = i / n * math.tau, (i + 1) / n * math.tau
        add('brick', limb('chab_seg', (cx + R * math.cos(a0), cz + R * math.sin(a0), 0.25), (cx + R * math.cos(a1), cz + R * math.sin(a1), 0.25), 0.32, 0.5))
    add('trim', cyl('chab_top', cx, cz, 0.5, 0.56, R + 0.14, R + 0.14, 24), CEMENT)
    add('paint', cyl('chab_soil', cx, cz, 0.0, 0.52, R - 0.2, R - 0.2, 24), 0x4A3524) if False else None
    # charpai (rope cot) on the platform, near the edge, clear of the tree's trunk spot
    px0, px1, pz0, pz1 = cx + 0.1, cx + 1.4, cz + 0.2, cz + 0.95
    for x in (px0 + 0.07, px1 - 0.07):
        for z in (pz0 + 0.07, pz1 - 0.07):
            add('wood', limb('cot_leg', (x, z, 0.56), (x, z, 0.92), 0.06))
    for (a, b, c, d) in ((px0, px1, pz0, pz0 + 0.06), (px0, px1, pz1 - 0.06, pz1), (px0, px0 + 0.06, pz0, pz1), (px1 - 0.06, px1, pz0, pz1)):
        add('wood', wb('cot_frame', a, b, c, d, 0.9, 0.95, 0.0))
    for k in range(7):
        add('paint', wb('cot_rope', px0 + 0.06, px1 - 0.06, pz0 + 0.08 + k * 0.095, pz0 + 0.1 + k * 0.095, 0.93, 0.955, 0.0), 0xB89A64)
    for k in range(9):
        add('paint', wb('cot_rope2', px0 + 0.1 + k * 0.14, px0 + 0.12 + k * 0.14, pz0 + 0.06, pz1 - 0.06, 0.955, 0.975, 0.0), 0xA88A58)
    # pyaau: four clay pots on a brick platform under a thatch roof on bamboo posts
    qx0, qx1, qz0, qz1 = 8.4, 9.7, -3.8, -2.1
    add('brick', wb('pyaau_base', qx0, qx1, qz0, qz1, 0, 0.8, 0.008))
    add('trim', wb('pyaau_top', qx0 - 0.04, qx1 + 0.04, qz0 - 0.04, qz1 + 0.04, 0.8, 0.86, 0.006), CEMENT)
    for k, (mx, mz) in enumerate(((qx0 + 0.35, qz0 + 0.4), (qx0 + 0.95, qz0 + 0.4), (qx0 + 0.35, qz0 + 1.2), (qx0 + 0.95, qz0 + 1.2))):
        pot_at(mx, mz, 0.86, 1.0 + 0.05 * k)
    # lift the pots onto the platform: clay_pot builds on the ground, so place them separately at platform height instead
    for x, z in ((qx0 - 0.1, qz0 - 0.1), (qx1 + 0.1, qz0 - 0.1), (qx0 - 0.1, qz1 + 0.1), (qx1 + 0.1, qz1 + 0.1)):
        add('wood', limb('bamboo', (x, z, 0), (x + 0.02, z, 2.2), 0.07, 0.07))
    th = 0.22
    add('thatch', prism_x('pyaau_roof', qx0 - 0.4, qx1 + 0.4, [(qz0 - 0.4, 2.55), (0.0 + (qz0 + qz1) / 2, 2.85), (qz1 + 0.4, 2.55), (qz1 + 0.4, 2.55 - th), (0.0 + (qz0 + qz1) / 2, 2.85 - th), (qz0 - 0.4, 2.55 - th)]))
    # dustbin, loose bricks, a cycle tyre
    add('metal', cyl('dustbin', 3.9, -1.9, 0, 0.75, 0.24, 0.28, 12), 0x8D9094)
    add('metal', cyl('dustbin_rim', 3.9, -1.9, 0.75, 0.8, 0.3, 0.3, 12), 0x75787C)
    for k, (x, z) in enumerate(((4.4, -1.4), (4.6, -1.25), (4.25, -1.2))):
        a = rnd.uniform(-0.6, 0.6)
        add('brick', limb('loose_brick', (x - 0.11 * math.cos(a), z - 0.11 * math.sin(a), 0.05), (x + 0.11 * math.cos(a), z + 0.11 * math.sin(a), 0.05 + 0.04 * k), 0.11, 0.07))
    add('paint', ring('tyre', 5.2, -0.6, 0.04, 0.3, 0.035, axis='y'), 0x1B1B1D)


def build_signs():
    # green bus-stop board on two steel poles, front-left at the road edge, PERPENDICULAR to the road: board plane faces +-x. Top ~3 m. Blank white border, text painted in-game.
    sx, sz = -9.1, 4.1
    for dz in (-0.55, 0.55):
        add('metal', limb('sign_pole', (sx, sz + dz, 0), (sx, sz + dz, 3.05), 0.07), 0x6D7378)
    add('paint', wb('sign_board', sx - 0.03, sx + 0.03, sz - 0.75, sz + 0.75, 1.75, 2.95, 0.0), 0x1F6B3A)
    for nm, a, b, h0, h1 in (('t', sz - 0.75, sz + 0.75, 2.88, 2.95), ('b', sz - 0.75, sz + 0.75, 1.75, 1.82), ('l', sz - 0.75, sz - 0.68, 1.75, 2.95), ('r', sz + 0.68, sz + 0.75, 1.75, 2.95)):
        add('paint', wb('sign_border_' + nm, sx - 0.036, sx + 0.036, a, b, h0, h1, 0.0), 0xF4F4EE)
    # milestone at front-right: white concrete, rounded yellow top, faces along the road
    mx, mz = 8.8, 4.2
    add('trim', wb('mile_body', mx - 0.3, mx + 0.3, mz - 0.14, mz + 0.14, 0, 0.75, 0.01), 0xE9E7E0)
    add('paint', cyl('mile_top', mx, mz, 0.75, 0.76, 0.0001, 0.0001, 4), 0xE0B71F) if False else None
    add('paint', sphere('mile_dome', mx, mz, 0.72, 0.3, 0.14, 0.2, 2), 0xE0B71F)
    add('trim', wb('mile_stripe', mx - 0.305, mx + 0.305, mz - 0.145, mz + 0.145, 0.62, 0.74, 0.0), 0xE0B71F)


build_ground()
build_shelter()
build_tapri()
build_right()
build_signs()

TINTS = {'hb_plaster': '#FFF2D0', 'hb_plinth': '#8A3A44', 'hb_trim': '#D8D5CC', 'hb_apron': '#A8845A',
         'hb_wood': '#8A6A48', 'hb_brick': '#AE6C54', 'hb_tin': '#BFC6CA', 'hb_metal': '#FFFFFF', 'hb_thatch': '#FFFFFF'}
if len(kit.extra) > 1:
    kit.extra[:] = [join_objects(kit.extra, 'decals')]
kit.finalize(OUT, TINTS, drift={'hb_plaster': 0.05, 'hb_brick': 0.1})
