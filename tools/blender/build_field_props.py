"""
Field props (1 Nov village plan): the hard-surface pieces that stand out in the fields, ONE GLB with one named root node per prop.
  well          : village well (kuan). Map: a 4.6 m water circle at (-205.5, -20.6). Built with the parapet's OUTER diameter = 4.6 m
                  (so nothing leaves the map circle except a low 0.9 m cement apron), bore 3.9 m. Modelled brick parapet ring (60 bricks
                  x 10 courses, real mortar gaps, a few missing/sunk bricks), old lime render hanging on in patches with ragged edges,
                  cement coping in cracked segments, damp/algae inside, dark water. Iron windlass: two angle-iron A-frames on the coping,
                  a 4.4 m crossbar, pulley wheel, rope to a galvanised bucket standing on the coping, a rope coil.
  field_gate    : ONE gate pier + the leaf hung on it. The map's 'Field gate' / 'Field gate (wheat)' are two 1.4 m post squares about
                  11 m apart, so src/fieldProps.js stands one unit on each post square (the second turned 180 deg). Pier: 0.82 m modelled
                  brick, 1.5 m, cement footing and pyramid cap, rain streaks. Leaf: 3.2 m iron frame, vertical bars, lower half planked
                  timber (real plank gaps), diagonal brace, sag, mud splash, standing OPEN at 80 deg toward +z on a brick wedge.
  field_gate_b  : the second pier/leaf: rust-primer iron, paler timber, a cement render skirt on the pier, leaf open at 105 deg.
  field_shrine  : 3 x 3 m lime-plastered platform shrine, two steps on +z, a small plastered devsthan with an arched lamp niche (clay
                  diya, soot above it), stepped top, a plain rounded stone in front, a pipe pole with a faded cloth pennant. NO figure.
  culvert       : ONE end of a pipe culvert: brick headwall with a concrete hume-pipe mouth, plastered parapet with cement coping,
                  banded end posts, splayed wing walls. src/fieldProps.js puts one at each end of the map's culvert footprint.
  culvert_b     : the other end: whitewash mostly gone, a coping block missing (brick showing), cracked pipe mouth, heavier algae.
Run: tools/blender/make_field_props.sh is NOT used (one file):
     ~/Applications/Blender.app/Contents/MacOS/Blender -b --python tools/blender/build_field_props.py            (-> tmp/field_props_raw.glb)
     node tools/shrink.js tmp/field_props_raw.glb public/assets/models/field_props.glb 999999
     node tools/strip-textures.mjs public/assets/models/field_props.glb public/assets/models/field_props.glb
     Blender -b --python tools/blender/build_field_props.py -- render    (shots into docs/shots/assets-field_props/ and tmp/)
Local frame of every root: origin on the ground, +z = glTF +z (the 'front': the shrine steps, the culvert's channel face).
Materials, frozen library only, by name through arch.Kit: plaster set (lime plaster, cement, modelled bricks as in build_hand_pump.py),
metal set via arch.rust_steel, wood set via arch.plank_wood. No new material values.
"""
import sys, os, math, random, shutil
sys.path.insert(0, os.path.dirname(__file__))
import bpy
import bmesh
from mathutils import Vector, Matrix
from common import wb, limb, cyl, quad, new_bmesh_obj, hex_to_linear_rgb, export_glb, load_pbr_material, box_uv, ROOT
import arch
from arch import Kit, ring, lathe

CEMENT, CEMENT_HI, CEMENT_LO = 0xa29f96, 0xaeaba1, 0x8c897f
DAMP, WET, ALGAE, ALGAE_DK = 0x75746c, 0x6a6b65, 0x5f6747, 0x4c5538
LIME, LIME_DIRTY, LIME_GREY = 0xd6d0c0, 0xc2bba8, 0xaaa496
MORTAR, SOOT, MUD, ROPE = 0x8e877a, 0x4d4743, 0x6e5e4a, 0x9a8462
RUST = 0x7a4a2c
BRICK_TONES = [0x9a6650, 0x8e5d4a, 0xa36d55, 0x86594a, 0x9b7059]

# ---------------------------------------------------------------- per-loop colour (face colours + damp band), wraps arch.colorize
FACECOLS = {}
GRIME = {}          # obj name -> (ground height, strength)
_orig_colorize = arch.colorize


def _colorize(obj, hex_color, attr='Col'):
    _orig_colorize(obj, hex_color, attr)
    if attr != 'Base':
        return
    me = obj.data
    fc = FACECOLS.get(obj.name)
    if fc and len(fc) != len(me.polygons):
        fc = None
    g0, st = GRIME.get(obj.name, (0.0, 0.22))
    base = hex_to_linear_rgb(hex_color)
    cache = {}
    out = [0.0] * (len(me.loops) * 4)
    verts = me.vertices
    for p in me.polygons:
        if fc:
            h = fc[p.index]
            c = cache.get(h) or cache.setdefault(h, hex_to_linear_rgb(h))
        else:
            c = base
        for li in p.loop_indices:
            co = verts[me.loops[li].vertex_index].co
            damp = max(0.0, min(1.0, (g0 + 0.32 - co.z) / 0.32)) * (0.65 + 0.35 * math.sin(co.x * 7.3 + co.y * 5.1))
            k = 1.0 - st * damp + 0.035 * math.sin(co.x * 13.1 + co.y * 9.7 + co.z * 11.3)
            out[li * 4:li * 4 + 4] = (c[0] * k, c[1] * k, c[2] * k, 1.0)
    me.color_attributes[attr].data.foreach_set('color', out)


arch.colorize = _colorize


# ---------------------------------------------------------------- helpers
def jit(hexc, rnd, amt=0.06):
    v = 1.0 + rnd.uniform(-amt, amt)
    out = 0
    for sh in (16, 8, 0):
        c = (hexc >> sh) & 0xff
        c = int(max(8, min(236, c * v * (1.0 + rnd.uniform(-amt, amt) * 0.4))))
        out = (out << 8) | c
    return out


