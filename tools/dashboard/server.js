#!/usr/bin/env node
// Local-only progress dashboard for Dopahar. Node built-ins only, no npm deps.
// Binds to 127.0.0.1 so nothing outside this machine can reach it.
// Never imported by the game or the Vite build - this is a separate tool.

import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const HOST = '127.0.0.1';
const PORT = 4321;

const DOCS = path.join(ROOT, 'docs');
const INBOX = path.join(ROOT, 'inbox');
const SHOTS = path.join(DOCS, 'shots');
// The dashboard's progress bar reads docs/FINISH_LINE.md (the real, locked
// definition of done, added 2026-10-20 after docs/GAME_COMPLETE.md's
// self-graded "complete" verdict was found premature — see that file's own
// superseded notice). GAME_COMPLETE is kept only as a fallback for the
// mission-by-mission breakdown below, which FINISH_LINE.md doesn't carry (it
// tracks "all 8 missions" as a single checklist line, not per-mission).
const FINISH_LINE = path.join(DOCS, 'FINISH_LINE.md');
const GAME_COMPLETE = path.join(DOCS, 'GAME_COMPLETE.md');
const BACKLOG = path.join(DOCS, 'BACKLOG.md');
const NEEDS_YOU = path.join(DOCS, 'NEEDS_YOU.md');
const STATUS_JSON = path.join(DOCS, 'status.json');
const INBOX_LOG = path.join(DOCS, 'inbox-log.json');
const ENV_FILE = path.join(ROOT, '.env'); // gitignored (see .gitignore) — TRIPO_API_KEY lives here only
const INDEX_HTML = path.join(__dirname, 'index.html');

const ALLOWED_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.glb']);
const MAX_FILE_BYTES = 100 * 1024 * 1024;
const MAX_REQUEST_BYTES = MAX_FILE_BYTES + 2 * 1024 * 1024; // file + headers/note margin

async function readTextSafe(file, fallback = '') {
  try {
    return await fsp.readFile(file, 'utf8');
  } catch {
    return fallback;
  }
}

// Tripo API key storage (docs/FINISH_LINE.md Step 4J) — lives only in the
// gitignored .env at the repo root, never in a file that could be committed,
// never echoed back to the browser, never printed to a log. Preserves any
// other lines already in .env (doesn't assume this is the only variable in
// it).
async function readEnvLines() {
  try {
    const text = await fsp.readFile(ENV_FILE, 'utf8');
    return text.split('\n');
  } catch {
    return [];
  }
}

async function hasTripoKey() {
  const lines = await readEnvLines();
  return lines.some((l) => /^TRIPO_API_KEY=.+/.test(l.trim()));
}

async function writeTripoKey(key) {
  const lines = (await readEnvLines()).filter((l) => !/^TRIPO_API_KEY=/.test(l.trim()));
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
  lines.push(`TRIPO_API_KEY=${key}`);
  await fsp.writeFile(ENV_FILE, lines.join('\n') + '\n', { mode: 0o600 });
}

