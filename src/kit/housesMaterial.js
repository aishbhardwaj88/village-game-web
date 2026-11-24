import * as THREE from 'three';
import { houseQuality } from './housesQuality.js';

/**
 * ONE material for every new-map house (S7 sprint, houses agent), so all houses, far boxes and front clutter draw in one batch.
 *
 * The texture atlas is composed at runtime in a canvas from the approved texture sets that already ship in
 * public/assets/textures (brick, plaster, concrete, wood, rust, terracotta, dryearth): no new files, 0 MB added.
 * 4 x 4 cells of 512 px, each cell = one tile of its set with a 24 px wrapped margin, for colour, normal and roughness.
 *
 *   cell 0 lime plaster   1 concrete / cement   2 brick   3 brick with whitewash patches
 *   cell 4 wood           5 rusted steel        6 terracotta (fired clay)   7 mud plaster
 *
 * Geometry carries: uv = tile coordinates (metres x the library repeat, continuous across a wall), aCellPaint.x = cell,
 * aCellPaint.y = paint channel (0 none, 1 wall colour = the instance colour, 2 door/window paint = picked by the instance seed),
 * color = baked tint and occlusion. The instance colour's alpha is a per-house seed (texture offset, stains, door paint).
 * The fragment shader tiles inside the cell with fract() and samples with textureGrad on the continuous coordinate, so mip
 * levels stay right and the cell margins hide the seams.
 */

export const CELL = { plaster: 0, concrete: 1, brick: 2, brickWash: 3, wood: 4, rust: 5, terracotta: 6, mud: 7 };
/** Tiles per metre for each cell, from the library table (tools/blender/arch.py: brick 1.2, plaster 0.5, wood 1.0, metal 1.0). */
export const CELL_REPEAT = [0.5, 0.5, 1.2, 1.2, 1.0, 1.0, 1.0, 0.7];

const COLS = 4, ROWS = 4, CS = houseQuality().atlasCell, MARGIN = Math.round(CS * 24 / 512);
// cells 8..11: extra wall surfaces picked per house by its seed (ambientCG CC0, shared library names plaster_j/m/p, concrete_e).
// They start as copies of the plaster cell and are swapped in after the game has started (loadHouseVariants), so they add
// no request before Play.
export const WALL_VARIANTS = ['plaster_j', 'plaster_m', 'plaster_p', 'concrete_e'];
// cells 12..15 (24 Nov, second round, ambientCG CC0): brick_b = Bricks105 (finer yellow-pink brick, picked by ~45% of the brick
// walls), concrete_f = Concrete046 (pale stained cast concrete, ~35% of concrete trim/boundary walls), mud_b = Clay004 and
// mud_c = Clay005 (brown and grey clay, kachcha mud walls: a third each with the original dryearth). Same late swap as above.
export const EXTRA_VARIANTS = ['brick_b', 'concrete_f', 'mud_b', 'mud_c'];
const ALL_VARIANTS = [...WALL_VARIANTS, ...EXTRA_VARIANTS];
const SETS = [
  ['plaster', 'plaster'], ['concrete', 'concrete'], ['brick', 'brick'], ['brick', 'brickWash'],
  ['wood', 'wood'], ['rust', 'rust'], ['terracotta', 'terracotta'], ['dryearth', 'mud'],
];

function loadBitmap(url) {
  return fetch(url).then((r) => { if (!r.ok) throw new Error(url + ' ' + r.status); return r.blob(); }).then((b) => createImageBitmap(b));
}

/** Smooth value noise mask (0..1) as a canvas, for the whitewash patches and mud mottling. */
function noiseCanvas(size, seed, scale, threshold, soft) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  const h = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453; return s - Math.floor(s); };
  const vn = (x, y, p) => { // tileable value noise with period p
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const m = (a) => ((a % p) + p) % p;
    const a = h(m(xi), m(yi)), b = h(m(xi + 1), m(yi)), cc = h(m(xi), m(yi + 1)), d = h(m(xi + 1), m(yi + 1));
    return a + (b - a) * sx + (cc - a) * sy + (a - b - cc + d) * sx * sy;
  };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = (x / size) * scale, v = (y / size) * scale;
    let n = vn(u, v, scale) * 0.55 + vn(u * 2, v * 2, scale * 2) * 0.3 + vn(u * 5, v * 5, scale * 5) * 0.15;
    const a = Math.min(1, Math.max(0, (n - threshold) / soft));
    const i = (y * size + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
    img.data[i + 3] = Math.round(a * 255);
  }
  g.putImageData(img, 0, 0);
  return c;
}

