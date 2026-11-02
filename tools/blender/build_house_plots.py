"""
House plots round the haveli, 1 Nov village plan: places[] 'House plots round the haveli' (entry centre (13, -24.1), turn 81.2),
four 'house plot wall' rectangles. The plots are NOT all at one turn (two sit at -8.9 deg, two at +7.3 / +5.2 deg), so each plot
is its own GLB, origin = that plot's corner centroid, built square in a local frame; src turns each with turnSiteGroup(group, -t).
Local frame: +x along the plot edge most aligned with world +x, +z = +x turned 90 deg toward world +z (south). North = -z.

Hard surface only, no plants, no houses (the plan's 'building' shapes inside each plot are a separate job):
  boundary   one-brick (23 cm) wall, low (1.05 .. 1.25 m per plot), lime-washed render over brick; the render has fallen away low
             down in damp patches with the modelled bricks showing behind it. One plot has a grey cement render on its road face.
  pillars    corner pillars (rendered, cement cap) cover the wall joints; two taller gate pillars per gate with a pyramid cap.
  gates      one gap per plot, ALL opening onto the haveli courtyard or the 2 m passage between plots 1 and 2 (the map draws no
             gate, so this is a decision, see the report): plot 1 south wall, plot 2 east wall, plot 3 south wall, plot 4 north wall.
             Plot 1: a pair of GI pipe leaves folded open inside. Plot 3: one sheet-and-pipe leaf half open. Plots 2 and 4: open gap.
  threshold  flat-laid modelled brick paving across each gate, a raised kerb brick on one.
Run:
  ~/Applications/Blender.app/Contents/MacOS/Blender -b --python tools/blender/build_house_plots.py            (-> tmp/house_plots_N_raw.glb)
  for n in 1 2 3 4: node tools/shrink.js tmp/house_plots_$n_raw.glb public/assets/models/house_plots_$n.glb 999999
                    node tools/strip-textures.mjs public/assets/models/house_plots_$n.glb (same)
  ~/Applications/Blender.app/Contents/MacOS/Blender -b --python tools/blender/build_house_plots.py -- render   (docs/shots/assets-house_plots/)
Materials, frozen library only, by name through arch.Kit: plaster set (lime render, cement render, modelled bricks), metal via
arch.rust_steel. Wall helpers (wall_run, Multi, brick_row) are imported from build_gher_yard.py so the two yards weather alike.
"""
import sys, os, math, random, json, shutil
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from mathutils import Matrix
from common import wb, limb, export_glb, load_pbr_material, box_uv, ROOT
import arch
from arch import Kit
import build_gher_yard as G          # importing patches arch.colorize with the per-face colour + ground grime wrapper
from build_gher_yard import wall_run, Multi, jit, shade, brick_row, BRICK_TONES, CEMENT, CEMENT_LO, CEMENT_HI, LIME, LIME_DIRTY, LIME_GREY, RUST, MORTAR

_gher_colorize = arch.colorize
DUST = (0.62, 0.50, 0.36)          # linear-ish multiplier toward the yard's dust colour at the wall foot


def _colorize(obj, hex_color, attr='Col'):
    """gher's per-face colours + grime, then for render shells: a warm dust splash band at the foot and rain streaks that run
    down from the coping and fade (lime under a cement cap streaks grey; nothing here is clean white)."""
    _gher_colorize(obj, hex_color, attr)
    if attr != 'Base' or not any(s in obj.name for s in ('_render', '_body', '_bricks')):
        return
    me = obj.data
    if not len(me.vertices):
        return
    ztop = max(v.co.z for v in me.vertices)
    seed = (sum(map(ord, obj.name)) % 97) * 0.37
    out = [0.0] * (len(me.loops) * 4)
    me.color_attributes[attr].data.foreach_get('color', out)
    verts = me.vertices
    for li in range(len(me.loops)):
        co = verts[me.loops[li].vertex_index].co
        u = co.x + co.y
        s = max(0.0, math.sin(u * 4.7 + seed)) ** 5 * (0.6 + 0.4 * math.sin(u * 1.3 + seed * 2))
        fall = max(0.0, 1.0 - (ztop - co.z) / (0.45 + 0.35 * max(0.0, math.sin(u * 2.9 + seed))))
        k = 1.0 - (0.0 if '_bricks' in obj.name else 0.16) * s * fall
        foot = max(0.0, min(1.0, (0.28 + 0.06 * math.sin(u * 3.7 + seed) - co.z) / 0.28)) ** 1.5 * 0.55
        for c in range(3):
            v = out[li * 4 + c] * k
            out[li * 4 + c] = v * (1 - foot) + v * DUST[c] * foot
    me.color_attributes[attr].data.foreach_set('color', out)


