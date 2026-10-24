"""
The school compound — hand-modelled in Blender from Places V1/school/MAIN_school_elevations.png and
MAIN_school_courtyard_topdown.png (checklist: docs/school-checklist.md).

Run:  tools/blender/make_school.sh   (Blender -> shrink -> public/assets/models/school_compound.glb)

Authored in world offsets from SCHOOL_CENTER (-50, 106), placed with an EXACT asset slot (no fit-scaling).
Layout fixed by src/village.js (collision hand-matches it):
  MAIN block    x[-12,12] z[6,12]   h3.7   (the long block; its yard face is its -z side, z=6)
  EAST wing     x[9,15]   z[-9,9]   h3.6   (yard face x=9)
  WEST wing     x[-15,-9] z[-9,9]   h3.4   (the one walkable classroom: real 0.22 walls, door gap at x=-9, z[-0.55,0.55])
  yard          x[-15,15] z[-12,12], open to the lane on the -z side (gate)
Materials are named hb_* so the validator's 'plaster/wood/...' collider checks keep reading only the
hidden code-built collision geometry (`school_old` in src/village.js).
"""
import sys
import os
import math
import random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import wb, limb, cyl, sphere, prism_x, prism_z, quad, boolean_cut, ROOT
from arch import (Kit, Bldg, pot, flower_bed, barred_window, panel_door, pillar, bench, school_bag, ring,
                  decal_material, decal_quad, LEAF, TERRA, SOIL, MARI, STEEL, BRASS)

OUT = os.path.join(ROOT, 'tmp', 'school_compound_raw.glb')
kit = Kit()
rnd = random.Random(11)

OCHRE = 0xCE8A33
V = 2.2                 # verandah depth
WT = 0.22
BAGS = [0xC0392B, 0x2E86C1, 0xE0B53A, 0x8E44AD, 0x27AE60, 0xD35400, 0xE84393]

main = Bldg('main', -12, 12, 6, 12, 3.7)
east = Bldg('east', 9, 15, -9, 9, 3.6)
west = Bldg('west', -15.11, -8.89, -9.11, 9.11, 3.4)


def fpos(b, face, u, d):
    """World (wx, wz) of a point u along a face and d outward from it."""
    P = b.plane[face]
    return {'S': (u, P + d), 'N': (u, P - d), 'E': (P + d, u), 'W': (P - d, u)}[face]


# ----------------------------------------------------------------------------- bands
def plinth_face(b, face, u0, u1, gaps=(), h=1.05):
    """Ochre plinth band on a wall face, broken at door gaps."""
    edges = [u0] + [x for g in sorted(gaps) for x in g] + [u1]
    for a, c in zip(edges[0::2], edges[1::2]):
        if c - a > 0.05:
            kit.add('plinth', b.fb(face, a, c, -0.01, 0.06, 0, h, 0.012))
    # thin darker cap line on top of the band
    for a, c in zip(edges[0::2], edges[1::2]):
        if c - a > 0.05:
            kit.add('plinth', b.fb(face, a, c, -0.01, 0.08, h, h + 0.05, 0.008))


def roof(b, x0, x1, z0, z1, h):
    """Flat roof slab with overhang + low parapet with an ochre cap, like the reference's stacked bands."""
    kit.add('trim', wb('roof', x0, x1, z0, z1, h, h + 0.25, 0.02))
    t = 0.18
    ph = 0.45
    kit.add('plaster', wb('par_n', x0, x1, z0, z0 + t, h + 0.25, h + 0.25 + ph, 0.01))
    kit.add('plaster', wb('par_s', x0, x1, z1 - t, z1, h + 0.25, h + 0.25 + ph, 0.01))
    kit.add('plaster', wb('par_w', x0, x0 + t, z0 + t, z1 - t, h + 0.25, h + 0.25 + ph, 0.01))
    kit.add('plaster', wb('par_e', x1 - t, x1, z0 + t, z1 - t, h + 0.25, h + 0.25 + ph, 0.01))
    for a in (wb('cap_n', x0 - 0.04, x1 + 0.04, z0 - 0.04, z0 + t + 0.04, h + 0.25 + ph, h + 0.25 + ph + 0.07, 0.01),
              wb('cap_s', x0 - 0.04, x1 + 0.04, z1 - t - 0.04, z1 + 0.04, h + 0.25 + ph, h + 0.25 + ph + 0.07, 0.01),
              wb('cap_w', x0 - 0.04, x0 + t + 0.04, z0 + t, z1 - t, h + 0.25 + ph, h + 0.25 + ph + 0.07, 0.01),
              wb('cap_e', x1 - t - 0.04, x1 + 0.04, z0 + t, z1 - t, h + 0.25 + ph, h + 0.25 + ph + 0.07, 0.01)):
        kit.add('plinth', a)
    # two ochre fascia lines on the slab edge, as on the reference's roof edge
    for hh in (h + 0.04, h + 0.17):
        kit.add('plinth', wb('fl_n', x0 - 0.02, x1 + 0.02, z0 - 0.03, z0 + 0.0, hh, hh + 0.05, 0.004))
        kit.add('plinth', wb('fl_s', x0 - 0.02, x1 + 0.02, z1 + 0.0, z1 + 0.03, hh, hh + 0.05, 0.004))
        kit.add('plinth', wb('fl_w', x0 - 0.03, x0 + 0.0, z0, z1, hh, hh + 0.05, 0.004))
        kit.add('plinth', wb('fl_e', x1 + 0.0, x1 + 0.03, z0, z1, hh, hh + 0.05, 0.004))


