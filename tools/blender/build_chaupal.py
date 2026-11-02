"""
Peepal chaupal - arch.py Kit, to Places V1/chaupal/LAYOUT.md + MAIN_chaupal_front_isometric.png / back_top (top = layout authority).
Run:  tools/blender/make.sh chaupal chaupal_v2
      ~/Applications/Blender.app/Contents/MacOS/Blender -b --python tools/blender/build_chaupal.py -- render   (docs/shots/assets-chaupal/)
Frame: site-local metres, +z south = front. Bare earth patch 20 x 20 m (x,z in [-10,10]); four lanes meet at the middles of its sides (outside).
Round brick platform 8 m across (R 4) with cement top, cream edge, brick steps front + both sides; the tree pit is left EMPTY (the huge peepal is hers).
3 charpais + 1 takht + 2 plastic chairs (red, green) round the platform; notice board 2 m on 2 wooden posts at the left (blank paper sheets plus two
picture-only event posters, a circus and a cricket match, no lettering); hand pump + matka on a cement slab front-right; concrete electric pole with one street lamp at the right; a broom.
No threads or lamps on the tree, no hookah (game rules).

Phase 5 (2 Nov, reviewer FAIL: flat ground, spotless surfaces, missing props):
  ground   the patch is now the library's packed earth as GEOMETRY (kind 'earth' -> arch.earth_ground: swells, cracks, dimples), one continuous
           mesh (3 x 3 big faces minus the centre under the platform), then weathered by position: a trodden ring round the platform, foot-worn
           paths from the four lane mouths, hollowed aprons at the steps, a damp patch + run-off trickle at the hand pump, spilt-water stains,
           grass-tinted margins. Leaf litter (fresh, yellow, dry) piled against the platform foot, the steps and under the cots.
  platform the cement top is now actually cement (the old solid cream disc covered it): cream rim as a chipped, dirt-varied segmented band,
           hairline cracks and water rings on the cement, a mud-splash band round the brick foot, worn tread centres, chipped step noses
           with dust in the tread corners.
  props    two parked bicycles, a drinking-water matka on a brick stand with a steel lid and tumbler, a brass lota + steel glasses + folded
           newspaper + a small transistor radio on the takht, a durrie and a pillow on two cots, a lathi, two pairs of chappals at the steps,
           a steel balti at the pump, loose brick pieces. Cots vary in size, rope tone and sag; chairs are sun-faded.
Materials: frozen library only, by name through arch.Kit (plaster set carrying packed earth / cement / paint colours, brick set, real wood set in
the props slot, metal set). No new material values: the weathering is per-vertex tone on the approved packed earth.
"""
import sys, os, math, random, shutil
sys.path.insert(0, os.path.dirname(__file__))
import bpy
import bmesh
from common import wb, limb, cyl, sphere, quad, new_bmesh_obj, ROOT, load_pbr_material, box_uv
import arch
from arch import Kit, plastic_chair, lathe, clay_pot, decal_material, bicycle, STEEL, BRASS

OUT = os.path.join(ROOT, 'tmp', 'chaupal_v2_raw.glb')
# Phase 5b (2 Nov): the earth patch rides the library's packed earth BY NAME as the approved material board renders it (dryearth scan x
# vertex colour) through the unused 'jute' slot; in the plaster set the runtime low-wall weathering turned it a dark blotchy grey-brown.
kit = Kit(split_props=False, own=('metal',), wood_slot='props', route={'earth': 'jute'}, tex_override={'jute': ('dryearth', 1.0)})
rnd = random.Random(3)
CEMENT = 0x8E8C86
CEMENT_DK, CEMENT_WORN, CEMENT_WET = 0x77756F, 0x83817A, 0x6C6B66
CREAM = 0xE8DFC0
EARTH = 0xB69568          # packed earth, sampled from her front view
DUST = 0xA88A62
G = 0.05                  # ground top (patch boundary height; the earth swells about +-2 cm round it)
R = 4.0


def add(k, o, c=None):
    kit.add(k, o, c)
    return o


def jit(hexc, r, amt=0.06):
    k = 1.0 + r.uniform(-amt, amt)
    return (min(255, int(((hexc >> 16) & 255) * k)) << 16) | (min(255, int(((hexc >> 8) & 255) * k)) << 8) | min(255, int((hexc & 255) * k))


def flat(name, pts, kind, colour):
    """A flat upward-facing polygon from (wx, wz, h) points (leaves, stains)."""
    o = quad(name, pts)
    if o.data.polygons[0].normal.z < 0:
        bpy.data.objects.remove(o)
        o = quad(name, list(reversed(pts)))
    return add(kind, o, colour)


def ring_wall(cx, cz, Rr, h0, h1, t, kind='brick', n=40, colour=None):
    for i in range(n):
        a0, a1 = i / n * math.tau, (i + 1) / n * math.tau
        add(kind, limb('seg', (cx + Rr * math.cos(a0), cz + Rr * math.sin(a0), (h0 + h1) / 2), (cx + Rr * math.cos(a1), cz + Rr * math.sin(a1), (h0 + h1) / 2), t, h1 - h0), colour(i) if colour else None)


# ---------------------------------------------------------------- ground: packed earth geometry + positional weathering
def _band(x, a, b, soft=0.6):
    if x < a - soft or x > b + soft:
        return 0.0
    if x < a:
        return (x - (a - soft)) / soft
    if x > b:
        return ((b + soft) - x) / soft
    return 1.0


