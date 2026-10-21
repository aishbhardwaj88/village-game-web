import * as THREE from 'three';

/**
 * Wisps of steam over a kettle / tea pot (art review 1, tea stall: "add steam from the kettle"). One THREE.Points object
 * (one draw call) with soft round sprites that rise, widen and fade, looping. Purely decorative, no collision, not
 * merged. `sources` = [{ x, y, z }] world positions of the steam origin.
 */
export function createSteam(sources, perSource = 14) {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const map = new THREE.CanvasTexture(canvas);

  const n = sources.length * perSource;
  const pos = new Float32Array(n * 3);
  const material = new THREE.PointsMaterial({ map, size: 0.55, transparent: true, opacity: 0.75, depthWrite: false, sizeAttenuation: true, color: 0xf4f6f8 });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const points = new THREE.Points(geometry, material);
  points.name = 'tea_steam';
  points.frustumCulled = false;
  const RISE = 0.9; // metres each wisp travels
  let t = 0;
  function update(dt) {
    t += dt;
    for (let s = 0; s < sources.length; s++) {
      for (let i = 0; i < perSource; i++) {
        const k = s * perSource + i;
        const life = ((t * 0.35 + i / perSource) % 1);
        pos[k * 3] = sources[s].x + Math.sin(t * 0.9 + i * 1.7) * 0.05 * (0.4 + life) + (i % 3 - 1) * 0.02;
        pos[k * 3 + 1] = sources[s].y + life * RISE;
        pos[k * 3 + 2] = sources[s].z + Math.cos(t * 0.7 + i * 2.3) * 0.05 * (0.4 + life);
      }
    }
    geometry.attributes.position.needsUpdate = true;
    material.size = 0.5 + 0.12 * Math.sin(t * 1.3);
  }
  update(0);
  return { points, update };
}