def verandah(b, face, u0, u1, pillars_u, h):
    """Apron + pillars with ochre bases + a fascia beam, roof slab spanning the verandah."""
    kit.add('apron', b.fb(face, u0 - 0.2, u1 + 0.2, 0, V + 0.3, 0, 0.12, 0.012))
    for u in pillars_u:
        wx, wz = fpos(b, face, u, V - 0.2)
        pillar(kit, wx, wz, 0.12, h, w=0.36, base_h=1.0, base_kind='plinth')
    # fascia beam carrying the slab, with ochre stripes
    kit.add('plaster', b.fb(face, u0 - 0.3, u1 + 0.3, V - 0.45, V + 0.05, h - 0.45, h, 0.01))
    for hh in (h - 0.45, h - 0.12):
        kit.add('plinth', b.fb(face, u0 - 0.32, u1 + 0.32, V - 0.47, V + 0.07, hh, hh + 0.06, 0.006))


# ----------------------------------------------------------------------------- MAIN block (long, yard face = 'N' plane z=6)
def build_main():
    cuts = []
    # yard-facing (N face): windows, board recess, doors
    wins = [(-8.2, -7.0), (-0.9, 0.3), (3.3, 4.5), (7.2, 8.4)]
    doors = [(-3.4, -2.3), (5.2, 6.3)]
    for a, c in wins:
        cuts.append(main.recess('N', a, c, 1.2, 2.5, 0.12))
    for a, c in doors:
        cuts.append(main.recess('N', a, c, 0, 2.3, 0.12))
    # back (S face, z=12): four high horizontal barred windows
    back_wins = [(-8.5, -7.0), (-3.5, -2.0), (1.5, 3.0), (6.5, 8.0)]
    for a, c in back_wins:
        cuts.append(main.recess('S', a, c, 2.1, 2.9, 0.12))
    kit.add('plaster', main.solid(cuts=cuts))
    for a, c in wins:
        barred_window(kit, main, 'N', a, c, 1.2, 2.5)
    for a, c in doors:
        panel_door(kit, main, 'N', a, c, 0, 2.3, 0.12)
    for a, c in back_wins:
        barred_window(kit, main, 'S', a, c, 2.1, 2.9)
    plinth_face(main, 'N', -12, 12, gaps=[(a - 0.1, c + 0.1) for a, c in doors])
    plinth_face(main, 'S', -12, 12)
    plinth_face(main, 'E', 6, 12)
    plinth_face(main, 'W', 6, 12)
    # blackboard on the verandah wall, with chalk drawings: triangle, circle, sun, 1 [] 3 4
    bx0, bx1 = -6.2, -3.9
    kit.add('wood', main.fb('N', bx0 - 0.09, bx1 + 0.09, 0, 0.09, 1.1, 2.5, 0.01))
    kit.add('paint', main.fb('N', bx0, bx1, 0.07, 0.1, 1.2, 2.4, 0), 0x1D2B24)
    ch = 0xEEEEE6

    def chalk(u0, u1, h0, h1):
        kit.add('paint', main.fb('N', u0, u1, 0.1, 0.112, h0, h1, 0), ch)
    # triangle (3 slanted sticks), circle (ring), sun (small ring + rays), numerals as bars
    pts = [(-5.9, 2.25), (-5.55, 2.25), (-5.725, 2.0)]
    for (u, h), (u2, h2) in zip(pts, pts[1:] + pts[:1]):
        a = fpos(main, 'N', u, 0.106)
        c = fpos(main, 'N', u2, 0.106)
        kit.add('paint', limb('chalk', (a[0], a[1], h), (c[0], c[1], h2), 0.025, 0.012), ch)
    kit.add('paint', ring('chalk_o', *fpos(main, 'N', -5.2, 0.108), 2.12, 0.15, 0.012, axis='z'), ch)
    kit.add('paint', ring('chalk_sun', *fpos(main, 'N', -4.45, 0.108), 2.12, 0.1, 0.012, axis='z'), ch)
    for k in range(8):
        ang = k / 8 * math.tau
        a = fpos(main, 'N', -4.45 + 0.15 * math.cos(ang), 0.108)
        c = fpos(main, 'N', -4.45 + 0.24 * math.cos(ang), 0.108)
        kit.add('paint', limb('ray', (a[0], a[1], 2.12 + 0.15 * math.sin(ang)), (c[0], c[1], 2.12 + 0.24 * math.sin(ang)), 0.015, 0.01), ch)
    for i, u in enumerate((-5.9, -5.45, -5.0, -4.55)):  # "1 [] 3 4": bars + a square
        chalk(u, u + 0.03, 1.4, 1.75)
    chalk(-5.35, -5.0, 1.4, 1.43); chalk(-5.35, -5.0, 1.72, 1.75); chalk(-5.35, -5.32, 1.4, 1.75); chalk(-5.03, -5.0, 1.4, 1.75)
    # verandah, apron, pillars, benches with bags, water drum
    verandah(main, 'N', -9, 9, [-8, -4, 0, 4, 8], 3.7)
    for (x0, x1) in ((-8.6, -6.2), (-1.6, 1.2), (3.2, 5.8)):
        bench(kit, x0, x1, 5.55, 0.45)
        for i in range(int((x1 - x0) / 0.62)):
            school_bag(kit, x0 + 0.35 + i * 0.6, 5.55, 0.45, rnd.uniform(-0.15, 0.15), rnd.choice(BAGS))
    # steel water drum on a stand + a can, at the east end
    dx, dz = 8.2, 5.2
    for sx in (-0.2, 0.2):
        for sz in (-0.2, 0.2):
            kit.add('paint', limb('drum_leg', (dx + sx, dz + sz, 0.12), (dx + sx, dz + sz, 0.5), 0.05, 0.05), 0x555555)
    kit.add('paint', cyl('drum', dx, dz, 0.5, 1.2, 0.3, 0.3, 14), STEEL)
    kit.add('paint', cyl('drum_lid', dx, dz, 1.2, 1.24, 0.31, 0.31, 14), 0x8A8E93)
    kit.add('paint', limb('drum_tap', (dx - 0.3, dz, 0.75), (dx - 0.48, dz, 0.7), 0.05, 0.05), BRASS)
    kit.add('paint', cyl('can', dx - 0.65, dz + 0.1, 0.12, 0.5, 0.12, 0.13, 10), 0x8FA0AA)
    # roof + black tank + pipe
    roof(main, -12.3, 12.3, 3.6, 12.3, 3.7)
    tx, tz, th = 10.0, 10.2, 3.7 + 0.25
    kit.add('paint', cyl('tank', tx, tz, th, th + 1.2, 0.62, 0.62, 20), 0x1C1C1F)
    kit.add('paint', sphere('tank_dome', tx, tz, th + 1.2, 0.62, 0.62, 0.2, 2), 0x1C1C1F)
    for hr in (0.4, 0.85):
        kit.add('paint', cyl('tank_rib', tx, tz, th + hr, th + hr + 0.05, 0.645, 0.645, 20), 0x2A2A2E)
    kit.add('paint', limb('tank_pipe', (tx + 0.55, tz, th + 0.3), (tx + 0.55, tz, th + 0.5), 0.05, 0.05), 0x777777)
    kit.add('paint', limb('tank_pipe_v', (tx + 0.7, tz, th + 0.5), (tx + 0.7, tz, th), 0.05, 0.05), 0x777777)
    # drainpipes on the back wall corners
    for x in (-11.6, 11.6):
        kit.add('paint', limb('drain', (x, 12.1, 0.15), (x, 12.1, 3.7), 0.09, 0.09), 0x9A9EA3)
        kit.add('paint', limb('drain_elbow', (x, 12.1, 0.25), (x, 12.5, 0.15), 0.09, 0.09), 0x9A9EA3)


