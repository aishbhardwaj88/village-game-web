import * as THREE from 'three';
import { CELL, CELL_REPEAT } from './housesMaterial.js';

/**
 * Geometry builder for the house kit (S7 sprint). Every part is real geometry in metres; UVs are tile coordinates taken
 * from the local position on the face's own plane (so a wall made of several pieces keeps one continuous brick bond, and
 * a taller house is more courses, never stretched ones). Attributes: position, normal, uv, color, aCellPaint (cell, paint).
 */
export class GB {
  constructor() {
    this.pos = []; this.nor = []; this.uv = []; this.col = []; this.cp = []; this.idx = [];
    this.m = null; // optional placement: { c, s, x, y, z } yaw cos/sin + offset, applied to positions and normals
  }
  setXf(x = 0, y = 0, z = 0, yaw = 0) { this.m = { c: Math.cos(yaw), s: Math.sin(yaw), x, y, z }; }
  clearXf() { this.m = null; }
  _p(p) { if (!this.m) return p; const { c, s, x, y, z } = this.m; return [x + p[0] * c + p[2] * s, y + p[1], z - p[0] * s + p[2] * c]; }
  _n(n) { if (!this.m) return n; const { c, s } = this.m; return [n[0] * c + n[2] * s, n[1], -n[0] * s + n[2] * c]; }

  /** Planar quad a-b-c-d (counter-clockwise seen from the front). o: { cell, paint, col:[r,g,b] or number, uvOff:[u,v] } */
  quad(a, b, c, d, o) {
    a = this._p(a); b = this._p(b); c = this._p(c); d = this._p(d);
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
    let n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
    const l = Math.hypot(n[0], n[1], n[2]) || 1;
    n = [n[0] / l, n[1] / l, n[2] / l];
    const base = this.pos.length / 3;
    const cell = o.cell ?? CELL.plaster, rep = o.rep ?? CELL_REPEAT[cell];
    const col = typeof o.col === 'number' ? [o.col, o.col, o.col] : o.col || [1, 1, 1];
    const uvOf = (p) => {
      // project on the plane's own axes: vertical faces (u along the face, v = height), flat faces (u = x, v = z)
      let u, v;
      if (Math.abs(n[1]) > 0.7) { u = p[0]; v = n[1] > 0 ? -p[2] : p[2]; }
      else { const hx = n[2], hz = -n[0], hl = Math.hypot(hx, hz) || 1; u = (p[0] * hx + p[2] * hz) / hl; v = p[1]; if (o.slopeV) v = p[1] * o.slopeV; }
      if (o.uvRot) { const t = u; u = v; v = -t; }
      return [u * rep + (o.uvOff ? o.uvOff[0] : 0), v * rep + (o.uvOff ? o.uvOff[1] : 0)];
    };
    [a, b, c, d].forEach((p, k) => {
      this.pos.push(p[0], p[1], p[2]); this.nor.push(n[0], n[1], n[2]);
      const t = o.uvs ? [o.uvs[k][0] * rep, o.uvs[k][1] * rep] : uvOf(p); this.uv.push(t[0], t[1]);
      this.col.push(col[0], col[1], col[2]); this.cp.push(cell, o.paint || 0);
    });
    this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    if (o.double) this.quad(d, c, b, a, { ...o, double: false });
  }

  /** Axis-aligned box. o.skip: string of faces to leave out ('nx px ny py nz pz'). o.colTop/colSide override per face group. */
  box(x0, x1, y0, y1, z0, z1, o = {}) {
    const sk = o.skip || '';
    const f = (name, a, b, c, d, extra) => { if (!sk.includes(name)) this.quad(a, b, c, d, { ...o, ...extra }); };
    const side = o.colSide ? { col: o.colSide } : {};
    f('pz', [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], side);
    f('nz', [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], side);
    f('px', [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], side);
    f('nx', [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], side);
    f('py', [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], o.colTop ? { col: o.colTop } : {});
    f('ny', [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], o.colBot ? { col: o.colBot } : {});
  }

  /** Vertical cylinder / lathe. profile: [[r, y], ...] bottom to top. seg sides. Caps optional. */
  lathe(cx, cz, profile, seg, o = {}) {
    for (let k = 0; k < seg; k++) {
      const a0 = (k / seg) * Math.PI * 2, a1 = ((k + 1) / seg) * Math.PI * 2;
      for (let j = 0; j + 1 < profile.length; j++) {
        const [r0, y0] = profile[j], [r1, y1] = profile[j + 1];
        if (r0 < 1e-4 && r1 < 1e-4) continue;
        const P = (r, y, a) => [cx + Math.sin(a) * r, y, cz + Math.cos(a) * r];
        const rm = Math.max(r0, r1, 0.05);
        const uvs = [[a0 * rm, y0], [a1 * rm, y0], [a1 * rm, y1], [a0 * rm, y1]];
        this.quad(P(r0, y0, a0), P(r0, y0, a1), P(r1, y1, a1), P(r1, y1, a0), { ...o, uvs });
      }
    }
    if (o.capTop) { const [r, y] = profile[profile.length - 1]; this.disc(cx, y, cz, r, seg, 1, o); }
    if (o.capBot) { const [r, y] = profile[0]; this.disc(cx, y, cz, r, seg, -1, o); }
  }
  disc(cx, y, cz, r, seg, up, o) {
    for (let k = 0; k < seg; k += 2) {
      const P = (kk) => { const a = (kk / seg) * Math.PI * 2; return [cx + Math.sin(a) * r, y, cz + Math.cos(a) * r]; };
      const c = [cx, y, cz];
      if (up > 0) this.quad(c, P(k), P(k + 1), P(k + 2), o); else this.quad(c, P(k + 2), P(k + 1), P(k), o);
    }
  }
  /** A thin bar between two points (square section `t`), for grilles, railings, bicycle tubes. */
  bar(a, b, t, o) {
    const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(...d);
    const dir = d.map((v) => v / L);
    let up = Math.abs(dir[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const cr = (p, q) => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
    let s1 = cr(dir, up); const l1 = Math.hypot(...s1); s1 = s1.map((v) => (v / l1) * t / 2);
    let s2 = cr(dir, s1); const l2 = Math.hypot(...s2); s2 = s2.map((v) => (v / l2) * t / 2);
    const P = (p, i, j) => [p[0] + s1[0] * i + s2[0] * j, p[1] + s1[1] * i + s2[1] * j, p[2] + s1[2] * i + s2[2] * j];
    const corners = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
    for (let k = 0; k < 4; k++) {
      const [i0, j0] = corners[k], [i1, j1] = corners[(k + 1) % 4];
      this.quad(P(a, i0, j0), P(a, i1, j1), P(b, i1, j1), P(b, i0, j0), o);
    }
  }

  get vertexCount() { return this.pos.length / 3; }
  get triangleCount() { return this.idx.length / 3; }

  toGeometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    // compact types (28 bytes a vertex instead of 52): normals as signed bytes, colours as bytes, cell/paint as small integers
    g.setAttribute('normal', new THREE.BufferAttribute(Int8Array.from(this.nor, (v) => Math.round(Math.max(-1, Math.min(1, v)) * 127)), 3, true));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.BufferAttribute(Uint8Array.from(this.col, (v) => Math.round(Math.max(0, Math.min(1, v)) * 255)), 3, true));
    g.setAttribute('aCellPaint', new THREE.BufferAttribute(Uint8Array.from(this.cp), 2, false));
    g.setIndex(this.pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(this.idx, 1) : new THREE.Uint16BufferAttribute(this.idx, 1));
    g.computeBoundingBox();
    g.computeBoundingSphere();
    return g;
  }
}
