/**
 * Dopahar desktop edition (S7, 21 Nov): the Electron shell.
 *
 * Electron bundles its own Chromium, so the game renders the same on every Mac and Windows machine, whatever browser
 * the player has. The game itself is the normal Vite build (dist-desktop/, built with `npm run build:game` in this
 * folder), copied into the app as resources/game/ and served from a private app:// address, never from the internet.
 *
 * What this file does:
 *   - one 1600x900 resizable window, dark background while loading, no menu bar (Mac keeps a tiny standard menu)
 *   - fullscreen toggle: F11 (Windows/Linux), Cmd+Ctrl+F (Mac); Alt+Enter also works everywhere
 *   - serves the game from app://dopahar/village-game-web/... (Vite base is '/village-game-web/'; plain '/x' works too)
 *   - links to other websites (credits screen) open in the player's own browser, never inside the game window
 *   - saves (localStorage) live in the app's own user-data folder and survive restarts
 *   - the page gets ONLY window.dopaharDesktop = { edition: 'desktop', version } (preload.js); no Node, no file access
 *   - --smoke-test=<report.json>: load, press Play, record console errors + edition + quality, write the report, quit
 */
'use strict';

const { app, BrowserWindow, Menu, net, protocol, session, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

const SCHEME = 'app';
const HOST = 'dopahar';
const BASE = '/village-game-web/'; // must match vite.config.js `base`
const START_URL = `${SCHEME}://${HOST}${BASE}index.html`;

app.setName('Dopahar');
// Chromium switches WebGL off on GPUs/drivers it has "blocklisted" (older laptops, some Linux drivers). For a 3D game that
// means a blank screen, so the desktop app always tries the GPU; the game's own quality menu is the fallback for slow ones.
app.commandLine.appendSwitch('ignore-gpu-blocklist'); // user-data folder: ~/Library/Application Support/Dopahar, %APPDATA%\Dopahar, ~/.config/Dopahar

const argValue = (name) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};
const SMOKE_REPORT = argValue('smoke-test');
const SMOKE_QUERY = argValue('smoke-query') || '';
// Testing aid only: a separate user-data folder so a test never touches a real player's saves.
const USER_DATA = argValue('user-data-dir-override');
if (USER_DATA) app.setPath('userData', path.resolve(USER_DATA));

/** Where the built game lives: inside the packaged app (resources/game), or ../dist-desktop when run from source. */
function gameRoot() {
  const packaged = path.join(process.resourcesPath || '', 'game');
  if (app.isPackaged && fs.existsSync(path.join(packaged, 'index.html'))) return packaged;
  const local = path.resolve(__dirname, '..', 'dist-desktop');
  if (fs.existsSync(path.join(local, 'index.html'))) return local;
  return packaged;
}

// app:// must be registered as a "standard, secure" scheme BEFORE the app is ready, so the page gets a real origin
// (localStorage, fetch, workers, WebAssembly all behave as on https).
protocol.registerSchemesAsPrivileged([
  { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true, codeCache: true } },
]);

