import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createRenderer } from '../renderer.js';
import { createScene, createGround, createSun, loadEnvironment, applyFog } from '../scene.js';
import { createSky, updateSky } from '../sky.js';
import { getActiveAtmosphere } from '../atmosphere.js';
import { createComposer } from '../postfx.js';
import { updateWater } from '../water.js';
import { getTiledMaterial } from '../materials.js';
import { setPlantFocus } from '../realPlants.js';
import { loadLandMap } from './landLayout.js';
import { buildShopsLand } from './landIndex.js';
import { buildMapObjects } from './mapObjects.js';

/**
 * Stand-alone preview of the map objects layer (docs/s7/mapobjects/preview.html) with the game's own renderer, sky,
 * sun, fog, ground and grade, the shops-land layers named in ?ctx= (default 'fields,trees') for context, and the roads
 * as plain strips. Not part of the game build.  ?cam=x,y,z&look=x,y,z
 */
const q = new URLSearchParams(location.search);
const num3 = (s, d) => (s ? s.split(',').map(Number) : d);

async function run() {
  const canvas = document.getElementById('scene');
  const renderer = createRenderer(canvas, false);
  renderer.setPixelRatio(1);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  const scene = createScene();
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 900);
  const env = loadEnvironment(renderer, scene, 'assets/hdri/camdeboo_road_512.hdr').catch(() => {});
  const atmosphere = getActiveAtmosphere();
  scene.add(createGround({ grassTint: 0x7b8a4a, grassCoverage: 0.7 }));
  const sun = createSun(false, atmosphere);
  sun.castShadow = false;
  const rig = new THREE.Group(); rig.add(sun, sun.target); scene.add(rig);
  scene.add(new THREE.HemisphereLight(0x6f96c2, 0x8a6a45, 0.9));
  const bounce = new THREE.DirectionalLight(0xffe2b8, 0.55); bounce.position.set(-20, 14, -60); scene.add(bounce);
  const sky = createSky(sun.position, atmosphere); scene.add(sky);
  applyFog(scene, atmosphere);
  const [cx, cy, cz] = num3(q.get('cam'), [602, 1.6, 60]);
  const [lx, ly, lz] = num3(q.get('look'), [602, 3, 10]);
  camera.position.set(cx, cy, cz); camera.lookAt(lx, ly, lz);
  setPlantFocus(cx, cz);

  const map = await loadLandMap();
  scene.add(previewRoads(map));
  const ctx = q.get('ctx') ?? 'fields,trees';
  const land = ctx ? await buildShopsLand(scene, { map, camera, only: ctx }) : null;
  const mo = await buildMapObjects(scene, { map, camera });
  await env;
  const composer = createComposer(renderer, scene, camera, { enableBloom: true, enableGrain: true });
  const pending = () => { let n = 0; const seen = new Set(); scene.traverse((o) => { const ms = o.material ? [].concat(o.material) : []; for (const m of ms) for (const k in m) { const t = m[k]; if (t && t.isTexture && !seen.has(t)) { seen.add(t); if (!t.isCanvasTexture && !t.isDataTexture && !t.isRenderTargetTexture && !(t.source && t.source.data)) n++; } } }); return n; };
  for (let i = 0; i < 300 && pending() > 0; i++) await new Promise((r) => setTimeout(r, 200));
  if (document.fonts) await document.fonts.ready;
  const t0 = performance.now();
  const tick = () => { updateWater((performance.now() - t0) / 1000); updateSky(sky, 0, camera); renderer.info.reset(); renderer.info.autoReset = false; composer.render(); };
  tick();
  window.__snap = () => { tick(); return canvas.toDataURL('image/jpeg', 0.86); };
  window.__mo = mo; window.__dbg = { THREE, scene, camera, renderer };
  window.__layerInfo = () => {
    // the map objects layer on its own, main pass, after the per-frame packing has run for this camera
    const vis = new Map(); scene.children.forEach((c) => { vis.set(c, c.visible); c.visible = c === mo.group; });
    renderer.info.reset(); renderer.render(scene, camera);
    const all = { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
    const per = {};
    for (const [name, obj] of Object.entries(mo.layers)) {
      mo.group.children.forEach((c) => { c.visible = c === obj || c.name === 's7_frame_hook'; });
      renderer.info.reset(); renderer.render(scene, camera);
      per[name] = { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
    }
    mo.group.children.forEach((c) => { c.visible = true; });
    scene.children.forEach((c) => { c.visible = vis.get(c); });
    return { mapobjects: all, ...per };
  };
  window.__ready = true;
  void land;
}

function previewRoads(map) {
  const mat = getTiledMaterial('lane', { vertexColors: true });
  const geos = [];
  for (const r of map.roads) {
    const w = r.width || 4, y = r.kind === 'highway' ? 0.035 : r.kind === 'road' ? 0.03 : 0.025;
    for (let i = 0; i < r.pts.length - 1; i++) {
      const [ax, az] = r.pts[i], [bx, bz] = r.pts[i + 1];
      const L = Math.hypot(bx - ax, bz - az);
      if (L < 0.01) continue;
      const g = new THREE.PlaneGeometry(w, L + w * 0.5).rotateX(-Math.PI / 2);
      const uv = g.attributes.uv;
      for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * w / 5, uv.getY(k) * (L + w * 0.5) / 5);
      g.rotateY(Math.atan2(bx - ax, bz - az)).translate((ax + bx) / 2, y, (az + bz) / 2);
      const c = new THREE.Color(r.kind === 'highway' ? 0x9a9488 : 0xffffff);
      g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3).map((_, k) => [c.r, c.g, c.b][k % 3]), 3));
      geos.push(g);
    }
  }
  const m = new THREE.Mesh(mergeGeometries(geos), mat);
  m.name = 'preview_roads';
  return m;
}

run().catch((e) => { console.error(e); window.__error = String((e && e.stack) || e); });
