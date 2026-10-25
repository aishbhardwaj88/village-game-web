"""
Gurukul Vidyalaya - built with arch.py's Kit to Places V1/gurukul/LAYOUT.md (spec) and the approved
MAIN_gurukul_top_LOWRES.png (TOP = layout authority), MAIN_gurukul_isometric.png (look), MAIN_gurukul_front_sides.png (elevations).

Run:  tools/blender/make.sh gurukul gurukul

Frame: site-local metres, +x east, +z south; compound x[-30,30] z[-22.5,22.5], gate at the centre of the front wall (z=+22.5).
  FRONT      2.5 m exposed red brick wall, cream coping, 5 m bottle-green two-leaf wrought-iron gate, brick pillars 4.5 m with stepped
             cream caps and an iron lantern each, cream arch over the gate carrying a BLANK board (text painted in-game).
  BACK       block 9 m deep (6 m rooms + 3 m verandah) full 60 m; centre 36 m is TWO storeys (7.8 m to the parapet), the ends single (4.4 m).
  WINGS      x[-30,-21], 9 m deep, run 31 m from the back wall (stop 14 m short of the front wall); their outer faces ARE the side boundary.
  VERANDAHS  continuous round brick arches on square piers, red stone floor two steps up; upper gallery on the centre block.
  PARAPETS   brick jaali (lattice) parapets, cream band below, grey concrete roofs, black water tank on the centre roof.
  COURTYARD  two brick paths in a plus, round raised brick platform at the crossing (the neem is hers), hand pump on a stone platform,
             benches, corner-garden planters inside the front corners (trees and flowers are hers: left empty).
Rooms are solid (this is a generic main place she will redesign): recessed green doors and barred windows, no interiors.
"""
import sys
import os
import math
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import wb, limb, cyl, sphere, prism_x, prism_z, ROOT
from arch import Kit, BRASS

OUT = os.path.join(ROOT, 'tmp', 'gurukul_raw.glb')
kit = Kit(split_props=False, own=('metal',), wood_slot='props')

HX, HZ = 30.0, 22.5
BZ0, BZ1 = -22.5, -13.5          # back block z
RM = -16.5                       # room front-wall plane (verandah z[-16.5,-13.5])
WING_Z1 = 8.5
H1 = 3.4                         # ground-floor ceiling
SL = 0.25
H2 = 7.05                        # upper-floor ceiling
GREEN = 0x1E4A33
IRON = 0x1F3A2C
CREAM = 0xEDE0BC
COPE = 0xE9DDB8
GREY = 0xB4B1A9
RED_FLOOR = 0x9A4A38


def add(kind, o, c=None):
    kit.add(kind, o, c)
    return o


def brick(o):
    return add('brick', o)


def cream(o):
    return add('trim', o, COPE)


def arch_spandrels(axis, pos, a0, a1, spring, r, top, t):
    """Wall mass above one round arch: the bay a0..a1 (along the wall), springing at `spring`, radius r, up to `top`, thickness t centred on `pos`.
    axis 'x': wall runs along x at z=pos; axis 'z': wall runs along z at x=pos."""
    ac = (a0 + a1) / 2
    n = 9
    for sg in (-1, 1):
        pts = []
        # outer corner and top, then the arc from the crown down to the springing point on this side
        edge = a0 if sg < 0 else a1
        pts.append((edge, spring))
        pts.append((edge, top))
        pts.append((ac, top))
        for k in range(n):
            th = math.pi / 2 + sg * (-1) * (k / n) * (math.pi / 2) * -1
            th = math.pi / 2 + (k / n) * (math.pi / 2) if sg < 0 else math.pi / 2 - (k / n) * (math.pi / 2)
            pts.append((ac + r * math.cos(th), spring + r * math.sin(th)))
        if axis == 'x':
            o = prism_z('spandrel', pos - t / 2, pos + t / 2, pts)
        else:
            o = prism_x('spandrel', pos - t / 2, pos + t / 2, [(a, h) for a, h in pts])
        brick(o)