arch.colorize = _colorize

PLAN = os.path.join(ROOT, 'docs', 'layout', 'village-plan-positions-2026-11-01.json')
T = 0.23                       # one-brick wall
P = 0.17                       # corner pillar half width
GP = 0.19                      # gate pillar half width
GATE_PAINT = [0x7890a0, 0x7d8c78]   # faded blue, faded green


def plan_plots():
    d = json.load(open(PLAN))
    e = [p for p in d['places'] if p['map_name'] == 'House plots round the haveli'][0]
    out = []
    for c in [s['corners'] for s in e['shapes'] if s['kind'] == 'house plot wall']:
        cx = sum(p[0] for p in c) / 4
        cz = sum(p[1] for p in c) / 4
        edges = [(c[(i + 1) % 4][0] - c[i][0], c[(i + 1) % 4][1] - c[i][1]) for i in range(4)]
        ex = max(edges, key=lambda v: abs(v[0]) / math.hypot(*v))
        if ex[0] < 0:
            ex = (-ex[0], -ex[1])
        t = math.atan2(ex[1], ex[0])
        ux, uz = (math.cos(t), math.sin(t)), (-math.sin(t), math.cos(t))
        loc = [((p[0] - cx) * ux[0] + (p[1] - cz) * ux[1], (p[0] - cx) * uz[0] + (p[1] - cz) * uz[1]) for p in c]
        hx = sum(abs(l[0]) for l in loc) / 4
        hz = sum(abs(l[1]) for l in loc) / 4
        err = max(min(math.hypot(abs(l[0]) - hx, abs(l[1]) - hz), 9) for l in loc)
        out.append({'cx': cx, 'cz': cz, 't': t, 'hx': hx, 'hz': hz, 'err': err})
    return e['centre'], out


# per plot: wall height, gate (side, centre along the side, clear width), road-face render, gate leaf kind, damp patches, seed
SPEC = [
    {'H': 1.2, 'gate': ('S', 3.0, 1.45), 'cement_face': None, 'leaf': 'pair', 'cap': 'cement', 'seed': 5101},
    {'H': 1.08, 'gate': ('E', -1.2, 1.35), 'cement_face': 'W', 'leaf': None, 'cap': 'lime', 'seed': 5202},
    {'H': 1.25, 'gate': ('S', 1.6, 1.4), 'cement_face': None, 'leaf': 'sheet', 'cap': 'lime', 'seed': 5303},
    {'H': 1.14, 'gate': ('N', -1.4, 1.3), 'cement_face': None, 'leaf': None, 'cap': 'cement', 'seed': 5404},
]


