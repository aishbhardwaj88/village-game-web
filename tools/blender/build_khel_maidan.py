"""
Khel maidan - arch.py Kit, to Places V1/khel_maidan/LAYOUT.md (DRY version) + MAIN_khel_maidan_views.png. Run: tools/blender/make.sh khel_maidan khel_maidan_v2
Frame: site-local metres, +z south = front. Flat uneven dry sun-baked block 70 x 50 m: x[-35,35] z[-25,25], a few worn bare patches (no puddle, no wet mud; grass patches are hers).
LEFT: cricket pitch strip 20 x 3 m (bare, hard, lighter) with wooden stumps at both ends (one set pulled out and lying), chalk creases, an old bat + tennis ball.
RIGHT FRONT: volleyball court 18 x 9 m, lime lines, bamboo poles + guy ropes, saggy net, NET EXACTLY ON THE CENTRE LINE. RIGHT BACK: kabaddi court 13 x 10 m in faded chalk with a centre line.
Back-left: the neem is hers (a round platform is left empty) with a bamboo pole carrying a bare bulb + wire for evening games. Front edge seating: bricks on end, tractor tyre, broken plastic chair, bench.
Gilli-danda, lime bucket, clay pot on a brick.
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import wb, limb, cyl, sphere, quad, join_objects, ROOT
from arch import Kit, ring, decal_material, plastic_chair, STEEL
import placekit as pk

OUT = os.path.join(ROOT, 'tmp', 'khel_maidan_v2_raw.glb')
kit = Kit(split_props=False, own=('metal',), wood_slot='props')
add = kit.add
rnd = random.Random(67)


def net_px(u, v):
    x, y = u * 90.0, v * 10.0
    fx, fy = x - math.floor(x), y - math.floor(y)
    return (0.07, 0.06, 0.05, 0.95) if (fx < 0.12 or fy < 0.14) else None


nmat = decal_material('hb_net', (512, 64), net_px)
add('paint', wb('ground', -35, 35, -25, 25, -0.08, 0.03, 0.0), 0xCDB283)
for (x, z, w, d, c) in ((-10, 5, 22, 16, 0xC4A878), (20, -10, 18, 10, 0xD2B88C), (8, 15, 26, 8, 0xC8AC7C), (-24, -14, 14, 10, 0xC1A476), (26, 12, 14, 12, 0xCDB283)):
    add('paint', wb('tone', x - w / 2, x + w / 2, z - d / 2, z + d / 2, 0.03, 0.036, 0.0), c)
for (x, z, r) in ((-5, -8, 1.8), (12, 6, 2.0), (-28, 4, 1.4)):
    add('paint', cyl('dung_patch', x, z, 0.036, 0.04, r, r * 0.8, 10), 0x8E7352)
# cricket pitch left: 20 x 3 bare lighter strip along z, creases, stumps (3 at each end, one set pulled out), bat + ball
px, pz0, pz1 = -26.0, -10.0, 10.0
add('paint', wb('pitch', px - 1.5, px + 1.5, pz0, pz1, 0.036, 0.044, 0.0), 0xDCC79F)
for z in (pz0 + 1.2, pz1 - 1.2):
    pk.lime_line(kit, px - 1.4, z, px + 1.4, z, rnd, h=0.05)          # popping creases
for z in (pz0 + 0.1, pz1 - 0.1):
    pk.lime_line(kit, px - 0.7, z, px + 0.7, z, rnd, h=0.05)
for dx in (-1.4, 1.4):
    pk.lime_line(kit, px + dx, pz0 + 1.2, px + dx, pz1 - 1.2, rnd, h=0.05)
for k, dx in enumerate((-0.11, 0.0, 0.11)):
    add('wood', limb('stump', (px + dx, pz0 + 0.1, 0.0), (px + dx, pz0 + 0.1, 0.72), 0.04))
for zi in (pz0 + 0.1,):
    add('wood', limb('bail', (px - 0.1, zi, 0.73), (px, zi, 0.73), 0.025))
    add('wood', limb('bail', (px, zi, 0.73), (px + 0.1, zi, 0.73), 0.025))
for k, dx in enumerate((-0.11, 0.0, 0.11)):          # the pulled-out set lying down at the other end
    add('wood', limb('stump_down', (px + dx + 0.5, pz1 - 0.6 + k * 0.1, 0.04), (px + dx + 1.1, pz1 - 0.2 + k * 0.1 - 0.4, 0.04), 0.04))
add('wood', limb('bat', (px + 2.4, pz0 + 3.0, 0.03), (px + 2.9, pz0 + 3.7, 0.05), 0.09, 0.03))
add('wood', limb('bat_handle', (px + 2.9, pz0 + 3.7, 0.05), (px + 3.15, pz0 + 4.05, 0.05), 0.04, 0.04), 0x4A3A2A)
add('paint', sphere('ball', px + 0.8, 0.5, 0.032, 0.032, 0.032, 0.032, 1), 0xC9D94A)
# volleyball court right front: 18 x 9, net on the centre line
vx, vz = 17.0, 12.0
for (a, b) in (((-9, -4.5), (9, -4.5)), ((-9, 4.5), (9, 4.5)), ((-9, -4.5), (-9, 4.5)), ((9, -4.5), (9, 4.5)), ((0, -4.5), (0, 4.5)), ((-3, -4.5), (-3, 4.5)), ((3, -4.5), (3, 4.5))):
    pk.lime_line(kit, vx + a[0], vz + a[1], vx + b[0], vz + b[1], rnd)
PZ = 5.25
for sg in (-1, 1):
    z = vz + sg * PZ
    add('wood', limb('pole', (vx, z, 0), (vx + 0.04, z, 2.62), 0.075, 0.06))
    for dx in (-1.0, 1.0):
        peg = (vx + dx * 2.0, z + sg * 1.6)
        add('paint', limb('guy', (vx + 0.04, z, 2.45), (peg[0], peg[1], 0.05), 0.012, 0.012), 0xB89A64)
        add('wood', limb('peg', (peg[0], peg[1], 0.0), (peg[0], peg[1], 0.22), 0.04))
nn = 10
sag = lambda z: -0.09 * (1 - ((z - vz) / PZ) ** 2)
for k in range(nn):
    za, zb = vz - PZ + 0.05 + (2 * PZ - 0.1) * k / nn, vz - PZ + 0.05 + (2 * PZ - 0.1) * (k + 1) / nn
    for flip in (False, True):
        pts = [(vx, za, 1.4 + sag(za)), (vx, zb, 1.4 + sag(zb)), (vx, zb, 2.4 + sag(zb)), (vx, za, 2.4 + sag(za))]
        o = quad('net', list(reversed(pts)) if flip else pts)
        uvl = o.data.uv_layers.new(name='UVMap')
        for loop in o.data.loops:
            co = o.data.vertices[loop.vertex_index].co
            uvl.data[loop.index].uv = ((-co.y - (vz - PZ)) / (2 * PZ), co.z - 1.4 + 0.09)
        o.data.materials.append(nmat)
        kit.extra.append(o)
    add('paint', limb('tape', (vx, za, 2.4 + sag(za)), (vx, zb, 2.4 + sag(zb)), 0.06, 0.05), 0xEFEDE6)
# kabaddi court right back: 13 x 10 faded chalk, centre line + bonus/baulk lines
kx, kz = 17.0, -14.0
for (a, b) in (((-6.5, -5), (6.5, -5)), ((-6.5, 5), (6.5, 5)), ((-6.5, -5), (-6.5, 5)), ((6.5, -5), (6.5, 5)), ((0, -5), (0, 5)), ((-5.5, -5), (-5.5, 5)), ((5.5, -5), (5.5, 5)), ((-2.5, -5), (-2.5, 5)), ((2.5, -5), (2.5, 5))):
    pk.lime_line(kit, kx + a[0], kz + a[1], kx + b[0], kz + b[1], rnd, col=0xD9D5C6, fade=0.4)
# neem platform back-left (empty), bamboo pole with a bare bulb + wire
pk.brick_ring(kit, -26.0, -18.5, 1.9, 0, 0.35, 0.34, 24)
add('paint', cyl('neem_soil', -26.0, -18.5, 0.0, 0.3, 1.7, 1.7, 24), 0x4A3524)
bx, bz = -10.0, -20.0
add('wood', limb('bulb_pole', (bx, bz, 0), (bx + 0.06, bz, 6.2), 0.12, 0.08))
for k in range(5):
    add('wood', limb('pole_node', (bx + 0.01 * k, bz, 1.1 * k + 0.4), (bx + 0.01 * k, bz, 1.1 * k + 0.45), 0.14))
add('metal', limb('bulb_arm', (bx + 0.06, bz, 6.0), (bx + 0.4, bz, 5.9), 0.04), 0x4A4C50)
add('paint', sphere('bulb', bx + 0.45, bz, 5.75, 0.09, 0.09, 0.12, 1), 0xF4E9B0)
add('metal', limb('wire', (bx + 0.06, bz, 5.6), (bx + 8.0, bz + 1.0, 4.4), 0.012, 0.012), 0x1B1B1D)
# front-edge seating: bricks on end, tractor tyre, broken plastic chair, bench
for k in range(5):
    add('brick', wb('brick_seat', -12.0 + k * 0.45, -12.0 + k * 0.45 + 0.11, 21.0, 21.23, 0.0, 0.23, 0.003), 0xB5603C)
add('paint', ring('tractor_tyre', -6.0, 21.5, 0.55, 0.55, 0.28, axis='y'), 0x1B1B1D)
add('paint', ring('tractor_tyre2', -2.5, 22.2, 0.3, 0.5, 0.25, axis='y'), 0x222224)
plastic_chair(kit, 2.0, 21.5, 0.4, 0x9A2E2E)
pk.bench(kit, 5.0, 7.2, 21.8, 0.44, 0.4)
pk.bucket(kit, 10.5, 21.2, 0x9FA3A7)
add('paint', cyl('lime', 10.5, 21.2, 0.26, 0.29, 0.17, 0.17, 12), 0xEEEDE6)
add('brick', wb('pot_brick', 12.0, 12.4, 21.0, 21.25, 0, 0.12, 0.004), 0xB5603C)
pk.pot(kit, 12.2, 21.12, 0.12, 0.7)
add('wood', limb('danda', (13.5, 21.4, 0.03), (14.4, 21.7, 0.03), 0.04))
add('wood', limb('gilli', (14.6, 21.3, 0.03), (14.75, 21.35, 0.03), 0.03))

TINTS = {'hb_plaster': '#FFFFFF', 'hb_trim': '#C9C6BE', 'hb_wood': '#8A6A48', 'hb_brick': '#FFFFFF', 'hb_metal': '#FFFFFF'}
if len(kit.extra) > 1:
    kit.extra[:] = [join_objects(kit.extra, 'decals')]
kit.finalize(OUT, TINTS, drift={'hb_brick': 0.1})
