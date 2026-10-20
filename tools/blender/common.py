"""
Shared helpers for the Blender asset pipeline (docs/FINISH_LINE.md / CLAUDE.md —
art director's 2026-10-20 direction: real buildings/props modelled in Blender,
not code-built three.js primitives; Tripo stays for people/vehicles/trees only).

Run any build script headless:
    ~/Applications/Blender.app/Contents/MacOS/Blender -b --python tools/blender/build_house.py

Conventions:
- Blender is Z-up; the glTF exporter converts to glTF's Y-up on export
  automatically — every build script works in Blender's native Z-up metres,
  matching this project's own "1 unit = 1 metre" rule.
- Real-world dimensions are read from this project's own JS source-of-truth
  constants (src/village.js etc.) by hand-copying the literal numbers into each
  build script's own constants, with a comment citing exactly which JS file/
  export they must stay in sync with — there's no automated JS<->Python bridge,
  so a dimension change on either side needs a human (or a future session) to
  update the other.
- Every exported building keeps real wall thickness, so the OLD code-built
  version (src/village.js etc.) stays in the scene as an invisible collider —
  see docs/asset-slots.md's existing hide-list convention, already how Tripo
  swaps work. This module only builds/exports the new visible mesh.
"""
import bpy
import bmesh
import math
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
TEXTURES_DIR = os.path.join(ROOT, 'public', 'assets', 'textures')
MODELS_OUT_DIR = os.path.join(ROOT, 'public', 'assets', 'models')


def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for block_type in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.node_groups):
        for block in list(block_type):
            if block.users == 0:
                block_type.remove(block)


def new_bmesh_obj(name, bm):
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj


def beveled_box(name, size, location=(0, 0, 0), bevel_width=0.01, bevel_segments=2):
    """A box sized (size_x, size_y, size_z) in Blender's own native axes — NO
    relabeling, what you pass is what you get, specifically to avoid the
    w/h/d-vs-x/y/z mix-ups a "size=(w,h,d)" naming invited in earlier versions
    of this function (real bug, cost real time — see tools/blender/build_house.py's
    git history). `location` is (x, y, z_floor): centred in X/Y, sitting on its
    BASE in Z (z_floor is the bottom face, not the centre — matching this
    project's own three.js "position = base, not centre" convention,
    src/materials.js's texturedThickBox etc.). Real edge bevels, not sharp CAD
    edges — the single biggest "toy vs real" visual cue at this polycount."""
    sx, sy, sz = size
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=(sx, sy, sz), verts=bm.verts)
    bmesh.ops.translate(bm, vec=(location[0], location[1], location[2] + sz / 2), verts=bm.verts)
    if bevel_width > 0:
        edges = [e for e in bm.edges]
        bmesh.ops.bevel(bm, geom=edges, offset=bevel_width, segments=bevel_segments, affect='EDGES', clamp_overlap=True)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return new_bmesh_obj(name, bm)


def boolean_cut(target, cutter, apply_mod=True):
    mod = target.modifiers.new(name='bool_cut', type='BOOLEAN')
    mod.operation = 'DIFFERENCE'
    mod.object = cutter
    mod.solver = 'EXACT'
    if apply_mod:
        bpy.context.view_layer.objects.active = target
        bpy.ops.object.modifier_apply(modifier=mod.name)
        bpy.data.objects.remove(cutter, do_unlink=True)
    return target


def smart_uv(obj, angle_limit=66, island_margin=0.02):
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(angle_limit), island_margin=island_margin)
    bpy.ops.object.mode_set(mode='OBJECT')


def box_uv(obj, size):
    """Cube-projection UVs at real-world scale (1 texture tile per metre by
    default) — better than smart_project for flat architectural walls/roofs,
    where smart_project's auto island layout often stretches large flat faces.
    `size` is the object's own (w,h,d) used to build it, so tiling is seeded
    at true scale."""
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.cube_project(cube_size=1.0, correct_aspect=True, scale_to_bounds=False)
    bpy.ops.object.mode_set(mode='OBJECT')


