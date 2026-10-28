"""
Lanterns (BACKLOG J0, 27 Oct): the kerosene hurricane lantern ('lalten'), DAY PROP ONLY. No light, no glow, no emissive: night is v2.
Three small single-purpose models, each meant to be cloned per placement and merged per material by a loader (the src/pots.js pattern):
  lantern_hurricane_v2 : standing lantern, faded red enamel fount and hood, bail handle up. For charpais, verandah ledges, shop counters.
  lantern_tin_v2       : standing lantern, bare tin gone dull and rust-bled, bail handle folded down to the back. Same places, so a row never repeats.
  lantern_hanging_v2   : faded green lantern hung by its bail from a short chain on a wall bracket. For shop fronts beside the door.
Run (from the repo root):
  Blender -b --python tools/blender/build_lantern.py -- all      (writes tmp/lantern_<type>_v2_raw.glb), then per type
  node tools/shrink.js tmp/lantern_<type>_v2_raw.glb public/assets/models/lantern_<type>_v2.glb 999999
  node tools/strip-textures.mjs public/assets/models/lantern_<type>_v2.glb public/assets/models/lantern_<type>_v2.glb
  Blender -b --python tools/blender/build_lantern.py -- render   (preview shots into docs/shots/assets-lanterns/)
Local frame (glTF): standing lanterns: origin at the base centre on the surface, wick knob faces +z.
  hanging: origin at the wall plate centre, wall face at z = 0, the bracket projects to +z, the lantern hangs below (bottom at y = -0.47).
Materials (two draw calls per merged set, whatever the count):
  hb_metal : the shared 'metal' set. Tin, wire guard, air tubes, bracket, chain (arch.py rust_steel relief/colour) plus the enamel paint
             (kind 'enamel' routed into the same group, flat faded colour with modelled rust rings and chips laid on top).
  hb_props : the glass chimney (kind 'glass' routed here, tagged with the shared metal set so it stays smooth; smoky pale grey, soot at the top). A loader may swap hb_props
             for a shared glossy glass material by name; as exported it is opaque smoked glass and reads as such in daylight.
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from mathutils import Matrix, Vector
from common import ROOT, cyl, limb, wb
from arch import Kit, lathe, ring

TIN, TIN_DARK, RUST, SOOT = 0x8a8d88, 0x5d605c, 0x6e4128, 0x2e2a26
RED, GREEN = 0x8e3f33, 0x4f6a4c          # sun-faded enamel, never full saturation
GLASS, GLASS_SOOT = 0xb9c0bc, 0x3a3632
WIRE, DUST = 0x4a4c48, 0x9a8f78
TEX = {'props': ('metal', 1.0)}   # the glass group rides the smooth shared metal set (the plaster set's normal map made it read as lumpy stone)

# Per-variant wear (28 Oct): the three shipped types differ in glass soot, rust, bail wire and paint, so a row never reads as copies.
#   soot : 0..1, how far down the chimney the lamp-black has crept (0.25 = a cap of soot, 0.75 = top half black)
#   rust : 0..1, chip count, seam rust, streaks; above 0.6 the wire and tubes take arch.py's rust_steel relief too
#   wire : bail gauge (m); wire_col : bail colour when it is not rusted through
VARIANT = {
    'hurricane': dict(paint=RED, handle='up', soot=0.25, rust=0.30, wire=0.0042, wire_col=0x5a5d58, seed=1),
    'tin': dict(paint=None, handle='folded', soot=0.75, rust=0.80, wire=0.0060, wire_col=0x4a4c48, seed=2),
    'hanging': dict(paint=GREEN, handle='up', soot=0.50, rust=0.50, wire=0.0050, wire_col=0x44473f, seed=3),
}


def mix(a, b, t):
    """Blend two sRGB hex colours, t = 0 gives a."""
    t = max(0.0, min(1.0, t))
    ca = [(a >> s) & 255 for s in (16, 8, 0)]
    cb = [(b >> s) & 255 for s in (16, 8, 0)]
    c = [int(ca[i] + (cb[i] - ca[i]) * t) for i in range(3)]
    return (c[0] << 16) | (c[1] << 8) | c[2]


def band(name, cx, cz, r0, h0, r1, h1, seg):
    """One open (uncapped) ring of a surface of revolution: no internal discs to show through the see-through glass."""
    import bmesh
    from common import new_bmesh_obj
    bm = bmesh.new()
    rings = [[bm.verts.new((cx + r * math.cos(i / seg * math.tau), -(cz + r * math.sin(i / seg * math.tau)), h)) for i in range(seg)] for r, h in ((r0, h0), (r1, h1))]
    for i in range(seg):
        j = (i + 1) % seg
        bm.faces.new((rings[0][i], rings[0][j], rings[1][j], rings[1][i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    obj = new_bmesh_obj(name, bm)
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj


def rot_mesh(obj, axis, ang, pivot):
    """Rotate an object's mesh about a pivot given in the (wx, wz, h) frame; baked into the vertices (the Kit joins raw meshes)."""
    obj.data.transform(obj.matrix_world)
    obj.matrix_world.identity()
    p = Vector((pivot[0], -pivot[1], pivot[2]))
    obj.data.transform(Matrix.Translation(p) @ Matrix.Rotation(ang, 4, axis) @ Matrix.Translation(-p))
    return obj


