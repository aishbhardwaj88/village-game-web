"""Gaushala — hand-built in Blender from the art director's dimensioned reference
drawings (Places V1/gaushala/MAIN_gaushala_front_isometric.png and
MAIN_gaushala_back_top.png, approved 25 Oct 2026).

Reference gives a 36 m x 28 m walled compound:
  - 1.8 m brick perimeter wall on the back and sides
  - low front wall with an iron railing above it, double gate at the centre
  - long cattle shed with a tin roof down the west side, feed trough along it
  - hay store with a tin roof at the back east corner
  - small plastered office with a flat roof at the front east corner
  - tree in a round brick planter near the centre
  - long concrete water trough with a tap
  - working clutter: chaff cutter, wheelbarrow, dung cakes, buckets

Deliberate differences from the reference (lead engineer's call, logged in
docs/handoff.md): shed bay count, gate bar pattern, window placement and the exact
palette are varied; all signage text is invented in-game, never copied from the
drawing; the drawing's dimension lines, arrows and "FRONT VIEW" labels are reference
annotation and are NOT modelled.

Run: blender -b --python tools/blender/build_gaushala.py
"""
import bpy
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import (  # noqa: E402
    clear_scene, wb, cyl, limb, cut, beveled_box, prism_x, prism_z, load_pbr_material,
    make_flat_material, box_uv, smart_uv, join_objects, export_glb,
    MODELS_OUT_DIR,
)

# --- dimensions from the reference -----------------------------------------
W = 36.0          # east-west, full compound
D = 28.0          # north-south, full compound
HX = W / 2        # +-18
HZ = D / 2        # +-14

WALL_T = 0.34     # brick perimeter wall thickness
WALL_H = 1.8      # back and side wall height
FRONT_LOW_H = 0.5  # front dwarf wall under the railing
FRONT_RAIL_H = 1.5  # top of the railing
PIER = 0.52       # gate pier section
GATE_W = 6.0      # clear opening between piers

SHED_X0, SHED_X1 = -HX + WALL_T, -HX + WALL_T + 6.4   # cattle shed depth (west)
SHED_Z0, SHED_Z1 = -HZ + 1.2, HZ - 7.0                # runs most of the north-south
SHED_EAVE, SHED_RIDGE = 2.5, 3.5

HAY_X0, HAY_X1 = 3.0, HX - WALL_T                     # hay store, back east
HAY_Z0, HAY_Z1 = -HZ + WALL_T, -HZ + 7.2
HAY_EAVE, HAY_RIDGE = 2.6, 3.4

OFF_X0, OFF_X1 = 8.6, 15.8                            # office, front east
OFF_Z0, OFF_Z1 = HZ - 8.2, HZ - 1.4
OFF_H = 3.1

objs = []


def add(o, mat):
    o.data.materials.append(mat)
    objs.append(o)
    return o


