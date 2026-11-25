import * as THREE from 'three';
import { drawBilingual } from '../signPaint.js';
import { getTiledMaterial } from '../materials.js';
import { whenGateOpen } from './lateBuild.js';
import { isNewLayout } from '../layout/layout.js';
import { roadEmptySlide } from '../mapRoads.js';

/** 25 Nov, her order (ROADS MUST BE EMPTY): a sign whose posts or board come within 0.3 m of the drawn road edge slides back along its own
 *  front axis (away from the road) by the smallest distance that clears it, up to ROAD_EMPTY_MAX_SLIDE. Where no slide clears, it is removed
 *  (set ROAD_EMPTY_REMOVE false to build it where the map has it). Every slide is on window.__s7mapsigns.roadEmpty. */
const ROAD_EMPTY_MAX_SLIDE = 3;
const ROAD_EMPTY_REMOVE = true;

/**
 * The 115 `new_sign` signboards of the approved map (26 Nov). Each is a painted board on two posts at its map footprint
 * (width = rect.w, posts 0..3.2 m = the map's y0/y1), facing rect.front. Boards of all signs: ONE merged mesh, ONE shared
 * atlas (one cell per sign, painted with signPaint.drawBilingual: Hindi bold larger on top, English smaller below, one dark
 * paint on a pale board, CLAUDE.md section 7). Posts: ONE merged mesh on the library 'wood' set. 2 draw calls in total.
 * Builds after the Play gate (a few seconds after boot, not tracked), so nothing here is in the Play download or gate.
 */
const HI = {
  'Village bank': 'ग्राम बैंक', 'Cycle and puncture repair': 'साइकिल पंचर मरम्मत', 'Utensils': 'बर्तन भंडार', 'Photo studio': 'फोटो स्टूडियो',
  'Sweet shop': 'मिठाई की दुकान', 'Medical store': 'मेडिकल स्टोर', 'Saree shop': 'साड़ी की दुकान', 'Watch repair': 'घड़ी मरम्मत', 'Snacks': 'नाश्ता भंडार',
  'Mobile and recharge': 'मोबाइल और रिचार्ज', 'Electrical': 'बिजली की दुकान', 'Cloth house': 'कपड़ा भवन', 'Tailor': 'दर्ज़ी', 'Optician': 'चश्मा घर',
  'Tea and biscuits': 'चाय बिस्कुट', 'Stationery': 'स्टेशनरी', 'Mobile accessories': 'मोबाइल सामान', 'Bakery': 'बेकरी', 'Namkeen and biscuits': 'नमकीन बिस्कुट',
  'Footwear': 'जूते चप्पल', 'Plastic goods': 'प्लास्टिक सामान', 'Book depot': 'पुस्तक भंडार', 'Dry fruits': 'मेवा भंडार', 'Fertiliser and seeds': 'खाद बीज भंडार',
  "Doctor's clinic": 'डॉक्टर का क्लिनिक', 'Gas cylinder godown': 'गैस सिलेंडर गोदाम', 'Dhaba': 'ढाबा', 'Tractor repair': 'ट्रैक्टर मरम्मत',
  "Blacksmith's workshop": 'लोहार की कार्यशाला', 'Grocery': 'किराना', 'Mobile': 'मोबाइल', 'Seeds': 'बीज भंडार', 'Library and reading room': 'पुस्तकालय और वाचनालय',
  'Toy shop': 'खिलौने की दुकान', 'Sweets and namkeen': 'मिठाई और नमकीन', 'Kirana': 'किराना', 'Steel utensils': 'स्टील के बर्तन', 'Shoe shop': 'जूतों की दुकान',
  'Bangles': 'चूड़ियाँ', 'Jeweller': 'सुनार', 'Spices': 'मसाले', 'Readymade clothes': 'तैयार कपड़े', 'Lassi and milk': 'लस्सी और दूध', 'Mithai': 'मिठाई',
  'Bag shop': 'बैग की दुकान', 'Watch and clock': 'घड़ी की दुकान', 'Mobile covers': 'मोबाइल कवर', 'Cosmetics': 'सौंदर्य सामान', 'Pooja items': 'पूजा सामग्री',
  'Kites and toys': 'पतंग और खिलौने', 'Pickles and papad': 'अचार और पापड़', 'Gift shop': 'उपहार की दुकान', 'Cloth shop': 'कपड़े की दुकान',
  'Bangles and cosmetics': 'चूड़ी और सिंगार', 'Beauty parlour': 'ब्यूटी पार्लर', 'Mobile shop': 'मोबाइल की दुकान', 'Electrical and mobile repair': 'बिजली और मोबाइल मरम्मत',
  'Barber shop': 'नाई की दुकान', 'Hardware and paint': 'हार्डवेयर और रंग', 'Dairy booth': 'दूध डेयरी', 'Stationery and xerox': 'स्टेशनरी और फोटोकॉपी',
  'Chemist (health centre)': 'दवा की दुकान', 'Tea stall': 'चाय की दुकान', "Farmers' cooperative and godown": 'किसान सहकारी समिति और गोदाम',
  'Milk collection point': 'दूध संग्रह केंद्र', 'Animal hospital': 'पशु चिकित्सालय', 'Wedding and community hall': 'विवाह और सामुदायिक भवन',
  "Carpenter's workshop": 'बढ़ई की कार्यशाला', 'Books and uniforms': 'किताबें और वर्दी', 'Samosa and snacks': 'समोसा और नाश्ता',
  'Mobile recharge and photocopy': 'मोबाइल रिचार्ज और फोटोकॉपी', 'Cyber cafe': 'साइबर कैफ़े', 'Tent and wedding lights': 'टेंट और विवाह सजावट',
  'Jaggery making unit': 'गुड़ बनाने की इकाई', 'Cloth': 'कपड़ा', 'General store': 'जनरल स्टोर', 'Cycle repair': 'साइकिल मरम्मत', 'Chemist': 'दवा की दुकान',
  'Electrical repair': 'बिजली मरम्मत', 'Crockery': 'काँच और चीनी के बर्तन', 'Amrai Kheda railway station': 'अमराई खेड़ा रेलवे स्टेशन',
};
const EN_FIX = { 'Amrai Kheda railway station': 'Amrai Khera railway station', 'Chemist (health centre)': 'Chemist, health centre' };
const CELL_H = 128;