class Multi:
    """Many hexahedra in one object, a colour per block (bricks, render strips, segments)."""
    def __init__(self, name):
        self.name, self.bm, self.fc = name, bmesh.new(), []

    def hexa(self, pts, col):
        vs = [self.bm.verts.new((x, -z, h)) for x, z, h in pts]
        for idx in ((0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)):
            self.bm.faces.new([vs[i] for i in idx])
            self.fc.append(col)

    def box(self, x0, x1, z0, z1, h0, h1, col):
        x0, x1 = min(x0, x1), max(x0, x1)
        z0, z1 = min(z0, z1), max(z0, z1)
        q = [(x0, z0), (x1, z0), (x1, z1), (x0, z1)]
        self.hexa([(x, z, h0) for x, z in q] + [(x, z, h1) for x, z in q], col)

    def wedge(self, a0, a1, r0, r1, h0, h1, col, cx=0.0, cz=0.0, h1b=None):
        q = [(r0, a0), (r1, a0), (r1, a1), (r0, a1)]
        top = [h1, h1, h1 if h1b is None else h1b, h1 if h1b is None else h1b]
        self.hexa([(cx + r * math.cos(a), cz + r * math.sin(a), h0) for r, a in q] + [(cx + r * math.cos(a), cz + r * math.sin(a), t) for (r, a), t in zip(q, top)], col)

    def obj(self, grime=None):
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        o = new_bmesh_obj(self.name, self.bm)
        FACECOLS[o.name] = self.fc
        if grime:
            GRIME[o.name] = grime
        return o


def blob(name, cx, cz, h, rx, rz, seed, n=14, rough=0.22):
    rnd = random.Random(seed)
    ph = [rnd.uniform(0, math.tau) for _ in range(3)]
    pts = []
    for i in range(n):
        a = i / n * math.tau
        k = 1.0 + rough * (0.6 * math.sin(2 * a + ph[0]) + 0.3 * math.sin(3 * a + ph[1]) + 0.15 * math.sin(5 * a + ph[2]))
        pts.append((cx + rx * k * math.cos(a), cz + rz * k * math.sin(a), h))
    o = quad(name, pts)
    if o.data.polygons[0].normal.z < 0:
        o.data.flip_normals()
    return o


def xform(obj, M):
    obj.data.transform(M)
    return obj


def rot_about(px, pz, ang_toward_z):
    """Matrix turning mesh data about a vertical axis at (px, pz) so +x swings toward +z by the angle (radians)."""
    p = Vector((px, -pz, 0))
    return Matrix.Translation(p) @ Matrix.Rotation(-ang_toward_z, 4, 'Z') @ Matrix.Translation(-p)


def brick_row(m, face, plane, sgn, u0, u1, h0, h1, off, rnd, depth=0.11, skip=None, sunk=0.02):
    """One course of stretchers on a straight face. face 'z': bricks run along x on the plane z=plane; 'x': along z on x=plane.
    sgn = which way the face looks. skip(u, h) -> True leaves a brick out (openings); a few bricks sit sunk/spalled."""
    u = u0 - off
    while u < u1 - 0.02:
        a, b = max(u + 0.005, u0), min(u + 0.225, u1)
        if b - a > 0.05 and not (skip and skip((a + b) / 2, (h0 + h1) / 2)):
            j = rnd.uniform(-0.004, 0.003)
            col = jit(BRICK_TONES[rnd.randint(0, 4)], rnd, 0.05)
            if rnd.random() < 0.05:
                j -= sunk
                col = jit(0x7a5444, rnd, 0.05)
            outer, inner = plane + sgn * j, plane - sgn * depth
            hh0, hh1 = h0 + rnd.uniform(0, 0.003), h1 - rnd.uniform(0, 0.003)
            if face == 'z':
                m.box(a, b, inner, outer, hh0, hh1, col)
            else:
                m.box(inner, outer, a, b, hh0, hh1, col)
        u += 0.23


def strips(m, face, plane, sgn, u0, u1, hb_fn, ht_fn, thick, col_fn, w=0.07):
    """Render patch / streak as real proud strips: each ~7 cm strip has its own bottom and top (ragged edges catch light)."""
    n = max(1, int((u1 - u0) / w))
    for i in range(n):
        a, b = u0 + (u1 - u0) * i / n, u0 + (u1 - u0) * (i + 1) / n
        uc = (a + b) / 2
        hb, ht = hb_fn(uc), ht_fn(uc)
        if ht - hb < 0.02:
            continue
        if face == 'z':
            m.box(a, b, plane, plane + sgn * thick, hb, ht, col_fn(uc))
        else:
            m.box(plane, plane + sgn * thick, a, b, hb, ht, col_fn(uc))