def lantern(kit, ox, oz, oh, paint, handle='up', seed=0, yaw=0.0, soot=0.4, rust=0.4, wire=0.005, wire_col=WIRE):
    """One hurricane lantern, base centre at (ox, oz, oh). paint = enamel hex or None for bare tin. handle: 'up', 'folded'."""
    rnd = random.Random(seed)
    body = TIN if paint is None else paint
    ek = 'enamel'                                     # body panels: smooth vertex colour with modelled wear (rust_steel's all-over rust made bare tin read as brown iron)
    wk = 'metal' if rust > 0.6 else 'enamel'          # wire, tubes, guard: rusted through only on the worn variant
    wcol = mix(wire_col, RUST, rust * 0.6) if wk == 'enamel' else wire_col
    SEG = 16
    parts = []

    def add(kind, obj, col):
        parts.append(obj)
        return kit.add(kind, obj, col)

    def L(name, prof, seg=SEG):
        return lathe(name, ox, oz, [(r, oh + h) for r, h in prof], seg=seg)

    # fount (kerosene tank): squat drum with a rolled base skirt and a rounded shoulder
    add('metal', cyl('skirt', ox, oz, oh, oh + 0.012, 0.083, 0.083, seg=SEG), TIN_DARK)
    add(ek, L('fount', [(0.0, 0.010), (0.080, 0.010), (0.084, 0.022), (0.085, 0.046), (0.079, 0.064), (0.062, 0.077), (0.046, 0.082), (0.0, 0.082)]), body)
    # dust settled on the shoulder (a lighter skin on the upper face only), grime darkening the lower drum where hands and floors touch it
    add(ek, L('dust', [(0.0805, 0.0645), (0.0635, 0.0775), (0.0465, 0.0825), (0.0, 0.0826)]), mix(body, DUST, 0.28 + 0.2 * rnd.random()))
    add(ek, band('grime', ox, oz, 0.0852, oh + 0.020, 0.0857, oh + 0.034, SEG), mix(body, SOOT, 0.25 + 0.2 * rust))
    # wear on the fount: rust ring at the base seam, chips through to dark tin or rust, runs of rust down from the chips
    add('metal', cyl('seam_rust', ox, oz, oh + 0.010, oh + 0.021, 0.0860, 0.0860, seg=SEG, cap=False), mix(RUST, SOOT, 0.2))
    a0 = rnd.uniform(0, math.tau)
    for k in range(3 + int(rust * 7)):
        a = a0 + k * 2.39996 + rnd.uniform(-0.3, 0.3)          # golden-angle spread so chips never line up
        hh = rnd.uniform(0.026, 0.056)
        w, t = rnd.uniform(0.004, 0.010), rnd.uniform(0.003, 0.007)
        cx, cz = ox + 0.0853 * math.cos(a), oz + 0.0853 * math.sin(a)
        o = add(ek, limb('chip%d' % k, (cx, cz, oh + hh - t / 2), (cx, cz, oh + hh + t / 2), w, 0.0016), mix(RUST, TIN_DARK, rnd.random() * 0.6))
        rot_mesh(o, 'Z', -a - math.pi / 2, (cx, cz, 0))
        if rnd.random() < 0.3 + 0.6 * rust:                      # a thin run of rust down from the chip to the seam
            o = add(ek, limb('run%d' % k, (cx, cz, oh + 0.020), (cx, cz, oh + hh - t / 2), w * 0.35, 0.0012), mix(body, RUST, 0.55))
            rot_mesh(o, 'Z', -a - math.pi / 2, (cx, cz, 0))
    # filler cap on the shoulder (back), burner collar, globe seat gallery
    add('metal', cyl('filler', ox - 0.045, oz - 0.03, oh + 0.074, oh + 0.090, 0.012, 0.011, seg=8), TIN_DARK)
    add(ek, band('kero_stain', ox - 0.045, oz - 0.03, 0.0125, oh + 0.073, 0.0175, oh + 0.071, 8), mix(body, SOOT, 0.45))   # kerosene drip ring round the filler
    add('metal', cyl('burner', ox, oz, oh + 0.080, oh + 0.096, 0.030, 0.028, seg=SEG), TIN_DARK)
    add(wk, L('gallery', [(0.030, 0.094), (0.047, 0.098), (0.047, 0.107), (0.0, 0.107)]), mix(TIN, RUST, rust * 0.4))
    # wick knob: shaft out of the burner to the front (+z), a round knurled disc, rubbed bright
    add('metal', limb('wick_shaft', (ox, oz + 0.02, oh + 0.090), (ox, oz + 0.068, oh + 0.090), 0.006), TIN_DARK)
    add('enamel', rot_mesh(cyl('wick_knob', ox, oz, -0.005, 0.005, 0.014, 0.014, seg=10), 'X', math.pi / 2, (ox, oz, 0)), 0x9c9a92)
    parts[-1].data.transform(Matrix.Translation((0, -(oz + 0.070) + oz, oh + 0.090)))
    # glass chimney: bulbous globe, resampled into thin open bands so lamp-black can grade down from the top by `soot`
    prof = [(0.040, 0.106), (0.049, 0.118), (0.059, 0.142), (0.062, 0.165), (0.057, 0.190), (0.045, 0.210), (0.036, 0.224)]
    hs = 0.224 - soot * 0.105                      # where the soot starts
    for i in range(len(prof) - 1):
        (r0, h0), (r1, h1) = prof[i], prof[i + 1]
        n = 2 if h1 - h0 > 0.015 else 1
        for j in range(n):
            ha, hb = h0 + (h1 - h0) * j / n, h0 + (h1 - h0) * (j + 1) / n
            ra, rb = r0 + (r1 - r0) * j / n, r0 + (r1 - r0) * (j + 1) / n
            hm = (ha + hb) / 2
            k = max(0.0, min(1.0, (hm - hs) / 0.035)) * (0.55 + 0.45 * soot)
            add('glass', band('globe%d_%d' % (i, j), ox, oz, ra, oh + ha, rb, oh + hb, SEG), mix(GLASS, GLASS_SOOT, k * 0.5))
            if hm > hs:   # lamp-black is opaque: an inner skin in the metal group (the chimney glass is drawn at 35% opacity, so tinting it alone does not show)
                d = (hm - hs) / 0.035
                add('enamel', band('soot%d_%d' % (i, j), ox, oz, ra * 0.97, oh + ha, rb * 0.97, oh + hb, SEG),
                    mix(0x7c766e, SOOT, min(1.0, 0.35 + d * 0.65)))
    add('glass', L('globe_top', [(0.036, 0.224), (0.0, 0.2245)]), GLASS_SOOT)
    # hood / top chamber with the vent cone and a soot-blackened rim
    add(ek, L('hood', [(0.040, 0.220), (0.052, 0.226), (0.054, 0.236), (0.046, 0.246), (0.030, 0.256), (0.020, 0.262), (0.0, 0.262)]), body)
    add(ek, L('hood_dust', [(0.0465, 0.2465), (0.0305, 0.2565), (0.0205, 0.2625), (0.0, 0.2626)]), mix(body, DUST, 0.3))
    add('metal', L('vent', [(0.022, 0.258), (0.016, 0.272), (0.0, 0.274)], seg=10), SOOT)
    add(ek, band('vent_soot', ox, oz, 0.0305, oh + 0.2565, 0.0222, oh + 0.2615, SEG), mix(body, SOOT, 0.5 + 0.4 * soot))
    add('metal', cyl('hood_rust', ox, oz, oh + 0.219, oh + 0.228, 0.0548, 0.0548, seg=SEG, cap=False), mix(RUST, SOOT, 0.3))
    # two side air tubes: fount shoulder straight up, then bent in to the hood (the hurricane lantern's frame)
    tube_col = body if paint else mix(TIN, RUST, rust * 0.5)
    for s in (-1, 1):
        x = ox + s * 0.079
        add(ek if paint else wk, cyl('tube%d' % s, x, oz, oh + 0.040, oh + 0.226, 0.0068, 0.0062, seg=6), tube_col)
        add(ek if paint else wk, limb('bend%d' % s, (x, oz, oh + 0.224), (ox + s * 0.050, oz, oh + 0.246), 0.012, 0.011), tube_col)
        add('metal', limb('tube_foot%d' % s, (x, oz, oh + 0.036), (ox + s * 0.083, oz, oh + 0.060), 0.016, 0.014), TIN_DARK)
        if paint:                                     # paint worn off the tube where the hand lifts the globe
            add('enamel', cyl('tube_wear%d' % s, x, oz, oh + 0.140, oh + 0.160, 0.0071, 0.0071, seg=6, cap=False), mix(TIN_DARK, RUST, rust))
    # globe-lift lever on one tube
    add(wk, limb('lift', (ox + 0.079, oz, oh + 0.150), (ox + 0.102, oz + 0.004, oh + 0.142), 0.006), wcol)
    # wire guard: four bowed wires round the globe on the open sides, two horizontal hoops
    for k in range(4):
        a = [math.radians(60), math.radians(120), math.radians(240), math.radians(300)][k]
        pts = [(0.050, 0.108), (0.067, 0.138), (0.068, 0.182), (0.052, 0.220)]
        for j in range(len(pts) - 1):
            (r0, h0), (r1, h1) = pts[j], pts[j + 1]
            add(wk, limb('guard%d_%d' % (k, j), (ox + r0 * math.cos(a), oz + r0 * math.sin(a), oh + h0),
                         (ox + r1 * math.cos(a), oz + r1 * math.sin(a), oh + h1), 0.0042), wcol)
    for k, (r, h) in enumerate([(0.0665, 0.135), (0.068, 0.185)]):
        add(wk, ring('hoop%d' % k, ox, oz, oh + h, r, 0.0024, axis='y', seg=12, tube=3), wcol)
    # bail handle: wire arc hinged on the tubes, small loop at the top; gauge, colour and a slight sag differ per variant
    piv = 0.200
    sag = rnd.uniform(-0.006, 0.006)
    arc = []
    n = 8
    for i in range(n + 1):
        t = math.pi * i / n
        arc.append((ox - 0.086 * math.cos(t), oh + piv + (0.135 + sag) * math.sin(t)))
    bail = []
    for i in range(n):
        (x0, h0), (x1, h1) = arc[i], arc[i + 1]
        bail.append(add(wk, limb('bail%d' % i, (x0, oz, h0), (x1, oz, h1), wire * 1.3), wcol))
    for s in (-1, 1):
        bail.append(add(wk, ring('hinge%d' % s, ox + s * 0.083, oz, oh + piv, 0.007, 0.0025, axis='x', seg=6, tube=3), wcol))
    bail.append(add(wk, ring('bail_loop', ox, oz, oh + piv + 0.143 + sag, 0.009, wire * 0.55, axis='z', seg=8, tube=3), wcol))
    if handle == 'folded':
        for o in bail:
            rot_mesh(o, 'X', math.radians(-72), (ox, oz, oh + piv))   # laid down over the back
    if yaw:
        for o in parts:
            rot_mesh(o, 'Z', yaw, (ox, oz, 0))
    return oh + piv + 0.152   # height of the bail's top (hanging point)