def arcade(axis, pos, lo, hi, nbays, floor_h, spring_h, top_h, pier=0.6, t=0.55, cap=True):
    """A row of round arches on square piers: piers + spandrel masses, cream imposts and a cream string course above."""
    bay = (hi - lo) / nbays
    for i in range(nbays + 1):
        c = lo + i * bay
        if axis == 'x':
            brick(wb('pier', c - pier / 2, c + pier / 2, pos - t / 2, pos + t / 2, floor_h, top_h, 0.01))
            cream(wb('impost', c - pier / 2 - 0.05, c + pier / 2 + 0.05, pos - t / 2 - 0.05, pos + t / 2 + 0.05, spring_h - 0.06, spring_h + 0.06, 0.008))
        else:
            brick(wb('pier', pos - t / 2, pos + t / 2, c - pier / 2, c + pier / 2, floor_h, top_h, 0.01))
            cream(wb('impost', pos - t / 2 - 0.05, pos + t / 2 + 0.05, c - pier / 2 - 0.05, c + pier / 2 + 0.05, spring_h - 0.06, spring_h + 0.06, 0.008))
    r = (bay - pier) / 2
    for i in range(nbays):
        a0, a1 = lo + i * bay + pier / 2, lo + (i + 1) * bay - pier / 2
        arch_spandrels(axis, pos, a0, a1, spring_h, r, top_h, t)
        # a cream ring voussoir line round the arch intrados would be a torus: a cream sill line at the crown instead
    return bay


def jaali_parapet(x0, x1, z0, z1, h0, h1, sides='nsew'):
    """Brick lattice parapet: brick base rail, vertical brick bars with a mid rail, cream coping. Sides n/s/e/w."""
    t = 0.2
    base = 0.22
    cop = 0.09

    def run(a0, a1, fixed, along_x):
        brick_boxes = []
        if along_x:
            brick(wb('par_base', a0, a1, fixed - t / 2, fixed + t / 2, h0, h0 + base, 0.0))
            brick(wb('par_mid', a0, a1, fixed - t / 2, fixed + t / 2, (h0 + h1) / 2 - 0.04, (h0 + h1) / 2 + 0.04, 0.0))
            brick(wb('par_top', a0, a1, fixed - t / 2, fixed + t / 2, h1 - cop - 0.1, h1 - cop, 0.0))
            cream(wb('par_cope', a0 - 0.04, a1 + 0.04, fixed - t / 2 - 0.04, fixed + t / 2 + 0.04, h1 - cop, h1, 0.0))
            n = max(1, int((a1 - a0) / 0.34))
            for i in range(n + 1):
                x = a0 + 0.08 + (a1 - a0 - 0.16) * i / n
                brick(wb('par_bar', x - 0.06, x + 0.06, fixed - t / 2, fixed + t / 2, h0 + base, h1 - cop - 0.1, 0.0))
        else:
            brick(wb('par_base', fixed - t / 2, fixed + t / 2, a0, a1, h0, h0 + base, 0.0))
            brick(wb('par_mid', fixed - t / 2, fixed + t / 2, a0, a1, (h0 + h1) / 2 - 0.04, (h0 + h1) / 2 + 0.04, 0.0))
            brick(wb('par_top', fixed - t / 2, fixed + t / 2, a0, a1, h1 - cop - 0.1, h1 - cop, 0.0))
            cream(wb('par_cope', fixed - t / 2 - 0.04, fixed + t / 2 + 0.04, a0 - 0.04, a1 + 0.04, h1 - cop, h1, 0.0))
            n = max(1, int((a1 - a0) / 0.34))
            for i in range(n + 1):
                z = a0 + 0.08 + (a1 - a0 - 0.16) * i / n
                brick(wb('par_bar', fixed - t / 2, fixed + t / 2, z - 0.06, z + 0.06, h0 + base, h1 - cop - 0.1, 0.0))
    if 'n' in sides:
        run(x0, x1, z0 + t / 2, True)
    if 's' in sides:
        run(x0, x1, z1 - t / 2, True)
    if 'w' in sides:
        run(z0 + t, z1 - t, x0 + t / 2, False)
    if 'e' in sides:
        run(z0 + t, z1 - t, x1 - t / 2, False)


def slab(x0, x1, z0, z1, h):
    add('trim', wb('slab', x0, x1, z0, z1, h, h + SL, 0.01), GREY)
    # cream band under the slab edge (the drawings' pale string course)
    cream(wb('band', x0 - 0.05, x1 + 0.05, z0 - 0.05, z1 + 0.05, h - 0.12, h + 0.02, 0.006))


