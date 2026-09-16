import * as THREE from 'three';

const textureLoader = new THREE.TextureLoader();
const rawTextureCache = new Map(); // url -> Texture, shared Source, one real network fetch each
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
  crop: { base: 'assets/textures/crop/', maps: ['color', 'normal', 'roughness'] },
  lane: { base: 'assets/textures/lane/', maps: ['color', 'normal', 'roughness'] },
};

function loadRaw(url, srgb) {
  // One real load() per URL, reused via clone() for every repeat/tint variant — this
  // is what keeps a scene with many wall/roof boxes to a handful of actual network
  // fetches and image decodes (load target: playable within 8s on 4G, item 6).
  // Texture.clone() unconditionally flips needsUpdate on the copy, which — before the
  // shared image has actually decoded — logs a harmless
  // "Texture marked for update but no image data found" warning; see docs/parked.md.
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
export function getTiledMaterial(name, { repeatX = 1, repeatY = 1, tint = null, roughness = 1, tintStrength = 1, vertexColors = false } = {}) {
  const key = `${name}|${repeatX.toFixed(3)}|${repeatY.toFixed(3)}|${tint || ''}|${roughness}|${tintStrength}|${vertexColors ? 'vc' : ''}`;
  let mat = materialCache.get(key);
  if (mat) return mat;

  const set = SETS[name];
  if (!set) throw new Error(`Unknown texture set: ${name}`);

  const opts = { map: null, normalMap: null, roughnessMap: null, aoMap: null, roughness };
  for (const mapType of set.maps) {
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
  // vertexColors requested separately from the cache key above so a wall using baked
  // dirt/bleach/blotch vertex colours (texturedWallBox, Fix 4/4) never accidentally
  // shares a material with a caller at the same repeat/tint that has no 'color'
  // geometry attribute (which would otherwise multiply in undefined/black).
  if (vertexColors) mat.vertexColors = true;
  if (tint) {
    // tintStrength < 1 blends from white toward the tint instead of a full multiply,
    // so the texture's own colour/grain stays visible under the paint rather than the
    // wall reading as a flat, saturated cut-out. Building walls use 0.3 (law — see
    // docs/look-standard.md); terrain (ground/lane/field/crop) keeps full strength.
    mat.color = new THREE.Color(1, 1, 1).lerp(new THREE.Color(tint), tintStrength);
  }
  materialCache.set(key, mat);
  return mat;
}

/**
 * Fix 4/4 (playtest pass) — attaches a large-scale (20-40m) procedural colour/
 * brightness noise multiply, plus a near-camera detail-texture blend, to a ground-type
 * material via onBeforeCompile. Both terrain planes (the main ground and the field,
 * src/scene.js and src/field.js — both use the 'ground' texture set) call this so no
 * repeat is visible from any height and there's crispness underfoot without a second
 * texture asset. See docs/parked.md for why this is a shader hook rather than a second
 * texture: it's per-pixel (no mip/tiling artefacts of its own) and needs zero extra
 * network fetches.
 */
export function applyGroundNoiseDetail(material, { noiseCellMetres = 30, detailTileMultiplier = 22, detailFadeMetres = 8 } = {}) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uNoiseScale = { value: 1 / noiseCellMetres };
    shader.uniforms.uDetailScale = { value: detailTileMultiplier };
    shader.uniforms.uDetailFade = { value: detailFadeMetres };

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWorldPos_g;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWorldPos_g = (modelMatrix * vec4(transformed, 1.0)).xyz;');

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vWorldPos_g;
        uniform float uNoiseScale;
        uniform float uDetailScale;
        uniform float uDetailFade;

        float groundHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
        float groundValueNoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          float a = groundHash(i);
          float b = groundHash(i + vec2(1.0, 0.0));
          float c = groundHash(i + vec2(0.0, 1.0));
          float d = groundHash(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }`
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        {
          float largeN = groundValueNoise(vWorldPos_g.xz * uNoiseScale);
          vec3 patchTint = vec3(0.92, 0.9, 0.86) + largeN * vec3(0.16, 0.14, 0.09);
          diffuseColor.rgb *= patchTint;

          float camDist = distance(vWorldPos_g, cameraPosition);
          float detailMix = 1.0 - smoothstep(0.0, uDetailFade, camDist);
          if (detailMix > 0.001) {
            vec3 detailColor = texture2D(map, vMapUv * uDetailScale).rgb;
            diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * detailColor * 1.5, detailMix * 0.5);
          }
        }`
      );
  };
  // Distinct cache key per material instance sharing this hook, so three.js doesn't
  // reuse a compiled program from a material that didn't request the noise/detail
  // pass (or vice versa).
  material.customProgramCacheKey = () => `ground-noise-detail-v1-${noiseCellMetres}-${detailTileMultiplier}-${detailFadeMetres}`;
  return material;
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
  const { tileSize = 1.5, tint = null, roughness = 1, tintStrength = 1 } = opts;
  const geometry = ensureUv2(new THREE.BoxGeometry(width, height, depth));
  const repeatX = Math.max(width, depth) / tileSize;
  const repeatY = height / tileSize;
  const material = getTiledMaterial(materialName, { repeatX, repeatY, tint, roughness, tintStrength });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * A thin double-sided wall as a plane, not a box. A BoxGeometry with one dimension
 * near-zero (a 0.2m-thick wall) gives its end-cap faces the same UV repeat as the big
 * faces, which samples the texture at extreme, near-degenerate magnification and can
 * read as a blown-out/flat highlight (see docs/parked.md). A plane has no end caps.
 */