def lime_cap(kit, rnd, name, axis, c, u0, u1, H):
    """Rounded lime-rendered coping (a low ridge), in 0.5 m pieces so the tone drifts and the odd piece sits chipped lower."""
    cp = Multi(name + '_cap')
    u = u0
    while u < u1 - 1e-4:
        b = min(u1, u + 0.5)
        if u1 - b < 0.15:
            b = u1
        chip = -0.025 if rnd.random() < 0.12 else 0.0
        ha, hb = H + 0.06 + chip + rnd.uniform(-0.008, 0.008), H + 0.06 + chip + rnd.uniform(-0.008, 0.008)
        w0, w1 = T / 2 + 0.015, T * 0.2
        col = jit(LIME if rnd.random() < 0.6 else LIME_DIRTY, rnd, 0.03)
        if axis == 'x':
            q0 = [(u, c - w0), (b, c - w0), (b, c + w0), (u, c + w0)]
            q1 = [(u, c - w1, ha), (b, c - w1, hb), (b, c + w1, hb), (u, c + w1, ha)]
        else:
            q0 = [(c - w0, u), (c + w0, u), (c + w0, b), (c - w0, b)]
            q1 = [(c - w1, u, ha), (c + w1, u, ha), (c + w1, b, hb), (c - w1, b, hb)]
        cp.hexa([(x, z, H - 0.01) for (x, z) in q0] + q1, col)
        u = b
    kit.add('plaster', cp.obj(grime=(-1, 0)))


def damp_patches(rnd, u0, u1, n):
    """Low fallen-render patches (u_centre, half width, top) spread along a run, kept clear of its ends."""
    out = []
    L = u1 - u0
    if L < 1.6:
        return out
    for k in range(n):
        uc = u0 + L * (k + 0.5) / n + rnd.uniform(-0.25, 0.25) * L / n
        hw = rnd.uniform(0.25, 0.6)
        if uc - hw < u0 + 0.35 or uc + hw > u1 - 0.35:
            continue
        out.append((uc, hw, rnd.uniform(0.32, 0.7)))
    return out


def run(kit, rnd, name, axis, c, u0, u1, H, outer_sgn, outer_style, cap):
    faces = {outer_sgn: (outer_style, damp_patches(rnd, u0, u1, rnd.choice((1, 2, 2, 3)))),
             -outer_sgn: ('lime', damp_patches(rnd, u0, u1, rnd.choice((0, 1, 1))))}
    wall_run(kit, rnd, name, axis, c, u0, u1, H, T, faces, cap='cement' if cap == 'cement' else None)
    if cap == 'lime':
        lime_cap(kit, rnd, name, axis, c, u0, u1, H)


def rendered_pillar(kit, rnd, name, x, z, half, h1, top='flat', wash=LIME):
    """Brick pillar under a lime render (cheap: a mortar core, one render shell, a cement cap). top 'pyramid' for gate pillars."""
    kit.add('plaster', wb(name + '_foot', x - half - 0.04, x + half + 0.04, z - half - 0.04, z + half + 0.04, -0.04, 0.07, 0.01), jit(CEMENT_LO, rnd))
    kit.add('plaster', wb(name + '_body', x - half, x + half, z - half, z + half, 0.0, h1, 0.008), jit(wash, rnd, 0.03))
    kit.add('plaster', wb(name + '_cap', x - half - 0.035, x + half + 0.035, z - half - 0.035, z + half + 0.035, h1, h1 + 0.06, 0.01), jit(CEMENT, rnd))
    if top == 'pyramid':
        cm = Multi(name + '_pyr')
        q = [(x - half - 0.02, z - half - 0.02), (x + half + 0.02, z - half - 0.02), (x + half + 0.02, z + half + 0.02), (x - half - 0.02, z + half + 0.02)]
        cm.hexa([(a, b, h1 + 0.06) for a, b in q] + [(x + (a - x) * 0.15, z + (b - z) * 0.15, h1 + 0.24) for a, b in q], jit(CEMENT_HI, rnd))
        kit.add('plaster', cm.obj(grime=(-1, 0)))


