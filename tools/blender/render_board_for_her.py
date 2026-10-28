"""
Material board FOR HER: one image, 8 panels (tin, terracotta, painted wood, rusted steel, thatch, mud and dung, packed earth, jute),
flat-lit, square to camera, each filling its own cell, English label under each. SHOT ONLY: the materials are not rebuilt or touched,
this script imports the already-built raw GLBs in tmp/ (textures + vertex colours embedded) and only sets camera, light and framing.

Two steps (repo root):
  1. ~/Applications/Blender.app/Contents/MacOS/Blender -b --python tools/blender/render_board_for_her.py
         -> docs/shots/material-board/FOR-HER/cells/<name>.png   (one ortho render per panel)
  2. python3 tools/blender/render_board_for_her.py compose
         -> docs/shots/material-board/FOR-HER/board.png          (4 x 2 grid + labels, PIL)

Light: uniform grey sky (fills every cavity, so nothing goes black) plus one soft sun ~28 deg off the camera axis from upper left,
just enough to show the modelled relief. View transform 'Standard' so the albedo colours are not re-graded.
"""
import os
import sys
import math

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUTDIR = os.path.join(ROOT, 'docs', 'shots', 'material-board', 'FOR-HER')
CELLS = os.path.join(OUTDIR, 'cells')
TMP = os.path.join(ROOT, 'tmp')
RES = 900

# name, label, source glb, object names, region (xmin, xmax, ymin, ymax, zmin, zmax) in Blender coords, hint normal, up hint
PANELS = [
    ('tin', 'Tin sheet', 'material_board_v2_raw', ['hb_tin'], (-5.3, -3.1, -1, 1, -1, 3), (0, -1, 0), (0, 0, 1)),
    ('terracotta', 'Terracotta tiles', 'terracotta_panel_raw', ['hb_terracotta'], (-9, 9, -9, 9, -9, 9), (0, 0, 1), (0, 0, 1)),
    ('painted_wood', 'Painted wood', 'painted_wood_panel_raw', ['hb_main', 'hb_wood'], (-9, 9, -9, 9, -9, 9), (0, -1, 0), (0, 0, 1)),
    ('rusted_steel', 'Rusted steel', 'rusted_steel_panel_raw', ['hb_steel'], (-9, 9, -9, 9, -9, 9), (0, -1, 0), (0, 0, 1)),
    ('thatch', 'Thatch', 'rough_surfaces_raw', ['hb_thatch'], (-9, 9, -9, 9, -9, 9), (0, 0, 1), (0, 0, 1)),
    ('mud_dung', 'Mud and dung', 'rough_surfaces_raw', ['hb_props'], (0.4, 2.6, -9, 9, -9, 9), (0, -1, 0), (0, 0, 1)),
    ('packed_earth', 'Packed earth', 'rough_surfaces_raw', ['hb_props'], (3.4, 5.6, -9, 9, -9, 9), (0, 0, 1), (0, 1, 0)),
    ('jute', 'Jute', 'rough_surfaces_raw', ['hb_jute'], (-9, 9, -9, 9, -9, 9), (0, -1, 0), (0, 0, 1)),
]


