import * as THREE from 'three';
import { getGLTFLoader } from './loaders.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Queue item 1 — the pipeline a finished Tripo model drops straight into. A "slot" is
 * a named replaceable object: it always has a code-built placeholder already in the
 * scene (built exactly as before — nothing here changes how placeholders are made,
 * see docs/parked.md on why), and it OPTIONALLY has a matching
 * `public/assets/models/<slot>.glb`. At startup, resolveAll() checks every registered
 * slot for that file (a HEAD request — cheap, and the normal "doesn't exist" case for
 * almost every slot right now); when found, the model is loaded, uniformly scaled to
 * fit the slot's LAYOUT.md-sized bounding box (metres, never stretched on one axis),
 * grounded (base at y=0) and centred in its own local space, placed at the slot's
 * position/rotation, and the placeholder is hidden (never removed — if the file 404s,
 * fails to parse, or is missing a mesh, the placeholder silently stays visible instead
 * of the slot going blank).
 *
 * To swap a model in: drop `<slot-name>.glb` into `public/assets/models/` and reload
 * — see docs/asset-slots.md. No other file needs editing.
 */

const MODEL_BASE = 'assets/models/';

// Non-metal, non-glass floor: the highest of docs/art-rules-characters.md's own
// per-category minimums (skin 0.75, cloth/hair 0.8, leather 0.6, plaster/wood
// 0.7) — using the highest as a single universal floor is always compliant with
// every category's own minimum at once, without having to reliably guess "is
// this submesh skin, cloth, leather, or plaster" from an imported file alone.
const MIN_ROUGHNESS_NON_METAL = 0.8;
const METAL_ROUGHNESS_RANGE = [0.25, 0.45]; // art-rules-characters.md: "metal roughness 0.25-0.45 with metalness 1"
const METAL_DETECT_THRESHOLD = 0.5; // a source metalness at/above this is assumed intentional (metal trim, not a shiny-plastic mistake)

/**
 * MATTE IS ENFORCED IN THE ENGINE, NOT IN THE IMAGE (docs/art-rules-characters.md)
 * — a single enforcement pass over every loaded model's materials, so nothing
 * imported can ship shinier than the art direction allows. Glass (detected via
 * `transparent`/`transmission`, already a deliberate authoring choice) is left
 * alone — it's the one other category allowed to be reflective, alongside metal.
 * Mutates the material in place (shared across any clones of this slot, which is
 * fine — they're all meant to look identical).
 */
function enforceMatteMaterial(material) {
  if (!material || typeof material.roughness !== 'number') return; // not a PBR material (e.g. a line/points material) — nothing to clamp
  const isGlass = material.transparent === true || (typeof material.transmission === 'number' && material.transmission > 0);
  if (isGlass) return;
  const isMetal = (material.metalness || 0) >= METAL_DETECT_THRESHOLD;
  if (isMetal) {
    material.metalness = 1;
    material.roughness = THREE.MathUtils.clamp(material.roughness, METAL_ROUGHNESS_RANGE[0], METAL_ROUGHNESS_RANGE[1]);
  } else {
    material.metalness = 0;
    material.roughness = Math.max(material.roughness, MIN_ROUGHNESS_NON_METAL);
  }
  // "no clearcoat, no sheen" — only present on MeshPhysicalMaterial (an upgrade
  // GLTFLoader makes automatically when the source file uses those extensions).
  if ('clearcoat' in material) material.clearcoat = 0;
  if ('sheen' in material) material.sheen = 0;
}

async function urlExists(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    if (!res.ok) return false;
    // Vite's dev server answers a genuinely missing static file under the app's own
    // base path with a 200 OK SPA-fallback (index.html), not a 404 — confirmed via
    // curl during development (see docs/parked.md). A real .glb is never served as
    // text/html, so this is a reliable way to tell "the file exists" from "it
    // doesn't, but the dev server answered anyway" in both dev and any static host.
    const contentType = res.headers.get('content-type') || '';
    return !contentType.includes('text/html');
  } catch (e) {
    return false;
  }
}