def load_pbr_material(name, set_name, repeat=(1, 1), roughness_factor=1.0):
    """Loads this project's own already-downloaded CC0 texture set (public/
    assets/textures/<set_name>/) — same assets the three.js side uses, so a
    Blender-built wall and a not-yet-converted code-built one still match.
    Maps: color (sRGB), normal (non-colour, OpenGL/+Y — glTF/three.js
    convention, matches how src/materials.js already loads these), roughness
    (non-colour), ao (non-colour, multiplied into the color via a mix, since
    Blender's Principled BSDF has no direct AO input)."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nodes, links = nt.nodes, nt.links
    for n in list(nodes):
        nodes.remove(n)

    out = nodes.new('ShaderNodeOutputMaterial')
    out.location = (600, 0)
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.location = (300, 0)
    links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])

    tex_coord = nodes.new('ShaderNodeTexCoord')
    tex_coord.location = (-800, 0)
    mapping = nodes.new('ShaderNodeMapping')
    mapping.location = (-600, 0)
    mapping.inputs['Scale'].default_value = (repeat[0], repeat[1], 1)
    links.new(tex_coord.outputs['UV'], mapping.inputs['Vector'])

    set_dir = os.path.join(TEXTURES_DIR, set_name)

    def tex_node(map_kind, colorspace, loc_y):
        path = os.path.join(set_dir, f'{set_name}_{map_kind}.webp')
        if not os.path.exists(path):
            return None
        img = bpy.data.images.load(path, check_existing=True)
        img.colorspace_settings.name = colorspace
        n = nodes.new('ShaderNodeTexImage')
        n.image = img
        n.location = (-300, loc_y)
        links.new(mapping.outputs['Vector'], n.inputs['Vector'])
        return n

    color_n = tex_node('color', 'sRGB', 300)
    normal_n = tex_node('normal', 'Non-Color', 0)
    rough_n = tex_node('roughness', 'Non-Color', -300)
    ao_n = tex_node('ao', 'Non-Color', -600)

    if color_n and ao_n:
        mix = nodes.new('ShaderNodeMixRGB')
        mix.blend_type = 'MULTIPLY'
        mix.inputs['Fac'].default_value = 0.85
        mix.location = (0, 300)
        links.new(color_n.outputs['Color'], mix.inputs['Color1'])
        links.new(ao_n.outputs['Color'], mix.inputs['Color2'])
        links.new(mix.outputs['Color'], bsdf.inputs['Base Color'])
    elif color_n:
        links.new(color_n.outputs['Color'], bsdf.inputs['Base Color'])

    if normal_n:
        norm_map = nodes.new('ShaderNodeNormalMap')
        norm_map.location = (0, 0)
        links.new(normal_n.outputs['Color'], norm_map.inputs['Color'])
        links.new(norm_map.outputs['Normal'], bsdf.inputs['Normal'])

    if rough_n:
        links.new(rough_n.outputs['Color'], bsdf.inputs['Roughness'])
    else:
        bsdf.inputs['Roughness'].default_value = roughness_factor

    return mat


def wire_vertex_ao(mat, strength=0.6):
    """Multiplies a (not-yet-existing) 'AO' colour attribute into the material's
    Base Color chain — call once per material right after creating it;
    bake_dirty_vertex_colors() (below) actually fills that attribute later, on
    the final joined object. Order doesn't matter since this just wires the
    node graph by NAME, matching whatever attribute shows up under that name at
    export time. Without this, a dirty-vertex-colour bake has no visible effect
    at all (confirmed — the glTF exporter warns 'active Vertex Color will not be
    exported, as it is not used in the node tree' and silently drops it)."""
    nt = mat.node_tree
    bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    base_input = bsdf.inputs['Base Color']
    attr = nt.nodes.new('ShaderNodeAttribute')
    attr.attribute_name = 'AO'
    attr.location = (-300, 600)
    mix = nt.nodes.new('ShaderNodeMixRGB')
    mix.blend_type = 'MULTIPLY'
    mix.inputs['Fac'].default_value = strength
    mix.location = (150, 600)
    if base_input.is_linked:
        src = base_input.links[0].from_socket
    else:
        src = None
        mix.inputs['Color1'].default_value = base_input.default_value
    nt.links.new(attr.outputs['Color'], mix.inputs['Color2'])
    if src:
        nt.links.new(src, mix.inputs['Color1'])
    nt.links.new(mix.outputs['Color'], base_input)


def tint_material(mat, rgb, strength=0.3):
    """Blends a flat tint into the Base Color chain — same 'texture grain stays
    visible under the paint' rule as src/materials.js's getTiledMaterial tint
    (docs/look-standard.md: 0.3 for walls, law)."""
    nt = mat.node_tree
    bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    base_input = bsdf.inputs['Base Color']
    if base_input.is_linked:
        src = base_input.links[0].from_socket
        mix = nt.nodes.new('ShaderNodeMixRGB')
        mix.blend_type = 'MULTIPLY'
        mix.inputs['Fac'].default_value = strength
        mix.inputs['Color2'].default_value = (*rgb, 1.0)
        mix.location = (150, 300)
        nt.links.new(src, mix.inputs['Color1'])
        nt.links.new(mix.outputs['Color'], base_input)
    else:
        c = base_input.default_value
        base_input.default_value = (
            c[0] * (1 - strength) + rgb[0] * strength,
            c[1] * (1 - strength) + rgb[1] * strength,
            c[2] * (1 - strength) + rgb[2] * strength,
            1.0,
        )


def hex_to_linear_rgb(hex_color):
    r = ((hex_color >> 16) & 0xFF) / 255.0
    g = ((hex_color >> 8) & 0xFF) / 255.0
    b = (hex_color & 0xFF) / 255.0
    # sRGB -> linear, so a hex colour picked by eye in sRGB (same as every
    # PALETTE value in src/village.js) tints correctly in Blender's linear
    # shading, not washed out.
    def to_linear(c):
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (to_linear(r), to_linear(g), to_linear(b))


def bake_dirty_vertex_colors(obj, blur_iterations=2, dirt_only=False):
    """A cheap cavity/AO approximation baked straight into a vertex colour
    layer (no UV/lightmap needed) — Blender's own "Dirty Vertex Colors"
    operator, the standard fast substitute for a full AO bake on hard-surface
    props. Multiplied into the shader's Base Color at render/export time via a
    Color Attribute node, so it survives into the exported glTF as
    COLOR_0 — three.js's MeshStandardMaterial already reads vertex colours
    when `vertexColors: true` is set on import (this project's asset-slot
    loader can do the same multiply, or the attribute can just ship unused
    until needed)."""
    bpy.context.view_layer.objects.active = obj
    if not obj.data.color_attributes:
        obj.data.color_attributes.new(name='AO', type='BYTE_COLOR', domain='CORNER')
    bpy.ops.object.mode_set(mode='VERTEX_PAINT')
    bpy.ops.paint.vertex_color_dirt(blur_strength=1.0, blur_iterations=blur_iterations, clean_angle=math.radians(180), dirt_angle=math.radians(0))
    bpy.ops.object.mode_set(mode='OBJECT')


def join_objects(objects, name):
    if len(objects) == 1:
        objects[0].name = name
        return objects[0]
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    merged = bpy.context.view_layer.objects.active
    merged.name = name
    return merged


def export_glb(objects, out_path, apply_transform=True):
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        use_selection=True,
        export_format='GLB',
        export_yup=True,
        export_apply=apply_transform,
        export_materials='EXPORT',
        export_image_format='WEBP',
        export_image_webp_fallback=False,
    )
    print(f'Exported {out_path}')
