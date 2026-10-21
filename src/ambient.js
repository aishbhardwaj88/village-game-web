import * as THREE from 'three';

/**
 * Small ambient life (ship mode polish): birds circling over the village and thin chulha smoke curling up from the halwai's bhatti
 * and the two tea stalls. Two Points objects (2 draw calls, no shadows), no collision. Purely visual.
 */
function spriteTexture(draw, size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  return new THREE.CanvasTexture(c);
}

export function createAmbientLife() {
  // --- birds: dark "v" glyphs gliding in two loose circles, bobbing
  const birdTex = spriteTexture((ctx, s) => {
    ctx.strokeStyle = '#1b1b1f';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(8, 24);
    ctx.quadraticCurveTo(22, 34, 32, 44);
    ctx.quadraticCurveTo(42, 34, 56, 24);
    ctx.stroke();
  });
  const N = 14;
  const birdPos = new Float32Array(N * 3);
  const birdGeo = new THREE.BufferGeometry();
  birdGeo.setAttribute('position', new THREE.BufferAttribute(birdPos, 3));
  const birdMat = new THREE.PointsMaterial({ map: birdTex, size: 3.2, transparent: true, depthWrite: false, sizeAttenuation: true, alphaTest: 0.05 });
  const birds = new THREE.Points(birdGeo, birdMat);
  birds.name = 'ambient_birds';
  birds.frustumCulled = false;

  // --- smoke
  const smokeTex = spriteTexture((ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(200,200,200,0.7)');
    g.addColorStop(0.6, 'rgba(180,180,180,0.25)');
    g.addColorStop(1, 'rgba(180,180,180,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });
  const sources = [
    { x: -38.2, y: 3.7, z: 61.5 }, // halwai bhatti
    { x: -55.4, y: 2.9, z: 10 }, // chowk tea stall
    { x: -51.2, y: 2.9, z: 78.2 }, // lane tea stall
    { x: -62 + 1.8, y: 0.8, z: -26 + 2.0 }, // kachcha homestead 1 chulha (local 1.8, 2.0)
    { x: -64 - 1.8, y: 0.8, z: -56 - 2.0 }, // kachcha homestead 2 chulha (turned 180 deg)
  ];
  const PER = 14;
  const smokePos = new Float32Array(sources.length * PER * 3);
  const smokeGeo = new THREE.BufferGeometry();
  smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePos, 3));
  const smokeMat = new THREE.PointsMaterial({ map: smokeTex, size: 1.4, transparent: true, opacity: 0.55, depthWrite: false, sizeAttenuation: true, color: 0xd8d4cc });
  const smoke = new THREE.Points(smokeGeo, smokeMat);
  smoke.name = 'ambient_smoke';
  smoke.frustumCulled = false;

  const group = new THREE.Group();
  group.name = 'ambient_life';
  group.add(birds, smoke);
  let t = 0;
  function update(dt, px, pz) {
    t += dt;
    for (let i = 0; i < N; i++) {
      const ring = i % 2 ? 70 : 105;
      const a = t * (i % 2 ? 0.06 : -0.045) + (i / N) * Math.PI * 2;
      birdPos[i * 3] = -45 + Math.cos(a) * ring + Math.sin(t * 0.7 + i) * 4;
      birdPos[i * 3 + 1] = 26 + (i % 5) * 4 + Math.sin(t * 1.3 + i * 2) * 1.6;
      birdPos[i * 3 + 2] = 60 + Math.sin(a) * ring * 0.8;
    }
    birdGeo.attributes.position.needsUpdate = true;
    const near = sources.some((s) => Math.abs(s.x - px) < 90 && Math.abs(s.z - pz) < 90);
    smoke.visible = near;
    if (near) {
      sources.forEach((s, si) => {
        for (let i = 0; i < PER; i++) {
          const life = (t * 0.22 + i / PER) % 1;
          const k = (si * PER + i) * 3;
          smokePos[k] = s.x + Math.sin(t * 0.6 + i * 1.9) * 0.25 * life + life * 0.9;
          smokePos[k + 1] = s.y + life * 3.2;
          smokePos[k + 2] = s.z + Math.cos(t * 0.5 + i * 2.7) * 0.25 * life;
        }
      });
      smokeGeo.attributes.position.needsUpdate = true;
    }
  }
  return { group, update };
}