export function texturedWall(width, height, materialName, opts = {}) {
  const { tileSize = 1.5, tint = null, roughness = 1, tintStrength = 1 } = opts;
  const geometry = ensureUv2(new THREE.PlaneGeometry(width, height));
  const repeatX = width / tileSize;
  const repeatY = height / tileSize;
  const material = getTiledMaterial(materialName, { repeatX, repeatY, tint, roughness, tintStrength });
  material.side = THREE.DoubleSide;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * A textured box with each face pair tiled by its OWN real-world dimensions, not one
 * blanket repeat for the whole box. `texturedBox` computes a single repeat from
 * max(width, depth) and applies it to every face via the texture's own repeat — fine
 * when all three dimensions are similar, but a genuinely thin/thick box (a roof slab,
 * a real-thickness wall) has small end-cap faces that then get the SAME repeat as the
 * big faces, sampling the texture at extreme magnification (see docs/parked.md, the
 * "flat black lane" and "blown-out wall" bugs). This bakes the correct per-face tile
 * count into the UV attribute instead, so the material's own texture.repeat can stay
 * at 1x1 and be shared across every box regardless of size.
 */
export function texturedThickBox(width, height, depth, materialName, opts = {}) {
  const { tileSize = 1.5, tint = null, roughness = 1, tintStrength = 1 } = opts;
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const uv = geometry.attributes.uv;
  // BoxGeometry group/face order: +X, -X, +Y, -Y, +Z, -Z, 4 vertices each.
  const faceDims = [
    [depth, height],
    [depth, height],
    [width, depth],
    [width, depth],
    [width, height],
    [width, height],
  ];
  for (let f = 0; f < 6; f++) {
    const [fw, fh] = faceDims[f];
    const rx = fw / tileSize;
    const ry = fh / tileSize;
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, uv.getX(i) * rx, uv.getY(i) * ry);
    }
  }
  uv.needsUpdate = true;
  geometry.setAttribute('uv2', new THREE.BufferAttribute(uv.array.slice(), 2));

  const material = getTiledMaterial(materialName, { repeatX: 1, repeatY: 1, tint, roughness, tintStrength });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function pseudoRandom01(seed) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Like texturedThickBox's UV rebake, but generalised to any BoxGeometry segment count
 * via geometry.groups (six groups, one per face, covering that face's full index range
 * regardless of subdivision) instead of assuming exactly 4 vertices/face. Also applies
 * a small rotation to the UV pattern (about each face's own centre) before scaling —
 * rotating the SAMPLED pattern per wall, in the geometry, rather than rotating the
 * shared texture object (which would rotate it for every wall using that material).
 */
function rescaleAndRotateBoxFaceUVs(geometry, width, height, depth, tileSize, rotation) {
  const uv = geometry.attributes.uv;
  const index = geometry.index;
  const faceDims = [
    [depth, height],
    [depth, height],
    [width, depth],
    [width, depth],
    [width, height],
    [width, height],
  ];
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const touched = new Uint8Array(uv.count);
  for (let g = 0; g < geometry.groups.length; g++) {
    const { start, count } = geometry.groups[g];
    const [fw, fh] = faceDims[g];
    const rx = fw / tileSize;
    const ry = fh / tileSize;
    for (let k = start; k < start + count; k++) {
      const vi = index.array[k];
      if (touched[vi]) continue;
      touched[vi] = 1;
      const u = uv.getX(vi) - 0.5;
      const v = uv.getY(vi) - 0.5;
      const ru = u * cos - v * sin;
      const rv = u * sin + v * cos;
      uv.setXY(vi, (ru + 0.5) * rx, (rv + 0.5) * ry);
    }
  }
  uv.needsUpdate = true;
  geometry.setAttribute('uv2', new THREE.BufferAttribute(uv.array.slice(), 2));
}

/**
 * Bakes per-vertex shading into a (height-subdivided) box: a soft dirt darkening near
 * the base, a light sun-bleached lightening near the top, and a faint large-scale
 * blotch so the plaster reads as uneven rather than a flat, uniform colour. Needs
 * `heightSegments > 1` on the geometry to have any vertices between y=0 and the top to
 * hold the transition — see texturedWallBox.
 */
function bakeWallShadeColors(geometry, height, seed = 0) {
  const pos = geometry.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const dirtBandTop = Math.min(0.7, height * 0.3); // soft transition zone above the 400mm dirt line
  const bleachStart = Math.max(height - 0.6, height * 0.65);
  for (let i = 0; i < pos.count; i++) {
    const worldY = pos.getY(i) + height / 2; // BoxGeometry is centred — 0 at the base
    const x = pos.getX(i);
    const z = pos.getZ(i);

    let shade = 1.0;
    if (worldY < dirtBandTop) {
      const t = 1 - THREE.MathUtils.clamp(worldY / dirtBandTop, 0, 1);
      shade -= t * t * 0.26; // soft — not a hard-edged band
    }
    if (worldY > bleachStart) {
      const t = THREE.MathUtils.clamp((worldY - bleachStart) / Math.max(0.01, height - bleachStart), 0, 1);
      shade += t * 0.1;
    }

    // Large-scale blotch: low-frequency sine combo over world XZ, never a texture, so
    // it costs nothing extra and doesn't repeat visibly at wall scale.
    const blotch =
      Math.sin((x + seed * 3.1) * 0.55) * Math.cos((z * 0.85 - seed * 1.7)) * 0.05 +
      Math.sin((x * 0.21 - z * 0.33 + seed * 2.3)) * 0.03;
    shade += blotch;
    shade = THREE.MathUtils.clamp(shade, 0.7, 1.12);

    colors[i * 3] = shade;
    colors[i * 3 + 1] = shade;
    colors[i * 3 + 2] = shade;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

/**
 * A wall box (solid block or thin real-thickness wall — both share BoxGeometry's
 * per-face UV structure, so one function covers house/school blocks AND halwai's thin
 * walls) with, per Fix 4/4: a slightly jittered tiling scale and a small UV rotation
 * so no two walls look identical, plus baked-in vertex-colour dirt/bleach/blotch
 * shading. `seed` should be stable per wall (e.g. derived from its world position) so
 * the variation doesn't change between rebuilds.
 */
export function texturedWallBox(width, height, depth, materialName, opts = {}) {
  const {
    tileSize = 1.5,
    tint = null,
    roughness = 1,
    tintStrength = 1,
    tileJitter = 0.12, // ±12% tiling-scale variance
    rotationJitter = 0.045, // radians — kept small since rotating a tiled texture isn't perfectly seamless
    seed = 0,
  } = opts;

  const jitteredTileSize = tileSize * (1 + (pseudoRandom01(seed) - 0.5) * 2 * tileJitter);
  const rotation = (pseudoRandom01(seed + 11) - 0.5) * 2 * rotationJitter;
  const heightSegments = THREE.MathUtils.clamp(Math.round(height / 0.9), 5, 14);

  const geometry = new THREE.BoxGeometry(width, height, depth, 1, heightSegments, 1);
  rescaleAndRotateBoxFaceUVs(geometry, width, height, depth, jitteredTileSize, rotation);
  bakeWallShadeColors(geometry, height, seed);

  const material = getTiledMaterial(materialName, { repeatX: 1, repeatY: 1, tint, roughness, tintStrength, vertexColors: true });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
