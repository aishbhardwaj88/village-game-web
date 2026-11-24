import * as THREE from 'three';
import { drawBilingual, clearSignLayoutCache } from '../signPaint.js';

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
  if (/electrical/.test(n)) return /mobile/.test(n) ? 'phone' : 'bulb'; // bijli ka saman: a bulb, never a wrench
  if (/watch|clock/.test(n)) return 'watch';
  if (/toy|kite|balloon/.test(n)) return 'toy';
  if (/bangle|manihari/.test(n)) return 'bangle';
  if (/utensil|steel/.test(n)) return 'pot';
  if (/medical|chemist|doctor|clinic|hospital/.test(n)) return 'medical';
  if (/shoe|footwear/.test(n)) return 'shoe';
  if (/bag shop|bag$/.test(n)) return 'bag';
  if (/mobile|recharge|cyber/.test(n)) return 'phone';
  if (/tailor/.test(n)) return 'scissors';
  if (/photo/.test(n)) return 'camera';
  if (/fruit|juice|vegetable/.test(n)) return 'fruit';
  if (/milk|lassi|dairy/.test(n)) return 'milk';
  if (/sweet|mithai|bakery|rewari|jalebi/.test(n)) return 'sweet';
  if (/cycle|puncture/.test(n)) return 'wheel';
  if (/cloth|saree|readymade|uniform/.test(n)) return 'cloth';
  if (/tea|chai|dhaba|samosa|snack|kulfi|lassi|dosa|momo|golgappa|bhutta|corn|chana|namkeen|pickle|spice|aloo|moongphali/.test(n)) return 'food';
  if (/hardware|paint|tractor|blacksmith|carpenter|repair|tent/.test(n)) return 'tools';
  if (/kirana|grocery|general store|seed|fertiliser|dry fruit/.test(n)) return 'grocery';
  if (/bank|library|book|stationery|cooperative|community/.test(n)) return 'office';
  if (/jeweller|gift|cosmetic|beauty/.test(n)) return 'jewel';
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
    case 'bulb': { // a lamp bulb: round glass, neck, screw cap, three rays
      g.beginPath(); g.arc(0, -s * 0.12, s * 0.27, Math.PI * 0.72, Math.PI * 2.28); g.lineTo(s * 0.12, s * 0.2); g.lineTo(-s * 0.12, s * 0.2); g.closePath(); g.fill();
      g.fillRect(-s * 0.12, s * 0.24, s * 0.24, s * 0.06); g.fillRect(-s * 0.1, s * 0.33, s * 0.2, s * 0.06); g.fillRect(-s * 0.05, s * 0.42, s * 0.1, s * 0.05);
      for (const a of [-1.0, -Math.PI / 2, -2.14]) { g.beginPath(); g.moveTo(Math.cos(a) * s * 0.4, -s * 0.12 + Math.sin(a) * s * 0.4); g.lineTo(Math.cos(a) * s * 0.5, -s * 0.12 + Math.sin(a) * s * 0.5); g.stroke(); }
      break;
    }
    case 'plug': // a two-pin plug on a curling cord
      g.fillRect(-s * 0.2, -s * 0.1, s * 0.4, s * 0.3); g.fillRect(-s * 0.13, -s * 0.34, s * 0.06, s * 0.26); g.fillRect(s * 0.07, -s * 0.34, s * 0.06, s * 0.26);
      g.beginPath(); g.moveTo(0, s * 0.2); g.bezierCurveTo(0, s * 0.5, s * 0.3, s * 0.3, s * 0.4, s * 0.5); g.stroke();
      break;
    case 'watch': // a round clock face with hands and a bell cap
      g.beginPath(); g.arc(0, s * 0.04, s * 0.38, 0, 7); g.lineWidth = Math.max(3, s * 0.09); g.stroke();
      g.lineWidth = Math.max(2, s * 0.06); g.beginPath(); g.moveTo(0, s * 0.04); g.lineTo(0, -s * 0.2); g.moveTo(0, s * 0.04); g.lineTo(s * 0.16, s * 0.12); g.stroke();
      g.fillRect(-s * 0.06, -s * 0.46, s * 0.12, s * 0.06);
      break;
    case 'toy': // a balloon on a string and a small ball
      g.beginPath(); g.ellipse(-s * 0.08, -s * 0.14, s * 0.24, s * 0.3, 0, 0, 7); g.fill();
      g.beginPath(); g.moveTo(-s * 0.08, s * 0.16); g.quadraticCurveTo(-s * 0.2, s * 0.32, -s * 0.06, s * 0.48); g.stroke();
      g.beginPath(); g.arc(s * 0.28, s * 0.3, s * 0.15, 0, 7); g.fill();
      break;
    case 'bangle': // three nested bangles
      for (const [dx, r] of [[-0.2, 0.26], [0.02, 0.3], [0.22, 0.26]]) { g.beginPath(); g.arc(s * dx, s * 0.04, s * r, 0, 7); g.lineWidth = Math.max(3, s * 0.07); g.stroke(); }
      break;
    case 'pot': // a round pot with two handles and a lid knob
      g.beginPath(); g.moveTo(-s * 0.3, -s * 0.05); g.quadraticCurveTo(-s * 0.4, s * 0.45, 0, s * 0.45); g.quadraticCurveTo(s * 0.4, s * 0.45, s * 0.3, -s * 0.05); g.closePath(); g.fill();
      g.fillRect(-s * 0.34, -s * 0.12, s * 0.68, s * 0.07); g.beginPath(); g.arc(0, -s * 0.16, s * 0.05, 0, 7); g.fill();
      g.beginPath(); g.arc(-s * 0.36, s * 0.08, s * 0.07, 0, 7); g.arc(s * 0.36, s * 0.08, s * 0.07, 0, 7); g.stroke();
      break;
    case 'medical': // a plain plus sign in a rounded square
      g.beginPath(); g.roundRect(-s * 0.4, -s * 0.4, s * 0.8, s * 0.8, s * 0.12); g.lineWidth = Math.max(3, s * 0.07); g.stroke();
      g.fillRect(-s * 0.08, -s * 0.26, s * 0.16, s * 0.52); g.fillRect(-s * 0.26, -s * 0.08, s * 0.52, s * 0.16);
      break;
    case 'shoe': // a chappal seen from the side
      g.beginPath(); g.moveTo(-s * 0.44, s * 0.28); g.lineTo(s * 0.44, s * 0.28); g.lineTo(s * 0.44, s * 0.38); g.lineTo(-s * 0.44, s * 0.38); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(-s * 0.3, s * 0.28); g.quadraticCurveTo(-s * 0.1, -s * 0.3, s * 0.12, s * 0.28); g.lineWidth = Math.max(3, s * 0.08); g.stroke();
      break;
    case 'bag': // a shoulder bag with handle
      g.beginPath(); g.roundRect(-s * 0.34, -s * 0.12, s * 0.68, s * 0.6, s * 0.06); g.fill();
      g.beginPath(); g.arc(0, -s * 0.12, s * 0.2, Math.PI, 0); g.lineWidth = Math.max(3, s * 0.07); g.stroke();
      break;
    case 'phone': // a mobile phone
      g.beginPath(); g.roundRect(-s * 0.2, -s * 0.44, s * 0.4, s * 0.88, s * 0.07); g.lineWidth = Math.max(3, s * 0.07); g.stroke();
      g.fillRect(-s * 0.12, -s * 0.3, s * 0.24, s * 0.46); g.beginPath(); g.arc(0, s * 0.3, s * 0.04, 0, 7); g.fill();
      break;
    case 'scissors': // tailor's shears
      g.lineWidth = Math.max(3, s * 0.07); g.beginPath(); g.moveTo(-s * 0.1, -s * 0.46); g.lineTo(s * 0.2, s * 0.12); g.moveTo(s * 0.1, -s * 0.46); g.lineTo(-s * 0.2, s * 0.12); g.stroke();
      g.beginPath(); g.arc(-s * 0.2, s * 0.28, s * 0.14, 0, 7); g.arc(s * 0.2, s * 0.28, s * 0.14, 0, 7); g.stroke();
      break;
    case 'camera': // a box camera with lens
      g.beginPath(); g.roundRect(-s * 0.44, -s * 0.22, s * 0.88, s * 0.58, s * 0.07); g.fill(); g.fillRect(-s * 0.16, -s * 0.34, s * 0.32, s * 0.12);
      g.save(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(0, s * 0.07, s * 0.17, 0, 7); g.fill(); g.restore(); g.beginPath(); g.arc(0, s * 0.07, s * 0.09, 0, 7); g.fill();
      break;
    case 'fruit': // an apple with a leaf
      g.beginPath(); g.arc(-s * 0.1, s * 0.12, s * 0.26, 0, 7); g.arc(s * 0.1, s * 0.12, s * 0.26, 0, 7); g.fill();
      g.beginPath(); g.moveTo(0, -s * 0.1); g.lineTo(s * 0.04, -s * 0.34); g.stroke(); g.beginPath(); g.ellipse(s * 0.16, -s * 0.28, s * 0.14, s * 0.07, -0.5, 0, 7); g.fill();
      break;
    case 'milk': // a milk can
      g.beginPath(); g.moveTo(-s * 0.22, -s * 0.12); g.lineTo(-s * 0.3, s * 0.46); g.lineTo(s * 0.3, s * 0.46); g.lineTo(s * 0.22, -s * 0.12); g.closePath(); g.fill();
      g.fillRect(-s * 0.15, -s * 0.3, s * 0.3, s * 0.18); g.fillRect(-s * 0.2, -s * 0.36, s * 0.4, s * 0.07);
      break;
    case 'sweet': // a bowl of round laddoos
      g.beginPath(); g.moveTo(-s * 0.42, s * 0.1); g.quadraticCurveTo(0, s * 0.62, s * 0.42, s * 0.1); g.closePath(); g.fill();
      for (const [dx, dy] of [[-0.2, -0.04], [0.04, -0.12], [0.26, -0.02], [-0.04, 0.02]]) { g.beginPath(); g.arc(s * dx, s * dy, s * 0.14, 0, 7); g.fill(); }
      break;
    case 'wheel': // a spoked cycle wheel
      g.beginPath(); g.arc(0, 0, s * 0.4, 0, 7); g.lineWidth = Math.max(3, s * 0.07); g.stroke(); g.lineWidth = Math.max(2, s * 0.03);
      for (let k = 0; k < 8; k++) { g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(k * 0.785) * s * 0.4, Math.sin(k * 0.785) * s * 0.4); g.stroke(); }
      g.beginPath(); g.arc(0, 0, s * 0.06, 0, 7); g.fill();
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