async function readJsonSafe(file, fallback) {
  try {
    const text = await fsp.readFile(file, 'utf8');
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function countCheckboxes(text) {
  const all = text.match(/^- \[[ xX]\]/gm) || [];
  const done = text.match(/^- \[[xX]\]/gm) || [];
  return { done: done.length, total: all.length };
}

function firstUnticked(text) {
  const lines = text.split('\n');
  for (const line of lines) {
    const m = line.match(/^- \[ \] (.+)$/);
    if (m) return m[1].trim();
  }
  return null;
}

function parseMissionsSection(text) {
  const lines = text.split('\n');
  let inSection = false;
  const missions = [];
  for (const line of lines) {
    if (/^## Missions/i.test(line)) {
      inSection = true;
      continue;
    }
    if (inSection && /^## /.test(line)) break;
    if (!inSection) continue;
    const m = line.match(/^- \[([ xX])\] (M[1-8])\s*[:\-]?\s*(.+)$/);
    if (m) {
      missions.push({ id: m[2], done: m[1].toLowerCase() === 'x', desc: m[3].trim() });
    }
  }
  return missions;
}

function missionProgressFromBacklog(backlogText) {
  // For each mission id mentioned in BACKLOG.md, how many of its lines are ticked.
  const lines = backlogText.split('\n');
  const progress = {};
  for (const line of lines) {
    const checkbox = line.match(/^- \[([ xX])\]/);
    if (!checkbox) continue;
    const mentions = line.match(/\bM[1-8]\b/g);
    if (!mentions) continue;
    const done = checkbox[1].toLowerCase() === 'x';
    for (const id of new Set(mentions)) {
      if (!progress[id]) progress[id] = { done: 0, total: 0 };
      progress[id].total += 1;
      if (done) progress[id].done += 1;
    }
  }
  return progress;
}

async function getMissions() {
  const gcText = await readTextSafe(GAME_COMPLETE);
  const backlogText = await readTextSafe(BACKLOG);
  const missions = parseMissionsSection(gcText);
  const backlogProgress = missionProgressFromBacklog(backlogText);
  return missions.map((m) => {
    if (m.done) return { ...m, status: 'done' };
    const bp = backlogProgress[m.id];
    if (bp && bp.done > 0) return { ...m, status: 'in progress' };
    return { ...m, status: 'not started' };
  });
}

async function getProgress() {
  // Progress bar reads FINISH_LINE.md (the real, locked definition of done) —
  // NOT GAME_COMPLETE.md, which is superseded. Field name kept as
  // `gameComplete` for the existing index.html bindings; it's the finish-line
  // count now, not the old file's.
  const flText = await readTextSafe(FINISH_LINE);
  const backlogText = await readTextSafe(BACKLOG);
  const gc = countCheckboxes(flText);
  const bl = countCheckboxes(backlogText);
  const currentTask = firstUnticked(backlogText) || 'nothing left - backlog is clear';
  return {
    gameComplete: gc,
    backlog: bl,
    currentTask,
  };
}

async function getCommits() {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['log', '-10', '--pretty=format:%H%x1f%ad%x1f%s', '--date=short'],
      { cwd: ROOT, maxBuffer: 1024 * 1024 }
    );
    return stdout
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [hash, date, message] = line.split('\x1f');
        return { hash: (hash || '').slice(0, 10), date, message };
      });
  } catch {
    return [];
  }
}

async function getLatestShots() {
  try {
    const entries = await fsp.readdir(SHOTS, { withFileTypes: true });
    const dirNames = entries.filter((e) => e.isDirectory()).map((e) => e.name);
    if (dirNames.length === 0) return { folder: null, images: [] };
    // Bugfix: this used to pick the alphabetically-LAST folder name, which is
    // not "latest" at all — docs/shots/ mixes hand-named reference folders
    // (e.g. "wheel-diagnose") with tools/screenshot.js's own ISO-timestamp
    // folders (e.g. "2026-10-20T..."), and a leading digit always sorts
    // before a leading lowercase letter, so any hand-named folder present
    // would permanently shadow every real screenshot run, forever. Real
    // filesystem mtime is what "latest" actually means here.
    const withMtime = await Promise.all(
      dirNames.map(async (name) => ({ name, mtime: (await fsp.stat(path.join(SHOTS, name))).mtimeMs }))
    );
    withMtime.sort((a, b) => b.mtime - a.mtime);
    const latest = withMtime[0].name;
    const files = await fsp.readdir(path.join(SHOTS, latest));
    const images = files.filter((f) => /\.(png|jpg|jpeg|webp)$/i.test(f)).sort();
    return { folder: latest, images: images.map((f) => `/shots/${latest}/${f}`) };
  } catch {
    return { folder: null, images: [] };
  }
}

async function getHealth() {
  const status = await readJsonSafe(STATUS_JSON, null);
  if (!status) {
    return {
      available: false,
      note: 'docs/status.json has not been written yet.',
    };
  }
  return { available: true, ...status };
}

function parseNeedsYou(text) {
  const lines = text.split('\n');
  const items = [];
  lines.forEach((line, idx) => {
    const m = line.match(/^- (.+?) - status: (open|done)\s*$/i);
    if (m) {
      items.push({ index: items.length, lineNumber: idx, text: m[1].trim(), status: m[2].toLowerCase() });
    }
  });
  return items;
}