# ----------------------------------------------------------------------------- EAST wing (yard face = 'W' plane x=9)
def build_east():
    wins = [(-6.2, -5.0), (3.2, 4.4)]
    doors = [(-0.55, 0.55)]
    cuts = [east.recess('W', a, c, 1.2, 2.5, 0.12) for a, c in wins] + [east.recess('W', a, c, 0, 2.3, 0.12) for a, c in doors]
    kit.add('plaster', east.solid(cuts=cuts))
    for a, c in wins:
        barred_window(kit, east, 'W', a, c, 1.2, 2.5)
    for a, c in doors:
        panel_door(kit, east, 'W', a, c, 0, 2.3, 0.12)
    plinth_face(east, 'W', -9, 6, gaps=[(a - 0.1, c + 0.1) for a, c in doors])
    plinth_face(east, 'N', 9, 15)
    plinth_face(east, 'E', -9, 9)
    verandah(east, 'W', -9, 6, [-8, -4, 3.2], 3.6)
    for (z0, z1) in ((-7.6, -5.2), (1.4, 3.8)):
        # bench against the wall (axis along wz), at x = 9 - 0.3
        kit.add('wood', wb('bench_seat', 8.5, 8.85, z0, z1, 0.4, 0.45, 0.008))
        for z in (z0 + 0.15, z1 - 0.15):
            kit.add('wood', wb('bench_leg', 8.53, 8.82, z - 0.04, z + 0.04, 0, 0.4, 0.004))
        for i in range(int((z1 - z0) / 0.6)):
            school_bag(kit, 8.68, z0 + 0.35 + i * 0.6, 0.45, math.pi / 2 + rnd.uniform(-0.15, 0.15), rnd.choice(BAGS))
    roof(east, 6.7, 15.3, -9.3, 9.3, 3.6)
    kit.add('paint', limb('drain', (14.7, -9.1, 0.15), (14.7, -9.1, 3.6), 0.09, 0.09), 0x9A9EA3)