STAINS = [(rnd.uniform(-8.5, 8.5), rnd.uniform(-8.5, 8.5), rnd.uniform(0.35, 0.8), rnd.uniform(0.82, 0.92)) for _ in range(9)]
STAINS = [s for s in STAINS if math.hypot(s[0], s[1]) > R + 0.8]
PUMP = (6.8, 7.0)


def ground_weather(x, z):
    """(tone multiplier rgb, height offset) for packed earth at site point (x, z)."""
    r = math.hypot(x, z)
    k, dh = 1.0, 0.0
    tint = [1.0, 1.0, 1.0]
    ring = _band(r, R + 0.15, R + 1.9, 0.9)                      # trodden ring where everyone walks round the platform
    k *= 1.0 - 0.13 * ring
    dh -= 0.006 * ring
    for (px, pz) in ((0.0, R + 1.55), (-(R + 1.55), 0.0), (R + 1.55, 0.0)):   # hollowed aprons at the three flights of steps
        d = math.hypot(x - px, z - pz)
        if d < 1.8:
            w = (1 - d / 1.8) ** 1.5
            k *= 1.0 - 0.17 * w
            dh -= 0.012 * w
    for along_z in (True, False):                                 # foot paths in from the four lane mouths
        d, s = (abs(x), abs(z)) if along_z else (abs(z), abs(x))
        if s > R + 1.0:
            w = math.exp(-(d / 1.15) ** 2) * min(1.0, (s - R - 1.0) / 1.5)
            k *= 1.0 - 0.1 * w
            dh -= 0.005 * w
    dp = math.hypot(x - PUMP[0], z - PUMP[1])                    # damp ground round the pump slab, and the run-off trickle to the lane
    if dp < 2.6:
        w = (1 - dp / 2.6) ** 1.2
        k *= 1.0 - 0.3 * w
        tint[1] *= 1.0 + 0.02 * w
    ax, az, bx, bz = PUMP[0] + 0.9, PUMP[1] + 0.6, 9.9, 9.2
    t = max(0.0, min(1.0, ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / ((bx - ax) ** 2 + (bz - az) ** 2)))
    dt = math.hypot(x - (ax + t * (bx - ax)), z - (az + t * (bz - az))) - 0.05 * math.sin(t * 19)
    if dt < 0.45:
        w = 1 - dt / 0.45
        k *= 1.0 - 0.28 * w
        dh -= 0.014 * w
    for sx, sz, sr, sk in STAINS:                                 # old spilt water / tea, cattle-crossing marks
        d = math.hypot(x - sx, z - sz) / sr
        if d < 1.0:
            k *= 1.0 - (1.0 - sk) * (1 - d * d)
    edge = max(0.0, 1.0 - (10.0 - max(abs(x), abs(z))) / 1.6)   # margins: grass creeping in, paler dust
    tint[0] *= 1.0 - 0.07 * edge
    tint[2] *= 1.0 - 0.12 * edge
    k *= 1.0 + 0.05 * edge * (1 - ring)
    return [k * c for c in tint], dh


_orig_earth = arch.earth_ground


def chaupal_earth(obj, base_hex, seed=0):
    ok = _orig_earth(obj, base_hex, seed)
    if not ok:
        return ok
    me = obj.data
    per = {}
    for v in me.vertices:
        tone, dh = ground_weather(v.co.x, -v.co.y)
        per[v.index] = tone
        if abs(abs(v.co.x) - 10) > 1e-3 and abs(abs(v.co.y) - 10) > 1e-3 and max(abs(v.co.x), abs(v.co.y)) > 3.4:
            v.co.z += dh
    layer = me.color_attributes['Base']
    for lp in me.loops:
        c = layer.data[lp.index].color
        t = per[lp.vertex_index]
        layer.data[lp.index].color = (min(1.0, c[0] * t[0]), min(1.0, c[1] * t[1]), min(1.0, c[2] * t[2]), 1.0)
    me.update()
    return ok


arch.earth_ground = chaupal_earth   # Kit.finalize looks the helper up by name at call time


def earth_patch():
    """One continuous earth mesh: the 20 x 20 m patch as 3 x 3 big faces with the centre (under the platform) left out, so arch.earth_ground
    subdivides every face edge identically and the swells run across face borders without a seam."""
    bm = bmesh.new()
    cs = [-10.0, -10.0 / 3, 10.0 / 3, 10.0]
    V = {}
    for i, x in enumerate(cs):
        for j, y in enumerate(cs):
            V[i, j] = bm.verts.new((x, y, G))
    for i in range(3):
        for j in range(3):
            if i == 1 and j == 1:
                continue
            bm.faces.new((V[i, j], V[i + 1, j], V[i + 1, j + 1], V[i, j + 1]))
    return new_bmesh_obj('patch', bm)


add('earth', earth_patch(), EARTH)
for (x0, x1, z0, z1) in ((-10, 10, -10.02, -10), (-10, 10, 10, 10.02), (-10.02, -10, -10, 10), (10, 10.02, -10, 10)):   # skirt down to the terrain
    add('paint', wb('patch_skirt', x0, x1, z0, z1, -0.08, G, 0.0), DUST)
add('paint', cyl('under_platform', 0, 0, -0.08, G - 0.005, 3.5, 3.5, 24), DUST)