/** Draws `img` as one tile into cell (col,row) with a wrapped margin all round. */
function drawTile(g, img, col, row, sw = null) {
  const x0 = col * CS, y0 = row * CS, inner = CS - 2 * MARGIN;
  g.save();
  g.beginPath(); g.rect(x0, y0, CS, CS); g.clip();
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    g.drawImage(img, 0, 0, sw ? sw[0] : img.width, sw ? sw[1] : img.height, x0 + MARGIN + dx * inner, y0 + MARGIN + dy * inner, inner, inner);
  }
  g.restore();
}

let atlasPromise = null;
const atlasParts = {};
/** { map, normalMap, roughnessMap } CanvasTextures, built once. `base` = the game's asset base url. */
export function buildHouseAtlas(base = 'assets/textures/') {
  if (atlasPromise) return atlasPromise;
  atlasPromise = (async () => {
    const kinds = ['color', 'normal', 'roughness'];
    const sets = [...new Set(SETS.map((s) => s[0]))];
    const bm = {};
    await Promise.all(sets.flatMap((s) => kinds.map(async (k) => { bm[s + k] = await loadBitmap(`${base}${s}/${s}_${k}.webp`); })));
    const wash = noiseCanvas(256, 3.7, 4, 0.42, 0.18);
    const out = {};
    const plasterSq = {};
    for (const k of kinds) {
      const c = document.createElement('canvas');
      c.width = CS * COLS; c.height = CS * ROWS;
      const g = c.getContext('2d');
      SETS.forEach(([set, name], i) => {
        const col = i % COLS, row = Math.floor(i / COLS);
        let img = bm[set + k];
        // plaster is a 2:1 strip (2 m x 1 m): two copies stacked make one square 2 m tile
        if (set === 'plaster') {
          const sq = document.createElement('canvas'); sq.width = sq.height = img.width;
          const sg = sq.getContext('2d'); sg.drawImage(img, 0, 0, img.width, img.width / 2); sg.drawImage(img, 0, img.width / 2, img.width, img.width / 2);
          img = sq;
        }
        drawTile(g, img, col, row);
        if (name === 'plaster') { plasterSq[k] = img; WALL_VARIANTS.forEach((_, vi) => drawTile(g, img, (8 + vi) % COLS, Math.floor((8 + vi) / COLS))); }
        // extra cells start as copies of the surface they replace (brick, concrete, mud, mud) until the real maps arrive
        const ex = { brick: [12], concrete: [13], mud: [14, 15] }[name];
        if (ex) ex.forEach((c) => drawTile(g, img, c % COLS, Math.floor(c / COLS)));
        if (name === 'brickWash' && false) { // lime whitewash brushed over the brick in ragged patches: paler, flatter, smoother where it sits
          const x0 = col * CS, y0 = row * CS;
          g.save(); g.beginPath(); g.rect(x0, y0, CS, CS); g.clip();
          const layer = document.createElement('canvas'); layer.width = layer.height = CS;
          const lg = layer.getContext('2d');
          lg.drawImage(wash, -MARGIN, -MARGIN, CS, CS); lg.drawImage(wash, CS - 3 * MARGIN, -MARGIN, CS, CS); lg.drawImage(wash, -MARGIN, CS - 3 * MARGIN, CS, CS);
          lg.globalCompositeOperation = 'source-in';
          lg.fillStyle = k === 'color' ? 'rgb(236,232,222)' : k === 'normal' ? 'rgb(128,128,255)' : 'rgb(235,235,235)';
          lg.fillRect(0, 0, CS, CS);
          g.globalAlpha = k === 'color' ? 0.86 : 0.55;
          g.drawImage(layer, x0, y0);
          g.restore();
        }
      });
      const t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      t.anisotropy = houseQuality().anisotropy;
      t.generateMipmaps = true;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      if (k === 'color') t.colorSpace = THREE.SRGBColorSpace;
      out[k] = t; atlasParts[k] = { g, t };
    }
    return { map: out.color, normalMap: out.normal, roughnessMap: out.roughness };
  })();
  return atlasPromise;
}

const DOOR_PAINTS = [ // door/window paint, picked by the house seed: the colours of real village doors (sun-faded)
  [0.36, 0.52, 0.42], [0.33, 0.45, 0.6], [0.5, 0.33, 0.24], [0.56, 0.24, 0.2], [0.5, 0.5, 0.48], [0.62, 0.55, 0.38], [0.28, 0.42, 0.5], [0.45, 0.3, 0.22],
];