function registerGameProtocol(root) {
  const rootResolved = path.resolve(root);
  protocol.handle(SCHEME, (request) => {
    let url;
    try { url = new URL(request.url); } catch (e) { return new Response('bad url', { status: 400 }); }
    if (url.host !== HOST) return new Response('not found', { status: 404 });
    let p = decodeURIComponent(url.pathname);
    if (p.startsWith(BASE)) p = p.slice(BASE.length - 1);
    if (p === '/' || p === '') p = '/index.html';
    const file = path.resolve(rootResolved, '.' + p);
    // never serve anything outside the game folder
    if (file !== rootResolved && !file.startsWith(rootResolved + path.sep)) return new Response('forbidden', { status: 403 });
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return new Response('not found', { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });
}

function isOurs(url) {
  return typeof url === 'string' && url.startsWith(`${SCHEME}://${HOST}/`);
}

function openOutside(url) {
  // Only real web links leave the app, and only to the player's own browser.
  if (/^https?:\/\//i.test(url) || /^mailto:/i.test(url)) shell.openExternal(url).catch(() => {});
}

function buildMenu() {
  if (process.platform !== 'darwin') { Menu.setApplicationMenu(null); return; }
  // Mac needs an app menu for Cmd+Q / Cmd+H / copy-paste; keep it to the standard minimum.
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { role: 'appMenu' },
    { role: 'editMenu' },
    { label: 'View', submenu: [{ role: 'togglefullscreen' }] },
    { role: 'windowMenu' },
  ]));
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 960,
    minHeight: 540,
    resizable: true,
    show: false,
    backgroundColor: '#1d1712',
    title: 'Dopahar',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
      backgroundThrottling: false,
      additionalArguments: [`--dopahar-version=${app.getVersion()}`],
    },
  });
  win.once('ready-to-show', () => { if (!SMOKE_REPORT) win.show(); });

  // fullscreen keys (the game uses Escape for its own pause menu, so Escape is left alone)
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    const mac = process.platform === 'darwin';
    const f11 = input.key === 'F11' && !mac;
    const macCombo = mac && input.meta && input.control && (input.key === 'f' || input.key === 'F');
    const altEnter = input.alt && input.key === 'Enter';
    if (f11 || macCombo || altEnter) {
      event.preventDefault();
      win.setFullScreen(!win.isFullScreen());
    }
  });

  // external links: system browser; the game window never navigates away from the game
  win.webContents.setWindowOpenHandler(({ url }) => { openOutside(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (event, url) => { if (!isOurs(url)) { event.preventDefault(); openOutside(url); } });
  win.webContents.on('will-redirect', (event, url) => { if (!isOurs(url)) event.preventDefault(); });

  win.loadURL(START_URL + SMOKE_QUERY);
  return win;
}

// --------------------------------------------------------------------------------------------- smoke test
async function runSmoke(win, reportPath) {
  const report = { started: new Date().toISOString(), electron: process.versions.electron, chrome: process.versions.chrome,
    platform: `${process.platform}-${process.arch}`, packaged: app.isPackaged, gameRoot: gameRoot(), userData: app.getPath('userData'),
    console: [], errors: [], failedRequests: [] };
  const t0 = Date.now();
  win.webContents.on('console-message', (e) => {
    // Electron 45: details object; level is 'info' | 'warning' | 'error' | 'debug'
    const level = e.level ?? 'info';
    const msg = { t: Date.now() - t0, level, message: String(e.message).slice(0, 400), source: `${e.sourceId || ''}:${e.lineNumber || ''}` };
    report.console.push(msg);
    if (level === 'error' || level === 3) report.errors.push(msg);
  });
  win.webContents.on('render-process-gone', (e, d) => report.errors.push({ t: Date.now() - t0, level: 'crash', message: JSON.stringify(d) }));
  win.webContents.session.webRequest.onErrorOccurred((d) => report.failedRequests.push({ url: d.url, error: d.error }));
  win.webContents.session.webRequest.onCompleted((d) => { if (d.statusCode >= 400) report.failedRequests.push({ url: d.url, status: d.statusCode }); });

  const js = (code) => win.webContents.executeJavaScript(code, true);
  const waitFor = async (code, ms) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      try { if (await js(code)) return true; } catch (e) { /* page not ready yet */ }
      await new Promise((r) => setTimeout(r, 250));
    }
    return false;
  };
  const finish = (ok) => {
    report.ok = ok && report.errors.length === 0 && report.edition?.edition === 'desktop' && report.edition?.quality === 'full';
    report.ms = Date.now() - t0;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    app.exit(report.ok ? 0 : 1);
  };
  setTimeout(() => { report.timedOut = true; finish(false); }, Number(argValue('smoke-timeout') || 240000));

  await new Promise((r) => win.webContents.once('did-finish-load', r));
  report.loadedUrl = win.webContents.getURL();
  report.titleVisible = await waitFor(`!!document.querySelector('#start-overlay .title-en')`, 60000);
  report.titleMs = Date.now() - t0;
  report.playReady = await waitFor(`!!document.querySelector('#start-overlay.ready')`, 180000);
  report.playReadyMs = Date.now() - t0;
  report.edition = await js(`(() => { const e = window.__dopaharEdition || {}; return { edition: e.edition, quality: e.quality, build: e.build,
    desktopVersion: e.desktopVersion, flag: window.dopaharDesktop ? { ...window.dopaharDesktop } : null,
    nodeVisible: typeof require !== 'undefined' || typeof process !== 'undefined',
    pixelRatioMax: e.preset && e.preset.pixelRatioMax, shadowMapSize: e.preset && e.preset.shadowMapSize }; })()`);
  // save persistence: read what the previous smoke run wrote, then write a new value
  report.saveFromLastRun = await js(`localStorage.getItem('dopahar_desktop_smoke')`);
  report.saveWritten = `run-${Date.now()}`;
  await js(`localStorage.setItem('dopahar_desktop_smoke', ${JSON.stringify(report.saveWritten)})`);
  // the character files really are the full-size originals (compare in the report with public/assets/models)
  report.characterBytes = await js(`(async () => { const out = {}; for (const n of ['maa', 'dadi', 'teacher']) {
    try { const r = await fetch('assets/models/' + n + '.glb'); out[n] = r.ok ? (await r.arrayBuffer()).byteLength : r.status; } catch (e) { out[n] = String(e); } } return out; })()`);
  if (report.playReady && !argValue('smoke-no-play')) {
    await js(`(() => { const b = document.querySelector('#play-btn'); if (b) { b.click(); return true; } return false; })()`)
      .then((v) => { report.playClicked = v; });
    report.firstRender = await waitFor(`!!(window.__loadMarks && window.__loadMarks.firstRender)`, 60000);
    await new Promise((r) => setTimeout(r, Number(argValue('smoke-play-ms') || 5000)));
    try { // a picture of the first seconds of play, next to the report, so a person can look at it
      const img = await win.webContents.capturePage();
      const shot = reportPath.replace(/\.json$/, '') + '.png';
      fs.writeFileSync(shot, img.toPNG());
      report.screenshot = shot;
    } catch (e) { report.screenshotError = String(e); }
    report.renderer = await js(`(() => { const m = window.__loadMarks || {}; return { firstRenderMs: m.firstRender && Math.round(m.firstRender), calls: m.calls, programs: m.programs,
      canvas: (() => { const c = document.querySelector('canvas'); return c ? [c.width, c.height] : null; })(), dpr: window.devicePixelRatio }; })()`);
  }
  finish(report.titleVisible && report.playReady);
}