# ----------------------------------------------------------------------------- WEST wing: the walkable classroom ('E' plane x=-8.89)
def build_west():
    h = 3.4
    t = WT
    # four real walls; the east one has the 1.1 m door gap at z=0
    walls = {
        'n': wb('w_n', -15.11, -8.89, -9.11, -8.89, 0, h, 0.01),
        's': wb('w_s', -15.11, -8.89, 8.89, 9.11, 0, h, 0.01),
        'w': wb('w_w', -15.11, -14.89, -8.89, 8.89, 0, h, 0.01),
    }
    wins = [(-5.6, -4.4), (3.0, 4.2)]
    e_a = wb('w_e_a', -9.11, -8.89, -8.89, -0.55, 0, h, 0.01)
    e_b = wb('w_e_b', -9.11, -8.89, 0.55, 8.89, 0, h, 0.01)
    boolean_cut(e_a, west.recess('E', wins[0][0], wins[0][1], 1.2, 2.5, 0.1), apply_mod=True)
    boolean_cut(e_b, west.recess('E', wins[1][0], wins[1][1], 1.2, 2.5, 0.1), apply_mod=True)
    # west outer wall: a window high on it at z=5 (the donation board hangs at z=0, keep that clear)
    boolean_cut(walls['w'], west.recess('W', 4.4, 5.6, 1.2, 2.5, 0.1), apply_mod=True)
    for w in list(walls.values()) + [e_a, e_b]:
        kit.add('plaster', w)
    for a, c in wins:
        barred_window(kit, west, 'E', a, c, 1.2, 2.5)
    barred_window(kit, west, 'W', 4.4, 5.6, 1.2, 2.5)
    # door frame (real gap) — dark jambs + lintel, leaf swung open against the verandah wall
    ft = 0.09
    kit.add('wood', west.fb('E', -0.55 - ft, -0.55, -t - 0.01, 0.05, 0, 2.3, 0.006))
    kit.add('wood', west.fb('E', 0.55, 0.55 + ft, -t - 0.01, 0.05, 0, 2.3, 0.006))
    kit.add('wood', west.fb('E', -0.55 - ft, 0.55 + ft, -t - 0.01, 0.05, 2.2, 2.4, 0.006))
    kit.add('wood', west.fb('E', 0.62, 1.5, 0.05, 0.1, 0.05, 2.2, 0.004))  # the open leaf, flat on the wall beside the door
    for (p0, p1) in ((0.2, 1.0), (1.2, 2.0)):
        kit.add('wood', west.fb('E', 0.72, 1.4, 0.1, 0.13, p0, p1, 0.004))
    plinth_face(west, 'E', -9.11, 6, gaps=[(-0.75, 0.75)])
    plinth_face(west, 'N', -15.11, -8.89)
    plinth_face(west, 'S', -15.11, -8.89)
    plinth_face(west, 'W', -9.11, 9.11)
    for (cx, cz) in ((-15, -9), (-9, -9), (-15, 9)):
        kit.add('plaster', wb('pil_corner', cx - 0.17, cx + 0.17, cz - 0.17, cz + 0.17, 0, h, 0.012))
    verandah(west, 'E', -9, 6, [-8, -4, 4], h)
    for (z0, z1) in ((-7.6, -5.2), (1.8, 4.2)):
        kit.add('wood', wb('bench_seat', -8.85, -8.5, z0, z1, 0.4, 0.45, 0.008))
        for z in (z0 + 0.15, z1 - 0.15):
            kit.add('wood', wb('bench_leg', -8.82, -8.53, z - 0.04, z + 0.04, 0, 0.4, 0.004))
    roof(west, -15.4, -6.5, -9.4, 9.4, h)
    kit.add('paint', limb('drain', (-15.35, -9.1, 0.15), (-15.35, -9.1, h), 0.09, 0.09), 0x9A9EA3)