# --------------------------------------------------------------------------------------------- a room facade with recessed doors/windows
def facade_x(zp, outward, x0, x1, h0, h1, bays, wall_t=0.5):
    """A solid brick wall along x at z=zp (outer face toward `outward` = +1/-1 in z), with recessed green doors and barred windows.
    bays: [(centre_x, kind)] kind 'door' or 'win'. The recess is 0.35 deep: pieces + a back panel."""
    za, zb = (zp - wall_t, zp) if outward > 0 else (zp, zp + wall_t)
    face = zb if outward > 0 else za
    ops = []
    for cx, kind in bays:
        if kind == 'door':
            ops.append((cx - 0.8, cx + 0.8, 0.0, 2.6))
        else:
            ops.append((cx - 0.55, cx + 0.55, 1.1, 2.5))
    ops.sort()
    cur = x0
    hh = h1 - h0
    def piece(a, b, lo, hi):
        brick(wb('fac', a, b, za, zb, h0 + lo, h0 + hi, 0.0))
    for a, b, lo, hi in ops:
        if a - cur > 0.01:
            piece(cur, a, 0, hh)
        if lo > 0:
            piece(a, b, 0, lo)
        if hh - hi > 0.01:
            piece(a, b, hi, hh)
        cur = b
    if x1 - cur > 0.01:
        piece(cur, x1, 0, hh)
    # recessed panels, frames, doors and bars
    step = 0.35
    for (a, b, lo, hi), (cx, kind) in zip(ops, sorted(bays)):
        zi = face - outward * step
        back0, back1 = (zi - 0.08, zi) if outward > 0 else (zi, zi + 0.08)
        add('plaster', wb('rec_back', a, b, back0, back1, h0 + lo, h0 + hi, 0.0), 0x2A2A28)
        # cream surround (lintel + sill)
        cream(wb('lintel', a - 0.12, b + 0.12, face - 0.05 if outward > 0 else face - 0.05, face + 0.05, h0 + hi, h0 + hi + 0.14, 0.006)) if outward > 0 else cream(wb('lintel', a - 0.12, b + 0.12, face - 0.05, face + 0.05, h0 + hi, h0 + hi + 0.14, 0.006))
        if kind == 'door':
            lf0, lf1 = (zi - 0.02, zi + 0.04) if outward > 0 else (zi - 0.04, zi + 0.02)
            add('wood', wb('leaf', a + 0.08, b - 0.08, lf0, lf1, 0.0 + h0, h0 + hi - 0.05, 0.003), GREEN)
            for k in range(2):
                add('wood', wb('leaf_panel', a + 0.22, b - 0.22, lf0 - 0.01 * outward, lf1 + 0.01 * outward, h0 + 0.2 + k * 1.2, h0 + 1.2 + k * 1.2 - 0.05, 0.002), 0x174030)
            add('paint', wb('handle', b - 0.35, b - 0.3, lf0 - 0.04 * outward, lf1 + 0.04 * outward, h0 + 1.0, h0 + 1.12, 0.0), BRASS)
        else:
            n = int((b - a) / 0.11)
            for i in range(1, n):
                x = a + i * (b - a) / n
                add('paint', wb('bar', x - 0.012, x + 0.012, zi - 0.03, zi + 0.03, h0 + lo, h0 + hi, 0.0), IRON)
            add('wood', wb('shutter_l', a, a + (b - a) / 2 - 0.02, zi - 0.1 * outward - 0.02, zi - 0.1 * outward + 0.02, h0 + lo, h0 + hi, 0.0), GREEN)
            cream(wb('sill', a - 0.1, b + 0.1, face - 0.1, face + 0.1, h0 + lo - 0.1, h0 + lo, 0.006))


def facade_z(xp, outward, z0, z1, h0, h1, bays, wall_t=0.5):
    """Same as facade_x for a wall along z at x=xp."""
    xa, xb = (xp - wall_t, xp) if outward > 0 else (xp, xp + wall_t)
    face = xb if outward > 0 else xa
    ops = []
    for cz, kind in bays:
        ops.append((cz - 0.8, cz + 0.8, 0.0, 2.6) if kind == 'door' else (cz - 0.55, cz + 0.55, 1.1, 2.5))
    ops.sort()
    cur = z0
    hh = h1 - h0
    def piece(a, b, lo, hi):
        brick(wb('fac', xa, xb, a, b, h0 + lo, h0 + hi, 0.0))
    for a, b, lo, hi in ops:
        if a - cur > 0.01:
            piece(cur, a, 0, hh)
        if lo > 0:
            piece(a, b, 0, lo)
        if hh - hi > 0.01:
            piece(a, b, hi, hh)
        cur = b
    if z1 - cur > 0.01:
        piece(cur, z1, 0, hh)
    step = 0.35
    for (a, b, lo, hi), (cz, kind) in zip(ops, sorted(bays)):
        xi = face - outward * step
        b0, b1 = (xi - 0.08, xi) if outward > 0 else (xi, xi + 0.08)
        add('plaster', wb('rec_back', b0, b1, a, b, h0 + lo, h0 + hi, 0.0), 0x2A2A28)
        cream(wb('lintel', face - 0.05, face + 0.05, a - 0.12, b + 0.12, h0 + hi, h0 + hi + 0.14, 0.006))
        if kind == 'door':
            l0, l1 = (xi - 0.02, xi + 0.04) if outward > 0 else (xi - 0.04, xi + 0.02)
            add('wood', wb('leaf', l0, l1, a + 0.08, b - 0.08, h0, h0 + hi - 0.05, 0.003), GREEN)
            for k in range(2):
                add('wood', wb('leaf_panel', l0 - 0.01 * outward, l1 + 0.01 * outward, a + 0.22, b - 0.22, h0 + 0.2 + k * 1.2, h0 + 1.15 + k * 1.2, 0.002), 0x174030)
            add('paint', wb('handle', l0 - 0.04 * outward, l1 + 0.04 * outward, b - 0.35, b - 0.3, h0 + 1.0, h0 + 1.12, 0.0), BRASS)
        else:
            n = int((b - a) / 0.11)
            for i in range(1, n):
                z = a + i * (b - a) / n
                add('paint', wb('bar', xi - 0.03, xi + 0.03, z - 0.012, z + 0.012, h0 + lo, h0 + hi, 0.0), IRON)
            add('wood', wb('shutter', xi - 0.1 * outward - 0.02, xi - 0.1 * outward + 0.02, a, a + (b - a) / 2 - 0.02, h0 + lo, h0 + hi, 0.0), GREEN)
            cream(wb('sill', face - 0.1, face + 0.1, a - 0.1, b + 0.1, h0 + lo - 0.1, h0 + lo, 0.006))