async function getNeedsYou() {
  const text = await readTextSafe(NEEDS_YOU);
  return parseNeedsYou(text);
}

async function markNeedsYouDone(index) {
  const text = await readTextSafe(NEEDS_YOU);
  const items = parseNeedsYou(text);
  const target = items.find((i) => i.index === index);
  if (!target) return false;
  const lines = text.split('\n');
  lines[target.lineNumber] = lines[target.lineNumber].replace(/status: open/i, 'status: done');
  await fsp.writeFile(NEEDS_YOU, lines.join('\n'), 'utf8');
  return true;
}

async function getInbox() {
  let files = [];
  try {
    files = await fsp.readdir(INBOX);
  } catch {
    files = [];
  }
  const waiting = files
    .filter((f) => f !== 'README.md' && !f.endsWith('.note.txt') && !f.startsWith('.'))
    .map((f) => ({ name: f, status: 'waiting' }));
  const log = await readJsonSafe(INBOX_LOG, []);
  const used = Array.isArray(log) ? log : [];
  return [...used, ...waiting];
}

async function buildState() {
  const [progress, missions, commits, shots, health, needsYou, inbox, tripoKeySet] = await Promise.all([
    getProgress(),
    getMissions(),
    getCommits(),
    getLatestShots(),
    getHealth(),
    getNeedsYou(),
    getInbox(),
    hasTripoKey(),
  ]);
  return { progress, missions, commits, shots, health, needsYou, inbox, tripoKeySet, generatedAt: new Date().toISOString() };
}

function sanitizeFilename(name) {
  const base = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_');
  return base.length ? base : 'upload';
}

async function uniqueDestination(dir, filename) {
  const ext = path.extname(filename);
  const stem = filename.slice(0, filename.length - ext.length);
  let candidate = filename;
  let n = 1;
  while (true) {
    try {
      await fsp.access(path.join(dir, candidate));
      candidate = `${stem}-${n}${ext}`;
      n += 1;
    } catch {
      return candidate;
    }
  }
}

function parseMultipart(buffer, boundary) {
  const boundaryBuf = Buffer.from(`--${boundary}`);
  const parts = [];
  let start = buffer.indexOf(boundaryBuf);
  if (start === -1) return parts;
  start += boundaryBuf.length;
  while (true) {
    const next = buffer.indexOf(boundaryBuf, start);
    if (next === -1) break;
    let slice = buffer.slice(start, next);
    // strip trailing \r\n before the next boundary, and the leading \r\n after the previous one
    if (slice.slice(0, 2).toString('latin1') === '\r\n') slice = slice.slice(2);
    if (slice.slice(-2).toString('latin1') === '\r\n') slice = slice.slice(0, -2);
    const headerEnd = slice.indexOf('\r\n\r\n');
    if (headerEnd !== -1) {
      const headerStr = slice.slice(0, headerEnd).toString('utf8');
      const body = slice.slice(headerEnd + 4);
      const headers = {};
      headerStr.split('\r\n').forEach((line) => {
        const idx = line.indexOf(':');
        if (idx > -1) headers[line.slice(0, idx).toLowerCase().trim()] = line.slice(idx + 1).trim();
      });
      parts.push({ headers, body });
    }
    start = next + boundaryBuf.length;
    // '--' right after boundary marks the end
    if (buffer.slice(start, start + 2).toString('latin1') === '--') break;
  }
  return parts;
}

function contentDispositionInfo(headerValue) {
  const result = {};
  if (!headerValue) return result;
  const nameMatch = headerValue.match(/name="([^"]*)"/);
  const filenameMatch = headerValue.match(/filename="([^"]*)"/);
  if (nameMatch) result.name = nameMatch[1];
  if (filenameMatch) result.filename = filenameMatch[1];
  return result;
}