def threshold(kit, rnd, side, gc, gw, hx, hz):
    """Flat-laid brick paving across the gate gap, half outside, half inside, and a kerb brick-on-edge at the line of the wall."""
    m = Multi('thresh')
    depth = 0.9
    span = gw / 2 + 0.05
    if side in ('N', 'S'):
        wz = -hz if side == 'N' else hz
        rows = int(depth / 0.115)
        for r in range(rows):
            z0 = wz - depth / 2 + r * 0.115
            off = 0.115 * (r % 2)
            a = gc - span - off
            while a < gc + span:
                x0, x1 = max(a, gc - span), min(a + 0.225, gc + span)
                if x1 - x0 > 0.05:
                    m.box(x0 + 0.004, x1 - 0.004, z0 + 0.004, z0 + 0.111, -0.04, 0.012 + rnd.uniform(-0.006, 0.004), jit(BRICK_TONES[rnd.randint(0, 4)], rnd, 0.06))
                a += 0.23
        m.box(gc - span, gc + span, wz - 0.055, wz + 0.055, -0.03, 0.06, jit(0x8e6a58, rnd, 0.04))
    else:
        wx = -hx if side == 'W' else hx
        rows = int(depth / 0.115)
        for r in range(rows):
            x0 = wx - depth / 2 + r * 0.115
            off = 0.115 * (r % 2)
            a = gc - span - off
            while a < gc + span:
                z0, z1 = max(a, gc - span), min(a + 0.225, gc + span)
                if z1 - z0 > 0.05:
                    m.box(x0 + 0.004, x0 + 0.111, z0 + 0.004, z1 - 0.004, -0.04, 0.012 + rnd.uniform(-0.006, 0.004), jit(BRICK_TONES[rnd.randint(0, 4)], rnd, 0.06))
                a += 0.23
    kit.add('plaster', m.obj(grime=(-0.1, 0.25)))


def pipe_leaf(kit, rnd, hinge, along, L, h0, h1, paint, sheet=False, gone=None):
    """A GI pipe gate leaf as a flat frame: hinge (x, z), `along` unit (dx, dz) it runs, length L. sheet: lower half sheet-iron."""
    hx_, hz_ = hinge
    ex, ez = hx_ + along[0] * L, hz_ + along[1] * L
    kit.add('metal', limb('leaf_stile', (hx_, hz_, h0), (hx_, hz_, h1), 0.045, 0.045), paint)
    kit.add('metal', limb('leaf_stile', (ex, ez, h0 + 0.02), (ex, ez, h1 - 0.02), 0.04, 0.04), paint)
    for h in (h0 + 0.04, (h0 + h1) / 2 + (0.1 if sheet else 0.0), h1 - 0.02):
        kit.add('metal', limb('leaf_rail', (hx_, hz_, h), (ex, ez, h), 0.04, 0.04), paint)
    nb = max(4, int(L / 0.13))
    for i in range(1, nb):
        if gone is not None and i == gone:
            continue
        f = i / nb
        x, z = hx_ + along[0] * L * f, hz_ + along[1] * L * f
        kit.add('metal', limb('leaf_bar', (x, z, (h0 + h1) / 2 + 0.1 if sheet else h0 + 0.04), (x, z, h1 - 0.02), 0.016, 0.016), paint)
    if sheet:
        nx, nz = -along[1], along[0]
        kit.add('metal', limb('leaf_sheet', (hx_ + along[0] * 0.03, hz_ + along[1] * 0.03, h0 + 0.3), (ex - along[0] * 0.03, ez - along[1] * 0.03, h0 + 0.3), 0.012, 0.5), shade(paint, 0.93))
    for h in (h0 + 0.15, h1 - 0.12):
        kit.add('metal', limb('hinge', (hx_ - along[0] * 0.12, hz_ - along[1] * 0.12, h), (hx_, hz_, h), 0.03, 0.03), jit(RUST, rnd))