# --------------------------------------------------------------------------------------------- the blocks
def window_bays_for(x0, x1, step=6.0):
    """Door at the centre of each 6 m room with a window each side."""
    out = []
    n = int(round((x1 - x0) / step))
    for i in range(n):
        c = x0 + step * (i + 0.5)
        out += [(c - 2.0, 'win'), (c, 'door'), (c + 2.0, 'win')]
    return out


def build_back_block():
    # solid core behind the facade: the whole back block as brick walls (rooms are solid), outer back face z=-22.5
    # ground floor: facade along z=-16.5 facing the verandah (+z), x[-30,30] except where the wings' own walls are
    brick(wb('back_wall', -HX, HX, BZ0, BZ0 + 0.5, 0, 3.9, 0.0))
    brick(wb('core', -HX, HX, BZ0 + 0.5, RM - 0.5, 0, H1, 0.0))
    facade_x(RM, 1, -21.0, 21.0, 0.0, H1, window_bays_for(-21.0, 21.0, 6.0) if False else window_bays_for(-18.0, 18.0, 6.0))
    # the wall continues (plain brick, blank wall with a few windows) to the wings
    for x0, x1 in ((-30.0, -21.0), (21.0, 30.0)):
        brick(wb('end_core', x0, x1, RM - 0.5, RM, 0, H1, 0.0))
    brick(wb('face_fill_l', -21.0, -18.0, RM - 0.5, RM, 0, H1, 0.0))
    brick(wb('face_fill_r', 18.0, 21.0, RM - 0.5, RM, 0, H1, 0.0))
    # ground slab of the whole back block incl. verandah
    slab(-HX, HX, BZ0, BZ1, H1)
    # upper floor, centre only (x -18..18): solid core + facade on the gallery plane
    brick(wb('up_back', -18.0, 18.0, BZ0, BZ0 + 0.5, H1 + SL, H2, 0.0))
    brick(wb('up_core', -18.0, 18.0, BZ0 + 0.5, RM - 0.5, H1 + SL, H2, 0.0))
    brick(wb('up_w', -18.0, -17.5, BZ0, BZ1, H1 + SL, H2, 0.0))
    brick(wb('up_e', 17.5, 18.0, BZ0, BZ1, H1 + SL, H2, 0.0))
    facade_x(RM, 1, -17.5, 17.5, H1 + SL, H2, window_bays_for(-18.0, 18.0, 6.0))
    slab(-18.0, 18.0, BZ0, BZ1, H2)
    # ground-floor verandah arcade on the back block + upper gallery arcade
    arcade('x', BZ1 - 0.3, -21.0, 21.0, 14, 0.0, 2.0, H1, pier=0.6, t=0.55)
    arcade('x', BZ1 - 0.3, -18.0, 18.0, 12, H1 + SL, 5.6, H2, pier=0.55, t=0.5)
    # verandah floors + two steps
    add('apron', wb('ver_floor', -21.0, 21.0, RM, BZ1, 0, 0.3, 0.01), RED_FLOOR)
    for k, d in enumerate((0.3, 0.6)):
        add('apron', wb('ver_step', -21.0, 21.0, BZ1 + d - 0.3 + 0.3, BZ1 + d + 0.3 - 0.3 + 0.0 + 0.0, 0, 0.3 - k * 0.15, 0.008), 0xB8B2A6)
    add('apron', wb('gal_floor', -18.0, 18.0, RM, BZ1, H1 + SL, H1 + SL + 0.06, 0.0), RED_FLOOR)
    # upper gallery rail between piers is the arcade itself. Parapets
    jaali_parapet(-HX, -18.0, BZ0, BZ1 + 0.0, H1 + SL, 4.4, 'nw')
    jaali_parapet(18.0, HX, BZ0, BZ1 + 0.0, H1 + SL, 4.4, 'ne')
    jaali_parapet(-18.0, 18.0, BZ0, BZ1, H2 + SL, 7.8, 'nsew')
    # ground-level end blocks: the parapet continues along the front of the single-storey ends x[-30,-21] / [21,30] handled with the wings
    # water tank on the centre roof, drainpipes, a few wall lamps on the verandah
    tx, tz = 13.5, -19.5
    b0 = H2 + SL
    add('paint', wb('tank_pad', tx - 0.9, tx + 0.9, tz - 0.9, tz + 0.9, b0, b0 + 0.15, 0.0), GREY)
    add('paint', cyl('tank', tx, tz, b0 + 0.15, b0 + 1.35, 0.7, 0.7, 18), 0x1C1C1F)
    add('paint', sphere('tank_dome', tx, tz, b0 + 1.35, 0.7, 0.7, 0.25, 2), 0x1C1C1F)
    for hr in (0.5, 1.0):
        add('paint', cyl('tank_rib', tx, tz, b0 + hr, b0 + hr + 0.05, 0.725, 0.725, 18), 0x2A2A2E)
    for x in (-29.7, 29.7, -17.7, 17.7):
        add('metal', limb('drain', (x, BZ0 + 0.2, 0.1), (x, BZ0 + 0.2, 4.2 if abs(x) > 20 else 7.5), 0.09), 0x9A9EA3)


