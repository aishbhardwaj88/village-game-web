import * as THREE from 'three';
import { getGLTFLoader } from './loaders.js';

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
  function register(name, { dimensions, placements, hide }) {
    slots.set(name, { name, dimensions, placements, hide: hide || [] });
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

    // Ground + centre in local space, then uniformly scale to fit the slot's real-
    // world envelope — done on the (still unscaled) source once, before cloning per
    // placement, so every clone shares the same correct transform.
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
    source.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
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

  return { register, resolveAll, slots };
}
