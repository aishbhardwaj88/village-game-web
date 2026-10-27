"""Drying clothes on a line — ONE garment set, re-coloured per instance.

Art director's notes, 27 Oct:
  - "a part of the cloth falls on other side of the rope, and on top of that they put
    these pins" — the cloth is thrown OVER the rope, not hung from it. The back panel
    is visibly shorter than the front and the rope is visible between them.
  - colours were too dull — real village lines are strong colours, sun-softened, not pastel.
  - variety: sari, t-shirt, shirt, and so on, with different silhouettes.
  - "this should not hamper the speed of the game" — low mesh density, one draw call.

Technique: each garment is a front panel and a shorter back panel joined by a fold
over the rope. Folds come from the SHAPE (a sharp crease profile), not polygon count,
so the mesh stays cheap. Authored at rest; the game adds sway in a vertex shader.

Run: blender -b --python tools/blender/build_laundry.py
"""
import bpy
import bmesh
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import (  # noqa: E402
    clear_scene, new_bmesh_obj, cyl, limb, load_pbr_material, make_flat_material,
    box_uv, export_glb, MODELS_OUT_DIR, colorize,
)


def _tint_by_vertex_colour(mat):
    """Multiply base colour by the mesh's 'Col' layer, so one cloth material serves
    every garment and the game re-tints per instance."""
    nt = mat.node_tree
    bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    src = bsdf.inputs['Base Color'].links[0].from_socket if bsdf.inputs['Base Color'].links else None
    attr = nt.nodes.new('ShaderNodeAttribute')
    attr.attribute_name = 'Col'
    attr.location = (-250, -420)
    mix = nt.nodes.new('ShaderNodeMix')
    mix.data_type = 'RGBA'
    mix.blend_type = 'MULTIPLY'
    mix.inputs['Factor'].default_value = 1.0
    mix.location = (60, -300)
    if src:
        nt.links.new(src, mix.inputs[6])
    else:
        mix.inputs[6].default_value = (1, 1, 1, 1)
    nt.links.new(attr.outputs['Color'], mix.inputs[7])
    nt.links.new(mix.outputs[2], bsdf.inputs['Base Color'])
    return mat


objs = []


def add(o, mat):
    o.data.materials.append(mat)
    objs.append(o)
    return o


def line_sag(t, sag):
    return -sag * math.sin(math.pi * t)


def garment(name, x0, x1, z, top_h, front_len, back_len, hem_extra=0.0,
            nu=12, nv=6, folds=5, amp=0.07, sag=0.0, seed=0.0, sleeve=0.0):
    """Cloth thrown OVER a rope at `top_h`.

    front_len drops toward the viewer, back_len (shorter) behind it, joined by a
    rounded fold across the rope. `sleeve` > 0 widens the panel near the top only,
    which reads as shirt/t-shirt shoulders rather than a plain rectangle.
    """
    bm = bmesh.new()
    THICK = 0.055                     # half the fold width: the rope sits between

    def panel(sign, length, nvv):
        ring = []
        for iv in range(nvv + 1):
            v = iv / nvv
            row = []
            for iu in range(nu + 1):
                u = iu / nu
                w0 = x1 - x0
                # sleeves: extra width that dies off below the shoulder line
                sl = sleeve * max(0.0, 1.0 - v / 0.35) if sleeve else 0.0
                w = w0 + hem_extra * v + sl
                x = (x0 + x1) / 2 - w / 2 + w * u
                # sharp vertical creases: |sin|^0.6 is a crease, sin is a swell
                raw = math.sin(seed * 0.7 + u * folds * math.pi)
                crease = math.copysign(abs(raw) ** 0.6, raw)
                # the fold rounds over the rope at v=0, then the panel hangs
                over = math.sqrt(max(0.0, 1.0 - (1.0 - min(v, 0.18) / 0.18) ** 2))
                depth = sign * (THICK * over + amp * crease * (0.2 + 0.8 * v))
                h = top_h + line_sag(u, sag)
                h -= 0.045 * (1.0 - over)                       # the lip of the fold
                h -= length * v
                h -= 0.05 * abs(math.sin(seed + u * folds * 0.5 * math.pi)) * v
                h -= 0.025 * math.sin(seed + u * 5.1) * v * v   # uneven hem
                row.append(bm.verts.new((x, -(z + depth), h)))
            ring.append(row)
        for iv in range(nvv):
            for iu in range(nu):
                bm.faces.new((ring[iv][iu], ring[iv][iu + 1],
                              ring[iv + 1][iu + 1], ring[iv + 1][iu]))
        return ring

    f = panel(-1, front_len, nv)
    nvb = max(3, int(nv * 0.7))
    b = panel(1, back_len, nvb)
    # close the crown between the two panels so the fold reads solid from above
    for iu in range(nu):
        bm.faces.new((f[0][iu], f[0][iu + 1], b[0][iu + 1], b[0][iu]))
    # close both hems
    for ring, nvv in ((f, nv), (b, nvb)):
        for iu in range(nu):
            v0, v1 = ring[nvv][iu], ring[nvv][iu + 1]
            bm.faces.new((v0, v1, v1, v0)) if False else None
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    obj = new_bmesh_obj(name, bm)
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj


def clip(name, x, z, h):
    """A pin clamping both layers over the rope."""
    return [
        limb(f'{name}_a', (x - 0.016, z - 0.05, h - 0.05), (x - 0.016, z - 0.05, h + 0.05), t=0.012),
        limb(f'{name}_b', (x + 0.016, z + 0.05, h - 0.05), (x + 0.016, z + 0.05, h + 0.05), t=0.012),
    ]


def main():
    clear_scene()
    cloth = _tint_by_vertex_colour(
        load_pbr_material('ldy_cloth', 'tarpaulin', repeat=(5.0, 5.0), roughness_factor=1.0))
    wood = make_flat_material('ldy_wood', 0x8A6A44, roughness=0.92)
    rope = make_flat_material('ldy_rope', 0xC7B894, roughness=1.0)
    post = load_pbr_material('ldy_post', 'wood', repeat=(1.0, 1.0))

    LX0, LX1, LH, SAG, Z = -2.7, 2.7, 1.78, 0.13, 0.0

    for sx in (LX0, LX1):
        p = cyl(f'ldy_post_{"l" if sx < 0 else "r"}', sx, Z, 0, LH + 0.07, 0.045, seg=8)
        box_uv(p, (1, 1, 1))
        add(p, post)

    seg = 18
    pts = [(LX0 + (LX1 - LX0) * i / seg, Z, LH + line_sag(i / seg, SAG)) for i in range(seg + 1)]
    for i in range(seg):
        add(limb(f'ldy_line{i}', pts[i], pts[i + 1], t=0.009), rope)

    # name, x0, x1, front drop, back drop, hem flare, folds, amp, sleeve
    spec = [
        ('sari',    -2.52, -1.42, 1.22, 0.60, 0.26, 9, 0.075, 0.0),
        ('shirt',   -1.28, -0.62, 0.60, 0.34, 0.10, 4, 0.060, 0.30),   # sleeves
        ('sheet',   -0.48,  0.52, 0.88, 0.46, 0.14, 6, 0.065, 0.0),
        ('tshirt',   0.66,  1.20, 0.52, 0.30, 0.09, 4, 0.058, 0.26),   # sleeves
        ('dhoti',    1.34,  2.02, 1.02, 0.52, 0.22, 7, 0.072, 0.0),
        ('towel',    2.14,  2.56, 0.46, 0.26, 0.05, 3, 0.050, 0.0),
    ]
    # Strong village-line colours, sun-softened rather than pastel.
    tints = {
        'sari': 0xC2185B,     # magenta
        'shirt': 0x2E7D8F,    # teal
        'sheet': 0xE8E0CC,    # cream
        'tshirt': 0xD98324,   # mustard
        'dhoti': 0xEDE6D6,    # off-white
        'towel': 0x3E7D4F,    # green
    }
    for i, (nm, x0, x1, fl, bl, flare, nf, amp, sv) in enumerate(spec):
        g = garment(f'ldy_{nm}', x0, x1, Z, LH, fl, bl, hem_extra=flare,
                    folds=nf, amp=amp, sag=SAG, seed=i * 1.41, sleeve=sv)
        box_uv(g, (1, 1, 1))
        colorize(g, tints[nm], attr='Col')
        add(g, cloth)
        n = 3 if (x1 - x0) > 0.9 else 2
        for k in range(n):
            u = (k + 1) / (n + 1)
            x = x0 + (x1 - x0) * u
            t = (x - LX0) / (LX1 - LX0)
            for c in clip(f'ldy_pin_{nm}{k}', x, Z, LH + line_sag(t, SAG)):
                add(c, wood)

    out = os.path.join(MODELS_OUT_DIR, 'laundry_line.glb')
    export_glb(objs, out)
    tris = 0
    for o in objs:
        o.data.calc_loop_triangles()
        tris += len(o.data.loop_triangles)
    print(f'OBJECTS: {len(objs)}')
    print(f'TRIANGLES: {tris}')


main()