// --------------------------------------------------------------------------------------------- start
if (!SMOKE_REPORT && !app.requestSingleInstanceLock()) {
  app.quit(); // a second copy would fight over the same save
} else {
  app.on('second-instance', () => {
    const w = BrowserWindow.getAllWindows()[0];
    if (w) { if (w.isMinimized()) w.restore(); w.focus(); }
  });

  app.whenReady().then(() => {
    registerGameProtocol(gameRoot());
    // The game needs no camera, microphone, location or notifications. Allow only pointer lock and fullscreen.
    session.defaultSession.setPermissionRequestHandler((wc, permission, cb) => cb(permission === 'pointerLock' || permission === 'fullscreen'));
    buildMenu();
    const win = createWindow();
    if (SMOKE_REPORT) runSmoke(win, path.resolve(SMOKE_REPORT)).catch((e) => {
      fs.writeFileSync(path.resolve(SMOKE_REPORT), JSON.stringify({ ok: false, fatal: String(e && e.stack || e) }, null, 2));
      app.exit(2);
    });
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  });

  app.on('window-all-closed', () => app.quit()); // a game quits when its window closes, on Mac too
}

// Any page or frame that tries to attach a webview or open a new window is refused.
app.on('web-contents-created', (e, contents) => {
  contents.on('will-attach-webview', (ev) => ev.preventDefault());
});
