"""
Gaushala - built with arch.py's Kit to Places V1/gaushala/LAYOUT.md (the spec) and the approved
MAIN_gaushala_back_top.png (TOP = layout authority) / MAIN_gaushala_front_isometric.png.

Run:  tools/blender/make.sh gaushala gaushala   (Blender -> shrink -> public/assets/models/gaushala.glb)

Frame: site-local metres, +x east, +z south (front, where the gate is). Compound x[-13.5,13.5] z[-10.5,10.5].
28 Oct 2026: compound scaled to 75% in PLAN (was 36 x 28 m, now 27 x 21 m): walls, gate and the shed's LENGTH x0.75.
31 Oct: her 27 Oct rule (ART_REVIEW #8) is "scale the compound, not the contents", so the cattle shed is back to
4 m deep and the straw store to 6 x 5 m. Heights stay at the LAYOUT.md values (1.8 m wall, 1.5 m front, shed eaves) so people and
cattle still fit. Contents keep their size and are re-seated: troughs, pump, neem platform, compost pit,
biogas dome, bales, chaff cutter, clutter, and the 4 x 3 m office (a room, so it stays at her size).
  back + side walls   1.8 m brick, cement coping
  FRONT               0.5 m brick base + 1.5 m grey iron bar railing, brick gate pillars, open iron gate, blank board
  LEFT shed           ONE long open cattle shed (4 m deep) down the left wall, tin roof on brick pillars, cement feed trough
  BACK-RIGHT          open straw store 6 x 5 m, brick pillars, tin roof
  FRONT-RIGHT         cream office 4 x 3 m, flat roof with parapet, door + barred window
  MIDDLE              long cement water trough + hand pump; round brick platform (the neem is hers, left empty)
  FRONT-LEFT          compost pit + round biogas dome with gas pipe
  clutter             electric chaff cutter, two wheelbarrows, dung-cake heaps, buckets
Cows, calves, the tree and green fodder are organic and hers: not built. The drawing's metre notes and view
labels are not built. All signage text is painted in-game (src/signPaint.js) on the blank board.
"""
import sys
import os
import math
import random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import wb, limb, cyl, sphere, prism_x, prism_z, cut, ROOT
from arch import Kit, Bldg, panel_door, barred_window, ring, lathe

OUT = os.path.join(ROOT, 'tmp', 'gaushala_raw.glb')
kit = Kit(split_props=False, own=('metal', 'thatch'), wood_slot='props')
rnd = random.Random(25)

S = 0.75          # plan scale of the compound shell (28 Oct 2026)
HX, HZ = 18.0 * S, 14.0 * S
T = 0.35          # brick wall thickness
WALL_H = 1.8
LOW_H, RAIL_H = 0.5, 1.5
IRON = 0x3A3D42
COPING = 0xB9B6AE
CEMENT = 0xA9A69F
DIRT = 0xC09A68
GATE_HALF = 2.0 * S   # clear half-opening between the pillars (3 m clear)
PIER = 0.6


def brick(o):
    kit.add('brick', o)


def trim(o, c=COPING):
    kit.add('trim', o, c)


def iron(o, c=IRON):
    kit.add('metal', o, c)


def build_ground():
    kit.add('paint', wb('ground', -HX, HX, -HZ, HZ, -0.05, 0.04, 0), DIRT)
    # worn, darker packed earth along the cattle line and gate approach, swept paler elsewhere
    kit.add('paint', wb('ground_trodden', -8.4, -5.9, -9.8, 6.0, 0.04, 0.045, 0), 0xA98660)
    kit.add('paint', wb('ground_gate', -2.6, 2.6, 7.6, HZ - 0.3, 0.04, 0.046, 0), 0xB68F5E)
    # cement apron under the gate
    trim(wb('gate_apron', -GATE_HALF - PIER, GATE_HALF + PIER, HZ - 0.45, HZ + 0.9, 0, 0.05, 0.01), 0xB2AFA7)


