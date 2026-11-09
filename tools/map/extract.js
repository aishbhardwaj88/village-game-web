window.__ex = (() => {
  const d = window.__dopahar, zm = d.zoneManager;
  const zoneOf = new Map(); for (const z of zm.zones.values()) if (z.group) zoneOf.set(z.group, z.name);
  const r1 = (v) => Math.round(v * 10) / 10;
  const hull = (pts) => { if (pts.length < 3) return pts; pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); const lo = [], up = []; for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); } for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); } up.pop(); lo.pop(); return lo.concat(up); };
  const area = (p) => { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; } return Math.abs(a) / 2; };
  const mul = (a, b) => { const ae = a.elements, be = b.elements, out = a.clone(), te = out.elements; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += ae[i + k * 4] * be[k + j * 4]; te[i + j * 4] = s; } return out; };
  const labelOf = (o) => { let zone = null, names = []; for (let p = o; p; p = p.parent) { if (zoneOf.has(p)) { zone = zoneOf.get(p); break; } if (p.name && names.length < 3 && !/^(Scene|group|Group|mesh)?$/.test(p.name)) names.push(p.name); } return { zone, path: names.reverse().join('/') }; };
  const out = [], flats = [];
  const stats = { meshes: 0, verts: 0, comps: 0, flatTris: 0, skipped: 0 };
  const SKIP = /^(sky|ground)$/;
  // world-space vertices of a geometry (optionally a sub-range for BatchedMesh)
  function emit(o, g, m, start, count, kind) {
    const pos = g.attributes.position; if (!pos) return;
    const idx = g.index;
    const e = m.elements;
    const lab = labelOf(o);
    const mat = Array.isArray(o.material) ? o.material[0] : o.material;
    let col = null; try { col = mat && mat.color ? mat.color.getHexString() : null; } catch (er) {}
    const mn = (mat && mat.name) || '';
    const nTri = Math.floor((idx ? (count ?? idx.count) : (count ?? pos.count)) / 3);
    const vi = (t) => idx ? idx.getX(t) : t;
    const s0 = start || 0;
    // collect used vertex ids, world positions
    const W = new Map();
    const wp = (v) => { let r = W.get(v); if (!r) { const x = pos.getX(v), y = pos.getY(v), z = pos.getZ(v); r = [e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]]; W.set(v, r); } return r; };
    // union-find on quantised position keys so non-indexed pieces still join
    const key = new Map(); const par = [];
    const find = (a) => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
    const kid = (v) => { const p = wp(v); const k = Math.round(p[0] * 50) + ',' + Math.round(p[1] * 50) + ',' + Math.round(p[2] * 50); let id = key.get(k); if (id === undefined) { id = par.length; par.push(id); key.set(k, id); } return id; };
    const triK = new Int32Array(nTri * 3);
    for (let t = 0; t < nTri; t++) {
      const a = kid(vi(s0 + t * 3)), b = kid(vi(s0 + t * 3 + 1)), c = kid(vi(s0 + t * 3 + 2));
      triK[t * 3] = a; triK[t * 3 + 1] = b; triK[t * 3 + 2] = c;
      const ra = find(a), rb = find(b), rc = find(c); par[rb] = ra; par[find(rc)] = ra;
    }
    stats.verts += W.size;
    const comps = new Map();
    for (let t = 0; t < nTri; t++) {
      const r = find(triK[t * 3]);
      let cpt = comps.get(r); if (!cpt) { cpt = { tris: [] }; comps.set(r, cpt); }
      cpt.tris.push(t);
    }
    for (const cpt of comps.values()) {
      const pts = []; let y0 = Infinity, y1 = -Infinity;
      for (const t of cpt.tris) for (let k = 0; k < 3; k++) { const p = wp(vi(s0 + t * 3 + k)); pts.push([r1(p[0]), r1(p[2])]); if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
      const h = hull(pts); const A = area(h);
      const xs = h.map(p => p[0]), zs = h.map(p => p[1]);
      if (Math.max(...xs) - Math.min(...xs) < 0.2 && Math.max(...zs) - Math.min(...zs) < 0.2) { stats.skipped++; continue; }
      stats.comps++;
      if (A > 150 && (y1 - y0) < 1.0) {
        // big flat thing (road strip, field, pond, threshing floor): keep its real triangles, not a hull
        const tri = []; for (const t of cpt.tris) { const a = wp(vi(s0 + t * 3)), b = wp(vi(s0 + t * 3 + 1)), c = wp(vi(s0 + t * 3 + 2)); const ar = Math.abs((b[0] - a[0]) * (c[2] - a[2]) - (c[0] - a[0]) * (b[2] - a[2])); if (ar < 0.02) continue; tri.push(r1(a[0]), r1(a[2]), r1(b[0]), r1(b[2]), r1(c[0]), r1(c[2])); }
        stats.flatTris += tri.length / 6;
        flats.push({ z: lab.zone, p: lab.path, mn, c: col, y: r1(y1), tri });
      } else {
        out.push({ z: lab.zone, p: lab.path, mn, c: col, k: kind, y0: r1(y0), y1: r1(y1), poly: h });
      }
    }
  }
  d.scene.updateMatrixWorld(true);
  const list = [];
  d.scene.traverse((o) => { if (o.isMesh && !o.isSkinnedMesh && o.geometry && !SKIP.test(o.name)) list.push(o); });
  function one(o) {
    stats.meshes++;
    const g = o.geometry;
    try {
      if (o.isBatchedMesh) {
        const n = o.instanceCount ?? 0; const M = o.matrixWorld.clone();
        for (let i = 0; i < n; i++) {
          try {
            const gid = o.getGeometryIdAt(i); if (gid == null || gid < 0) continue;
            const info = o._geometryInfo && o._geometryInfo[gid];
            o.getMatrixAt(i, M);
            if (info) emit(o, g, mul(o.matrixWorld, M), info.indexStart ?? info.start ?? 0, info.indexCount ?? info.count, 'batch');
          } catch (er) {}
        }
      } else if (o.isInstancedMesh) {
        const M = o.matrixWorld.clone();
        for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, M); emit(o, g, mul(o.matrixWorld, M), 0, undefined, 'inst'); }
      } else emit(o, g, o.matrixWorld, 0, undefined, 'mesh');
    } catch (er) { stats.err = (stats.err || 0) + 1; }
  }
  return {
    n: list.length,
    info: (i) => { const o = list[i]; const g = o.geometry; return [o.name, o.isBatchedMesh ? 'B' : o.isInstancedMesh ? 'I' : 'M', g.attributes.position ? g.attributes.position.count : 0, o.count || o.instanceCount || 1]; },
    run: (i0, i1) => { out.length = 0; flats.length = 0; for (let i = i0; i < Math.min(i1, list.length); i++) one(list[i]); return { items: out.slice(), flats: flats.slice() }; },
    meta: () => {
      const anchors = {}; for (const [k, v] of Object.entries(d.ANCHORS)) anchors[k] = { x: r1(v.x), z: r1(v.z), ry: v.ry ?? 0 };
      let places = []; try { places = (d.places || []).map(p => ({ id: p.id, name: p.name || p.label || p.title, x: r1(p.x), z: r1(p.z), raw: Object.keys(p).join(',') })); } catch (er) {}
      const colliders = d.getStaticColliders().map(b => [r1(b.minX), r1(b.minZ), r1(b.maxX), r1(b.maxZ), b.auto ? 1 : 0, b.src || '']);
      const zones = [...zm.zones.values()].map(z => ({ name: z.name, x: r1(z.x), z: r1(z.z), r: z.buildRadius }));
      return { stats, anchors, places, colliders, zones, footprints: d.getBuildingFootprints() };
    },
  };
})(); window.__ex.n
