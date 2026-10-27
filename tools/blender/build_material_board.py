"""
Material board (A0-MAT). 12 panels, 2 x 2 m, one per village material, each built from the SAME shared texture sets and runtime weathering
shader the staged places use, so what the board shows is what a place gets. Run: tools/blender/make.sh material_board material_board_v2
Frame: site-local metres, +z south = front. Row A z=-8 (wall materials), row B z=0 (roof/wood/metal), row C z=8 (ground and soft materials).
Panel = slab + dirt band at the foot + a repainted patch + edge stain strips + a chipped corner showing the layer beneath. Colours are sampled
from Places V1 reference images (see COLOURS), never picked per place: place builds take them from here by name.
"""
import sys, os, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import wb, ROOT
from arch import Kit

OUT = os.path.join(ROOT, 'tmp', 'material_board_v2_raw.glb')
kit = Kit(split_props=True, own=('thatch', 'metal', 'jute', 'wood'), tex_override={'metal': ('rust', 1.0), 'jute': ('burlap', 0.9), 'props': ('dryearth', 1.0)})  # board-only: rust scan on steel, burlap weave on jute, dry-earth scan on mud/packed earth
rnd = random.Random(11)


def mul(c, f, warm=0.0):
    r, g, b = (c >> 16) & 255, (c >> 8) & 255, c & 255
    r = min(255, int(r * f * (1 + warm))); g = min(255, int(g * f)); b = min(255, int(b * f * (1 - warm)))
    return (r << 16) | (g << 8) | b


# name: (kind, base colour, chip colour beneath, position)  -- kind folds into the shared set via arch.py's table
COLOURS = {
    'brick':       ('brick', 0xBE9C8C, 0x8A5040),
    'lime_plaster': ('plaster', 0xEDE6D2, 0xB06A50),
    'cement_plaster': ('plaster', 0xBDBCB6, 0xA6A39C),
    'painted_wood': ('wood', 0x9CC0B6, 0x9A9488),
    'tin':         ('tin', 0xB4B6B4, 0x9A6A50),
    'terracotta':  ('terracotta', 0xD8B492, 0xA08068),
    'concrete':    ('trim', 0xB4B6B6, 0xA8AAAC),
    'thatch':      ('thatch', 0xC8C0A8, 0xC9AD62),
    'mud_dung':    ('paint', 0x7E7058, 0x6A5C48),
    'jute':        ('jute', 0xD8CDB2, 0xB5A57E),
    'rusted_steel': ('metal', 0x907868, 0x5A4234),
    'packed_earth': ('paint', 0xC4B496, 0xB0A07E),
}
LAYOUT = [
    ('brick', -4.2, -8), ('lime_plaster', -1.4, -8), ('cement_plaster', 1.4, -8), ('concrete', 4.2, -8),
    ('tin', -4.2, 0), ('terracotta', -1.4, 0), ('painted_wood', 1.4, 0), ('rusted_steel', 4.2, 0),
    ('thatch', -4.2, 8), ('jute', -1.4, 8), ('mud_dung', 1.4, 8), ('packed_earth', 4.2, 8),
]

for name, cx, cz in LAYOUT:
    kind, col, under = COLOURS[name]
    flat = name in ('mud_dung', 'packed_earth')
    if flat:   # lie on the ground, seen from above at an angle
        kit.add(kind, wb(name + '_slab', cx - 1, cx + 1, cz - 1, cz + 1, 0.0, 0.12, 0.01), col)
        continue
    kit.add(kind, wb(name + '_slab', cx - 1, cx + 1, cz - 0.06, cz + 0.06, 0.0, 2.0, 0.012), col)
    if kind in ('plaster', 'trim', 'paint'):   # chipped plaster: small ragged nicks near corners and the foot, the layer beneath showing
        for i in range(7):
            nx = (cx + 0.45 + rnd.random() * 0.45) if i < 5 else (cx - 0.9 + rnd.random() * 0.4)
            nz0 = (1.55 + rnd.random() * 0.4) if i < 5 else (0.35 + rnd.random() * 0.5)
            kit.add(kind, wb(name + '_nick', nx, nx + 0.10 + rnd.random() * 0.14, cz + 0.06, cz + 0.068, nz0, nz0 + 0.08 + rnd.random() * 0.14, 0.0), under)

TINTS = {'hb_plaster': '#FFFFFF', 'hb_plinth': '#FFFFFF', 'hb_trim': '#FFFFFF', 'hb_wood': '#FFFFFF', 'hb_metal': '#FFFFFF', 'hb_brick': '#FFFFFF',
         'hb_tin': '#FFFFFF', 'hb_terracotta': '#FFFFFF', 'hb_thatch': '#FFFFFF', 'hb_jute': '#FFFFFF'}
kit.finalize(OUT, TINTS, drift={'hb_plaster': 0.04, 'hb_brick': 0.08})