# ================================================================ WELL
def build_well(kit, rnd):
    R_IN, R_CORE, R_OUT, H0, HT = 1.95, 2.2, 2.30, 0.16, 0.92
    # apron (chabutra): cement annulus in 10 slabs with crack gaps, one slab sunk and tipped, damp outer skirt
    ap = Multi('apron')
    nseg = 10
    for s in range(nseg):
        a0 = s / nseg * math.tau + 0.006
        a1 = (s + 1) / nseg * math.tau - 0.006
        sink = -0.025 if s == 6 else 0.0
        col = jit(CEMENT if s % 3 else CEMENT_LO, rnd, 0.05)
        for k in range(3):
            b0, b1 = a0 + (a1 - a0) * k / 3, a0 + (a1 - a0) * (k + 1) / 3
            ap.wedge(b0, b1, R_OUT - 0.02, 3.22 + rnd.uniform(-0.03, 0.03), 0.0, 0.15 + sink + rnd.uniform(-0.006, 0.004), col)
    kit.add('plaster', ap.obj(grime=(-0.1, 0.25)))
    # wet splash where the bucket is set down and water is poured, a drain lip out to +x, algae along the lip
    kit.add('plaster', blob('wet_a', 2.55, 1.6, 0.158, 0.55, 0.38, rnd.randint(0, 999)), jit(WET, rnd, 0.04))
    kit.add('plaster', blob('wet_b', 2.9, -0.4, 0.157, 0.30, 0.25, rnd.randint(0, 999)), jit(DAMP, rnd, 0.04))
    kit.add('plaster', wb('drain_l', 3.18, 3.75, -0.24, -0.16, 0.0, 0.11, 0.01), jit(CEMENT_LO, rnd))
    kit.add('plaster', wb('drain_r', 3.18, 3.72, 0.16, 0.24, 0.0, 0.10, 0.01), jit(CEMENT_LO, rnd))
    kit.add('plaster', wb('drain_bed', 3.18, 3.75, -0.16, 0.16, 0.0, 0.03, 0.005), jit(WET, rnd))
    kit.add('plaster', blob('drain_algae', 3.5, 0.0, 0.032, 0.22, 0.10, rnd.randint(0, 999)), jit(ALGAE_DK, rnd))
    kit.add('plaster', blob('drain_mud', 4.05, 0.0, 0.006, 0.45, 0.35, rnd.randint(0, 999)), jit(0x5a4c3c, rnd))
    # washing stone set into the apron
    st = wb('wash_stone', -0.35, 0.35, -0.22, 0.22, 0.14, 0.24, 0.02)
    xform(st, Matrix.Rotation(0.05, 4, 'X'))
    xform(st, Matrix.Rotation(math.radians(200), 4, 'Z') @ Matrix.Translation((2.78, 0, 0)))
    kit.add('plaster', st, jit(0x8f8a80, rnd))
    # parapet: mortar core, modelled brick outer skin, inner render
    core = Multi('par_core')
    N = 48
    for i in range(N):
        core.wedge(i / N * math.tau, (i + 1) / N * math.tau, R_IN + 0.02, R_CORE, H0, HT, jit(MORTAR, rnd, 0.04))
    kit.add('plaster', core.obj())
    br = Multi('par_bricks')
    NB, CH = 60, 0.076
    nc = int((HT - H0) / CH)
    for k in range(nc):
        h0 = H0 + k * CH + 0.005
        h1 = h0 + CH - 0.011
        off = 0.5 if k % 2 else 0.0
        for i in range(NB):
            if rnd.random() < 0.015:
                continue                                               # a brick fallen out: mortar core shows, recessed
            a0 = (i + off) / NB * math.tau + 0.0026
            a1 = (i + off + 1) / NB * math.tau - 0.0026
            j = rnd.uniform(-0.004, 0.004)
            col = jit(BRICK_TONES[rnd.randint(0, 4)], rnd, 0.05)
            if rnd.random() < 0.04:
                j -= 0.018
                col = jit(0x7a5444, rnd, 0.05)
            br.wedge(a0, a1, R_CORE - 0.005, R_OUT + j, h0 + rnd.uniform(0, 0.003), h1 - rnd.uniform(0, 0.003), col)
    kit.add('plaster', br.obj(grime=(H0 - 0.1, 0.18)))
    # old lime render clinging on in three arcs, ragged top, part whitewash part grey
    rp = Multi('par_render')
    for (ac, aw, top) in ((0.6, 1.1, 0.78), (2.7, 0.7, 0.6), (4.4, 1.3, 0.88)):
        n = int(aw * R_OUT / 0.07)
        for i in range(n):
            a0 = ac - aw / 2 + aw * i / n
            a1 = a0 + aw / n
            t = (i + 0.5) / n
            ht = H0 + (top - H0) * (math.sin(t * math.pi) ** 0.6) * (0.75 + 0.25 * math.sin(i * 1.7 + ac * 3)) + rnd.uniform(-0.03, 0.02)
            if ht - H0 < 0.05:
                continue
            col = jit(LIME if math.sin(i * 0.9 + ac) > -0.2 else LIME_GREY, rnd, 0.04)
            rp.wedge(a0, a1, R_OUT + 0.002, R_OUT + 0.02, H0, ht, col)
    kit.add('plaster', rp.obj(grime=(H0 - 0.1, 0.3)))
    # inner face: cement render, wet and dark low down, an algae band at the water line, streaks
    inn = Multi('inner')
    bands = [(-0.05, 0.10, ALGAE_DK), (0.10, 0.35, 0x5d5f57), (0.35, 0.62, 0x777770), (0.62, HT, 0x8a877e)]
    for i in range(N):
        a0, a1 = i / N * math.tau, (i + 1) / N * math.tau
        for (b0, b1, c) in bands:
            cc = jit(c, rnd, 0.06)
            if b0 > 0.3 and math.sin(i * 2.3) > 0.7:
                cc = jit(0x6a6d5c, rnd, 0.05)                         # a green streak running down
            inn.wedge(a0, a1, R_IN, R_IN + 0.025, b0, b1, cc)
    kit.add('plaster', inn.obj(grime=(-0.5, 0.0)))
    # coping: cement, 16 cracked segments, a rounded top course, one knocked chip, a darker wet track where the rope runs
    cp = Multi('coping')
    ns = 16
    for s in range(ns):
        a0 = s / ns * math.tau + 0.004
        a1 = (s + 1) / ns * math.tau - 0.004
        c = jit(CEMENT_HI if s % 2 else CEMENT, rnd, 0.05)
        for k in range(2):
            b0, b1 = a0 + (a1 - a0) * k / 2, a0 + (a1 - a0) * (k + 1) / 2
            cp.wedge(b0, b1, R_IN - 0.03, R_OUT + 0.04, HT, HT + 0.05, c)
            top = HT + 0.08 - (0.02 if s == 11 and k == 0 else 0.0)
            cp.wedge(b0, b1, R_IN - 0.01, R_OUT + 0.02, HT + 0.05, top, jit(WET, rnd, 0.04) if s in (1, 2) else c)
    kit.add('plaster', cp.obj(grime=(-1.0, 0.0)))
    # water: dark, a little green, sits low in the bore (rides the metal draw call for its sheen, as the hand pump puddle)
    kit.add('water', cyl('water', 0, 0, -0.02, 0.06, R_IN + 0.01, R_IN + 0.01, seg=32), 0x2c3530)
    # windlass: two angle-iron A-frames standing on the coping at x = +-2.12, a crossbar, a pulley at the middle
    TOP = HT + 0.08
    XF, HB = 2.12, 2.55
    iron = jit(0x4a4e4c, rnd, 0.05)
    for sx in (-1, 1):
        x = sx * XF
        for sz in (-1, 1):
            kit.add('metal', wb('baseplate', x - 0.07, x + 0.07, sz * 0.40 - 0.07, sz * 0.40 + 0.07, TOP, TOP + 0.012, 0.004), jit(RUST, rnd))
            kit.add('metal', limb('leg', (x, sz * 0.40, TOP), (x, sz * 0.03, HB - 0.02), 0.05, 0.05), iron)
        kit.add('metal', limb('tie', (x, -0.22, TOP + 0.75), (x, 0.22, TOP + 0.75), 0.04, 0.012), iron)
        kit.add('metal', limb('head', (x, -0.07, HB - 0.06), (x, 0.07, HB - 0.06), 0.09, 0.10), jit(RUST, rnd))
    kit.add('metal', limb('crossbar', (-XF - 0.08, 0, HB), (XF + 0.08, 0, HB), 0.06, 0.06), iron)
    kit.add('metal', limb('hanger', (0, 0, HB), (0, 0, HB - 0.24), 0.03, 0.03), jit(RUST, rnd))
    PH, PR = HB - 0.30, 0.15
    kit.add('metal', ring('pulley', 0, 0, PH, PR, 0.025, axis='z'), jit(0x3e4240, rnd))
    kit.add('metal', cyl('hub', 0, -0.04, PH - 0.04, PH + 0.04, 0.04, 0.04, seg=8), jit(RUST, rnd))
    for k in range(4):
        a = k * math.pi / 4
        kit.add('metal', limb('spoke', (-PR * math.cos(a), 0, PH - PR * math.sin(a)), (PR * math.cos(a), 0, PH + PR * math.sin(a)), 0.016, 0.016), jit(0x3e4240, rnd))
    kit.add('metal', limb('fork_l', (0, -0.035, HB - 0.22), (0, -0.035, PH), 0.012, 0.03), iron)
    kit.add('metal', limb('fork_r', (0, 0.035, HB - 0.22), (0, 0.035, PH), 0.012, 0.03), iron)
    # bucket on the coping, rope from the pulley down to its handle, the other end hanging into the well, a coil of slack
    ba = math.radians(38)
    bx, bz = 2.12 * math.cos(ba), 2.12 * math.sin(ba)
    prof = [(0.002, TOP), (0.12, TOP), (0.125, TOP + 0.01), (0.152, TOP + 0.27), (0.16, TOP + 0.278), (0.146, TOP + 0.282), (0.118, TOP + 0.03), (0.002, TOP + 0.03)]
    kit.add('metal', lathe('bucket', bx, bz, prof, seg=18), jit(0x8d9294, rnd, 0.04))
    kit.add('metal', lathe('bucket_band', bx, bz, [(0.137, TOP + 0.12), (0.141, TOP + 0.14)], seg=18, smooth=False), jit(0x6f7374, rnd))
    hpts = []
    for i in range(7):
        t = i / 6 * math.pi
        hpts.append((bx + 0.155 * math.cos(t) * math.cos(ba + 1.57), bz + 0.155 * math.cos(t) * math.sin(ba + 1.57), TOP + 0.27 + 0.16 * math.sin(t)))
    for i in range(6):
        kit.add('metal', limb('handle', hpts[i], hpts[i + 1], 0.012, 0.012), jit(0x6b6f6f, rnd))
    kit.add('plaster', limb('rope_bucket', (PR, 0, PH), (bx, bz, TOP + 0.43), 0.02, 0.02), jit(ROPE, rnd))
    kit.add('plaster', limb('rope_down', (-PR, 0, PH), (-PR - 0.02, 0.03, 0.25), 0.02, 0.02), jit(ROPE, rnd))
    for k in range(3):
        ca = math.radians(52 + k * 2.5)
        kit.add('plaster', ring('rope_coil', 2.13 * math.cos(ca), 2.13 * math.sin(ca), TOP + 0.012 + k * 0.02, 0.13 - k * 0.012, 0.011, axis='y', seg=14, tube=4), jit(ROPE, rnd, 0.08))
    kit.add('plaster', blob('cop_wet', bx, bz, TOP + 0.002, 0.22, 0.16, rnd.randint(0, 999)), jit(WET, rnd))


