// In-game credits screen (index.html #credits-overlay). S7 licence pass, 21 Nov 2026: the list is generated from
// src/creditsData.json, which tools/licence-audit.mjs writes from tools/licence-records.json, so the screen can
// never drift from the licence records. Order of sections:
//   1. CC BY authors (required by their licence; empty today, shown as soon as one is added)
//   2. Thanks to the free (CC0) libraries and the sound authors
//   3. Fonts (SIL Open Font License notice)
//   4. Software: three.js, postprocessing, meshoptimizer, with their full licence texts (MIT / Zlib ask for this)
//   5. "Characters made with Tripo AI"
// English first, Hindi beneath and smaller (CLAUDE.md section 7). Re-run `node tools/licence-audit.mjs` after any
// change to the records; do not edit creditsData.json by hand.
import data from './creditsData.json';

const STYLE = `
#credits-assets { max-height: 340px; }
.credit-section { margin: 0 0 16px; }
.credit-section-en { font-size: 0.8rem; font-weight: 700; margin: 0; }
.credit-section-hi { font-family: 'Noto Sans Devanagari', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 0.68rem; opacity: 0.65; margin: 0 0 6px; }
.credit-licence-text { white-space: pre-wrap; font-size: 0.62rem; line-height: 1.35; opacity: 0.75; margin: 4px 0 0;
  font-family: ui-monospace, Menlo, monospace; }
.credit-entry details summary { cursor: pointer; opacity: 0.75; font-size: 0.72rem; }
`;

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function linkOrText(text, url) {
  if (!url) return document.createTextNode(text);
  const a = el('a', null, text);
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener';
  a.style.color = 'inherit';
  return a;
}

function section(container, en, hi) {
  const s = el('div', 'credit-section');
  s.appendChild(el('p', 'credit-section-en', en));
  s.appendChild(el('p', 'credit-section-hi', hi));
  container.appendChild(s);
  return s;
}

/** One entry: bold first line, then a meta line made of text and links. */
function entry(parent, title, metaParts) {
  const row = el('div', 'credit-entry');
  row.appendChild(el('span', 'credit-asset', title));
  if (metaParts && metaParts.length) {
    const meta = el('span', 'credit-meta');
    metaParts.forEach((p, i) => {
      if (i) meta.appendChild(document.createTextNode(' · '));
      meta.appendChild(typeof p === 'string' ? document.createTextNode(p) : p);
    });
    row.appendChild(meta);
  }
  parent.appendChild(row);
  return row;
}

const KIND_HI = { textures: 'टेक्सचर', models: 'मॉडल', sky: 'आसमान', sounds: 'आवाज़ें', 'leaf photos': 'पत्तियों की तस्वीरें' };

export function renderCredits(listEl, d = data) {
  listEl.innerHTML = '';

  if (d.ccBy && d.ccBy.length) {
    const s = section(listEl, 'Credited authors (CC BY)', 'श्रेय (CC BY लाइसेंस)');
    for (const c of d.ccBy) entry(s, c.title, [c.author, linkOrText(c.source, c.url), c.licence]);
  }

  if (d.cc0 && d.cc0.length) {
    const s = section(listEl, 'Thank you to these free libraries (CC0)', 'इन मुफ़्त संग्रहों का धन्यवाद (CC0)');
    for (const c of d.cc0) {
      const parts = [c.kinds.join(', '), c.kinds.map((k) => KIND_HI[k] || k).join(', ')];
      if (c.authors.length) parts.push(c.authors.join(', '));
      entry(s, c.source, [linkOrText(c.url.replace(/^https?:\/\//, ''), c.url), ...parts]);
    }
  }

  if (d.fonts && d.fonts.length) {
    const s = section(listEl, 'Fonts', 'फ़ॉन्ट');
    for (const f of d.fonts) {
      entry(s, f.name, [f.author, linkOrText(f.licence === 'OFL-1.1' ? 'SIL Open Font License 1.1' : f.licence, f.licence === 'OFL-1.1' ? 'https://openfontlicense.org' : f.url)]);
    }
  }

  if (d.code && d.code.length) {
    const s = section(listEl, 'Software', 'सॉफ़्टवेयर');
    for (const c of d.code) {
      const row = entry(s, c.name + (c.version ? ' ' + c.version : ''), [c.copyright, linkOrText(c.licence + ' licence', c.url)]);
      if (c.text) {
        const det = el('details');
        det.appendChild(el('summary', null, 'Licence text · लाइसेंस'));
        det.appendChild(el('p', 'credit-licence-text', c.text.replace(/([^\n])\n(?!\n)/g, '$1 '))); // unwrap hard line breaks
        row.appendChild(det);
      }
    }
  }

  if (d.characters) {
    const s = section(listEl, d.characters.en, d.characters.hi);
    s.classList.add('credit-characters');
  }
}

/** Wires the credits screen (index.html #credits-overlay) — same warm palette-built
 * gradient as the title screen (see the CSS comment in index.html), reachable from
 * the pause menu and shown after the final (both-errands-complete) end card. Returns
 * {open, close} for main.js to call from those two triggers. */
export function setupCredits() {
  const overlay = document.getElementById('credits-overlay');
  const listEl = document.getElementById('credits-assets-list');
  const closeBtn = document.getElementById('credits-close-btn');
  const heading = document.getElementById('credits-assets-heading');

  if (!document.getElementById('credits-style')) {
    const st = el('style', null, STYLE);
    st.id = 'credits-style';
    document.head.appendChild(st);
  }
  if (heading) heading.textContent = 'Thanks and licences';
  renderCredits(listEl);

  function open() {
    overlay.classList.add('visible');
  }
  function close() {
    overlay.classList.remove('visible');
  }

  closeBtn.addEventListener('pointerdown', close);

  return { open, close };
}