def build_walls():
    brick(wb('wall_back', -HX, HX, -HZ, -HZ + T, 0, WALL_H, 0.01))
    brick(wb('wall_west', -HX, -HX + T, -HZ + T, HZ - T, 0, WALL_H, 0.01))
    brick(wb('wall_east', HX - T, HX, -HZ + T, HZ - T, 0, WALL_H, 0.01))
    for nm, x0, x1, z0, z1 in (('back', -HX - 0.05, HX + 0.05, -HZ - 0.05, -HZ + T + 0.05),
                               ('west', -HX - 0.05, -HX + T + 0.05, -HZ + T, HZ - T, ),
                               ('east', HX - T - 0.05, HX + 0.05, -HZ + T, HZ - T)):
        trim(wb('cope_' + nm, x0, x1, z0, z1, WALL_H, WALL_H + 0.09, 0.01))
    # wall piers every 6 m: a slightly proud brick buttress, so a 36 m wall is not one flat sheet
    for x in (-9, -4.5, 0, 4.5, 9):
        brick(wb('buttress_b', x - 0.22, x + 0.22, -HZ + T, -HZ + T + 0.12, 0, WALL_H, 0.005))
    for z in (-6, -1.5, 3, 7.5):
        brick(wb('buttress_e', HX - T - 0.12, HX - T, z - 0.22, z + 0.22, 0, WALL_H, 0.005))
        brick(wb('buttress_w', -HX + T, -HX + T + 0.12, z - 0.22, z + 0.22, 0, WALL_H, 0.005))


def build_front():
    zf0, zf1 = HZ - T, HZ
    zm = (zf0 + zf1) / 2
    gx = GATE_HALF + PIER
    for nm, x0, x1 in (('l', -HX, -gx), ('r', gx, HX)):
        brick(wb('front_low_' + nm, x0, x1, zf0, zf1, 0, LOW_H, 0.01))
        trim(wb('front_cap_' + nm, x0 - 0.04, x1 + 0.04, zf0 - 0.05, zf1 + 0.05, LOW_H, LOW_H + 0.08, 0.01))
        # iron railing: bars every 0.14 m (reads as a see-through fence), top + mid rail, newel at the ends
        span = x1 - x0
        n = int(span / 0.14)
        for i in range(n + 1):
            x = x0 + 0.12 + (span - 0.24) * i / n
            iron(limb('rail_bar', (x, zm, LOW_H + 0.08), (x, zm, RAIL_H), 0.022))
        for h in (RAIL_H - 0.05, LOW_H + 0.4):
            iron(limb('rail_h', (x0, zm, h), (x1, zm, h), 0.04, 0.05))
        for x in (x0 + 0.08, x1 - 0.08):
            iron(limb('rail_post', (x, zm, LOW_H + 0.08), (x, zm, RAIL_H + 0.05), 0.07))
        # railing returns (the drawing carries the fence a metre round the side corners)
    # gate pillars: taller brick piers with cement cap
    for nm, cx in (('l', -GATE_HALF - PIER / 2), ('r', GATE_HALF + PIER / 2)):
        brick(wb('pier_' + nm, cx - PIER / 2, cx + PIER / 2, zf0 - 0.1, zf1 + 0.1, 0, 2.4, 0.01))
        trim(wb('pier_cap_' + nm, cx - PIER / 2 - 0.07, cx + PIER / 2 + 0.07, zf0 - 0.17, zf1 + 0.17, 2.4, 2.54, 0.012))
        trim(wb('pier_cap2_' + nm, cx - PIER / 2 + 0.05, cx + PIER / 2 - 0.05, zf0 - 0.08, zf1 + 0.08, 2.54, 2.62, 0.01))
        trim(wb('pier_band_' + nm, cx - PIER / 2 - 0.03, cx + PIER / 2 + 0.03, zf0 - 0.13, zf1 + 0.13, 1.25, 1.33, 0.008))
    # iron gate, both leaves swung OPEN inward (so the player can walk in): hinged at each pier, running north
    for sg in (-1, 1):
        hx = sg * (GATE_HALF - 0.04)
        zs, ze = HZ - 0.55, HZ - 0.55 - 2 * GATE_HALF + 0.1   # hinge end -> free end (running toward -z)
        for h0, h1 in ((0.1, 2.0),):
            iron(limb('gate_hinge_post', (hx, zs, h0), (hx, zs, h1 + 0.05), 0.07))
            iron(limb('gate_free_post', (hx, ze, h0), (hx, ze, h1 + 0.35), 0.06))
        iron(limb('gate_bot', (hx, zs, 0.14), (hx, ze, 0.14), 0.07, 0.05))
        iron(limb('gate_mid', (hx, zs, 1.05), (hx, ze, 1.05), 0.06, 0.05))
        iron(limb('gate_top', (hx, zs, 2.02), (hx, ze, 2.37), 0.07, 0.05))      # gently arched: rises to the free end
        # dark sheet lower panel (the drawing's gate is solid dark below the bars)
        iron(limb('gate_sheet', (hx, zs, 0.2), (hx, ze, 0.2), 0.03, 0.85), 0x2E3034)
        nb = 12
        for i in range(1, nb):
            z = zs + (ze - zs) * i / nb
            top = 2.02 + (2.37 - 2.02) * i / nb
            iron(limb('gate_bar', (hx, z, 1.05), (hx, z, top), 0.025))
        # hinges + a latch
        for h in (0.4, 1.7):
            iron(limb('gate_hinge', (hx + sg * 0.02, HZ - 0.4, h), (hx - sg * 0.02, HZ - 0.7, h), 0.05, 0.04), 0x25272A)
    # blank board above the gate on two iron posts rising from the pillars; the game paints the name on it
    for sg in (-1, 1):
        iron(limb('board_post', (sg * (GATE_HALF + PIER / 2), zm, 2.62), (sg * (GATE_HALF + PIER / 2), zm, 3.95), 0.09))
    BW = 2.4    # board half-width (4.8 m board, was 6.4); height kept so the lettering stays legible
    kit.add('plaster', wb('board_back', -BW, BW, zm - 0.07, zm + 0.07, 3.0, 4.1, 0.015), 0xE9DEBC)
    for nm, x0, x1, h0, h1 in (('t', -BW - 0.08, BW + 0.08, 4.1, 4.16), ('b', -BW - 0.08, BW + 0.08, 2.94, 3.0), ('l', -BW - 0.08, -BW, 2.94, 4.16), ('r', BW, BW + 0.08, 2.94, 4.16)):
        iron(wb('board_edge_' + nm, x0, x1, zm - 0.09, zm + 0.09, h0, h1, 0.01), 0x2F3236)