def build_plot(kit, rnd, k, plot, spec):
    hx, hz, H = plot['hx'], plot['hz'], spec['H']
    side, gc, gw = spec['gate']
    cap = spec['cap']
    ga, gb = gc - gw / 2 - GP, gc + gw / 2 + GP          # wall stops at the gate pillars' outer faces
    style = lambda s: 'cement' if spec['cement_face'] == s else 'lime'
    solids = []
    # N and S walls run between the corner pillars along x; W and E along z
    for s, axis, c, lo, hi, sgn in (('N', 'x', -hz, -hx, hx, -1), ('S', 'x', hz, -hx, hx, 1), ('W', 'z', -hx, -hz, hz, -1), ('E', 'z', hx, -hz, hz, 1)):
        a0, a1 = lo + P, hi - P
        pieces = [(a0, ga), (gb, a1)] if s == side else [(a0, a1)]
        for i, (u0, u1) in enumerate(pieces):
            if u1 - u0 < 0.05:
                continue
            run(kit, rnd, 'w%s%d' % (s, i), axis, c, u0, u1, H, sgn, style(s), cap)
            if axis == 'x':
                solids.append({'x': round((u0 + u1) / 2, 3), 'z': round(c, 3), 'w': round(u1 - u0, 3), 'd': 0.3})
            else:
                solids.append({'x': round(c, 3), 'z': round((u0 + u1) / 2, 3), 'w': 0.3, 'd': round(u1 - u0, 3)})
    for sx in (-1, 1):
        for sz in (-1, 1):
            rendered_pillar(kit, rnd, 'cor', sx * hx, sz * hz, P, H + 0.12, wash=LIME_DIRTY if rnd.random() < 0.5 else LIME)
            solids.append({'x': round(sx * hx, 3), 'z': round(sz * hz, 3), 'w': 2 * P + 0.06, 'd': 2 * P + 0.06})
    # gate pillars + threshold
    gH = H + 0.45
    for u in (gc - gw / 2 - GP, gc + gw / 2 + GP):
        x, z = (u, -hz if side == 'N' else hz) if side in ('N', 'S') else (-hx if side == 'W' else hx, u)
        rendered_pillar(kit, rnd, 'gpil', x, z, GP, gH, top='pyramid')
        solids.append({'x': round(x, 3), 'z': round(z, 3), 'w': 2 * GP + 0.06, 'd': 2 * GP + 0.06})
    threshold(kit, rnd, side, gc, gw, hx, hz)
    # leaves, folded open INSIDE the plot against the wall's inner face
    paint = jit(GATE_PAINT[k % 2], rnd, 0.05)
    inward = {'N': (0, 1), 'S': (0, -1), 'W': (1, 0), 'E': (-1, 0)}[side]
    if side in ('N', 'S'):
        wz = -hz if side == 'N' else hz
        zi = wz + inward[1] * (T / 2 + 0.06)
        if spec['leaf'] == 'pair':
            for sgn in (-1, 1):
                hxp = gc + sgn * gw / 2
                pipe_leaf(kit, rnd, (hxp, zi), (sgn, 0), gw / 2 - 0.03, 0.08, gH - 0.35, paint, gone=3 if sgn > 0 else None)
        elif spec['leaf'] == 'sheet':
            a = math.radians(62)                     # half open into the yard
            hxp = gc - gw / 2
            pipe_leaf(kit, rnd, (hxp, wz + inward[1] * 0.02), (math.cos(a), inward[1] * math.sin(a)), gw - 0.04, 0.07, gH - 0.3, paint, sheet=True)
    return solids


