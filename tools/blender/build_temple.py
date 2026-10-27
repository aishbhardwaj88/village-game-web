"""
The village mandir — Blender model (checklist: docs/temple-checklist.md). No Places V1 reference exists; built from
reference-from-unity/MAP.md ("small, peripheral, none dominant... scenery and ambient sound only") + src/temple.js's footprint and
the project's hard rule: plain and dignified, NO deity figures, NO religious imagery, NO text anywhere on or in it.
Run: tools/blender/make.sh temple temple      Authored in world offsets from TEMPLE_POS (8, 52); exact slot, rotationY 0.
Fixed by src/temple.js (collision): boundary wall 12 x 10 centred on TEMPLE_POS with a 2.6 m gate gap on the west (-x) side; plinth
6 x 5 x 0.4; shrine block 2.6 cube on the plinth's east half (cx = +1.5); porch 3 x 2.2 on the west half; peepal chabutra at (+8.5, 0)
r 1.4. The code temple stays hidden (`temple_old`) as collision backing. The peepal tree itself is a code stand-in (trees = Tripo).
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import wb, limb, cyl, sphere, prism_x, prism_z, quad, ROOT
from arch import Kit, ring, clay_pot, pot, LEAF, MARI, BRASS, STEEL, SOIL

OUT = os.path.join(ROOT, 'tmp', 'temple_raw.glb')
kit = Kit(wood_slot='terracotta')
rnd = random.Random(31)
PW, PD = 12.0, 10.0
GATE = 2.6
PL_W, PL_D, PL_H = 6.0, 5.0, 0.4
SH = 2.6                    # shrine cube / porch height above the plinth
SX = 1.5                    # shrine centre x (east half)
PX = -1.5                   # porch centre x (west half)
H0 = PL_H


def boundary():
    h = 1.0
    t = 0.22
    segs = [
        ('s', -PW / 2, PW / 2, -PD / 2 - t / 2, -PD / 2 + t / 2),
        ('n', -PW / 2, PW / 2, PD / 2 - t / 2, PD / 2 + t / 2),
        ('e', PW / 2 - t / 2, PW / 2 + t / 2, -PD / 2, PD / 2),
        ('w_a', -PW / 2 - t / 2, -PW / 2 + t / 2, -PD / 2, -GATE / 2),
        ('w_b', -PW / 2 - t / 2, -PW / 2 + t / 2, GATE / 2, PD / 2),
    ]
    for nm, x0, x1, z0, z1 in segs:
        kit.add('plaster', wb('wall_' + nm, x0, x1, z0, z1, 0, h, 0.01))
        kit.add('plinth', wb('wall_band_' + nm, x0 - 0.03, x1 + 0.03, z0 - 0.03 if (x1 - x0) > (z1 - z0) else z0, z1 + 0.03 if (x1 - x0) > (z1 - z0) else z1, 0, 0.3, 0.006))
        kit.add('trim', wb('wall_cope_' + nm, x0 - 0.05, x1 + 0.05, z0 - 0.05, z1 + 0.05, h, h + 0.08, 0.008))
    # gate pillars with plain domed caps; a stone threshold slab between them
    for sgn in (-1, 1):
        z = sgn * (GATE / 2 + 0.18)
        kit.add('plaster', wb('gate_pillar', -PW / 2 - 0.3, -PW / 2 + 0.3, z - 0.3, z + 0.3, 0, 1.7, 0.012))
        kit.add('plinth', wb('gate_pillar_band', -PW / 2 - 0.33, -PW / 2 + 0.33, z - 0.33, z + 0.33, 0, 0.4, 0.01))
        kit.add('trim', wb('gate_cap', -PW / 2 - 0.36, -PW / 2 + 0.36, z - 0.36, z + 0.36, 1.7, 1.8, 0.012))
        kit.add('paint', sphere('gate_dome', -PW / 2, z, 1.95, 0.22, 0.22, 0.2, 2), 0xE8DCC0)
    kit.add('apron', wb('threshold', -PW / 2 - 0.7, -PW / 2 + 0.3, -GATE / 2, GATE / 2, 0, 0.05, 0.008))


def plinth_and_steps():
    kit.add('apron', wb('plinth', -PL_W / 2, PL_W / 2, -PL_D / 2, PL_D / 2, 0, PL_H, 0.015))
    kit.add('trim', wb('plinth_cap', -PL_W / 2 - 0.05, PL_W / 2 + 0.05, -PL_D / 2 - 0.05, PL_D / 2 + 0.05, PL_H, PL_H + 0.05, 0.01))
    for i in range(3):
        d = 0.35
        x1 = -PL_W / 2 - d * i
        kit.add('apron', wb('step', x1 - d, x1, -1.2, 1.2, 0, PL_H * (3 - i) / 3, 0.01))
        # side cheek walls
    for sgn in (-1, 1):
        kit.add('apron', prism_x('cheek', -PL_W / 2 - 1.05, -PL_W / 2, [(sgn * 1.2, 0), (sgn * 1.2 + sgn * 0.2, 0), (sgn * 1.2 + sgn * 0.2, PL_H + 0.1), (sgn * 1.2, PL_H + 0.1)]))


def shrine():
    # solid 2.6 cube on the plinth's east half with a recessed (open, empty) doorway facing west
    x0, x1 = SX - 1.3, SX + 1.3
    z0, z1 = -1.3, 1.3
    wall = wb('shrine', x0, x1, z0, z1, H0, H0 + SH, 0.012)
    from common import boolean_cut
    boolean_cut(wall, wb('door_cut', x0 - 0.1, x0 + 0.9, -0.55, 0.55, H0, H0 + 2.0, 0), apply_mod=True)
    kit.add('plaster', wall)
    # door frame (plain stone) with a lintel, and a bare niche inside: floor slab, a brass lamp on a stand, nothing else
    kit.add('trim', wb('jamb_l', x0 - 0.08, x0 + 0.04, -0.65, -0.55, H0, H0 + 2.1, 0.008))
    kit.add('trim', wb('jamb_r', x0 - 0.08, x0 + 0.04, 0.55, 0.65, H0, H0 + 2.1, 0.008))
    kit.add('trim', wb('lintel', x0 - 0.1, x0 + 0.06, -0.7, 0.7, H0 + 2.0, H0 + 2.15, 0.01))
    kit.add('floor', wb('niche_floor', x0 + 0.05, x0 + 0.9, -0.55, 0.55, H0, H0 + 0.04, 0))
    kit.add('paint', cyl('lamp_stand', x0 + 0.6, 0.0, H0 + 0.04, H0 + 0.7, 0.05, 0.08, 10), BRASS)
    kit.add('paint', cyl('lamp_bowl', x0 + 0.6, 0.0, H0 + 0.7, H0 + 0.76, 0.12, 0.07, 12), BRASS)
    kit.add('paint', cyl('lamp_flame_wick', x0 + 0.6, 0.0, H0 + 0.76, H0 + 0.8, 0.012, 0.012, 6), 0xF2C21E)
    # plinth band + string course + corner pilasters
    kit.add('plinth', wb('shrine_band', x0 - 0.03, x1 + 0.03, z0 - 0.03, z1 + 0.03, H0, H0 + 0.5, 0.008))
    for (cx, cz) in ((x0, z0), (x0, z1), (x1, z0), (x1, z1)):
        kit.add('plaster', wb('pil', cx - 0.12, cx + 0.12, cz - 0.12, cz + 0.12, H0, H0 + SH, 0.01))
    # roof slab over the whole plinth with a cornice, then the stepped shikhar over the shrine
    kit.add('trim', wb('roof', -PL_W / 2 - 0.15, PL_W / 2 + 0.15, -PL_D / 2 - 0.15, PL_D / 2 + 0.15, H0 + SH, H0 + SH + 0.15, 0.015))
    kit.add('plinth', wb('roof_band', -PL_W / 2 - 0.17, PL_W / 2 + 0.17, -PL_D / 2 - 0.17, PL_D / 2 + 0.17, H0 + SH + 0.02, H0 + SH + 0.08, 0.006))
    y = H0 + SH + 0.15
    for k, (w, h) in enumerate(((1.8, 0.8), (1.3, 0.7), (0.9, 0.55), (0.45, 0.45))):
        kit.add('plaster', wb('tier', SX - w / 2, SX + w / 2, -w / 2, w / 2, y, y + h, 0.012))
        kit.add('plinth', wb('tier_band', SX - w / 2 - 0.03, SX + w / 2 + 0.03, -w / 2 - 0.03, w / 2 + 0.03, y, y + 0.07, 0.006))
        kit.add('trim', wb('tier_cap', SX - w / 2 - 0.06, SX + w / 2 + 0.06, -w / 2 - 0.06, w / 2 + 0.06, y + h - 0.05, y + h, 0.008))
        y += h
    # plain kalash finial (a round-bellied pot with a short neck) on top
    kit.add('paint', sphere('kalash', SX, 0, y + 0.18, 0.17, 0.17, 0.17, 2), BRASS)
    kit.add('paint', cyl('kalash_neck', SX, 0, y + 0.32, y + 0.42, 0.06, 0.09, 10), BRASS)
    kit.add('paint', sphere('kalash_tip', SX, 0, y + 0.5, 0.04, 0.04, 0.07, 1), BRASS)


def porch():
    # four plain square stone pillars with simple corbel brackets; the bell hangs at the entrance
    for px in (PX - PL_W * 0.25 + 0.2, PX + PL_W * 0.25 - 0.2):
        for pz in (-1.1 + 0.0, 1.1):
            kit.add('plaster', wb('pillar', px - 0.14, px + 0.14, pz - 0.14, pz + 0.14, H0, H0 + SH, 0.01))
            kit.add('plinth', wb('pillar_base', px - 0.17, px + 0.17, pz - 0.17, pz + 0.17, H0, H0 + 0.35, 0.008))
            kit.add('trim', wb('pillar_cap', px - 0.2, px + 0.2, pz - 0.2, pz + 0.2, H0 + SH - 0.12, H0 + SH, 0.008))
    kit.add('wood', wb('lintel_beam', PX - 1.5, PX + 1.5, -1.25, -0.95, H0 + SH - 0.28, H0 + SH - 0.1, 0.008))
    kit.add('wood', wb('lintel_beam', PX - 1.5, PX + 1.5, 0.95, 1.25, H0 + SH - 0.28, H0 + SH - 0.1, 0.008))
    # bell on a chain from the porch lintel at the west entrance (src/temple.js: bellX = -PL_W/2 - 0.5)
    bx = -PL_W / 2 - 0.5
    kit.add('paint', limb('bell_beam', (bx, -0.4, H0 + SH - 0.1), (bx, 0.4, H0 + SH - 0.1), 0.06, 0.06), 0x4A3A2A)
    kit.add('paint', limb('bell_chain', (bx, 0.0, H0 + SH - 0.1), (bx, 0.0, H0 + SH - 0.4), 0.015, 0.015), 0x2A2A2A)
    kit.add('paint', cyl('bell', bx, 0.0, H0 + SH - 0.62, H0 + SH - 0.4, 0.12, 0.04, 14), BRASS)
    kit.add('paint', sphere('bell_clapper', bx, 0.0, H0 + SH - 0.64, 0.03, 0.03, 0.03, 1), BRASS)


def porch_fittings():
    # donation box (steel-banded wooden box on a stone stand, slot in the lid), two worn jute prayer mats, a row of brass diyas on the shrine ledge
    dx, dz = -0.55, -1.75
    kit.add('plinth', wb('dbox_stand', dx - 0.22, dx + 0.22, dz - 0.22, dz + 0.22, H0, H0 + 0.7, 0.008))
    kit.add('wood', wb('dbox_body', dx - 0.26, dx + 0.26, dz - 0.26, dz + 0.26, H0 + 0.7, H0 + 1.15, 0.01))
    kit.add('wood', wb('dbox_lid', dx - 0.29, dx + 0.29, dz - 0.29, dz + 0.29, H0 + 1.15, H0 + 1.2, 0.008))
    kit.add('metal', wb('dbox_band_a', dx - 0.275, dx + 0.275, dz - 0.275, dz + 0.275, H0 + 0.78, H0 + 0.84, 0.004))
    kit.add('metal', wb('dbox_band_b', dx - 0.275, dx + 0.275, dz - 0.275, dz + 0.275, H0 + 1.02, H0 + 1.08, 0.004))
    kit.add('paint', wb('dbox_slot', dx - 0.1, dx + 0.1, dz - 0.015, dz + 0.015, H0 + 1.2, H0 + 1.215, 0.002), 0x1A1410)
    kit.add('metal', wb('dbox_hasp', dx + 0.2, dx + 0.3, dz - 0.04, dz + 0.04, H0 + 0.93, H0 + 1.1, 0.004))
    for i, (mx, mz, w, d) in enumerate(((-2.3, 0.35, 0.55, 1.1), (-1.5, -0.1, 0.5, 1.05))):
        kit.add('jute', wb('mat%d' % i, mx - w / 2, mx + w / 2, mz - d / 2, mz + d / 2, H0, H0 + 0.015, 0.003))
    x0 = SX - 1.3
    for sg in (-1, 1):
        kit.add('plinth', wb('diya_ledge', x0 - 0.14, x0, min(sg * 0.72, sg * 1.25), max(sg * 0.72, sg * 1.25), H0 + 0.9, H0 + 0.95, 0.006))
        for k in range(3):
            kit.add('paint', cyl('diya', x0 - 0.07, sg * (0.85 + k * 0.17), H0 + 0.95, H0 + 0.99, 0.045, 0.03, 10), BRASS)


def chabutra():
    # round brick tree platform with a deck, beside the temple (the peepal on it is a code stand-in)
    cx, cz, R = 8.5, 0.0, 1.4
    n = 28
    for i in range(n):
        a0, a1 = i / n * math.tau, (i + 1) / n * math.tau
        kit.add('brick', limb('kerb', (cx + R * math.cos(a0), cz + R * math.sin(a0), 0.25), (cx + R * math.cos(a1), cz + R * math.sin(a1), 0.25), 0.3, 0.5, 0.01))
    kit.add('floor', cyl('deck', cx, cz, 0.0, 0.54, R - 0.12, R - 0.12, 28))
    kit.add('paint', cyl('soil', cx, cz, 0.5, 0.56, R - 0.15, R - 0.15, 28), 0x6B5436)
    for k in range(2):
        kit.add('brick', wb('step', cx - R - 0.5 - k * 0.0, cx - R + 0.1, -0.5, 0.5, 0, 0.25 + k * 0.0, 0.008)) if k == 0 else None


def forecourt():
    # swept stone forecourt strip from the gate to the steps, two potted tulsi-free shrubs flanking the approach, a low stone bench
    kit.add('apron', wb('path', -PW / 2 - 0.6, -PL_W / 2 - 1.05, -1.0, 1.0, 0, 0.04, 0.008))
    for z in (-2.4, 2.4):
        pot(kit, -PL_W / 2 - 1.6, z, 0.0, 0.25, 0.35)
    kit.add('apron', wb('bench', -2.6, -0.4, PD / 2 - 1.1, PD / 2 - 0.65, 0.0, 0.42, 0.01))


boundary()
plinth_and_steps()
shrine()
porch()
porch_fittings()
chabutra()
forecourt()
TINTS = {'hb_plaster': '#F4EAD0', 'hb_plinth': '#B5683F', 'hb_trim': '#D8D0BC', 'hb_apron': '#A8A294', 'hb_floor': '#B8B3A3',
         'hb_wood': '#B89A74', 'hb_brick': '#C26543'}
kit.finalize(OUT, TINTS, drift_amp=0.05, ao_strength=0.4)