def build_shed():
    """One long open cattle shed down the LEFT wall, full depth: 4 m deep, tin roof on brick pillars, cement feed trough."""
    sx0, sx1 = -HX + T, -HX + T + 3.65           # inside the wall to the open edge: 4 m deep with the wall (her size, never scaled)
    z0, z1 = -HZ + T, 8.0 * S
    # raise the party wall to roof height over the shed length
    brick(wb('shed_back_wall', -HX, -HX + T, z0, z1, WALL_H, 3.35, 0.01))
    nb = 6
    for i in range(nb + 1):
        z = z0 + 0.25 + (z1 - z0 - 0.5) * i / nb
        brick(wb('shed_pillar', sx1 - 0.2, sx1 + 0.2, z - 0.2, z + 0.2, 0, 2.6, 0.012))
        trim(wb('shed_pillar_cap', sx1 - 0.26, sx1 + 0.26, z - 0.26, z + 0.26, 2.6, 2.68, 0.01))
        # low brick stall partitions between the pillars (cows stand head to the trough)
        if i < nb:
            zm = z + (z1 - z0 - 0.5) / nb / 2
            brick(wb('stall_div', sx0 + 0.9, sx1, zm - 0.08, zm + 0.08, 0, 0.9, 0.008))
    # purlin beam on the pillars, tin roof sloping down to the open edge
    kit.add('wood', limb('shed_beam', (sx1, z0 - 0.1, 2.68), (sx1, z1 + 0.1, 2.68), 0.2, 0.16))
    for i in range(nb * 2 + 1):
        z = z0 + (z1 - z0) * i / (nb * 2)
        kit.add('wood', limb('rafter', (-HX - 0.1, z, 3.34), (sx1 + 0.55, z, 2.7), 0.07, 0.09))
    roof = prism_z('shed_roof', z0 - 0.35, z1 + 0.35, [(-HX - 0.25, 3.43), (sx1 + 0.7, 2.8), (sx1 + 0.7, 2.74), (-HX - 0.25, 3.37)])
    kit.add('tin', roof)
    # cement feeding trough along the open edge, hollow, with end walls
    tx0, tx1 = sx1 + 0.35, sx1 + 1.05
    tro = wb('feed_trough', tx0, tx1, z0 + 0.25, z1 - 0.1, 0, 0.62, 0.015)
    cut(tro, [wb('feed_cut', tx0 + 0.1, tx1 - 0.1, z0 + 0.4, z1 - 0.25, 0.2, 0.7, 0)])
    trim(tro, CEMENT)
    # cement floor strip under the trough
    trim(wb('feed_apron', tx0 - 0.15, tx1 + 0.25, z0 + 0.15, z1 - 0.0, 0, 0.04, 0.01), 0xA5A29A)
    # low cement kerb between the stalls and the yard
    trim(wb('shed_plinth', sx0, sx1 - 0.05, z0, z1, 0, 0.12, 0.01), 0x9D9A92)


