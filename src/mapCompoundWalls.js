import { onNewRoad } from './layout/roadClear.js';
// Roadside places' front walls with their gate gaps, map metres; world x = map x + 600.
// 27 Nov: re-anchored to the 25 Nov approved map (docs/layout/approved-map-2026-11-25.json). The original
// 1-Nov-plan wall shapes were never moved when their places moved to final position (found by comparing wall
// centroid to each existing place's `before`/new x,z: drift was 7-150 m, e.g. Health centre 144 m, General
// store 95 m). Fix: for every wall whose place has `before` data, rotate by angle(before.front -> front) about
// that place and translate before -> new (the same recipe the map JSON itself documents for moving a place) -
// this keeps the wall's shape and its gate gaps, just carries it to where its place now stands. "Small shrine"
// is removed outright (CLAUDE.md "NO STANDALONE SHRINES", 7 Nov order - that place no longer exists). "Tea
// stall at the square" has no confident match in the 25 Nov map (not the same as id `teastall`) and is left at
// its old, un-moved position - asked her in NEEDS_YOU.md. The gher and goods-yard walls are part of their own
// yard models and are left out.
export const MAP_COMPOUND_WALLS = [{"name":"Bus stop","lines":[[[-93.68,-106.37],[-93.68,-104.97],[-84.88,-104.9]],[[-82.48,-104.8],[-73.68,-104.73],[-73.68,-106.13]]]},{"name":"Tyre repair shop","lines":[[[-49.89,-109.79],[-49.88,-106.29],[-47.08,-106.3]],[[-44.68,-106.3],[-41.88,-106.21],[-41.79,-109.71]]]},{"name":"Truck weighbridge","lines":[[[23.91,-103.37],[23.82,-99.87],[32.62,-99.8]],[[35.02,-99.7],[43.82,-99.63],[43.91,-103.13]]]},{"name":"Petrol pump","lines":[[[-98.08,-100.34],[-98.08,-99.54],[-111.98,-99.7]],[[-114.28,-99.8],[-128.18,-99.95],[-128.18,-100.75]]]},{"name":"Wholesale grain market","lines":[[[-65.92,-152.27],[-66.02,-148.77],[-83.32,-149.07]],[[-85.72,-149.07],[-103.02,-149.37],[-103.02,-152.87]]]},{"name":"Brick kiln","lines":[[[111.64,-154.13],[111.54,-150.63],[72.84,-151.33]],[[70.44,-151.33],[35.24,-151.93]]]},{"name":"Mosque","lines":[[[-152.42,-118.21],[-148.92,-118.16],[-148.98,-114.06]],[[-149.02,-111.66],[-149.09,-107.56],[-152.59,-107.61]]]},{"name":"Old mansion (haveli)","lines":[[[67.88,-19.88],[71.39,-19.64],[72.52,-34.4]],[[72.72,-36.72],[73.95,-51.49],[70.43,-51.83]]]},{"name":"Village council office","lines":[[[-58.3,33.95],[-58.5,37.46],[-52.18,37.77]],[[-49.78,37.99],[-43.56,38.31],[-43.37,34.8]]]},{"name":"Tea stall","lines":[[[-7.48,9.11],[-5.38,11.92],[-4.71,11.47]],[[-2.79,10.02],[-2.12,9.57],[-4.22,6.75]]]},{"name":"Post office","lines":[[[-39.78,59.81],[-40.37,56.31],[-43.17,56.9]],[[-45.47,57.29],[-48.27,57.88],[-47.59,61.28]]]},{"name":"General store","lines":[[[14.44,-111.97],[11.14,-113.16],[11.29,-113.74]],[[12.1,-116.01],[12.33,-116.46],[15.63,-115.27]]]},{"name":"Health centre","lines":[[[-8.07,52.84],[-4.63,52.17],[-4.09,54.91]],[[-3.62,57.27],[-3.1,59.92],[-6.53,60.59]]]},{"name":"Village TV house","lines":[[[31.84,-1.59],[31.85,-5.01],[36.66,-5.02]],[[39.07,-5.03],[43.89,-5.05],[43.89,-1.54]]]},{"name":"Flour mill","lines":[[[-12.19,-41.94],[-15.34,-40.38],[-16.11,-42.02]],[[-17.18,-44.18],[-17.94,-45.82],[-14.88,-47.33]]]},{"name":"Sikh temple","lines":[[[-149.54,101.14],[-149.6,104.64],[-153.9,104.59]],[[-156.3,104.61],[-160.6,104.56],[-160.54,101.06]]]},{"name":"Tubewell and pump room","lines":[[[116.9,-0.33],[116.9,-3.84],[112.08,-3.83]],[[109.67,-3.82],[104.95,-3.81],[104.96,-0.3]]]},{"name":"Jain temple","lines":[[[184.64,98.16],[188.14,98.11],[188.19,101.71]],[[188.21,104.11],[188.26,107.71],[184.76,107.76]]]},{"name":"Tea stall at the square","lines":[[[39.9,0.9],[43.4,1.2],[43.3,3]],[[43.1,5.3],[42.9,7.1],[39.4,6.8]]]},{"name":"Sweet shop (halwai)","lines":[[[17.52,4.79],[20.18,7.09],[19.45,7.92]],[[17.88,9.74],[17.21,10.49],[14.55,8.19]]]},{"name":"Jalebi stall","lines":[[[19.8,27.22],[22.85,28.97],[22.38,29.75]],[[21.18,31.84],[20.71,32.61],[17.67,30.86]]]},{"name":"Soda drink stall","lines":[[[16.43,11.24],[19.59,9.7],[19.95,10.3]],[[20.92,12.51],[21.28,13.11],[18.13,14.65]]]},{"name":"Creche and preschool (anganwadi)","lines":[[[-30.3,91.3],[-31,87.9],[-26.9,87.1]],[[-24.6,86.6],[-20.6,85.8],[-19.9,89.3]]]}];

