import { drawBilingual } from './signPaint.js';
import { addToSignHub } from './signAtlasHub.js';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mergeGroupByMaterial } from './mergeUtils.js';
import { getTiledMaterial } from './materials.js';
import { getGLTFLoader } from './loaders.js';
import { registerLampSites } from './lampPools.js';

/** School bell (item 5): a post, a short arm, and a small hanging bell — enough to
 * read as "the thing you ring," not a modelled asset. */
export function createBellProp(position) {
  const group = new THREE.Group();
  group.name = 'school_bell';

  // Iron-pipe stand, arm and cast bell all share the real scanned metal PBR set and fold into ONE draw call (was two flat-colour meshes).
  const ironMat = getTiledMaterial('metal', { repeatX: 1, repeatY: 2, tint: '#6a5a4a', roughness: 0.9 });
  const geos = [
    new THREE.CylinderGeometry(0.06, 0.08, 2.0, 8).translate(0, 1.0, 0),
    new THREE.BoxGeometry(0.5, 0.06, 0.06).translate(0.22, 1.95, 0),
    new THREE.CylinderGeometry(0.09, 0.15, 0.22, 10, 1, true).translate(0.42, 1.75, 0),
  ].map((g) => (g.index ? g.toNonIndexed() : g));
  const bell = new THREE.Mesh(mergeGeometries(geos), ironMat);
  bell.name = 'school_bell_iron';
  bell.castShadow = false; // thin/small prop: its shadow pass cost a call at the hero-zone ceiling
  group.add(bell);

  group.position.set(position.x, 0, position.z);
  return group;
}

function bakeColor(geometry, color) {
  const c = new THREE.Color(color);
  const count = geometry.attributes.position.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

function part(geometry, matrix, color) {
  geometry.applyMatrix4(matrix);
  return bakeColor(geometry, color);
}

const POLE_GREY = 0xd4d2c8;
const SAFFRON = 0xe8821e;
const WHITE = 0xf4f2ea;
const GREEN = 0x0b7a3e;
const CHAKRA_NAVY = 0x16215c;

let FLAG_TEX = null;
function flagTexture() {
  if (FLAG_TEX) return FLAG_TEX;
  // Drawn at 2x and downsampled. Her note was "why is the flag pixelated?" - the cause
  // was not resolution (it was already 1024) but the 24 chakra spokes being ~2.6px wide,
  // which alias into a stair-stepped mess the moment the flag is seen at an angle or
  // minified. Supersampling fixes the spokes; max anisotropy fixes the angle.
  const SS = 2;
  const W = 1024, H = 684, STRIP = 42;
  const bc = document.createElement('canvas'); bc.width = (W + STRIP) * SS; bc.height = H * SS;
  const x = bc.getContext('2d');
  x.scale(SS, SS);
  x.fillStyle = '#e8821e'; x.fillRect(0, 0, W, H / 3);
  x.fillStyle = '#f4f2ea'; x.fillRect(0, H / 3, W, H / 3);
  x.fillStyle = '#0b7a3e'; x.fillRect(0, (2 * H) / 3, W, H / 3);
  const cx = W / 2, cy = H / 2, R = H / 6 - 5;
  x.lineCap = 'round';
  x.strokeStyle = '#16215c'; x.fillStyle = '#16215c'; x.lineWidth = 7;
  x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.stroke();
  x.beginPath(); x.arc(cx, cy, 11, 0, Math.PI * 2); x.fill();
  // 24 spokes, each stopping just short of the rim so the join stays clean
  x.lineWidth = 3.2;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    x.beginPath();
    x.moveTo(cx + Math.cos(a) * 9, cy + Math.sin(a) * 9);
    x.lineTo(cx + Math.cos(a) * (R - 3.5), cy + Math.sin(a) * (R - 3.5));
    x.stroke();
  }
  // woven-cloth grain
  for (let i = 0; i < H; i += 3) { x.fillStyle = `rgba(0,0,0,${0.03 + (i % 4) * 0.01})`; x.fillRect(0, i, W, 1); }
  for (let i = 0; i < W; i += 3) { x.fillStyle = 'rgba(255,255,255,0.03)'; x.fillRect(i, 0, 1, H); }
  x.fillStyle = '#b9b8b0'; x.fillRect(W, 0, STRIP, H); // pole + halyard sample this strip so pole and flag share one mesh
  // downsample to the real texture size: this is what removes the stair-stepping
  const c = document.createElement('canvas'); c.width = W + STRIP; c.height = H;
  const dx = c.getContext('2d');
  dx.imageSmoothingEnabled = true; dx.imageSmoothingQuality = 'high';
  dx.drawImage(bc, 0, 0, c.width, c.height);
  FLAG_TEX = new THREE.CanvasTexture(c);
  FLAG_TEX.colorSpace = THREE.SRGBColorSpace;
  FLAG_TEX.anisotropy = 16;
  FLAG_TEX.generateMipmaps = true;
  FLAG_TEX.minFilter = THREE.LinearMipmapLinearFilter;
  FLAG_TEX.magFilter = THREE.LinearFilter;
  return FLAG_TEX;
}