def build_straw_store():
    """Open straw store, back-right, 6 x 5 m (her size: the 75% squeeze scales the yard, never the contents):
    brick pillars, tin roof, open to the south."""
    x0, x1 = HX - T - 6.0, HX - T
    z0, z1 = -HZ + T, -HZ + T + 5.0
    brick(wb('store_back_wall', x0 - 0.02, x1 + T, -HZ, -HZ + T, WALL_H, 3.3, 0.01))
    brick(wb('store_east_wall', HX - T, HX, -HZ + T, z1, WALL_H, 3.3, 0.01))
    for x in (x0 + 0.2, x0 + 3.0, x1 - 0.2):
        brick(wb('store_pillar', x - 0.2, x + 0.2, z1 - 0.2, z1 + 0.2, 0, 2.7, 0.012))
    brick(wb('store_pillar_w', x0 - 0.2, x0 + 0.2, z0 + 1.8 - 0.2, z0 + 1.8 + 0.2, 0, 2.7, 0.012))
    kit.add('wood', limb('store_beam', (x0 - 0.1, z1, 2.74), (x1, z1, 2.74), 0.2, 0.16))
    for i in range(6):
        x = x0 + 0.1 + (x1 - x0 - 0.2) * i / 5
        kit.add('wood', limb('store_rafter', (x, -HZ - 0.05, 3.28), (x, z1 + 0.5, 2.76), 0.07, 0.09))
    kit.add('tin', prism_x('store_roof', x0 - 0.4, x1 + 0.3, [(-HZ - 0.3, 3.4), (z1 + 0.65, 2.84), (z1 + 0.65, 2.78), (-HZ - 0.3, 3.34)]))
    trim(wb('store_plinth', x0, x1, z1 - 0.05, z1 + 0.12, 0, 0.12, 0.01), 0xA09D95)
    # stacked straw bales (hard blocks: rectangular, strapped), per-bale size/yaw jitter
    for layer, (n, y0) in enumerate(((4, 0.04), (3, 0.4), (2, 0.76), (1, 1.12))):
        for i in range(n):
            bx = x0 + 0.5 + i * 0.95 + layer * 0.45 + rnd.uniform(-0.03, 0.03)
            kit.add('thatch', wb('bale', bx, bx + 0.9 + rnd.uniform(-0.04, 0.04), z0 + 0.2, z0 + 1.55 + rnd.uniform(-0.05, 0.05), y0, y0 + 0.36, 0.03),
                    [0xCDB26B, 0xC4A85E, 0xD6BC78][(i + layer) % 3])
    for i in range(3):
        bx = x0 + 0.5 + i * 1.05
        kit.add('thatch', wb('bale2', bx, bx + 0.95, z0 + 1.7, z0 + 3.1, 0.04, 0.4, 0.03), [0xC9AD62, 0xD3B974, 0xC0A458][i % 3])
        if i < 2:
            kit.add('thatch', wb('bale3', bx + 0.3, bx + 1.25, z0 + 1.8, z0 + 3.2, 0.4, 0.76, 0.03), 0xCDB26B)
    kit.add('thatch', wb('bale_loose', x0 + 3.65, x0 + 4.35, z0 + 1.6, z0 + 3.4, 0.02, 0.2, 0.08), 0xB9A058)