async function handleUpload(req, res) {
  const contentType = req.headers['content-type'] || '';
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/);
  if (!contentType.startsWith('multipart/form-data') || !boundaryMatch) {
    sendJson(res, 400, { ok: false, error: 'Expected multipart/form-data.' });
    return;
  }
  const boundary = boundaryMatch[1] || boundaryMatch[2];

  const chunks = [];
  let total = 0;
  let tooLarge = false;
  await new Promise((resolve, reject) => {
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > MAX_REQUEST_BYTES) {
        tooLarge = true;
        req.destroy();
        resolve();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', resolve);
    req.on('error', reject);
  });

  if (tooLarge) {
    sendJson(res, 413, { ok: false, error: 'File is larger than the 100MB limit.' });
    return;
  }

  const buffer = Buffer.concat(chunks);
  const parts = parseMultipart(buffer, boundary);

  let filePart = null;
  let noteText = '';
  for (const part of parts) {
    const info = contentDispositionInfo(part.headers['content-disposition']);
    if (info.filename) {
      filePart = { ...info, body: part.body };
    } else if (info.name === 'note') {
      noteText = part.body.toString('utf8');
    }
  }

  if (!filePart || !filePart.filename) {
    sendJson(res, 400, { ok: false, error: 'No file was included in the upload.' });
    return;
  }
  if (filePart.body.length > MAX_FILE_BYTES) {
    sendJson(res, 413, { ok: false, error: 'File is larger than the 100MB limit.' });
    return;
  }

  const safeName = sanitizeFilename(filePart.filename);
  const ext = path.extname(safeName).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    sendJson(res, 400, { ok: false, error: `File type ${ext || '(none)'} is not allowed. Use png, jpg, jpeg, webp, or glb.` });
    return;
  }

  await fsp.mkdir(INBOX, { recursive: true });
  const destName = await uniqueDestination(INBOX, safeName);
  await fsp.writeFile(path.join(INBOX, destName), filePart.body);

  if (noteText && noteText.trim()) {
    await fsp.writeFile(path.join(INBOX, `${destName}.note.txt`), noteText.trim(), 'utf8');
  }

  sendJson(res, 200, { ok: true, filename: destName });
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

function contentTypeFor(file) {
  const ext = path.extname(file).toLowerCase();
  return (
    {
      '.html': 'text/html; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.glb': 'model/gltf-binary',
      '.js': 'text/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
    }[ext] || 'application/octet-stream'
  );
}

async function serveStaticUnder(baseDir, relPath, res) {
  const resolved = path.resolve(baseDir, '.' + relPath);
  if (!resolved.startsWith(baseDir + path.sep) && resolved !== baseDir) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  try {
    const data = await fsp.readFile(resolved);
    res.writeHead(200, { 'Content-Type': contentTypeFor(resolved), 'Content-Length': data.length });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${HOST}:${PORT}`);

    if (req.method === 'GET' && url.pathname === '/') {
      const data = await fsp.readFile(INDEX_HTML);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': data.length });
      res.end(data);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/state') {
      const state = await buildState();
      sendJson(res, 200, state);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/upload') {
      await handleUpload(req, res);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/needs-you/done') {
      let body = '';
      for await (const chunk of req) body += chunk;
      let payload;
      try {
        payload = JSON.parse(body || '{}');
      } catch {
        sendJson(res, 400, { ok: false, error: 'Invalid JSON.' });
        return;
      }
      const index = Number(payload.index);
      if (!Number.isInteger(index) || index < 0) {
        sendJson(res, 400, { ok: false, error: 'Missing or invalid index.' });
        return;
      }
      const okResult = await markNeedsYouDone(index);
      sendJson(res, okResult ? 200 : 404, { ok: okResult });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/tripo-key') {
      let body = '';
      for await (const chunk of req) body += chunk;
      let payload;
      try {
        payload = JSON.parse(body || '{}');
      } catch {
        sendJson(res, 400, { ok: false, error: 'Invalid JSON.' });
        return;
      }
      const key = typeof payload.key === 'string' ? payload.key.trim() : '';
      if (!key) {
        sendJson(res, 400, { ok: false, error: 'No key provided.' });
        return;
      }
      await writeTripoKey(key);
      // Never echo the key back, never log it — only confirm success.
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === 'GET' && url.pathname.startsWith('/shots/')) {
      const rel = url.pathname.slice('/shots'.length);
      await serveStaticUnder(SHOTS, rel, res);
      return;
    }

    res.writeHead(404);
    res.end('Not found');
  } catch (err) {
    sendJson(res, 500, { ok: false, error: String(err && err.message ? err.message : err) });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Dopahar dashboard running at http://${HOST}:${PORT}`);
});