def build_wing(sg):
    """sg=-1 left wing x[-30,-21], sg=+1 right. Rooms x±[24,30] along z, verandah x±[21,24]; z from back wall to WING_Z1."""
    xo = sg * 30.0
    xi = sg * 24.0           # room front-wall plane (verandah side)
    xv = sg * 21.0           # verandah outer edge
    zs, ze = BZ1, WING_Z1    # the wing verandah runs from the back block's verandah to the wing end
    lo, hi = (xo, xi) if sg < 0 else (xi, xo)
    # outer wall (the compound boundary): z from back wall to wing end, solid brick with high barred windows in a row
    ow_a, ow_b = (xo, xo + sg * 0.5)
    ow0, ow1 = (min(ow_a, ow_b), max(ow_a, ow_b))
    ops = []
    for k in range(6):
        c = -20.0 + k * 5.0
        ops.append((c - 0.55, c + 0.55, 1.1, 2.4))
    cur = BZ0 + 0.5
    for a, b, l, h in ops:
        brick(wb('ow', ow0, ow1, cur, a, 0, H1, 0.0))
        brick(wb('ow_sill', ow0, ow1, a, b, 0, l, 0.0))
        brick(wb('ow_lintel', ow0, ow1, a, b, h, H1, 0.0))
        cur = b
        face_x = xo - sg * 0.0
        # barred window on the outer face
        mid = (ow0 + ow1) / 2
        n = int((b - a) / 0.11)
        for i in range(1, n):
            z = a + i * (b - a) / n
            add('paint', wb('bar', mid - 0.03, mid + 0.03, z - 0.012, z + 0.012, l, h, 0.0), IRON)
        add('wood', wb('shutter', xo - sg * 0.25 - 0.02 if sg > 0 else xo + 0.25 - 0.02, xo - sg * 0.25 + 0.02 if sg > 0 else xo + 0.25 + 0.02, a, a + (b - a) / 2 - 0.02, l, h, 0.0), GREEN)
        cream(wb('sill', xo - 0.12 if sg < 0 else xo - 0.1, xo + 0.1 if sg < 0 else xo + 0.12, a - 0.1, b + 0.1, l - 0.1, l, 0.006))
    brick(wb('ow', ow0, ow1, cur, ze + 0.0, 0, H1, 0.0))
    # solid room core + end wall + inner facade (z-wall at x=xi with doors/windows for 5 rooms of 6.2 m)
    core0, core1 = (ow1, xi - 0.5) if sg < 0 else (xi + 0.5, ow0)
    brick(wb('core', min(core0, core1), max(core0, core1), BZ0 + 0.5, ze, 0, H1, 0.0))
    nrooms = 5
    z0r, z1r = BZ1, ze
    step = (z1r - z0r) / nrooms
    bays = []
    for i in range(nrooms):
        c = z0r + step * (i + 0.5)
        bays += [(c - 1.75, 'win'), (c, 'door'), (c + 1.75, 'win')]
    # facade (the wall face looks toward the courtyard: outward is +x for the left wing, -x for the right wing)
    facade_z(xi, 1 if sg < 0 else -1, z0r, z1r, 0.0, H1, bays)
    # wall between the wing room strip and the corner of the back block at z[-16.5..-13.5] is the back block's verandah end
    brick(wb('wing_fill', min(xi - 0.5 if sg < 0 else xi, xi if sg < 0 else xi + 0.5), max(xi - 0.5 if sg < 0 else xi, xi if sg < 0 else xi + 0.5), BZ0 + 0.5, z0r, 0, H1, 0.0))
    # slab across rooms + verandah, arcade, floor
    sx0, sx1 = (xo, xv) if sg < 0 else (xv, xo)
    slab(sx0, sx1, BZ1, ze + 0.3, H1)
    arcade('z', xv - sg * 0.3, BZ1 - 0.0, ze, 6, 0.0, 2.0, H1, pier=0.6, t=0.55)
    vf0, vf1 = (xi, xv) if sg < 0 else (xv, xi)
    add('apron', wb('ver_floor', min(vf0, vf1), max(vf0, vf1), BZ1, ze, 0, 0.3, 0.01), RED_FLOOR)
    for d in (0.3, 0.6):
        a0, a1 = (xv, xv + sg * d)
        add('apron', wb('ver_step', min(a0, a1), max(a0, a1), BZ1, ze, 0, 0.3 - (d - 0.3) * 0.5 - 0.0 if d > 0.3 else 0.3, 0.008), 0xB8B2A6)
    # parapets: outer edge + end + the courtyard edge
    jaali_parapet(sx0, sx1, BZ1, ze + 0.3, H1 + SL, 4.4, 's' + ('w' if sg < 0 else 'e') + ('e' if sg < 0 else 'w'))
    # water tanks on the wing roofs (two per the top view)
    for tz in (-3.0,):
        tx = sg * 27.0
        b0 = H1 + SL
        add('paint', wb('tank_pad', tx - 0.8, tx + 0.8, tz - 0.8, tz + 0.8, b0, b0 + 0.12, 0.0), GREY)
        add('paint', cyl('tank', tx, tz, b0 + 0.12, b0 + 1.1, 0.62, 0.62, 16), 0x1C1C1F)
        add('paint', sphere('tank_dome', tx, tz, b0 + 1.1, 0.62, 0.62, 0.22, 2), 0x1C1C1F)


