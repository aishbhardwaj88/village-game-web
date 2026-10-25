"""
Village houses kit - 8 types A-H, arch.py Kit, to Places V1/houses_kit/LAYOUT.md + MAIN_houses_{A_B,C_D,E_F,G_H}.png. Run: tools/blender/make_houses_kit.sh
Each type is its own model (public/assets/models/house_kit_<a..h>.glb), authored at the origin, FRONT = +z, ground at h=0, centred on x=0 (plot extents below). Instanced in-game by
src/houseKit.js with per-instance colour tint + width variation. Mixed prosperity, North Indian, cared-for (never broken). Plants/trees are hers: planters/platforms are left empty.
  A kachcha mud house 6 x 5     B bare brick room + bamboo verandah 6 x 5 (+2.2 verandah)   C plain pakka, chabutra 6 x 6    D single-storey + stair room 7 x 11
  E half-built second floor 6 x 7   F old ancestral house 7 x 8   G modern kothi 10 x 17    H farmer's compound 18 x 16
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import wb, limb, cyl, sphere, prism_x, prism_z, join_objects, ROOT
from arch import Kit, bicycle, lathe, ring, sack, plastic_chair, STEEL, BRASS
import placekit as pk

TMP = os.path.join(ROOT, 'tmp')
WOOD = 0x6B4E34
WOODD = 0x4A3426
IRON = 0x3A3C3E
TINT = {'hb_plaster': '#FFFFFF', 'hb_plinth': '#FFFFFF', 'hb_trim': '#C9C6BE', 'hb_apron': '#A59A88', 'hb_wood': '#8A6A48', 'hb_brick': '#FFFFFF', 'hb_tin': '#FFFFFF', 'hb_metal': '#FFFFFF', 'hb_thatch': '#FFFFFF'}


def mk(own=()):
    return Kit(split_props=False, own=('metal',) + tuple(own), wood_slot='props')


def box_walls(kit, kind, x0, x1, z0, z1, h, t, colour, front_ops=(), back_ops=(), side_ops=()):
    """Four walls of thickness t with through-openings [(a, b, lo, hi)] on the front (+z, along x), back (-z) and both sides (along z)."""
    def run_x(za, zb, ops):
        cur = x0
        for a, b, lo, hi in sorted(ops):
            kit.add(kind, wb('w', cur, a, za, zb, 0, h, 0.0), colour)
            if lo > 0:
                kit.add(kind, wb('sill', a, b, za, zb, 0, lo, 0.0), colour)
            kit.add(kind, wb('lin', a, b, za, zb, hi, h, 0.0), colour)
            cur = b
        kit.add(kind, wb('w', cur, x1, za, zb, 0, h, 0.0), colour)

    def run_z(xa, xb, ops):
        cur = z0 + t
        for a, b, lo, hi in sorted(ops):
            kit.add(kind, wb('sw', xa, xb, cur, a, 0, h, 0.0), colour)
            if lo > 0:
                kit.add(kind, wb('sill', xa, xb, a, b, 0, lo, 0.0), colour)
            kit.add(kind, wb('lin', xa, xb, a, b, hi, h, 0.0), colour)
            cur = b
        kit.add(kind, wb('sw', xa, xb, cur, z1 - t, 0, h, 0.0), colour)
    run_x(z1 - t, z1, front_ops)
    run_x(z0, z0 + t, back_ops)
    run_z(x0, x0 + t, side_ops)
    run_z(x1 - t, x1, side_ops)


def door_set(kit, a, b, hi, z, col=0x2E6F72, studs=False, arch=False):
    ft = 0.08
    for xx0, xx1, y0, y1 in ((a, a + ft, 0, hi), (b - ft, b, 0, hi), (a, b, hi - ft, hi)):
        kit.add('wood', wb('df', xx0, xx1, z - 0.3, z + 0.03, y0, y1, 0.0), WOOD)
    kit.add('wood', wb('leaf', a + ft, b - ft, z - 0.16, z - 0.08, 0.02, hi - ft, 0.004), col)
    mid = (a + b) / 2
    kit.add('wood', wb('leaf_split', mid - 0.01, mid + 0.01, z - 0.08, z - 0.06, 0.05, hi - ft - 0.03, 0.0), 0x1E2A28)
    for (p0, p1) in ((0.2, 0.95), (1.1, hi - 0.25)):
        for xa, xb in ((a + 0.15, mid - 0.06), (mid + 0.06, b - 0.15)):
            kit.add('wood', wb('panel', xa, xb, z - 0.08, z - 0.05, p0, p1, 0.003), col)
    kit.add('paint', wb('handle', b - 0.28, b - 0.22, z - 0.08, z - 0.0, 1.0, 1.15, 0.0), BRASS)
    if studs:
        for r in range(4):
            for c in range(3):
                kit.add('metal', sphere('stud', a + 0.25 + c * (b - a - 0.5) / 2, z - 0.06, 0.5 + r * 0.45, 0.025, 0.025, 0.025, 1), 0x2A2A2C)


def win_set(kit, a, b, lo, hi, z, col=0x2E6F72, bars=True):
    ft = 0.07
    for xx0, xx1, y0, y1 in ((a, a + ft, lo, hi), (b - ft, b, lo, hi), (a, b, hi - ft, hi), (a, b, lo, lo + ft)):
        kit.add('wood', wb('wf', xx0, xx1, z - 0.3, z + 0.04, y0, y1, 0.0), col)
    n = max(3, int((b - a) / 0.12))
    if bars:
        for k in range(1, n):
            x = a + k * (b - a) / n
            kit.add('metal', wb('bar', x - 0.012, x + 0.012, z - 0.14, z - 0.1, lo + ft, hi - ft, 0.0), 0x2A2A2C)
        kit.add('metal', wb('bar_h', a + ft, b - ft, z - 0.14, z - 0.1, (lo + hi) / 2 - 0.02, (lo + hi) / 2 + 0.02, 0.0), 0x2A2A2C)
    kit.add('trim', wb('sill', a - 0.08, b + 0.08, z - 0.05, z + 0.12, lo - 0.06, lo, 0.004), 0xA9A69F)


def roof_tank(kit, x, z, h, r=0.5):
    for dx, dz in ((-0.3, -0.3), (0.3, -0.3), (-0.3, 0.3), (0.3, 0.3)):
        kit.add('paint', limb('tleg', (x + dx, z + dz, h), (x + dx, z + dz, h + 0.25), 0.05, 0.05), 0x555555)
    kit.add('paint', cyl('tank', x, z, h + 0.25, h + 1.1, r, r, 16), 0x1C1C1F)
    kit.add('paint', sphere('tank_dome', x, z, h + 1.1, r, r, 0.18, 2), 0x1C1C1F)
    for hr in (0.5, 0.85):
        kit.add('paint', cyl('tank_rib', x, z, h + hr, h + hr + 0.04, r + 0.02, r + 0.02, 16), 0x2A2A2E)


def flat_roof(kit, x0, x1, z0, z1, h, par=0.6, col=0xF0E4C4, band=None, oh=0.25):
    kit.add('trim', wb('slab', x0 - oh, x1 + oh, z0 - oh, z1 + oh, h, h + 0.2, 0.01), 0xB4B1A9)
    t = 0.18
    for (a, b, c, d) in ((x0, x1, z0, z0 + t), (x0, x1, z1 - t, z1), (x0, x0 + t, z0 + t, z1 - t), (x1 - t, x1, z0 + t, z1 - t)):
        kit.add('plaster', wb('par', a, b, c, d, h + 0.2, h + 0.2 + par, 0.0), col)
        kit.add('trim', wb('par_cap', a - 0.04, b + 0.04, c - 0.04, d + 0.04, h + 0.2 + par, h + 0.27 + par, 0.0), 0xD8D4C8)
    if band is not None:
        kit.add('plinth', wb('roof_line', x0 - oh - 0.02, x1 + oh + 0.02, z0 - oh - 0.02, z1 + oh + 0.02, h + 0.05, h + 0.13, 0.0), band)


def fin(kit, name):
    out = os.path.join(TMP, f'house_kit_{name}_raw.glb')
    kit.finalize(out, TINT, drift={'hb_plaster': 0.04, 'hb_brick': 0.1})


# ------------------------------------------------------------------------------------------------ A: kachcha mud house 6 x 5
def type_a():
    kit = mk(('thatch',))
    MUD = 0xA9845A
    kit.add('paint', wb('ground', -3.3, 3.3, -2.8, 2.8, -0.08, 0.02, 0.0), 0xA6865E)
    # room 4.2 x 3 at the back, mud walls 0.35, 2.3 m, thatch gable roof ridge along x
    box_walls(kit, 'plaster', -2.1, 2.1, -2.5, 0.2, 2.3, 0.35, MUD, front_ops=[(-0.5, 0.5, 0, 1.9), (1.0, 1.7, 1.1, 1.9)])
    for a, b, lo, hi in ((-0.5, 0.5, 0, 1.9),):
        kit.add('wood', wb('door_dark', a, b, 0.0, 0.05, 0.02, hi, 0.0), 0x3A2A22)
        kit.add('paint', wb('door_chalk_l', a - 0.1, a, 0.2 - 0.04, 0.2 + 0.02, 0, hi + 0.1, 0.0), 0xE9DFC8)
        kit.add('paint', wb('door_chalk_r', b, b + 0.1, 0.2 - 0.04, 0.2 + 0.02, 0, hi + 0.1, 0.0), 0xE9DFC8)
        kit.add('paint', wb('door_chalk_t', a - 0.1, b + 0.1, 0.2 - 0.04, 0.2 + 0.02, hi, hi + 0.1, 0.0), 0xE9DFC8)
    kit.add('wood', wb('win_shutter', 1.0, 1.7, 0.04, 0.08, 1.1, 1.9, 0.0), 0x6B4E34)
    # thatch roof
    RIDGE = 3.4
    kit.add('thatch', prism_x('thatch', -2.8, 2.8, [(-2.9, 2.0), (-1.15, RIDGE), (0.6, 2.0), (0.6, 1.62), (-1.15, RIDGE - 0.38), (-2.9, 1.62)]))
    kit.add('wood', limb('ridge_rope', (-2.8, -1.15, RIDGE + 0.02), (2.8, -1.15, RIDGE + 0.02), 0.06, 0.05), 0xB89A64)
    for z in (-2.0, -0.3):
        kit.add('wood', limb('eave_pole', (-2.9, z, 1.9), (2.9, z, 1.9), 0.05), 0x6A5A3A)
    # low mud courtyard wall 1 m, 0.35 thick, with a 1.6 m gap at the centre front; uple (dung cakes) stuck on the front
    for (a, b) in ((-3.0, -0.8), (0.8, 3.0)):
        kit.add('plaster', wb('yard_wall', a, b, 2.2, 2.55, 0, 1.0, 0.04), MUD)
    for (a, b, c, d) in ((-3.0, -2.65, -2.5, 2.2), (2.65, 3.0, -2.5, 2.2)):
        kit.add('plaster', wb('yard_wall_s', a, b, c, d, 0, 1.0, 0.04), MUD)
    kit.add('plaster', wb('yard_wall_back', -3.0, 3.0, -2.8, -2.45, 0, 1.0, 0.04), MUD)
    for k in range(4):
        kit.add('paint', sphere('uple', -2.6 + k * 0.5, 2.62, 0.45, 0.2, 0.07, 0.2, 1), 0x7A6044)
        kit.add('paint', sphere('uple', 1.1 + k * 0.5, 2.62, 0.45, 0.2, 0.07, 0.2, 1), 0x7A6044)
    # chulha (clay stove), pots, charpai, a few sticks
    kit.add('paint', lathe('chulha', -1.8, 1.2, [(0.3, 0.0), (0.28, 0.25), (0.2, 0.32), (0.0, 0.32)], seg=10), 0x8F6A44)
    pk.pot(kit, -0.9, 1.4, 0.0, 0.9)
    pk.pot(kit, 0.9, 1.1, 0.0, 0.8)
    pk.charpai(kit, 1.5, 1.3, 0.0, 1.8, 0.9)
    sack(kit, -2.3, 0.7, 0.0, 0.4, 0xB89A64, w=0.5, d=0.34, hh=0.5)
    fin(kit, 'a')


# ------------------------------------------------------------------------------------------------ B: bare brick room + bamboo verandah
def type_b():
    kit = mk(('thatch', 'tin'))
    kit.add('paint', wb('ground', -3.6, 3.6, -2.8, 5.2, -0.08, 0.02, 0.0), 0xA6865E)
    box_walls(kit, 'brick', -3.0, 3.0, -2.5, 2.5, 3.0, 0.3, 0xFFFFFF, front_ops=[(-1.7, -0.7, 0, 2.2), (1.2, 2.4, 1.1, 2.2)], back_ops=[(-0.5, 0.5, 1.2, 2.2)])
    door_set(kit, -1.7, -0.7, 2.2, 2.5, 0x6C7074)
    win_set(kit, 1.2, 2.4, 1.1, 2.2, 2.5, 0x6A6E72)
    flat_roof(kit, -3.0, 3.0, -2.5, 2.5, 3.0, 0.45, 0xB5603C)
    roof_tank(kit, 1.8, -1.5, 3.65)
    # bamboo-post verandah 2.2 m deep: left half thatch, right half rusty tin
    for x in (-3.1, -0.0, 3.1):
        kit.add('wood', limb('bamboo', (x, 4.6, 0), (x + 0.02, 4.6, 2.6), 0.09, 0.08))
    for x in (-3.1, 3.1):
        pass
    kit.add('wood', limb('beam_f', (-3.2, 4.6, 2.55), (3.2, 4.6, 2.55), 0.1, 0.08))
    kit.add('thatch', prism_x('thatch_half', -3.4, 0.05, [(2.4, 3.0), (4.9, 2.55), (4.9, 2.22), (2.4, 2.65)]))
    for k in range(3):
        xa = 0.05 + k * 1.15
        kit.add('tin', prism_x('tin_sheet', xa, xa + 1.13, [(2.4, 3.0), (4.9, 2.55), (4.9, 2.6), (2.4, 3.05)]), (0x8C5A44, 0x9A9EA0, 0xA0654A)[k])
    kit.add('paint', limb('clothes_line', (-3.1, 4.6, 2.0), (-0.1, 4.6, 2.0), 0.015), 0xB89A64)
    for k, c in enumerate((0xE8E0C8, 0x9FB8B0)):
        kit.add('paint', wb('cloth', -2.6 + k * 1.0, -2.0 + k * 1.0, 4.58, 4.62, 1.2, 2.0, 0.0), c)
    pk.charpai(kit, 1.5, 3.6, 0.0, 1.9, 0.9)
    pk.bucket(kit, -0.4, 3.2, 0x9FA3A7)
    kit.add('wood', limb('broom', (-2.4, 3.3, 0.04), (-2.2, 3.1, 1.1), 0.03), 0x8A6A48)
    pk.hand_pump(kit, 3.9, 3.8, 0x2E5E3A)
    fin(kit, 'b')


# ------------------------------------------------------------------------------------------------ C: plain pakka, pastel, chabutra, ladder
def type_c():
    kit = mk()
    PINK = 0xEFC9C9
    kit.add('paint', wb('ground', -3.6, 3.6, -3.2, 4.2, -0.08, 0.02, 0.0), 0xA6865E)
    box_walls(kit, 'plaster', -3.0, 3.0, -3.0, 3.0, 3.4, 0.25, PINK, front_ops=[(-0.5, 0.5, 0, 2.2), (1.4, 2.5, 1.1, 2.3)])
    door_set(kit, -0.5, 0.5, 2.2, 3.0, 0x2E6FB5)
    win_set(kit, 1.4, 2.5, 1.1, 2.3, 3.0, 0x2E6FB5)
    kit.add('plinth', wb('band_f', -3.02, 3.02, 2.95, 3.03, 0, 0.8, 0.0), 0xC97A4A)
    kit.add('plinth', wb('band_r', 2.95, 3.03, -3.0, 3.0, 0, 0.8, 0.0), 0xC97A4A)
    kit.add('plinth', wb('band_l', -3.03, -2.95, -3.0, 3.0, 0, 0.8, 0.0), 0xC97A4A)
    flat_roof(kit, -3.0, 3.0, -3.0, 3.0, 3.4, 0.6, PINK, band=0xC97A4A)
    # chabutra: 1.5 m deep, 0.3 high platform across the front + two steps
    kit.add('trim', wb('chabutra', -3.1, 3.1, 3.0, 4.5, 0, 0.3, 0.01), 0xA9A69F)
    kit.add('trim', wb('cstep', -0.7, 0.7, 4.5, 4.85, 0, 0.15, 0.006), 0xA3A097)
    # bamboo ladder to the roof on the right, clothesline + charpai on the roof, bicycle, potted-plant stand
    for dx in (0.0, 0.4):
        kit.add('wood', limb('ladder_rail', (2.8 + dx, 3.5, 0.3), (2.8 + dx, 3.15, 4.2), 0.05, 0.05), 0xB0A070)
    for k in range(10):
        h = 0.5 + k * 0.38
        kit.add('wood', limb('rung', (2.8, 3.46 - k * 0.035, h), (3.2, 3.46 - k * 0.035, h), 0.04, 0.04), 0xA89A64)
    kit.add('wood', limb('pole_l', (-2.6, 1.0, 4.0), (-2.6, 1.0, 5.4), 0.04), 0xB0A070)
    kit.add('wood', limb('pole_r', (-0.6, 1.0, 4.0), (-0.6, 1.0, 5.4), 0.04), 0xB0A070)
    kit.add('paint', limb('line', (-2.6, 1.0, 5.3), (-0.6, 1.0, 5.3), 0.012), 0xB89A64)
    for k, c in enumerate((0xC0392B, 0x3B5BA5, 0xEEE6D2)):
        kit.add('paint', wb('cloth', -2.4 + k * 0.6, -2.0 + k * 0.6, 0.98, 1.02, 4.6, 5.28, 0.0), c)
    pk.charpai(kit, 1.2, -1.4, 0.0, 1.9, 0.9) if False else None
    bicycle(kit, -2.7, 3.9, 0x2A3A42)
    kit.add('brick', wb('stand', -2.2, -1.8, 3.1, 3.5, 0.3, 0.75, 0.01), 0xB5603C)
    kit.add('paint', cyl('pot', -2.0, 3.3, 0.75, 1.0, 0.16, 0.22, 10), 0xB5693F)
    fin(kit, 'c')


# ------------------------------------------------------------------------------------------------ D: single storey + stair room, verandah, wall + gate
def type_d():
    kit = mk()
    PEACH = 0xF0C9A4
    MAR = 0x7A3A3A
    kit.add('paint', wb('ground', -4, 4, -6.2, 5.2, -0.08, 0.02, 0.0), 0xA6865E)
    # house 7 x 6.5 at the back, 4 m; verandah 2.2 m on three square pillars; front yard 3.2 m with a 1 m wall + gate
    box_walls(kit, 'plaster', -3.5, 3.5, -6.0, 0.5, 3.6, 0.28, PEACH, front_ops=[(-0.55, 0.55, 0, 2.3), (-3.0, -1.6, 1.1, 2.3), (1.6, 3.0, 1.1, 2.3)])
    door_set(kit, -0.55, 0.55, 2.3, 0.5, 0x5A3C28)
    win_set(kit, -3.0, -1.6, 1.1, 2.3, 0.5, 0x5A3C28)
    win_set(kit, 1.6, 3.0, 1.1, 2.3, 0.5, 0x5A3C28)
    kit.add('plinth', wb('band_f', -3.52, 3.52, 0.45, 0.53, 0, 0.9, 0.0), MAR)
    # verandah slab + pillars, terrace with a lattice parapet
    kit.add('trim', wb('ver_floor', -3.5, 3.5, 0.5, 2.7, 0, 0.3, 0.01), 0xA9A69F)
    for k, d in enumerate((0.15, 0.3)):
        kit.add('trim', wb('ver_step', -1.0, 1.0, 2.7 + (0.3 - d) * 1.2, 3.0 + (0.3 - d) * 1.2, 0, d, 0.006), 0xA3A097)
    for x in (-3.3, 0.0, 3.3):
        kit.add('plaster', wb('pillar', x - 0.2, x + 0.2, 2.3, 2.7, 0.3, 3.6, 0.01), PEACH)
        kit.add('plinth', wb('pillar_base', x - 0.23, x + 0.23, 2.27, 2.73, 0.3, 1.0, 0.01), MAR)
    kit.add('plaster', wb('ver_beam', -3.5, 3.5, 2.2, 2.8, 3.2, 3.6, 0.01), PEACH)
    kit.add('trim', wb('slab', -3.75, 3.75, -6.25, 2.95, 3.6, 3.8, 0.01), 0xB4B1A9)
    kit.add('plinth', wb('slab_line', -3.77, 3.77, -6.27, 2.97, 3.64, 3.72, 0.0), MAR)
    # lattice parapet (jaali): base rail, bars, cap
    for (a, b, c, d) in ((-3.75, 3.75, -6.25, -6.07), (-3.75, 3.75, 2.77, 2.95), (-3.75, -3.57, -6.07, 2.77), (3.57, 3.75, -6.07, 2.77)):
        kit.add('plaster', wb('par_base', a, b, c, d, 3.8, 4.05, 0.0), PEACH)
        kit.add('plaster', wb('par_cap', a - 0.04, b + 0.04, c - 0.04, d + 0.04, 4.55, 4.65, 0.0), PEACH)
        along_x = (b - a) > (d - c)
        n = int(max(b - a, d - c) / 0.3)
        for k in range(n + 1):
            if along_x:
                x = a + 0.15 + (b - a - 0.3) * k / n
                kit.add('plaster', wb('jaali', x - 0.06, x + 0.06, c, d, 4.05, 4.55, 0.0), PEACH)
            else:
                z = c + 0.15 + (d - c - 0.3) * k / n
                kit.add('plaster', wb('jaali', a, b, z - 0.06, z + 0.06, 4.05, 4.55, 0.0), PEACH)
    kit.add('plinth', wb('par_band', -3.77, 3.77, 2.7, 3.0, 4.05, 4.12, 0.0), MAR)
    # stair room (mumty) on the roof, back-right, 2 x 2 m, 2.4 m, with a door + black tank
    kit.add('plaster', wb('mumty', 1.4, 3.4, -5.8, -3.8, 3.8, 6.2, 0.01), PEACH)
    kit.add('trim', wb('mumty_slab', 1.25, 3.55, -5.95, -3.65, 6.2, 6.35, 0.01), 0xB4B1A9)
    kit.add('metal', wb('mumty_door', 1.9, 2.8, -3.82, -3.75, 3.85, 5.8, 0.004), 0x7C8186)
    roof_tank(kit, -1.2, -4.5, 4.05)
    # front yard wall 1 m, gate 2.2 m with maroon bars + gold tips
    for (a, b) in ((-3.7, -1.1), (1.1, 3.7)):
        kit.add('plaster', wb('yard_wall', a, b, 4.5, 4.78, 0, 1.0, 0.01), PEACH)
        kit.add('plinth', wb('yard_wall_band', a - 0.02, b + 0.02, 4.47, 4.81, 0, 0.35, 0.0), MAR)
        kit.add('plinth', wb('yard_wall_cap', a - 0.04, b + 0.04, 4.45, 4.83, 1.0, 1.08, 0.0), MAR)
    for sx0, sx1 in ((-3.7, -3.42), (3.42, 3.7)):
        kit.add('plaster', wb('yard_wall_s', sx0, sx1, 0.5, 4.5, 0, 1.0, 0.01), PEACH)
    for sg in (-1, 1):
        kit.add('plaster', wb('gate_pier', sg * 1.2 - 0.18, sg * 1.2 + 0.18, 4.45, 4.83, 0, 1.4, 0.01), PEACH)
        kit.add('plinth', wb('gate_cap', sg * 1.2 - 0.22, sg * 1.2 + 0.22, 4.41, 4.87, 1.4, 1.5, 0.0), MAR)
        for k in range(1, 7):
            x = sg * (0.05 + k * 0.15)
            kit.add('metal', limb('gate_bar', (x, 4.64, 0.1), (x, 4.64, 1.2), 0.025), MAR)
        for hh in (0.15, 0.6, 1.1):
            kit.add('metal', limb('gate_rail', (sg * 0.02, 4.64, hh), (sg * 1.05, 4.64, hh), 0.05, 0.04), MAR)
    pk.charpai(kit, -1.9, -2.0, 0.0, 1.8, 0.9) if False else None
    kit.add('paint', cyl('tulsi_pot', 3.0, 3.6, 0.0, 0.45, 0.2, 0.26, 10), 0xB5693F)
    fin(kit, 'd')


# ------------------------------------------------------------------------------------------------ E: half-built second floor
def type_e():
    kit = mk()
    MINT = 0xBFE0CB
    kit.add('trim', wb('ground', -3.6, 3.6, -3.6, 4.4, 0, 0.1, 0.01), 0xA9A69F)
    box_walls(kit, 'plaster', -3.0, 3.0, -3.5, 3.5, 3.4, 0.25, MINT, front_ops=[(-0.6, 0.4, 0, 2.2), (1.4, 2.6, 1.1, 2.3)])
    door_set(kit, -0.6, 0.4, 2.2, 3.5, 0x2F7A4A)
    win_set(kit, 1.4, 2.6, 1.1, 2.3, 3.5, 0x2F7A4A)
    kit.add('plinth', wb('band_f', -3.02, 3.02, 3.45, 3.53, 0.1, 0.8, 0.0), 0x8E9DB0)
    kit.add('trim', wb('slab1', -3.2, 3.2, -3.7, 3.7, 3.4, 3.7, 0.01), 0xA9A69F)
    # upper floor: RCC columns with rebar rods, bare brick walls part-built
    for (x, z) in ((-3.0, -3.5), (3.0, -3.5), (-3.0, 3.5), (3.0, 3.5), (0.0, 3.5), (-3.0, 0.0), (3.0, 0.0)):
        kit.add('trim', wb('rcc_col', x - 0.2, x + 0.2, z - 0.2, z + 0.2, 3.7, 5.4, 0.01), 0xA6A39B)
        for dx, dz in ((-0.1, -0.1), (0.1, -0.1), (-0.1, 0.1), (0.1, 0.1)):
            kit.add('metal', limb('rebar', (x + dx, z + dz, 5.4), (x + dx, z + dz, 6.2), 0.02), 0x6A4A32)
    kit.add('brick', wb('up_back', -2.8, 2.8, -3.6, -3.4, 3.7, 5.4, 0.0), 0xFFFFFF)
    kit.add('brick', wb('up_l', -3.1, -2.9, -3.4, 3.4, 3.7, 5.4, 0.0), 0xFFFFFF)
    kit.add('brick', wb('up_r', 2.9, 3.1, -3.4, 3.4, 3.7, 4.9, 0.0), 0xFFFFFF)
    kit.add('brick', wb('up_f1', -2.8, -0.2, 3.4, 3.6, 3.7, 5.4, 0.0), 0xFFFFFF)
    kit.add('brick', wb('up_f2', 0.2, 1.4, 3.4, 3.6, 3.7, 4.5, 0.0), 0xFFFFFF)
    kit.add('brick', wb('up_f3', 1.4, 2.8, 3.4, 3.6, 3.7, 5.0, 0.0), 0xFFFFFF)
    # sand heap, brick pile, a steel basin, clothesline
    kit.add('paint', lathe('sand', -2.0, 4.0, [(1.0, 0.1), (0.85, 0.3), (0.5, 0.55), (0.15, 0.7), (0.0, 0.72)], seg=14), 0xC9A878)
    for k in range(5):
        for j in range(3 - (k % 2)):
            kit.add('brick', wb('pile', 1.6 + j * 0.25, 1.6 + j * 0.25 + 0.23, 4.0 + (k % 2) * 0.1, 4.11 + (k % 2) * 0.1, 0.1 + k * 0.077, 0.1 + (k + 1) * 0.077, 0.0), 0xB5603C)
    kit.add('metal', cyl('basin', 0.6, 4.2, 0.1, 0.2, 0.3, 0.2, 12), STEEL)
    for x in (-3.4, -0.6):
        kit.add('wood', limb('pole', (x, 3.9, 0.1), (x, 3.9, 2.2), 0.04), 0xB0A070)
    kit.add('paint', limb('line', (-3.4, 3.9, 2.1), (-0.6, 3.9, 2.1), 0.012), 0xB89A64)
    fin(kit, 'e')


# ------------------------------------------------------------------------------------------------ F: old ancestral house
def type_f():
    kit = mk()
    kit.add('paint', wb('ground', -4.0, 4.0, -4.4, 5.0, -0.08, 0.02, 0.0), 0xA6865E)
    OLD = 0xD7A58A
    box_walls(kit, 'brick', -3.5, 3.5, -4.0, 4.0, 3.9, 0.35, OLD, front_ops=[(-0.9, 0.9, 0, 3.0)], back_ops=[(-0.6, 0.6, 0, 2.2)], side_ops=[(-0.4, 0.6, 1.2, 2.3)])
    # arched wooden doorway with carved frame: dark leaf, studs, arch head, stepped stone threshold
    kit.add('wood', wb('door_leaf', -0.85, 0.85, 3.7, 3.85, 0.15, 2.4, 0.01), 0x3A2A22)
    pts = [(-0.85 + 1.7 * k / 14, 2.4 + 0.5 * math.sin(math.pi * k / 14)) for k in range(15)]
    kit.add('wood', prism_z('door_arch', 3.7, 3.85, pts + [(0.85, 2.4), (-0.85, 2.4)]), 0x3A2A22)
    for xx0, xx1 in ((-1.05, -0.88), (0.88, 1.05)):
        kit.add('wood', wb('frame', xx0, xx1, 3.62, 4.08, 0.1, 3.1, 0.01), 0x5A4030)
    kit.add('wood', wb('frame_top', -1.05, 1.05, 3.62, 4.08, 2.95, 3.25, 0.01), 0x5A4030)
    for r in range(5):
        for c in range(3):
            kit.add('metal', sphere('stud', -0.5 + c * 0.5, 3.88, 0.5 + r * 0.45, 0.03, 0.03, 0.03, 1), 0x2A2A2C)
    for k in range(3):
        kit.add('trim', wb('stone_step', -1.3 - k * 0.15, 1.3 + k * 0.15, 4.0 + k * 0.3 - 0.0 if False else 4.0 + (2 - k) * 0.3, 4.3 + (2 - k) * 0.3 + 0.0, 0, 0.12 * (k + 1), 0.01), 0x9C998F)
    # small jharokha above the door, two window jharokhas, niches (taq), jaali-balustrade parapet, a stone slab roof
    def jharokha(cx, cz, h, w=1.0):
        kit.add('wood', wb('jh_floor', cx - w / 2, cx + w / 2, cz, cz + 0.6, h, h + 0.1, 0.01), 0x5A4030)
        for x in (cx - w / 2 + 0.05, cx + w / 2 - 0.05):
            kit.add('wood', wb('jh_post', x - 0.04, x + 0.04, cz + 0.5, cz + 0.58, h + 0.1, h + 1.0, 0.0), 0x5A4030)
        kit.add('wood', wb('jh_roof', cx - w / 2 - 0.1, cx + w / 2 + 0.1, cz - 0.02, cz + 0.7, h + 1.0, h + 1.1, 0.008), 0x5A4030)
        kit.add('wood', wb('jh_screen', cx - w / 2 + 0.1, cx + w / 2 - 0.1, cz + 0.45, cz + 0.5, h + 0.1, h + 0.85, 0.0), 0x4A3426)
        for k in range(1, 6):
            x = cx - w / 2 + 0.1 + k * (w - 0.2) / 6
            kit.add('wood', wb('jh_bar', x - 0.012, x + 0.012, cz + 0.5, cz + 0.55, h + 0.1, h + 0.85, 0.0), 0x2A2A2C)
    jharokha(0.0, 4.0, 3.0, 1.1)
    jharokha(-2.4, 4.0, 1.6, 0.9)
    for x in (-2.4 + 5.0 - 0.0, 2.4):
        pass
    for x in (-1.9, 1.9):
        kit.add('paint', wb('niche', x - 0.2, x + 0.2, 3.9, 4.05, 1.2, 1.8, 0.0), 0x4A2E22)
        kit.add('plaster', wb('niche_arch_top', x - 0.2, x + 0.2, 3.95, 4.07, 1.8, 1.9, 0.0), 0xD7C9A8)
    kit.add('trim', wb('slab', -3.7, 3.7, -4.2, 4.2, 3.9, 4.1, 0.01), 0xB0AA9C)
    for (a, b, c, d) in ((-3.7, 3.7, -4.2, -3.97), (-3.7, 3.7, 3.97, 4.2), (-3.7, -3.47, -3.97, 3.97), (3.47, 3.7, -3.97, 3.97)):
        kit.add('brick', wb('par_base', a, b, c, d, 4.1, 4.3, 0.0), OLD)
        n = int(max(b - a, d - c) / 0.25)
        for k in range(n + 1):
            if (b - a) > (d - c):
                x = a + 0.1 + (b - a - 0.2) * k / n
                kit.add('trim', lathe('baluster', x, (c + d) / 2, [(0.05, 4.3), (0.07, 4.45), (0.05, 4.6), (0.07, 4.75), (0.05, 4.9)], seg=6), 0xD0CBBB)
            else:
                z = c + 0.1 + (d - c - 0.2) * k / n
                kit.add('trim', lathe('baluster', (a + b) / 2, z, [(0.05, 4.3), (0.07, 4.45), (0.05, 4.6), (0.07, 4.75), (0.05, 4.9)], seg=6), 0xD0CBBB)
        kit.add('trim', wb('par_cap', a - 0.04, b + 0.04, c - 0.04, d + 0.04, 4.9, 5.0, 0.0), 0xD0CBBB)
    # faded lime-wash patches (paint slabs: irregular), a brass pot by the step
    for (x, h, w, hh) in ((-2.7, 2.0, 1.0, 0.9), (2.3, 2.6, 1.3, 0.9), (-1.4, 0.8, 0.8, 0.7), (2.8, 1.2, 0.6, 0.8), (1.2, 3.1, 0.9, 0.5)):
        kit.add('paint', wb('lime_patch', x - w / 2, x + w / 2, 4.0, 4.015, h, h + hh, 0.0), 0xE4DCCB)
    kit.add('metal', lathe('brass_pot', 1.5, 4.9, [(0.0, 0.0), (0.12, 0.0), (0.2, 0.12), (0.16, 0.3), (0.1, 0.34), (0.12, 0.4), (0.0, 0.4)], seg=12), BRASS)
    fin(kit, 'f')


# ------------------------------------------------------------------------------------------------ G: modern kothi
def type_g():
    kit = mk()
    CRM = 0xEFE0B8
    MAR = 0x7A3030
    kit.add('paint', wb('ground', -6.0, 6.0, -9.5, 9.5, -0.08, 0.02, 0.0), 0xA6865E)
    kit.add('trim', wb('court', -5.5, 5.5, -9.0, 9.0, 0, 0.1, 0.01), 0xB5AE9E)
    # main block 8 x 11: 2 storeys + stair room: floors 3.6 + 3.6; front at z = 2
    X0, X1, Z0, Z1 = -4.0, 4.0, -9.0, 2.0
    box_walls(kit, 'plaster', X0, X1, Z0, Z1, 3.6, 0.3, CRM, front_ops=[(-0.9, 0.9, 0, 2.6), (-3.4, -2.2, 0.9, 2.9), (2.2, 3.4, 0.9, 2.9)])
    kit.add('trim', wb('floor1', X0 - 0.15, X1 + 0.15, Z0 - 0.15, Z1 + 1.2, 3.6, 3.85, 0.01), 0xB4B1A9)
    add_h = 3.85
    for (a, b, c, d) in ((X0, X1, Z0, Z0 + 0.3), (X0, X0 + 0.3, Z0 + 0.3, Z1 - 0.3), (X1 - 0.3, X1, Z0 + 0.3, Z1 - 0.3)):
        kit.add('plaster', wb('uw', a, b, c, d, add_h, add_h + 3.4, 0.0), CRM)
    ops = [(-3.4, -2.2, 0.9, 2.9), (2.2, 3.4, 0.9, 2.9), (-0.9, 0.9, 0, 2.6)]
    cur = X0
    for a, b, lo, hi in sorted(ops):
        kit.add('plaster', wb('uf', cur, a, Z1 - 0.3, Z1, add_h, add_h + 3.4, 0.0), CRM)
        if lo > 0:
            kit.add('plaster', wb('uf_sill', a, b, Z1 - 0.3, Z1, add_h, add_h + lo, 0.0), CRM)
        kit.add('plaster', wb('uf_lin', a, b, Z1 - 0.3, Z1, add_h + hi, add_h + 3.4, 0.0), CRM)
        cur = b
    kit.add('plaster', wb('uf', cur, X1, Z1 - 0.3, Z1, add_h, add_h + 3.4, 0.0), CRM)
    for xa, xb, lo, hi in ((-3.4, -2.2, 0.9, 2.9), (2.2, 3.4, 0.9, 2.9)):
        for base in (0.0, add_h):
            kit.add('paint', wb('glass', xa + 0.05, xb - 0.05, Z1 - 0.15, Z1 - 0.12, base + lo, base + hi, 0.0), 0x4F6B78)
            for xx0, xx1, y0, y1 in ((xa, xa + 0.1, lo, hi), (xb - 0.1, xb, lo, hi), (xa, xb, hi - 0.1, hi), (xa, xb, lo, lo + 0.1), (xa, xb, (lo + hi) / 2, (lo + hi) / 2 + 0.08)):
                kit.add('plinth', wb('gframe', xx0, xx1, Z1 - 0.2, Z1 + 0.05, base + y0, base + y1, 0.0), MAR)
    # carved door + moulded pillars, granite porch with steps, steel-and-glass balcony
    kit.add('wood', wb('door_leaf', -0.85, 0.85, Z1 - 0.14, Z1 - 0.06, 0.05, 2.55, 0.004), 0x8A5A2E)
    for xx in (-0.55, 0.05):
        kit.add('wood', wb('door_carve', xx, xx + 0.5, Z1 - 0.06, Z1 - 0.03, 0.3, 2.3, 0.003), 0x6A4220)
    kit.add('trim', wb('porch', -2.2, 2.2, Z1, Z1 + 1.2, 0, 0.3, 0.01), 0x8A7F77)
    for k in range(2):
        kit.add('trim', wb('porch_step', -1.5 - k * 0.2, 1.5 + k * 0.2, Z1 + 1.2 + k * 0.3, Z1 + 1.5 + k * 0.3, 0, 0.15 * (2 - k), 0.006), 0x8A7F77) if False else None
    for sg in (-1, 1):
        for h0, h1 in ((0.3, 3.6), (add_h, add_h + 3.0)):
            kit.add('trim', lathe('pillar', sg * 1.9, Z1 + 1.0, [(0.2, h0), (0.15, h0 + 0.2), (0.13, h0 + 0.5), (0.13, h1 - 0.5), (0.15, h1 - 0.2), (0.2, h1)], seg=10), 0xE6C9C0)
    kit.add('plaster', wb('porch_beam', -2.2, 2.2, Z1 + 0.9, Z1 + 1.2, 3.3, 3.6, 0.01), CRM)
    kit.add('plinth', wb('porch_band', -2.25, 2.25, Z1 + 1.15, Z1 + 1.25, 3.5, 3.6, 0.0), MAR)
    kit.add('metal', wb('bal_floor', -2.2, 2.2, Z1, Z1 + 1.2, add_h - 0.05, add_h, 0.0), 0xB4B1A9)
    for x in [-2.1 + k * 0.7 for k in range(7)]:
        kit.add('metal', limb('bal_post', (x, Z1 + 1.15, add_h), (x, Z1 + 1.15, add_h + 1.0), 0.04), STEEL)
    kit.add('metal', limb('bal_rail', (-2.2, Z1 + 1.15, add_h + 1.0), (2.2, Z1 + 1.15, add_h + 1.0), 0.05, 0.04), STEEL)
    kit.add('paint', wb('bal_glass', -2.15, 2.15, Z1 + 1.15, Z1 + 1.17, add_h + 0.2, add_h + 0.95, 0.0), 0xAFC8D2)
    # maroon bands, cream tile joint lines on the elevation (thin dark lines)
    for h in (3.6, 7.3):
        kit.add('plinth', wb('band', X0 - 0.17, X1 + 0.17, Z1 - 0.05, Z1 + 0.18, h - 0.2, h + 0.0, 0.0), MAR)
    for k in range(1, 8):
        kit.add('paint', wb('tile_v', X0 + k - 0.01, X0 + k + 0.01, Z1 + 0.0, Z1 + 0.006, 0.1, 3.5, 0.0), 0xCFC09A)
    # roof: slab with parapet, stair room, 2 tanks, solar panel, dish, AC unit
    top = add_h + 3.4
    kit.add('trim', wb('roof', X0 - 0.2, X1 + 0.2, Z0 - 0.2, Z1 + 1.4, top, top + 0.2, 0.01), 0xB4B1A9)
    for (a, b, c, d) in ((X0, X1, Z0, Z0 + 0.2), (X0, X1, Z1 - 0.2, Z1), (X0, X0 + 0.2, Z0 + 0.2, Z1 - 0.2), (X1 - 0.2, X1, Z0 + 0.2, Z1 - 0.2)):
        kit.add('plaster', wb('rpar', a, b, c, d, top + 0.2, top + 1.0, 0.0), CRM)
        kit.add('plinth', wb('rpar_cap', a - 0.04, b + 0.04, c - 0.04, d + 0.04, top + 1.0, top + 1.08, 0.0), MAR)
    kit.add('plaster', wb('mumty', -3.0, -1.0, -8.0, -6.0, top + 0.2, top + 2.6, 0.01), CRM)
    kit.add('plinth', wb('mumty_cap', -3.1, -0.9, -8.1, -5.9, top + 2.6, top + 2.7, 0.0), MAR)
    roof_tank(kit, 2.0, -7.0, top + 0.2)
    roof_tank(kit, 3.2, -7.0, top + 0.2)
    for k in range(3):
        kit.add('paint', limb('solar', (-0.2 + k * 0.62, -4.0, top + 1.0), (-0.2 + k * 0.62, -3.1, top + 1.5), 0.58, 0.04), 0x24417A)
    kit.add('metal', cyl('dish', 3.2, -2.0, top + 0.5, top + 0.7, 0.35, 0.12, 16), 0xD5D8DA)
    kit.add('metal', limb('dish_stand', (3.2, -2.0, top + 0.2), (3.2, -2.0, top + 0.6), 0.05), 0x6C7074)
    kit.add('paint', wb('ac_unit', X1, X1 + 0.5, -3.0, -2.0, 2.2, 2.7, 0.02), 0xE6E4DE)
    kit.add('metal', cyl('ac_fan', X1 + 0.5, -2.5, 2.3, 2.6, 0.2, 0.2, 12), 0x8A8D90) if False else None
    # front court wall 1.5 m, tiled + black laser-cut gate with gold tips (3 m), side + back wall
    for (a, b) in ((-5.5, -1.7), (1.7, 5.5)):
        kit.add('plaster', wb('cwall', a, b, 7.9, 8.2, 0, 1.5, 0.01), 0xE4D4A8)
        kit.add('plinth', wb('cwall_band', a, b, 7.87, 8.23, 1.25, 1.35, 0.0), MAR)
        kit.add('plinth', wb('cwall_cap', a - 0.03, b + 0.03, 7.85, 8.25, 1.5, 1.58, 0.0), MAR)
    for sx in (-5.5, 5.4):
        kit.add('plaster', wb('cwall_s', sx, sx + 0.12, -9.0, 8.0, 0, 1.5, 0.01), 0xE4D4A8)
        kit.add('plinth', wb('cwall_s_cap', sx - 0.03, sx + 0.15, -9.0, 8.0, 1.5, 1.58, 0.0), MAR)
    kit.add('plaster', wb('cwall_b', -5.5, 5.5, -9.0, -8.88, 0, 1.5, 0.01), 0xE4D4A8)
    for sg in (-1, 1):
        kit.add('plaster', wb('gpier', sg * 1.85 - 0.25, sg * 1.85 + 0.25, 7.85, 8.25, 0, 1.9, 0.01), 0xE4D4A8)
        kit.add('metal', sphere('gtip', sg * 1.85, 8.05, 1.98, 0.07, 0.07, 0.09, 1), 0xC9A23A)
        kit.add('metal', wb('gleaf', sg * 0.0 if sg < 0 else 0.0, sg * 1.6 if sg > 0 else -1.6, 8.0, 8.06, 0.15, 1.6, 0.0), 0x1B1B1D) if False else None
    for xa, xb in ((-1.6, -0.02), (0.02, 1.6)):
        kit.add('metal', wb('gleaf', xa, xb, 8.0, 8.06, 0.15, 1.6, 0.004), 0x1B1B1D)
        for k in range(1, 6):
            kit.add('paint', wb('gcut', xa + k * (xb - xa) / 6 - 0.1, xa + k * (xb - xa) / 6 + 0.1, 8.06, 8.07, 0.4, 1.4, 0.0), 0x3A3A3E)
    for k in range(9):
        x = -1.6 + k * 0.4
        kit.add('metal', sphere('gleaf_tip', x, 8.03, 1.65, 0.035, 0.035, 0.05, 1), 0xC9A23A)
    fin(kit, 'g')


# ------------------------------------------------------------------------------------------------ H: farmer's compound
def type_h():
    kit = mk('tin')
    CRM = 0xE8D3A8
    MAR = 0x7A3A3A
    kit.add('paint', wb('ground', -9.6, 9.6, -8.6, 8.6, -0.08, 0.03, 0.0), 0xA6865E)
    kit.add('paint', wb('yard_worn', -5, 8, -1, 7.5, 0.03, 0.036, 0.0), 0xB59468)
    # 2.4 m cream wall with a maroon band, green tractor-width gate (4 m) at the front
    for (a, b, c, d) in ((-9, -2.2, 7.7, 8.0), (2.2, 9, 7.7, 8.0), (-9, 9, -8.0, -7.7), (-9, -8.7, -7.7, 7.7), (8.7, 9, -7.7, 7.7)):
        kit.add('plaster', wb('wall', a, b, c, d, 0, 2.4, 0.01), CRM)
        kit.add('plinth', wb('wall_band', a - 0.02, b + 0.02, c - 0.03, d + 0.03, 0, 0.7, 0.0), MAR)
        kit.add('plinth', wb('wall_cap', a - 0.05, b + 0.05, c - 0.05, d + 0.05, 2.4, 2.5, 0.0), MAR)
    for sg in (-1, 1):
        kit.add('plaster', wb('gpier', sg * 2.4 - 0.3, sg * 2.4 + 0.3, 7.6, 8.1, 0, 3.0, 0.01), CRM)
        kit.add('plinth', wb('gpier_band', sg * 2.4 - 0.33, sg * 2.4 + 0.33, 7.57, 8.13, 0, 0.7, 0.0), MAR)
        kit.add('plinth', wb('gpier_cap', sg * 2.4 - 0.37, sg * 2.4 + 0.37, 7.55, 8.15, 3.0, 3.1, 0.0), MAR)
    for xa, xb in ((-2.1, -0.02), (0.02, 2.1)):
        kit.add('metal', wb('gleaf', xa, xb, 7.85, 7.93, 0.1, 2.6, 0.004), 0x2F6A4A)
        for k in range(1, 6):
            kit.add('metal', wb('gleaf_rib', xa + k * (xb - xa) / 6 - 0.02, xa + k * (xb - xa) / 6 + 0.02, 7.93, 7.96, 0.15, 2.55, 0.0), 0x24543A)
        kit.add('metal', wb('gleaf_rail', xa, xb, 7.93, 7.97, 1.25, 1.32, 0.0), 0x24543A)
    # 2-storey verandah house at the back: 14 x 5, verandah 2.5, 7.8 m, pillars, balustrade, tanks
    HX0, HX1, HZ0, HZ1 = -7.0, 7.0, -7.5, -2.5
    box_walls(kit, 'plaster', HX0, HX1, HZ0, HZ1, 3.4, 0.28, CRM, front_ops=[(-1.0, 0.0, 0, 2.3), (-5.0, -3.8, 1.1, 2.3), (3.8, 5.0, 1.1, 2.3)])
    kit.add('trim', wb('slab1', HX0 - 0.1, HX1 + 0.1, HZ0 - 0.1, HZ1 + 2.7, 3.4, 3.65, 0.01), 0xB4B1A9)
    for x in range(-6, 7, 3):
        kit.add('plinth', wb('pil_base', x - 0.23, x + 0.23, HZ1 + 2.0, HZ1 + 2.46, 0, 1.0, 0.01), MAR)
        kit.add('plaster', wb('pillar', x - 0.2, x + 0.2, HZ1 + 2.02, HZ1 + 2.42, 1.0, 3.4, 0.01), CRM)
    box_walls(kit, 'plaster', HX0, HX1, HZ0, HZ1, 3.4, 0.28, CRM) if False else None
    for (a, b, c, d) in ((HX0, HX1, HZ0, HZ0 + 0.28), (HX0, HX0 + 0.28, HZ0 + 0.28, HZ1), (HX1 - 0.28, HX1, HZ0 + 0.28, HZ1)):
        kit.add('plaster', wb('uw', a, b, c, d, 3.65, 6.9, 0.0), CRM)
    kit.add('plaster', wb('uw_f', HX0, HX1, HZ1 - 0.28, HZ1, 3.65, 4.6, 0.0), CRM)
    kit.add('plaster', wb('uw_f2', HX0, HX1, HZ1 - 0.28, HZ1, 6.0, 6.9, 0.0), CRM)
    for x in (-6.5, -3.5, -0.5, 2.5, 5.5):
        kit.add('plaster', wb('uw_pier', x - 0.3, x + 0.3, HZ1 - 0.28, HZ1, 4.6, 6.0, 0.0), CRM)
    kit.add('trim', wb('slab2', HX0 - 0.1, HX1 + 0.1, HZ0 - 0.1, HZ1 + 0.1, 6.9, 7.15, 0.01), 0xB4B1A9)
    for (a, b, c, d) in ((HX0, HX1, HZ0, HZ0 + 0.18), (HX0, HX1, HZ1 - 0.18, HZ1), (HX0, HX0 + 0.18, HZ0 + 0.18, HZ1 - 0.18), (HX1 - 0.18, HX1, HZ0 + 0.18, HZ1 - 0.18)):
        kit.add('plaster', wb('rpar', a, b, c, d, 7.15, 7.8, 0.0), CRM)
        kit.add('plinth', wb('rpar_cap', a - 0.04, b + 0.04, c - 0.04, d + 0.04, 7.8, 7.88, 0.0), MAR)
    for x in [HX0 + 0.3 + k * 0.45 for k in range(int((HX1 - HX0 - 0.6) / 0.45) + 1)]:
        kit.add('metal', limb('bal', (x, HZ1 + 2.3, 3.65), (x, HZ1 + 2.3, 4.6), 0.03), 0x4A4D52)
    kit.add('metal', limb('bal_rail', (HX0, HZ1 + 2.3, 4.6), (HX1, HZ1 + 2.3, 4.6), 0.05, 0.04), 0x4A4D52)
    kit.add('plinth', wb('band', HX0 - 0.12, HX1 + 0.12, HZ1 + 2.55, HZ1 + 2.7, 3.45, 3.6, 0.0), MAR)
    roof_tank(kit, 4.0, -5.0, 7.15)
    roof_tank(kit, 5.2, -5.0, 7.15)
    # empty tin tractor shed (posts + corrugated sheets) at the back-right of the yard, 2 steel grain bins, chaff cutter, trough, charpai, neem platform
    sx0, sx1, sz0, sz1 = 3.5, 8.0, -1.5, 3.5
    for (x, z, h) in ((sx0, sz0, 3.4), (sx1, sz0, 3.4), (sx0, sz1, 3.0), (sx1, sz1, 3.0)):
        kit.add('metal', limb('shed_post', (x, z, 0), (x, z, h), 0.14, 0.14), 0x7C8186)
    for k in range(5):
        xa = sx0 - 0.3 + k * 1.0
        kit.add('tin', prism_x('shed_sheet', xa, xa + 0.98, [(sz0 - 0.3, 3.45), (sz1 + 0.3, 3.0), (sz1 + 0.3, 3.05), (sz0 - 0.3, 3.5)]), (0xA0A4A8, 0x8C9296)[k % 2])
    for (bx, bz) in ((-8.0, -4.5), (-6.8, -4.5)):
        pass
    for k, (bx, bz) in enumerate(((-7.9, 0.0), (-7.9, 1.8))):
        kit.add('metal', cyl('bin', bx, bz, 0.4, 2.2, 0.7, 0.7, 18), 0xA6ABAE)
        kit.add('metal', lathe('bin_cone', bx, bz, [(0.72, 2.2), (0.4, 2.7), (0.0, 2.85)], seg=18), 0x8E9396)
        for hh in (0.9, 1.5):
            kit.add('metal', cyl('bin_rib', bx, bz, hh, hh + 0.05, 0.73, 0.73, 18), 0x8A8F94)
        for dx, dz in ((-0.5, -0.5), (0.5, -0.5), (-0.5, 0.5), (0.5, 0.5)):
            kit.add('metal', limb('bin_leg', (bx + dx, bz + dz, 0), (bx + dx, bz + dz, 0.45), 0.08), 0x6C7074)
    cx, cz = 0.5, 1.5
    for dz in (-0.35, 0.35):
        kit.add('metal', limb('cc_leg', (cx - 0.5, cz + dz, 0), (cx - 0.3, cz + dz, 0.9), 0.07), 0x2E5E3A)
        kit.add('metal', limb('cc_leg2', (cx + 0.5, cz + dz, 0), (cx + 0.3, cz + dz, 0.9), 0.07), 0x2E5E3A)
    kit.add('metal', wb('cc_box', cx - 0.5, cx + 0.5, cz - 0.3, cz + 0.3, 0.9, 1.1, 0.01), 0x2E5E3A)
    kit.add('metal', ring('cc_wheel', cx + 0.1, cz + 0.4, 1.0, 0.45, 0.04, axis='z'), 0x1E1E20)
    kit.add('trim', wb('trough', 5.0, 7.5, 4.8, 5.5, 0, 0.55, 0.02), 0xA9A69F)
    kit.add('paint', wb('trough_water', 5.1, 7.4, 4.9, 5.4, 0.4, 0.46, 0.0), 0x5E8A86)
    pk.charpai(kit, -3.0, 3.5, 0.0)
    pk.brick_ring(kit, 6.5, -0.5, 1.4, 0, 0.35, 0.34, 20) if False else None
    pk.brick_ring(kit, -6.5, 5.5, 1.4, 0, 0.35, 0.34, 20)
    kit.add('paint', cyl('neem_soil', -6.5, 5.5, 0.0, 0.3, 1.2, 1.2, 20), 0x4A3524)
    fin(kit, 'h')


for fn in (type_a, type_b, type_c, type_d, type_e, type_f, type_g, type_h):
    fn()
