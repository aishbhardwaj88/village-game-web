import * as THREE from 'three';
import { drawBilingual } from '../signPaint.js';

/**
 * ONE sign atlas for every new shop, shop-house, kiosk and cart board (?layout=new).
 * 2048 px wide, 4 columns, painted with the shared signPaint rule: Hindi bold on top, English below, one dark
 * paint colour. One material, one texture: every board in the kit is merged into ONE mesh, ONE draw call.
 *
 * S7 (22 Nov), her second pass on this: colour alone was not variety ("the boards all look the same shape,
 * some should be thin, some thick, some more height, some less, some text on the left with a picture, some on
 * the right, some centred"). So besides SCHEMES (paint colours) a board now also gets a SHAPE (its own row
 * height, so the built board is physically shorter/taller, not just repainted the same box) and a LAYOUT
 * (centred text, or text pushed to one side with a small painted pictogram of the trade on the other) - see
 * SHAPES and layoutFor() below.
 */

export const HINDI = {
  'Aloo tikki': 'आलू टिक्की', 'Animal hospital': 'पशु चिकित्सालय', 'Bag shop': 'बैग की दुकान', 'Bakery': 'बेकरी',
  'Bangles': 'चूड़ी भंडार', 'Bangles and cosmetics': 'चूड़ी एवं श्रृंगार', 'Barber shop': 'नाई की दुकान', 'Beauty parlour': 'ब्यूटी पार्लर',
  'Bhutta': 'भुट्टा', "Blacksmith's workshop": 'लोहार की दुकान', 'Book depot': 'पुस्तक भंडार', 'Books and uniforms': 'किताबें एवं वर्दी',
  'Bus shelter': 'बस प्रतीक्षालय', "Carpenter's workshop": 'बढ़ई की दुकान', 'Chai': 'चाय', 'Chana jor': 'चना जोर गरम',
  'Chemist': 'दवाइयाँ', 'Chemist (health centre)': 'दवा केंद्र', 'Cloth': 'कपड़ा भंडार', 'Cloth house': 'वस्त्रालय',
  'Cloth shop': 'कपड़े की दुकान', 'Cosmetics': 'श्रृंगार भंडार', 'Cyber cafe': 'साइबर कैफ़े', 'Cycle and puncture repair': 'साइकिल पंचर मरम्मत',
  'Cycle repair': 'साइकिल मरम्मत', 'Cycle stand': 'साइकिल स्टैंड', 'Dairy booth': 'दूध डेयरी', 'Dhaba': 'ढाबा',
  "Doctor's clinic": 'डॉक्टर क्लिनिक', 'Dosa': 'डोसा', 'Dry fruits': 'मेवा भंडार', 'Electrical': 'बिजली का सामान',
  'Electrical and mobile repair': 'बिजली एवं मोबाइल मरम्मत', 'Electrical repair': 'बिजली मरम्मत', "Farmers' cooperative and godown": 'किसान सहकारी समिति',
  'Fertiliser and seeds': 'खाद बीज भंडार', 'Footwear': 'जूता घर', 'Fruit': 'ताज़े फल', 'Gas cylinder godown': 'गैस गोदाम',
  'General store': 'जनरल स्टोर', 'Gift shop': 'उपहार भंडार', 'Golgappa': 'गोलगप्पे', 'Grocery': 'किराना',
  'Hardware and paint': 'हार्डवेयर एवं पेंट', 'Ice gola': 'बर्फ़ का गोला', 'Jaggery making unit': 'गुड़ भट्ठी', 'Jeweller': 'सर्राफ़',
  'Juice': 'जूस', 'Kirana': 'किराना स्टोर', 'Kites and toys': 'पतंग एवं खिलौने', 'Kulfi': 'कुल्फ़ी', 'Lassi': 'लस्सी',
  'Lassi and milk': 'लस्सी एवं दूध', 'Library and reading room': 'पुस्तकालय एवं वाचनालय', 'Medical store': 'मेडिकल स्टोर', 'Milk carts': 'दूध',
  'Milk collection point': 'दुग्ध संग्रह केंद्र', 'Mithai': 'मिठाई', 'Mobile': 'मोबाइल', 'Mobile accessories': 'मोबाइल एक्सेसरीज़',
  'Mobile and recharge': 'मोबाइल एवं रिचार्ज', 'Mobile covers': 'मोबाइल कवर', 'Mobile recharge': 'मोबाइल रिचार्ज',
  'Mobile recharge and photocopy': 'रिचार्ज एवं फ़ोटोकॉपी', 'Mobile shop': 'मोबाइल की दुकान', 'Momos': 'मोमोज़', 'Moongphali': 'मूँगफली',
  'Namkeen': 'नमकीन', 'Namkeen and biscuits': 'नमकीन एवं बिस्कुट', 'Newspaper stand': 'अख़बार', 'Optician': 'चश्मा घर',
  'Photo studio': 'फ़ोटो स्टूडियो', 'Pickles and papad': 'अचार पापड़', 'Plastic goods': 'प्लास्टिक का सामान', 'Pooja items': 'पूजा सामग्री',
  'Readymade clothes': 'रेडीमेड वस्त्र', 'Rewari and gajak': 'रेवड़ी गजक', 'Samosa and pakora': 'समोसा पकौड़ा', 'Samosa and snacks': 'समोसा एवं नाश्ता',
  'Saree shop': 'साड़ी भंडार', 'Seeds': 'बीज भंडार', 'Shoe shop': 'जूते चप्पल', 'Snacks': 'नाश्ता', 'Spices': 'मसाले',
  'Stationery': 'स्टेशनरी', 'Stationery and xerox': 'स्टेशनरी एवं फ़ोटोकॉपी', 'Steel utensils': 'स्टील बर्तन भंडार', 'Sugarcane juice': 'गन्ने का रस',
  'Sweet corn': 'स्वीट कॉर्न', 'Sweet shop': 'मिष्ठान भंडार', 'Sweets and namkeen': 'मिठाई नमकीन', 'Tailor': 'दर्ज़ी',
  'Tea and biscuits': 'चाय बिस्कुट', 'Tea stall': 'चाय की दुकान', 'Tent and wedding lights': 'टेंट हाउस', 'Toy shop': 'खिलौना घर',
  'Toys and balloons': 'खिलौने गुब्बारे', 'Tractor repair': 'ट्रैक्टर मरम्मत', 'Utensils': 'बर्तन भंडार', 'Vegetable': 'ताज़ी सब्ज़ी',
  'Village bank': 'ग्रामीण बैंक', 'Watch and clock': 'घड़ी घर', 'Watch repair': 'घड़ी मरम्मत', 'Wedding and community hall': 'बारात घर',
};