def build_office():
    """Cream office 4 x 3 m (her size, NOT scaled), front-right. Door on the west face, barred window on the south face,
    flat roof + parapet. Positioned 0.2 m off the east wall, centred where the 75% plan puts it (z = 3.75)."""
    ox1 = HX - T - 0.2
    ox0, oz0 = ox1 - 3.0, 1.75
    oz1 = oz0 + 4.0
    h = 2.9
    b = Bldg('office', ox0, ox1, oz0, oz1, h, t=0.22)
    cuts = [b.recess('W', oz0 + 2.1, oz0 + 3.2, 0.0, 2.05, 0.14), b.recess('S', ox0 + 0.85, ox0 + 2.05, 1.05, 2.05, 0.12),
            b.recess('N', ox0 + 1.15, ox0 + 1.95, 1.15, 1.95, 0.1)]
    kit.add('plaster', b.solid(cuts=cuts))
    kit.add('plinth', wb('off_plinth', ox0 - 0.07, ox1 + 0.07, oz0 - 0.07, oz1 + 0.07, 0, 0.42, 0.012), 0xB4A889)
    # flat roof slab with a low parapet and a rain spout; slab is pale cement
    trim(wb('off_slab', ox0 - 0.12, ox1 + 0.12, oz0 - 0.12, oz1 + 0.12, h, h + 0.12, 0.012), 0xBDBBB4)
    par = wb('off_parapet', ox0 - 0.12, ox1 + 0.12, oz0 - 0.12, oz1 + 0.12, h + 0.12, h + 0.52, 0.01)
    cut(par, [wb('off_par_cut', ox0 + 0.03, ox1 - 0.03, oz0 + 0.03, oz1 - 0.03, h + 0.1, h + 0.7, 0)])
    kit.add('plaster', par)
    trim(wb('off_roof_top', ox0 + 0.03, ox1 - 0.03, oz0 + 0.03, oz1 - 0.03, h + 0.12, h + 0.17, 0), 0xC3C1BA)
    iron(cyl('off_spout', ox0 - 0.05, oz1 - 0.3, h - 0.1, h + 0.25, 0.04, 0.04, 8), 0x55585C)
    panel_door(kit, b, 'W', oz0 + 2.15, oz0 + 3.15, 0.0, 2.05, depth=0.14)
    barred_window(kit, b, 'S', ox0 + 0.85, ox0 + 2.05, 1.05, 2.05)
    barred_window(kit, b, 'N', ox0 + 1.15, ox0 + 1.95, 1.15, 1.95, depth=0.1)
    # concrete door step, and a plank bench by the door
    trim(wb('off_step', ox0 - 0.7, ox0 - 0.05, oz0 + 2.05, oz0 + 3.25, 0, 0.12, 0.01), 0xB0AEA6)
    kit.add('wood', wb('off_bench', ox0 - 0.5, ox0 - 0.05, oz0 + 0.3, oz0 + 1.4, 0.4, 0.45, 0.01))
    for z in (oz0 + 0.4, oz0 + 1.3):
        kit.add('wood', wb('off_bench_leg', ox0 - 0.46, ox0 - 0.38, z, z + 0.07, 0, 0.4, 0.005))
    # electric meter box and conduit on the south face (wiring)
    kit.add('paint', wb('meter_box', ox0 + 0.25, ox0 + 0.6, oz1 + 0.0, oz1 + 0.12, 1.5, 1.95, 0.01), 0x6E7176)
    iron(limb('conduit', (ox0 + 0.42, oz1 + 0.05, 1.95), (ox0 + 0.42, oz1 + 0.05, h), 0.03), 0x4A4C50)
    # yard lamp on the office west wall, over the door (wiring)
    iron(limb('lamp_arm', (ox0 - 0.05, oz0 + 2.6, 2.4), (ox0 - 0.35, oz0 + 2.6, 2.4), 0.04), 0x2E3033)
    kit.add('paint', cyl('lamp_shade', ox0 - 0.4, oz0 + 2.6, 2.25, 2.4, 0.14, 0.05, 10), 0x2E3033)


def build_trough_and_pump():
    """Long cement water trough, middle; hand pump at the north end."""
    x0, x1, z0, z1 = 0.225, 1.425, 1.6, 7.1      # same 1.2 x 5.5 m trough, re-seated in the 75% yard
    tro = wb('water_trough', x0, x1, z0, z1, 0, 0.72, 0.015)
    cut(tro, [wb('water_cut', x0 + 0.13, x1 - 0.13, z0 + 0.13, z1 - 0.13, 0.14, 0.9, 0)])
    trim(tro, CEMENT)
    kit.add('paint', wb('water_surface', x0 + 0.14, x1 - 0.14, z0 + 0.14, z1 - 0.14, 0.52, 0.55, 0), 0x7C9FA0)
    trim(wb('trough_rim', x0 - 0.04, x1 + 0.04, z0 - 0.04, z1 + 0.04, 0.7, 0.75, 0.01), 0xB0ADA5)
    # cement base slab where the cattle stand to drink
    trim(wb('trough_slab', x0 - 0.7, x1 + 0.7, z0 - 0.6, z1 + 0.5, 0, 0.04, 0.01), 0xA8A59D)
    # hand pump on a small plinth at the north end: cast-iron body, spout, long handle, platform
    px, pz = (x0 + x1) / 2, z0 - 0.5
    trim(wb('pump_plinth', px - 0.4, px + 0.4, pz - 0.4, pz + 0.4, 0, 0.3, 0.015), 0xA6A39B)
    iron(cyl('pump_body', px, pz, 0.3, 0.95, 0.12, 0.09, 12), 0x3F4A52)
    iron(cyl('pump_head', px, pz, 0.95, 1.1, 0.14, 0.12, 12), 0x3F4A52)
    iron(limb('pump_spout', (px, pz, 0.78), (px, pz + 0.55, 0.7), 0.07, 0.07), 0x3F4A52)
    iron(limb('pump_handle', (px, pz - 0.7, 1.45), (px, pz + 0.05, 1.02), 0.04, 0.05), 0x2E3135)
    iron(limb('pump_pivot', (px - 0.1, pz - 0.02, 1.04), (px + 0.1, pz - 0.02, 1.04), 0.04), 0x2E3135)
    # a bucket under the spout
    iron(cyl('pump_bucket', px, pz + 0.55, 0.3, 0.58, 0.14, 0.17, 12), 0xA3A7AB)


