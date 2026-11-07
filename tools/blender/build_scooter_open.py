"""
Open scooter family (VILLAGE_VOCABULARY.md section 13: "a Bajaj scooter under a cover; a Rajdoot"), 7 Nov.
The covered scooter and the roadster motorcycle already exist (build_scooter.py). This is the missing UNCOVERED one:
a generic 1980s-90s Indian geared step-through scooter, the shape everyone's uncle rode. No brand, no badge, no lettering,
blank number plates.

  scooter_open_v2   : faded blue, on its centre stand, bar straight, one mirror, spare wheel on a bracket behind the tail.
  scooter_open_v2_b : faded green, bar turned to the left, two mirrors, tan cloth seat cover, rear carrier, saree guard.

Modelled, not painted: the bulbous rear body with two side cowls (lofted), a panel seam at each cowl's front edge, louvres
on the engine-side cowl, a chrome trim strip along each cowl, a curved legshield (concave toward the rider) with a rolled
edge, the horn cover ('tie') over the steering column, the handlebar casting with the headlamp in it and the speedo on top,
pressed-steel split-rim 10 inch wheels with modelled tread, the bulbous front mudguard on a single-sided leading link,
floorboard runners, centre stand, kick lever, silencer, engine case.

FACING: front toward +Z (glTF/three.js). Origin on the ground midway between the axles. Wheels touch y=0.
Meshes: hb_metal (painted and bright steel, shared 'metal' set, repeat 1.0) and hb_main (rubber, seat, lenses: the shared
plaster set, repeat 0.5). Two draw calls. No new material values: the same Kit routing build_scooter.py uses.

Run (from the repo root):
  ~/Applications/Blender.app/Contents/MacOS/Blender -b --python tools/blender/build_scooter_open.py [-- render]
  for s in scooter_open_v2 scooter_open_v2_b; do
    node tools/shrink.js tmp/${s}_raw.glb public/assets/models/$s.glb 999999
    node tools/strip-textures.mjs --relink public/assets/models/$s.glb public/assets/models/$s.glb
  done
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from mathutils import Vector, Matrix
from common import limb, wb
import build_scooter as bs                      # helpers + the weathering colorize hook (installed on import)
from build_scooter import (rev, tube, polytube, loft, fender, small_wheel, new_kit, Adder, tri_count, render,
                           S_FZ, S_RZ, S_HY, CHROME, RUBBER, FRAME_BLACK, ALLOY)

ROOT = bs.ROOT

# rear body: wz, half width at the cowls, bottom height, top height (seat base)
BODY = [(0.02, 0.09, 0.235, 0.32), (-0.08, 0.13, 0.235, 0.50), (-0.18, 0.20, 0.25, 0.63), (-0.32, 0.29, 0.27, 0.68),
        (-0.50, 0.33, 0.28, 0.70), (-0.68, 0.32, 0.29, 0.695), (-0.82, 0.26, 0.31, 0.67), (-0.93, 0.16, 0.36, 0.62),
        (-0.99, 0.06, 0.43, 0.56)]


def body_at(wz):
    for k in range(len(BODY) - 1):
        a, b = BODY[k], BODY[k + 1]
        if a[0] >= wz >= b[0]:
            f = (a[0] - wz) / (a[0] - b[0])
            f = f * f * (3 - 2 * f)
            return [a[i] + (b[i] - a[i]) * f for i in (1, 2, 3)]
    return list(BODY[0][1:] if wz > BODY[0][0] else BODY[-1][1:])


def body_pt(wz, a):
    """a: angle round the section, 0 = top, pi/2 = right (+wx). Top is pinched (seat spine), widest a little below mid."""
    W, Hb, T = body_at(wz)
    s, c = math.sin(a), math.cos(a)
    mid, R = (Hb + T) / 2 - 0.02, (T - Hb) / 2
    x = W * math.copysign(abs(s) ** 0.6, s) * (1 - 0.32 * max(0.0, c) ** 1.5)
    h = mid + (R + (0.02 if c > 0 else -0.02)) * math.copysign(abs(c) ** 0.7, c)
    return (x, wz, h)


def surf_x(wz, h, side):
    """Outer x of the body at (wz, h) on one side, by a coarse search round the section."""
    best, bx = 9.0, 0.0
    for i in range(1, 60):
        a = i / 60 * math.pi
        p = body_pt(wz, a)
        if abs(p[2] - h) < best:
            best, bx = abs(p[2] - h), p[0]
    return side * bx


def shield_wz(h, u):
    """Legshield sheet: u -1..1 across; leans back toward the rider going up, edges wrap back (concave toward the rider)."""
    t = (h - 0.235) / 0.71
    return 0.445 - 0.12 * t ** 1.2 - 0.085 * u * u


def shield_w(h):
    t = (h - 0.235) / 0.71
    return 0.20 + 0.10 * math.sin(min(1.0, t * 1.35) * math.pi * 0.5) - 0.17 * max(0.0, (t - 0.80) / 0.20) ** 1.6


def build_open(variant):
    kit = new_kit()
    A = Adder(kit)
    paint = 0x5d7891 if variant == 'a' else 0x6b8a73
    bright = 0x8e8f8a

    # ---------------- front assembly (rotates with the bar on B): wheel, link fork, mudguard, column, headset
    n0 = len(kit.records)
    small_wheel(A, S_FZ, 1, paint, 0.7 if variant == 'a' else 2.1)
    A.S(tube('fork', (-0.085, 0.47, 0.56), (-0.085, 0.53, 0.30), 0.024, 8, caps=True), paint)
    A.S(limb('link', (-0.085, 0.53, 0.30), (-0.080, S_FZ, S_HY), 0.035, 0.05), paint)
    A.S(tube('damper', (-0.10, 0.58, 0.25), (-0.10, 0.49, 0.47), 0.016, 6, caps=True), FRAME_BLACK)
    A.S(tube('hub_cap', (-0.07, S_FZ, S_HY), (-0.11, S_FZ, S_HY), 0.045, 10, caps=True), 0x7d7c76, 'chrome')
    A.S(tube('yoke', (0.0, 0.47, 0.56), (-0.09, 0.47, 0.56), 0.022, 6, caps=True), FRAME_BLACK)
    guard_prof = [(-0.118, -0.050), (-0.112, -0.012), (-0.085, 0.010), (-0.04, 0.020), (0.0, 0.023),
                  (0.04, 0.020), (0.085, 0.010), (0.112, -0.012), (0.118, -0.050)]
    A.S(fender('guard_f', S_FZ, S_HY, 0.245, 22, 158, 12, guard_prof), paint)
    A.S(tube('guard_crest', (0.0, S_FZ + 0.25 * math.cos(math.radians(28)), S_HY + 0.27 * math.sin(math.radians(28))),
             (0.0, S_FZ + 0.25 * math.cos(math.radians(72)), S_HY + 0.27 * math.sin(math.radians(72))), 0.008, 4), CHROME, 'chrome')
    COL_B, COL_T = (0.0, 0.47, 0.56), (0.0, 0.365, 0.97)
    A.S(tube('column', COL_B, COL_T, 0.024, 6), FRAME_BLACK)
    # handlebar casting: a lozenge across the bar, headlamp set in its nose, speedo on top
    HC = (0.0, 0.36, 1.0)
    A.S(rev('casting', (-0.25, HC[1], HC[2]), (0.25, HC[1], HC[2]),
            [(0.0, 0.026), (0.25, 0.034), (0.40, 0.052), (0.5, 0.075), (0.60, 0.052), (0.75, 0.034), (1.0, 0.026)], seg=10), paint)
    A.S(rev('lamp_pod', (0.0, HC[1] - 0.02, HC[2] - 0.005), (0.0, HC[1] + 0.085, HC[2] - 0.005),
            [(0.0, 0.07), (0.6, 0.082), (1.0, 0.084)], seg=12), paint)
    A.S(bs.arch.ring('lamp_rim', 0.0, HC[1] + 0.088, HC[2] - 0.005, 0.078, 0.008, axis='z', seg=12, tube=3), CHROME, 'chrome')
    A.R(rev('lens', (0.0, HC[1] + 0.084, HC[2] - 0.005), (0.0, HC[1] + 0.104, HC[2] - 0.005), [(0, 0.074), (1.0, 0.04)], seg=12), 0xb4b0a0, 'rubber')
    A.S(rev('speedo', (0.0, HC[1] - 0.03, HC[2] + 0.04), (0.0, HC[1] - 0.04, HC[2] + 0.075), [(0, 0.042), (1, 0.046)], seg=8), FRAME_BLACK)
    A.R(tube('dial', (0.0, HC[1] - 0.04, HC[2] + 0.076), (0.0, HC[1] - 0.042, HC[2] + 0.080), 0.04, 8, caps=True), 0x6e6c62, 'rubber')
    for s in (-1, 1):
        g0, g1 = (s * 0.25, HC[1], HC[2]), (s * 0.37, HC[1] - 0.01, HC[2] + 0.005)
        A.R(tube('grip', g0, g1, 0.018, 6, caps=True), 0x35302b)
        A.S(polytube('lever', [(s * 0.21, HC[1] + 0.03, HC[2] + 0.01), (s * 0.29, HC[1] + 0.075, HC[2] + 0.012),
                               (s * 0.35, HC[1] + 0.06, HC[2] + 0.012)], 0.006, 4), CHROME, 'chrome')
        if s == -1 or variant == 'b':
            m0, m1 = (s * 0.20, HC[1] - 0.01, HC[2] + 0.03), (s * 0.27, HC[1] - 0.05, HC[2] + 0.22)
            A.S(tube('mirror_stalk', m0, m1, 0.006, 4), CHROME, 'chrome')
            A.S(rev('mirror', (m1[0], m1[1] - 0.008, m1[2] + 0.035), (m1[0], m1[1] + 0.012, m1[2] + 0.035),
                    [(0, 0.05), (1, 0.043)], seg=7), CHROME, 'chrome')
    A.S(polytube('cable', [(0.12, HC[1] - 0.03, HC[2] - 0.02), (0.08, 0.33, 0.90), (0.03, 0.36, 0.80)], 0.006, 4), FRAME_BLACK)
    front = [r[1] for r in kit.records[n0:]]

    # ---------------- legshield: curved sheet, rolled edge round it, horn cover over the column
    NH, NU = 9, 10
    rows = []
    for i in range(NH + 1):
        h = 0.235 + 0.71 * i / NH
        w = shield_w(h)
        rows.append([(w * (2 * j / NU - 1), shield_wz(h, 2 * j / NU - 1), h) for j in range(NU + 1)])
    A.S(loft('legshield', rows, closed=False, caps=False), paint)
    edge = [(-shield_w(0.235) - 0.004, shield_wz(0.235, -1), 0.235)]
    edge += [(-shield_w(h) - 0.004, shield_wz(h, -1), h) for h in [0.235 + 0.71 * i / NH for i in range(1, NH + 1)]]
    edge += [(w_, shield_wz(0.945, w_ / max(1e-3, shield_w(0.945))), 0.948) for w_ in (-0.06, 0.0, 0.06)]
    edge += [(shield_w(h) + 0.004, shield_wz(h, 1), h) for h in [0.235 + 0.71 * i / NH for i in range(NH, -1, -1)]]
    A.S(polytube('shield_edge', edge, 0.011, 5), bright, 'chrome')
    horn = []
    for i in range(8):
        h = 0.50 + 0.43 * i / 7
        w = 0.035 + 0.035 * (i / 7)
        cz = shield_wz(h, 0.0)
        horn.append([(w * math.cos(a), cz + (0.07 - 0.02 * i / 7) * math.sin(a) - 0.004, h)
                     for a in [math.pi * (1 - k / 6) for k in range(7)]])
    A.S(loft('horn_cover', horn, closed=False, caps=False), paint)
    for k in range(4):                                     # modelled grille slots in the horn cover
        h = 0.62 + 0.035 * k
        cz = shield_wz(h, 0.0) + 0.072 - 0.02 * (h - 0.50) / 0.43
        A.S(limb('horn_slot', (-0.03, cz, h), (0.03, cz, h), 0.010, 0.008), FRAME_BLACK)

    # ---------------- floorboard, runners, chrome edge strips, centre stand
    A.S(wb('floor', -0.175, 0.175, -0.14, 0.43, 0.17, 0.235, 0.012), paint)
    for k in range(5):
        x = -0.12 + k * 0.06
        A.R(limb('runner', (x, -0.10, 0.243), (x, 0.39, 0.243), 0.022, 0.014), 0x34312d)
    for s in (-1, 1):
        A.S(limb('edge', (s * 0.178, -0.14, 0.215), (s * 0.178, 0.43, 0.215), 0.010, 0.022), CHROME, 'chrome')
        A.S(tube('stand', (s * 0.12, -0.08, 0.17), (s * 0.165, -0.17, 0.012), 0.012, 6), FRAME_BLACK)
        A.R(limb('stand_foot', (s * 0.165, -0.20, 0.008), (s * 0.165, -0.13, 0.008), 0.035, 0.016), 0x3a3631)
    A.S(tube('stand_x', (-0.12, -0.08, 0.17), (0.12, -0.08, 0.17), 0.012, 6), FRAME_BLACK)

    # ---------------- rear body with cowls (lofted), seams, trim strips, louvres
    NS, NA = 20, 16
    secs = []
    for i in range(NS + 1):
        wz = BODY[0][0] + (BODY[-1][0] - BODY[0][0]) * i / NS
        secs.append([body_pt(wz, k / NA * math.tau) for k in range(NA)])
    A.S(loft('body', secs), paint)
    for s in (-1, 1):
        mids = []
        for i in range(12):
            wz = -0.22 - 0.62 * i / 11
            W, Hb, T = body_at(wz)
            mids.append((s * (W * 1.0 + 0.006), wz, (Hb + T) / 2 - 0.02))
        A.S(polytube('trim', mids, 0.007, 4), CHROME, 'chrome')
        seam = [(surf_x(-0.24 - 0.03 * (h - 0.3) / 0.33, h, s) + s * 0.003, -0.24 - 0.03 * (h - 0.3) / 0.33, h)
                for h in (0.30, 0.38, 0.46, 0.54, 0.60)]
        A.R(polytube('seam', seam, 0.005, 3), 0x2a2724)
        A.S(polytube('cowl_lip', [(s * 0.20, -0.30, 0.29), (s * 0.27, -0.50, 0.285), (s * 0.27, -0.70, 0.295), (s * 0.20, -0.86, 0.33)],
                     0.012, 4), paint)
    for k in range(6):                                     # engine-side cowl louvres (right)
        wz = -0.62 - 0.035 * k
        h = 0.43
        x = surf_x(wz, h, 1)
        A.S(limb('louvre', (x + 0.004, wz, h - 0.05), (x - 0.01, wz - 0.012, h + 0.06), 0.012, 0.010), FRAME_BLACK)

    # ---------------- rear wheel, engine case, silencer, kick lever
    small_wheel(A, S_RZ, 0, 0x6e6f6a, 1.1 if variant == 'a' else 0.4)
    # engine: round crankcase drum tucked under the right cowl, a tapered swing-arm casting back to the rear hub
    A.S(rev('crankcase', (0.08, -0.36, 0.25), (0.22, -0.36, 0.25), [(0, 0.06), (0.2, 0.095), (0.8, 0.095), (1, 0.07)], seg=10), ALLOY, 'alloy')
    A.S(limb('engine_arm', (0.15, -0.40, 0.24), (0.13, S_RZ + 0.05, S_HY + 0.01), 0.10, 0.09), ALLOY, 'alloy')
    A.S(rev('drum', (0.07, S_RZ, S_HY), (0.12, S_RZ, S_HY), [(0, 0.09), (1, 0.08)], seg=10), ALLOY, 'alloy')
    A.S(rev('silencer', (0.17, -0.40, 0.21), (0.21, -0.92, 0.25),
            [(0.0, 0.03), (0.08, 0.06), (0.5, 0.066), (0.9, 0.06), (1.0, 0.03)], seg=10), 0x5b554e, 'rust')
    A.S(tube('tailpipe', (0.21, -0.92, 0.25), (0.215, -0.98, 0.255), 0.018, 6), 0x4a4038, 'rust')
    kx = surf_x(-0.48, 0.34, 1) + 0.02
    A.S(polytube('kick', [(kx, -0.56, 0.36), (kx + 0.02, -0.46, 0.30), (kx + 0.03, -0.40, 0.26)], 0.012, 5), CHROME, 'chrome')
    A.R(limb('kick_pad', (kx + 0.03, -0.41, 0.265), (kx + 0.09, -0.41, 0.265), 0.035, 0.022), 0x34312d)

    # ---------------- seat (dual), strap, bag hook; tail lamp, blank plate
    seat_col, seat_wear = (0x2e2a26, 'leather') if variant == 'a' else (0x7a6448, 'rope')
    seat = []
    for wz, hw, tp in ((-0.13, 0.09, 0.72), (-0.20, 0.13, 0.78), (-0.42, 0.145, 0.795), (-0.66, 0.14, 0.79), (-0.80, 0.115, 0.765)):
        seat.append([(-hw, wz, 0.655), (-hw, wz, tp - 0.035), (-hw * 0.75, wz, tp), (hw * 0.75, wz, tp), (hw, wz, tp - 0.035), (hw, wz, 0.655)])
    A.R(loft('seat', seat), seat_col, seat_wear)
    A.R(polytube('strap', [(-0.15, -0.46, 0.69), (-0.125, -0.46, 0.80), (0.125, -0.46, 0.80), (0.15, -0.46, 0.69)], 0.008, 4), 0x2c241e, 'leather')
    A.S(polytube('bag_hook', [(0.0, -0.09, 0.50), (0.0, -0.05, 0.50), (0.0, -0.035, 0.47)], 0.006, 4), CHROME, 'chrome')
    A.R(rev('tail_lamp', (0.0, -0.975, 0.535), (0.0, -1.02, 0.535), [(0, 0.035), (1, 0.05)], seg=8), 0x7e2b24)
    A.S(limb('plate_bracket', (0.0, -0.99, 0.47), (0.0, -1.03, 0.40), 0.03, 0.01), FRAME_BLACK)
    A.S(limb('plate_r', (-0.10, -1.035, 0.37), (0.10, -1.035, 0.37), 0.12, 0.008), 0xc4bba0, 'paint')

    # ---------------- variant extras
    if variant == 'a':
        # spare wheel upright on a bracket behind the tail, nuts facing back
        n1 = len(kit.records)
        small_wheel(A, 0.0, 1, paint, 2.6)
        rot = Matrix.Translation((0.0, 1.10, 0.60 - S_HY)) @ Matrix.Rotation(math.radians(90), 4, 'Z')
        for _, o, _ in kit.records[n1:]:
            o.data.transform(o.matrix_world)
            o.matrix_world.identity()
            o.data.transform(rot)
        for s in (-1, 1):
            A.S(tube('spare_arm', (s * 0.06, -0.86, 0.66), (s * 0.06, -1.04, 0.60), 0.011, 5), FRAME_BLACK)
    else:
        for s in (-1, 1):
            A.S(tube('carrier', (s * 0.09, -0.78, 0.78), (s * 0.09, -1.02, 0.77), 0.009, 5), CHROME, 'chrome')
            A.S(tube('carrier_leg', (s * 0.09, -1.0, 0.77), (s * 0.10, -0.90, 0.62), 0.008, 4), CHROME, 'chrome')
        for wz in (-0.85, -0.93, -1.01):
            A.S(tube('carrier_x', (-0.09, wz, 0.78), (0.09, wz, 0.78), 0.008, 4), CHROME, 'chrome')
        # saree guard: a bent tube cage outside the rear wheel, left side
        A.S(polytube('saree_guard', [(-0.30, -0.36, 0.30), (-0.33, -0.44, 0.16), (-0.33, -0.70, 0.13), (-0.31, -0.86, 0.20),
                                     (-0.27, -0.90, 0.33)], 0.010, 5), FRAME_BLACK)
        for wz in (-0.52, -0.66, -0.78):
            A.S(tube('saree_bar', (-0.33, wz, 0.15), (-0.30, wz, 0.32), 0.007, 4), FRAME_BLACK)
        # bar turned about the column axis (front assembly only)
        a, b = bs.B(COL_B), bs.B(COL_T)
        ax = (b - a).normalized()
        M = Matrix.Translation(a) @ Matrix.Rotation(math.radians(16), 4, ax) @ Matrix.Translation(-a)
        for o in front:
            o.data.transform(o.matrix_world)
            o.matrix_world.identity()
            o.data.transform(M)
    return kit


if __name__ == '__main__':
    do_render = '--' in sys.argv and 'render' in sys.argv[sys.argv.index('--'):]
    shots = os.path.join(ROOT, 'docs', 'shots', 'assets-scooter_open')
    for slot, var in (('scooter_open_v2', 'a'), ('scooter_open_v2_b', 'b')):
        for o in list(bpy.data.objects):
            if o.name.startswith('hb_'):
                bpy.data.objects.remove(o, do_unlink=True)
        kit = build_open(var)
        kit.finalize(os.path.join(ROOT, 'tmp', slot + '_raw.glb'), {}, drift_amp=0.05, ao_strength=0.45)
        objs = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('hb_')]
        for o in objs:
            print('mesh', slot, o.name, 'tris', tri_count([o]))
        print('TRIANGLES', slot, tri_count(objs))
        if do_render:
            render(os.path.join(shots, slot + '_front34.png'), (2.3, -2.0, 1.15), (0.0, -0.05, 0.50))
            render(os.path.join(shots, slot + '_rear34.png'), (-2.2, 2.1, 1.3), (0.0, 0.0, 0.50))