# ---------------------------------------------------------------- platform: brick drum, cement top, cream rim, tree pit
ring_wall(0, 0, R - 0.17, 0, 0.9, 0.38)
add('trim', cyl('top', 0, 0, 0.9, 0.99, R - 0.06, R - 0.06, 40), CEMENT)
CHIPS = {rnd.randrange(40) for _ in range(5)}
ring_wall(0, 0, R + 0.03, 0.9, 1.02, 0.24, 'trim', 40, lambda i: CEMENT_WORN if i in CHIPS else jit(jit(CREAM, rnd, 0.025), rnd, 0.0) if i % 7 else jit(0xD6CCAE, rnd, 0.03))
ring_wall(0, 0, 1.47, 0.98, 1.1, 0.18, 'trim', 24, lambda i: jit(CREAM, rnd, 0.04) if i % 5 else 0xCFC5A6)
add('paint', cyl('pit_soil', 0, 0, 0.0, 1.035, 1.39, 1.39, 24), 0x4A3524)
# mud-splash band round the brick foot, ragged top
for i in range(40):
    a0, a1 = i / 40 * math.tau, (i + 1) / 40 * math.tau
    hh = rnd.uniform(0.1, 0.28)
    Rs = R + 0.035
    add('paint', limb('splash', (Rs * math.cos(a0), Rs * math.sin(a0), hh / 2), (Rs * math.cos(a1), Rs * math.sin(a1), hh / 2), 0.012, hh), jit(0x8E7458, rnd, 0.05))
# cement top: hairline cracks (zig-zag runs), water rings, dark blotches
for c in range(7):
    a = rnd.uniform(0, math.tau)
    r0 = rnd.uniform(1.75, 2.6)
    pts = [(r0 * math.cos(a), r0 * math.sin(a))]
    for s in range(rnd.randint(3, 6)):
        a += rnd.uniform(-0.12, 0.12)
        r0 += rnd.uniform(0.18, 0.32)
        if r0 > R - 0.15:
            break
        pts.append((r0 * math.cos(a), r0 * math.sin(a)))
    for p, q in zip(pts, pts[1:]):
        add('trim', limb('crack', (p[0], p[1], 0.9915), (q[0], q[1], 0.9915), 0.011, 0.002), 0x5E5C57)
for k in range(6):
    a, d = rnd.uniform(0, math.tau), rnd.uniform(1.9, 3.5)
    sx, sz, sr = d * math.cos(a), d * math.sin(a), rnd.uniform(0.18, 0.45)
    add('trim', cyl('stain', sx, sz, 0.99, 0.9913, sr, sr, 14), jit(CEMENT_DK, rnd, 0.05))
for (sx, sz) in ((2.6, 2.1), (2.75, 2.25)):     # water rings where the drinking matka used to stand
    for rr, cc in ((0.2, CEMENT_WET), (0.16, CEMENT_WORN)):
        add('trim', cyl('ring_stain', sx, sz, 0.991, 0.9918 + (0.0004 if rr < 0.2 else 0), rr, rr, 16), cc)

# ---------------------------------------------------------------- steps: front (+z), left (-x), right (+x), three brick steps each, 2.4 m wide
for (dx, dz) in ((0, 1), (-1, 0), (1, 0)):
    for k in range(3):
        d = R + 0.1 + (2 - k) * 0.38
        h = 0.3 * (k + 1)
        cx, cz = dx * (d + 0.19), dz * (d + 0.19)
        w, t = (2.4, 0.38) if dz else (0.38, 2.4)
        add('brick', wb('step', cx - w / 2, cx + w / 2, cz - t / 2, cz + t / 2, 0, h, 0.01))
        # cement nosing over the whole tread, chipped back to the brick at a few spots along the front edge
        add('trim', wb('step_nose', cx - w / 2 - 0.02, cx + w / 2 + 0.02, cz - t / 2 - 0.02, cz + t / 2 + 0.02, h - 0.03, h + 0.012, 0.004), jit(CEMENT, rnd, 0.04))   # stands proud of the brick top: no shared face
        for c in range(rnd.randint(1, 3)):
            u, L = rnd.uniform(-1.05, 1.05), rnd.uniform(0.1, 0.24)
            if dz:
                fz = cz + t / 2 + 0.021
                add('brick', wb('nose_chip', cx + u, cx + u + L, fz - rnd.uniform(0.04, 0.09), fz + 0.002, h - 0.035, h + 0.0135, 0.0))
            else:
                fx = cx + dx * (t / 2 + 0.021)
                dd = rnd.uniform(0.04, 0.09)
                add('brick', wb('nose_chip', min(fx, fx - dx * dd), max(fx, fx - dx * dd) + 0.002, cz + u, cz + u + L, h - 0.035, h + 0.0135, 0.0))
        # worn, darker centre of the tread where feet land, and dust banked in the back corner
        if dz:
            add('trim', wb('tread_wear', cx - 0.45, cx + 0.45, cz - 0.12, cz + 0.17, h + 0.012, h + 0.014, 0.0), CEMENT_DK)
            add('paint', wb('tread_dust', cx - 1.2, cx + 1.2, cz - t / 2 - 0.02, cz - t / 2 + 0.05, h + 0.012, h + 0.024, 0.004), DUST) if k < 2 else None
        else:
            add('trim', wb('tread_wear', cx - 0.14, cx + 0.14, cz - 0.45, cz + 0.45, h + 0.012, h + 0.014, 0.0), CEMENT_DK)
            if k < 2:
                bx0 = cx - dx * (t / 2 + 0.02)            # back edge of the tread, against the riser above
                add('paint', wb('tread_dust', min(bx0, bx0 + dx * 0.07), max(bx0, bx0 + dx * 0.07), cz - 1.2, cz + 1.2, h + 0.012, h + 0.024, 0.004), DUST)