# ================================================================ FIELD GATE (one pier + its leaf)
def build_gate(kit, rnd, paint, wood, ang_deg, render_skirt=False, L=3.2):
    P = 0.41
    # footing
    kit.add('plaster', wb('footing', -0.6, 0.6, -0.6, 0.6, -0.05, 0.12, 0.02), jit(CEMENT_LO, rnd))
    kit.add('plaster', wb('footing_chip', 0.45, 0.6, -0.6, -0.45, 0.06, 0.125, 0.01), jit(0x9a958a, rnd))
    # pier: mortar core + modelled brick courses, corners alternate per course
    kit.add('plaster', wb('pier_core', -P + 0.012, P - 0.012, -P + 0.012, P - 0.012, 0.12, 1.62, 0.004), jit(MORTAR, rnd, 0.04))
    br = Multi('pier_bricks')
    CH = 0.076
    for k in range(int(1.5 / CH)):
        h0 = 0.12 + k * CH + 0.005
        h1 = h0 + CH - 0.011
        off = 0.115 if k % 2 else 0.0
        full, short = (-P, P), (-P + 0.11, P - 0.11)
        zr, xr = (full, short) if k % 2 == 0 else (short, full)
        brick_row(br, 'z', P, 1, zr[0], zr[1], h0, h1, off, rnd)
        brick_row(br, 'z', -P, -1, zr[0], zr[1], h0, h1, off, rnd)
        brick_row(br, 'x', P, 1, xr[0], xr[1], h0, h1, off, rnd)
        brick_row(br, 'x', -P, -1, xr[0], xr[1], h0, h1, off, rnd)
    kit.add('plaster', br.obj(grime=(0.0, 0.2)))
    # cap: cement slab + pyramid, chipped edge
    kit.add('plaster', wb('cap', -P - 0.06, P + 0.06, -P - 0.06, P + 0.06, 1.62, 1.70, 0.015), jit(CEMENT, rnd))
    cm = Multi('cap_top')
    q = [(-P - 0.04, -P - 0.04), (P + 0.04, -P - 0.04), (P + 0.04, P + 0.04), (-P - 0.04, P + 0.04)]
    cm.hexa([(x, z, 1.70) for x, z in q] + [(x * 0.18, z * 0.18, 1.86) for x, z in q], jit(CEMENT_HI, rnd))
    kit.add('plaster', cm.obj(grime=(-1, 0)))
    # rain streaks under the cap on every face, grey-black, ragged lower ends; mud splash at the foot
    sk = Multi('streaks')
    ph = rnd.uniform(0, 6)
    for face, plane, sgn in (('z', P, 1), ('z', -P, -1), ('x', P, 1), ('x', -P, -1)):
        strips(sk, face, plane, sgn, -P + 0.03, P - 0.03, lambda u: 1.62 - 0.15 - 0.45 * max(0.0, math.sin(u * 17 + ph + plane * 5)) ** 2, lambda u: 1.615, 0.003,
               lambda u: jit(0x5e5650, rnd, 0.06), w=0.05)
        strips(sk, face, plane, sgn, -P + 0.02, P - 0.02, lambda u: 0.12, lambda u: 0.2 + 0.12 * max(0.0, math.sin(u * 11 + ph)) , 0.003, lambda u: jit(MUD, rnd, 0.06), w=0.06)
    kit.add('plaster', sk.obj(grime=(-1, 0)))
    if render_skirt:
        rs = Multi('render_skirt')
        for face, plane, sgn in (('z', P, 1), ('x', -P, -1), ('z', -P, -1)):
            strips(rs, face, plane, sgn, -P - 0.005, P + 0.005, lambda u: 0.12, lambda u: 0.55 + 0.18 * math.sin(u * 9 + plane * 3) + 0.06 * math.sin(u * 31), 0.012,
                   lambda u: jit(CEMENT if math.sin(u * 13) > -0.4 else CEMENT_LO, rnd, 0.04), w=0.06)
        kit.add('plaster', rs.obj(grime=(0.0, 0.3)))
    # hinge pintles on the +x face
    HX = P + 0.09
    for h in (0.42, 1.22):
        kit.add('metal', limb('pintle', (P - 0.05, 0, h), (HX, 0, h), 0.03, 0.03), jit(RUST, rnd))
        kit.add('metal', limb('pin', (HX, 0, h - 0.06), (HX, 0, h + 0.05), 0.025, 0.025), jit(0x3e3a36, rnd))
    # ---- leaf, built closed along +x, then sagged and swung open about the hinge
    start = len(kit.records)
    x0, x1 = HX, HX + L
    B, T = 0.16, 1.34
    PNT = jit(paint, rnd, 0.04)
    kit.add('metal', limb('stile_h', (x0, 0, B - 0.03), (x0, 0, T + 0.03), 0.06, 0.06), PNT)
    kit.add('metal', limb('stile_l', (x1, 0, B - 0.02), (x1, 0, T + 0.02), 0.05, 0.05), PNT)
    kit.add('metal', limb('rail_t', (x0, 0, T), (x1, 0, T), 0.055, 0.055), PNT)
    kit.add('metal', limb('rail_m', (x0, 0, 0.74), (x1, 0, 0.74), 0.045, 0.05), PNT)
    kit.add('metal', limb('rail_b', (x0, 0, B), (x1, 0, B), 0.05, 0.05), PNT)
    kit.add('metal', limb('brace', (x0 + 0.04, 0, 0.78), (x1 - 0.05, 0, T - 0.03), 0.05, 0.012), PNT)
    n = int(L / 0.16)
    for i in range(1, n):
        x = x0 + L * i / n
        if rnd.random() < 0.06:
            continue                                                   # a bar gone
        kit.add('metal', limb('bar', (x, 0, 0.76), (x, 0, T - 0.02), 0.018, 0.018), PNT)
    kit.add('wood', wb('panel', x0 + 0.03, x1 - 0.03, -0.017, 0.017, B + 0.02, 0.72, 0.004), jit(wood, rnd, 0.05))
    for i in range(1, int(L / 0.42)):
        x = x0 + 0.42 * i
        for h in (B + 0.05, 0.69):
            kit.add('metal', wb('bolt', x - 0.012, x + 0.012, -0.03, 0.03, h - 0.012, h + 0.012, 0.0, 1), jit(RUST, rnd))
    kit.add('metal', limb('drop_bolt', (x1 - 0.06, 0.035, 0.05), (x1 - 0.06, 0.035, 0.62), 0.022, 0.022), jit(RUST, rnd))
    kit.add('metal', ring('hasp', x1 + 0.04, 0, 1.0, 0.05, 0.01, axis='x'), jit(RUST, rnd))
    mm = Multi('leaf_mud')
    for sgn in (1, -1):
        strips(mm, 'z', 0.019 * sgn, sgn, x0 + 0.05, x1 - 0.05, lambda u: B + 0.02, lambda u: B + 0.08 + 0.10 * max(0.0, math.sin(u * 5.3 + sgn)) ** 2, 0.003, lambda u: jit(MUD, rnd, 0.06), w=0.08)
    kit.add('plaster', mm.obj(grime=(-1, 0)))
    sag = Matrix.Translation((x0, 0, T)) @ Matrix.Rotation(math.radians(0.9), 4, 'Y') @ Matrix.Translation((-x0, 0, -T))
    M = rot_about(x0, 0.0, math.radians(ang_deg)) @ sag
    for _, o, _ in kit.records[start:]:
        xform(o, M)
    # the brick wedged under the free end to hold it open
    a = math.radians(ang_deg)
    ex, ez = x0 + (L - 0.15) * math.cos(a), (L - 0.15) * math.sin(a)
    bw = wb('wedge_brick', -0.115, 0.115, -0.055, 0.055, 0.0, 0.075, 0.006)
    xform(bw, Matrix.Translation((ex, -ez - 0.12, 0)) @ Matrix.Rotation(a + 0.4, 4, 'Z'))
    kit.add('plaster', bw, jit(BRICK_TONES[2], rnd))