# ----------------------------------------------------------------------------- boundary wall + gate
def wall_run(name, x0, x1, z0, z1, h=1.6):
    kit.add('plaster', wb(name, x0, x1, z0, z1, 0, h, 0.01))
    along_x = (x1 - x0) > (z1 - z0)
    if along_x:
        kit.add('plinth', wb(name + '_pl', x0, x1, z0 - 0.05, z1 + 0.05, 0, 0.55, 0.012))
        kit.add('plinth', wb(name + '_cope', x0 - 0.04, x1 + 0.04, z0 - 0.08, z1 + 0.08, h, h + 0.1, 0.012))
    else:
        kit.add('plinth', wb(name + '_pl', x0 - 0.05, x1 + 0.05, z0, z1, 0, 0.55, 0.012))
        kit.add('plinth', wb(name + '_cope', x0 - 0.08, x1 + 0.08, z0 - 0.04, z1 + 0.04, h, h + 0.1, 0.012))


def build_boundary():
    GZ = -12.0
    GAP = 2.4
    wall_run('bw_s_w', -15.11, -GAP - 0.3, GZ - 0.11, GZ + 0.11)
    wall_run('bw_s_e', GAP + 0.3, 15.11, GZ - 0.11, GZ + 0.11)
    wall_run('bw_w_s', -15.11, -14.89, GZ - 0.11, -9.11)
    wall_run('bw_e_s', 14.89, 15.11, GZ - 0.11, -9.11)
    wall_run('bw_w_n', -15.11, -14.89, 9.11, 12.11)
    wall_run('bw_e_n', 14.89, 15.11, 9.11, 12.11)
    wall_run('bw_n_w', -15.11, -12.0, 11.89, 12.11)
    wall_run('bw_n_e', 12.0, 15.11, 11.89, 12.11)
    # ornate gate: two pillars, a lintel with an arch of iron, leaves swung open INTO the yard (outside the walking gap)
    for sgn in (-1, 1):
        px = sgn * (GAP + 0.3 + 0.1)
        kit.add('plaster', wb('gate_pillar', px - 0.3, px + 0.3, GZ - 0.3, GZ + 0.3, 0, 2.5, 0.015))
        kit.add('plinth', wb('gate_pillar_pl', px - 0.33, px + 0.33, GZ - 0.33, GZ + 0.33, 0, 0.8, 0.012))
        kit.add('plinth', wb('gate_cap', px - 0.38, px + 0.38, GZ - 0.38, GZ + 0.38, 2.5, 2.62, 0.015))
        kit.add('plaster', wb('gate_cap2', px - 0.28, px + 0.28, GZ - 0.28, GZ + 0.28, 2.62, 2.74, 0.01))
        # iron leaf perpendicular to the wall at the gap edge
        gx = sgn * (GAP + 0.02)
        z_in, z_out = GZ + 0.12, GZ + 0.12 + 2.2
        kit.add('paint', limb('leaf_top', (gx, z_in, 2.15), (gx, z_out, 2.15), 0.05, 0.06), 0x2B2B2E)
        kit.add('paint', limb('leaf_bot', (gx, z_in, 0.25), (gx, z_out, 0.25), 0.05, 0.06), 0x2B2B2E)
        kit.add('paint', limb('leaf_mid', (gx, z_in, 1.2), (gx, z_out, 1.2), 0.04, 0.05), 0x2B2B2E)
        for k in range(12):
            z = z_in + (k + 0.5) * (2.2 / 12)
            kit.add('paint', limb('leaf_bar', (gx, z, 0.25), (gx, z, 2.15 + 0.12 * math.sin(k / 11 * math.pi)), 0.03, 0.03), 0x2B2B2E)
            kit.add('paint', sphere('leaf_finial', gx, z, 2.2 + 0.12 * math.sin(k / 11 * math.pi), 0.03, 0.03, 0.04, 1), 0x2B2B2E)
    # (bougainvillea removed 24 Oct: playtest item 2, it read as pink/green polyhedra)
    pot(kit, -2.0, GZ + 0.8, 0.0, 0.25, 0.34, flower=None)