def build_neem_platform():
    """Round brick platform for the neem (the tree is hers, left out). Brick ring, soil fill, cement lip."""
    cx, cz = 1.35, -2.4
    ringo = cyl('platform_ring', cx, cz, 0, 0.5, 2.3, 2.3, 28)
    cut(ringo, [cyl('platform_cut', cx, cz, 0.1, 0.7, 1.95, 1.95, 28)])
    brick(ringo)
    lip = cyl('platform_lip', cx, cz, 0.5, 0.56, 2.38, 2.38, 28)
    cut(lip, [cyl('platform_lip_cut', cx, cz, 0.4, 0.7, 1.9, 1.9, 28)])
    kit.add('trim', lip, COPING)
    kit.add('paint', cyl('platform_soil', cx, cz, 0.1, 0.42, 1.96, 1.96, 28), 0x4A3B2B)
    # exposed root-flare mound where the trunk goes
    kit.add('paint', cyl('platform_mound', cx, cz, 0.42, 0.52, 0.9, 0.55, 14), 0x4A3B2B)


def build_compost_and_biogas():
    """Front-left: compost pit (brick-walled, dark fill) and the round biogas dome with its gas pipe."""
    x0, x1, z0, z1 = -9.2, -4.4, 6.5, 9.9          # same 4.8 x 3.4 m pit, re-seated
    t = 0.3
    brick(wb('pit_n', x0, x1, z0, z0 + t, 0, 0.95, 0.01))
    brick(wb('pit_s', x0, x1, z1 - t, z1, 0, 0.95, 0.01))
    brick(wb('pit_w', x0, x0 + t, z0 + t, z1 - t, 0, 0.95, 0.01))
    brick(wb('pit_e', x1 - t, x1, z0 + t, z1 - t, 0, 0.95, 0.01))
    trim(wb('pit_cope_n', x0 - 0.04, x1 + 0.04, z0 - 0.04, z0 + t + 0.04, 0.95, 1.01, 0.008), COPING)
    trim(wb('pit_cope_s', x0 - 0.04, x1 + 0.04, z1 - t - 0.04, z1 + 0.04, 0.95, 1.01, 0.008), COPING)
    trim(wb('pit_cope_w', x0 - 0.04, x0 + t + 0.04, z0 + t, z1 - t, 0.95, 1.01, 0.008), COPING)
    trim(wb('pit_cope_e', x1 - t - 0.04, x1 + 0.04, z0 + t, z1 - t, 0.95, 1.01, 0.008), COPING)
    kit.add('paint', wb('pit_fill', x0 + t, x1 - t, z0 + t, z1 - t, 0.0, 0.7, 0), 0x2F2418)
    for i in range(5):    # crusted heap in the pit
        kit.add('paint', sphere('pit_heap', x0 + 1.0 + i * 0.75, z0 + 1.0 + (i % 2) * 0.5, 0.66, 0.5, 0.42, 0.14, 1), [0x3A2D1E, 0x2A2016, 0x45351F][i % 3])
    # biogas digester dome: low brick drum ring, pale-green rendered dome, inlet chamber + gas pipe
    cx, cz = -11.3, 8.2                            # same dome, against the west wall clear of the shed roof
    brick(cyl('dome_drum', cx, cz, 0, 0.55, 1.62, 1.62, 24))
    kit.add('plaster', lathe('dome', cx, cz, [(1.55, 0.55), (1.52, 0.75), (1.35, 1.05), (1.05, 1.32), (0.7, 1.5), (0.4, 1.58), (0.0, 1.6)], seg=24), 0xA5AE96)
    trim(cyl('dome_ring', cx, cz, 0.52, 0.62, 1.68, 1.68, 24), 0x9A9890)
    iron(cyl('gas_collar', cx, cz, 1.55, 1.78, 0.2, 0.17, 12), 0x5B5E62)
    trim(cyl('gas_cap', cx, cz, 1.78, 1.86, 0.25, 0.25, 12), 0x8E8D86)
    iron(limb('gas_pipe_up', (cx, cz, 1.8), (cx, cz, 2.3), 0.07), 0x6F7378)
    iron(limb('gas_pipe_run', (cx, cz, 2.3), (x0 + 0.5, cz + 0.4, 2.3), 0.06), 0x6F7378)
    iron(limb('gas_pipe_down', (x0 + 0.5, cz + 0.4, 2.3), (x0 + 0.5, cz + 0.4, 1.0), 0.06), 0x6F7378)
    # inlet chute from the pit to the dome
    brick(wb('inlet_wall', x0 - 0.9, x0, z0 + 1.0, z0 + 2.4, 0, 0.75, 0.01))
    kit.add('paint', wb('inlet_fill', x0 - 0.8, x0 - 0.05, z0 + 1.1, z0 + 2.3, 0.0, 0.55, 0), 0x33271B)


