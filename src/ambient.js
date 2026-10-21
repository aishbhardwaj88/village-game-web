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

  // --- ground birds: hens and crows pecking about near the homesteads and the chowk (one Points draw call)
  const henTex = spriteTexture((ctx, sz) => {
    ctx.fillStyle = '#7a4a2a';
    ctx.beginPath();
    ctx.ellipse(32, 38, 17, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(46, 24, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#b3382b';
    ctx.fillRect(44, 15, 5, 5);
    ctx.fillStyle = '#e0a93a';
    ctx.fillRect(52, 24, 6, 3);
  });
  const flocks = [
    { x: -60, z: -22, n: 4 },
    { x: -66, z: -52, n: 3 },
  ];
  const HN = flocks.reduce((a, f) => a + f.n, 0);
  const henPos = new Float32Array(HN * 3);
  const henGeo = new THREE.BufferGeometry();
  henGeo.setAttribute('position', new THREE.BufferAttribute(henPos, 3));
  const henMat = new THREE.PointsMaterial({ map: henTex, size: 0.55, transparent: true, depthWrite: false, sizeAttenuation: true, alphaTest: 0.05 });
  const hens = new THREE.Points(henGeo, henMat);
  hens.name = 'ambient_hens';
  hens.frustumCulled = false;

  // --- butterflies fluttering over the field and homestead edges (one Points draw call, shown only within 60 m)
  const flyTex = spriteTexture((ctx) => {
    ctx.fillStyle = '#e8a43a';
    ctx.beginPath();
    ctx.ellipse(20, 28, 14, 10, -0.5, 0, Math.PI * 2);
    ctx.ellipse(44, 28, 14, 10, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4a2c14';
    ctx.fillRect(30, 18, 4, 22);
  });
  const patches = [
    { x: 20, z: -10, n: 5 },
    { x: -40, z: -30, n: 4 },
    { x: 60, z: -35, n: 4 },
  ];
  const BN = patches.reduce((a, f) => a + f.n, 0);
  const flyPos = new Float32Array(BN * 3);
  const flyGeo = new THREE.BufferGeometry();
  flyGeo.setAttribute('position', new THREE.BufferAttribute(flyPos, 3));
  const flyMat = new THREE.PointsMaterial({ map: flyTex, size: 0.45, transparent: true, depthWrite: false, sizeAttenuation: true, alphaTest: 0.05 });
  const flies = new THREE.Points(flyGeo, flyMat);
  flies.name = 'ambient_butterflies';
  flies.frustumCulled = false;

  // --- cattle resting in the two kachcha sheds (one Points draw call, shown only within 45 m). Local shed coords; homestead 2 is turned 180 deg.
  const cowTex = spriteTexture((ctx) => {
    ctx.fillStyle = '#c9b79a';
    ctx.fillRect(14, 22, 34, 20);
    ctx.fillRect(40, 14, 14, 16);
    ctx.fillStyle = '#a58f6e';
    ctx.fillRect(48, 12, 10, 10);
    ctx.fillStyle = '#3a2b20';
    ctx.fillRect(18, 42, 5, 10);
    ctx.fillRect(40, 42, 5, 10);
    ctx.fillRect(10, 24, 4, 14);
    ctx.fillRect(54, 10, 3, 4);
  }, 64);
  const cows = [
    { x: -62 + 3.9, z: -26 - 3.4 }, { x: -62 + 5.6, z: -26 - 3.4 },
    { x: -64 - 4.2, z: -56 + 3.4 },
  ];
  const cowPos = new Float32Array(cows.length * 3);
  cows.forEach((c, i) => { cowPos[i * 3] = c.x; cowPos[i * 3 + 1] = 0.55; cowPos[i * 3 + 2] = c.z; });
  const cowGeo = new THREE.BufferGeometry();
  cowGeo.setAttribute('position', new THREE.BufferAttribute(cowPos, 3));
  const cowMat = new THREE.PointsMaterial({ map: cowTex, size: 1.5, transparent: true, depthWrite: false, sizeAttenuation: true, alphaTest: 0.05 });
  const cowPts = new THREE.Points(cowGeo, cowMat);
  cowPts.name = 'ambient_cattle';
  cowPts.frustumCulled = false;

  // --- kids playing tag in the lane near the halwai and tea stall (one Points draw call, shown only within 22 m, which keeps the hero-zone draw-call count under the ceiling)
  const kidTex = spriteTexture((ctx) => {
    ctx.fillStyle = '#2b1d14';
    ctx.beginPath(); ctx.arc(32, 12, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c98a5a';
    ctx.fillRect(27, 18, 10, 4);
    ctx.fillStyle = '#d9d2c2';
    ctx.fillRect(24, 22, 16, 18);
    ctx.fillStyle = '#3b5a8a';
    ctx.fillRect(25, 40, 6, 16);
    ctx.fillRect(33, 40, 6, 16);
  });
  const kidSpot = { x: -45, z: 70, n: 4 };
  const kidPos = new Float32Array(kidSpot.n * 3);
  const kidGeo = new THREE.BufferGeometry();
  kidGeo.setAttribute('position', new THREE.BufferAttribute(kidPos, 3));
  const kidMat = new THREE.PointsMaterial({ map: kidTex, size: 1.1, transparent: true, depthWrite: false, sizeAttenuation: true, alphaTest: 0.05 });
  const kids = new THREE.Points(kidGeo, kidMat);
  kids.name = 'ambient_kids';
  kids.frustumCulled = false;

  // --- villagers strolling the school end of the lane (one Points draw call, shown only within 25 m)
  const walkTex = spriteTexture((ctx) => {
    ctx.fillStyle = '#2b1d14';
    ctx.beginPath(); ctx.arc(32, 9, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b87a4c';
    ctx.fillRect(27, 15, 10, 4);
    ctx.fillStyle = '#cfc6b0';
    ctx.fillRect(23, 19, 18, 24);
    ctx.fillStyle = '#e8e2d2';
    ctx.fillRect(25, 43, 14, 18);
  });
  const walkers = [
    { x: -47.5, z0: 80, z1: 99, speed: 0.9, ph: 0 },
    { x: -45.5, z0: 76, z1: 102, speed: 0.7, ph: 2.1 },
    { x: -48.5, z0: 84, z1: 97, speed: 1.1, ph: 4.2 },
  ];
  const walkPos = new Float32Array(walkers.length * 3);
  const walkGeo = new THREE.BufferGeometry();
  walkGeo.setAttribute('position', new THREE.BufferAttribute(walkPos, 3));
  const walkMat = new THREE.PointsMaterial({ map: walkTex, size: 1.8, transparent: true, depthWrite: false, sizeAttenuation: true, alphaTest: 0.05 });
  const walk = new THREE.Points(walkGeo, walkMat);
  walk.name = 'ambient_walkers';
  walk.frustumCulled = false;

  const group = new THREE.Group();
  group.name = 'ambient_life';
  group.add(birds, smoke, hens, flies, cowPts, kids, walk);
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
    cowPts.visible = cows.some((c) => Math.abs(c.x - px) < 45 && Math.abs(c.z - pz) < 45);
    if (cowPts.visible) {
      cows.forEach((c, i) => { cowPos[i * 3 + 1] = 0.55 + Math.sin(t * 0.8 + i * 2) * 0.012; });
      cowGeo.attributes.position.needsUpdate = true;
    }
    kids.visible = Math.abs(kidSpot.x - px) < 22 && Math.abs(kidSpot.z - pz) < 22;
    if (kids.visible) {
      for (let i = 0; i < kidSpot.n; i++) {
        const ph = i * 1.9;
        kidPos[i * 3] = kidSpot.x + Math.sin(t * 0.55 + ph) * 3.2 + Math.sin(t * 1.3 + ph * 2) * 0.6;
        kidPos[i * 3 + 1] = 0.55 + Math.abs(Math.sin(t * 5 + ph * 3)) * 0.12;
        kidPos[i * 3 + 2] = kidSpot.z + Math.cos(t * 0.45 + ph * 1.6) * 2.6;
      }
      kidGeo.attributes.position.needsUpdate = true;
    }
    walk.visible = Math.abs(-47 - px) < 25 && Math.abs(90 - pz) < 25;
    if (walk.visible) {
      walkers.forEach((w, i) => {
        const f = 0.5 - 0.5 * Math.cos(t * w.speed * 0.12 + w.ph); // eases at each turnaround
        walkPos[i * 3] = w.x;
        walkPos[i * 3 + 1] = 0.9 + Math.abs(Math.sin(t * 3.2 * w.speed + w.ph)) * 0.04;
        walkPos[i * 3 + 2] = w.z0 + (w.z1 - w.z0) * f;
      });
      walkGeo.attributes.position.needsUpdate = true;
    }
    hens.visible = flocks.some((f) => Math.abs(f.x - px) < 45 && Math.abs(f.z - pz) < 45);
    if (hens.visible) {
      let k = 0;
      flocks.forEach((f, fi) => {
        for (let i = 0; i < f.n; i++, k++) {
          const ph = fi * 7 + i * 2.3;
          henPos[k * 3] = f.x + Math.sin(t * 0.15 + ph) * 2.2 + Math.sin(t * 0.4 + ph * 2) * 0.4;
          henPos[k * 3 + 1] = 0.3 + Math.max(0, Math.sin(t * 3.1 + ph * 3)) * 0.05;
          henPos[k * 3 + 2] = f.z + Math.cos(t * 0.12 + ph * 1.3) * 2.0;
        }
      });
      henGeo.attributes.position.needsUpdate = true;
    }
    flies.visible = patches.some((f) => Math.abs(f.x - px) < 60 && Math.abs(f.z - pz) < 60);
    if (flies.visible) {
      let k = 0;
      patches.forEach((f, fi) => {
        for (let i = 0; i < f.n; i++, k++) {
          const ph = fi * 5 + i * 1.7;
          flyPos[k * 3] = f.x + Math.sin(t * 0.3 + ph) * 7 + Math.sin(t * 1.1 + ph * 2) * 0.6;
          flyPos[k * 3 + 1] = 1.1 + Math.sin(t * 2.2 + ph) * 0.35 + (i % 3) * 0.3;
          flyPos[k * 3 + 2] = f.z + Math.cos(t * 0.25 + ph * 1.4) * 6 + Math.cos(t * 1.3 + ph) * 0.6;
        }
      });
      flyGeo.attributes.position.needsUpdate = true;
    }
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