/**
 * reference-from-unity/MAP.md: "Flagpole flying the Indian national flag, at the
 * main chowk near the school/panchayat cluster — a common real feature of village
 * squares. Scenery only, same treatment as the religious buildings (no gameplay
 * attached). No statue alongside it." Built (not modelled) at a fixed size, one
 * merged mesh — pole + flag + chakra all baked into one vertex-coloured geometry,
 * one draw call total.
 */
export function createFlagpoleProp(position) {
  const geos = [];
  const poleHeight = 6.0;
  geos.push(part(new THREE.CylinderGeometry(0.035, 0.05, poleHeight, 8), new THREE.Matrix4().setPosition(0, poleHeight / 2, 0), POLE_GREY));
  // Small finial ball at the very top.
  geos.push(part(new THREE.SphereGeometry(0.07, 8, 6), new THREE.Matrix4().setPosition(0, poleHeight, 0), POLE_GREY));

  // Flag: a printed tricolour (canvas texture with a 24-spoke chakra and woven-cloth noise) on a gently rippled plane, 3:2, flown to +X.
  const flagW = 1.8, flagH = 1.2, flagTop = poleHeight - 0.25;
  const flagGeo = new THREE.PlaneGeometry(flagW, flagH, 18, 6);
  const fp = flagGeo.attributes.position;
  for (let i = 0; i < fp.count; i++) {
    const u = (fp.getX(i) + flagW / 2) / flagW; // 0 at the pole, 1 at the fly end
    fp.setZ(i, Math.sin(u * 7.5 + fp.getY(i) * 1.3) * 0.07 * u);
  }
  flagGeo.computeVertexNormals();
  const fuv = flagGeo.attributes.uv;
  for (let i = 0; i < fuv.count; i++) fuv.setX(i, fuv.getX(i) * (1024 / 1066));
  flagGeo.translate(0.04 + flagW / 2, flagTop - flagH / 2, 0);
  // Halyard rope and a pulley block at the top, a pair of toggles on the pole.
  geos.push(part(new THREE.CylinderGeometry(0.008, 0.008, poleHeight - 0.4, 4), new THREE.Matrix4().setPosition(0.06, (poleHeight - 0.4) / 2 + 0.3, 0.03), 0x8a7a5a));
  geos.push(part(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 10), new THREE.Matrix4().makeRotationX(Math.PI / 2).setPosition(0.0, poleHeight - 0.08, 0.0), 0x555550));
  const flagTex = flagTexture();

  for (const g of geos) { g.deleteAttribute('color'); const n = g.attributes.position.count; const uv = new Float32Array(n * 2); for (let i = 0; i < n; i++) { uv[i * 2] = 0.98; uv[i * 2 + 1] = 0.5; } g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); }
  flagGeo.deleteAttribute('color');
  geos.push(flagGeo);
  const merged = mergeGeometries(geos.map((g) => (g.index ? g.toNonIndexed() : g)));
  const material = new THREE.MeshStandardMaterial({ map: flagTex, roughness: 0.8, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(merged, material);
  mesh.name = 'flagpole';
  mesh.castShadow = false; // thin/small prop: its shadow pass cost a call at the hero-zone ceiling
  mesh.receiveShadow = true;

  const group = new THREE.Group();
  group.name = 'flagpole_prop';
  group.add(mesh);
  group.position.set(position.x, 0, position.z);
  // A thin real collider (a flagpole is a real, if minor, physical obstacle) —
  // same userData.collider convention src/collision.js's buildCollidersFromScene()
  // reads from any tagged mesh, not just walls.
  const colliderGeo = new THREE.Mesh(new THREE.BoxGeometry(0.15, poleHeight, 0.15));
  colliderGeo.position.set(0, poleHeight / 2, 0); // local to `group`, which already carries the world x/z offset below — do not add it again here
  colliderGeo.userData.collider = true;
  colliderGeo.visible = false;
  group.add(colliderGeo);

  return group;
}

/**
 * docs/MISSIONS_PLAN.md item 5 / reference-from-unity/MAP.md: "Donation board on
 * the school's outer wall, showing real money raised for UP village primary
 * schools. Visible, readable, and it updates." — "A painted board... 'Every rupee
 * goes to village schools' (English + Hindi beneath) and an amount read from a
 * small JSON file (public/data/donations.json, starts at 0). Scenery only, never a
 * store." Painted in-world, so it follows the painted-board rule (CLAUDE.md
 * section 7, 25 Oct FINAL): Hindi bold and larger on top, English below. Async (loads a font + fetches the JSON) — same pattern
 * src/bazaar.js's buildBazaarSignboards() already uses; caller does
 * `createDonationBoard(...).then((board) => group.add(board))`.
 */
export async function createDonationBoard(position, rotationY = 0) {
  await document.fonts.load('700 40px "Noto Sans Devanagari"');
  await document.fonts.ready;

  let rupees = 0;
  try {
    const res = await fetch('data/donations.json');
    const data = await res.json();
    rupees = Number(data.rupees) || 0;
  } catch {
    // Scenery only — if the fetch fails for any reason, the board still reads
    // correctly with the starting amount rather than not appearing at all.
  }

  const W = 900;
  const H = 520;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f4efe0';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#2f5a3a';
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, W - 16, H - 16);
  // Painted-board rule (CLAUDE.md 7, FINAL 25 Oct): Hindi bold and larger on top, English not bold and smaller below,
  // one dark colour per block (src/signPaint.js).
  drawBilingual(ctx, 'हर रुपया गाँव के स्कूलों के लिए', 'Every rupee goes to village schools', { x: W / 2, y: 28, w: W - 100, h: 236, fg: '#1f3a28' });
  ctx.strokeStyle = '#c9a227';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(W * 0.15, 282);
  ctx.lineTo(W * 0.85, 282);
  ctx.stroke();
  const amount = `₹${rupees.toLocaleString('en-IN')}`;
  drawBilingual(ctx, `${amount} जमा हुए`, `${amount} raised`, { x: W / 2, y: 296, w: W - 140, h: 120, fg: '#8a2e2e' });
  drawBilingual(ctx, 'उत्तर प्रदेश के ग्रामीण प्राथमिक विद्यालयों के लिए', 'for UP village primary schools', { x: W / 2, y: 424, w: W - 100, h: 84, fg: '#1f3a28', fillFraction: 1 });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const { material, remap } = addToSignHub('donation', texture); // shared sign atlas, one draw call with the shop boards
  const boardW = 3.0;
  const boardH = (boardW * H) / W;
  const mesh = new THREE.Mesh(remap(new THREE.BoxGeometry(boardW, boardH, 0.05)), material);
  mesh.name = 'donation_board';
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  // Deliberately unnamed group — a sign bolted to an existing wall, not a second
  // independent building; main.js's buildingFootprints computation already skips
  // any unnamed direct child of a root group (see its own `if (!child.name)
  // continue`), which is exactly the behaviour this needs (tools/world-
  // validator.js's check 7 would otherwise misread it as two buildings
  // coinciding — the board necessarily sits inside the wall's own footprint).
  const group = new THREE.Group();
  group.add(mesh);
  group.position.set(position.x, position.y, position.z);
  group.rotation.y = rotationY;
  return group;
}