def build_front_and_gate():
    t = 0.45
    h = 2.5
    gx = 2.5 + 0.6         # inner face of each gate pillar (gate 5 m clear)
    for nm, x0, x1 in (('l', -HX, -gx), ('r', gx, HX)):
        brick(wb('front_' + nm, x0, x1, HZ - t, HZ, 0, h, 0.0))
        cream(wb('front_cope_' + nm, x0 - 0.06, x1 + 0.06, HZ - t - 0.07, HZ + 0.07, h, h + 0.12, 0.008))
        cream(wb('front_cope2_' + nm, x0 - 0.02, x1 + 0.02, HZ - t - 0.03, HZ + 0.03, h + 0.12, h + 0.17, 0.004))
        # a plinth course of darker brick: stepped out
        brick(wb('front_plinth_' + nm, x0, x1, HZ - t - 0.06, HZ + 0.06, 0, 0.35, 0.0))
    # buttress piers every 7.5 m
    for x in (-27.0, -19.5, -12.0, -6.0, 6.0, 12.0, 19.5, 27.0):
        brick(wb('buttress', x - 0.3, x + 0.3, HZ - t - 0.12, HZ + 0.1, 0, h + 0.05, 0.008))
    # side boundary of the corner gardens (wings stop 14 m short of the front wall)
    for sg in (-1, 1):
        x0, x1 = (-HX, -HX + t) if sg < 0 else (HX - t, HX)
        brick(wb('side_wall', x0, x1, WING_Z1 + 0.3, HZ - t, 0, h, 0.0))
        cream(wb('side_cope', x0 - 0.06, x1 + 0.06, WING_Z1 + 0.3, HZ, h, h + 0.12, 0.008))
        # wing end wall (closing the single-storey block) with a cream band
        brick(wb('wing_end', min(sg * 21.0, sg * 30.0), max(sg * 21.0, sg * 30.0), WING_Z1, WING_Z1 + 0.3, 0, H1, 0.0))
    # gate pillars 4.5 m: brick, stepped cream caps, iron lantern
    for nm, cx in (('l', -2.8), ('r', 2.8)):
        brick(wb('pier_' + nm, cx - 0.55, cx + 0.55, HZ - t - 0.15, HZ + 0.15, 0, 4.0, 0.01))
        brick(wb('pier_foot_' + nm, cx - 0.62, cx + 0.62, HZ - t - 0.22, HZ + 0.22, 0, 0.5, 0.01))
        for k, (e, y0, y1) in enumerate(((0.12, 4.0, 4.15), (0.06, 4.15, 4.3), (0.0, 4.3, 4.45))):
            cream(wb('pier_cap%d_%s' % (k, nm), cx - 0.55 - e - 0.05, cx + 0.55 + e + 0.05, HZ - t - 0.15 - e - 0.05, HZ + 0.15 + e + 0.05, y0, y1, 0.008))
        add('metal', limb('lantern_arm', (cx, HZ + 0.15, 2.8), (cx, HZ + 0.4, 2.8), 0.05), IRON)
        add('metal', cyl('lantern', cx, HZ + 0.45, 2.6, 3.0, 0.1, 0.15, 6), IRON)
        add('paint', cyl('lantern_glass', cx, HZ + 0.45, 2.65, 2.95, 0.07, 0.11, 6), 0xF0E2A8)
        add('metal', cyl('lantern_cap', cx, HZ + 0.45, 3.0, 3.1, 0.17, 0.04, 6), IRON)
    # cream arch over the gate: two thick uprights' tops joined by a gently arched beam, with a blank board face
    pts = []
    n = 14
    for k in range(n + 1):
        x = -3.35 + 6.7 * k / n
        pts.append((x, 4.45 + 0.7 * math.sin(math.pi * k / n) ** 0.7))
    top = list(pts)
    prof = [(x, 4.45) for x, _ in pts][::-1]
    poly = [(x, y) for x, y in top] + [(x, 4.45) for x, _ in reversed(top)]
    # prism_z profile is (wx, h) extruded along z
    cream(prism_z('gate_arch', HZ - t - 0.05, HZ + 0.1, poly))
    # board panel (blank): a recessed paler panel on the arch face, text is painted in-game
    add('plaster', wb('board_panel', -2.6, 2.6, HZ + 0.1, HZ + 0.14, 4.7, 5.15, 0.0), 0xF2EAD0)
    # the iron gate, two leaves swung OPEN into the courtyard
    for sg in (-1, 1):
        hx = sg * 2.45
        zs, ze = HZ - 0.5, HZ - 2.9
        add('metal', limb('gate_hinge', (hx, zs, 0.1), (hx, zs, 4.0), 0.1), IRON)
        add('metal', limb('gate_free', (hx, ze, 0.1), (hx, ze, 4.0), 0.08), IRON)
        for hh in (0.2, 1.4, 2.7, 3.7):
            add('metal', limb('gate_rail', (hx, zs, hh), (hx, ze, hh), 0.08, 0.05), IRON)
        add('metal', limb('gate_sheet', (hx, zs, 0.25), (hx, ze, 0.25), 0.03, 1.1), 0x24362B)
        nb = 12
        for i in range(1, nb):
            z = zs + (ze - zs) * i / nb
            top = 3.7 + 0.35 * math.sin(i / nb * math.pi)
            add('metal', limb('gate_bar', (hx, z, 1.4), (hx, z, top), 0.028), IRON)
            add('metal', sphere('gate_finial', hx, z, top + 0.05, 0.04, 0.04, 0.06, 1), IRON)
        for k in range(3):   # scroll medallions in the upper panel
            z = zs + (ze - zs) * (k + 1) / 4
            add('metal', cyl('gate_scroll', hx, z, 2.8, 2.85, 0.2, 0.2, 10), IRON)