def main():
    clear_scene()

    brick = load_pbr_material('gsh_brick', 'brick', repeat=(W / 2.6, WALL_H / 1.3))
    tin = load_pbr_material('gsh_tin', 'tin', repeat=(5.0, 3.0))
    concrete = load_pbr_material('gsh_concrete', 'concrete', repeat=(4.0, 3.0))
    plaster = load_pbr_material('gsh_plaster', 'plaster', repeat=(3.0, 2.0))
    wood = load_pbr_material('gsh_wood', 'wood', repeat=(2.0, 2.0))

    steel = make_flat_material('gsh_steel', 0x4A4E52, roughness=0.55)
    paint_door = make_flat_material('gsh_door', 0x6B4A2F, roughness=0.7)
    water = make_flat_material('gsh_water', 0x5E8A86, roughness=0.18)
    straw = make_flat_material('gsh_straw', 0xC8A44E, roughness=0.95)
    dung = make_flat_material('gsh_dung', 0x4E3B28, roughness=0.98)
    earth = make_flat_material('gsh_earth', 0x9A8468, roughness=1.0)

    # --- ground pad: packed earth inside the walls --------------------------
    pad = wb('gsh_ground', -HX, HX, -HZ, HZ, -0.06, 0.02, bevel=0.0)
    box_uv(pad, (1, 1, 1))
    add(pad, earth)

    # --- perimeter walls ----------------------------------------------------
    # back (north, -Z) and the two sides, full 1.8 m
    back = wb('gsh_wall_back', -HX, HX, -HZ, -HZ + WALL_T, 0, WALL_H)
    west = wb('gsh_wall_west', -HX, -HX + WALL_T, -HZ, HZ, 0, WALL_H)
    east = wb('gsh_wall_east', HX - WALL_T, HX, -HZ, HZ, 0, WALL_H)
    # coping course, slightly proud — reads as a real wall top, not a cut slab
    for nm, x0, x1, z0, z1 in (
        ('back', -HX, HX, -HZ - 0.05, -HZ + WALL_T + 0.05),
        ('west', -HX - 0.05, -HX + WALL_T + 0.05, -HZ, HZ),
        ('east', HX - WALL_T - 0.05, HX + 0.05, -HZ, HZ),
    ):
        cop = wb(f'gsh_cope_{nm}', x0, x1, z0, z1, WALL_H, WALL_H + 0.09)
        box_uv(cop, (1, 1, 1))
        add(cop, concrete)
    for o in (back, west, east):
        box_uv(o, (1, 1, 1))
        add(o, brick)

    # --- front: dwarf wall + piers + railing + gate -------------------------
    zf0, zf1 = HZ - WALL_T, HZ
    gx = GATE_W / 2
    for nm, x0, x1 in (('l', -HX, -gx - PIER), ('r', gx + PIER, HX)):
        low = wb(f'gsh_front_low_{nm}', x0, x1, zf0, zf1, 0, FRONT_LOW_H)
        box_uv(low, (1, 1, 1))
        add(low, brick)
        cap = wb(f'gsh_front_cap_{nm}', x0 - 0.04, x1 + 0.04, zf0 - 0.05, zf1 + 0.05,
                 FRONT_LOW_H, FRONT_LOW_H + 0.08)
        box_uv(cap, (1, 1, 1))
        add(cap, concrete)
        # railing: verticals + two horizontal rails
        span = x1 - x0
        n = max(4, int(span / 0.42))
        for i in range(n + 1):
            x = x0 + span * i / n
            add(limb(f'gsh_rail_v_{nm}{i}',
                     (x, (zf0 + zf1) / 2, FRONT_LOW_H + 0.08),
                     (x, (zf0 + zf1) / 2, FRONT_RAIL_H), t=0.035), steel)
        for k, h in enumerate((FRONT_RAIL_H - 0.06, FRONT_LOW_H + 0.42)):
            add(limb(f'gsh_rail_h_{nm}{k}',
                     (x0, (zf0 + zf1) / 2, h), (x1, (zf0 + zf1) / 2, h), t=0.045), steel)

    # gate piers, taller, with a cap
    for nm, cxs in (('l', -gx - PIER / 2), ('r', gx + PIER / 2)):
        p = wb(f'gsh_pier_{nm}', cxs - PIER / 2, cxs + PIER / 2, zf0 - 0.06, zf1 + 0.06, 0, 2.5)
        box_uv(p, (1, 1, 1))
        add(p, brick)
        pc = wb(f'gsh_pier_cap_{nm}', cxs - PIER / 2 - 0.07, cxs + PIER / 2 + 0.07,
                zf0 - 0.13, zf1 + 0.13, 2.5, 2.66)
        box_uv(pc, (1, 1, 1))
        add(pc, concrete)

    # gate: two leaves of vertical bars in a frame, closed
    zg = (zf0 + zf1) / 2
    for side, (a, b) in (('l', (-gx, -0.05)), ('r', (0.05, gx))):
        add(limb(f'gsh_gate_top_{side}', (a, zg, 2.08), (b, zg, 2.08), t=0.07), steel)
        add(limb(f'gsh_gate_mid_{side}', (a, zg, 1.12), (b, zg, 1.12), t=0.06), steel)
        add(limb(f'gsh_gate_bot_{side}', (a, zg, 0.12), (b, zg, 0.12), t=0.07), steel)
        span = b - a
        n = max(5, int(span / 0.3))
        for i in range(n + 1):
            x = a + span * i / n
            add(limb(f'gsh_gate_v_{side}{i}', (x, zg, 0.12), (x, zg, 2.08), t=0.032), steel)

    # signboard frame above the gate (blank — the game paints the board)
    add(limb('gsh_sign_p_l', (-gx - 0.1, zg, 2.5), (-gx - 0.1, zg, 3.1), t=0.06), steel)
    add(limb('gsh_sign_p_r', (gx + 0.1, zg, 2.5), (gx + 0.1, zg, 3.1), t=0.06), steel)
    board = wb('gsh_signboard', -gx - 0.2, gx + 0.2, zg - 0.06, zg + 0.06, 3.05, 4.05)
    box_uv(board, (1, 1, 1))
    add(board, plaster)

    # --- cattle shed, west side --------------------------------------------
    sl = SHED_Z1 - SHED_Z0
    # back wall of the shed is the compound wall; front is open on posts
    nbays = 7   # reference reads ~6; varied deliberately
    for i in range(nbays + 1):
        z = SHED_Z0 + sl * i / nbays
        add(limb(f'gsh_shed_post{i}', (SHED_X1 - 0.18, z, 0), (SHED_X1 - 0.18, z, SHED_EAVE), t=0.17), wood)
    # sloping tin roof: low at the open side, high at the wall
    rx0, rx1 = SHED_X0 - 0.25, SHED_X1 + 0.65          # overhang both sides
    t = 0.11
    roof = prism_z('gsh_shed_roof', SHED_Z0 - 0.3, SHED_Z1 + 0.3, [
        (rx0, SHED_RIDGE), (rx1, SHED_EAVE), (rx1, SHED_EAVE - t), (rx0, SHED_RIDGE - t)])
    box_uv(roof, (1, 1, 1))
    add(roof, tin)
    # feed trough along the open edge
    tro = wb('gsh_feed_trough', SHED_X1 - 0.02, SHED_X1 + 0.78, SHED_Z0 + 0.3, SHED_Z1 - 0.3, 0, 0.62)
    hollow = wb('gsh_feed_cut', SHED_X1 + 0.1, SHED_X1 + 0.66, SHED_Z0 + 0.42, SHED_Z1 - 0.42, 0.18, 0.7)
    cut(tro, [hollow])
    box_uv(tro, (1, 1, 1))
    add(tro, concrete)
    fodder = wb('gsh_fodder', SHED_X1 + 0.12, SHED_X1 + 0.64, SHED_Z0 + 0.5, SHED_Z1 - 0.5, 0.2, 0.42)
    add(fodder, make_flat_material('gsh_fodder_m', 0x6E7A3A, roughness=0.95))
    # straw bedding under the shed
    bed = wb('gsh_bedding', SHED_X0 + 0.3, SHED_X1 - 0.3, SHED_Z0 + 0.4, SHED_Z1 - 0.4, 0.0, 0.1)
    add(bed, straw)

    # --- hay store, back east ----------------------------------------------
    hl = HAY_X1 - HAY_X0
    nh = 4
    for i in range(nh + 1):
        x = HAY_X0 + hl * i / nh
        add(limb(f'gsh_hay_post{i}', (x, HAY_Z1 - 0.2, 0), (x, HAY_Z1 - 0.2, HAY_EAVE), t=0.16), wood)
    hz0, hz1 = HAY_Z0 - 0.25, HAY_Z1 + 0.6
    ht = 0.11
    hroof = prism_x('gsh_hay_roof', HAY_X0 - 0.35, HAY_X1 + 0.1, [
        (hz0, HAY_RIDGE), (hz1, HAY_EAVE), (hz1, HAY_EAVE - ht), (hz0, HAY_RIDGE - ht)])
    box_uv(hroof, (1, 1, 1))
    add(hroof, tin)
    for i in range(3):
        x0 = HAY_X0 + 0.5 + i * 4.0
        st = wb(f'gsh_haystack{i}', x0, x0 + 3.4, HAY_Z0 + 0.5, HAY_Z1 - 0.9, 0, 1.9 - 0.15 * i)
        add(st, straw)

    # --- office, front east -------------------------------------------------
    off = wb('gsh_office', OFF_X0, OFF_X1, OFF_Z0, OFF_Z1, 0, OFF_H)
    # door and two windows cut into the south (front) face
    dz = OFF_Z1
    door_cut = wb('gsh_off_doorcut', OFF_X0 + 1.1, OFF_X0 + 2.2, dz - 0.5, dz + 0.5, 0, 2.15)
    win_cut = wb('gsh_off_wincut', OFF_X0 + 3.6, OFF_X0 + 5.0, dz - 0.5, dz + 0.5, 1.05, 2.1)
    win2_cut = wb('gsh_off_wincut2', OFF_X1 - 0.5, OFF_X1 + 0.5, OFF_Z0 + 2.0, OFF_Z0 + 3.4, 1.05, 2.1)
    cut(off, [door_cut, win_cut, win2_cut])
    box_uv(off, (1, 1, 1))
    add(off, plaster)
    # plinth, parapet, door leaf, window frames + grille
    pl = wb('gsh_off_plinth', OFF_X0 - 0.12, OFF_X1 + 0.12, OFF_Z0 - 0.12, OFF_Z1 + 0.12, 0, 0.42)
    box_uv(pl, (1, 1, 1))
    add(pl, concrete)
    par = wb('gsh_off_parapet', OFF_X0 - 0.1, OFF_X1 + 0.1, OFF_Z0 - 0.1, OFF_Z1 + 0.1, OFF_H, OFF_H + 0.42)
    inner = wb('gsh_off_par_cut', OFF_X0 + 0.14, OFF_X1 - 0.14, OFF_Z0 + 0.14, OFF_Z1 - 0.14, OFF_H - 0.1, OFF_H + 0.6)
    cut(par, [inner])
    box_uv(par, (1, 1, 1))
    add(par, concrete)
    leaf = wb('gsh_off_door', OFF_X0 + 1.14, OFF_X0 + 2.16, dz - 0.09, dz - 0.02, 0.02, 2.12)
    box_uv(leaf, (1, 1, 1))
    add(leaf, paint_door)
    for nm, x0, x1, z0, z1 in (
        ('a', OFF_X0 + 3.54, OFF_X0 + 5.06, dz - 0.1, dz + 0.02),
        ('b', OFF_X1 - 0.02, OFF_X1 + 0.1, OFF_Z0 + 1.94, OFF_Z0 + 3.46),
    ):
        fr = wb(f'gsh_off_winframe_{nm}', x0, x1, z0, z1, 0.99, 2.16)
        fc = wb(f'gsh_off_winframe_cut_{nm}', x0 + 0.08, x1 - 0.08, z0 - 0.1, z1 + 0.1, 1.07, 2.08)
        cut(fr, [fc])
        box_uv(fr, (1, 1, 1))
        add(fr, paint_door)
        # iron grille: 4 vertical bars
        for i in range(4):
            if abs(x1 - x0) > abs(z1 - z0):
                x = x0 + (x1 - x0) * (i + 1) / 5
                add(limb(f'gsh_off_bar_{nm}{i}', (x, (z0 + z1) / 2, 1.07), (x, (z0 + z1) / 2, 2.08), t=0.022), steel)
            else:
                z = z0 + (z1 - z0) * (i + 1) / 5
                add(limb(f'gsh_off_bar_{nm}{i}', ((x0 + x1) / 2, z, 1.07), ((x0 + x1) / 2, z, 2.08), t=0.022), steel)

    # --- water trough, centre ----------------------------------------------
    tx0, tx1, tz0, tz1 = 0.6, 2.6, -2.0, 6.4
    wt = wb('gsh_water_trough', tx0, tx1, tz0, tz1, 0, 0.72)
    wc = wb('gsh_water_cut', tx0 + 0.16, tx1 - 0.16, tz0 + 0.16, tz1 - 0.16, 0.16, 0.8)
    cut(wt, [wc])
    box_uv(wt, (1, 1, 1))
    add(wt, concrete)
    add(wb('gsh_water_surface', tx0 + 0.18, tx1 - 0.18, tz0 + 0.18, tz1 - 0.18, 0.5, 0.56), water)
    # standpipe + tap at the north end
    add(cyl('gsh_tap_pipe', (tx0 + tx1) / 2, tz0 - 0.5, 0, 1.15, 0.055, seg=10), steel)
    add(limb('gsh_tap_spout', ((tx0 + tx1) / 2, tz0 - 0.5, 1.08), ((tx0 + tx1) / 2, tz0 - 0.05, 1.08), t=0.05), steel)

    # --- tree planter, centre (ring only; the tree model is placed in-game) --
    ring = cyl('gsh_planter', -3.4, 0.4, 0, 0.55, 2.3, seg=22)
    ring_in = cyl('gsh_planter_cut', -3.4, 0.4, 0.18, 0.8, 1.95, seg=22)
    cut(ring, [ring_in])
    box_uv(ring, (1, 1, 1))
    add(ring, brick)
    add(cyl('gsh_planter_soil', -3.4, 0.4, 0.14, 0.26, 1.98, seg=22), earth)

    # --- working clutter ----------------------------------------------------
    # chaff cutter near the east wall
    add(wb('gsh_chaff_body', 12.4, 13.9, -6.6, -5.2, 0, 1.0), steel)
    add(cyl('gsh_chaff_wheel', 13.95, -5.9, 0.25, 0.37, 0.52, seg=18), steel)
    add(wb('gsh_chaff_tray', 12.1, 12.5, -6.6, -5.2, 0.7, 1.05), steel)
    # wheelbarrow
    add(wb('gsh_barrow_tray', -7.6, -6.4, -9.4, -8.3, 0.42, 0.78), steel)
    add(cyl('gsh_barrow_wheel', -6.3, -8.85, 0.0, 0.14, 0.3, seg=14), steel)
    add(limb('gsh_barrow_leg', (-7.5, -8.6, 0.0), (-7.5, -8.6, 0.46), t=0.05), steel)
    # dung cakes, two heaps
    for i, (cx, cz) in enumerate(((-1.4, -7.2), (8.0, 9.4))):
        for k in range(4):
            add(cyl(f'gsh_dung{i}_{k}', cx + 0.26 * k, cz + 0.14 * (k % 2), 0.0, 0.1 + 0.02 * k, 0.42, seg=10), dung)
    # buckets by the gate
    for i, (cx, cz) in enumerate(((5.0, 11.4), (5.8, 11.0), (6.4, 11.6))):
        add(cyl(f'gsh_bucket{i}', cx, cz, 0, 0.34, 0.2, 0.17, seg=12), steel)

    out = os.path.join(MODELS_OUT_DIR, 'gaushala.glb')
    export_glb(objs, out)
    print(f'OBJECTS: {len(objs)}')
    tris = 0
    for o in objs:
        o.data.calc_loop_triangles()
        tris += len(o.data.loop_triangles)
    print(f'TRIANGLES: {tris}')


main()