export async function initMapSigns(scene, mapData) {
  if (typeof window === 'undefined' || !isNewLayout()) return null;
  await whenGateOpen();
  await new Promise((r) => setTimeout(r, 2500)); // after the Play gate, well clear of the first frames
  const data = mapData || (await import('../layout/mapData.json')).default;
  const signs = data.objects.filter((o) => o.prefix === 'new_sign' && o.rect).map((o) => ({ en: o.name.replace(/^Signboard:\s*/, ''), o }));
  const skipped = [];
  const items = [], roadEmpty = [];
  for (const s of signs) {
    const hi = HI[s.en];
    if (!hi) { skipped.push(s.en); continue; }
    const w = s.o.rect.w, bh = Math.min(1.25, Math.max(0.8, w / 3.6));
    // removed 25 Nov: stood on road, her order (only when no slide clears; see ROAD_EMPTY_REMOVE)
    const r0 = s.o.rect, yaw0 = Math.atan2(r0.front[0], r0.front[1]), fx0 = Math.sin(yaw0), fz0 = Math.cos(yaw0), tx0 = fz0, tz0 = -fx0;
    const probes = [-1, -0.5, 0, 0.5, 1].map((k) => [r0.cx + tx0 * k * (w / 2 - 0.12), r0.cz + tz0 * k * (w / 2 - 0.12)]);
    let slide = roadEmptySlide(probes, fx0, fz0, ROAD_EMPTY_MAX_SLIDE, 0.6), side = 0;
    // 25 Nov (her order: move, never delete): the Crockery board (#114) sits between the cross road and the inner lane, so no slide along its own
    // front axis clears both. It is also slid sideways (along its board, away from the lane) by the smallest distance that clears, then back from the road.
    if (slide === null && s.o.id === 'new_sign#114') {
      for (let m = 0.05; m <= 3 && slide === null; m += 0.05) {
        const sl = roadEmptySlide(probes.map(([px, pz]) => [px + tx0 * m, pz + tz0 * m]), fx0, fz0, ROAD_EMPTY_MAX_SLIDE, 0.6);
        if (sl !== null) { slide = sl; side = m; }
      }
    }
    if (slide === null) { roadEmpty.push({ id: s.o.id, en: s.en, x: +r0.cx.toFixed(2), z: +r0.cz.toFixed(2), removed: true }); if (ROAD_EMPTY_REMOVE) continue; }
    const r = (slide || side) ? { ...r0, cx: r0.cx + fx0 * slide + tx0 * side, cz: r0.cz + fz0 * slide + tz0 * side } : r0;
    if (slide || side) roadEmpty.push({ id: s.o.id, en: s.en, from: [+r0.cx.toFixed(2), +r0.cz.toFixed(2)], to: [+r.cx.toFixed(2), +r.cz.toFixed(2)], slide: +slide.toFixed(2), side: +side.toFixed(2) });
    items.push({ ...s, hi, en: EN_FIX[s.en] || s.en, w, bh, cw: Math.round(CELL_H * w / bh), r });
  }
  // shelf-pack the cells into one atlas
  const AW = 4096; let x = 0, y = 0;
  for (const it of items) { if (x + it.cw > AW) { x = 0; y += CELL_H; } it.ax = x; it.ay = y; x += it.cw; }
  let AH = 256; while (AH < y + CELL_H) AH *= 2;
  const cv = document.createElement('canvas'); cv.width = AW; cv.height = AH;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const paint = () => {
    const g = cv.getContext('2d');
    g.fillStyle = '#d9cfae'; g.fillRect(0, 0, AW, AH); // also the blank paint the board's edges and back sample
    for (const it of items) {
      g.fillStyle = '#e8dfc2'; g.fillRect(it.ax, it.ay, it.cw, CELL_H);
      g.strokeStyle = '#3a2a22'; g.lineWidth = 4; g.strokeRect(it.ax + 5, it.ay + 5, it.cw - 10, CELL_H - 10);
      drawBilingual(g, it.hi, it.en, { x: it.ax + it.cw / 2, y: it.ay + 10, w: it.cw - 36, h: CELL_H - 20, fg: '#2a1f1a', fillFraction: 0.92 });
    }
    tex.needsUpdate = true;
  };
  paint();
  if (document.fonts) document.fonts.load('700 40px "Noto Sans Devanagari"').then(() => { paint(); }, () => {});
  const boardMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, metalness: 0.03 }); boardMat.name = 's7_map_signs_atlas';

  const bPos = [], bUv = [], bNor = [], bIdx = [], pPos = [], pUv = [], pNor = [], pIdx = [], colliders = [];
  const box = (P, U, N, I, hw, hh, hd, cx, cy, cz, yaw, uvOf) => {
    const g = new THREE.BoxGeometry(hw * 2, hh * 2, hd * 2);
    const m = new THREE.Matrix4().makeRotationY(yaw).setPosition(cx, cy, cz);
    g.applyMatrix4(m);
    const base = P.length / 3, p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) { P.push(p.getX(i), p.getY(i), p.getZ(i)); N.push(n.getX(i), n.getY(i), n.getZ(i)); const t = uvOf(i, p, n, uv); U.push(t[0], t[1]); }
    for (const k of g.index.array) I.push(base + k);
    g.dispose();
  };
  let tris = 0;
  for (const it of items) {
    const r = it.r, yaw = Math.atan2(r.front[0], r.front[1]);
    const fx = Math.sin(yaw), fz = Math.cos(yaw), tx = fz, tz = -fx; // front and tangent (board width) in world
    const bt = 3.05, bcy = bt - it.bh / 2, depthC = 0.1;
    const cx = r.cx + fx * depthC, cz = r.cz + fz * depthC;
    const u0 = (it.ax + 3) / AW, u1 = (it.ax + it.cw - 3) / AW, v1 = 1 - (it.ay + 3) / AH, v0 = 1 - (it.ay + CELL_H - 3) / AH;
    const blank = [(AW - 8) / AW, 1 - (AH - 8) / AH];
    // BoxGeometry face order: +x,-x,+y,-y,+z,-z (4 verts each); +z is the front, painted; the rest sample the blank paint
    box(bPos, bUv, bNor, bIdx, it.w / 2, it.bh / 2, 0.035, cx, bcy, cz, yaw, (i, p, n, uv) => {
      if (i >= 16 && i < 20) return [u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0)];
      return blank;
    });
    const ph = 0.07;
    for (const s of [-1, 1]) {
      const px = r.cx + tx * s * (it.w / 2 - 0.12), pz = r.cz + tz * s * (it.w / 2 - 0.12);
      box(pPos, pUv, pNor, pIdx, ph, 1.6, ph, px, 1.6, pz, yaw, (i, p, n) => (Math.abs(n.getX(i)) > Math.abs(n.getZ(i)) ? [p.getZ(i), p.getY(i)] : [p.getX(i), p.getY(i)]));
      colliders.push({ minX: px - 0.1, maxX: px + 0.1, minZ: pz - 0.1, maxZ: pz + 0.1 });
    }
    tris += 36;
  }
  const mk = (P, U, N, I, mat, name) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
    g.setIndex(I); g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat); m.name = name; m.castShadow = false; m.receiveShadow = true; m.userData.noAutoCollider = true; return m;
  };
  const group = new THREE.Group(); group.name = 's7_map_signs';
  const boards = mk(bPos, bUv, bNor, bIdx, boardMat, 's7_map_signs_boards');
  const postMat = getTiledMaterial('wood', { tint: '#5a4636', roughness: 0.95 });
  const posts = mk(pPos, pUv, pNor, pIdx, postMat, 's7_map_signs_posts');
  posts.userData.colliderBoxes = colliders;
  group.add(boards, posts);
  scene.add(group);
  const report = { built: items.length, skipped, drawCalls: 2, triangles: tris, atlas: [AW, AH], colliders: colliders.length, roadEmpty };
  window.__s7mapsigns = report;
  return { group, report };
}