let material = null;
/** The one shared house material. Textures arrive when the atlas is built (call buildHouseAtlas first, or await houseMaterialReady). */
export function getHouseMaterial() {
  if (material) return material;
  const blank = (rgb) => { const t = new THREE.DataTexture(new Uint8Array([...rgb, 255]), 1, 1); t.needsUpdate = true; return t; };
  material = new THREE.MeshStandardMaterial({
    name: 'houses_s7', map: blank([200, 200, 200]), normalMap: blank([128, 128, 255]), roughnessMap: blank([230, 230, 230]),
    roughness: 1, metalness: 0, vertexColors: true,
  });
  material.map.colorSpace = THREE.SRGBColorSpace;
  material.userData.noRepeatFold = true;
  const doorPaints = DOOR_PAINTS.map((c) => `vec3(${c.map((v) => v.toFixed(3)).join(',')})`).join(',');
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec2 aCellPaint;
        flat varying float vCell;
        varying float vPaint;
        flat varying float vSeed;
        varying vec3 vHW;
        varying vec3 vHLocal;`)
      .replace('#include <color_vertex>', `
        vColor = vec4( 1.0 );
        #ifdef USE_COLOR
          vColor.rgb *= color.xyz;
        #endif
        vSeed = 0.0;
        vec3 paint_ = vec3(1.0);
        #ifdef USE_BATCHING_COLOR
          vec4 bc_ = getBatchingColor( getIndirectIndex( gl_DrawID ) );
          paint_ = bc_.xyz; vSeed = bc_.w;
        #endif
        #ifdef USE_INSTANCING_COLOR
          paint_ = instanceColor.xyz;
        #endif
        vCell = aCellPaint.x;
        vPaint = aCellPaint.y;
        if ( aCellPaint.y > 0.5 && aCellPaint.y < 1.5 ) vColor.rgb *= paint_;
        vHLocal = position;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          vec4 hw_ = vec4( transformed, 1.0 );
          #ifdef USE_BATCHING
            hw_ = batchingMatrix * hw_;
          #endif
          #ifdef USE_INSTANCING
            hw_ = instanceMatrix * hw_;
          #endif
          vHW = ( modelMatrix * hw_ ).xyz;
        }`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        flat varying float vCell;
        varying float vPaint;
        flat varying float vSeed;
        varying vec3 vHW;
        varying vec3 vHLocal;
        const vec3 DOOR_PAINTS[8] = vec3[8](${doorPaints});
        const float CELL_BOOST[8] = float[8](1.35, 1.45, 1.25, 1.2, 2.4, 1.15, 1.3, 1.25);
        const float CELL_NORMAL[8] = float[8](2.2, 1.0, 1.0, 1.0, 1.1, 1.2, 1.0, 0.3);
        float hh_(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
        float hn_(vec3 p) {
          vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(hh_(i), hh_(i + vec3(1,0,0)), f.x), mix(hh_(i + vec3(0,1,0)), hh_(i + vec3(1,1,0)), f.x), f.y),
                     mix(mix(hh_(i + vec3(0,0,1)), hh_(i + vec3(1,0,1)), f.x), mix(hh_(i + vec3(0,1,1)), hh_(i + vec3(1,1,1)), f.x), f.y), f.z);
        }
        // tile inside atlas cell c; the gradient comes from the continuous coordinate so the mip level is right across fract()
        vec4 atlasTex(sampler2D t, vec2 uv, float c) {
          vec2 cell = vec2(mod(c, 4.0), 3.0 - floor(c / 4.0));
          vec2 sz = vec2(0.25, 0.25);
          float m = ${(MARGIN / CS).toFixed(5)};
          vec2 f = fract(uv);
          vec2 a = (cell + vec2(m) + f * (1.0 - 2.0 * m)) * sz;
          vec2 k = sz * (1.0 - 2.0 * m);
          vec2 gx = dFdx(uv) * k, gy = dFdy(uv) * k;
          // never blur past ~1/16 of a cell: beyond that the margin cannot hide the neighbours
          float lim = 0.035;
          gx = clamp(gx, vec2(-lim), vec2(lim)); gy = clamp(gy, vec2(-lim), vec2(lim));
          return textureGrad(t, a, gx, gy);
        }`)
      .replace('#include <map_fragment>', `
        // per-house tile scale (+-15%) and offset: neighbours never show the same tile phase
        vec2 hUv = vMapUv * (0.85 + 0.3 * fract(vSeed * 5.37)) + vec2(fract(vSeed * 7.13), fract(vSeed * 3.71)) * 4.0;
        float hCell = floor(vCell + 0.5);
        // plaster walls pick one of 5 surfaces by the house seed (cell 0 or the variant cells 8..11)
        float hAt = hCell < 0.5 ? floor(fract(vSeed * 17.31) * 5.0) : hCell;
        if (hCell < 0.5 && hAt > 0.5) hAt += 7.0;
        if (hCell >= 0.5) hAt = hCell;
        // brick (cells 2, 3), concrete (1) and mud (7): some houses take the second-round surface (cells 12..15) instead
        if (hCell == 2.0 || hCell == 3.0) { if (fract(vSeed * 23.71) < 0.45) { hAt = 12.0; hUv *= 0.58; } }
        else if (hCell == 1.0) { if (fract(vSeed * 29.13) < 0.35) hAt = 13.0; }
        else if (hCell == 7.0) { float mu_ = fract(vSeed * 19.37); if (mu_ > 0.34) hAt = mu_ > 0.67 ? 15.0 : 14.0; }
        {
          vec4 tex_ = atlasTex(map, hUv, hAt);
          tex_.rgb *= CELL_BOOST[int(hCell)];
          diffuseColor *= tex_;
        }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          if (vPaint > 1.5) diffuseColor.rgb *= DOOR_PAINTS[int(mod(floor(vSeed * 97.0), 8.0))] * 1.6;
          vec3 wp_ = vHW;
          // world-space mottling: no two walls read alike, no extra textures
          float n1 = hn_(wp_ * 0.55 + vSeed * 13.0) * 0.6 + hn_(wp_ * 2.1) * 0.4;
          diffuseColor.rgb *= 1.0 + (n1 - 0.5) * 0.32;
          bool wall_ = hCell < 0.5 || hCell == 7.0 || hCell == 2.0 || hCell == 3.0;
          if (hCell < 0.5) {
            // limewash: faded patches where it was last touched up, and damp/soot stains
            float pe_ = smoothstep(0.55, 0.8, hn_(wp_ * vec3(1.1, 1.4, 1.1) + vSeed * 31.0) * 0.7 + hn_(wp_ * 4.0 + 7.0) * 0.3);
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, vec3(0.333))) * vec3(1.06, 1.0, 0.9), 0.65 * pe_);
            float st_ = smoothstep(0.55, 0.85, hn_(wp_ * vec3(0.7, 0.4, 0.7) + 11.0 + vSeed * 5.0) * 0.75 + hn_(wp_ * 3.1) * 0.25);
            diffuseColor.rgb *= 1.0 - 0.3 * st_ * vec3(1.0, 1.04, 1.1);
            // the bottom metre takes the splash and the hands: darker, browner
            diffuseColor.rgb *= 1.0 - 0.18 * (1.0 - smoothstep(0.3, 1.3, wp_.y));
          }
          // rain streaks running down from roof and chajja edges (vertical faces only)
          float vert_ = 1.0 - abs(normalize(cross(dFdx(vHW), dFdy(vHW))).y);
          float col_ = hn_(vec3((wp_.x + wp_.z) * 5.0, 0.0, vSeed * 3.0)) * hn_(vec3((wp_.x + wp_.z) * 1.3, wp_.y * 0.35, 5.0));
          diffuseColor.rgb *= 1.0 - (wall_ ? 0.45 : 0.15) * col_ * col_ * vert_ * smoothstep(0.4, 2.2, wp_.y);
          // splashed-up dust over the bottom, ragged edge
          float edge_ = 0.3 + 0.7 * hn_(vec3((wp_.x + wp_.z) * 1.7, 0.0, 9.0));
          float dust_ = (1.0 - smoothstep(edge_ * 0.5, edge_, wp_.y)) * (wall_ ? 0.5 : 0.3) * vert_;
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, vec3(0.333))) * vec3(0.84, 0.72, 0.56), dust_);
          if (hCell == 7.0) { // gobar-mitti plaster: grey-brown, not sand-yellow, hand-smeared in big swirls
            float l_ = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
            diffuseColor.rgb = mix(vec3(l_), diffuseColor.rgb, 0.45) * vec3(1.0, 0.93, 0.84);
            diffuseColor.rgb *= 0.88 + 0.24 * hn_(vec3(wp_.x * 1.7 + wp_.z * 1.7 + sin(wp_.y * 3.0) * 0.6, wp_.y * 0.9, vSeed * 7.0));
          }
          if (hCell == 6.0) diffuseColor.rgb = mix(vec3(dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114))) * vec3(1.1, 0.93, 0.8), diffuseColor.rgb, 0.5);
          if (hCell == 2.0 || hCell == 3.0) {
            // per-brick tone: lighter, darker and the odd overburnt brick (cells roughly brick-aligned)
            vec2 bt_ = hUv * vec2(4.8, 14.0);
            float row_ = floor(bt_.y);
            vec2 cl_ = vec2(floor(bt_.x + hh_(vec3(row_, 3.0, 1.0)) * 4.8), row_);
            float r1_ = hh_(vec3(cl_, 7.0)), r2_ = hh_(vec3(cl_, 13.0));
            float k_ = hAt < 11.5 ? 1.0 : 0.0; // the per-brick tone is laid out for the original brick only
            diffuseColor.rgb *= 1.0 + k_ * (0.82 + 0.34 * r1_ - 1.0);
            diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.62, 0.55, 0.52), k_ * step(0.93, r2_) * 0.7);
            diffuseColor.rgb = mix(vec3(dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114))), diffuseColor.rgb, 0.82);
          }
          if (hCell == 3.0) {
            // old lime whitewash over the brick: big irregular patches (world space, so no tile ever repeats), thin and
            // translucent at their ragged edges, the mortar lines still showing through
            float big_ = hn_(wp_ * vec3(0.35, 0.5, 0.35) + vSeed * 17.0) * 0.65 + hn_(wp_ * vec3(1.1, 1.4, 1.1) + 3.0) * 0.25 + hn_(wp_ * 6.0) * 0.1;
            float wash_ = smoothstep(0.42, 0.58, big_);
            float thin_ = 0.55 + 0.45 * hn_(wp_ * 3.3 + 9.0);
            vec3 lime_ = vec3(0.84, 0.82, 0.77) * (0.92 + 0.12 * hn_(wp_ * 2.0));
            diffuseColor.rgb = mix(diffuseColor.rgb, lime_ * mix(vec3(1.0), diffuseColor.rgb * 1.6, 0.18), wash_ * thin_);
          }
          diffuseColor.rgb = clamp(diffuseColor.rgb, vec3(0.025), vec3(0.86));
        }`)
      .replace('#include <roughnessmap_fragment>', `
        float roughnessFactor = roughness;
        {
          vec4 texelRoughness = atlasTex(roughnessMap, hUv, hAt);
          roughnessFactor *= texelRoughness.g;
          float rn_ = hn_(vHW * 0.8 + 41.0) * 0.65 + hn_(vHW * 5.3 + 17.0) * 0.35;
          roughnessFactor = clamp(roughnessFactor * (0.86 + 0.28 * rn_), hCell == 5.0 ? 0.55 : 0.62, 1.0);
        }`)
      .replace('#include <normal_fragment_maps>', `
        {
          vec3 mapN = atlasTex(normalMap, hUv, hAt).xyz * 2.0 - 1.0;
          float ns_ = 0.6 + 0.6 * hn_(vHW * 0.7 + 63.0);
          mapN.xy *= normalScale * ns_ * CELL_NORMAL[int(hCell)];
          normal = normalize( tbn * mapN );
        }`);
  };
  material.customProgramCacheKey = () => 'houses_s7_atlas_v3';
  return material;
}