// Painted-board schemes seen on real UP bazaar boards: light ground, ONE dark paint for both lines, a darker border.
// Expanded 22 Nov (her reference photos: no two boards in a real UP market row match) from 6 to 14, mixing painted-tin
// and printed-banner feels so a long shop row never repeats a look within view.
const SCHEMES = [
  { bg: '#efe3c4', fg: '#6e1a12', border: '#7a2a1a' }, // cream / maroon
  { bg: '#e9c95a', fg: '#5a1410', border: '#6e2018' }, // yellow / deep red
  { bg: '#e6e2d6', fg: '#1f2f5e', border: '#2a3a6e' }, // white / navy
  { bg: '#cfdcc4', fg: '#1f3a22', border: '#2c4a2a' }, // pale green / bottle green
  { bg: '#c9d6e0', fg: '#18305a', border: '#22406a' }, // pale blue / navy
  { bg: '#ead2b4', fg: '#3a2414', border: '#5a3a1e' }, // sand / brown
  { bg: '#c23b2e', fg: '#f5ecd8', border: '#7a1e16' }, // bright red / cream (vinyl banner look)
  { bg: '#1f6e4a', fg: '#f3ecd4', border: '#123a26' }, // bottle green / cream (printed banner)
  { bg: '#e8831a', fg: '#2a1608', border: '#8a4a0c' }, // saffron / near-black (hardware/general store)
  { bg: '#16365e', fg: '#eadfa8', border: '#0c2038' }, // navy / gold (mobile/electronics shop)
  { bg: '#d9a6b0', fg: '#5a1a28', border: '#7a2638' }, // dusty pink / maroon (bangles/cosmetics)
  { bg: '#3a3028', fg: '#e8c468', border: '#1e1812' }, // dark tin / gold paint (jeweller, sweet shop)
  { bg: '#eef0e6', fg: '#2a2a2a', border: '#5a5a52' }, // galvanised tin grey-white / near-black (hardware)
  { bg: '#f0d23a', fg: '#1a1a1a', border: '#7a1e16' }, // bright yellow / black (tailor, cycle repair)
];