def build_courtyard():
    # ground: packed earth border, swept brick paths in a plus, lawn beds (soil, grass is hers) in the four quarters
    add('paint', wb('ground', -HX, HX, BZ0, HZ, -0.06, 0.03, 0), 0xA78C66)
    pw = 1.6
    add('brick', wb('path_main', -pw / 2, pw / 2, -13.2, HZ - 0.3, 0.03, 0.07, 0.0))
    add('brick', wb('path_cross', -21.0, 21.0, -1.2 - pw / 2 + 1.2, -1.2 + pw / 2 + 1.2 - 0.0, 0.03, 0.07, 0.0)) if False else None
    cz = 2.0
    add('brick', wb('path_cross', -21.0, 21.0, cz - pw / 2, cz + pw / 2, 0.03, 0.07, 0.0))
    # path from each verandah step to the plus (2 steps in the centre)
    # lawn quarters: brick-edged beds with bare soil (the grass is hers)
    def bed(x0, x1, z0, z1, h=0.18):
        t = 0.14
        brick(wb('lawn_n', x0, x1, z0, z0 + t, 0, h, 0.0))
        brick(wb('lawn_s', x0, x1, z1 - t, z1, 0, h, 0.0))
        brick(wb('lawn_w', x0, x0 + t, z0 + t, z1 - t, 0, h, 0.0))
        brick(wb('lawn_e', x1 - t, x1, z0 + t, z1 - t, 0, h, 0.0))
        add('paint', wb('lawn_soil', x0 + t, x1 - t, z0 + t, z1 - t, 0, h - 0.04, 0.0), 0x4B3A28)
    bed(-20.0, -pw / 2 - 0.5, -12.0, cz - pw / 2 - 0.4)
    bed(pw / 2 + 0.5, 20.0, -12.0, cz - pw / 2 - 0.4)
    bed(-20.0, -pw / 2 - 0.5, cz + pw / 2 + 0.4, 19.5)
    bed(pw / 2 + 0.5, 20.0, cz + pw / 2 + 0.4, 19.5)
    # round raised brick platform at the crossing (the big neem is hers)
    R = 3.0
    n = 28
    for i in range(n):
        a0, a1 = i / n * math.tau, (i + 1) / n * math.tau
        brick(limb('plat_seg', (R * math.cos(a0), cz + R * math.sin(a0), 0.3), (R * math.cos(a1), cz + R * math.sin(a1), 0.3), 0.5, 0.6))
    cream(cyl('plat_cap', 0.0, cz, 0.6, 0.66, R + 0.28, R + 0.28, 28))
    add('paint', cyl('plat_soil', 0.0, cz, 0.0, 0.52, R - 0.25, R - 0.25, 28), 0x4B3A28)
    add('brick', cyl('plat_step', 0.0, cz, 0.0, 0.3, R + 0.7, R + 0.7, 28))
    # hand pump on a stone platform, left lawn
    px, pz = -10.0, 11.0
    add('trim', wb('pump_plat', px - 1.1, px + 1.1, pz - 1.1, pz + 1.1, 0, 0.18, 0.01), 0xA9A59B)
    add('metal', cyl('pump_base', px, pz, 0.18, 0.55, 0.17, 0.14, 10), 0x2E5E3A)
    add('metal', cyl('pump_col', px, pz, 0.55, 1.3, 0.085, 0.07, 10), 0x2E5E3A)
    add('metal', limb('pump_handle', (px, pz, 1.2), (px - 0.55, pz, 1.52), 0.055), 0x2E5E3A)
    add('metal', limb('pump_spout', (px, pz, 0.9), (px + 0.4, pz, 0.7), 0.065), 0x2E5E3A)
    add('metal', cyl('pump_cap', px, pz, 1.3, 1.38, 0.1, 0.1, 10), 0x2E5E3A)
    # corner gardens in front of the wings: brick-edged planters left empty, a bench each
    for sg in (-1, 1):
        x0, x1 = (-28.8, -21.5) if sg < 0 else (21.5, 28.8)
        bed(x0, x1, 10.2, 21.2, 0.3)
        add('wood', wb('bench_seat', (x1 - 0.7) if sg < 0 else (x0 + 0.1), (x1 - 0.1) if sg < 0 else (x0 + 0.7), 12.0, 14.0, 0.42, 0.47, 0.008))
        add('wood', wb('bench_back', (x1 - 0.14) if sg < 0 else (x0 + 0.1), (x1 - 0.1) if sg < 0 else (x0 + 0.14), 12.0, 14.0, 0.47, 0.9, 0.0))
        for z in (12.2, 13.8):
            add('wood', wb('bench_leg', (x1 - 0.65) if sg < 0 else (x0 + 0.15), (x1 - 0.15) if sg < 0 else (x0 + 0.65), z - 0.04, z + 0.04, 0, 0.42, 0.0))
    # benches along the verandah steps
    for x in (-12.0, 12.0):
        add('wood', wb('bench_seat', x - 1.2, x + 1.2, -12.6, -12.2, 0.42, 0.47, 0.008))
        for dx in (-1.0, 1.0):
            add('wood', wb('bench_leg', x + dx - 0.04, x + dx + 0.04, -12.55, -12.25, 0, 0.42, 0.0))
    # a pair of potted-plant bases on the verandah (the plants are hers): terracotta tubs
    for x in (-19.5, 19.5):
        add('paint', cyl('tub', x, -12.6, 0, 0.55, 0.3, 0.4, 12), 0xB5693F)


build_back_block()
build_wing(-1)
build_wing(1)
build_front_and_gate()
build_courtyard()

TINTS = {'hb_plaster': '#F0E3BE', 'hb_plinth': '#9A4A38', 'hb_trim': '#EDE0BC', 'hb_apron': '#9A4A38',
         'hb_wood': '#7A5A3E', 'hb_brick': '#B9705A', 'hb_tin': '#C5CDD2', 'hb_metal': '#FFFFFF'}
kit.finalize(OUT, TINTS, drift={'hb_plaster': 0.04, 'hb_brick': 0.1, 'hb_apron': 0.06})