def hanging(kit, seed=0):
    """Wall bracket + chain + green lantern. Wall plate at the origin, wall face z = 0, bracket out to +z."""
    arm = 0.27
    # wall plate with two nail heads, the square-bar arm, a diagonal brace, a curled hook end
    kit.add('metal', limb('plate', (0, 0.004, -0.17), (0, 0.004, 0.035), 0.056, 0.008), TIN_DARK)
    for h in (-0.15, 0.015):
        kit.add('metal', cyl('nail%.2f' % h, 0.0, 0.010, h - 0.006, h + 0.006, 0.006, 0.006, seg=6), RUST)
    kit.add('metal', limb('arm', (0, 0.004, 0.0), (0, arm, 0.0), 0.014, 0.012), WIRE)
    kit.add('metal', limb('brace', (0, 0.006, -0.155), (0, arm * 0.62, -0.004), 0.011, 0.009), WIRE)
    kit.add('metal', limb('arm_tip', (0, arm - 0.006, 0.0), (0, arm + 0.012, 0.022), 0.011), WIRE)
    kit.add('metal', ring('hook', 0, arm - 0.006, -0.016, 0.014, 0.0035, axis='x', seg=10, tube=3), RUST)
    # chain: three links, alternating planes, hanging under the hook
    top = -0.030
    for i in range(3):
        kit.add('metal', ring('link%d' % i, 0, arm - 0.006, top - 0.012 - i * 0.019, 0.0105, 0.0026, axis='z' if i % 2 == 0 else 'x', seg=8, tube=3), RUST if i == 1 else WIRE)
    hang_y = top - 0.012 - 2 * 0.019 - 0.012
    # the lantern hangs by its bail loop from the last link; base height solved from lantern()'s bail top (0.352 above base)
    base = hang_y - 0.352
    v = dict(VARIANT['hanging']); v.pop('seed')
    lantern(kit, 0.0, arm - 0.006, base, seed=seed + 5, **v)