# ----------------------------------------------------------------------------- yard furniture
def build_yard():
    # hand pump on a concrete platform with a water trough (SW corner), 3 bicycles leaning on the west wall
    px, pz = -11.2, -10.5
    kit.add('trim', wb('pump_plat', px - 1.2, px + 1.0, pz - 0.9, pz + 0.9, 0, 0.1, 0.012))
    kit.add('trim', wb('pump_trough', px + 0.2, px + 1.5, pz - 0.2, pz + 0.2, 0.0, 0.18, 0.01))
    kit.add('paint', cyl('pump_base', px - 0.6, pz, 0.1, 0.4, 0.14, 0.12, 10), 0x2E5E3A)
    kit.add('paint', cyl('pump_col', px - 0.6, pz, 0.4, 1.15, 0.07, 0.06, 10), 0x2E5E3A)
    kit.add('paint', limb('pump_handle', (px - 0.6, pz, 1.1), (px - 1.05, pz, 1.35), 0.05, 0.05), 0x2E5E3A)
    kit.add('paint', limb('pump_spout', (px - 0.6, pz, 0.8), (px - 0.25, pz, 0.62), 0.05, 0.05), 0x2E5E3A)
    for i, (bz, col) in enumerate(((-11.6, 0xC0392B), (-10.7, 0x2E86C1), (-9.9, 0xE0B53A))):
        bx = -14.5
        kit.add('paint', ring('bike_wheel_f', bx, bz, 0.3, 0.3, 0.025, axis='x'), 0x1B1B1D)
        kit.add('paint', ring('bike_wheel_r', bx + 0.95, bz, 0.3, 0.3, 0.025, axis='x'), 0x1B1B1D)
        kit.add('paint', limb('bike_frame1', (bx, bz, 0.3), (bx + 0.5, bz, 0.62), 0.03, 0.03), col)
        kit.add('paint', limb('bike_frame2', (bx + 0.5, bz, 0.62), (bx + 0.95, bz, 0.3), 0.03, 0.03), col)
        kit.add('paint', limb('bike_frame3', (bx + 0.5, bz, 0.62), (bx + 0.9, bz, 0.66), 0.03, 0.03), col)
        kit.add('paint', limb('bike_bar', (bx + 0.05, bz - 0.2, 0.7), (bx + 0.05, bz + 0.2, 0.7), 0.025, 0.025), 0x333333)
        kit.add('paint', limb('bike_fork', (bx, bz, 0.3), (bx + 0.05, bz, 0.7), 0.03, 0.03), 0x333333)
        kit.add('paint', wb('bike_seat', bx + 0.82, bx + 1.02, bz - 0.06, bz + 0.06, 0.66, 0.7, 0.01), 0x222222)
    # raised brick ring around a neem (the code-built tree is placed in it by src/main.js)
    rx, rz, R = -4.5, -6.2, 1.55
    n = 22
    for i in range(n):
        a0, a1 = i / n * math.tau, (i + 1) / n * math.tau
        mx, mz = rx + R * math.cos((a0 + a1) / 2), rz + R * math.sin((a0 + a1) / 2)
        kit.add('brick', limb('ring_seg', (rx + R * math.cos(a0), rz + R * math.sin(a0), 0.14), (rx + R * math.cos(a1), rz + R * math.sin(a1), 0.14), 0.34, 0.28, 0.01))
    kit.add('paint', cyl('ring_soil', rx, rz, 0.0, 0.26, R - 0.15, R - 0.15, 22), SOIL)
    # tyre swing + a stuck kite in the big shade tree (src/main.js plants a big neem at (6.2, -1.0) in this frame; reference: tree with a
    # hanging tyre and kites). Branch height ~3.4; rope hangs from it, tyre ring at the bottom.
    tx, tz = 7.5, -1.0
    kit.add('paint', limb('swing_branch', (6.2, -1.0, 3.1), (tx + 0.3, tz, 3.45), 0.14, 0.1, 0.01), 0x4A3A2E)
    for dz in (-0.12, 0.12):
        kit.add('paint', limb('swing_rope', (tx, tz + dz, 3.4), (tx, tz + dz * 1.6, 0.85), 0.025, 0.025), 0xB89A64)
    kit.add('paint', ring('swing_tyre', tx, tz, 0.62, 0.34, 0.1, axis='z'), 0x1B1B1D)
    kx, kz, kh = 5.2, -2.1, 4.1
    kit.add('paint', quad('kite_a', [(kx, kz, kh + 0.5), (kx + 0.36, kz, kh), (kx, kz, kh - 0.5), (kx - 0.36, kz, kh)]), 0xE0392B)
    kit.add('paint', quad('kite_b', [(kx, kz + 0.003, kh + 0.5), (kx, kz + 0.003, kh), (kx - 0.36, kz + 0.003, kh)]), 0xF2B01E)
    for k in range(4):
        kit.add('paint', quad('kite_tail', [(kx - 0.04, kz, kh - 0.55 - k * 0.2), (kx + 0.04, kz, kh - 0.6 - k * 0.2), (kx, kz, kh - 0.75 - k * 0.2)]), (0xE0392B, 0x2E86C1)[k % 2])
    # fenced vegetable plot with a wooden fence
    gx0, gx1, gz0, gz1 = 3.0, 6.0, -8.4, -4.4
    for z in (gz0, gz1):
        kit.add('wood', limb('fence_rail_a', (gx0, z, 0.85), (gx1, z, 0.85), 0.04, 0.04))
        kit.add('wood', limb('fence_rail_b', (gx0, z, 0.45), (gx1, z, 0.45), 0.04, 0.04))
    for x in (gx0, gx1):
        kit.add('wood', limb('fence_rail_a', (x, gz0, 0.85), (x, gz1, 0.85), 0.04, 0.04))
        kit.add('wood', limb('fence_rail_b', (x, gz0, 0.45), (x, gz1, 0.45), 0.04, 0.04))
    for i in range(int((gx1 - gx0) / 0.6) + 1):
        for z in (gz0, gz1):
            kit.add('wood', limb('fence_post', (gx0 + i * 0.6, z, 0), (gx0 + i * 0.6, z, 1.0), 0.07, 0.07))
    for i in range(int((gz1 - gz0) / 0.6) + 1):
        for x in (gx0, gx1):
            kit.add('wood', limb('fence_post', (x, gz0 + i * 0.6, 0), (x, gz0 + i * 0.6, 1.0), 0.07, 0.07))
    kit.add('paint', wb('plot_soil', gx0 + 0.1, gx1 - 0.1, gz0 + 0.1, gz1 - 0.1, 0, 0.12, 0), 0x4A3524)
    for r in range(4):
        for c in range(6):
            x = gx0 + 0.35 + c * 0.45
            z = gz0 + 0.4 + r * 0.95
            kit.add('paint', sphere('veg', x, z, 0.25, 0.2, 0.2, 0.15, 1), rnd.choice(LEAF))
    # tin-roofed lean-to with a firewood stack (SE corner)
    sx0, sx1, sz0, sz1 = 10.2, 14.8, -11.8, -9.5
    kit.add('wood', limb('shed_post', (sx0, sz1, 0), (sx0, sz1, 2.1), 0.12, 0.12))
    kit.add('wood', limb('shed_post', (sx1, sz1, 0), (sx1, sz1, 2.1), 0.12, 0.12))
    kit.add('wood', limb('shed_post', (sx0, sz0 + 0.1, 0), (sx0, sz0 + 0.1, 2.6), 0.12, 0.12))
    kit.add('wood', limb('shed_post', (sx1, sz0 + 0.1, 0), (sx1, sz0 + 0.1, 2.6), 0.12, 0.12))
    kit.add('tin', prism_x('shed_roof', sx0 - 0.3, sx1 + 0.3, [(sz0 - 0.1, 2.7), (sz1 + 0.35, 2.15), (sz1 + 0.35, 2.22), (sz0 - 0.1, 2.77)]))
    kit.add('wood', wb('shed_back', sx0, sx1, sz0, sz0 + 0.1, 0, 2.0, 0.008))
    for i in range(7):
        for j in range(5 - (i % 2)):
            kit.add('wood', cyl('log', sx0 + 0.3 + i * 0.3, sz0 + 0.45 + j * 0.3 + (0.15 if i % 2 else 0), 0.0, 0.5, 0.11, 0.11, 8), 0x7A5A3A)
    # parked scooter outside the gate (generic, cream, no marks)
    sx, sz = 6.0, -14.2
    kit.add('paint', ring('sc_wheel_f', sx - 0.55, sz, 0.17, 0.17, 0.045, axis='x'), 0x1B1B1D)
    kit.add('paint', ring('sc_wheel_r', sx + 0.5, sz, 0.17, 0.17, 0.045, axis='x'), 0x1B1B1D)
    kit.add('paint', sphere('sc_body', sx + 0.15, sz, 0.45, 0.5, 0.2, 0.22, 2), 0xE8DDB5)
    kit.add('paint', sphere('sc_front', sx - 0.5, sz, 0.55, 0.15, 0.17, 0.35, 2), 0xE8DDB5)
    kit.add('paint', limb('sc_bar', (sx - 0.52, sz - 0.3, 0.98), (sx - 0.52, sz + 0.3, 0.98), 0.035, 0.035), 0x333333)
    kit.add('paint', wb('sc_seat', sx - 0.1, sx + 0.55, sz - 0.14, sz + 0.14, 0.68, 0.76, 0.02), 0x2B2420)
    # flower beds + grass strip along the main verandah (gap in the middle for the path)
    flower_bed(kit, -8.6, -1.0, 1.4, 2.6, rnd=rnd, soil=0x4E7F34)
    flower_bed(kit, 1.0, 8.6, 1.4, 2.6, rnd=rnd, soil=0x4E7F34)
    for x in (-7.5, -2.5, 3.0, 7.5):
        pot(kit, x, 3.0, 0.0, 0.18, 0.24, flower=MARI)
    # chalk hopscotch + pitch markings on the yard dirt (one decal atlas)
    def paint_atlas(u, v):
        # left 45%: hopscotch grid (white lines); right 55%: cricket pitch (pale strip + creases)
        if u < 0.45:
            uu, vv = u / 0.45, v
            cells = [(0.25, 0.0, 0.75, 0.2), (0.25, 0.2, 0.75, 0.4), (0.0, 0.4, 0.5, 0.6), (0.5, 0.4, 1.0, 0.6), (0.25, 0.6, 0.75, 0.8), (0.0, 0.8, 0.5, 1.0), (0.5, 0.8, 1.0, 1.0)]
            for (a, b, c, d) in cells:
                edge = min(abs(uu - a), abs(uu - c), abs(vv - b), abs(vv - d))
                inside = a - 0.03 <= uu <= c + 0.03 and b - 0.015 <= vv <= d + 0.015
                if inside and edge < 0.025:
                    return (0.9, 0.9, 0.86, 0.95)
            return None
        uu, vv = (u - 0.45) / 0.55, v
        if 0.12 < vv < 0.88 and 0.0 < uu < 1.0:
            base = (0.62, 0.5, 0.36, 0.45)
            if abs(vv - 0.2) < 0.012 or abs(vv - 0.8) < 0.012 or abs(vv - 0.14) < 0.01 or abs(vv - 0.86) < 0.01:
                return (0.92, 0.9, 0.84, 0.9)
            return base
        return None
    dmat = decal_material('hb_decal', (768, 512), paint_atlas)
    kit.extra.append(decal_quad('hopscotch_a', -7.0, -5.8, -9.0, -5.8, 0.025, (0.0, 0.0, 0.45, 1.0), dmat))
    kit.extra.append(decal_quad('hopscotch_b', 7.5, 8.7, -3.0, 0.2, 0.025, (0.0, 0.0, 0.45, 1.0), dmat))
    kit.extra.append(decal_quad('pitch', -2.5, 3.5, -4.2, -1.0, 0.026, (0.45, 0.0, 1.0, 1.0), dmat))
    # flagpole base (the pole itself is code: src/props.js) — a stepped concrete plinth at (0,-8)
    for i, w in enumerate((0.9, 0.62, 0.36)):
        kit.add('trim', wb('flag_step', -w, w, -8 - w, -8 + w, i * 0.14, (i + 1) * 0.14, 0.01))


build_main()
build_east()
build_west()
build_boundary()
build_yard()

TINTS = {'hb_plaster': '#FFF1CF', 'hb_plinth': '#E39A3C', 'hb_trim': '#F6E6BC', 'hb_apron': '#A8845A',
         'hb_wood': '#4B392D', 'hb_brick': '#C26A44', 'hb_tin': '#C5CDD2'}
from common import join_objects
if len(kit.extra) > 1:
    kit.extra[:] = [join_objects(kit.extra, 'decals')]
kit.finalize(OUT, TINTS, drift={'hb_plaster': 0.04, 'hb_plinth': 0.05, 'hb_apron': 0.08, 'hb_brick': 0.08})