# ================================================================ FIELD SHRINE
def build_shrine(kit, rnd):
    # platform 3.0 x 2.3, steps to +z, lime plaster sides fading to grey, cement top with a slight overhang
    pl = Multi('platform')
    pl.box(-1.5, 1.5, -1.5, 0.8, 0.0, 0.42, jit(LIME_DIRTY, rnd))
    kit.add('plaster', pl.obj(grime=(0.0, 0.32)))
    kit.add('plaster', wb('plat_top', -1.53, 1.53, -1.53, 0.83, 0.42, 0.47, 0.015), jit(CEMENT, rnd))
    kit.add('plaster', wb('step2', -0.7, 0.7, 0.8, 1.15, 0.0, 0.30, 0.015), jit(CEMENT_LO, rnd))
    kit.add('plaster', wb('step1', -0.75, 0.75, 1.15, 1.5, 0.0, 0.15, 0.015), jit(CEMENT, rnd))
    kit.add('plaster', blob('step_worn', 0.0, 1.3, 0.152, 0.3, 0.12, rnd.randint(0, 999)), jit(0x9a968c, rnd))
    kit.add('plaster', blob('step2_worn', 0.0, 0.97, 0.302, 0.28, 0.1, rnd.randint(0, 999)), jit(0x9a968c, rnd))
    # knocked front-left corner: plaster gone, modelled bricks inside
    kit.add('plaster', wb('corner_hole', -1.52, -1.25, 0.58, 0.83, 0.05, 0.30, 0.004), jit(MORTAR, rnd))
    cb = Multi('corner_bricks')
    for k in range(3):
        h0 = 0.06 + k * 0.076
        brick_row(cb, 'z', 0.81, 1, -1.50, -1.27, h0, h0 + 0.064, 0.1 * k, rnd, depth=0.1)
        brick_row(cb, 'x', -1.51, -1, 0.60, 0.80, h0, h0 + 0.064, 0.07 * k, rnd, depth=0.1)
    kit.add('plaster', cb.obj(grime=(0.0, 0.2)))
    # whitewash flaking on the platform faces: patches of fresher lime over the grey base, ragged
    ww = Multi('limewash')
    strips(ww, 'z', 0.8, 1, -1.2, 1.45, lambda u: 0.06 + 0.05 * max(0.0, math.sin(u * 7)), lambda u: 0.40 - 0.12 * max(0.0, math.sin(u * 4.1 + 1)) ** 3, 0.004, lambda u: jit(LIME, rnd, 0.03))
    strips(ww, 'x', 1.5, 1, -1.45, 0.75, lambda u: 0.08, lambda u: 0.39 - 0.2 * max(0.0, math.sin(u * 3.3)) ** 4, 0.004, lambda u: jit(LIME, rnd, 0.03))
    strips(ww, 'x', -1.5, -1, -1.45, 0.55, lambda u: 0.1, lambda u: 0.38 - 0.25 * max(0.0, math.sin(u * 2.7 + 2)) ** 4, 0.004, lambda u: jit(LIME, rnd, 0.03))
    kit.add('plaster', ww.obj(grime=(0.0, 0.25)))
    for (x, z) in ((-1.5, -1.5), (1.5, -1.5), (1.5, 0.8)):
        kit.add('plaster', blob('moss', x, z, 0.004, 0.32, 0.28, rnd.randint(0, 999)), jit(ALGAE_DK, rnd))
    # devsthan: back block + a front frame with an arched niche (real recess), stepped top, finial
    Y0 = 0.47
    body = Multi('devsthan')
    LW = jit(LIME, rnd, 0.03)
    body.box(-0.6, 0.6, -1.3, -0.75, Y0, 1.56, LW)
    body.box(-0.6, -0.22, -0.75, -0.45, Y0, 1.56, LW)
    body.box(0.22, 0.6, -0.75, -0.45, Y0, 1.56, LW)
    body.box(-0.22, 0.22, -0.75, -0.45, Y0, 0.76, LW)
    ns = 9
    for i in range(ns):
        xa, xb = -0.22 + 0.44 * i / ns, -0.22 + 0.44 * (i + 1) / ns
        xc = (xa + xb) / 2
        h = 1.18 + math.sqrt(max(0.0, 0.22 ** 2 - xc ** 2))
        body.box(xa, xb, -0.75, -0.45, h, 1.56, LW)
    kit.add('plaster', body.obj(grime=(Y0, 0.25)))
    kit.add('plaster', wb('niche_back', -0.22, 0.22, -0.76, -0.74, 0.76, 1.42, 0.0, 1), jit(0x8a8174, rnd))
    kit.add('plaster', wb('niche_soot', -0.2, 0.2, -0.745, -0.73, 1.08, 1.40, 0.0, 1), jit(SOOT, rnd))
    kit.add('plaster', wb('sill', -0.3, 0.3, -0.75, -0.38, 0.72, 0.77, 0.008), jit(CEMENT_HI, rnd))
    kit.add('plaster', blob('oil_stain', 0.0, -0.6, 0.772, 0.12, 0.08, rnd.randint(0, 999)), jit(0x5a5048, rnd))
    sm = Multi('soot_above')
    strips(sm, 'z', -0.45, 1, -0.16, 0.16, lambda u: 1.36, lambda u: 1.50 - 0.2 * abs(u) + 0.03 * math.sin(u * 40), 0.003, lambda u: jit(0x6d665e, rnd, 0.05), w=0.04)
    kit.add('plaster', sm.obj(grime=(-1, 0)))
    dprof = [(0.002, 0.77), (0.03, 0.77), (0.05, 0.79), (0.058, 0.81), (0.045, 0.808), (0.025, 0.79), (0.002, 0.79)]
    kit.add('plaster', lathe('diya', 0.0, -0.58, dprof, seg=12), jit(0xa3603c, rnd))
    kit.add('plaster', limb('wick', (0.035, -0.58, 0.80), (0.05, -0.58, 0.815), 0.008, 0.008), jit(SOOT, rnd))
    # rain streaks down the front from the cornice
    rs = Multi('streaks')
    strips(rs, 'z', -0.45, 1, -0.58, -0.25, lambda u: 1.56 - 0.5 * max(0.0, math.sin(u * 19)) ** 2 - 0.1, lambda u: 1.555, 0.002, lambda u: jit(0x9f998c, rnd, 0.05), w=0.03)
    strips(rs, 'z', -0.45, 1, 0.25, 0.58, lambda u: 1.56 - 0.6 * max(0.0, math.sin(u * 23 + 1)) ** 2 - 0.1, lambda u: 1.555, 0.002, lambda u: jit(0x9f998c, rnd, 0.05), w=0.03)
    kit.add('plaster', rs.obj(grime=(-1, 0)))
    # top: cornice, three receding tiers, a round finial; faded ochre band on the cornice
    kit.add('plaster', wb('cornice', -0.68, 0.68, -1.38, -0.37, 1.56, 1.63, 0.012), jit(0xc6a46c, rnd))
    for k, (w, d) in enumerate(((0.55, 0.42), (0.42, 0.32), (0.28, 0.22))):
        h0 = 1.63 + k * 0.12
        kit.add('plaster', wb('tier', -w, w, -0.875 - d, -0.875 + d, h0, h0 + 0.12, 0.012), jit(LIME if k != 1 else LIME_DIRTY, rnd))
    kit.add('plaster', lathe('finial', 0.0, -0.875, [(0.002, 1.99), (0.10, 1.99), (0.12, 2.04), (0.09, 2.10), (0.035, 2.13), (0.05, 2.17), (0.002, 2.24)], seg=14), jit(0xb9955f, rnd))
    # the plain stone in front of the niche
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.0)
    for v in bm.verts:
        k = 1.0 + 0.08 * math.sin(v.co.x * 5 + v.co.y * 3) + 0.05 * math.sin(v.co.z * 7)
        v.co = Vector((v.co.x * 0.15 * k, v.co.y * 0.12 * k, max(-0.2, v.co.z) * 0.17 * k))
    bmesh.ops.translate(bm, vec=(0.0, 0.25, Y0 + 0.03), verts=bm.verts)
    stone = new_bmesh_obj('stone', bm)
    for p in stone.data.polygons:
        p.use_smooth = True
    kit.add('plaster', stone, jit(0x8a8478, rnd))
    # pole with a faded pennant at the back-right corner
    kit.add('metal', limb('pole', (1.28, -1.28, Y0), (1.28, -1.28, 3.3), 0.035, 0.035), jit(0x5a5c58, rnd))
    fm = Multi('pennant')
    fm.hexa([(1.30, -1.28, 3.25), (1.30, -1.28 + 0.005, 3.25), (1.30, -1.28 + 0.005, 2.92), (1.30, -1.28, 2.92),
             (1.98, -1.18, 3.12), (1.98, -1.18 + 0.005, 3.12), (1.98, -1.18 + 0.005, 3.10), (1.98, -1.18, 3.10)], jit(0xc48a52, rnd))
    kit.add('plaster', fm.obj(grime=(-1, 0)))


