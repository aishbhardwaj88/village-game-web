#!/usr/bin/env node
/**
 * Licence audit (S7, 21 Nov 2026): the game is going to be SOLD, so every file that ships must be cleared.
 *
 * Reads tools/licence-records.json (one record for every file under public/), checks each record against the
 * evidence it claims, and writes:
 *   docs/LICENCES.md     - every shipped file: category, source, licence, evidence; "Needs the owner" and
 *                          "Must replace before selling" at the top, in plain words
 *   src/creditsData.json - the data the in-game credits screen (src/credits.js) shows, so it never drifts
 *
 * Usage:
 *   node tools/licence-audit.mjs            write the two outputs (and print a summary)
 *   node tools/licence-audit.mjs --check    write nothing; exit 1 if any shipped file has no licence record or a
 *                                           record is broken (missing CREDITS row, licence not allowed, builder
 *                                           script missing). Owner questions and must-replace items only warn.
 *   node tools/licence-audit.mjs --check --strict   also fail on owner questions and must-replace items
 *                                           (use this for the paid release build once the owner has answered)
 *   add --dist to also check dist/ after `vite build` (every file there must come from public/ or be our bundle)
 *
 * Categories: credited (third-party, listed in docs/CREDITS.md with an allowed licence), self-made (a builder
 * script in this repo makes it), tripo (character made with Tripo AI: plan must be confirmed), flag (not allowed).
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const CHECK = args.has('--check');
const STRICT = args.has('--strict');
const DIST = args.has('--dist');

const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(ROOT, p));

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.DS_Store') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out.sort();
}
const globRe = (g) => new RegExp('^' + g.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*') + '$');
const kb = (n) => (n === 0 ? '0' : n >= 1024 * 1024 ? (n / 1024 / 1024).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');

// ---------- inputs ----------
const REG = JSON.parse(read('tools/licence-records.json'));
const ALLOWED = new Set(REG.allowedLicences);
const records = REG.records.map((r, i) => ({ ...r, _i: i, _re: r.match.map(globRe), _files: [] }));
const credits = read('docs/CREDITS.md');
const problems = []; // { level: 'error'|'owner'|'replace'|'note', text }
const err = (text) => problems.push({ level: 'error', text });

// Code text, to say whether a file is actually used (an unused file can simply be dropped instead of cleared).
const codeFiles = walk(path.join(ROOT, 'src')).filter((f) => /\.(js|json|mjs)$/.test(f) && !f.endsWith('creditsData.json'));
const codeText = [...codeFiles.map((f) => fs.readFileSync(f, 'utf8')), read('index.html'), exists('people.html') ? read('people.html') : ''].join('\n');
function usedInCode(file) {
  const base = path.basename(file);
  const stem = base.replace(/\.[^.]+$/, '');
  if (codeText.includes(base) || new RegExp(`['"\`/]${stem}['"\`.]`).test(codeText)) return 'yes';
  const dir = path.basename(path.dirname(file));
  if (file.includes('/textures/') && new RegExp(`['"\`/]${dir}['"\`/_]`).test(codeText)) return 'yes (by set name)';
  const fam = stem.replace(/(_(lod|low|[a-z]|\d+))+$/, '');
  if (fam !== stem && fam.length > 3 && codeText.includes(fam)) return 'probably (family name)';
  // file names built in code from parts, e.g. `lamp_${type}_v2${v}.glb` or `pot_${kind}_v2`
  const parts = stem.split('_');
  for (let n = parts.length - 1; n >= 1; n--) {
    const pre = parts.slice(0, n).join('_');
    if (pre.length < 3) continue;
    if (codeText.includes(`${pre}_\${`)) {
      const rest = parts.slice(n).filter((t) => !/^(v\d|[a-z]|lod|low)$/.test(t));
      if (rest.every((t) => new RegExp(`['"\`]${t}['"\`]`).test(codeText))) return 'yes (by pattern)';
    }
  }
  return 'NOT FOUND in code';
}

// GLB: read the JSON chunk (names of embedded pictures, generator, animation clips).
function glbInfo(file) {
  try {
    const b = fs.readFileSync(file);
    if (b.readUInt32LE(0) !== 0x46546c67) return null;
    const len = b.readUInt32LE(12);
    const j = JSON.parse(b.subarray(20, 20 + len).toString('utf8'));
    return {
      generator: j.asset?.generator || '',
      copyright: j.asset?.copyright || '',
      images: (j.images || []).map((im) => (im.name || im.uri || '?').replace(/\.(png|jpe?g|webp)$/i, '')),
      anims: (j.animations || []).map((a) => a.name),
    };
  } catch {
    return null;
  }
}

// Git: last and first commit per path in ONE pass (this checkout is shallow: history starts 17 Nov 2026).
const gitInfo = new Map();
let shallow = false;
try {
  shallow = execFileSync('git', ['rev-parse', '--is-shallow-repository'], { cwd: ROOT }).toString().trim() === 'true';
  const log = execFileSync('git', ['log', '--format=@@%ad|%h|%s', '--date=short', '--name-only', '--', 'public'], { cwd: ROOT, maxBuffer: 64 << 20 }).toString();
  let cur = null;
  for (const line of log.split('\n')) {
    if (line.startsWith('@@')) {
      const [d, h, ...s] = line.slice(2).split('|');
      cur = { d, h, s: s.join('|') };
    } else if (line.trim() && cur) {
      const g = gitInfo.get(line) || { last: cur, first: cur };
      g.first = cur;
      gitInfo.set(line, g);
    }
  }
} catch {
  /* no git: evidence column just says so */
}