def make(which):
    out = lambda n: os.path.join(ROOT, 'tmp', n + '_raw.glb')
    route = {'enamel': 'metal', 'glass': 'props'}
    if which in ('all', 'hurricane'):
        kit = Kit(split_props=False, own=('metal',), route=route, tex_override=TEX)
        lantern(kit, 0, 0, 0, **VARIANT['hurricane'])
        kit.finalize(out('lantern_hurricane_v2'), {}, drift_amp=0.08, ao_strength=0.5)
    if which in ('all', 'tin'):
        kit = Kit(split_props=False, own=('metal',), route=route, tex_override=TEX)
        lantern(kit, 0, 0, 0, **VARIANT['tin'])
        kit.finalize(out('lantern_tin_v2'), {}, drift_amp=0.10, ao_strength=0.55)
    if which in ('all', 'hanging'):
        kit = Kit(split_props=False, own=('metal',), route=route, tex_override=TEX)
        hanging(kit, seed=3)
        kit.finalize(out('lantern_hanging_v2'), {}, drift_amp=0.08, ao_strength=0.5)


def render():
    """Preview: all three side by side on a plain plaster ledge against a limewash wall, daylight. Writes docs/shots/assets-lanterns/."""
    route = {'enamel': 'metal', 'glass': 'props'}
    kit = Kit(split_props=False, own=('metal',), route=route, tex_override=TEX)
    lantern(kit, -0.26, 0.0, 0.0, **VARIANT['hurricane'])
    lantern(kit, 0.02, 0.03, 0.0, yaw=0.5, **VARIANT['tin'])
    # hanging set mounted on the wall behind, at bracket height 0.62 above the ledge
    n0 = len(kit.records)
    hanging(kit, seed=3)
    for k, o, c in kit.records[n0:]:
        o.data.transform(o.matrix_world)
        o.matrix_world.identity()
        o.data.transform(Matrix.Translation((0.30, 0.30, 0.62)))   # wall at wz = -0.30 (Blender +y)
    kit.add('plaster', wb('ledge', -0.6, 0.7, -0.30, 0.35, -0.08, 0.0, 0.01), 0xb8ad98)
    kit.add('plaster', wb('wall', -0.6, 0.7, -0.36, -0.30, -0.08, 1.0, 0.01), 0xd8d2c4)
    p = os.path.join(ROOT, 'tmp', 'lantern_preview_raw.glb')
    kit.finalize(p, {}, drift_amp=0.06, ao_strength=0.5)
    for m in bpy.data.materials:   # the game multiplies vertex colour in full; the Blender preview wiring mixes it at half, so match the game
        if m.node_tree:
            for nd in m.node_tree.nodes:
                if nd.type == 'MIX_RGB' and nd.blend_type == 'MULTIPLY':
                    nd.inputs['Fac'].default_value = 1.0
        if m.name.startswith('hb_props') and m.node_tree:   # match src/lanterns.js: chimney glass at opacity 0.35, roughness 0.08
            for nd in m.node_tree.nodes:
                if nd.type == 'BSDF_PRINCIPLED':
                    nd.inputs['Alpha'].default_value = 0.35
                    for l in list(nd.inputs['Roughness'].links):
                        m.node_tree.links.remove(l)
                    nd.inputs['Roughness'].default_value = 0.08
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = 48
    sc.cycles.device = 'CPU'
    sc.render.resolution_x, sc.render.resolution_y = 1000, 760
    sc.view_settings.view_transform = 'AgX'
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.55, 0.62, 0.75, 1); w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.6
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sc.collection.objects.link(sun)
    sun.data.energy = 4.0; sun.data.color = (1.0, 0.93, 0.82); sun.rotation_euler = (math.radians(50), math.radians(10), math.radians(35))
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
    d = os.path.join(ROOT, 'docs', 'shots', 'assets-lanterns')
    os.makedirs(d, exist_ok=True)
    for name, loc, look, lens in [('a_group', (0.25, -1.45, 0.55), (0.03, 0.05, 0.22), 40),
                                  ('b_close_hurricane', (-0.12, -0.55, 0.30), (-0.26, 0.0, 0.15), 50),
                                  ('d_close_tin_soot', (0.20, -0.50, 0.32), (0.02, 0.03, 0.17), 50),
                                  ('c_hanging_side', (1.05, -0.75, 0.55), (0.30, 0.10, 0.35), 45)]:
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