# loose brick pieces knocked off the steps
for (bx_, bz_) in ((1.45, 5.95), (-5.7, 1.5), (5.85, -1.35), (-1.6, 6.2)):
    a = rnd.uniform(0, math.pi)
    L = rnd.uniform(0.09, 0.2)
    add('brick', limb('brick_bit', (bx_, bz_, G + 0.03), (bx_ + L * math.cos(a), bz_ + L * math.sin(a), G + 0.03), 0.1, 0.06))


# ---------------------------------------------------------------- seating
def charpai(cx, cz, ang, w=1.9, d=1.0, rope=0xB89A64, leg=None, sag=0.0, seed=0):
    r = random.Random(seed)
    ca, sa = math.cos(ang), math.sin(ang)
    P = lambda u, v, h: (cx + u * ca - v * sa, cz + u * sa + v * ca, h)
    for u in (-w / 2 + 0.07, w / 2 - 0.07):
        for v in (-d / 2 + 0.07, d / 2 - 0.07):
            add('wood', limb('cot_leg', P(u, v, G - 0.02), P(u, v, G + 0.4), 0.075), leg)
    add('wood', limb('cot_rail', P(-w / 2, -d / 2 + 0.035, G + 0.4), P(w / 2, -d / 2 + 0.035, G + 0.4), 0.07, 0.07), leg)
    add('wood', limb('cot_rail', P(-w / 2, d / 2 - 0.035, G + 0.4), P(w / 2, d / 2 - 0.035, G + 0.4), 0.07, 0.07), leg)
    add('wood', limb('cot_end', P(-w / 2 + 0.035, -d / 2, G + 0.4), P(-w / 2 + 0.035, d / 2, G + 0.4), 0.07, 0.07), leg)
    add('wood', limb('cot_end', P(w / 2 - 0.035, -d / 2, G + 0.4), P(w / 2 - 0.035, d / 2, G + 0.4), 0.07, 0.07), leg)
    for k in range(13):   # rope runs, the whole bed sagging toward the middle
        v = -d / 2 + 0.08 + k * (d - 0.16) / 12
        s = sag * (1 - (2 * v / d) ** 2)
        a, m, b = P(-w / 2 + 0.05, v, G + 0.43), P(0, v, G + 0.43 - s), P(w / 2 - 0.05, v, G + 0.43)
        c = jit(rope, r, 0.05)
        add('paint', limb('rope', a, m, 0.03, 0.02), c)
        add('paint', limb('rope', m, b, 0.03, 0.02), c)
    for k in range(22):
        u = -w / 2 + 0.08 + k * (w - 0.16) / 21
        s = sag * (1 - (2 * u / w) ** 2)
        a, m, b = P(u, -d / 2 + 0.05, G + 0.44), P(u, 0, G + 0.44 - s * 1.0 - 0.0), P(u, d / 2 - 0.05, G + 0.44)
        c = jit(rope, r, 0.07) - 0x101008
        add('paint', limb('rope2', a, m, 0.03, 0.02), c)
        add('paint', limb('rope2', m, b, 0.03, 0.02), c)
    return P


Pa = charpai(-6.6, 3.6, 0.35, 1.9, 1.0, 0xB89A64, None, 0.05, 1)
Pb = charpai(6.2, 4.6, -0.3, 1.8, 0.92, 0xA88C5E, 0x7A5C40, 0.03, 2)
Pc = charpai(0.5, 6.9, 0.05, 2.0, 1.05, 0xC2A672, 0x96765A, 0.07, 3)
# a folded striped durrie on one cot, a pillow on another
for k, col in enumerate((0x8E3B32, 0x3C4E6E, 0x8E3B32, 0xB89A5A, 0x3C4E6E)):
    add('paint', limb('durrie', Pa(0.35, -0.42 + k * 0.08 + 0.04, G + 0.47), Pa(0.85, -0.42 + k * 0.08 + 0.04, G + 0.47), 0.08, 0.06), jit(col, rnd, 0.05))
_px, _pz, _ = Pc(-0.72, 0.0, 0)   # this cot is turned only 3 degrees: an axis-aligned pillow sits true on it
add('paint', wb('pillow', _px - 0.17, _px + 0.17, _pz - 0.3, _pz + 0.3, G + 0.42, G + 0.52, 0.04), 0x9AA6B2)
for k in (-0.1, 0.0, 0.1):
    add('paint', wb('pillow_stripe', _px + k - 0.012, _px + k + 0.012, _pz - 0.302, _pz + 0.302, G + 0.425, G + 0.522, 0.0), 0x7A6A8A)
# takht (low wooden platform) at the right-back: planked top
tx, tz = 5.2, -3.8
for p in range(5):
    z0 = tz - 0.55 + p * 0.22
    add('wood', wb('takht_plank', tx - 1.1, tx + 1.1, z0 + 0.004, z0 + 0.216, G + 0.38, G + 0.46 + rnd.uniform(-0.004, 0.004), 0.006), jit(0x8A6A48, rnd, 0.07))
for dx in (-0.95, 0.95):
    for dz in (-0.4, 0.4):
        add('wood', wb('takht_leg', tx + dx - 0.05, tx + dx + 0.05, tz + dz - 0.05, tz + dz + 0.05, G - 0.02, G + 0.38, 0.0))