# ================================================================ CULVERT END (headwall + parapet + wing walls)
def build_culvert(kit, rnd, worn=False):
    HW = 1.35
    PC_H, PR_IN, PR_OUT = -0.25, 0.45, 0.53
    skip = lambda u, h: math.hypot(u, h - PC_H) < PR_OUT + 0.03
    kit.add('plaster', wb('hw_core', -HW + 0.01, HW - 0.01, -0.32, -0.1, -0.45, 0.24, 0.004), jit(MORTAR, rnd))
    br = Multi('hw_bricks')
    for k in range(7):
        h0 = -0.30 + k * 0.076
        brick_row(br, 'z', 0.0, 1, -HW, HW, h0, h0 + 0.064, 0.115 * (k % 2), rnd, skip=skip)
    kit.add('plaster', br.obj(grime=(0.0, 0.35)))
    kit.add('plaster', wb('pipe_mortar', -0.62, 0.62, -0.12, -0.02, -0.40, 0.33, 0.0, 1), jit(CEMENT_LO, rnd))
    # hume pipe mouth: concrete ring proud of the headwall, dark bore, wet lip
    pipe = Multi('pipe')
    n = 20
    for i in range(n):
        a0, a1 = i / n * math.tau, (i + 1) / n * math.tau
        if worn and i == 3:
            a1 -= 0.05                                                # crack through the ring
        c = jit(0x9b978c if math.sin(a0) > -0.3 else 0x7c7a70, rnd, 0.04)
        q = [(PR_IN, a0), (PR_OUT, a0), (PR_OUT, a1), (PR_IN, a1)]
        pipe.hexa([(r * math.cos(a), -1.2, PC_H + r * math.sin(a)) for r, a in q] + [(r * math.cos(a), 0.10, PC_H + r * math.sin(a)) for r, a in q], c)
    kit.add('plaster', pipe.obj(grime=(-0.25, 0.4)))
    kit.add('plaster', wb('bore_dark', -0.46, 0.46, -1.2, -1.15, -0.7, 0.2, 0.0, 1), jit(0x302e2a, rnd))
    # parapet: plastered, whitewash, cement coping, banded end posts
    par = Multi('parapet')
    par.box(-HW, HW, -0.32, -0.02, 0.22, 0.72, jit(LIME_DIRTY if not worn else LIME_GREY, rnd))
    kit.add('plaster', par.obj(grime=(0.22, 0.3)))
    ww = Multi('limewash')
    top = lambda u: 0.70 - (0.30 if worn else 0.08) * max(0.0, math.sin(u * 3.1 + 0.5)) ** 2
    bot = lambda u: 0.24 + (0.16 if worn else 0.04) * max(0.0, math.sin(u * 5.7)) ** 2
    strips(ww, 'z', -0.02, 1, -HW + 0.18, HW - 0.18, bot, top, 0.004, lambda u: jit(LIME, rnd, 0.03))
    strips(ww, 'z', -0.32, -1, -HW + 0.18, HW - 0.18, bot, top, 0.004, lambda u: jit(LIME, rnd, 0.03))
    strips(ww, 'z', -0.325, -1, -HW + 0.2, HW - 0.2, lambda u: 0.22, lambda u: 0.30 + 0.1 * max(0.0, math.sin(u * 4.3)) ** 2, 0.003, lambda u: jit(MUD, rnd, 0.05))   # road splash
    kit.add('plaster', ww.obj(grime=(0.22, 0.2)))
    cp = Multi('coping')
    segs = [(-HW - 0.03, -0.45), (-0.45, 0.45), (0.45, HW + 0.03)]
    for si, (a, b) in enumerate(segs):
        if worn and si == 1:
            # block gone: the brick course under it shows
            for k in range(2):
                brick_row(cp, 'z', -0.03, 1, a + 0.01, b - 0.01, 0.72 + k * 0.03, 0.72 + k * 0.03 + 0.026, 0.1 * k, rnd, depth=0.28)
            continue
        cp.box(a + 0.006, b - 0.006, -0.35, 0.01, 0.72, 0.80 - rnd.uniform(0, 0.008), jit(CEMENT if si != 2 else CEMENT_LO, rnd))
    kit.add('plaster', cp.obj(grime=(-1, 0)))
    for sx in (-1, 1):
        x0, x1 = sorted((sx * (HW - 0.0), sx * (HW + 0.32)))
        post = Multi('post')
        post.box(x0, x1, -0.36, 0.02, 0.0, 0.92, jit(LIME if not worn else LIME_GREY, rnd))
        kit.add('plaster', post.obj(grime=(0.0, 0.35)))
        for hb in (0.25, 0.62):
            bd = Multi('band')
            bd.box(x0 - 0.004, x1 + 0.004, -0.364, 0.024, hb, hb + 0.14, jit(0x3a3734 if not worn else 0x56524d, rnd, 0.05))
            kit.add('plaster', bd.obj(grime=(-1, 0)))
        kit.add('plaster', wb('post_cap', x0 - 0.02, x1 + 0.02, -0.38, 0.04, 0.92, 0.97, 0.01), jit(CEMENT, rnd))
        # splayed wing wall: from the post out along +z at 40 deg, top sloping down, cement render, algae low
        wing = Multi('wing')
        L, a = 1.0, math.radians(40)
        ux, uz = sx * math.sin(a), math.cos(a)
        bx, bz = sx * (HW + 0.16), 0.02
        nx, nz = uz * sx, -ux * sx
        t = 0.12
        pts_b = [(bx - nx * t, bz - nz * t), (bx + nx * t, bz + nz * t), (bx + nx * t + ux * L, bz + nz * t + uz * L), (bx - nx * t + ux * L, bz - nz * t + uz * L)]
        wing.hexa([(x, z, -0.4) for x, z in pts_b] + [(pts_b[0][0], pts_b[0][1], 0.6), (pts_b[1][0], pts_b[1][1], 0.6), (pts_b[2][0], pts_b[2][1], 0.12), (pts_b[3][0], pts_b[3][1], 0.12)], jit(CEMENT_LO, rnd))
        kit.add('plaster', wing.obj(grime=(0.0, 0.4)))
    for k in range(2 if not worn else 4):
        kit.add('plaster', blob('algae', rnd.uniform(-1.0, 1.0), rnd.uniform(0.1, 0.5), 0.004 + 0.001 * k, rnd.uniform(0.2, 0.4), rnd.uniform(0.12, 0.25), rnd.randint(0, 999)), jit(ALGAE if k % 2 else ALGAE_DK, rnd))
    for k in range(5):
        s = rnd.uniform(0.04, 0.09)
        x, z = rnd.uniform(-1.2, 1.2), rnd.uniform(0.15, 0.7)
        kit.add('plaster', wb('pebble', x - s, x + s, z - s * 0.8, z + s * 0.8, 0.0, s * 0.9, 0.012, 1), jit(0x857c70, rnd, 0.1))