/** One zone's worth of walls for a MAP_COMPOUND_WALLS entry: the existing boundary-wall look, plus ~2 m collider boxes along every run. */
export function createMapCompoundWall(entry, createBoundaryWall, THREE) {
  const pts = entry.lines.flat().map(([x, z]) => ({ x: x + 600, z }));
  const c = { x: pts.reduce((s, p) => s + p.x, 0) / pts.length, z: pts.reduce((s, p) => s + p.z, 0) / pts.length };
  const runs = [], boxes = [];
  for (const line of entry.lines) {
    for (let i = 0; i + 1 < line.length; i++) {
      const a = { x: line[i][0] + 600, z: line[i][1] }, b = { x: line[i + 1][0] + 600, z: line[i + 1][1] };
      { // 26 Nov: no object on a road. A run of the old 1 Nov wall set that crosses a new road band is dropped (new layout only)
        const Ln = Math.hypot(b.x - a.x, b.z - a.z); let hit = false;
        for (let d = 0; d <= Ln && !hit; d += 1.5) hit = onNewRoad(a.x + (b.x - a.x) * d / (Ln || 1), a.z + (b.z - a.z) * d / (Ln || 1), 0.4);
        if (hit || onNewRoad(b.x, b.z, 0.4)) continue;
      }
      runs.push({ a, b });
      const nearAxis = Math.min(Math.abs(b.x - a.x), Math.abs(b.z - a.z)) <= 1.2; // gently sloped run: one box, no staggered 2 m nubs
      const n = nearAxis ? 1 : Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 2));
      for (let k = 0; k < n; k++) {
        const x0 = a.x + (b.x - a.x) * k / n, x1 = a.x + (b.x - a.x) * (k + 1) / n, z0 = a.z + (b.z - a.z) * k / n, z1 = a.z + (b.z - a.z) * (k + 1) / n;
        const alongX = Math.abs(b.x - a.x) >= Math.abs(b.z - a.z); // pad across the wall only, so neighbouring chunks butt instead of overlapping
        boxes.push({ minX: Math.min(x0, x1) - (alongX ? 0 : 0.15), maxX: Math.max(x0, x1) + (alongX ? 0 : 0.15), minZ: Math.min(z0, z1) - (alongX ? 0.15 : 0), maxZ: Math.max(z0, z1) + (alongX ? 0.15 : 0) });
      }
    }
  }
  for (let i = boxes.length - 1; i >= 0; i--) { boxes[i].maxX = Math.min(boxes[i].maxX, 879.4); if (boxes[i].maxX <= boxes[i].minX) boxes.splice(i, 1); } // safety clamp: the world ends at x 880
  const group = createBoundaryWall(c, 'map_wall', runs, []);
  const carrier = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial());
  carrier.visible = false;
  carrier.userData.colliderBoxes = boxes;
  group.add(carrier);
  return { group, centre: c };
}