// In-repo texture set names (a self-made model may only embed these, or pictures its script drew).
const textureSets = new Set(fs.readdirSync(path.join(ROOT, 'public/assets/textures')));
const ownPicture = (n) => {
  const m = n.match(/^([a-z]+)_(color|normal|roughness|ao)$/);
  if (m && textureSets.has(m[1])) return 'repo CC0 texture set';
  if (/_img$/.test(n)) return 'drawn by the builder script (arch.py decal_material / rangoli)';
  return null;
};
const tripoPicture = (n) => /^tripo_rgb_/.test(n) || /_eyes$|^teeth_patch$|_lid_atlas$/.test(n);

// ---------- classify every shipped file ----------
const publicFiles = walk(path.join(ROOT, 'public')).map(rel);
const rows = [];
for (const f of publicFiles) {
  const hits = records.filter((r) => r._re.some((re) => re.test(f)));
  const size = fs.statSync(path.join(ROOT, f)).size;
  const g = gitInfo.get(f);
  const row = { file: f, size, used: usedInCode(f), git: g ? `${g.first.d} ${g.first.h}${g.last.h !== g.first.h ? ` .. ${g.last.d} ${g.last.h}` : ''}` : 'not committed', notes: [] };
  if (hits.length === 0) {
    row.category = 'UNKNOWN';
    row.status = 'replace';
    err(`No licence record for ${f}. Add one to tools/licence-records.json (and a CREDITS.md row if it is third-party).`);
    rows.push(row);
    continue;
  }
  if (hits.length > 1) err(`${f} matches ${hits.length} licence records (#${hits.map((h) => h._i).join(', #')}); keep exactly one.`);
  const r = hits[0];
  r._files.push(f);
  Object.assign(row, { category: r.category, title: r.title, source: r.source || '', url: r.url || '', author: r.author || '', licence: r.licence, evidence: r.evidence || '', status: 'ok' });
  const info = f.endsWith('.glb') ? glbInfo(path.join(ROOT, f)) : null;

  if (r.category === 'credited') {
    if (!ALLOWED.has(r.licence)) {
      row.status = 'replace';
      problems.push({ level: 'replace', text: `${f}: licence "${r.licence}" is not on the allowed list.` });
    }
    if (r.creditsKey && !credits.includes(r.creditsKey)) err(`${f}: docs/CREDITS.md has no row mentioning "${r.creditsKey}".`);
    if (info && r.polyhavenSlug && info.images.length) {
      const odd = info.images.filter((n) => !n.startsWith(r.polyhavenSlug));
      if (odd.length) row.notes.push(`pictures inside not named after ${r.polyhavenSlug}: ${odd.join(', ')}`);
      else row.notes.push(`all ${info.images.length} pictures inside carry Poly Haven's own names (${r.polyhavenSlug}_*)`);
    }
  } else if (r.category === 'self-made') {
    const missing = (r.builder || []).filter((b) => !exists(b));
    if (missing.length) err(`${f}: builder script missing: ${missing.join(', ')}`);
    const stem = path.basename(f).replace(/\.[^.]+$/, '');
    const btext = (r.builder || []).filter(exists).map(read).join('\n');
    if ((r.builder || []).length) {
      const found = btext.includes(stem) ? `"${stem}" named in builder` : (r.family || []).find((t) => btext.includes(t)) ? 'family name in builder' : null;
      if (found) row.notes.push(found);
      else problems.push({ level: 'owner', text: `${f}: the builder script does not mention this file name; check which script makes it.` });
    }
    if (r.creditsKey && !credits.includes(r.creditsKey)) err(`${f}: made from CC0 sources but docs/CREDITS.md does not mention "${r.creditsKey}".`);
    if (info) {
      const strange = info.images.filter((n) => !ownPicture(n));
      if (strange.length) {
        row.status = 'replace';
        problems.push({ level: 'replace', text: `${f}: has pictures inside that are not from the repo's own texture sets: ${strange.join(', ')}` });
      } else row.notes.push(info.images.length ? `${info.images.length} pictures inside, all repo CC0 sets or script-drawn` : 'no pictures inside (textures added at runtime from the CC0 sets)');
      if (info.copyright) row.notes.push(`copyright field: ${info.copyright}`);
    }
  } else if (r.category === 'tripo') {
    const plan = REG.tripoPlanConfirmed;
    if (info) {
      const odd = info.images.filter((n) => !tripoPicture(n));
      if (odd.length) problems.push({ level: 'owner', text: `${f}: unexpected pictures inside: ${odd.join(', ')}` });
      row.notes.push(`Tripo texture inside; moves: ${info.anims.join(', ') || 'none'}`);
    }
    if (!plan) row.status = 'owner';
    else if (/^free/i.test(plan)) {
      row.status = 'replace';
    } else row.notes.push(`plan confirmed: ${plan}`);
  } else if (r.category === 'flag') {
    row.status = 'replace';
    problems.push({ level: 'replace', text: `${f}: ${r.evidence || r.licence}` });
  }
  if (row.notes.length) row.evidence = [row.evidence, ...row.notes].filter(Boolean).join('; ');
  rows.push(row);
}
for (const r of records) if (r._files.length === 0) problems.push({ level: 'note', text: `Licence record "${r.title}" matches no file any more (fine to delete the record).` });