# ================================================================ assembly: one Kit per root, all exported in one GLB
ROOTS = [
    ('well', lambda k, r: build_well(k, r), ('metal',), {'water': 'metal'}, 101),
    ('field_gate', lambda k, r: build_gate(k, r, 0x5d7280, 0x8a7458, 80), ('metal', 'wood'), {}, 202),
    ('field_gate_b', lambda k, r: build_gate(k, r, 0x7a4636, 0x9c8a6c, 105, render_skirt=True), ('metal', 'wood'), {}, 203),
    ('field_shrine', lambda k, r: build_shrine(k, r), ('metal',), {}, 303),
    ('culvert', lambda k, r: build_culvert(k, r, worn=False), (), {}, 404),
    ('culvert_b', lambda k, r: build_culvert(k, r, worn=True), (), {}, 405),
]


def build_all():
    arch.clear_scene()
    _clear, _export = arch.clear_scene, arch.export_glb
    empties, tris = [], {}
    for name, fn, own, route, seed in ROOTS:
        captured = []
        arch.clear_scene = lambda: None
        arch.export_glb = lambda objs, out: captured.extend(objs)
        kit = Kit(split_props=False, own=own, route=route)
        fn(kit, random.Random(seed))
        kit.finalize('unused', {}, drift_amp=0.06, ao_strength=0.5)
        FACECOLS.clear()
        GRIME.clear()
        e = bpy.data.objects.new(name, None)
        bpy.context.collection.objects.link(e)
        for o in captured:
            o.name = name + '_' + o.name.split('.')[0]
            o.parent = e
        tris[name] = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in captured)
        empties.append((e, captured))
    arch.clear_scene, arch.export_glb = _clear, _export
    # one material per library set across all roots (each Kit made its own copy)
    canon = {}
    for _, objs in empties:
        for o in objs:
            for slot in o.material_slots:
                base = slot.material.name.split('.')[0]
                canon.setdefault(base, slot.material)
                slot.material = canon[base]
    for k, v in tris.items():
        print('ROOT tris', k, v)
    return empties