/** Resolves once the atlas is on the material. */
export function houseMaterialReady(base) {
  const m = getHouseMaterial();
  return buildHouseAtlas(base).then((a) => {
    m.map = a.map; m.normalMap = a.normalMap; m.roughnessMap = a.roughnessMap;
    m.needsUpdate = true;
    if (typeof window !== 'undefined' && !/[?&]off=[^&]*walls/.test(location.search)) setTimeout(() => (window.requestIdleCallback || setTimeout)(() => loadHouseVariants(), window.requestIdleCallback ? { timeout: 1000 } : 1), 8000);
    return m;
  });
}

/** After the game has started: swap the real variant surfaces into cells 8..15 (24 small WebP files, about 2.4 MB). */
export function loadHouseVariants(base = 'assets/textures_mix/') {
  const kinds = ['color', 'normal', 'roughness'];
  return Promise.all(ALL_VARIANTS.flatMap((v) => kinds.map((k) => loadBitmap(`${base}${v}/${v}_${k}.webp`).then((img) => ({ v, k, img })))))
    .then((all) => {
      for (const { v, k, img } of all) {
        const i = 8 + ALL_VARIANTS.indexOf(v), p = atlasParts[k];
        if (!p) continue;
        drawTile(p.g, img, i % COLS, Math.floor(i / COLS));
        p.t.needsUpdate = true;
      }
    }).catch(() => { /* variants stay as plain plaster */ });
}