def render_cells():
    import bpy
    from mathutils import Vector, Matrix
    os.makedirs(CELLS, exist_ok=True)
    only = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    for name, label, glb, objs, reg, hint, uphint in PANELS:
        if only and name not in only:
            continue
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=os.path.join(TMP, glb + '.glb'))
        sc = bpy.context.scene
        keep = [o for o in sc.objects if o.type == 'MESH' and o.name in objs]
        for o in list(sc.objects):
            if o.type == 'MESH' and o not in keep:
                bpy.data.objects.remove(o, do_unlink=True)
        hint = Vector(hint)
        # area-weighted normal of the faces in the region that face the camera side, and the region's points
        nsum = Vector((0, 0, 0)); pts = []
        x0, x1, y0, y1, z0, z1 = reg
        for o in keep:
            mw = o.matrix_world; nm = mw.to_3x3().inverted().transposed()
            for p in o.data.polygons:
                c = mw @ p.center
                if not (x0 <= c.x <= x1 and y0 <= c.y <= y1 and z0 <= c.z <= z1):
                    continue
                n = (nm @ p.normal).normalized()
                pts.append(c)
                if n.dot(hint) > 0.2:
                    nsum += n * p.area
        n = nsum.normalized() if nsum.length > 0 else hint
        up = Vector(uphint); up = (up - n * up.dot(n)).normalized()
        right = up.cross(n).normalized()   # camera looks along -n; right x up = n
        us = [p.dot(right) for p in pts]; vs = [p.dot(up) for p in pts]; ws = [p.dot(n) for p in pts]
        # fill the square cell: crop to the smaller extent, a little inside the edge
        ext = min(max(us) - min(us), max(vs) - min(vs)) * 0.92
        cu = (max(us) + min(us)) / 2; cv = (max(vs) + min(vs)) / 2
        centre = right * cu + up * cv + n * max(ws)
        cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
        cam.data.type = 'ORTHO'; cam.data.ortho_scale = ext; cam.data.clip_start = 0.01; cam.data.clip_end = 100
        rot = Matrix((right, up, n)).transposed()   # columns: camera x, y, z(back)
        cam.matrix_world = Matrix.Translation(centre + n * 10) @ rot.to_4x4()
        # light: uniform grey sky + soft sun from upper-left, ~28 deg off axis
        world = bpy.data.worlds.new('w'); sc.world = world; world.use_nodes = True
        bg = world.node_tree.nodes['Background']; bg.inputs[0].default_value = (1, 1, 1, 1); bg.inputs[1].default_value = 0.62
        ldir = (n + up * 0.42 - right * 0.30).normalized()   # direction TO the light
        sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sc.collection.objects.link(sun)
        sun.data.energy = 1.5; sun.data.angle = math.radians(12)
        sun.rotation_euler = (-ldir).to_track_quat('-Z', 'Y').to_euler()
        sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 48; sc.cycles.use_denoising = True
        sc.render.resolution_x = sc.render.resolution_y = RES; sc.render.resolution_percentage = 100
        sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'; sc.view_settings.exposure = 0.0
        sc.render.film_transparent = False
        sc.render.filepath = os.path.join(CELLS, name + '.png')
        bpy.ops.render.render(write_still=True)
        print('RENDERED', name, 'normal', tuple(round(v, 2) for v in n), 'ortho', round(ext, 2))


def compose():
    from PIL import Image, ImageDraw, ImageFont
    cols, rows, cell, pad, lab = 4, 2, 760, 24, 74
    W = cols * cell + (cols + 1) * pad; H = rows * (cell + lab) + (rows + 1) * pad + 70
    img = Image.new('RGB', (W, H), (46, 44, 42))
    d = ImageDraw.Draw(img)
    def font(sz):
        for f in ('/System/Library/Fonts/Avenir Next.ttc', '/System/Library/Fonts/Helvetica.ttc', '/Library/Fonts/Arial.ttf'):
            try:
                return ImageFont.truetype(f, sz)
            except Exception:
                pass
        return ImageFont.load_default()
    ft, fl = font(40), font(44)
    d.text((pad, 18), 'Material board - 8 village materials, flat light, square to camera', fill=(232, 228, 220), font=ft)
    missing = []
    for i, (name, label, *_r) in enumerate(PANELS):
        c, r = i % cols, i // cols
        x = pad + c * (cell + pad); y = 70 + pad + r * (cell + lab + pad)
        p = os.path.join(CELLS, name + '.png')
        if os.path.exists(p):
            img.paste(Image.open(p).convert('RGB').resize((cell, cell), Image.LANCZOS), (x, y))
        else:
            missing.append(name); d.rectangle((x, y, x + cell, y + cell), outline=(200, 80, 60), width=4)
            d.text((x + 20, y + cell // 2), 'NOT RENDERED', fill=(220, 120, 100), font=fl)
        d.rectangle((x, y + cell, x + cell, y + cell + lab), fill=(30, 29, 28))
        tw = d.textlength(label, font=fl)
        d.text((x + (cell - tw) / 2, y + cell + 12), label, fill=(240, 236, 228), font=fl)
    img.save(os.path.join(OUTDIR, 'board.png'))
    print('WROTE', os.path.join(OUTDIR, 'board.png'), 'missing:', missing or 'none')


if __name__ == '__main__':
    if 'compose' in sys.argv:
        compose()
    else:
        render_cells()