def build_all():
    centre, plots = plan_plots()
    arch.clear_scene()
    _clear, _export = arch.clear_scene, arch.export_glb
    roots, tris, info = [], {}, []
    for k, (plot, spec) in enumerate(zip(plots, SPEC)):
        name = 'house_plots_%d' % (k + 1)
        captured = []
        arch.clear_scene = lambda: None
        arch.export_glb = lambda objs, out: captured.extend(objs)
        kit = Kit(split_props=False, own=('metal',))
        solids = build_plot(kit, random.Random(spec['seed']), k, plot, spec)
        parts = {}
        for _, o, _ in kit.records:
            key = o.name.split('.')[0].split('_')[-1]
            parts[key] = parts.get(key, 0) + sum(len(p.vertices) - 2 for p in o.data.polygons)
        print('PARTS', name, sorted(parts.items(), key=lambda kv: -kv[1])[:8])
        kit.finalize('unused', {}, drift_amp=0.06, ao_strength=0.5)
        G.FACECOLS.clear()
        G.GRIME.clear()
        e = bpy.data.objects.new(name, None)
        bpy.context.collection.objects.link(e)
        for o in captured:
            o.name = name + '_' + o.name.split('.')[0]
            o.parent = e
        tris[name] = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in captured)
        roots.append((e, captured, plot))
        info.append({'glb': name + '.glb', 'x': round(plot['cx'], 3), 'z': round(plot['cz'], 3), 'turn_deg': round(math.degrees(plot['t']), 3),
                     'half': [round(plot['hx'], 3), round(plot['hz'], 3)], 'corner_fit_err_m': round(plot['err'], 3), 'gate': spec['gate'], 'solids': solids})
    arch.clear_scene, arch.export_glb = _clear, _export
    for k, v in tris.items():
        print('ROOT tris', k, v)
    os.makedirs(os.path.join(ROOT, 'tmp', 'house_plots'), exist_ok=True)
    with open(os.path.join(ROOT, 'tmp', 'house_plots', 'plots.json'), 'w') as f:
        json.dump({'entry_centre': centre, 'plots': info, 'tris': tris}, f, indent=1)
    return roots


def export(roots):
    for e, children, _ in roots:
        out = os.path.join(ROOT, 'tmp', e.name + '_raw.glb')
        bpy.ops.object.select_all(action='DESELECT')
        export_glb([e] + children, out)


def render(roots):
    from mathutils import Vector as V
    centre = (13.0, -24.1)
    for e, _, plot in roots:                      # place each plot in the plan frame about the entry centre (Blender: x, -z, h)
        e.location = (plot['cx'] - centre[0], -(plot['cz'] - centre[1]), 0)
        e.rotation_euler = (0, 0, -plot['t'])
    for m in bpy.data.materials:
        if m.node_tree:
            for nd in m.node_tree.nodes:
                if nd.type == 'MIX_RGB' and nd.blend_type == 'MULTIPLY':
                    nd.inputs['Fac'].default_value = 1.0
    gm = load_pbr_material('ground', 'dryearth', repeat=(0.5, 0.5))
    bpy.ops.mesh.primitive_plane_add(size=90, location=(0, 0, -0.03))
    g = bpy.context.active_object
    g.data.materials.append(gm)
    box_uv(g, (1, 1, 1))
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
    d = os.path.join(ROOT, 'docs', 'shots', 'assets-house_plots')
    os.makedirs(d, exist_ok=True)
    # entry-centred plan: plots 1/2 west (x -13..0), 3/4 east (x 0..13); the haveli courtyard is east of centre (Blender x +8, y 0)
    shots = [('a_overhead', (-14.0, -30.0, 30.0), (1.0, 0.0, 0.0), 26, (50, 0, 150)),
             ('b_courtyard', (14.0, -2.0, 1.7), (-3.0, 2.0, 0.8), 22, (55, 0, 200)),
             ('c_wall_close', (-5.0, 4.5, 1.5), (-8.5, 6.5, 0.6), 30, (55, 0, 120))]
    for name, loc, look, lens, sun_rot in shots:
        sun.rotation_euler = tuple(math.radians(x) for x in sun_rot)
        cam.location = loc
        cam.data.lens = lens
        cam.rotation_euler = (V(look) - V(loc)).to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = os.path.join(d, name + '.png')
        bpy.ops.render.render(write_still=True)
        print('rendered', sc.render.filepath)


if __name__ == '__main__':
    which = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'build'
    r = build_all()
    if which == 'render':
        render(r)
    else:
        export(r)