def build_chaff_cutter():
    """Electric chaff cutter against the east wall: blue steel body, feed table, big flywheel, motor on a base."""
    cx, cz = 10.95, -3.75
    base = wb('chaff_base', cx - 1.1, cx + 1.0, cz - 0.55, cz + 0.55, 0, 0.14, 0.01)
    trim(base, 0x7A7C80)
    kit.add('paint', wb('chaff_body', cx - 0.45, cx + 0.45, cz - 0.4, cz + 0.4, 0.14, 0.95, 0.02), 0x3A5E86)
    kit.add('paint', wb('chaff_mouth', cx - 0.9, cx - 0.4, cz - 0.28, cz + 0.28, 0.55, 0.75, 0.02), 0x2E4A6B)
    kit.add('paint', wb('chaff_table', cx - 1.8, cx - 0.9, cz - 0.3, cz + 0.3, 0.52, 0.58, 0.01), 0x6D7074)
    for dz in (-0.25, 0.25):
        iron(limb('chaff_table_leg', (cx - 1.7, cz + dz, 0), (cx - 1.7, cz + dz, 0.52), 0.05), 0x5A5D61)
    iron(ring('flywheel', cx + 0.0, cz + 0.52, 0.62, 0.34, 0.035, axis='z'), 0x2D3A4A)
    for k in range(6):
        a = k * math.pi / 3
        iron(limb('flywheel_spoke', (cx, cz + 0.52, 0.62), (cx + 0.32 * math.cos(a), cz + 0.52, 0.62 + 0.32 * math.sin(a)), 0.03), 0x2D3A4A)
    iron(cyl('chaff_motor', cx + 0.95, cz, 0.14, 0.62, 0.17, 0.17, 12), 0x3F6B52)
    iron(limb('chaff_belt_a', (cx + 0.34, cz + 0.55, 0.78), (cx + 0.9, cz + 0.55, 0.52), 0.04, 0.012), 0x1C1C1E)
    iron(limb('chaff_belt_b', (cx + 0.34, cz + 0.55, 0.46), (cx + 0.9, cz + 0.55, 0.42), 0.04, 0.012), 0x1C1C1E)
    kit.add('paint', wb('chaff_switch', cx + 1.05, cx + 1.3, cz + 0.65, cz + 0.8, 0.9, 1.2, 0.01), 0x6E7176)


