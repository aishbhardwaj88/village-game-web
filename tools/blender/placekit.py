"""Small shared builders for the Places V1 scripts (used by build_tubewell/paani_tanki/dharam_kanta/akhada and later ones). Frame: wx east, wz south, h up."""
import math
from common import wb, limb, cyl, sphere
from arch import ring, lathe, STEEL, BRASS

CEMENT = 0xA9A69F
GREEN = 0x2E5E3A


def charpai(kit, cx, cz, ang=0.0, w=1.9, d=1.0):
    ca, sa = math.cos(ang), math.sin(ang)
    P = lambda u, v, h: (cx + u * ca - v * sa, cz + u * sa + v * ca, h)
    for u in (-w / 2 + 0.07, w / 2 - 0.07):
        for v in (-d / 2 + 0.07, d / 2 - 0.07):
            kit.add('wood', limb('cot_leg', P(u, v, 0), P(u, v, 0.4), 0.07))
    for v in (-d / 2 + 0.03, d / 2 - 0.03):
        kit.add('wood', limb('cot_rail', P(-w / 2, v, 0.4), P(w / 2, v, 0.4), 0.07, 0.07))
    for u in (-w / 2 + 0.03, w / 2 - 0.03):
        kit.add('wood', limb('cot_rail', P(u, -d / 2, 0.4), P(u, d / 2, 0.4), 0.07, 0.07))
    for k in range(8):
        v = -d / 2 + 0.1 + k * (d - 0.2) / 7
        kit.add('paint', limb('rope', P(-w / 2 + 0.05, v, 0.43), P(w / 2 - 0.05, v, 0.43), 0.03, 0.02), 0xB89A64)
    for k in range(12):
        u = -w / 2 + 0.1 + k * (w - 0.2) / 11
        kit.add('paint', limb('rope2', P(u, -d / 2 + 0.05, 0.45), P(u, d / 2 - 0.05, 0.45), 0.03, 0.02), 0xA88A58)


def hand_pump(kit, px, pz, col=GREEN, tub=True):
    if tub:
        kit.add('trim', wb('pump_slab', px - 1.0, px + 1.0, pz - 0.9, pz + 0.9, 0, 0.12, 0.01), CEMENT)
        kit.add('trim', wb('pump_tub', px - 0.2, px + 0.9, pz + 0.1, pz + 0.7, 0.12, 0.34, 0.01), 0xA09D95)
    kit.add('metal', cyl('pump_base', px - 0.5, pz - 0.2, 0.12, 0.5, 0.15, 0.12, 10), col)
    kit.add('metal', cyl('pump_col', px - 0.5, pz - 0.2, 0.5, 1.25, 0.08, 0.065, 10), col)
    kit.add('metal', limb('pump_handle', (px - 0.5, pz - 0.2, 1.18), (px - 1.0, pz - 0.2, 1.5), 0.05), col)
    kit.add('metal', limb('pump_spout', (px - 0.5, pz - 0.2, 0.9), (px - 0.1, pz - 0.2, 0.72), 0.06), col)


def brick_ring(kit, cx, cz, R, h0, h1, t=0.36, n=32, kind='brick'):
    for i in range(n):
        a0, a1 = i / n * math.tau, (i + 1) / n * math.tau
        kit.add(kind, limb('seg', (cx + R * math.cos(a0), cz + R * math.sin(a0), (h0 + h1) / 2), (cx + R * math.cos(a1), cz + R * math.sin(a1), (h0 + h1) / 2), t, h1 - h0))


def bench(kit, x0, x1, z, h=0.44, depth=0.4):
    kit.add('wood', wb('bench_seat', x0, x1, z - depth / 2, z + depth / 2, h - 0.05, h, 0.006))
    for x in (x0 + 0.15, x1 - 0.15):
        kit.add('wood', wb('bench_leg', x - 0.04, x + 0.04, z - depth / 2 + 0.04, z + depth / 2 - 0.04, 0, h - 0.05, 0.0))


def bucket(kit, x, z, c=0x9FA3A7, h=0.3):
    kit.add('metal', cyl('bucket', x, z, 0, h, 0.14, 0.18, 12), c)
    kit.add('metal', cyl('bucket_rim', x, z, h - 0.02, h + 0.02, 0.19, 0.19, 12), 0x7C8084)
    kit.add('metal', limb('bucket_handle', (x - 0.18, z, h + 0.01), (x + 0.18, z, h + 0.01), 0.012), 0x3A3C3E)


def pot(kit, x, z, h0=0.0, sc=1.0, col=0xB5693F):
    P = [(0.0, 0.0), (0.12, 0.0), (0.17, 0.03), (0.23, 0.13), (0.27, 0.27), (0.26, 0.38), (0.21, 0.49), (0.14, 0.57), (0.115, 0.61), (0.13, 0.65), (0.16, 0.675), (0.165, 0.69), (0.14, 0.695), (0.0, 0.69)]
    kit.add('paint', lathe('matka', x, z, [(r * sc, h0 + h * sc) for r, h in P], seg=18), col)


def brick_wall_run(kit, x0, z0, x1, z1, h=1.2, t=0.3, cope=True):
    if abs(x1 - x0) > abs(z1 - z0):
        kit.add('brick', wb('bw', min(x0, x1), max(x0, x1), z0 - t / 2, z0 + t / 2, 0, h, 0.0))
        if cope:
            kit.add('trim', wb('bw_cope', min(x0, x1) - 0.03, max(x0, x1) + 0.03, z0 - t / 2 - 0.04, z0 + t / 2 + 0.04, h, h + 0.08, 0.004), CEMENT)
    else:
        kit.add('brick', wb('bw', x0 - t / 2, x0 + t / 2, min(z0, z1), max(z0, z1), 0, h, 0.0))
        if cope:
            kit.add('trim', wb('bw_cope', x0 - t / 2 - 0.04, x0 + t / 2 + 0.04, min(z0, z1) - 0.03, max(z0, z1) + 0.03, h, h + 0.08, 0.004), CEMENT)