// ------------------------------------------------------------------------------------------------ board looks (24 Nov)
// Her playtest: "shop boards look fake and all the same". A cell now gets a STYLE (painted wood, galvanised tin, painted straight on
// the wall, printed flex banner, board with a photo-like picture) and a FONT SET (src/signPaint.js FONT_SETS), both picked from the
// shop name + scheme so the same shop always gets the same board, plus weathering (rain streaks, chips, rust, sun-fade). Hindi on
// top, English below, same dark paint: the signboard rule in CLAUDE.md section 7 still holds for every style.
const STYLES = ['enamel', 'enamel', 'enamel', 'enamel', 'tin', 'tin', 'wall', 'wall', 'banner', 'banner', 'photo', 'photo'];
const FONT_PICK = ['noto', 'noto', 'noto', 'yatra', 'yatra', 'rozha', 'rozha', 'kalam', 'teko', 'teko'];
const strHash = (str) => { let h = 2166136261; for (let k = 0; k < str.length; k++) { h ^= str.charCodeAt(k); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
const TIN_INK = ['#7a1a14', '#17315e', '#1f4a2a', '#2a2a2a', '#5a2a60'];
const WALL_GROUND = ['#e7dcc2', '#d9e2c8', '#e8cfa4', '#cddbe4', '#ecd2c6', '#e9e4d0'];
const WALL_INK = ['#8a1e14', '#1a2f66', '#2a4a22', '#4a2a60', '#6a3a10'];
const PHOTO_BG = { bulb: ['#1c2a48', '#4a6a9a'], watch: ['#3a2a1e', '#a8825a'], toy: ['#4aa0d8', '#e8f0f8'], bangle: ['#7a1f3a', '#d86a8a'], pot: ['#3a2a22', '#c08a52'], medical: ['#2a6a5a', '#bfe0d4'], shoe: ['#5a4030', '#d8b890'], bag: ['#2a4a6a', '#a8c0d8'], phone: ['#20202c', '#5a6a9a'], scissors: ['#6a2a2a', '#d8a8a0'], camera: ['#2a2a2e', '#8a8a92'], fruit: ['#2a6a2a', '#b8e07a'], milk: ['#3a6aa8', '#e8f0f8'], sweet: ['#8a4a14', '#f0c060'], cloth: ['#6a2a5a', '#e0a0c8'], food: ['#6a3a14', '#e8a040'], tools: ['#2a3a4a', '#9aa8b8'], grocery: ['#6a5a2a', '#e0d090'], office: ['#2a3a5a', '#c0cce0'], jewel: ['#3a1a4a', '#d8b0e8'], wheel: ['#2a2a2a', '#8a9aa8'], plug: ['#1c2a48', '#4a6a9a'], other: ['#3a3a3a', '#c8c8c8'] };
const PHOTO_SUBJECT = { bulb: ['#fff6c0', '#e8b820'], watch: ['#f4ead0', '#b08a3a'], toy: ['#e8402a', '#f0c020'], bangle: ['#f0c850', '#c84a6a'], pot: ['#f0d27a', '#a87a2a'], medical: ['#ffffff', '#9ac8b8'], shoe: ['#e8d0a8', '#8a5a2a'], bag: ['#e86a4a', '#8a2a1a'], phone: ['#9ac8f0', '#2a4a7a'], scissors: ['#e8e8ec', '#8a8a92'], camera: ['#d8d8dc', '#5a5a62'], fruit: ['#e8402a', '#a81a10'], milk: ['#f4f4f4', '#a8b0b8'], sweet: ['#f8a020', '#c86a10'], cloth: ['#f0a0c0', '#b8407a'], food: ['#f8d060', '#c87a20'], tools: ['#d8dce0', '#6a7480'], grocery: ['#e8d8a0', '#a8904a'], office: ['#f0f0f0', '#8a98b8'], jewel: ['#f8e8a0', '#c8a020'], wheel: ['#d0d4d8', '#5a6068'], plug: ['#f4f4f4', '#6a6a72'], other: ['#f4f4f4', '#9a9aa4'] };

function styleOf(c) { return STYLES[Math.floor(strHash(c.key + '#s') * STYLES.length)]; }
function fontSetOf(c) { return FONT_PICK[Math.floor(strHash(c.key + '#f') * FONT_PICK.length)]; }

function roundRect(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }

/** Soft multi-colour "photo": gradient backdrop, light bloom, ground shadow, the subject shaded top-lit, vignette. */
function drawPhoto(g, family, x, y, w, h) {
  const [b0, b1] = PHOTO_BG[family] || PHOTO_BG.other, [s0, s1] = PHOTO_SUBJECT[family] || PHOTO_SUBJECT.other;
  g.save();
  roundRect(g, x, y, w, h, 6); g.clip();
  let gr = g.createLinearGradient(x, y, x, y + h); gr.addColorStop(0, b0); gr.addColorStop(1, b1); g.fillStyle = gr; g.fillRect(x, y, w, h);
  gr = g.createRadialGradient(x + w * 0.5, y + h * 0.4, 0, x + w * 0.5, y + h * 0.4, w * 0.7); gr.addColorStop(0, 'rgba(255,248,220,0.55)'); gr.addColorStop(1, 'rgba(255,248,220,0)'); g.fillStyle = gr; g.fillRect(x, y, w, h);
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(x + w * 0.52, y + h * 0.88, w * 0.3, h * 0.05, 0, 0, 7); g.fill();
  const sg = g.createLinearGradient(x, y + h * 0.15, x + w * 0.4, y + h * 0.9); sg.addColorStop(0, s0); sg.addColorStop(1, s1);
  drawIcon(g, family, x + w / 2, y + h * 0.48, w * 0.78, sg);
  gr = g.createRadialGradient(x + w / 2, y + h / 2, w * 0.25, x + w / 2, y + h / 2, w * 0.8); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.5)'); g.fillStyle = gr; g.fillRect(x, y, w, h); // vignette
  for (let k = 0; k < 90; k++) { g.fillStyle = `rgba(255,255,255,${0.03 + (k % 4) * 0.012})`; g.fillRect(x + ((k * 53) % w), y + ((k * 29) % h), 1.5, 1.5); } // print grain
  g.restore();
  g.strokeStyle = 'rgba(250,244,230,0.95)'; g.lineWidth = 5; roundRect(g, x, y, w, h, 6); g.stroke();
}

/** Weathering shared by every style: rain streaks from the top edge, edge chips, sun-fade bloom, grain. */
function weather(g, c, x, y, ch, strength, chipColour) {
  const hs = (k) => hashi(c.i * 3 + k, 7 + strength * 3);
  for (let k = 0; k < 7; k++) { // rain run-off streaks
    const sx = x + 20 + hs(k) * (CW - 40), len = ch * (0.25 + hs(k + 20) * 0.6);
    const gr = g.createLinearGradient(0, y, 0, y + len); gr.addColorStop(0, `rgba(70,55,40,${0.10 * strength})`); gr.addColorStop(1, 'rgba(70,55,40,0)');
    g.fillStyle = gr; g.fillRect(sx, y, 2 + hs(k + 40) * 4, len);
  }
  for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(${hs(k + 60) > 0.5 ? '255,250,235' : '60,45,30'},${0.04 + hs(k + 90) * 0.06 * strength})`; g.fillRect(x + hs(k + 120) * CW, y + hs(k + 150) * ch, 1 + hs(k + 180) * 3, 1 + hs(k + 210) * 3); } // specks
  g.fillStyle = chipColour;
  for (let k = 0; k < 5; k++) { // flaked paint at the edges
    const e = Math.floor(hs(k + 240) * 4), p = hs(k + 270), cw = 4 + hs(k + 300) * 12 * strength, chh = 3 + hs(k + 330) * 7 * strength;
    if (e === 0) g.fillRect(x + p * CW, y, cw, chh); else if (e === 1) g.fillRect(x + p * CW, y + ch - chh, cw, chh); else if (e === 2) g.fillRect(x, y + p * ch, chh, cw); else g.fillRect(x + CW - chh, y + p * ch, chh, cw);
  }
  const rg = g.createRadialGradient(x + hs(1) * CW, y + hs(2) * ch, 0, x + hs(1) * CW, y + hs(2) * ch, CW * 0.6); // sun-fade
  rg.addColorStop(0, `rgba(255,248,225,${0.14 * strength})`); rg.addColorStop(1, 'rgba(255,248,225,0)'); g.fillStyle = rg; g.fillRect(x, y, CW, ch);
  const gh = Math.min(22, ch * 0.18), grd = g.createLinearGradient(0, y + ch - gh, 0, y + ch); grd.addColorStop(0, 'rgba(60,45,30,0)'); grd.addColorStop(1, `rgba(60,45,30,${0.18 * strength})`); g.fillStyle = grd; g.fillRect(x, y + ch - gh, CW, gh);
}

function paintBoard(g, c, x, y, ch) {
  const style = styleOf(c), set = fontSetOf(c), s = c.scheme, hs = (k) => hashi(c.i * 5 + k, 31);
  let fg = s.fg, textBox = null;
  const pad = 26, iconW = ch * 0.78;
  const withIcon = c.layout !== 'center' || style === 'photo';
  const layout = style === 'photo' && c.layout === 'center' ? (hs(1) < 0.5 ? 'left' : 'right') : c.layout;
  if (style === 'enamel') {
    g.fillStyle = s.bg; g.fillRect(x, y, CW, ch);
    g.strokeStyle = s.border; g.lineWidth = Math.max(4, ch * 0.055); g.strokeRect(x + 7, y + 7, CW - 14, ch - 14);
    if (hs(2) < 0.5) { g.lineWidth = 2; g.strokeRect(x + 15, y + 15, CW - 30, ch - 30); } // second pinstripe
  } else if (style === 'tin') {
    fg = TIN_INK[Math.floor(hs(3) * TIN_INK.length)];
    const gr = g.createLinearGradient(x, y, x, y + ch); gr.addColorStop(0, '#d4d7d2'); gr.addColorStop(0.5, '#bcc0bb'); gr.addColorStop(1, '#9ea5a3'); g.fillStyle = gr; g.fillRect(x, y, CW, ch);
    g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 2; for (let k = 0; k < 14; k++) { const lx = x + 18 + k * (CW - 36) / 13; g.beginPath(); g.moveTo(lx, y + 4); g.lineTo(lx, y + ch - 4); g.stroke(); } // press-formed ribs
    g.strokeStyle = '#6a706e'; g.lineWidth = 5; g.strokeRect(x + 4, y + 4, CW - 8, ch - 8);
    for (const [rx, ry] of [[14, 14], [CW - 14, 14], [14, ch - 14], [CW - 14, ch - 14]]) { // rivets with rust runs
      g.fillStyle = '#7a7f7d'; g.beginPath(); g.arc(x + rx, y + ry, 4, 0, 7); g.fill();
      const rg = g.createLinearGradient(0, y + ry, 0, y + ry + ch * 0.5); rg.addColorStop(0, 'rgba(150,80,30,0.35)'); rg.addColorStop(1, 'rgba(150,80,30,0)'); g.fillStyle = rg; g.fillRect(x + rx - 2, y + ry, 4, ch * 0.5);
    }
  } else if (style === 'wall') {
    fg = WALL_INK[Math.floor(hs(4) * WALL_INK.length)];
    g.fillStyle = WALL_GROUND[Math.floor(hs(5) * WALL_GROUND.length)]; g.fillRect(x, y, CW, ch);
    for (let k = 0; k < 9; k++) { // lime-wash blotches, damp patches and peeled spots showing brick
      const px = x + hs(k + 10) * CW, py = y + hs(k + 30) * ch, r = 18 + hs(k + 50) * 70;
      const rg = g.createRadialGradient(px, py, 0, px, py, r); rg.addColorStop(0, k % 3 === 0 ? 'rgba(150,105,80,0.28)' : k % 3 === 1 ? 'rgba(255,255,245,0.22)' : 'rgba(90,80,60,0.14)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(x, y, CW, ch);
    }
    g.strokeStyle = fg; g.lineWidth = 3; g.globalAlpha = 0.8; g.beginPath(); g.moveTo(x + 14, y + 12); g.lineTo(x + CW - 14, y + 11); g.moveTo(x + 14, y + ch - 12); g.lineTo(x + CW - 14, y + ch - 13); g.stroke(); g.globalAlpha = 1; // hand-ruled lines
    g.translate(x + CW / 2, y + ch / 2); g.rotate((hs(6) - 0.5) * 0.03); g.translate(-(x + CW / 2), -(y + ch / 2)); // brush-lettered, a little off level
  } else if (style === 'banner') {
    g.fillStyle = s.bg; g.fillRect(x, y, CW, ch);
    const gl = g.createLinearGradient(x, y, x, y + ch); gl.addColorStop(0, 'rgba(255,255,255,0.22)'); gl.addColorStop(0.5, 'rgba(255,255,255,0)'); gl.addColorStop(1, 'rgba(0,0,0,0.16)'); g.fillStyle = gl; g.fillRect(x, y, CW, ch);
    fg = '#1a1d2e';
    const bx = layout === 'center' ? 22 : layout === 'left' ? 22 : 22 + iconW + 10, bw = layout === 'center' ? CW - 44 : CW - 44 - iconW - 10;
    g.fillStyle = 'rgba(250,246,232,0.93)'; roundRect(g, x + bx, y + ch * 0.12, bw, ch * 0.76, 10); g.fill();
    g.strokeStyle = s.border; g.lineWidth = 3; roundRect(g, x + bx, y + ch * 0.12, bw, ch * 0.76, 10); g.stroke();
    for (const rx of [10, CW - 10]) for (const ry of [10, ch - 10]) { g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.arc(x + rx, y + ry, 4, 0, 7); g.fill(); g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.arc(x + rx, y + ry, 2, 0, 7); g.fill(); } // eyelets
    textBox = { x: x + bx + bw / 2, w: bw - 24, align: 'center' };
  } else { // photo
    g.fillStyle = s.bg; g.fillRect(x, y, CW, ch);
    g.strokeStyle = s.border; g.lineWidth = Math.max(4, ch * 0.05); g.strokeRect(x + 6, y + 6, CW - 12, ch - 12);
  }
  // pictogram (painted, or a photo-like picture) and text
  const hasPic = style === 'photo' || (withIcon && style !== 'banner') || (style === 'banner' && layout !== 'center');
  if (hasPic) {
    const px = layout === 'left' ? x + CW - pad - iconW / 2 : x + pad + iconW / 2;
    if (style === 'photo') drawPhoto(g, c.family, px - iconW / 2, y + ch * 0.1, iconW, ch * 0.8);
    else if (style === 'banner') drawPhoto(g, c.family, px - iconW / 2 + (layout === 'left' ? 4 : -4), y + ch * 0.1, iconW, ch * 0.8);
    else drawIcon(g, c.family, px, y + ch / 2, iconW, fg);
  }
  const tw = CW - pad * 2 - (hasPic ? iconW + 14 : 0);
  const box = textBox && hasPic ? { x: textBox.x, w: textBox.w, align: 'center' }
    : textBox ? textBox
      : hasPic ? (layout === 'left' ? { x: x + pad, w: tw, align: 'left' } : { x: x + CW - pad, w: tw, align: 'right' })
        : { x: x + CW / 2, w: CW - 52, align: 'center' };
  drawBilingual(g, c.hi, c.en, { x: box.x, y: y + ch * 0.1, w: box.w, h: ch * 0.8, fg, align: box.align, fillFraction: 0.92, set });
  weather(g, c, x, y, ch, style === 'banner' ? 0.5 : style === 'tin' ? 0.9 : 1, style === 'tin' ? '#8a8e8a' : style === 'wall' ? '#b4906c' : '#5a4a3a');
}

// Sign fonts (OFL, public/fonts/sign-*): registered once, boards repaint when they arrive.
const SIGN_FACES = [
  ['SignYatra', 'sign-yatra-one/yatra-one', '400'], ['SignRozha', 'sign-rozha-one/rozha-one', '400'], ['SignKalam', 'sign-kalam/kalam', '700'], ['SignTeko', 'sign-teko/teko', '600'],
];
const RANGE = { devanagari: 'U+0900-097F,U+1CD0-1CF9,U+200C-200D,U+20A8,U+20B9,U+25CC', latin: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122' };
let facesPromise = null;
function loadSignFaces() {
  if (facesPromise) return facesPromise;
  if (typeof document === 'undefined' || !document.fonts || typeof FontFace === 'undefined') return (facesPromise = Promise.resolve());
  const base = (import.meta.env && import.meta.env.BASE_URL) || '/';
  const jobs = [];
  for (const [fam, path, weight] of SIGN_FACES) {
    for (const sub of ['devanagari', 'latin']) {
      const f = new FontFace(fam, `url(${base}fonts/${path.split('/')[0]}/${path.split('/')[1]}-${sub}-${weight}-normal.woff2) format('woff2')`, { weight, unicodeRange: RANGE[sub] });
      document.fonts.add(f);
      jobs.push(f.load().catch(() => null));
    }
  }
  return (facesPromise = Promise.all(jobs));
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
        const col = c.i % COLS, row = Math.floor(c.i / COLS), x = col * CW, y = SHAPE_Y[shapeIdx] + row * ch;
        g.save(); g.beginPath(); g.rect(x, y, CW, ch); g.clip();
        paintBoard(g, c, x, y, ch);
        g.restore();
      }
    }
    this.texture.needsUpdate = true;
  }
  /** Paint now with whatever fonts exist, and again once the Devanagari webfont has loaded. */
  ready() {
    this.paint();
    if (typeof document === 'undefined' || !document.fonts) return Promise.resolve();
    return Promise.all([document.fonts.load('700 40px "Noto Sans Devanagari"'), loadSignFaces(), document.fonts.ready]).then(() => { clearSignLayoutCache(); this.paint(); }, () => this.paint());
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
