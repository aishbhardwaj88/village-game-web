"""
Dharam kanta (truck weighbridge) - Blender model, unbranded. Run: tools/blender/make.sh dharam_kanta dharam_kanta
Searched first: Poly Haven (no weighbridge), Quaternius/Kenney/poly.pizza (none), so hand-built.
LOCAL frame anchored at world (194,92) = highway cluster (205,40) + (-11,52). Road at +X (cluster road x=0 -> local +11).
Deck platform 4 x 14 at local x 0, z 3 (-4..10); cabin 3 x 3 at (-5,-2) facing +x; display post at (-2.5,-2).
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import wb, limb, cyl, sphere, prism_x, boolean_cut, ROOT
from arch import Kit, sack, STEEL

OUT = os.path.join(ROOT, 'tmp', 'dharam_kanta_raw.glb')
kit = Kit(split_props=True, wood_slot='brick')
rnd = random.Random(52)
RED, WHITE, YEL, DARK = 0xB3322B, 0xE6E1D3, 0xE0B53A, 0x25231F


def deck():
    # concrete pit surround and approach ramps, steel deck with chequer ribs, side rails, load-cell covers
    kit.add('concrete', wb('pit_rim', -2.2, 2.2, -4.2, 10.2, 0, 0.16, 0.02))
    kit.add('concrete', wb('ramp_n', -2.2, 2.2, -6.2, -4.2, 0, 0.16, 0.04))
    kit.add('concrete', wb('ramp_s', -2.2, 2.2, 10.2, 12.2, 0, 0.16, 0.04))
    kit.add('paint', wb('deck', -1.8, 1.8, -4.0, 10.0, 0.1, 0.24, 0.01), 0x6C7176)
    for i in range(0, 29):
        z = -3.9 + i * 0.5
        kit.add('paint', wb('rib', -1.75, 1.75, z, z + 0.08, 0.24, 0.27, 0.004), 0x575C61)
    for sx in (-1, 1):
        kit.add('paint', wb('edge_angle', sx * 1.8 - 0.05, sx * 1.8 + 0.05, -4.0, 10.0, 0.1, 0.3, 0.004), YEL)
    for z in (-2.0, 3.0, 8.0):
        kit.add('paint', wb('cell_cover', -2.0, -1.8, z - 0.25, z + 0.25, 0.1, 0.2, 0.01), 0x2B2D2F)
        kit.add('paint', wb('cell_cover', 1.8, 2.0, z - 0.25, z + 0.25, 0.1, 0.2, 0.01), 0x2B2D2F)
    # centre wheel-guide marks and entry arrow chevrons
    for z in (-5.5, 11.0):
        kit.add('paint', wb('chev', -0.9, 0.9, z, z + 0.25, 0.16, 0.165, 0), WHITE)
    # yellow-black kerb stones either side of the entry
    for z in (-6.2, 12.0):
        for sx in (-1, 1):
            kit.add('paint', wb('bollard', sx * 2.5 - 0.12, sx * 2.5 + 0.12, z - 0.12, z + 0.12, 0, 0.8, 0.02), YEL)
            kit.add('paint', wb('bollard_band', sx * 2.5 - 0.125, sx * 2.5 + 0.125, z - 0.125, z + 0.125, 0.3, 0.5, 0.01), DARK)


def cabin():
    x0, x1, z0, z1, h = -6.5, -3.5, -3.5, -0.5, 2.8
    wall = wb('cabin', x0, x1, z0, z1, 0, h, 0.015)
    boolean_cut(wall, wb('c', x1 - 0.3, x1 + 0.1, z0 + 0.4, z0 + 1.2, 0, 2.1, 0), apply_mod=True)   # door (platform side +x)
    boolean_cut(wall, wb('c', x1 - 0.3, x1 + 0.1, z0 + 1.55, z0 + 2.7, 1.0, 2.0, 0), apply_mod=True)  # counter window to the driver's side
    kit.add('plaster', wall)
    kit.add('plinth', wb('plinth', x0 - 0.02, x1 + 0.02, z0 - 0.02, z1 + 0.02, 0, 0.5, 0.008))
    kit.add('trim', wb('slab', x0 - 0.35, x1 + 0.35, z0 - 0.35, z1 + 0.35, h, h + 0.2, 0.015))
    kit.add('trim', wb('parapet', x0 - 0.3, x0 - 0.1, z0 - 0.3, z1 + 0.3, h + 0.2, h + 0.55, 0.01))
    # door: recess, panels, handle, frame
    kit.add('paint', wb('door_recess', x1 - 0.25, x1 - 0.1, z0 + 0.45, z0 + 1.15, 0, 2.05, 0), 0x1D1A17)
    kit.add('wood', wb('door', x1 - 0.2, x1 - 0.12, z0 + 0.48, z0 + 1.12, 0, 2.02, 0.005))
    for a, b in ((0.08, 0.9), (1.05, 1.9)):
        kit.add('paint', wb('panel', x1 - 0.12, x1 - 0.09, z0 + 0.55, z0 + 1.05, a, b, 0.004), 0x6A4A2E)
    kit.add('paint', wb('handle', x1 - 0.1, x1 - 0.03, z0 + 1.03, z0 + 1.07, 0.95, 1.05, 0.004), STEEL)
    for zz in (z0 + 0.4, z0 + 1.2):
        kit.add('paint', wb('frame', x1 - 0.12, x1 + 0.02, zz - 0.04, zz + 0.04, 0, 2.1, 0.004), 0x4A3524)
    kit.add('paint', wb('frame', x1 - 0.12, x1 + 0.02, z0 + 0.4, z0 + 1.2, 2.06, 2.14, 0.004), 0x4A3524)
    # counter window with iron grille, sill and a wooden counter shelf
    kit.add('paint', wb('win_recess', x1 - 0.28, x1 - 0.12, z0 + 1.55, z0 + 2.7, 1.0, 2.0, 0), 0x1D1A17)
    for zz in [z0 + 1.65 + i * 0.19 for i in range(6)]:
        kit.add('paint', wb('bar', x1 - 0.05, x1 - 0.02, zz - 0.015, zz + 0.015, 1.0, 2.0, 0), 0x2A2A28)
    kit.add('paint', wb('sill', x1 - 0.1, x1 + 0.12, z0 + 1.45, z0 + 2.8, 0.94, 1.0, 0.006), WHITE)
    kit.add('wood', wb('counter', x1, x1 + 0.35, z0 + 1.45, z0 + 2.8, 0.9, 0.96, 0.008))
    for zz in (z0 + 1.5, z0 + 2.75):
        kit.add('paint', wb('counter_leg', x1 + 0.02, x1 + 0.3, zz - 0.03, zz + 0.03, 0, 0.9, 0.004), 0x4A4A46)
    # roof water tank and a small ledger/ticket rack on the counter
    kit.add('paint', cyl('tank', x0 + 0.9, (z0 + z1) / 2, h + 0.2, h + 1.2, 0.5, 0.46, 18), 0x24262A)
    kit.add('paint', wb('ledger', x1 + 0.05, x1 + 0.3, z0 + 1.7, z0 + 2.1, 0.96, 0.99, 0.004), 0x8A2A22)


def display_post():
    x, z = -2.6, -2.0
    kit.add('paint', wb('post', x - 0.07, x + 0.07, z - 0.07, z + 0.07, 0, 1.9, 0.01), 0x4A4A46)
    kit.add('paint', wb('housing', x - 0.12, x + 0.5, z - 0.5, z + 0.5, 1.9, 2.5, 0.02), DARK)
    kit.add('paint', wb('led_face', x + 0.5, x + 0.53, z - 0.42, z + 0.42, 2.0, 2.4, 0), 0x1B2A24)
    for i in range(5):
        zz = z - 0.35 + i * 0.15
        kit.add('paint', wb('digit', x + 0.53, x + 0.55, zz, zz + 0.1, 2.12, 2.28, 0), 0xE04A3A)
    kit.add('paint', wb('hood', x - 0.15, x + 0.62, z - 0.55, z + 0.55, 2.5, 2.56, 0.01), 0x3A3A36)


def goods():
    # grain sacks on pallets beside the cabin, a loading platform (raised dock) with sacks, a hand trolley
    for i in range(3):
        kit.add('wood', wb('pallet', -7.5 + i * 1.3, -6.4 + i * 1.3, 2.0, 3.2, 0, 0.14, 0.006))
        for j in range(8):
            ang = rnd.uniform(-0.15, 0.15)
            sack(kit, -7.0 + i * 1.3 + (j % 2) * 0.25 - 0.1, 2.6 + (j % 2) * 0.1, 0.14 + (j // 2) * 0.28, ang, (0xD9C58A, 0xE6DCC0, 0xD9C58A)[i], 0.5, 0.34, 0.3)
    kit.add('concrete', wb('dock', -8.5, -4.6, 5.0, 8.0, 0, 0.9, 0.03))
    kit.add('paint', wb('dock_edge', -8.5, -4.6, 7.98, 8.04, 0.8, 0.9, 0), YEL)
    kit.add('concrete', wb('dock_step', -4.6, -3.8, 5.6, 7.4, 0, 0.45, 0.02))
    for k in range(6):
        sack(kit, -8.0 + (k % 3) * 0.7, 5.6 + (k // 3) * 0.55, 0.9, rnd.uniform(-0.2, 0.2), 0xF3EFE2, 0.55, 0.34, 0.34)
    # tin canopy over the dock on two posts
    for x in (-8.3, -4.9):
        kit.add('wood', limb('dock_post', (x, 7.8, 0.0), (x, 7.8, 2.6), 0.1, 0.1))
    kit.add('tin', prism_x('dock_roof', -8.8, -4.4, [(4.7, 3.1), (8.2, 2.5), (8.2, 2.57), (4.7, 3.17)]))
    # stop-barrier pole at the entry (red/white) and a painted weight-limit post
    kit.add('paint', wb('barrier_post', 3.0, 3.2, -6.5, -6.3, 0, 1.1, 0.01), WHITE)
    for i in range(6):
        kit.add('paint', limb('barrier', (3.1, -6.4 + i * 0.0, 1.0), (3.1, -6.4 + 0.0, 1.0), 0.01, 0.01), WHITE) if False else None
    for i in range(6):
        z0 = -6.4 + i * 0.0
    kit.add('paint', wb('arm', 3.05, 3.15, -9.4, -6.4, 0.98, 1.06, 0.01), WHITE)
    for i in range(5):
        kit.add('paint', wb('arm_stripe', 3.04, 3.16, -9.2 + i * 0.6, -8.95 + i * 0.6, 0.98, 1.06, 0), RED)
    kit.add('paint', wb('sign_post', -3.2, -3.1, -7.0, -6.9, 0, 2.2, 0.01), 0x4A4A46)
    kit.add('paint', wb('sign_face', -3.25, -3.05, -7.4, -6.5, 1.6, 2.2, 0.01), WHITE)
    kit.add('paint', wb('sign_ring', -3.26, -3.04, -7.3, -6.6, 1.7, 2.1, 0), RED)
    kit.add('paint', wb('sign_inner', -3.27, -3.03, -7.22, -6.68, 1.78, 2.02, 0), WHITE)


deck()
cabin()
display_post()
goods()
TINTS = {'hb_plaster': '#DCD2B8', 'hb_plinth': '#B8A58A', 'hb_trim': '#C9C2B0', 'hb_concrete': '#9A978E', 'hb_wood': '#B08A5C'}
kit.finalize(OUT, TINTS, drift_amp=0.05, ao_strength=0.45)
