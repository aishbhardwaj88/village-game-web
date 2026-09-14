import * as THREE from 'three';

const textureLoader = new THREE.TextureLoader();
const rawTextureCache = new Map(); // url -> Texture (unconfigured repeat)
const materialCache = new Map(); // "name|rx|ry|tint" -> Material

/**
 * CC0 ambientCG texture sets extracted into public/assets/textures/<name>/. Every
 * building material in the hero zone is built from one of these five sets at
 * real-world tiling, never left untextured.
 */
const SETS = {
  plaster: { base: 'assets/textures/plaster/', maps: ['color', 'normal', 'roughness'] },
  concrete: { base: 'assets/textures/concrete/', maps: ['color', 'normal', 'roughness', 'ao'] },
  wood: { base: 'assets/textures/wood/', maps: ['color', 'normal', 'roughness', 'ao'] },
  metal: { base: 'assets/textures/metal/', maps: ['color', 'normal', 'roughness'] },
  terracotta: { base: 'assets/textures/terracotta/', maps: ['color', 'normal', 'roughness'] },
  ground: { base: 'assets/textures/ground/', maps: ['color', 'normal', 'roughness', 'ao'] },
};

function loadRaw(url, srgb) {
  let tex = rawTextureCache.get(url);
  if (!tex) {
    tex = textureLoader.load(url);
    if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
    rawTextureCache.set(url, tex);
  }
  return tex;
}

/**
 * Returns a MeshStandardMaterial for a named CC0 texture set, tiled at real-world
 * scale (repeatX/repeatY = metres of surface / metres per texture tile). Cached per
 * (name, repeat, tint) so reused tiling scales share one material/draw-call group.
 */
export function getTiledMaterial(name, { repeatX = 1, repeatY = 1, tint = null, roughness = 1 } = {}) {
  const key = `${name}|${repeatX.toFixed(3)}|${repeatY.toFixed(3)}|${tint || ''}|${roughness}`;
  let mat = materialCache.get(key);
  if (mat) return mat;

  const set = SETS[name];
  if (!set) throw new Error(`Unknown texture set: ${name}`);

  const opts = { map: null, normalMap: null, roughnessMap: null, aoMap: null, roughness };
  for (const mapType of set.maps) {
    // clone() shares the underlying Source with the original TextureLoader.load()
    // result, so it picks up the decoded image the same way once loading finishes —
    // no manual needsUpdate needed (forcing it here, before the image exists, is what
    // produced "Texture marked for update but no image data found" warnings).
    const tex = loadRaw(set.base + name + '_' + mapType + '.jpg', mapType === 'color').clone();
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    tex.anisotropy = 8;
    if (mapType === 'color') opts.map = tex;
    if (mapType === 'normal') opts.normalMap = tex;
    if (mapType === 'roughness') opts.roughnessMap = tex;
    if (mapType === 'ao') opts.aoMap = tex;
  }

  mat = new THREE.MeshStandardMaterial(opts);
  if (tint) {
    mat.color = new THREE.Color(tint);
  }
  materialCache.set(key, mat);
  return mat;
}

/** Box geometry needs a uv2 (= uv) for any material using an aoMap. */
export function ensureUv2(geometry) {
  if (!geometry.attributes.uv2) {
    geometry.setAttribute('uv2', geometry.attributes.uv);
  }
  return geometry;
}

/**
 * A textured box mesh. `faceTiling` sets repeat per metre for the box's own
 * dimensions (width/height/depth), so texture scale stays consistent regardless of
 * box size — pass the CC0 set's real-world tile size in metres (default 1m/tile is
 * roughly right for these sets at 1K).
 */
export function texturedBox(width, height, depth, materialName, opts = {}) {
  const { tileSize = 1.5, tint = null, roughness = 1 } = opts;
  const geometry = ensureUv2(new THREE.BoxGeometry(width, height, depth));
  const repeatX = Math.max(width, depth) / tileSize;
  const repeatY = height / tileSize;
  const material = getTiledMaterial(materialName, { repeatX, repeatY, tint, roughness });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