def wheelbarrow(x, z, ang):
    ca, sa = math.cos(ang), math.sin(ang)

    def p(dx, dz, h):
        return (x + dx * ca - dz * sa, z + dx * sa + dz * ca, h)
    iron(limb('wb_tray', p(0, 0, 0.5), p(0.3, 0, 0.58), 0.55, 0.8), 0x4C5A66)
    iron(limb('wb_tray_in', p(0, 0, 0.62), p(0.3, 0, 0.64), 0.46, 0.7), 0x3A444D)
    iron(limb('wb_frame_l', p(-0.5, -0.24, 0.55), p(0.65, -0.18, 0.4), 0.04), 0x2E2E30)
    iron(limb('wb_frame_r', p(-0.5, 0.24, 0.55), p(0.65, 0.18, 0.4), 0.04), 0x2E2E30)
    iron(limb('wb_leg_l', p(-0.3, -0.22, 0.52), p(-0.35, -0.24, 0.0), 0.04), 0x2E2E30)
    iron(limb('wb_leg_r', p(-0.3, 0.22, 0.52), p(-0.35, 0.24, 0.0), 0.04), 0x2E2E30)
    iron(limb('wb_grip_l', p(-0.5, -0.24, 0.55), p(-0.8, -0.27, 0.62), 0.04), 0x222224)
    iron(limb('wb_grip_r', p(-0.5, 0.24, 0.55), p(-0.8, 0.27, 0.62), 0.04), 0x222224)
    # wheel: ring in the (forward, up) plane at the nose
    wx, wz = p(0.68, 0, 0)[0], p(0.68, 0, 0)[1]
    kit.add('paint', ring('wb_tyre', wx, wz, 0.19, 0.17, 0.045, axis='x' if abs(ca) < 0.5 else 'z'), 0x1B1B1D)


def build_clutter():
    wheelbarrow(-1.2, -8.4, 0.5)
    wheelbarrow(8.6, 2.9, -1.55)
    # dung-cake heaps: flat round hand-patted cakes in stacked layers
    for (cx, cz, n) in ((-2.0, -5.8, 3), (7.2, 8.3, 3), (-3.4, 9.3, 2)):
        for layer in range(n):
            for k in range(5 - layer * 2 if n == 3 else 3 - layer):
                a = k * 1.3 + layer
                r0 = 0.26 if k else 0.0
                kit.add('paint', cyl('dung', cx + r0 * math.cos(a) + rnd.uniform(-0.04, 0.04), cz + r0 * math.sin(a) + rnd.uniform(-0.04, 0.04),
                                     layer * 0.07, layer * 0.07 + 0.08, 0.15 + rnd.uniform(-0.02, 0.02), 0.14, 9), [0x5C4631, 0x4F3C29, 0x6A5239][(k + layer) % 3])
    # dung cakes drying flat on the east wall (a strip of discs along the base)
    for i in range(7):
        kit.add('paint', cyl('dung_wall', HX - T - 0.2 - (i % 2) * 0.05, -5.9 + 0.43 * i, 0.9 + 0.0, 0.97, 0.17, 0.16, 9), 0x5A4430)
    # buckets: galvanised, tapered, with rim + wire handle
    for (bx, bz, tilt) in ((11.2, 8.5, 0), (11.8, 8.1, 0), (11.4, 9.1, 0), (2.6, 7.0, 0), (-7.8, 2.25, 0)):
        iron(cyl('bucket', bx, bz, 0, 0.3, 0.14, 0.18, 12), 0x9FA3A7)
        iron(cyl('bucket_rim', bx, bz, 0.29, 0.32, 0.19, 0.19, 12), 0xB0B4B8)
        iron(limb('bucket_handle', (bx - 0.18, bz, 0.31), (bx + 0.18, bz, 0.31), 0.012, 0.012), 0x3A3C3E)
    # a wooden plank bench and a stack of empty feed sacks' worth of timber against the office-side wall
    kit.add('wood', wb('shed_bench', 6.75, 8.55, 6.45, 6.85, 0.38, 0.44, 0.01))
    for x in (6.9, 8.25):
        kit.add('wood', wb('shed_bench_leg', x, x + 0.08, 6.5, 6.8, 0, 0.38, 0.005))
    # fodder cart / charpai-style wooden manger standing in the yard: a rope cot on its side is hers; a hay-rake stays out
    # water drain gutter from the trough across the yard
    kit.add('paint', wb('drain', 0.95, 1.15, 7.6, HZ - 0.4, 0.0, 0.015, 0), 0x6F6A5E)


build_ground()
build_walls()
build_front()
build_shed()
build_straw_store()
build_office()
build_trough_and_pump()
build_neem_platform()
build_compost_and_biogas()
build_chaff_cutter()
build_clutter()

TINTS = {'hb_plaster': '#F6EBC6', 'hb_plinth': '#B9A98A', 'hb_trim': '#C9C6BE', 'hb_wood': '#6A4F3A',
         'hb_brick': '#94583F', 'hb_tin': '#C9CFD3', 'hb_metal': '#FFFFFF', 'hb_thatch': '#FFFFFF'}
kit.finalize(OUT, TINTS, drift={'hb_plaster': 0.04, 'hb_plinth': 0.05, 'hb_brick': 0.1, 'hb_trim': 0.05})
