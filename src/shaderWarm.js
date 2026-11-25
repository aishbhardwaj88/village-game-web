import * as THREE from 'three';
import { getHouseMaterial } from './kit/housesMaterial.js';
import { sharedMaterials } from './materials.js';

// Shader warm-up behind the title (26 Nov; moved out of main.js). Both run inside the existing ready gate (setReadyGate in main.js),
// so Play waits for nothing new: they only make the gate's compile pass cover programs that no visible mesh needs yet, so the
// first use after Play (a zone streaming in, a house leaving the far box LOD) does not stall on a shader compile.

const triGeometry = (withUv2, withCellPaint) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3));
  g.setAttribute('normal', new THREE.BufferAttribute(Int8Array.from([0, 0, 127, 0, 0, 127, 0, 0, 127]), 3, true));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1], 2));
  g.setAttribute('color', new THREE.BufferAttribute(Uint8Array.from([255, 255, 255, 255, 255, 255, 255, 255, 255]), 3, true));
  if (withUv2) g.setAttribute('uv1', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1], 2));
  if (withCellPaint) g.setAttribute('aCellPaint', new THREE.BufferAttribute(Uint8Array.from([0, 0, 0, 0, 0, 0]), 2, false));
  return g;
};

function compileGroup(grp, { renderer, composer, camera, scene }) {
  const rt = renderer.getRenderTarget();
  renderer.setRenderTarget(composer.inputBuffer); // the variants the RenderPass actually draws
  const p = renderer.compileAsync(grp, camera, scene);
  renderer.setRenderTarget(rt);
  return p.catch(() => {});
}

/** The atlas-shader houses may all be out of range (hidden) at the spawn: compile their program from a stand-in mesh. */
export function houseShaderWarm(ctx) {
  try {
    const m = new THREE.Mesh(triGeometry(false, true), getHouseMaterial());
    m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
    const grp = new THREE.Group(); grp.add(m);
    return compileGroup(grp, ctx);
  } catch (e) { return Promise.resolve(); }
}

/** One stand-in mesh per distinct shared-library material kind (maps present, vertex colours, side, alpha), so programs the
 *  streamed zones will need are already compiled. Programs are shared by three.js across materials with the same key. */
export function sharedMaterialWarm(ctx) {
  try {
    const seen = new Set(), grp = new THREE.Group();
    const geo = triGeometry(true, false);
    for (const mat of sharedMaterials()) {
      const key = [!!mat.map, !!mat.normalMap, !!mat.roughnessMap, !!mat.aoMap, mat.vertexColors, mat.side, mat.transparent, mat.alphaTest > 0, mat.type].join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
      grp.add(m);
    }
    return grp.children.length ? compileGroup(grp, ctx) : Promise.resolve();
  } catch (e) { return Promise.resolve(); }
}
