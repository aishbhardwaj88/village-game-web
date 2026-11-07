import * as THREE from 'three';
import { buildMonkeyMesh } from './animals.js';
import { ROOF_TANK_TOPS } from './villageHouses.js';

/**
 * Three monkeys sitting on rooftop water tanks of the kit houses (docs/PARALLEL.md tonight item 4). The M6 monkey shape
 * (src/animals.js buildMonkeyMesh), ONE InstancedMesh = one draw call. Two on the tank nearest the player's start, one on the
 * next. Feet sit on the lid height recorded by src/villageHouses.js (the tank is merged static geometry, so the surface is
 * known analytically rather than raycast). Shown within 70 m of the player.
 */
export function createRoofMonkeys(scene) {
  const mk = buildMonkeyMesh();
  const mesh = new THREE.InstancedMesh(mk.geometry, mk.material, 3);
  mesh.name = 'roof_monkeys'; mesh.castShadow = false; mesh.frustumCulled = false; mesh.userData.noAutoCollider = true;
  mesh.visible = false; mesh.count = 0;
  scene.add(mesh);
  const sits = [];
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3();
  let t = 0, last = 0, check = 0, player = null;
  const prev = scene.onBeforeRender;
  scene.onBeforeRender = function (...args) {
    if (prev) prev.apply(this, args);
    const now = performance.now() / 1000;
    const dt = Math.min(0.1, last ? now - last : 0); last = now; t += dt; check -= dt;
    if (check > 0 && sits.length) { if (mesh.visible) animate(); return; }
    check = sits.length ? 0.5 : 1;
    player = player || scene.getObjectByName('player');
    if (!player) return;
    if (!sits.length) {
      if (!ROOF_TANK_TOPS.length) return;
      const near = [...ROOF_TANK_TOPS].sort((a, b) => Math.hypot(a.x - player.position.x, a.z - player.position.z) - Math.hypot(b.x - player.position.x, b.z - player.position.z));
      const a = near[0], b = near[1] || near[0];
      const put = (tk, ang, s, ph) => sits.push({ x: tk.x + Math.cos(ang) * tk.rad * 0.38, z: tk.z + Math.sin(ang) * tk.rad * 0.38, y: tk.y, ry: ang + Math.PI * 0.5, s, ph });
      put(a, 0.7, 0.9, 0); put(a, 3.6, 0.8, 1.9); if (b !== a) put(b, 2.0, 0.9, 3.1);
      mesh.count = sits.length;
      
    }
    const near = sits.some((s) => Math.hypot(s.x - player.position.x, s.z - player.position.z) < 70);
    mesh.visible = near;
    if (near) animate();
  };
  function animate() {
    sits.forEach((s, i) => {
      const scratch = Math.max(0, Math.sin(t * 0.8 + s.ph)) ** 6;
      p.set(s.x, s.y, s.z); q.setFromEuler(e.set(0, s.ry + scratch * 0.25, 0)); sc.set(s.s, s.s * (1 + 0.04 * scratch), s.s);
      mesh.setMatrixAt(i, m.compose(p, q, sc));
    });
    mesh.instanceMatrix.needsUpdate = true;
  }
  return { mesh };
}