def export(empties):
    out = os.path.join(ROOT, 'tmp', 'field_props_raw.glb')
    bpy.ops.object.select_all(action='DESELECT')
    objs = []
    for e, children in empties:
        objs.append(e)
        objs.extend(children)
    export_glb(objs, out)


def render(empties):
    from mathutils import Vector as V
    layout = {'well': (0, 0), 'field_gate': (-4.6, 5.4), 'field_gate_b': (6.6, 5.4), 'field_shrine': (7.5, -2.5), 'culvert': (-7.5, -1.5), 'culvert_b': (-7.5, 3.0)}
    for e, _ in empties:
        x, z = layout[e.name]
        e.location = (x, -z, 0)
    rot = {'field_gate_b': math.pi}
    for e, _ in empties:
        e.rotation_euler = (0, 0, rot.get(e.name, 0.0))
    for m in bpy.data.materials:
        if m.node_tree:
            for nd in m.node_tree.nodes:
                if nd.type == 'MIX_RGB' and nd.blend_type == 'MULTIPLY':
                    nd.inputs['Fac'].default_value = 1.0
    gm = load_pbr_material('ground', 'dryearth', repeat=(0.5, 0.5))
    bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, -0.001))
    g = bpy.context.active_object
    g.data.materials.append(gm)
    box_uv(g, (1, 1, 1))
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = 48
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
    d = os.path.join(ROOT, 'docs', 'shots', 'assets-field_props')
    os.makedirs(d, exist_ok=True)
    shots = [('a_all', (2.0, -17.0, 8.0), (0.0, -1.0, 0.6), 30, (50, 0, 30)),
             ('b_well_close', (3.5, -6.0, 2.6), (0.0, 0.0, 0.9), 35, (55, 0, 40)),
             ('c_gate_shrine_culvert', (-1.0, -12.0, 2.4), (-1.5, -2.5, 0.7), 26, (60, 0, -35))]
    for name, loc, look, lens, sun_rot in shots:
        sun.rotation_euler = tuple(math.radians(x) for x in sun_rot)
        cam.location = loc
        cam.data.lens = lens
        cam.rotation_euler = (V(look) - V(loc)).to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = os.path.join(d, name + '.png')
        bpy.ops.render.render(write_still=True)
        shutil.copy(sc.render.filepath, os.path.join(ROOT, 'tmp', 'field_props_' + name + '.png'))
        print('rendered', sc.render.filepath)


if __name__ == '__main__':
    which = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'build'
    em = build_all()
    if which == 'render':
        render(em)
    else:
        export(em)