export const CW = 512, COLS = 4;
// Five board shapes seen in a real UP market row: a thin fascia strip up to a tall hanging board. Each is its own
// shelf in the atlas with its own row height, so the board a shop gets is a genuinely different box, not a
// repainted copy of everyone else's. `rows` is how many unique boards of that shape the kit can hold.
export const SHAPES = [
  { ch: 92, rows: 10 },  // thin fascia strip (general store, hardware)
  { ch: 128, rows: 14 }, // the classic shop board
  { ch: 160, rows: 10 }, // squarer, room for a pictogram beside the text
  { ch: 198, rows: 8 },  // tall board (jeweller, mobile shop)
  { ch: 240, rows: 6 },  // vertical hanging board
];
let acc = 0;
const SHAPE_Y = SHAPES.map((s) => { const y = acc; acc += s.ch * s.rows; return y; });
const W = CW * COLS, H = acc;

// Text sits centred, or pushed to one side with a small painted pictogram of the trade on the other (her reference
// photos: plenty of real boards aren't centred). 1 in 2 centred, the rest split left/right.
const LAYOUTS = ['center', 'center', 'left', 'right'];
export function layoutFor(i) { return LAYOUTS[Math.floor(hashi(i, 11) * LAYOUTS.length)]; }
function hashi(i, salt) { const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453; return x - Math.floor(x); }

/** Trade family for the small pictogram - a coarse read of the English name, not the full tradeOf() taxonomy. */
function iconFamily(en) {
  const n = en.toLowerCase();
  if (/cloth|saree|tailor|readymade|uniform|footwear|shoe|bag shop/.test(n)) return 'cloth';
  if (/tea|chai|dhaba|samosa|snack|sweet|mithai|juice|lassi|dosa|momo|kulfi|golgappa|bhutta|corn|chana|namkeen|pickle|spice|vegetable|fruit|aloo|moongphali/.test(n)) return 'food';
  if (/electrical|mobile|cycle|hardware|paint|tractor|blacksmith|carpenter|repair/.test(n)) return 'tools';
  if (/kirana|grocery|general store|seed|fertiliser|dry fruit|utensil|steel/.test(n)) return 'grocery';
  if (/bank|library|clinic|hospital|cooperative|community|chemist|medical|doctor/.test(n)) return 'office';
  if (/jeweller|watch|gift|cosmetic|bangle/.test(n)) return 'jewel';
  return 'other';
}

/** A small flat pictogram for a trade family, drawn in the paint colour (no fill box - just the glyph). */
function drawIcon(g, family, cx, cy, size, fg) {
  g.save();
  g.translate(cx, cy);
  g.fillStyle = fg; g.strokeStyle = fg; g.lineWidth = Math.max(2, size * 0.07); g.lineCap = 'round'; g.lineJoin = 'round';
  const s = size;
  switch (family) {
    case 'cloth': // a simple shirt silhouette
      g.beginPath();
      g.moveTo(-s * 0.3, -s * 0.5); g.lineTo(-s * 0.1, -s * 0.5); g.lineTo(0, -s * 0.36); g.lineTo(s * 0.1, -s * 0.5); g.lineTo(s * 0.3, -s * 0.5);
      g.lineTo(s * 0.46, -s * 0.28); g.lineTo(s * 0.3, -s * 0.16); g.lineTo(s * 0.3, s * 0.5); g.lineTo(-s * 0.3, s * 0.5); g.lineTo(-s * 0.3, -s * 0.16);
      g.lineTo(-s * 0.46, -s * 0.28); g.closePath(); g.fill();
      break;
    case 'food': // a cup with a wisp of steam
      g.beginPath(); g.moveTo(-s * 0.34, -s * 0.1); g.lineTo(-s * 0.26, s * 0.42); g.lineTo(s * 0.26, s * 0.42); g.lineTo(s * 0.34, -s * 0.1); g.closePath(); g.fill();
      g.beginPath(); g.arc(s * 0.4, s * 0.05, s * 0.14, -1.3, 1.3); g.stroke();
      g.beginPath(); g.moveTo(-s * 0.05, -s * 0.22); g.quadraticCurveTo(0, -s * 0.42, -s * 0.1, -s * 0.52); g.stroke();
      break;
    case 'tools': // a wrench
      g.beginPath();
      g.moveTo(-s * 0.4, s * 0.4); g.lineTo(s * 0.12, -s * 0.12);
      g.arc(s * 0.26, -s * 0.26, s * 0.2, Math.PI * 0.8, Math.PI * 2.3); g.lineTo(-s * 0.3, s * 0.5); g.closePath(); g.fill();
      break;
    case 'grocery': // a tied sack
      g.beginPath(); g.moveTo(-s * 0.3, -s * 0.1); g.quadraticCurveTo(-s * 0.36, s * 0.46, 0, s * 0.5); g.quadraticCurveTo(s * 0.36, s * 0.46, s * 0.3, -s * 0.1);
      g.quadraticCurveTo(s * 0.18, -s * 0.3, 0, -s * 0.3); g.quadraticCurveTo(-s * 0.18, -s * 0.3, -s * 0.3, -s * 0.1); g.fill();
      g.beginPath(); g.moveTo(-s * 0.06, -s * 0.3); g.lineTo(-s * 0.1, -s * 0.5); g.lineTo(s * 0.1, -s * 0.5); g.lineTo(s * 0.06, -s * 0.3); g.fill();
      break;
    case 'office': // an open book
      g.beginPath(); g.moveTo(0, -s * 0.3); g.quadraticCurveTo(-s * 0.1, -s * 0.4, -s * 0.44, -s * 0.36); g.lineTo(-s * 0.44, s * 0.36);
      g.quadraticCurveTo(-s * 0.1, s * 0.3, 0, s * 0.4); g.quadraticCurveTo(s * 0.1, s * 0.3, s * 0.44, s * 0.36); g.lineTo(s * 0.44, -s * 0.36);
      g.quadraticCurveTo(s * 0.1, -s * 0.4, 0, -s * 0.3); g.closePath(); g.lineWidth = Math.max(2, size * 0.06); g.stroke();
      g.beginPath(); g.moveTo(0, -s * 0.3); g.lineTo(0, s * 0.4); g.stroke();
      break;
    case 'jewel': // a faceted stone
      g.beginPath(); g.moveTo(-s * 0.4, -s * 0.12); g.lineTo(0, -s * 0.46); g.lineTo(s * 0.4, -s * 0.12); g.lineTo(0, s * 0.46); g.closePath(); g.fill();
      break;
    default: // a small five-point star
      g.beginPath();
      for (let k = 0; k < 5; k++) {
        const a = -Math.PI / 2 + k * (Math.PI * 2 / 5), a2 = a + Math.PI / 5;
        const px = Math.cos(a) * s * 0.46, py = Math.sin(a) * s * 0.46, qx = Math.cos(a2) * s * 0.18, qy = Math.sin(a2) * s * 0.18;
        if (k === 0) g.moveTo(px, py); else g.lineTo(px, py);
        g.lineTo(qx, qy);
      }
      g.closePath(); g.fill();
  }
  g.restore();
}