/**
 * Street lamps (A1e). Two real UP-village types, both textured (CC0 concrete / tin
 * PBR sets, vertex-tinted per instance), never flat fills:
 *  - 'rcc'   : tapered RCC concrete pole, tube-light on a bracket arm, a down-cable
 *              clipped to the pole, a grey switch box, a whitewash/black painted band,
 *              and a sagging overhead wire run to the next pole (abadi lanes).
 *  - 'solar' : panchayat solar LED light - slim steel pole on a concrete footing, tilted
 *              panel on top, LED head on a short arm, battery box on the pole.
 * Per lamp: lean, height, tint, grime at the base. Each segment is two merged meshes
 * (concrete = solid pole bodies with colliders; tin = arms, heads, panels, wires, kept
 * out of the 'solid' material families because they overhang the lane).
 * `segments`: [{ from, to, width }]. Placed alternately either side, just off the lane.
 */
/** Shared 0..1 uniform the night controller drives: lamp lenses and tube diffusers glow warm when it rises. */
export const lampNight = { value: 0 };
let _lampTinMat = null;
function lampTinMaterial(base) {
  if (_lampTinMat) return _lampTinMat;
  const m = base.clone();
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uLampNight = lampNight;
    sh.fragmentShader = 'uniform float uLampNight;\n' + sh.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\n#ifdef USE_COLOR\n totalEmissiveRadiance += vec3(1.0, 0.78, 0.45) * uLampNight * smoothstep(1.25, 1.5, vColor.r) * 2.2;\n#endif');
  };
  m.customProgramCacheKey = () => 'lampTinGlow';
  _lampTinMat = m;
  return m;
}

