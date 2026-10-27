"""
Street lamps (J0, 27 Oct playthrough note): two types, each ONE model drawn instanced village-wide (src/props.js createStreetLamps).
  lamp_rcc_v2   : RCC concrete pole for abadi lanes: tapered octagonal pole on a damp cement collar, painted band, switch box with a hinged door,
                  pasted bills and a number plate, rain streaks, tube light on a braced bracket arm, DOWN-CABLE with clips from the fixture to the
                  switch box, an earth conduit to the ground, a porcelain insulator on top that the code hangs the sagging overhead wires from.
  lamp_solar_v2 : panchayat solar light for the chowk: slim steel pole on a concrete footing with anchor bolts, battery box with hasp and straps,
                  tilted panel (frame, cells, busbars) on a stub mount, LED head on a short arm, cables from panel and head down to the battery box.
Run: tools/blender/make.sh street_lamp lamp_rcc_v2   then   node tools/shrink.js tmp/lamp_solar_v2_raw.glb public/assets/models/lamp_solar_v2.glb 999999
Local frame: origin at the foot centre, arm and lane side = +z (glTF +z). Two meshes per model: hb_main (concrete: pole, boxes, panel) and hb_tin (iron: arms,
heads, cables, brackets). The game ignores the embedded materials and uses its own concrete / tin sets so the look matches the rest of the lanes.
Pole heights: RCC 6.4 m, solar 4.8 m (code scales each lamp 0.95..1.1 for variation).
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import wb, limb, cyl
from arch import Kit

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))


def rcc():
    kit = Kit(split_props=False)
    H = 6.4
    rad = lambda y: 0.155 - 0.08 * (y / H)           # pole radius at height y (cone from 0.155 to 0.075)
    # damp cement collar, grubby and chipped at the top edge
    kit.add('plaster', cyl('collar', 0, 0, 0, 0.34, 0.20, 0.17, seg=8), 0x5f625f)
    kit.add('plaster', cyl('collar_lip', 0, 0, 0.30, 0.37, 0.175, 0.16, seg=8), 0x8b8c88)
    # the pole
    kit.add('plaster', cyl('pole', 0, 0, 0.34, H, rad(0.34), 0.075, seg=8), 0xa4a8a9)
    # painted band (whitewash) with a black stripe above, faded
    kit.add('plaster', cyl('band_w', 0, 0, 1.0, 1.24, rad(1.12) + 0.006, rad(1.12) + 0.004, seg=8), 0xe8e2d0)
    kit.add('plaster', cyl('band_b', 0, 0, 1.24, 1.36, rad(1.3) + 0.006, rad(1.3) + 0.005, seg=8), 0x2a2a28)
    # switch box with a hinged door, latch and a conduit stub
    kit.add('plaster', wb('box', -0.15, 0.15, 0.10, 0.25, 1.52, 1.90, 0.008), 0x6a7468)
    kit.add('plaster', wb('box_door', -0.13, 0.13, 0.25, 0.262, 1.54, 1.88, 0.004), 0x5d6760)
    kit.add('tin', wb('latch', 0.09, 0.115, 0.262, 0.272, 1.69, 1.73, 0.002), 0x2e2e2c)
    kit.add('tin', wb('hinge_a', -0.125, -0.115, 0.262, 0.270, 1.58, 1.63, 0.002), 0x2e2e2c)
    kit.add('tin', wb('hinge_b', -0.125, -0.115, 0.262, 0.270, 1.78, 1.83, 0.002), 0x2e2e2c)
    # painted number plate on the lane side, faded
    kit.add('plaster', wb('plate', -0.09, 0.09, rad(0.9) - 0.01, rad(0.9) + 0.012, 0.85, 0.95, 0.002), 0xd8d2bd)
    kit.add('plaster', wb('plate_digits', -0.065, 0.065, rad(0.9) + 0.012, rad(0.9) + 0.015, 0.87, 0.93, 0.001), 0x3a3a36)
    # pasted bills on the far side (two layers, one torn), plus a faded sticker
    kit.add('plaster', wb('bill_a', -0.075, 0.075, -rad(2.7) - 0.012, -rad(2.7) + 0.004, 2.52, 2.90, 0.002), 0xc9b79a)
    kit.add('plaster', wb('bill_b', -0.04, 0.07, -rad(2.4) - 0.014, -rad(2.4) + 0.004, 2.30, 2.50, 0.002), 0xb98f86)
    kit.add('plaster', wb('sticker', -0.045, 0.045, -rad(1.45) - 0.012, -rad(1.45) + 0.004, 1.40, 1.49, 0.002), 0x9a3c34)
    # rain-water and rust streaks running down from the bracket (thin, low contrast)
    for i, (ang, y0, ln, col) in enumerate([(0.9, 6.0, 1.7, 0x8c6a52), (2.4, 5.9, 1.2, 0x7f8584), (4.1, 6.05, 2.1, 0x7f8584), (5.3, 5.8, 0.9, 0x8c6a52)]):
        r = rad(y0 - ln / 2) + 0.002
        kit.add('plaster', limb('streak%d' % i, (math.cos(ang) * r, -math.sin(ang) * r, y0), (math.cos(ang) * r, -math.sin(ang) * r, y0 - ln), 0.028, 0.006), col)
    # clamp ring + braced bracket arm toward the lane
    kit.add('tin', cyl('clamp', 0, 0, H - 0.22, H - 0.08, rad(H) + 0.02, rad(H) + 0.02, seg=10), 0x4a463e)
    kit.add('tin', limb('arm', (0, 0.0, H - 0.15), (0, 1.35, H - 0.05), 0.06), 0x4a463e)
    kit.add('tin', limb('brace', (0, 0.07, H - 0.95), (0, 0.95, H - 0.11), 0.035), 0x4a463e)
    # tube-light fixture: channel, end caps, diffuser
    kit.add('tin', wb('fixture', -0.055, 0.055, 0.28, 1.46, H - 0.30, H - 0.19, 0.012), 0xe0ddd0)
    kit.add('tin', wb('cap_a', -0.06, 0.06, 0.25, 0.29, H - 0.31, H - 0.18, 0.008), 0x4a463e)
    kit.add('tin', wb('cap_b', -0.06, 0.06, 1.45, 1.49, H - 0.31, H - 0.18, 0.008), 0x4a463e)
    kit.add('tin', wb('diffuser', -0.04, 0.04, 0.32, 1.42, H - 0.318, H - 0.30, 0.004), 0xf0eddc)
    # insulator + hook on the top for the overhead wires
    kit.add('tin', cyl('cap', 0, 0, H, H + 0.04, 0.078, 0.05, seg=8), 0x6f6f6a)
    kit.add('tin', cyl('insulator', 0, 0, H + 0.04, H + 0.15, 0.03, 0.022, seg=8), 0x7a5a45)
    # DOWN-CABLE: from the fixture along the arm, down the pole in clips to the switch box; earth conduit from the box to the collar
    kit.add('tin', limb('cable_arm', (0.02, 0.45, H - 0.17), (0.02, rad(H) + 0.01, H - 0.17), 0.018), 0x151515)
    kit.add('tin', limb('cable_down', (0.02, rad(H - 0.17) + 0.012, H - 0.17), (0.02, rad(1.9) + 0.012, 1.9), 0.02), 0x151515)
    y = 2.3
    while y < H - 0.5:
        kit.add('tin', wb('clip%d' % int(y * 10), -0.012, 0.05, rad(y) + 0.004, rad(y) + 0.026, y - 0.012, y + 0.012, 0.002), 0x2e2e2c)
        y += 0.95
    kit.add('tin', limb('earth', (0.11, 0.18, 1.52), (0.11, 0.2, 0.36), 0.026), 0x3d3d38)
    for yy in (0.9, 0.5):
        kit.add('tin', wb('earthclip%d' % int(yy * 10), 0.085, 0.14, 0.17, 0.215, yy - 0.012, yy + 0.012, 0.002), 0x2e2e2c)
    kit.finalize(os.path.join(ROOT, 'tmp', 'lamp_rcc_v2_raw.glb'), {}, drift_amp=0.06, ao_strength=0.5)


def solar():
    kit = Kit(split_props=False)
    H = 4.8
    # concrete footing with a base plate and four anchor bolts
    kit.add('plaster', wb('footing', -0.22, 0.22, -0.22, 0.22, 0.0, 0.30, 0.02), 0xb4b1a8)
    kit.add('plaster', wb('footing_dirt', -0.225, 0.225, -0.225, 0.225, 0.0, 0.07, 0.01), 0x7b7568)
    kit.add('tin', wb('plate', -0.11, 0.11, -0.11, 0.11, 0.30, 0.32, 0.004), 0x59606c)
    for sx in (-1, 1):
        for sz in (-1, 1):
            kit.add('tin', cyl('bolt', sx * 0.085, sz * 0.085, 0.32, 0.37, 0.011, 0.011, seg=6), 0x3a3d42)
            kit.add('tin', cyl('nut', sx * 0.085, sz * 0.085, 0.34, 0.355, 0.018, 0.018, seg=6), 0x4a4d52)
    # the steel pole (slightly tapered), a welded collar near the bottom and a rusty weld ring
    kit.add('tin', cyl('pole', 0, 0, 0.32, H, 0.062, 0.045, seg=12), 0x56655c)
    kit.add('tin', cyl('weld', 0, 0, 0.9, 0.95, 0.066, 0.066, seg=12), 0x6b5848)
    # battery box on the pole: body, door, hasp + padlock, vent slits, two steel straps
    kit.add('plaster', wb('battery', -0.17, 0.17, 0.065, 0.27, 2.70, 3.10, 0.01), 0x6f7a72)
    kit.add('plaster', wb('battery_door', -0.15, 0.15, 0.27, 0.282, 2.72, 3.08, 0.004), 0x646f67)
    kit.add('tin', wb('hasp', 0.10, 0.13, 0.282, 0.292, 2.86, 2.94, 0.002), 0x2e2e2c)
    kit.add('tin', wb('lock', 0.095, 0.135, 0.292, 0.318, 2.80, 2.86, 0.004), 0x8a6a30)
    for i in range(4):
        kit.add('tin', wb('vent%d' % i, -0.10, 0.04, 0.282, 0.288, 2.76 + i * 0.03, 2.775 + i * 0.03, 0.001), 0x2a2d2b)
    for yy in (2.72, 3.06):
        kit.add('tin', wb('strap%d' % int(yy * 100), -0.10, 0.10, -0.062, 0.07, yy - 0.015, yy + 0.015, 0.002), 0x3a3d42)
    # arm to the lane + LED head (housing, bright lens, rim)
    kit.add('tin', limb('arm', (0, 0.0, H - 0.18), (0, 0.85, H - 0.04), 0.05), 0x56655c)
    kit.add('tin', limb('brace', (0, 0.04, H - 0.85), (0, 0.55, H - 0.10), 0.03), 0x56655c)
    kit.add('tin', limb('head', (0, 0.62, H - 0.07), (0, 1.28, H - 0.14), 0.22, 0.07), 0xd6d2c2)
    kit.add('tin', limb('head_rim', (0, 0.60, H - 0.085), (0, 1.30, H - 0.155), 0.235, 0.02), 0x59606c)
    kit.add('tin', limb('lens', (0, 0.70, H - 0.168), (0, 1.22, H - 0.188), 0.17, 0.012), 0xf2f0e0)
    # panel: frame, dark cells slightly proud, busbars, on a stub mount from the pole top
    p0, p1 = (0, -0.34, H + 0.185), (0, 0.24, H + 0.415)
    kit.add('tin', cyl('top', 0, 0, H - 0.02, H + 0.06, 0.05, 0.035, seg=10), 0x56655c)
    kit.add('tin', limb('mount', (0, 0.0, H + 0.04), (0, -0.05, H + 0.30), 0.045), 0x59606c)
    kit.add('tin', limb('mount_rail', (0, -0.32, H + 0.20), (0, 0.22, H + 0.40), 0.7, 0.03), 0x59606c)
    kit.add('plaster', limb('frame', p0, p1, 1.04, 0.040), 0xb8bcc0)
    kit.add('plaster', limb('cells', p0, p1, 0.95, 0.046), 0x2a3a5c)
    for i in range(1, 6):   # horizontal busbars across the cell field
        u = i / 6.0
        a = (0, p0[1] + (p1[1] - p0[1]) * u, p0[2] + (p1[2] - p0[2]) * u)
        kit.add('plaster', limb('busbar%d' % i, (-0.47, a[1], a[2] + 0.0005), (0.47, a[1], a[2] + 0.0005), 0.010, 0.050), 0x8d98a8)
    for xx in (-0.16, 0.16):
        kit.add('plaster', limb('busbar_v%d' % int(xx * 100), (xx, p0[1], p0[2]), (xx, p1[1], p1[2]), 0.008, 0.050), 0x8d98a8)
    # cables: head and panel down to the battery box (clipped), battery box out the bottom
    kit.add('tin', limb('cable_head', (0.015, 0.50, H - 0.12), (0.015, 0.075, H - 0.13), 0.016), 0x151515)
    kit.add('tin', limb('cable_down', (0.03, 0.062, H - 0.13), (0.03, 0.062, 3.10), 0.018), 0x151515)
    kit.add('tin', limb('cable_panel', (0.0, 0.0, H + 0.20), (0.0, 0.055, H - 0.13), 0.016), 0x151515)
    for yy in (4.3, 3.8, 3.35):
        kit.add('tin', wb('clip%d' % int(yy * 100), 0.012, 0.055, 0.05, 0.076, yy - 0.012, yy + 0.012, 0.002), 0x2e2e2c)
    kit.add('tin', limb('cable_out', (0.04, 0.062, 2.70), (0.04, 0.062, 0.45), 0.018), 0x151515)
    kit.finalize(os.path.join(ROOT, 'tmp', 'lamp_solar_v2_raw.glb'), {}, drift_amp=0.06, ao_strength=0.5)


rcc()
solar()