export function signNameFor(name) {
  return name.replace(/ \(2-storey\)$/, '').replace(/ (kiosk|cart)$/, '');
}

export class SignAtlas {
  constructor() {
    this.bins = SHAPES.map(() => []); // per-shape: array of { i, hi, en, scheme, layout }
    this.canvas = document.createElement('canvas');
    this.canvas.width = W; this.canvas.height = H;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 8;
    this.texture.generateMipmaps = true;
    this.texture.minFilter = THREE.LinearMipmapLinearFilter;
    this.material = new THREE.MeshStandardMaterial({ map: this.texture, roughness: 0.82, metalness: 0 });
    this.material.name = 'signboard';
  }
  /** Cell for a shop name + scheme + shape + text layout; the same combination shares a cell. Null if no Hindi, or that shape's shelf is full. */
  cell(name, schemeIdx = 0, shapeIdx = 0, layout = 'center') {
    const en = signNameFor(name);
    const hi = HINDI[en];
    if (!hi) return null;
    shapeIdx = ((shapeIdx % SHAPES.length) + SHAPES.length) % SHAPES.length;
    const bin = this.bins[shapeIdx];
    const key = en + '|' + schemeIdx + '|' + layout;
    let c = bin.find((b) => b.key === key);
    if (!c) {
      if (bin.length >= SHAPES[shapeIdx].rows * COLS) return null;
      c = { key, i: bin.length, shapeIdx, hi, en, scheme: SCHEMES[schemeIdx % SCHEMES.length], layout, family: iconFamily(en) };
      bin.push(c);
    }
    return c;
  }
  /** UV rect [u0, v0, u1, v1] of a cell (a 3 px inset keeps mip bleed off the edge). */
  uv(c) {
    const ch = SHAPES[c.shapeIdx].ch, col = c.i % COLS, row = Math.floor(c.i / COLS);
    const x0 = col * CW + 3, x1 = (col + 1) * CW - 3, y0 = SHAPE_Y[c.shapeIdx] + row * ch + 3, y1 = SHAPE_Y[c.shapeIdx] + (row + 1) * ch - 3;
    return [x0 / W, 1 - y1 / H, x1 / W, 1 - y0 / H];
  }
  paint() {
    const g = this.canvas.getContext('2d');
    g.fillStyle = '#7a6a58'; g.fillRect(0, 0, W, H);
    for (let shapeIdx = 0; shapeIdx < SHAPES.length; shapeIdx++) {
      const ch = SHAPES[shapeIdx].ch;
      for (const c of this.bins[shapeIdx]) {
        const col = c.i % COLS, row = Math.floor(c.i / COLS), x = col * CW, y = SHAPE_Y[shapeIdx] + row * ch, s = c.scheme;
        g.fillStyle = s.bg; g.fillRect(x, y, CW, ch);
        // sun-faded paint: a few very soft uneven patches, never a clean print
        for (let k = 0; k < 5; k++) {
          const r = 50 + ((k * 37 + c.i * 13) % (ch * 0.6)), px = x + ((k * 97 + c.i * 31) % CW), py = y + ((k * 53 + c.i * 7) % ch);
          const rg = g.createRadialGradient(px, py, 0, px, py, r);
          rg.addColorStop(0, k % 2 ? 'rgba(255,250,235,0.10)' : 'rgba(110,90,60,0.07)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = rg; g.fillRect(x, y, CW, ch);
        }
        g.strokeStyle = s.border; g.lineWidth = Math.max(4, ch * 0.055); g.strokeRect(x + 7, y + 7, CW - 14, ch - 14);
        const pad = 26, iconW = ch * 0.78;
        if (c.layout === 'left') {
          drawIcon(g, c.family, x + CW - pad - iconW / 2, y + ch / 2, iconW, s.fg);
          drawBilingual(g, c.hi, c.en, { x: x + pad, y: y + ch * 0.1, w: CW - pad * 2 - iconW - 14, h: ch * 0.8, fg: s.fg, align: 'left', fillFraction: 0.92 });
        } else if (c.layout === 'right') {
          drawIcon(g, c.family, x + pad + iconW / 2, y + ch / 2, iconW, s.fg);
          drawBilingual(g, c.hi, c.en, { x: x + CW - pad, y: y + ch * 0.1, w: CW - pad * 2 - iconW - 14, h: ch * 0.8, fg: s.fg, align: 'right', fillFraction: 0.92 });
        } else {
          drawBilingual(g, c.hi, c.en, { x: x + CW / 2, y: y + ch * 0.1, w: CW - 52, h: ch * 0.8, fg: s.fg, fillFraction: 0.92 });
        }
        // a little grime along the bottom edge (rain run-off)
        const gh = Math.min(22, ch * 0.18);
        const grd = g.createLinearGradient(0, y + ch - gh, 0, y + ch);
        grd.addColorStop(0, 'rgba(60,45,30,0)'); grd.addColorStop(1, 'rgba(60,45,30,0.16)');
        g.fillStyle = grd; g.fillRect(x, y + ch - gh, CW, gh);
      }
    }
    this.texture.needsUpdate = true;
  }
  /** Paint now with whatever fonts exist, and again once the Devanagari webfont has loaded. */
  ready() {
    this.paint();
    if (typeof document === 'undefined' || !document.fonts) return Promise.resolve();
    return Promise.all([document.fonts.load('700 40px "Noto Sans Devanagari"'), document.fonts.ready]).then(() => this.paint(), () => this.paint());
  }
}

/**
 * Board geometry: a 3 cm thick painted plank (front face = the atlas cell) on two flat-iron brackets is overkill at this
 * size, so it is a thin box whose front shows the cell and whose edges/back take the border colour. Returns a geometry in
 * the board's local frame (front +z) at (cx,cy,cz) rotated by the parent matrix.
 */
export function boardGeometry(atlas, cell, w, h, matrix, depth = 0.04) {
  const g = new THREE.BoxGeometry(w, h, depth);
  const [u0, v0, u1, v1] = atlas.uv(cell);
  const uv = g.attributes.uv;
  const front = g.groups[4];
  const touched = new Set();
  for (let i = front.start; i < front.start + front.count; i++) {
    const vi = g.index.array[i];
    if (touched.has(vi)) continue;
    touched.add(vi);
    uv.setXY(vi, u0 + uv.getX(vi) * (u1 - u0), v0 + uv.getY(vi) * (v1 - v0));
  }
  const eu = u0 + 0.004 * (u1 - u0), ev = (v0 + v1) / 2; // edges + back: the border paint
  for (let vi = 0; vi < uv.count; vi++) if (!touched.has(vi)) uv.setXY(vi, eu, ev);
  g.clearGroups();
  g.applyMatrix4(matrix);
  return g;
}