export function createAssetSlotRegistry() {
  const slots = new Map();

  /**
   * `dimensions` {w,h,d} in metres — the placeholder's own real-world size (from
   * LAYOUT.md where one exists, otherwise the constant already used to build the
   * placeholder itself — see each registration call in main.js for its source).
   * `placements` — one or more `{container, position, rotationY}`: `container` is the
   * Object3D the model becomes a child of (so it inherits that object's own per-frame
   * position/rotation updates automatically — e.g. a moving vehicle's `.group`),
   * `position`/`rotationY` are local to that container. Most slots have exactly one
   * placement; a few (e.g. `bullock`, one model shared by both animals) have more.
   * `hide` — every placeholder Object3D to hide once the model has loaded.
   */
  function register(name, { dimensions, placements, hide, exact = false, maskMaterials = [], noShadowMaterials = [] }) {
    slots.set(name, { name, dimensions, placements, hide: hide || [], exact, maskMaterials, noShadowMaterials });
  }

  async function resolveSlot(slot) {
    const url = `${MODEL_BASE}${slot.name}.glb`;
    if (!(await urlExists(url))) return { name: slot.name, replaced: false };

    let gltf;
    try {
      gltf = await getGLTFLoader().loadAsync(url);
    } catch (err) {
      console.error(`Asset slot "${slot.name}": failed to load ${url}`, err);
      return { name: slot.name, replaced: false, error: err };
    }

    const source = gltf.scene;

    // The source file's own ROTATION is untrusted at EVERY node, not just the
    // root — an export tool's axis-convention mismatch can land on the scene
    // root, on a child node, or both, and GLTFLoader wraps a single-root GLTF
    // scene in its OWN identity Group, so `gltf.scene` itself is very often
    // untransformed while the real (good or bad) rotation lives one level down
    // on its child. Confirmed empirically, not assumed: resetting only
    // `gltf.scene.rotation` did nothing (tmp/step1-facing-check.mjs still
    // showed the test box facing backwards); baking the WORLD transform into
    // flattened geometry was tried next and ALSO failed, for a different
    // reason — flattening doesn't remove a bad rotation, it just bakes it
    // permanently into vertex data, indistinguishable afterwards from a mesh
    // that was genuinely modelled backwards (same empirical check, same
    // result). The only fix that actually works: zero every node's LOCAL
    // rotation, at every depth, BEFORE anything is measured — this is safe to
    // do unconditionally for position/scale too (nothing here has or needs a
    // skinned rig; swapped-in models are always static visual replacements,
    // per this file's own "Animation" note in docs/asset-slots.md), but
    // position/scale are already handled correctly regardless of nesting
    // depth by the box-measurement-based correction a few lines down (solving
    // for an absolute world-space result nets out the same no matter where in
    // the hierarchy the error lives) — rotation has no equivalent "solve for
    // the right absolute value" trick, so it has to be zeroed at the source,
    // every node, before the slot's own documented rotationY (applied to the
    // wrapper, at the bottom of this function) becomes the only rotation left.
    // This still can't recover a model whose MESH DATA itself was authored
    // facing the wrong way (as opposed to correct mesh data wrapped in a bad
    // transform) — there is no bounding-box-only way to tell those apart; see
    // docs/asset-slots.md's "Orientation" note and this task's own report.
    source.traverse((o) => o.rotation.set(0, 0, 0));
    source.updateMatrixWorld(true);

    // Ground + centre in local space, then uniformly scale to fit the slot's real-
    // world envelope — done on the (still unscaled) source once, before cloning per
    // placement, so every clone shares the same correct transform.
    // `exact` slots (Blender buildings authored in the game's own frame, see
    // tools/blender/build_house.py) are NOT fit-scaled or recentred: the model's origin is the
    // placement point and every metre in the file is a metre in the world.
    if (!slot.exact) {
      const box = new THREE.Box3().setFromObject(source);
      const size = box.getSize(new THREE.Vector3());
      if (slot.dimensions && size.x > 0 && size.y > 0 && size.z > 0) {
        const scale = Math.min(slot.dimensions.w / size.x, slot.dimensions.h / size.y, slot.dimensions.d / size.z);
        if (isFinite(scale) && scale > 0) source.scale.setScalar(scale);
      }
      const groundedBox = new THREE.Box3().setFromObject(source);
      source.position.x -= (groundedBox.min.x + groundedBox.max.x) / 2;
      source.position.z -= (groundedBox.min.z + groundedBox.max.z) / 2;
      source.position.y -= groundedBox.min.y;
    }
    source.traverse((o) => {
      if (o.isMesh) {
        const matName = o.material && o.material.name;
        o.castShadow = !slot.noShadowMaterials.includes(matName);
        o.receiveShadow = true;
        if (slot.maskMaterials.includes(matName)) {
          o.material.transparent = false;
          o.material.alphaTest = 0.5;
          o.material.depthWrite = true;
        }
        if (Array.isArray(o.material)) o.material.forEach(enforceMatteMaterial);
        else enforceMatteMaterial(o.material);
      }
    });

    for (let i = 0; i < slot.placements.length; i++) {
      const p = slot.placements[i];
      const instance = i === 0 ? source : source.clone(true);
      instance.name = `${slot.name}_model${slot.placements.length > 1 ? `_${i}` : ''}`;
      // Wrap in a group so the slot's own position/rotation never fights the source's
      // own centring/grounding offsets baked into `instance.position` above.
      const wrapper = new THREE.Group();
      wrapper.name = `${slot.name}_slot${slot.placements.length > 1 ? `_${i}` : ''}`;
      wrapper.add(instance);
      wrapper.position.copy(p.position);
      wrapper.rotation.y = p.rotationY || 0;
      p.container.add(wrapper);
      (slot.wrappers || (slot.wrappers = [])).push(wrapper);
    }

    for (const obj of slot.hide) obj.visible = false;

    return { name: slot.name, replaced: true };
  }

  /** Call once, after every placeholder in the scene has been built (order among
   * slots doesn't matter — each resolves independently). Never awaited by callers —
   * same fire-and-forget pattern as the existing HDRI/signboard loads in main.js, so
   * a slow or missing model never blocks startup. */
  async function resolveAll() {
    return Promise.allSettled(Array.from(slots.values()).map(resolveSlot));
  }

  /**
   * Draw-call budget (2026-10-21) — folds every loaded Blender building of a zone into ONE mesh per
   * material (hb_plaster, hb_concrete, hb_wood, hb_brick, hb_tin, hb_paint, hb_rangoli, hb_decal), instead of
   * ~6 meshes per building. All the Blender buildings share the same CC0 texture sets with tints baked into
   * vertex colours and real-metre UVs, so merging by material NAME is exact. Call after resolveAll().
   * Only meaningful for `exact` slots (their geometry is already in world-aligned local space). Static only.
   */
  function mergeSlotModels(names, zoneName, scene) {
    const unified = new Map(); // material name -> first material instance (shared textures from then on)
    const buckets = new Map(); // `${materialName}|${castShadow}` -> { material, geos, cast }
    const dead = [];
    for (const name of names) {
      const slot = slots.get(name);
      if (!slot || !slot.wrappers) continue;
      for (const wrapper of slot.wrappers) {
        wrapper.updateWorldMatrix(true, true);
        wrapper.traverse((o) => {
          if (!o.isMesh || o.isSkinnedMesh) return;
          const mat = o.material;
          if (!mat || Array.isArray(mat)) return;
          if (!unified.has(mat.name)) unified.set(mat.name, mat);
          const shared = unified.get(mat.name);
          const g = o.geometry.clone();
          // dequantize (KHR_mesh_quantization int16/int8 normalized attributes) to plain float32 before baking the transform
          for (const attrName of Object.keys(g.attributes)) {
            if (!['position', 'normal', 'uv', 'color'].includes(attrName)) { g.deleteAttribute(attrName); continue; }
            const a = g.attributes[attrName];
            const f = new Float32Array(a.count * a.itemSize);
            for (let i = 0; i < a.count; i++) for (let c = 0; c < a.itemSize; c++) f[i * a.itemSize + c] = a.getComponent(i, c);
            g.setAttribute(attrName, new THREE.BufferAttribute(f, a.itemSize));
          }
          if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
          if (shared.vertexColors && !g.attributes.color) g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(1), 3));
          g.applyMatrix4(o.matrixWorld);
          const key = `${shared.name}|${o.castShadow}`;
          let b = buckets.get(key);
          if (!b) buckets.set(key, (b = { material: shared, geos: [], cast: o.castShadow }));
          b.geos.push(g);
          dead.push(o);
        });
      }
    }
    for (const o of dead) { o.parent && o.parent.remove(o); o.geometry.dispose(); }
    for (const [key, b] of buckets) {
      // a colour attribute with itemSize 4 (RGBA) must match across the bucket
      const geos = b.geos;
      const sizes = new Set(geos.map((g) => (g.attributes.color ? g.attributes.color.itemSize : 0)));
      if (sizes.size > 1) for (const g of geos) if (g.attributes.color && g.attributes.color.itemSize === 4) {
        const c = g.attributes.color; const f = new Float32Array(c.count * 3);
        for (let i = 0; i < c.count; i++) { f[i * 3] = c.getX(i); f[i * 3 + 1] = c.getY(i); f[i * 3 + 2] = c.getZ(i); }
        g.setAttribute('color', new THREE.BufferAttribute(f, 3));
      }
      const merged = mergeGeometries(geos, false);
      if (!merged) { console.warn(`slot merge: could not merge "${key}"`); continue; }
      for (const g of geos) g.dispose();
      const mesh = new THREE.Mesh(merged, b.material);
      mesh.name = `${zoneName}_${b.material.name}`;
      mesh.castShadow = b.cast;
      mesh.receiveShadow = true;
      mesh.userData.mergedStatic = true;
      scene.add(mesh);
    }
  }

  return { register, resolveAll, slots, mergeSlotModels };
}