export function createStreetLamps(segments, { everyMetres = 22, type = 'rcc' } = {}) {
  const group = new THREE.Group();
  group.name = 'street_lamps';
  const concreteMat = getTiledMaterial('concrete', { vertexColors: true });
  const tinMat = getTiledMaterial('tin', { vertexColors: true });
  const hash = (k) => { const s = Math.sin(k * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const TILE = 1.2;
  const H0 = type === 'solar' ? 4.8 : 6.4; // model pole height (tools/blender/build_street_lamp.py)
  const TOP = type === 'solar' ? 0 : H0 + 0.15; // overhead-wire anchor (porcelain insulator tip); solar poles carry no wire
  // Box-projected world-scale UVs so any primitive carries the texture at real size.
  const tex = (g, color) => {
    g.computeVertexNormals();
    const p = g.attributes.position;
    const nrm = g.attributes.normal;
    const uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) {
      const ax = Math.abs(nrm.getX(i)), ay = Math.abs(nrm.getY(i)), az = Math.abs(nrm.getZ(i));
      let u; let v;
      if (ay >= ax && ay >= az) { u = p.getX(i); v = p.getZ(i); }
      else if (ax >= az) { u = p.getZ(i); v = p.getY(i); }
      else { u = p.getX(i); v = p.getY(i); }
      uv[i * 2] = u / TILE; uv[i * 2 + 1] = v / TILE;
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setAttribute('uv2', new THREE.BufferAttribute(uv.slice(), 2));
    if (color) return bakeColor(g, color);
    return g;
  };
  const wireBetween = (a, b, w, color, out) => {
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const len = a.distanceTo(b);
    const g = new THREE.BoxGeometry(w, w, len);
    const m = new THREE.Matrix4().lookAt(b, a, new THREE.Vector3(0, 1, 0));
    m.setPosition(mid);
    g.applyMatrix4(m);
    out.push(tex(g, color));
  };
  // Placement pass (synchronous): one record per lamp, colliders, and the sagging overhead wires between poles.
  const runs = [];
  const colliders = [];
  let n = 0;
  for (const { from, to, width } of segments) {
    const lamps = [];
    const wires = [];
    let prevTop = null;
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const len = Math.hypot(dx, dz);
    if (len < 1) continue;
    const ux = dx / len;
    const uz = dz / len;
    const nx = -uz;
    const nz = ux;
    const count = Math.max(1, Math.floor(len / everyMetres));
    for (let i = 0; i < count; i++) {
      const t = ((i + 0.5) / count) * len;
      const side = n % 2 === 0 ? 1 : -1;
      const r = (k) => hash(n * 7.31 + k);
      n++;
      const off = width / 2 + 0.7 + r(1) * 0.2;
      const x = from.x + ux * t + nx * off * side;
      const z = from.z + uz * t + nz * off * side;
      const rotY = Math.atan2(-nx * side, -nz * side);
      const lean = new THREE.Euler((r(2) - 0.5) * 0.05, rotY, (r(3) - 0.5) * 0.05, 'YXZ');
      const sc = type === 'solar' ? 0.96 + r(5) * 0.1 : 0.96 + r(5) * 0.1;
      const m = new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromEuler(lean), new THREE.Vector3(sc, sc, sc));
      const c = type === 'solar' ? 0.2 : 0.17;
      colliders.push({ minX: x - c, maxX: x + c, minZ: z - c, maxZ: z + c });
      lamps.push({ m, wear: 0.78 + r(4) * 0.22 });
      if (type !== 'solar') {
        const top = new THREE.Vector3(0, TOP, 0).applyMatrix4(m);
        // Sagging overhead wire to the previous pole in this run (two parallel cores).
        if (prevTop) {
          const span = prevTop.distanceTo(top);
          const sag = Math.min(0.9, span * 0.045);
          for (const dy of [0, -0.12]) {
            let a = prevTop.clone(); a.y += dy;
            for (let s = 1; s <= 8; s++) {
              const u = s / 8;
              const b = prevTop.clone().lerp(top, u);
              b.y += dy - sag * 4 * u * (1 - u);
              wireBetween(a, b, 0.02, 0x141414, wires);
              a = b;
            }
          }
        }
        prevTop = top;
      }
    }
    runs.push({ lamps, wires });
  }
  registerLampSites(group, colliders.map((c) => ({ x: (c.minX + c.maxX) / 2, z: (c.minZ + c.maxZ) / 2 })));
  group.userData.colliderBoxes = colliders; // pole bases are solid (A0)
  // Model pass (async): one Blender model per type, cloned per lamp with its lean, size and wear tint, merged per run (two draw calls).
  loadLampModel(type).then((models) => {
    for (const { lamps, wires } of runs) {
      for (const [key, mat] of [['main', concreteMat], ['tin', lampTinMaterial(tinMat)]]) {
        const lift = key === 'tin' ? 1.4 : 1; // the tin set is darker than concrete; lift so painted iron reads green-grey, not black
        const list = lamps.map(({ m, wear: w0 }, li) => {
          const model = models[li % models.length]; // alternate the two built variants along a run
          const wear = w0 * lift;
          const g = model[key].clone().applyMatrix4(m);
          const col = g.attributes.color;
          const src = model[key].attributes.color;
          for (let i = 0; i < col.count; i++) {
            // lens / diffuser (near-white paint, linear red > 0.85) keep a >1 colour so the shader can find them and glow them at night
            const k = key === 'tin' && src.getX(i) > 0.85 ? 1.6 : 0;
            if (k) col.setXYZ(i, src.getX(i) * k, src.getY(i) * k, src.getZ(i) * k);
            else col.setXYZ(i, Math.min(1, col.getX(i) * wear), Math.min(1, col.getY(i) * wear), Math.min(1, col.getZ(i) * wear));
          }
          return tex(g, null);
        });
        if (key === 'tin') list.push(...wires);
        if (!list.length) continue;
        const mesh = new THREE.Mesh(mergeGeometries(list), mat);
        mesh.name = key === 'main' ? 'street_lamp_poles' : 'street_lamp_fittings';
        mesh.castShadow = false; // thin poles: shadow pass would cost an extra call per mesh (hero zone sits at the 150 ceiling)
        mesh.receiveShadow = true;
        group.add(mesh);
      }
    }
  }).catch((err) => console.warn('street lamp model did not load', err));
  return group;
}

// One Blender model per lamp type (tools/blender/build_street_lamp.py): hb_main = concrete bodies, hb_tin = iron fittings and cables.
// Geometry only (the game's own concrete / tin sets are applied); a Float32 copy so per-lamp matrices cannot clip quantised attributes.
const lampModels = {};
function loadLampModel(type) {
  if (!lampModels[type]) {
    lampModels[type] = Promise.all(['', '_b'].map((v) => getGLTFLoader().loadAsync(`assets/models/lamp_${type}_v2${v}.glb`).then((gltf) => {
      gltf.scene.updateWorldMatrix(true, true);
      const out = {};
      gltf.scene.traverse((o) => {
        if (!o.isMesh) return;
        const src = o.geometry;
        const g = new THREE.BufferGeometry();
        for (const name of ['position', 'normal', 'color']) {
          const a = src.attributes[name];
          if (!a) continue;
          const itemSize = name === 'color' ? 3 : a.itemSize;
          const f = new Float32Array(a.count * itemSize);
          for (let i = 0; i < a.count; i++) { f[i * itemSize] = a.getX(i); f[i * itemSize + 1] = a.getY(i); f[i * itemSize + 2] = a.getZ(i); }
          g.setAttribute(name, new THREE.BufferAttribute(f, itemSize));
        }
        if (src.index) g.setIndex(src.index.clone());
        g.applyMatrix4(o.matrixWorld);
        out[o.name.includes('tin') ? 'tin' : 'main'] = g;
      });
      return out;
    }))).catch((err) => { throw err; });
  }
  return lampModels[type];
}

/**
 * reference-from-unity/MAP.md: "Paani ki tanki (water tank) - the tallest structure, visible from most of the map.
 * Bijli transformer beside it." MAP.md gives no coordinate, so main.js places it on open ground (see TANK_POSITION).
 * Four tapering concrete legs with cross-braces, a limewashed cylindrical tank with a rim and shallow dome, a
 * ladder, plus a pole-mounted transformer on two poles. One merged vertex-coloured mesh, one draw call.
 */
export function createWaterTankProp(position) {
  const geos = [];
  const CONCRETE = 0xb9b4a6;
  const TANK = 0xc9d3d6; // faded blue-grey limewash
  const TANK_BAND = 0x8fa3ab;
  const IRON = 0x4d4a46;
  const POLE = 0x6a5a48;
  const legH = 9;
  const half = 1.7;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    geos.push(part(new THREE.BoxGeometry(0.4, legH, 0.4), new THREE.Matrix4().setPosition(sx * half, legH / 2, sz * half), CONCRETE));
  }
  // Cross-braces at two heights, all four faces.
  for (const y of [3, 6]) {
    for (const s of [-1, 1]) {
      geos.push(part(new THREE.BoxGeometry(half * 2, 0.22, 0.22), new THREE.Matrix4().setPosition(0, y, s * half), CONCRETE));
      geos.push(part(new THREE.BoxGeometry(0.22, 0.22, half * 2), new THREE.Matrix4().setPosition(s * half, y, 0), CONCRETE));
    }
  }
  // Slab under the tank, tank body, band, rim, dome.
  geos.push(part(new THREE.BoxGeometry(half * 2 + 0.9, 0.3, half * 2 + 0.9), new THREE.Matrix4().setPosition(0, legH + 0.15, 0), CONCRETE));
  geos.push(part(new THREE.CylinderGeometry(2.6, 2.6, 3.4, 20), new THREE.Matrix4().setPosition(0, legH + 0.3 + 1.7, 0), TANK));
  geos.push(part(new THREE.CylinderGeometry(2.64, 2.64, 0.35, 20), new THREE.Matrix4().setPosition(0, legH + 1.2, 0), TANK_BAND));
  geos.push(part(new THREE.CylinderGeometry(2.64, 2.64, 0.3, 20), new THREE.Matrix4().setPosition(0, legH + 3.55, 0), TANK_BAND));
  geos.push(part(new THREE.SphereGeometry(2.6, 20, 6, 0, Math.PI * 2, 0, Math.PI / 5), new THREE.Matrix4().setPosition(0, legH + 3.7, 0), CONCRETE));
  // Ladder up the +Z face: two rails and rungs.
  const ladderZ = half + 0.35;
  for (const x of [-0.25, 0.25]) geos.push(part(new THREE.BoxGeometry(0.05, legH + 2.4, 0.05), new THREE.Matrix4().setPosition(x, (legH + 2.4) / 2, ladderZ), IRON));
  for (let y = 0.5; y < legH + 2.2; y += 0.45) geos.push(part(new THREE.BoxGeometry(0.5, 0.04, 0.04), new THREE.Matrix4().setPosition(0, y, ladderZ), IRON));
  // Transformer on two poles beside the tank.
  const tx = 6;
  for (const dz of [-0.6, 0.6]) geos.push(part(new THREE.CylinderGeometry(0.1, 0.13, 8, 8), new THREE.Matrix4().setPosition(tx, 4, dz), POLE));
  geos.push(part(new THREE.BoxGeometry(0.2, 0.15, 1.6), new THREE.Matrix4().setPosition(tx, 6.9, 0), POLE));
  geos.push(part(new THREE.CylinderGeometry(0.45, 0.45, 1.0, 12), new THREE.Matrix4().setPosition(tx, 5.6, 0), 0x6b7378));
  geos.push(part(new THREE.CylinderGeometry(0.5, 0.5, 0.08, 12), new THREE.Matrix4().setPosition(tx, 6.15, 0), IRON));
  for (const dz of [-0.35, 0, 0.35]) geos.push(part(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 6), new THREE.Matrix4().setPosition(tx, 6.35, dz), 0xd9d2c0));
  // Earthing / meter box near the foot.
  geos.push(part(new THREE.BoxGeometry(0.5, 0.7, 0.3), new THREE.Matrix4().setPosition(tx + 0.4, 1.4, 0), IRON));

  const mesh = new THREE.Mesh(mergeGeometries(geos), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }));
  mesh.name = 'water_tank';
  mesh.castShadow = false; // far landmark: a shadow pass would cost a second draw call at the hero-zone ceiling
  mesh.receiveShadow = true;
  const group = new THREE.Group();
  group.name = 'water_tank_prop';
  group.add(mesh);
  group.position.set(position.x, 0, position.z);
  // No colliders: streamed by zoneManager (src/main.js), which does not register colliders; legs are thin scenery.
  return group;
}
