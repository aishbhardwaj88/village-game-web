"""
Hand pumps (Wave 2 item 6, docs/PARALLEL.md): three varieties, each ONE small model drawn merged per material by src/handPumps.js.
  pump_mark2_v2   : India Mark II on a square cement plinth with a raised kerb, a drain channel out to a brick-ringed soak pit.
                    Pedestal + bolted flanges, water tank with a lime-scaled spout, box head with bolted cover, flat-bar lever with a
                    worn bare grip. Damp skirt, wet splash on the basin, algae along the outlet and in the channel.
  pump_old_v2     : older short cast-iron pump: fluted barrel on a bare-brick block (real modelled courses) with a cracked cement cap
                    and a part-fallen render patch; swan-neck spout, arched handle with a round knob, heavy pitting and rust bleed.
  pump_cracked_v2 : Mark II whose plinth has split into three slabs (real gaps, one sunk and tilted, a broken kerb corner, loose chunk),
                    with a puddle round the front and heavier algae. Paint mostly gone.
Run: tools/blender/make_hand_pumps.sh             (writes public/assets/models/pump_<type>_v2.glb, textures stripped, the game
                                                    re-applies the shared sets)
     Blender -b --python tools/blender/build_hand_pump.py -- render   (shots into docs/shots/assets-handpumps/)
Local frame: origin at the plinth centre on the ground, spout and drain side = +z (glTF +z), lever swings to -z.
Materials, frozen library only: plinth/kerb/cap = shared plaster set (cement grey tint), soak-pit ring + old block = brick set,
iron = shared metal set via arch.rust_steel (pitting relief, rust streaks, scale, bare metal). The puddle rides the metal draw call
as plain dark colour (no rust pass) so it picks up the metal set's sheen without a new material.
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
import bmesh
from mathutils import Vector, Matrix
from common import wb, limb, cyl, quad, new_bmesh_obj, load_pbr_material, box_uv, clear_scene
from arch import Kit

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CEMENT, CEMENT_HI, CEMENT_LO = 0xa29f96, 0xaeaba1, 0x8c897f
DAMP, WET, ALGAE, ALGAE_DK, SCALE = 0x75746c, 0x6a6b65, 0x5f6747, 0x4c5538, 0xcfcbbb
RUST, BARE, GRAVEL = 0x7a4a2c, 0x8b8a83, 0x7d7468
BRICK_TONES = [0x9a6650, 0x8e5d4a, 0xa36d55, 0x86594a, 0x9b7059]   # muted, dust-dulled kiln brick


# ---------------------------------------------------------------- helpers
def move(obj, dx=0.0, dz=0.0, dh=0.0):
    obj.data.transform(Matrix.Translation((dx, -dz, dh)))
    return obj


def tilt(obj, pivot, ax, deg):
    """Rotate mesh data about a (wx, wz, h) pivot. ax 'x' tips toward +-z, 'z' tips toward +-x."""
    p = Vector((pivot[0], -pivot[1], pivot[2]))
    axis = 'X' if ax == 'x' else 'Y'
    obj.data.transform(Matrix.Translation(p) @ Matrix.Rotation(math.radians(deg), 4, axis) @ Matrix.Translation(-p))
    return obj


def revolve(name, cx, cz, profile, seg=14, flutes=0, flute_amp=0.0, flute_band=(0.0, 0.0), pit=0.0, seed=0):
    """Surface of revolution, profile [(r, h)...] bottom to top, capped. Optional vertical flutes inside flute_band (h range) and
    random radial pitting (cast iron). Flat-shaded later by rust_steel, so the pits read as faceted dents."""
    rnd = random.Random(seed)
    bm = bmesh.new()
    rings = []
    for r, h in profile:
        ring = []
        for i in range(seg):
            a = i / seg * math.tau
            rr = r
            if flutes and flute_band[0] <= h <= flute_band[1]:
                rr *= 1.0 + flute_amp * math.cos(a * flutes)
            if pit and r > 0.02:
                rr += rnd.uniform(-pit, pit * 0.4)
            ring.append(bm.verts.new((cx + rr * math.cos(a), -(cz + rr * math.sin(a)), h)))
        rings.append(ring)
    for k in range(len(rings) - 1):
        for i in range(seg):
            j = (i + 1) % seg
            bm.faces.new((rings[k][i], rings[k][j], rings[k + 1][j], rings[k + 1][i]))
    if profile[0][0] > 0:
        bm.faces.new(list(reversed(rings[0])))
    if profile[-1][0] > 0:
        bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return new_bmesh_obj(name, bm)


def blob(name, cx, cz, h, rx, rz, seed, n=16, rough=0.22):
    """Irregular flat patch (algae, wet splash, puddle) lying at height h: a soft lobed outline (low-frequency wobble, never spiky),
    facing up."""
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


def vstreak(name, face, u0, u1, plane, hmax, seed, n=9):
    """Damp/algae tide-mark on a vertical face: flat bottom at ground, ragged soft top up to hmax. face 'z' = plane is a z
    value (+z or -z face), 'x' = plane is an x value. Sits 3 mm proud of the face."""
    rnd = random.Random(seed)
    top = []
    for i in range(n + 1):
        u = u0 + (u1 - u0) * i / n
        top.append((u, hmax * (0.45 + 0.55 * (0.5 + 0.5 * math.sin(u * 23 + seed)) * rnd.uniform(0.7, 1.0))))
    pts2 = [(u0, 0.0)] + top + [(u1, 0.0)]
    d = 0.003 if plane > 0 else -0.003
    pts = [(u, plane + d, h) for u, h in pts2] if face == 'z' else [(plane + d, u, h) for u, h in pts2]
    return quad(name, pts)


def bolt_ring(kit, cx, cz, h, R, n, col, seed, r=0.012):
    for i in range(n):
        a = i * math.tau / n + 0.3
        kit.add('metal', cyl('bolt', cx + R * math.cos(a), cz + R * math.sin(a), h, h + 0.022, r, r * 0.9, seg=6), col)


def jit(hexc, rnd, amt=0.06):
    """Per-unit colour variation: scale each channel by a shared value plus a small hue wobble."""
    v = 1.0 + rnd.uniform(-amt, amt)
    out = 0
    for sh in (16, 8, 0):
        c = (hexc >> sh) & 0xff
        c = int(max(0, min(240, c * v * (1.0 + rnd.uniform(-amt, amt) * 0.4))))
        out = (out << 8) | c
    return out


# ---------------------------------------------------------------- Mark II pump body (shared by mark2 + cracked)
def mark2_iron(kit, base, rnd, paint, worn=0.0, lean=0.0):
    """India Mark II above the basin floor at height `base`. paint = faded body colour; worn 0..1 = how much is bare/rusted."""
    P = jit(paint, rnd, 0.05)
    rust = jit(RUST, rnd, 0.08)
    parts_start = len(kit.records)
    # pedestal: base flange cast into the concrete, 4 bolts, three stiffening ribs, standpipe
    kit.add('metal', revolve('ped_flange', 0, 0, [(0.15, base - 0.01), (0.15, base + 0.025), (0.08, base + 0.045), (0.0, base + 0.045)], seg=16, pit=0.003, seed=rnd.randint(0, 999)), rust)
    bolt_ring(kit, 0, 0, base + 0.02, 0.12, 4, rust, rnd.randint(0, 99))
    for i in range(3):
        a = i * math.tau / 3 + 0.5
        c, s = math.cos(a), math.sin(a)
        kit.add('metal', limb('rib', (0.06 * c, 0.06 * s, base + 0.04), (0.13 * c, 0.13 * s, base + 0.04), 0.018, 0.06), P)
    kit.add('metal', revolve('pedestal', 0, 0, [(0.062, base + 0.03 + 0.04 * i) if i < 11 else (0.058, base + 0.47) for i in range(12)], seg=16, pit=0.0012, seed=rnd.randint(0, 999)), P)
    kit.add('metal', cyl('rust_foot', 0, 0, base + 0.03, base + 0.12, 0.066, 0.063, seg=12), rust)   # splash rust at the foot
    # flanged joint: pedestal -> water tank, 4 bolts with rust bleed
    J = base + 0.47
    kit.add('metal', cyl('flange_a', 0, 0, J, J + 0.03, 0.11, 0.11, seg=14), P)
    kit.add('metal', cyl('flange_b', 0, 0, J + 0.03, J + 0.055, 0.105, 0.10, seg=14), rust)
    bolt_ring(kit, 0, 0, J + 0.055, 0.085, 4, rust, rnd.randint(0, 99), r=0.011)
    # water tank: wider barrel, slightly pitted, spout on +z sloping down with a lime-scale mouth and drip
    T0, T1 = J + 0.055, J + 0.47
    kit.add('metal', revolve('tank', 0, 0, [(0.085, T0 + (T1 - 0.04 - T0) * i / 9) for i in range(10)] + [(0.08, T1), (0.0, T1)], seg=16, pit=0.0014, seed=rnd.randint(0, 999)), P)
    sh = T0 + 0.27
    kit.add('metal', cyl('spout_boss', 0, 0.07, sh - 0.05, sh + 0.05, 0.045, 0.045, seg=10), P)
    kit.add('metal', limb('spout', (0, 0.07, sh), (0, 0.30, sh - 0.07), 0.058, 0.05), P)
    kit.add('metal', limb('spout_lip', (0, 0.285, sh - 0.065), (0, 0.33, sh - 0.085), 0.066, 0.056), jit(SCALE, rnd, 0.04))
    kit.add('metal', limb('scale_streak', (0, 0.09, sh - 0.03), (0, 0.09, T0 + 0.04), 0.03, 0.006), jit(SCALE, rnd, 0.05))  # white lime run down the tank
    # top flange + head assembly: a box casting with a bolted front cover, axle bosses, top cover
    F = T1
    kit.add('metal', cyl('flange_t', 0, 0, F, F + 0.03, 0.11, 0.11, seg=14), rust)
    bolt_ring(kit, 0, 0, F + 0.03, 0.09, 4, rust, rnd.randint(0, 99), r=0.011)
    H0, H1 = F + 0.03, F + 0.23
    kit.add('metal', wb('head', -0.10, 0.10, -0.12, 0.11, H0, H1, 0.012), P)
    kit.add('metal', wb('cover', -0.085, 0.085, 0.11, 0.125, H0 + 0.02, H1 - 0.02, 0.006), P)
    for bx in (-0.065, 0.065):
        for bh in (H0 + 0.04, H1 - 0.04):
            kit.add('metal', limb('cbolt', (bx, 0.12, bh), (bx, 0.14, bh), 0.016), rust)
    kit.add('metal', wb('top_cover', -0.105, 0.105, -0.125, 0.115, H1, H1 + 0.02, 0.008), P)
    ax_h, ax_z = H1 - 0.06, -0.05
    kit.add('metal', limb('axle', (-0.13, ax_z, ax_h), (0.13, ax_z, ax_h), 0.05), rust)
    for sx in (-0.13, 0.13):
        kit.add('metal', limb('axle_nut', (sx, ax_z, ax_h), (sx * 1.12, ax_z, ax_h), 0.062), rust)
    # lever: flat bar out to -z rising ~22 deg, bends down near the end, round bare grip (paint worn off by hands)
    up = math.radians(22 + rnd.uniform(-4, 4))
    L1 = 0.62
    p0 = (0.0, ax_z - 0.10, ax_h + 0.01)
    p1 = (0.0, p0[1] - L1 * math.cos(up), p0[2] + L1 * math.sin(up))
    p2 = (0.0, p1[1] - 0.22, p1[2] - 0.02)
    p3 = (0.0, p2[1] - 0.20, p2[2] - 0.10)
    kit.add('metal', limb('lever_root', (0, ax_z + 0.04, ax_h), p0, 0.05, 0.075), P)
    kit.add('metal', limb('lever', p0, p1, 0.032, 0.06), P)
    kit.add('metal', limb('lever_b', p1, p2, 0.03, 0.05), jit(BARE, rnd, 0.05) if worn > 0.5 else P)
    kit.add('metal', limb('grip', p2, p3, 0.044, 0.044), jit(BARE, rnd, 0.05))
    kit.add('metal', limb('grip_rust', p1, (0, p1[1] - 0.05, p1[2] - 0.004), 0.034, 0.054), rust)
    if lean:
        for k, o, c in kit.records[parts_start:]:
            tilt(o, (0, 0, base), 'z', lean)


def mark2(cracked=False, seed=11):
    rnd = random.Random(seed)
    kit = Kit(split_props=False, own=('metal',), route={'water': 'metal'})
    c = lambda h, a=0.05: jit(h, rnd, a)
    if not cracked:
        # square cement plinth 1.1 m, rough damp skirt at the bottom, raised kerb forming a basin, outlet gap on +z
        kit.add('plaster', wb('skirt', -0.565, 0.565, -0.565, 0.565, 0, 0.07, 0.015), c(DAMP))
        kit.add('plaster', wb('slab', -0.55, 0.55, -0.55, 0.55, 0.07, 0.15, 0.012), c(CEMENT))
        kit.add('plaster', wb('basin', -0.48, 0.48, -0.48, 0.48, 0.15, 0.158, 0.004), c(CEMENT_LO))
        kerb = c(CEMENT_HI)
        kit.add('plaster', wb('kerb_n', -0.55, 0.55, -0.55, -0.47, 0.15, 0.22, 0.012), kerb)
        kit.add('plaster', wb('kerb_w', -0.55, -0.47, -0.47, 0.55, 0.15, 0.215, 0.012), kerb)
        kit.add('plaster', wb('kerb_e', 0.47, 0.55, -0.47, 0.55, 0.15, 0.218, 0.012), kerb)
        kit.add('plaster', wb('kerb_sw', -0.47, -0.09, 0.47, 0.55, 0.15, 0.214, 0.012), kerb)
        kit.add('plaster', wb('kerb_se', 0.09, 0.47, 0.47, 0.55, 0.15, 0.216, 0.012), kerb)
        kit.add('plaster', wb('chip', 0.38, 0.47, -0.55, -0.50, 0.19, 0.22, 0.006), c(CEMENT_LO))   # knocked corner, paler aggregate showing
        # wet splash under the spout, algae creeping from the outlet along the kerb foot
        kit.add('plaster', blob('splash', 0.0, 0.30, 0.161, 0.20, 0.14, rnd.randint(0, 999)), c(WET))
        kit.add('plaster', blob('algae_a', -0.02, 0.44, 0.163, 0.13, 0.05, rnd.randint(0, 999)), c(ALGAE))
        kit.add('plaster', blob('algae_b', 0.30, 0.44, 0.162, 0.11, 0.035, rnd.randint(0, 999)), c(ALGAE_DK))
        # drain channel: outlet lip, a cement trough on the ground out to a brick-ringed soak pit
        kit.add('plaster', wb('outlet', -0.09, 0.09, 0.47, 0.62, 0.10, 0.155, 0.008), c(CEMENT_LO))
        kit.add('plaster', wb('ch_bed', -0.065, 0.065, 0.55, 0.92, 0.0, 0.035, 0.006), c(WET))
        kit.add('plaster', wb('ch_l', -0.11, -0.065, 0.55, 0.92, 0.0, 0.085, 0.01), c(CEMENT))
        kit.add('plaster', wb('ch_r', 0.065, 0.11, 0.55, 0.90, 0.0, 0.08, 0.01), c(CEMENT))
        kit.add('plaster', blob('ch_algae', 0.0, 0.76, 0.037, 0.05, 0.14, rnd.randint(0, 999), rough=0.15), c(ALGAE_DK))
        # soak pit: ring of 9 bricks laid flat, gravel inside, dark wet earth round it
        pz, pr = 1.13, 0.22
        kit.add('plaster', blob('pit_mud', 0.0, pz, 0.004, 0.36, 0.32, rnd.randint(0, 999), n=13, rough=0.18), c(0x6a5b48))
        for i in range(9):
            a0 = i / 9 * math.tau + 0.12
            a1 = a0 + math.tau / 9 * 0.86
            h = 0.035 + rnd.uniform(-0.008, 0.006)
            kit.add('plaster', limb('pit_brick', (pr * math.cos(a0), pz + pr * math.sin(a0), h), (pr * math.cos(a1), pz + pr * math.sin(a1), h), 0.10, 0.065), BRICK_TONES[rnd.randint(0, 4)])
        for i in range(9):
            a, r = rnd.uniform(0, math.tau), rnd.uniform(0.0, 0.13)
            s = rnd.uniform(0.025, 0.045)
            kit.add('plaster', wb('gravel', r * math.cos(a) - s, r * math.cos(a) + s, pz + r * math.sin(a) - s * 0.8, pz + r * math.sin(a) + s * 0.8, 0.0, 0.02 + s * 0.5, 0.008, 1), c(GRAVEL, 0.12))
        base = 0.158
        mark2_iron(kit, base, rnd, 0x6b93ab, worn=0.3)   # faded Mark II blue; rust_steel pulls it toward rust
        name = 'pump_mark2_v2'
    else:
        # the plinth has split into three slabs: back-left stays, front-right sinks and tips, a loose chunk beside the outlet
        kit.add('plaster', blob('puddle_mud', 0.10, 0.58, 0.004, 0.62, 0.42, rnd.randint(0, 999), n=14, rough=0.2), c(0x4a4136))
        kit.add('water', blob('puddle', 0.12, 0.62, 0.009, 0.50, 0.32, rnd.randint(0, 999), n=18, rough=0.24), 0x4a5457)
        kit.add('plaster', wb('skirt_a', -0.565, 0.04, -0.565, 0.565, 0, 0.07, 0.015), c(DAMP))
        kit.add('plaster', wb('slab_a', -0.55, 0.03, -0.55, 0.55, 0.07, 0.15, 0.012), c(CEMENT))
        kit.add('plaster', wb('basin_a', -0.48, 0.03, -0.48, 0.48, 0.15, 0.158, 0.004), c(CEMENT_LO))
        kerb = c(CEMENT_HI)
        kit.add('plaster', wb('kerb_n', -0.55, 0.03, -0.55, -0.47, 0.15, 0.22, 0.012), kerb)
        kit.add('plaster', wb('kerb_w', -0.55, -0.47, -0.47, 0.55, 0.15, 0.215, 0.012), kerb)
        kit.add('plaster', wb('kerb_sw', -0.47, -0.09, 0.47, 0.55, 0.15, 0.20, 0.012), kerb)   # worn down
        # slab B (east half, -z part) sunk 3 cm and tipped outward
        b = [wb('skirt_b', 0.065, 0.565, -0.565, 0.10, 0, 0.07, 0.015), wb('slab_b', 0.065, 0.55, -0.55, 0.09, 0.07, 0.15, 0.012),
             wb('basin_b', 0.065, 0.48, -0.48, 0.09, 0.15, 0.158, 0.004), wb('kerb_eb', 0.47, 0.55, -0.47, 0.09, 0.15, 0.218, 0.012),
             wb('kerb_nb', 0.065, 0.55, -0.55, -0.47, 0.15, 0.22, 0.012)]
        cols = [c(DAMP), c(CEMENT, 0.08), c(CEMENT_LO), c(CEMENT_HI), c(CEMENT_HI)]
        for o, cc in zip(b, cols):
            tilt(move(o, dh=-0.03), (0.065, 0, 0), 'z', -3.5)
            kit.add('plaster', o, cc)
        # slab C (east half, +z part) sunk further, tipped toward the puddle; kerb corner broken off
        cc_ = [wb('skirt_c', 0.075, 0.565, 0.125, 0.565, 0, 0.07, 0.015), wb('slab_c', 0.075, 0.55, 0.125, 0.55, 0.07, 0.15, 0.012),
               wb('basin_c', 0.075, 0.48, 0.125, 0.48, 0.15, 0.158, 0.004), wb('kerb_ec', 0.47, 0.55, 0.125, 0.36, 0.15, 0.21, 0.012),
               wb('kerb_sc', 0.09, 0.30, 0.47, 0.55, 0.15, 0.205, 0.012)]
        cols = [c(DAMP), c(CEMENT_LO, 0.08), c(WET), c(CEMENT), c(CEMENT)]
        for o, cc in zip(cc_, cols):
            tilt(tilt(move(o, dh=-0.05), (0.075, 0.125, 0), 'z', -2.5), (0, 0.125, 0), 'x', 4.0)
            kit.add('plaster', o, cc)
        # dirt and weeds packed into the cracks, the broken kerb chunk lying in the puddle edge
        kit.add('plaster', wb('gap_x', 0.03, 0.075, -0.56, 0.56, 0.0, 0.10, 0.004), c(0x3f362c))
        kit.add('plaster', wb('gap_z', 0.06, 0.56, 0.09, 0.13, 0.0, 0.08, 0.004), c(0x3f362c))
        kit.add('plaster', blob('weed', 0.05, -0.2, 0.105, 0.03, 0.12, rnd.randint(0, 999), n=7), c(ALGAE))
        chunk = wb('chunk', 0.0, 0.17, 0.0, 0.08, 0.0, 0.065, 0.01)
        tilt(chunk, (0.08, 0.04, 0), 'x', 12)
        kit.add('plaster', move(chunk, dx=0.52, dz=0.66), c(CEMENT_HI))
        # heavy algae: over the outlet lip, round the sunk slab foot, the splash zone
        kit.add('plaster', wb('outlet', -0.09, 0.09, 0.47, 0.60, 0.09, 0.15, 0.008), c(0x6a6c5c))
        kit.add('plaster', blob('splash', -0.16, 0.28, 0.161, 0.12, 0.11, rnd.randint(0, 999)), c(WET))
        kit.add('plaster', blob('algae_a', -0.22, 0.43, 0.161, 0.20, 0.06, rnd.randint(0, 999)), c(ALGAE))
        kit.add('plaster', vstreak('algae_skirt', 'z', -0.56, -0.10, 0.565, 0.11, rnd.randint(0, 99)), c(ALGAE_DK))
        kit.add('plaster', vstreak('algae_wskirt', 'x', 0.05, 0.56, -0.565, 0.08, rnd.randint(0, 99)), c(ALGAE))
        base = 0.158
        mark2_iron(kit, base, rnd, 0x7a8c8a, worn=0.9, lean=-1.8)   # paint mostly chalked off
        name = 'pump_cracked_v2'
    return kit, name


# ---------------------------------------------------------------- old cast-iron pump
def old(seed=23):
    rnd = random.Random(seed)
    kit = Kit(split_props=False, own=('metal',))
    c = lambda h, a=0.05: jit(h, rnd, a)
    # bare brick block 0.52 x 0.52, five courses of real bricks (stretcher bond, staggered), mortar core behind
    W, ch, nc = 0.26, 0.068, 5
    kit.add('plaster', wb('mortar_core', -W + 0.012, W - 0.012, -W + 0.012, W - 0.012, 0, ch * nc, 0.004), c(0x8e877a))
    for k in range(nc):
        h0 = k * ch + 0.006
        h1 = (k + 1) * ch - 0.004
        off = 0.0 if k % 2 == 0 else 0.115
        for face in range(4):
            u = -W - off
            while u < W - 0.01:
                u0, u1 = max(u + 0.004, -W), min(u + 0.226, W)
                if u1 - u0 > 0.04:
                    cut_low = (k == 0 and face == 0 and u0 > 0.0)   # a chipped bottom brick at the front-right
                    hh1 = h1 - (0.02 if cut_low else 0)
                    if face >= 2:   # side faces stop short of the corners so no two bricks interpenetrate
                        u0, u1 = max(u0, -W + 0.114), min(u1, W - 0.114)
                    if u1 - u0 < 0.04:
                        u += 0.23
                        continue
                    if face == 0:
                        o = wb('br', u0, u1, W - 0.11, W, h0, hh1, 0.006, 1)
                    elif face == 1:
                        o = wb('br', u0, u1, -W, -W + 0.11, h0, hh1, 0.006, 1)
                    elif face == 2:
                        o = wb('br', W - 0.11, W, u0, u1, h0, hh1, 0.006, 1)
                    else:
                        o = wb('br', -W, -W + 0.11, u0, u1, h0, hh1, 0.006, 1)
                    kit.add('plaster', o, BRICK_TONES[rnd.randint(0, 4)])
                u += 0.23
    top = ch * nc
    # cement cap, cracked across with one corner spalled, render patch clinging to the -x face
    kit.add('plaster', wb('cap_a', -0.28, 0.02, -0.28, 0.28, top, top + 0.045, 0.012), c(CEMENT))
    capb = wb('cap_b', 0.034, 0.28, -0.28, 0.20, top, top + 0.045, 0.012)
    kit.add('plaster', tilt(capb, (0.034, 0, top), 'z', -1.6), c(CEMENT_LO))
    kit.add('plaster', wb('cap_crack', 0.02, 0.034, -0.28, 0.28, top - 0.01, top + 0.03, 0.002), c(0x3f382f))
    kit.add('plaster', wb('render', -0.275, -0.26, -0.24, 0.10, 0.06, top - 0.01, 0.006), c(CEMENT_LO))
    kit.add('plaster', blob('cap_wet', 0.0, 0.17, top + 0.047, 0.09, 0.07, rnd.randint(0, 999)), c(WET))
    kit.add('plaster', vstreak('algae_front', 'z', -0.22, 0.14, W, 0.10, rnd.randint(0, 99)), c(ALGAE_DK))
    kit.add('plaster', blob('ground_wet', 0.02, 0.40, 0.004, 0.22, 0.15, rnd.randint(0, 999)), c(0x75664f))
    y = top + 0.045
    IRON = c(0x34393a)
    rust = c(RUST, 0.08)
    # fluted barrel: base flange, ribbed body narrowing up, collar, domed cap
    kit.add('metal', revolve('foot', 0, 0, [(0.15, y), (0.15, y + 0.03), (0.12, y + 0.05), (0.0, y + 0.05)], seg=16, pit=0.003, seed=rnd.randint(0, 999)), rust)
    bolt_ring(kit, 0, 0, y + 0.02, 0.13, 3, rust, rnd.randint(0, 99), r=0.014)
    prof = [(0.12, y + 0.04), (0.118, y + 0.10), (0.11, y + 0.20), (0.10, y + 0.30), (0.092, y + 0.40), (0.088, y + 0.46)]
    kit.add('metal', revolve('barrel', 0, 0, prof + [(0.0, y + 0.46)], seg=24, flutes=12, flute_amp=0.07, flute_band=(y + 0.08, y + 0.42), pit=0.003, seed=rnd.randint(0, 999)), IRON)
    kit.add('metal', cyl('band', 0, 0, y + 0.06, y + 0.10, 0.126, 0.124, seg=16), rust)
    kit.add('metal', revolve('collar', 0, 0, [(0.098, y + 0.46), (0.104, y + 0.48), (0.104, y + 0.51), (0.07, y + 0.56), (0.035, y + 0.585), (0.0, y + 0.59)], seg=16, pit=0.002, seed=rnd.randint(0, 999)), IRON)
    # rust bleeding down the flutes from the collar
    for i in range(3):
        a = rnd.uniform(0, math.tau)
        r = 0.097
        kit.add('metal', limb('bleed', (r * math.cos(a), r * math.sin(a), y + 0.45), ((r + 0.02) * math.cos(a), (r + 0.02) * math.sin(a), y + 0.18 + rnd.uniform(0, 0.1)), 0.022, 0.006), rust)
    # fork on the cap: two cheeks with a pin; the handle's short arm links to the rod at the front
    Y = y + 0.585
    for sx in (-0.035, 0.035):
        kit.add('metal', wb('cheek', sx - 0.012, sx + 0.012, -0.05, 0.03, Y - 0.02, Y + 0.10, 0.006), IRON)
    kit.add('metal', limb('pin', (-0.06, -0.01, Y + 0.075), (0.06, -0.01, Y + 0.075), 0.026), rust)
    kit.add('metal', limb('rod_link', (0, 0.07, Y + 0.06), (0, 0.06, Y - 0.04), 0.022), rust)
    # swan-neck spout: up and out of the barrel at mid height, then curving down, flared mouth with lime scale
    sh = y + 0.30
    kit.add('metal', limb('sp0', (0, 0.08, sh), (0, 0.17, sh + 0.02), 0.06, 0.055), IRON)
    kit.add('metal', limb('sp1', (0, 0.165, sh + 0.02), (0, 0.24, sh - 0.03), 0.054, 0.05), IRON)
    kit.add('metal', limb('sp2', (0, 0.235, sh - 0.025), (0, 0.27, sh - 0.11), 0.05, 0.046), rust)
    kit.add('metal', limb('sp_mouth', (0, 0.268, sh - 0.10), (0, 0.276, sh - 0.135), 0.064, 0.06), c(SCALE, 0.04))
    # arched handle out to -z: rises from the pin, arcs over, drops to a round knob
    pts = []
    for i in range(7):
        t = i / 6
        zz = -0.01 - 0.55 * t
        hh = Y + 0.075 + 0.16 * math.sin(t * math.pi * 0.85) - 0.06 * t
        pts.append((0.0, zz, hh))
    for i in range(6):
        kit.add('metal', limb('hdl', pts[i], pts[i + 1], 0.034 - 0.002 * i, 0.04 - 0.002 * i), IRON if i < 4 else c(BARE))
    kit.add('metal', limb('hdl_front', (0, 0.07, Y + 0.06), pts[0], 0.032, 0.04), IRON)
    e = pts[-1]
    kit.add('metal', revolve('knob', 0, e[1] - 0.02, [(0.0, e[2] - 0.04), (0.03, e[2] - 0.03), (0.035, e[2]), (0.03, e[2] + 0.03), (0.0, e[2] + 0.04)], seg=10), c(BARE))
    return kit, 'pump_old_v2'


def finalize(kit, name, out_dir='tmp'):
    kit.finalize(os.path.join(ROOT, out_dir, name + '_raw.glb'), {}, drift_amp=0.07, ao_strength=0.5)


# ---------------------------------------------------------------- preview render
def render_all():
    """One Kit carrying all three side by side. Kit() clears the scene, so each build is unlinked, then re-linked into the master."""
    from mathutils import Vector as V
    builds = [(mark2, (False,), -1.5), (old, (), 0.0), (mark2, (True,), 1.6)]
    records = []
    for fn, args, dx in builds:
        kit, _ = fn(*args)
        for kind, o, col in kit.records:
            move(o, dx=dx)
        records.extend(kit.records)
        # keep objects alive: the next Kit() clears the scene, so stash them out of the scene first
        for _, o, _ in kit.records:
            for coll in list(o.users_collection):
                coll.objects.unlink(o)
    master = Kit(split_props=False, own=('metal',), route={'water': 'metal'})
    for kind, o, col in records:
        bpy.context.collection.objects.link(o)
        master.add(kind, o, col)
    master.finalize(os.path.join(ROOT, 'tmp', 'hand_pumps_preview_raw.glb'), {}, drift_amp=0.07, ao_strength=0.5)
    for m in bpy.data.materials:   # the game multiplies vertex colour in full; match it in the preview
        if m.node_tree:
            for nd in m.node_tree.nodes:
                if nd.type == 'MIX_RGB' and nd.blend_type == 'MULTIPLY':
                    nd.inputs['Fac'].default_value = 1.0
    gm = load_pbr_material('ground', 'dryearth', repeat=(0.5, 0.5))
    bpy.ops.mesh.primitive_plane_add(size=14, location=(0, -2.0, 0))
    g = bpy.context.active_object; g.data.materials.append(gm); box_uv(g, (1, 1, 1))
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = 64
    sc.cycles.device = 'CPU'
    sc.render.resolution_x, sc.render.resolution_y = 1200, 800
    sc.view_settings.view_transform = 'AgX'
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.55, 0.62, 0.75, 1); w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.7
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sc.collection.objects.link(sun)
    sun.data.energy = 4.0; sun.data.color = (1.0, 0.93, 0.82); sun.data.angle = math.radians(1.0)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
    d = os.path.join(ROOT, 'docs', 'shots', 'assets-handpumps')
    os.makedirs(d, exist_ok=True)
    # Blender frame: (wx, -wz, h). Spouts face +wz = Blender -y, so the camera sits at negative y to see the spout side.
    shots = [('a_all_three', (2.2, -5.2, 2.0), (0.0, -0.35, 0.45), 35, (50, 0, 30)),
             ('b_mark2_close', (-0.4, -2.2, 1.0), (-1.5, -0.35, 0.55), 45, (60, 0, -40)),
             ('c_cracked_old_close', (2.4, -2.0, 0.9), (1.0, -0.4, 0.35), 40, (60, 0, 50))]
    for name, loc, look, lens, sun_rot in shots:
        sun.rotation_euler = tuple(math.radians(x) for x in sun_rot)
        cam.location = loc
        cam.data.lens = lens
        cam.rotation_euler = (V(look) - V(loc)).to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = os.path.join(d, name + '.png')
        bpy.ops.render.render(write_still=True)
        print('rendered', sc.render.filepath)


if __name__ == '__main__':
    which = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'all'
    if which == 'render':
        render_all()
    else:
        if which in ('all', 'mark2'):
            finalize(*mark2(False))
        if which in ('all', 'old'):
            finalize(*old())
        if which in ('all', 'cracked'):
            finalize(*mark2(True))