TT = G + 0.46
add('paint', lathe('lota', tx - 0.6, tz - 0.2, [(0.0, TT), (0.05, TT), (0.075, TT + 0.04), (0.085, TT + 0.09), (0.06, TT + 0.15), (0.045, TT + 0.17), (0.055, TT + 0.2), (0.0, TT + 0.2)], seg=16), BRASS)
for k, (gx, gz) in enumerate(((tx - 0.35, tz - 0.3), (tx - 0.42, tz - 0.05))):
    add('paint', cyl('glass', gx, gz, TT, TT + 0.11, 0.033, 0.04, 10), jit(STEEL, rnd, 0.04))
add('paint', wb('newspaper', tx + 0.05, tx + 0.45, tz - 0.2, tz + 0.08, TT, TT + 0.012, 0.0), 0xDCD6C6)
add('paint', wb('newspaper_top', tx + 0.08, tx + 0.47, tz - 0.17, tz + 0.1, TT + 0.012, TT + 0.016, 0.0), 0xE6E0D0)
add('paint', wb('radio', tx + 0.6, tx + 0.88, tz + 0.1, tz + 0.22, TT, TT + 0.17, 0.012), 0x5A4636)
add('paint', wb('radio_grille', tx + 0.62, tx + 0.78, tz + 0.222, tz + 0.226, TT + 0.03, TT + 0.14, 0.0), 0x9A9A92)
add('paint', limb('radio_aerial', (tx + 0.85, tz + 0.16, TT + 0.17), (tx + 0.98, tz + 0.12, TT + 0.55), 0.008), 0xB9BDC2)
plastic_chair(kit, -0.9, -5.5, 3.6, 0xB8443A)   # sun-faded red and green
plastic_chair(kit, 0.9, -5.7, 3.0, 0x3E8248)
# lathi leaning against the right charpai, two pairs of chappals at the front steps
add('wood', limb('lathi', (7.15, 4.2, G), (7.0, 4.5, G + 1.55), 0.035))
for (cx_, cz_, a, col) in ((-0.55, 5.75, 0.2, 0x5A3A2A), (0.75, 5.85, -0.35, 0x2E4A6A)):
    for s in (-0.07, 0.07):
        ox, oz = s * math.cos(a), s * math.sin(a)
        add('paint', limb('chappal', (cx_ + ox - 0.12 * math.sin(a), cz_ + oz + 0.12 * math.cos(a), G + 0.01), (cx_ + ox + 0.12 * math.sin(a), cz_ + oz - 0.12 * math.cos(a), G + 0.01), 0.09, 0.018), col)
# drinking-water matka on a brick stand at the platform's right-front foot, steel lid and a tumbler
mx, mz = 3.05, 3.85
add('brick', wb('matka_stand', mx - 0.3, mx + 0.3, mz - 0.3, mz + 0.3, G - 0.02, G + 0.35, 0.01))
add('trim', wb('matka_stand_top', mx - 0.32, mx + 0.32, mz - 0.32, mz + 0.32, G + 0.35, G + 0.38, 0.006), CEMENT_WET)
o = lathe('matka2', mx, mz, [(r_ * 1.05, G + 0.38 + h_ * 1.05) for r_, h_ in [(0.0, 0.0), (0.12, 0.0), (0.17, 0.03), (0.23, 0.13), (0.27, 0.27), (0.26, 0.38), (0.21, 0.49), (0.14, 0.57), (0.115, 0.61), (0.13, 0.65), (0.16, 0.675), (0.165, 0.69), (0.14, 0.695), (0.0, 0.69)]], seg=22)
add('paint', o, 0xA85C36)
add('paint', cyl('matka_lid', mx, mz, G + 0.38 + 0.72, G + 0.38 + 0.74, 0.19, 0.18, 14), STEEL)
add('paint', cyl('tumbler', mx + 0.07, mz + 0.03, G + 0.38 + 0.74, G + 0.38 + 0.85, 0.035, 0.04, 10), STEEL)
add('paint', cyl('drip_stain', mx, mz + 0.42, G + 0.012, G + 0.014, 0.28, 0.28, 12), 0x6E5638)
# two bicycles parked, different frames and places
bicycle(kit, -7.6, -3.4, 0x2A3A42)
bicycle(kit, 2.6, -7.6, 0x4A2A2A)

# ---------------------------------------------------------------- notice board on two wooden posts (left), blank paper sheets
bx, bz = -8.0, 0.8
for dz in (-1.1, 1.1):
    add('wood', limb('nb_post', (bx, bz + dz, G - 0.05), (bx, bz + dz, 2.4), 0.13))
    add('paint', limb('nb_post_mud', (bx, bz + dz, G), (bx, bz + dz, G + 0.22), 0.14), 0x7E6650)
add('wood', wb('nb_frame', bx - 0.07, bx + 0.07, bz - 1.05, bz + 1.05, 1.0, 2.2, 0.01))
add('metal', wb('nb_cap', bx - 0.14, bx + 0.12, bz - 1.15, bz + 1.15, 2.22, 2.26, 0.004), 0x8A8378)
add('paint', wb('nb_cork', bx + 0.06, bx + 0.09, bz - 0.95, bz + 0.95, 1.1, 2.1, 0.0), 0x8F6B45)
for k in range(11):
    sz = bz - 0.85 + rnd.uniform(0, 1.5)
    sh = 1.2 + rnd.uniform(0, 0.75)
    add('paint', wb('nb_sheet', bx + 0.09, bx + 0.1, sz, sz + rnd.uniform(0.22, 0.4), sh, sh + rnd.uniform(0.25, 0.4), 0.0), rnd.choice((0xE6E1D2, 0xDDD6C2, 0xEAE5D8, 0xD6CDB4)))