// Tripo plan question (one line for all characters).
const tripoRows = rows.filter((r) => r.category === 'tripo');
if (tripoRows.length && !REG.tripoPlanConfirmed) problems.push({ level: 'owner', text: `TRIPO_PLAN` });
if (tripoRows.length && REG.tripoPlanConfirmed && /^free/i.test(REG.tripoPlanConfirmed)) problems.push({ level: 'replace', text: `TRIPO_FREE` });

// ---------- fonts loaded from Google Fonts ----------
const KNOWN_FONTS = {
  'Noto Sans Devanagari': { licence: 'OFL-1.1', author: 'The Noto Project Authors (Google)', url: 'https://fonts.google.com/noto/specimen/Noto+Sans+Devanagari' },
};
const fonts = [];
for (const page of ['index.html', 'people.html'].filter(exists)) {
  for (const m of read(page).matchAll(/fonts\.googleapis\.com\/css2?\?([^"']+)/g)) {
    for (const fam of m[1].split('&').filter((p) => p.startsWith('family='))) {
      const name = decodeURIComponent(fam.slice(7).split(':')[0].replace(/\+/g, ' '));
      if (fonts.some((x) => x.name === name)) continue;
      const k = KNOWN_FONTS[name];
      if (!k) problems.push({ level: 'owner', text: `Font "${name}" (loaded in ${page}) has no known licence; check it is OFL.` });
      fonts.push({ name, ...(k || { licence: 'UNKNOWN', author: '?', url: '' }), from: 'Google Fonts (loaded at runtime, not a file in the game)' });
    }
  }
}

// ---------- npm runtime dependencies (they are bundled into the game's JS) ----------
const pkg = JSON.parse(read('package.json'));
const code = [];
const seen = new Set();
function addDep(name, via) {
  if (seen.has(name)) return;
  seen.add(name);
  const dir = path.join(ROOT, 'node_modules', name);
  let p = {};
  try {
    p = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
  } catch {
    err(`npm dependency ${name} is not installed; cannot read its licence.`);
  }
  const lic = typeof p.license === 'string' ? p.license : p.license?.type || 'UNKNOWN';
  const licFile = fs.existsSync(dir) ? fs.readdirSync(dir).find((n) => /^licen[cs]e(\.md|\.txt)?$/i.test(n)) : null;
  const text = licFile ? fs.readFileSync(path.join(dir, licFile), 'utf8').trim() : '';
  const author = typeof p.author === 'string' ? p.author.replace(/\s*<.*>/, '') : p.author?.name || '';
  const copyright = (text.match(/^Copyright.*$/m) || [''])[0];
  if (!ALLOWED.has(lic)) problems.push({ level: 'replace', text: `npm package ${name} has licence "${lic}", not on the allowed list.` });
  code.push({ name, version: p.version || '?', licence: lic, author, copyright, url: p.homepage || `https://www.npmjs.com/package/${name}`, via, text });
  for (const d of Object.keys(p.dependencies || {})) addDep(d, `${name}`);
}
for (const d of Object.keys(pkg.dependencies || {})) addDep(d, 'package.json');
// The standard MIT text (same words as three's LICENSE), for bundled files that carry only a header.
const mitText = (copyright) => {
  const t = code.find((c) => c.name === 'three')?.text || '';
  return t ? t.replace(/^Copyright.*$/m, copyright) : '';
};
// Files pulled from three/examples (bundled too): read their own licence header when it names a different author.
const exampleImports = [...new Set([...codeText.matchAll(/from '(three\/examples\/[^']+)'/g)].map((m) => m[1]))];
for (const imp of exampleImports) {
  const f = path.join(ROOT, 'node_modules', imp);
  if (!fs.existsSync(f)) continue;
  const head = fs.readFileSync(f, 'utf8').slice(0, 400);
  const m = head.match(/distributed under the terms of (\w+) License[\s\S]*?Copyright \(C\) ([^\n]+)/);
  if (m) {
    const lic = m[1] === 'MIT' ? 'MIT' : m[1];
    code.push({ name: path.basename(imp).replace(/\.module\.js$|\.js$/, '') + ' (inside three.js examples)', version: '', licence: lic, author: m[2].replace(/\s*\(.*\)/, '').trim(), copyright: 'Copyright (C) ' + m[2].replace(/\s*\(.*\)/, '').trim(), url: 'https://github.com/zeux/meshoptimizer', via: imp, text: lic === 'MIT' ? mitText('Copyright (C) ' + m[2].replace(/\s*\(.*\)/, '').trim()) : '' });
    if (!ALLOWED.has(lic)) problems.push({ level: 'replace', text: `${imp} has licence ${lic}.` });
  }
}

// ---------- dist/ (after vite build) ----------
const distRows = [];
if (DIST) {
  const distDir = path.join(ROOT, 'dist');
  if (!fs.existsSync(distDir)) err('--dist given but dist/ does not exist; run the build first.');
  const pubSet = new Set(publicFiles.map((f) => f.replace(/^public\//, '')));
  for (const f of walk(distDir)) {
    const r = path.relative(distDir, f).split(path.sep).join('/');
    if (pubSet.has(r)) continue;
    if (/\.(js|css|html|map)$/.test(r)) distRows.push({ file: r, what: 'our code bundle (includes the npm packages listed above)' });
    else {
      distRows.push({ file: r, what: 'NOT from public/ and not code: check it' });
      err(`dist/${r} is not a public/ file and not code; it has no licence record.`);
    }
  }
}

// ---------- summarise ----------
const count = (pred) => rows.filter(pred).length;
const bytes = (pred) => rows.filter(pred).reduce((s, r) => s + r.size, 0);
const cats = [
  ['credited', 'Third-party, free licence, listed in CREDITS.md'],
  ['self-made', 'Made in this repo (Blender scripts, code, atlases from CC0 photos)'],
  ['tripo', 'Characters made with Tripo AI'],
  ['flag', 'Not allowed (flagged)'],
  ['UNKNOWN', 'No licence record at all'],
];
const unused = rows.filter((r) => r.used === 'NOT FOUND in code');

const ownerLines = [];
const replaceLines = [];
for (const p of problems) {
  if (p.text === 'TRIPO_PLAN') {
    ownerLines.push(
      `**Tripo plan for the ${tripoRows.length} people** (${tripoRows.map((r) => r.title.replace('Character: ', '')).join(', ')}): were they made on a PAID Tripo plan (or bought API credits)? ` +
        `Tripo's own pricing page says paid plans give "private models, commercial use", while the free plan makes models public under CC BY 4.0. ` +
        `Please check your Tripo account (Billing / Subscription) and tell us the plan name and the month you made them. Until then they count as "not cleared".`,
    );
  } else if (p.text === 'TRIPO_FREE') {
    replaceLines.push(`The ${tripoRows.length} Tripo people were made on the free plan: remake them on a paid plan (or credit Tripo under CC BY 4.0 and accept they are public).`);
  } else if (p.level === 'owner') ownerLines.push(p.text);
  else if (p.level === 'replace') replaceLines.push(p.text);
}
for (const r of rows.filter((x) => x.category === 'UNKNOWN')) replaceLines.push(`${r.file}: nobody knows where it came from. Find its source or replace it.`);

const summary = {
  files: rows.length,
  bytes: bytes(() => true),
  byCategory: Object.fromEntries(cats.map(([c]) => [c, { files: count((r) => r.category === c), bytes: bytes((r) => r.category === c) }])),
  errors: problems.filter((p) => p.level === 'error').map((p) => p.text),
  owner: ownerLines,
  replace: replaceLines,
  unused: unused.map((r) => r.file),
};

// ---------- --check ----------
if (CHECK) {
  const e = summary.errors;
  console.log(`licence check: ${rows.length} shipped files; ${Object.entries(summary.byCategory).map(([c, v]) => `${c} ${v.files}`).join(', ')}`);
  for (const t of e) console.log('  ERROR  ' + t);
  for (const t of ownerLines) console.log('  OWNER  ' + t.replace(/\*\*/g, ''));
  for (const t of replaceLines) console.log('  REPLACE ' + t);
  const fail = e.length > 0 || (STRICT && (ownerLines.length > 0 || replaceLines.length > 0));
  console.log(fail ? 'licence check: FAILED' : `licence check: passed${ownerLines.length + replaceLines.length ? ' (with warnings above)' : ''}`);
  process.exit(fail ? 1 : 0);
}

// ---------- docs/LICENCES.md ----------
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const link = (t, u) => (u ? `[${esc(t)}](${u})` : esc(t));
const today = new Date().toISOString().slice(0, 10);
let md = `# Licences of every file the game ships

Generated by \`node tools/licence-audit.mjs\` on ${today}. Do not edit by hand: change \`tools/licence-records.json\` or \`docs/CREDITS.md\` and re-run.
Plain summary for the owner: \`docs/s7/licence.md\`.

## Needs the owner
${ownerLines.length ? ownerLines.map((l) => `- ${l}`).join('\n') : '- Nothing right now.'}

## Must replace before selling
${replaceLines.length ? replaceLines.map((l) => `- ${l}`).join('\n') : '- Nothing right now. Every shipped file has an allowed licence or is made in this repo (the Tripo people wait on the question above).'}

## Worth knowing (not licence problems)
${(REG.worthKnowing || []).map((l) => `- ${l}`).join('\n') || '- Nothing.'}

## Numbers
| Category | Files | Size |
|---|---|---|
${cats.map(([c, label]) => `| ${label} | ${summary.byCategory[c].files} | ${kb(summary.byCategory[c].bytes)} |`).join('\n')}
| **All files under public/** | **${rows.length}** | **${kb(summary.bytes)}** |

Shipped but not found by a name search of src/ (maybe unused: if so it could be dropped instead of cleared; check before dropping): ${unused.length ? unused.map((r) => `\`${r.file}\``).join(', ') : 'none'}.
${shallow ? '\nGit history in this checkout is shallow (starts 17 Nov 2026), so "Git" dates show the oldest commit available, not the day a file was first added.\n' : ''}
## Code bundled into the game (npm runtime packages)
| Package | Version | Licence | Copyright | Via |
|---|---|---|---|---|
${code.map((c) => `| ${link(c.name, c.url)} | ${c.version} | ${c.licence} | ${esc(c.copyright || c.author)} | ${esc(c.via)} |`).join('\n')}

Build tools (vite, gltf-transform, sharp, playwright, meshoptimizer CLI) are devDependencies: they never ship.
MIT and Zlib ask that the copyright and licence text travel with copies: the in-game credits screen carries the full texts (src/creditsData.json).

## Fonts
| Font | Licence | Author | How it reaches the player |
|---|---|---|---|
${fonts.map((f) => `| ${link(f.name, f.url)} | ${f.licence} | ${esc(f.author)} | ${esc(f.from)} |`).join('\n')}

English sign text is drawn with the player's own system font (-apple-system / Segoe UI / Helvetica / Arial); no font file ships for it.
${DIST ? `\n## dist/ files not from public/\n| File | What |\n|---|---|\n${distRows.map((d) => `| ${esc(d.file)} | ${esc(d.what)} |`).join('\n')}\n` : ''}
## Every shipped file
Status: ok = cleared; owner = waits on the owner's answer; replace = must be replaced before selling.

| File | Size | Category | Source | Licence | Evidence | Used in code | Git | Status |
|---|---|---|---|---|---|---|---|---|
${rows.map((r) => `| ${esc(r.file.replace(/^public\//, ''))} | ${kb(r.size)} | ${r.category} | ${link(r.source || (r.category === 'self-made' ? 'this repo' : ''), r.url)}${r.author && r.author !== r.source ? ' / ' + esc(r.author) : ''} | ${esc(r.licence || '')} | ${esc(r.evidence || '')} | ${r.used} | ${esc(r.git)} | ${r.status} |`).join('\n')}
`;
fs.writeFileSync(path.join(ROOT, 'docs/LICENCES.md'), md);

// ---------- src/creditsData.json (for the in-game credits screen) ----------
const credited = rows.filter((r) => r.category === 'credited');
const byBy = new Map(); // CC BY: every author named, required
const by0 = new Map(); // CC0: thanks per source, authors listed when known
for (const r of credited) {
  const isBy = /^CC BY/.test(r.licence);
  const key = isBy ? `${r.title}|${r.author}` : r.source;
  const m = isBy ? byBy : by0;
  if (!m.has(key)) m.set(key, isBy ? { title: r.title, author: r.author, source: r.source, url: r.url, licence: r.licence } : { source: r.source, url: '', authors: new Set(), kinds: new Set() });
  if (!isBy) {
    const e = m.get(key);
    // sound sites: name every author; Poly Haven / ambientCG: thank the library and its artists as a whole
    if (r.author && r.author !== r.source && !/^(ambientCG|Poly Haven)$/.test(r.source)) e.authors.add(r.author);
    e.kinds.add(/\.(m4a|mp3|ogg|wav)$/.test(r.file) ? 'sounds' : /\.glb$/.test(r.file) ? 'models' : /\.hdr$/.test(r.file) ? 'sky' : 'textures');
  }
}
const SOURCE_URL = { 'ambientCG': 'https://ambientcg.com', 'Poly Haven': 'https://polyhaven.com', 'OpenGameArt.org': 'https://opengameart.org', 'Freesound': 'https://freesound.org' };
// the leaf atlases are made here from ambientCG photos: thank ambientCG for leaves too
if (rows.some((r) => r.file.includes('/plants/')) && by0.has('ambientCG')) by0.get('ambientCG').kinds.add('leaf photos');
const data = {
  _note: 'Generated by tools/licence-audit.mjs from tools/licence-records.json. Do not edit by hand.',
  generated: today,
  ccBy: [...byBy.values()],
  cc0: [...by0.values()].map((e) => ({ source: e.source, url: SOURCE_URL[e.source] || '', kinds: [...e.kinds], authors: [...e.authors].sort((a, b) => a.localeCompare(b)) })),
  fonts: fonts.map((f) => ({ name: f.name, author: f.author, licence: f.licence, url: f.url })),
  code: code.map((c) => ({ name: c.name, version: c.version, licence: c.licence, copyright: c.copyright || c.author, url: c.url, text: c.text })),
  characters: tripoRows.length ? { en: 'Characters made with Tripo AI', hi: 'पात्र Tripo AI से बनाए गए', count: tripoRows.length } : null,
};
fs.writeFileSync(path.join(ROOT, 'src/creditsData.json'), JSON.stringify(data, null, 1) + '\n');

console.log(`licence audit: ${rows.length} files (${kb(summary.bytes)})`);
for (const [c, v] of Object.entries(summary.byCategory)) console.log(`  ${c.padEnd(10)} ${String(v.files).padStart(4)} files  ${kb(v.bytes)}`);
console.log(`  errors ${summary.errors.length}, owner questions ${ownerLines.length}, must replace ${replaceLines.length}, unused ${unused.length}`);
for (const t of summary.errors) console.log('  ERROR  ' + t);
console.log('wrote docs/LICENCES.md and src/creditsData.json');
