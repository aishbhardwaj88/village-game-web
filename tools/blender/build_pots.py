"""
Village pots (J0 27 Oct playthrough note, PARALLEL.md wave 2 item 5): matka, ghada, surahi, kulhad, three variants each.
Run: tools/blender/make_pots.sh            (writes public/assets/models/pot_<type>_v2.glb = variant a, the slot src/pots.js already loads,
                                            plus pot_<type>_v2_b.glb and pot_<type>_v2_c.glb for per-instance variety)
     Blender -b --python tools/blender/build_pots.py -- render   (preview shots into docs/shots/assets-pots/)
Local frame: origin at the base centre, upright, real sizes (matka ~0.6-0.7 m, ghada ~0.45 m, surahi ~0.45 m, kulhad ~0.09 m).
Each file is ONE mesh on ONE material, so the game's merge-per-material keeps a whole pot cluster to one draw call per set.

Clay = the frozen lime-plaster set (matte, roughness from the scan; no glaze shine), on the 'paint' kind -> hb_main.
Steel ghada = the shared 'metal' set (kind 'steel' routed to the metal group, so rust_steel's corrosion is NOT applied: it is stainless).
What makes it clay is MODELLED: never a perfect lathe (angle+height wobble), throwing ridges on neck and shoulder, a thick rolled rim
with real chips (rim vertices dropped and pushed in), a kulhad's hand-squashed tilted lip, dents on the steel.
Weathering is per-vertex colour: dust on the up-facing shoulder, a dark seeping wet zone with a ragged edge low on the belly, pale salt
bloom just above it, black fire-clouds from the open kiln, fresh pale clay in every chip, dark damp mouth, grimy foot.
Per-loop colours are injected through a tiny wrapper on arch.colorize (this file only; arch.py is not edited).
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from mathutils import Vector, Matrix
from common import ROOT, hex_to_linear_rgb, wb
import arch
from arch import Kit, lathe

# ---------------------------------------------------------------- per-loop colour injection
POT_COLS = {}
_orig_colorize = arch.colorize


def _colorize(obj, hex_color, attr='Col'):
    _orig_colorize(obj, hex_color, attr)
    cols = POT_COLS.get(obj.name)
    if cols and attr == 'Base':
        obj.data.color_attributes[attr].data.foreach_set('color', cols)
    return obj


arch.colorize = _colorize


def lin(h):
    return Vector(hex_to_linear_rgb(h))


def mix(a, b, t):
    t = max(0.0, min(1.0, t))
    return a * (1 - t) + b * t


def smooth(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


# ---------------------------------------------------------------- profile + geometry
def densify(prof, step):
    """Split long profile segments so wobble, ridges, wet edge and painted lines have rings to live on."""
    out = [prof[0]]
    for (r0, h0), (r1, h1) in zip(prof, prof[1:]):
        n = max(1, int(math.ceil(math.hypot(r1 - r0, h1 - h0) / step)))
        for k in range(1, n + 1):
            out.append((r0 + (r1 - r0) * k / n, h0 + (h1 - h0) * k / n))
    return out


def pot_mesh(name, spec, rnd):
    """Lathe the profile, then hand-make it: wobble, throwing ridges, tilted lip, chips, dents. Returns (obj, seg, top_index, height)."""
    prof = densify(spec['prof'], spec.get('step', 0.03))
    top_i = max(range(len(prof)), key=lambda i: prof[i][1])
    H = prof[top_i][1]
    seg = spec['seg']
    obj = lathe(name, 0, 0, prof, seg=seg)
    p = [rnd.uniform(0, math.tau) for _ in range(6)]
    amp = spec.get('wobble', 0.01)
    ridge = spec.get('ridge')            # (h0, h1, period, amplitude) on the outer wall
    tilt = spec.get('tilt', 0.0)         # rim plane tilt (kulhad: thumb-pressed, never level)
    chips = spec.get('chips', [])        # (angle, half-width rad, depth m)
    dents = spec.get('dents', [])        # (angle, height, radius m, depth fraction)
    for v in obj.data.vertices:
        ring = v.index // seg if v.index < len(prof) * seg else None
        r = math.hypot(v.co.x, v.co.y)
        if r < 1e-6 or ring is None:
            continue
        a = math.atan2(v.co.y, v.co.x)
        z = v.co.z
        outer = ring <= top_i
        k = 1.0 + amp * (math.sin(2 * a + p[0] + z * 9) * 0.6 + math.sin(3 * a + p[1]) * 0.4 + math.sin(5 * a + z * 17 + p[2]) * 0.25)
        if ridge and outer and ridge[0] < z < ridge[1]:
            k += ridge[3] * 0.003 * math.sin(z / ridge[2] * math.tau + p[3]) / max(r, 0.02)   # ~1 mm throwing ridges
        for a0, zc, rad, depth in dents:
            d = abs(((a - a0 + math.pi) % math.tau) - math.pi) * r
            k -= depth * math.exp(-(d * d + (z - zc) ** 2) / (rad * rad))
        v.co.x *= k
        v.co.y *= k
        if tilt:
            v.co.z += tilt * math.cos(a - p[4]) * smooth(H * 0.5, H, z) * H
        for a0, w, depth in chips:
            if z > H - depth * 1.6:
                d = abs(((a - a0 + math.pi) % math.tau) - math.pi)
                if d < w:
                    f = (1 - d / w) ** 0.7 * smooth(H - depth * 1.6, H, z)
                    v.co.z -= depth * f
                    s = 1 - 0.18 * f * (1 if outer else -1) * depth / max(r, 0.02)
                    v.co.x *= s
                    v.co.y *= s
    obj.data.update()
    return obj, seg, top_i, H, len(prof)


def noise(a, z, p, f=1.0):
    return (math.sin(2 * a + p[0] + z * 11 * f) * 0.5 + math.sin(3 * a - z * 23 * f + p[1]) * 0.3 + math.sin(7 * a + z * 41 * f + p[2]) * 0.2)


def clay_colours(obj, seg, top_i, H, nring, spec, rnd):
    """Weathering in vertex colour, per loop (linear RGB)."""
    me = obj.data
    base = lin(spec['tone'])
    p = [rnd.uniform(0, math.tau) for _ in range(9)]
    dust = lin(0xC4AA90)
    salt = lin(0xCFC6B6)
    fresh = lin(spec.get('fresh', 0xD39A72))
    soot = lin(0x463830)
    grime = lin(0x5E4C3E)
    wet_h = spec.get('wet', 0.0)
    salt_amt = spec.get('salt', 0.0)
    fire = spec.get('fire', 0.0)
    lines = [(lin(c), h0, h1) for c, h0, h1 in spec.get('lines', [])]
    chips = spec.get('chips', [])
    steel = spec.get('steel', False)
    vcol = []
    for v in me.vertices:
        ring = v.index // seg if v.index < nring * seg else (0 if v.co.z < H / 2 else nring - 1)
        outer = ring <= top_i
        a = math.atan2(v.co.y, v.co.x)
        z = v.co.z
        r = math.hypot(v.co.x, v.co.y)
        nz = v.normal.z
        c = base * (1 + 0.05 * (rnd.random() - 0.5) * 2)                        # grain: per-vertex clay speckle
        c = c * (1 + 0.06 * noise(a, z, p[0:3], 0.6))                            # uneven firing / sun fade
        for lc, h0, h1 in lines:                                                 # painted slip lines (matte, hand-wobbly edge)
            e = 0.004 * math.sin(3 * a + p[8])
            if outer and h0 + e < z < h1 + e:
                c = mix(c, lc * (1 + 0.08 * noise(a, z, p[3:6], 2)), 0.8)
        if fire and outer:                                                       # open-kiln fire clouds
            c = mix(c, soot, fire * smooth(0.35, 0.85, noise(a, z, p[3:6], 0.5)))
        if wet_h and outer:                                                      # seep line: ragged, darker, a little more saturated
            edge = wet_h * (1 + 0.28 * noise(a, z * 0.2, p[6:9], 0.3))
            w = 1 - smooth(edge - 0.03, edge + 0.01, z)
            c = mix(c, Vector((c.x * 0.5, c.y * 0.43, c.z * 0.4)), w)
            if salt_amt:
                band = smooth(edge - 0.01, edge + 0.025, z) * (1 - smooth(edge + 0.03, edge + 0.09, z))
                c = mix(c, salt, 0.6 * salt_amt * band * smooth(0.25, 0.75, noise(a, z, p[3:6], 3)))   # patchy, never a full band
        if outer and nz > 0.15 and not steel:                                    # dust settles on the up-facing shoulder
            c = mix(c, dust, 0.32 * smooth(0.15, 0.9, nz))
        if not outer:                                                            # mouth/interior: damp and in shadow
            c = c * (0.5 if not steel else 0.7)
        if z > H - 0.012:                                                        # handled rim: a touch lighter
            c = c * 1.06
        for a0, w, depth in chips:                                               # a chip shows fresh unfired-looking clay
            d = abs(((a - a0 + math.pi) % math.tau) - math.pi)
            if d < w * 1.1 and z > H - depth * 2.2:
                c = mix(c, fresh, 0.85 * (1 - d / (w * 1.1)))
        if z < 0.012 and outer:                                                  # foot: ground grime
            c = mix(c, grime, 0.55)
        vcol.append(Vector((min(c.x, 0.85), min(c.y, 0.85), min(c.z, 0.85))))
    cols = []
    for lp in me.loops:
        c = vcol[lp.vertex_index]
        cols += [c.x, c.y, c.z, 1.0]
    POT_COLS[obj.name] = cols


def steel_colours(obj, seg, top_i, H, nring, spec, rnd):
    """Stainless ghada: dull brushed grey, hard-water spots and a chalky tide line, grimy foot, darker mouth."""
    me = obj.data
    base = lin(spec['tone'])
    p = [rnd.uniform(0, math.tau) for _ in range(9)]
    spot = lin(0xC9C8C0)
    grime = lin(0x5A574F)
    vcol = []
    for v in me.vertices:
        ring = v.index // seg if v.index < nring * seg else (0 if v.co.z < H / 2 else nring - 1)
        outer = ring <= top_i
        a = math.atan2(v.co.y, v.co.x)
        z = v.co.z
        c = base * (1 + 0.04 * (rnd.random() - 0.5) * 2) * (1 + 0.07 * noise(a, z, p[0:3], 0.8))
        if outer:
            c = mix(c, spot, 0.55 * smooth(0.45, 0.95, noise(a, z, p[3:6], 2.5)))       # dried water spots
            tide = spec.get('wet', 0.12) * (1 + 0.15 * noise(a, 0, p[6:9], 0.3))
            c = mix(c, spot, 0.35 * (1 - smooth(0.0, 0.015, abs(z - tide))))            # chalky tide line
            c = mix(c, grime, 0.5 * (1 - smooth(0.0, 0.05, z)))
        else:
            c = c * 0.62
        vcol.append(Vector((min(c.x, 0.8), min(c.y, 0.8), min(c.z, 0.8))))
    cols = []
    for lp in me.loops:
        c = vcol[lp.vertex_index]
        cols += [c.x, c.y, c.z, 1.0]
    POT_COLS[obj.name] = cols


# ---------------------------------------------------------------- the variants
# Profiles: (radius, height) bottom to top, out over the rim and back down the inside to a floor (open mouth).
SPECS = {
    # MATKA: round water pot, belly widest ~40 %, short flared neck, rolled rim. Seeps, so a wet lower belly and salt bloom.
    'matka_a': dict(prof=[(0.0, 0.0), (0.12, 0.0), (0.17, 0.03), (0.23, 0.13), (0.27, 0.27), (0.26, 0.38), (0.21, 0.49), (0.14, 0.57), (0.115, 0.61), (0.13, 0.65),
                          (0.16, 0.675), (0.168, 0.69), (0.15, 0.7), (0.125, 0.686), (0.108, 0.66), (0.105, 0.56), (0.0, 0.52)],
                    seg=24, step=0.035, tone=0xBF7A52, wobble=0.012, ridge=(0.5, 0.64, 0.035, 0.5), chips=[(1.2, 0.28, 0.018)],
                    wet=0.2, salt=0.55, fire=0.25),
    'matka_b': dict(prof=[(0.0, 0.0), (0.13, 0.0), (0.2, 0.03), (0.27, 0.11), (0.305, 0.22), (0.295, 0.32), (0.24, 0.41), (0.16, 0.47), (0.13, 0.5), (0.145, 0.535),
                          (0.172, 0.56), (0.176, 0.575), (0.158, 0.585), (0.138, 0.57), (0.122, 0.545), (0.118, 0.46), (0.0, 0.42)],
                    seg=24, step=0.035, tone=0xAA6544, wobble=0.014, ridge=(0.38, 0.53, 0.03, 0.6), chips=[(0.3, 0.18, 0.014), (3.6, 0.22, 0.02)],
                    wet=0.24, salt=0.8, fire=0.15),
    'matka_c': dict(prof=[(0.0, 0.0), (0.11, 0.0), (0.16, 0.035), (0.22, 0.15), (0.255, 0.3), (0.245, 0.42), (0.2, 0.52), (0.135, 0.6), (0.112, 0.64), (0.124, 0.68),
                          (0.152, 0.705), (0.16, 0.72), (0.143, 0.73), (0.12, 0.716), (0.104, 0.69), (0.1, 0.6), (0.0, 0.56)],
                    seg=24, step=0.03, tone=0xC88C62, wobble=0.01, ridge=(0.52, 0.67, 0.03, 0.5), chips=[(4.9, 0.3, 0.02)],
                    wet=0.16, salt=0.35, fire=0.45, lines=[(0x3A2E28, 0.455, 0.466), (0x3A2E28, 0.485, 0.494)]),
    # GHADA a: the stainless-steel water pot the lane corner already places (wider mouth, neck bead), dented and spotted.
    'ghada_a': dict(prof=[(0.0, 0.0), (0.13, 0.0), (0.2, 0.05), (0.235, 0.17), (0.225, 0.29), (0.17, 0.39), (0.135, 0.43), (0.152, 0.412), (0.152, 0.422), (0.137, 0.436),
                          (0.145, 0.448), (0.15, 0.46), (0.138, 0.463), (0.128, 0.45), (0.12, 0.38), (0.0, 0.36)],
                    seg=26, step=0.035, tone=0xA7ABAE, wobble=0.004, steel=True, wet=0.14,
                    dents=[(0.8, 0.2, 0.05, 0.05), (2.9, 0.12, 0.04, 0.035)], chips=[]),
    # GHADA b/c: clay ghada - narrower neck, a raised collar to grip, lip flared for pouring; c is red-slipped with white painted lines.
    'ghada_b': dict(prof=[(0.0, 0.0), (0.1, 0.0), (0.16, 0.03), (0.215, 0.12), (0.23, 0.2), (0.21, 0.29), (0.15, 0.36), (0.1, 0.395), (0.112, 0.405), (0.112, 0.418),
                          (0.096, 0.425), (0.1, 0.45), (0.122, 0.468), (0.126, 0.478), (0.108, 0.484), (0.088, 0.47), (0.08, 0.4), (0.0, 0.37)],
                    seg=22, step=0.032, tone=0xB87350, wobble=0.012, ridge=(0.3, 0.46, 0.03, 0.5), chips=[(2.2, 0.3, 0.014)],
                    wet=0.13, salt=0.4, fire=0.2),
    'ghada_c': dict(prof=[(0.0, 0.0), (0.105, 0.0), (0.17, 0.035), (0.22, 0.13), (0.232, 0.21), (0.205, 0.3), (0.145, 0.365), (0.098, 0.4), (0.11, 0.41), (0.11, 0.422),
                          (0.095, 0.43), (0.098, 0.452), (0.118, 0.47), (0.122, 0.48), (0.104, 0.486), (0.086, 0.472), (0.078, 0.4), (0.0, 0.37)],
                    seg=22, step=0.022, tone=0x9C5038, wobble=0.011, chips=[(5.3, 0.25, 0.012)], wet=0.1, salt=0.3, fire=0.0,
                    lines=[(0xD6CBB4, 0.25, 0.262), (0xD6CBB4, 0.282, 0.29), (0xD6CBB4, 0.33, 0.338)]),
    # SURAHI: long-necked water flask. a = classic, b = rounder with a ribbed neck, c = pale buff clay with a trumpet mouth and incised shoulder.
    'surahi_a': dict(prof=[(0.0, 0.0), (0.09, 0.0), (0.14, 0.04), (0.185, 0.14), (0.18, 0.24), (0.12, 0.31), (0.06, 0.355), (0.04, 0.4), (0.043, 0.43), (0.06, 0.447),
                           (0.064, 0.46), (0.05, 0.464), (0.032, 0.44), (0.03, 0.36), (0.0, 0.3)],
                     seg=22, step=0.03, tone=0xBA7049, wobble=0.012, chips=[(0.7, 0.4, 0.008)], wet=0.12, salt=0.45, fire=0.2),
    'surahi_b': dict(prof=[(0.0, 0.0), (0.1, 0.0), (0.16, 0.035), (0.2, 0.12), (0.195, 0.21), (0.14, 0.28), (0.07, 0.32), (0.046, 0.35), (0.05, 0.36), (0.044, 0.37),
                           (0.048, 0.38), (0.042, 0.39), (0.046, 0.4), (0.062, 0.415), (0.066, 0.427), (0.052, 0.43), (0.035, 0.41), (0.032, 0.33), (0.0, 0.28)],
                     seg=22, step=0.03, tone=0xB06645, wobble=0.013, chips=[], wet=0.14, salt=0.6, fire=0.3),
    'surahi_c': dict(prof=[(0.0, 0.0), (0.085, 0.0), (0.13, 0.04), (0.17, 0.13), (0.168, 0.22), (0.152, 0.245), (0.15, 0.255), (0.118, 0.3), (0.058, 0.345),
                           (0.038, 0.39), (0.04, 0.43), (0.058, 0.46), (0.078, 0.48), (0.08, 0.49), (0.064, 0.492), (0.036, 0.455), (0.03, 0.36), (0.0, 0.3)],
                     seg=22, step=0.028, tone=0xC9A07A, fresh=0xDDB896, wobble=0.011, chips=[(3.3, 0.3, 0.01)], wet=0.1, salt=0.3, fire=0.35,
                     lines=[(0x8A5A40, 0.244, 0.256)]),
    # KULHAD: one-use clay cup. Hand-thrown, thumb-pressed tilted lip; a b c = standard, tall chai, squat lassi-less 'chukkad'.
    'kulhad_a': dict(prof=[(0.0, 0.0), (0.026, 0.0), (0.032, 0.012), (0.04, 0.05), (0.047, 0.09), (0.049, 0.095), (0.043, 0.093), (0.038, 0.08), (0.03, 0.02), (0.0, 0.012)],
                     seg=14, step=0.03, tone=0xC88A5E, wobble=0.04, tilt=0.05, chips=[(2.0, 0.4, 0.004)], wet=0.0, fire=0.3),
    'kulhad_b': dict(prof=[(0.0, 0.0), (0.024, 0.0), (0.03, 0.014), (0.036, 0.06), (0.042, 0.11), (0.044, 0.116), (0.038, 0.114), (0.034, 0.1), (0.027, 0.022), (0.0, 0.014)],
                     seg=14, step=0.035, tone=0xB97650, wobble=0.045, tilt=0.06, chips=[], wet=0.0, fire=0.45),
    'kulhad_c': dict(prof=[(0.0, 0.0), (0.03, 0.0), (0.038, 0.01), (0.048, 0.04), (0.055, 0.068), (0.057, 0.073), (0.05, 0.071), (0.045, 0.06), (0.035, 0.016), (0.0, 0.01)],
                     seg=14, step=0.03, tone=0xCE9368, wobble=0.035, tilt=0.04, chips=[(4.4, 0.5, 0.005)], wet=0.0, fire=0.2),
}


def add_pot(kit, key, seed, xf=None):
    spec = SPECS[key]
    rnd = random.Random(seed)
    obj, seg, top_i, H, nring = pot_mesh(key + '_' + str(seed), spec, rnd)
    (steel_colours if spec.get('steel') else clay_colours)(obj, seg, top_i, H, nring, spec, rnd)
    if xf is not None:
        obj.data.transform(xf)
    kit.add('steel' if spec.get('steel') else 'paint', obj, spec['tone'])
    return obj


def new_kit():
    return Kit(split_props=False, own=('metal',), route={'steel': 'metal'})


def make(which):
    for key in SPECS:
        typ, var = key.split('_')
        if which not in ('all', typ, key):
            continue
        kit = new_kit()
        add_pot(kit, key, seed=sum(map(ord, key)))
        out = 'pot_%s_v2%s' % (typ, '' if var == 'a' else '_' + var)
        kit.finalize(os.path.join(ROOT, 'tmp', out + '_raw.glb'), {}, drift_amp=0.06, ao_strength=0.55)


def render():
    """Preview: all twelve on a cement-plaster platform against a limewash wall, daylight. Writes docs/shots/assets-pots/."""
    kit = new_kit()
    xs = {'a': -0.75, 'b': 0.0, 'c': 0.75}
    rows = {'matka': 0.9, 'ghada': 0.2, 'surahi': -0.35, 'kulhad': -0.75}
    for key in SPECS:
        typ, var = key.split('_')
        rz = (sum(map(ord, key)) % 7) * 0.9
        add_pot(kit, key, seed=sum(map(ord, key)), xf=Matrix.Translation((xs[var], rows[typ], 0.0)) @ Matrix.Rotation(rz, 4, 'Z'))
    # a kulhad pile and one on its side, as at a tea stall
    add_pot(kit, 'kulhad_a', 7, Matrix.Translation((1.15, -0.8, 0.0)))
    add_pot(kit, 'kulhad_a', 8, Matrix.Translation((1.15, -0.8, 0.012)) @ Matrix.Rotation(0.6, 4, 'Z'))
    add_pot(kit, 'kulhad_c', 9, Matrix.Translation((1.3, -0.62, 0.05)) @ Matrix.Rotation(1.57, 4, 'X'))
    kit.add('plaster', wb('slab', -1.4, 1.7, -1.3, 1.6, -0.08, 0.0, 0.01), 0xA9A194)
    kit.add('plaster', wb('wall', -1.4, 1.7, -1.7, -1.6, -0.08, 1.6, 0.01), 0xD8D0C0)
    p = os.path.join(ROOT, 'tmp', 'pots_preview_raw.glb')
    kit.finalize(p, {}, drift_amp=0.05, ao_strength=0.55)
    for m in bpy.data.materials:   # the game multiplies vertex colour in full; the Blender preview wiring mixes it at half, so match the game
        if m.node_tree:
            for nd in m.node_tree.nodes:
                if nd.type == 'MIX_RGB' and nd.blend_type == 'MULTIPLY':
                    nd.inputs['Fac'].default_value = 1.0
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = 48
    sc.cycles.device = 'CPU'
    sc.render.resolution_x, sc.render.resolution_y = 1100, 800
    sc.view_settings.view_transform = 'AgX'
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.55, 0.62, 0.75, 1); w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.6
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sc.collection.objects.link(sun)
    sun.data.energy = 4.0; sun.data.color = (1.0, 0.93, 0.82); sun.rotation_euler = (math.radians(48), math.radians(8), math.radians(-30))
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
    d = os.path.join(ROOT, 'docs', 'shots', 'assets-pots')
    os.makedirs(d, exist_ok=True)
    # wb() takes wz (Blender y = -wz): the wall sits at Blender y = +1.6..1.7, behind the matka row; the camera looks along +y.
    for name, loc, look, lens in [('a_all_variants', (0.25, -3.1, 1.55), (0.1, 0.1, 0.2), 35),
                                  ('b_close_matkas', (0.35, -0.6, 1.25), (0.0, 0.85, 0.3), 40),
                                  ('c_close_kulhads', (0.75, -1.35, 0.32), (0.75, -0.7, 0.03), 45)]:
        cam.location = loc
        cam.data.lens = lens
        dvec = Vector(look) - Vector(loc)
        cam.rotation_euler = dvec.to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = os.path.join(d, name + '.png')
        bpy.ops.render.render(write_still=True)
        print('rendered', sc.render.filepath)


which = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'all'
if which == 'render':
    render()
else:
    make(which)