# two picture-only event posters (circus, cricket match) pinned over the sheets: 512x256 atlas, 2 cells, torn, faded, creased
def _h(ix, iy, sd):
    n = (ix * 374761393 + iy * 668265263 + sd * 2147483647) & 0xFFFFFFFF
    n = ((n ^ (n >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((n ^ (n >> 16)) & 0xFFFF) / 65535.0


def _vn(x, y, sd):
    ix, iy = int(math.floor(x)), int(math.floor(y))
    fx, fy = x - ix, y - iy
    fx, fy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
    a, b = _h(ix, iy, sd), _h(ix + 1, iy, sd)
    c, d = _h(ix, iy + 1, sd), _h(ix + 1, iy + 1, sd)
    return (a + (b - a) * fx) + ((c + (d - c) * fx) - (a + (b - a) * fx)) * fy


def _rgb(h):
    return ((h >> 16) & 255) / 255.0, ((h >> 8) & 255) / 255.0, (h & 255) / 255.0


def event_px(u, v):
    i = min(1, int(u * 2))
    x, y = u * 2 - i, v
    e = 0.04 + 0.04 * _vn(x * 14 + i * 9, y * 14, 3)
    if x < e or x > 1 - e or y < e * 0.6 or y > 1 - e * 0.6:
        return None
    if x > 0.78 and y > 0.84 and _vn(x * 9, y * 9, 8) > 0.45:
        return None
    cx, cy = x - 0.5, y - 0.5
    if i == 0:   # circus: striped big top on a dusk-yellow ground, a pennant, a ring of lights
        r, g, b = _rgb(0xE8C45A)
        ink = None
        if y > 0.62:
            ink = 0x7A5A3A
        elif y > 0.3 and abs(cx) < 0.36 * (y - 0.12) / 0.5 + 0.05:
            ink = 0xB8342C if int((x + 1) * 7) % 2 else 0xF1E6C8
        elif y > 0.12 and abs(cx) < 0.36 * (y - 0.12) / 0.5 + 0.05:
            ink = 0xB8342C if int((x + 1) * 7) % 2 else 0xF1E6C8
        if 0.04 < y < 0.14 and abs(cx - 0.02) < 0.1 * (0.14 - y) / 0.1 + 0.01:
            ink = 0x2E6A8A
        if (cx ** 2 + (y - 0.82) ** 2) < 0.012 and cx ** 2 + (y - 0.82) ** 2 > 0.005:
            ink = 0x3A2E80
    else:        # cricket match: green pitch, three stumps, bat and ball under a blue sky
        r, g, b = _rgb(0x9DC3DC)
        ink = None
        if y > 0.55:
            ink = 0x6E9A4E
        if 0.2 < y < 0.8 and any(abs(cx - d) < 0.018 for d in (-0.07, 0.0, 0.07)) and y < 0.8 and y > 0.45:
            ink = 0xE6D6A8
        if abs(cx - 0.24 + (y - 0.6) * 0.5) < 0.04 and 0.4 < y < 0.88:
            ink = 0xC8A66A
        if (cx + 0.2) ** 2 + (y - 0.3) ** 2 < 0.008:
            ink = 0xB02A22
    if ink is not None:
        ir, ig, ib = _rgb(ink)
        r, g, b = r * 0.2 + ir * 0.8, g * 0.2 + ig * 0.8, b * 0.2 + ib * 0.8
    fade = 0.28 + 0.3 * (1 - y)
    lum = 0.6 * r + 0.3 * g + 0.1 * b
    r, g, b = r + (lum * 0.9 + 0.22 - r) * fade, g + (lum * 0.9 + 0.2 - g) * fade, b + (lum * 0.9 + 0.15 - b) * fade
    k = (0.9 + 0.2 * _vn(x * 90 + i * 5, y * 90, 5)) * (1 - (0.18 if abs(x - 0.5) < 0.01 or abs(y - 0.5) < 0.01 else 0.0))
    k *= 1 - max(0.0, _vn(x * 4 + i * 3, y * 4, 11) - 0.55) * 0.45
    pw = lambda c: max(0.0, min(1.0, c * k)) ** 2.2
    return (pw(r), pw(g), pw(b), 0.92)


emat = decal_material('hb_decal', (512, 256), event_px)
for i, (dz, w, hgt, h0) in enumerate(((-0.45, 0.78, 0.98, 1.12), (0.42, 0.66, 0.88, 1.2))):
    xx = bx + 0.112
    o = quad('event_poster', [(xx, bz + dz - w / 2, h0), (xx, bz + dz + w / 2, h0), (xx, bz + dz + w / 2, h0 + hgt), (xx, bz + dz - w / 2, h0 + hgt)])
    uvl = o.data.uv_layers.new(name='UVMap')
    for loop, uv in zip(o.data.loops, [(i / 2, 0), ((i + 1) / 2, 0), ((i + 1) / 2, 1), (i / 2, 1)]):
        uvl.data[loop.index].uv = uv
    o.data.materials.append(emat)
    kit.extra.append(o)
# hand pump + matka on a cement slab (front-right), wet and stained
px, pz = PUMP
add('trim', wb('pump_slab', px - 1.0, px + 1.0, pz - 0.9, pz + 0.9, G - 0.04, G + 0.12, 0.01), CEMENT)
add('trim', wb('slab_wet', px - 0.95, px + 0.55, pz - 0.6, pz + 0.85, G + 0.12, G + 0.122, 0.0), CEMENT_WET)
add('trim', wb('pump_tub', px - 0.2, px + 0.9, pz + 0.1, pz + 0.7, G + 0.12, G + 0.34, 0.01), 0xA09D95)
add('paint', wb('tub_algae', px - 0.21, px + 0.91, pz + 0.09, pz + 0.71, G + 0.12, G + 0.19, 0.0), 0x6A6E4C)
add('paint', wb('tub_water', px - 0.12, px + 0.82, pz + 0.18, pz + 0.62, G + 0.3, G + 0.305, 0.0), 0x4E5A52)
add('metal', cyl('pump_base', px - 0.5, pz - 0.2, G + 0.12, G + 0.5, 0.15, 0.12, 10), 0x2E5E3A)
add('metal', cyl('pump_col', px - 0.5, pz - 0.2, G + 0.5, G + 1.25, 0.08, 0.065, 10), 0x2E5E3A)
add('metal', limb('pump_handle', (px - 0.5, pz - 0.2, G + 1.18), (px - 1.0, pz - 0.2, G + 1.5), 0.05), 0x2E5E3A)
add('metal', limb('pump_spout', (px - 0.5, pz - 0.2, G + 0.9), (px - 0.1, pz - 0.2, G + 0.72), 0.06), 0x2E5E3A)
clay_pot(kit, px - 0.7, pz + 0.55, 0.9)
_last = kit.records[-1][1]
_last.location.z += G + 0.12
add('metal', cyl('mug', px + 0.55, pz - 0.5, G + 0.12, G + 0.26, 0.05, 0.06, 8), STEEL)
add('paint', cyl('balti', px + 1.35, pz - 0.3, G - 0.01, G + 0.3, 0.13, 0.17, 14), 0x9EA3A8)
add('paint', limb('balti_handle', (px + 1.2, pz - 0.3, G + 0.31), (px + 1.5, pz - 0.3, G + 0.31), 0.012), 0x6E7276)

# concrete electric pole at the right with a crossarm and one street lamp
lx, lz = 8.2, 1.0
add('trim', limb('pole', (lx, lz, 0), (lx, lz, 9.0), 0.26, 0.2), 0xA9A69F)
add('paint', limb('pole_dirt', (lx, lz, G - 0.02), (lx, lz, G + 0.35), 0.266, 0.264), 0x7E7262)
add('metal', limb('crossarm', (lx - 0.7, lz, 8.6), (lx + 0.7, lz, 8.6), 0.08, 0.1), 0x4A4C50)
for dx in (-0.6, 0, 0.6):
    add('paint', cyl('insulator', lx + dx, lz, 8.62, 8.78, 0.05, 0.04, 8), 0xC9C4B4)
add('metal', limb('lamp_arm', (lx, lz, 7.6), (lx - 1.3, lz, 7.9), 0.06), 0x4A4C50)
add('paint', cyl('lamp_head', lx - 1.4, lz, 7.78, 7.95, 0.2, 0.12, 10), 0xCFCFC8)
add('metal', limb('meter_box', (lx + 0.14, lz, 1.7), (lx + 0.14, lz, 2.3), 0.12, 0.3), 0x7A7D80)
for dx in (-0.6, 0, 0.6):
    for sgn, zend in ((1, 10.0), (-1, -10.0)):
        n = 8
        for k in range(n):
            t0, t1 = k / n, (k + 1) / n
            z0, z1 = lz + (zend - lz) * t0, lz + (zend - lz) * t1
            h = lambda t: 8.7 - 1.1 * t * t
            add('metal', limb('wire', (lx + dx, z0, h(t0)), (lx + dx, z1, h(t1)), 0.018, 0.018), 0x2A2A2A)

# leaf litter: heart-shaped peepal leaves, fresh green to dry brown, piled where the wind drops them (platform foot, step corners,
# under the cots) and thinly scattered elsewhere; a few on the cement top
LEAF_TONES = (0x6E7A3A, 0x8A8A3E, 0x9A8440, 0x7A6A30, 0xA07A40, 0x8A6236, 0xB09050)


def leaf(x0, z0, h, ang, L, tilt=0.0):
    ca, sa = math.cos(ang), math.sin(ang)
    P = lambda u, v, lift=0.0: (x0 + u * ca - v * sa, z0 + u * sa + v * ca, h + lift)
    pts = [P(-L * 0.45, 0, 0.0), P(-L * 0.1, -L * 0.36, tilt * 0.5), P(L * 0.25, -L * 0.28, tilt * 0.8), P(L * 0.75, 0, tilt), P(L * 0.25, L * 0.28, tilt * 0.8), P(-L * 0.1, L * 0.36, tilt * 0.5)]
    flat('leaf', pts, 'paint', jit(rnd.choice(LEAF_TONES), rnd, 0.08))


def ok_spot(x, z):
    return abs(x) < 9.6 and abs(z) < 9.6 and math.hypot(x - PUMP[0], z - PUMP[1]) > 1.4


for k in range(110):          # banked against the platform foot
    a = rnd.uniform(0, math.tau)
    d = R + 0.08 + abs(rnd.gauss(0, 0.35))
    x0, z0 = d * math.cos(a), d * math.sin(a)
    if (abs(x0) < 1.3 and z0 > 0) or (abs(z0) < 1.3):   # not on the step flights
        continue
    leaf(x0, z0, G + 0.026 + rnd.uniform(0, 0.015), rnd.uniform(0, math.tau), rnd.uniform(0.08, 0.12), rnd.uniform(0, 0.02))
for (dx, dz) in ((0, 1), (-1, 0), (1, 0)):   # in the corners of the treads
    for k in range(3):
        d = R + 0.1 + (2 - k) * 0.38 + 0.19
        h = 0.3 * (k + 1)
        for m in range(rnd.randint(1, 3)):
            s = rnd.choice((-1, 1)) * rnd.uniform(0.7, 1.15)
            x0, z0 = (s, d - 0.1) if dz else (dx * (d - 0.1), s)
            leaf(x0, z0, h + 0.016, rnd.uniform(0, math.tau), rnd.uniform(0.08, 0.11), 0.01)
for cot in (Pa, Pb, Pc):      # under the cots
    for k in range(8):
        x0, z0, _ = cot(rnd.uniform(-0.9, 0.9), rnd.uniform(-0.5, 0.5), 0)
        leaf(x0, z0, G + 0.026, rnd.uniform(0, math.tau), rnd.uniform(0.08, 0.12), 0.01)
n = 0
while n < 90:                 # thin scatter across the patch
    a = rnd.uniform(0, math.tau)
    d = rnd.uniform(R + 0.8, 9.5)
    x0, z0 = d * math.cos(a), d * math.sin(a)
    if not ok_spot(x0, z0):
        continue
    n += 1
    leaf(x0, z0, G + 0.03, rnd.uniform(0, math.tau), rnd.uniform(0.08, 0.12), rnd.uniform(0, 0.03))
for k in range(22):           # on the cement top
    a = rnd.uniform(0, math.tau)
    d = rnd.uniform(1.7, R - 0.25)
    leaf(d * math.cos(a), d * math.sin(a), 0.993, rnd.uniform(0, math.tau), rnd.uniform(0.08, 0.12), 0.008)
# a twig broom leaning on the platform, with a small swept heap of leaves and dust beside it
add('wood', limb('broom_handle', (-4.6, 3.4, G), (-4.2, 3.0, G + 1.0), 0.03))
add('paint', limb('broom_head', (-4.7, 3.5, G), (-4.55, 3.35, G + 0.4), 0.22, 0.06), 0x9A8A58)
add('paint', sphere('sweep_heap', -5.1, 4.1, G - 0.01, 0.34, 0.26, 0.06, 1), 0x8E7254)
for k in range(10):
    leaf(-5.1 + rnd.uniform(-0.25, 0.25), 4.1 + rnd.uniform(-0.18, 0.18), G + 0.05 + rnd.uniform(0, 0.02), rnd.uniform(0, math.tau), 0.09, 0.02)

TINTS = {'hb_plaster': '#FFF2D0', 'hb_plinth': '#E8DFC0', 'hb_trim': '#C9C6BE', 'hb_apron': '#A8845A', 'hb_wood': '#8A6A48', 'hb_brick': '#A06A58', 'hb_metal': '#FFFFFF'}
kit.finalize(OUT, TINTS, drift={'hb_brick': 0.1})


def render():
    from mathutils import Vector as V
    for m in bpy.data.materials:
        if m.node_tree:
            for nd in m.node_tree.nodes:
                if nd.type == 'MIX_RGB' and nd.blend_type == 'MULTIPLY':
                    nd.inputs['Fac'].default_value = 1.0
    gm = load_pbr_material('ground', 'dryearth', repeat=(0.5, 0.5))
    bpy.ops.mesh.primitive_plane_add(size=80, location=(0, 0, -0.01))
    g = bpy.context.active_object
    g.data.materials.append(gm)
    box_uv(g, (1, 1, 1))
    # stand-in trunk only so the pit does not read as a hole in the render (the real peepal is the game's)
    t = cyl('trunk_standin', 0, 0, 0.9, 5.0, 0.75, 0.55, 16)
    t.data.materials.append(load_pbr_material('bark_standin', 'wood', repeat=(1, 1)))
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = 40
    sc.cycles.device = 'CPU'
    sc.render.resolution_x, sc.render.resolution_y = 1400, 900
    sc.view_settings.view_transform = 'AgX'
    w = bpy.data.worlds.new('w')
    sc.world = w
    w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.55, 0.62, 0.75, 1)
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.7
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
    sc.collection.objects.link(sun)
    sun.data.energy = 4.0
    sun.data.color = (1.0, 0.93, 0.82)
    sun.data.angle = math.radians(1.0)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    sc.collection.objects.link(cam)
    sc.camera = cam
    d = os.path.join(ROOT, 'docs', 'shots', 'assets-chaupal')
    os.makedirs(d, exist_ok=True)
    # Blender frame: (x, -z, h); the front (+z) is Blender -y
    shots = [('a_front_iso', (12.0, -17.0, 9.5), (0.0, 0.5, 0.5), 28, (50, 0, 150)),
             ('b_steps_close', (2.6, -9.6, 2.4), (-0.4, -4.6, 0.4), 30, (50, 0, 150)),
             ('c_pump_takht', (11.5, 2.0, 3.2), (5.5, -2.0, 0.4), 26, (50, 0, 150))]
    for name, loc, look, lens, sun_rot in shots:
        sun.rotation_euler = tuple(math.radians(x) for x in sun_rot)
        cam.location = loc
        cam.data.lens = lens
        cam.rotation_euler = (V(look) - V(loc)).to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = os.path.join(d, name + '.png')
        bpy.ops.render.render(write_still=True)
        print('rendered', sc.render.filepath)


if '--' in sys.argv and 'render' in sys.argv[sys.argv.index('--'):]:
    render()
